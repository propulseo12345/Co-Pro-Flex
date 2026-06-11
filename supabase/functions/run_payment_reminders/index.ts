// ============================================================================
// Edge Function: run_payment_reminders
// CRON quotidien - Envoi automatique des relances d'impayés
// CoProFlex - Niveau 5B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface PendingReminder {
  lot_id: string;
  lot_ref: string;
  owner_id: string | null;
  owner_name: string;
  owner_email: string;
  unpaid_amount: number;
  oldest_due_date: string;
  days_overdue: number;
  delay_level: number;
  rule_id: string;
  template_id: string | null;
}

interface ReminderResult {
  lot_id: string;
  lot_ref: string;
  owner_email: string;
  delay_level: number;
  status: "sent" | "failed" | "skipped";
  reminder_id?: string;
  error?: string;
}

interface RunResult {
  success: boolean;
  copro_id?: string;
  summary?: {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    stale_cancelled: number;
  };
  details?: ReminderResult[];
  error?: string;
  dry_run?: boolean;
  // Pause info
  paused?: boolean;
  pause_reason?: string | null;
  paused_until?: string | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

// ============================================================================
// EMAIL SENDING VIA RESEND
// ============================================================================

async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@coproflex.fr";
  const FROM_NAME = Deno.env.get("FROM_NAME") || "CoProFlex";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html: htmlBody,
      }),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      return { success: true, messageId: result.id };
    } else {
      return { success: false, error: result.error?.message || `HTTP ${response.status}` };
    }
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { copro_id, dry_run } = body;
    const isDryRun = dry_run === true;

    if (!copro_id || !isValidUUID(copro_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid copro_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // SÉCURITÉ (audit 2026-06-12) : l'ancien code basculait en service_role dès
    // que la clé existait dans l'env (= toujours), sans vérifier l'appelant —
    // n'importe qui muni de l'anon key publique déclenchait des relances
    // cross-tenant. Désormais :
    //   - chemin CRON : secret partagé dédié dans l'en-tête x-cron-secret
    //     → service_role assumé (appelant de confiance).
    //   - chemin manuel : client au contexte de l'APPELANT (RLS s'applique)
    //     + vérification explicite qu'il gère bien la copro ciblée.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("REMINDERS_CRON_SECRET");
    const isCronCall =
      !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

    let supabase;
    if (isCronCall && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
    } else {
      supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader || "" } },
        auth: { persistSession: false },
      });

      // Appel manuel : l'utilisateur doit gérer la copro ciblée.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: "Non authentifié" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("copro_id", copro_id)
        .in("role", ["gestionnaire", "platform_admin"])
        .limit(1)
        .maybeSingle();
      if (!membership) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès refusé : vous ne gérez pas cette copropriété" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 0. Check if reminders are paused for this copro
    const { data: pauseData } = await supabase
      .from("reminder_settings")
      .select("is_paused, paused_until, pause_reason")
      .eq("copro_id", copro_id)
      .single();

    const isPaused = pauseData?.is_paused === true &&
      (pauseData?.paused_until === null || new Date(pauseData.paused_until) >= new Date());

    if (isPaused) {
      const response: RunResult = {
        success: true,
        copro_id,
        dry_run: isDryRun,
        paused: true,
        pause_reason: pauseData?.pause_reason || null,
        paused_until: pauseData?.paused_until || null,
        summary: {
          processed: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          stale_cancelled: 0,
        },
        details: [],
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 1. Cancel stale reminders (lots that have paid) - skip in dry_run mode
    let staleCancelled = 0;
    if (!isDryRun) {
      const { data: staleResult } = await supabase.rpc("cancel_stale_reminders", {
        p_copro_id: copro_id,
      });
      staleCancelled = staleResult || 0;
    }

    // 2. Get copro info
    const { data: copro } = await supabase
      .from("copros")
      .select("name, address, postal_code, city")
      .eq("id", copro_id)
      .single();

    // 3. Get pending reminders to send
    const { data: pendingReminders, error: pendingError } = await supabase.rpc(
      "get_pending_reminders_to_send",
      { p_copro_id: copro_id }
    );

    if (pendingError) {
      console.error("Error fetching pending reminders:", pendingError);
      return new Response(
        JSON.stringify({ success: false, error: pendingError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const reminders = (pendingReminders || []) as PendingReminder[];
    const results: ReminderResult[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // 4. Process each pending reminder
    for (const reminder of reminders) {
      // Skip if no email
      if (!reminder.owner_email) {
        results.push({
          lot_id: reminder.lot_id,
          lot_ref: reminder.lot_ref,
          owner_email: "",
          delay_level: reminder.delay_level,
          status: "skipped",
          error: "No email address",
        });
        skipped++;
        continue;
      }

      // Get template
      let templateSubject = `Rappel - Charges de copropriété en attente`;
      let templateBody = "";

      if (reminder.template_id) {
        const { data: template } = await supabase
          .from("email_templates")
          .select("subject, body_html")
          .eq("id", reminder.template_id)
          .single();

        if (template) {
          templateSubject = template.subject;
          templateBody = template.body_html;
        }
      }

      // Fallback: use default template based on delay level
      if (!templateBody) {
        const templateCode = `payment_reminder_${reminder.delay_level}`;
        const { data: defaultTemplate } = await supabase
          .from("email_templates")
          .select("subject, body_html")
          .eq("code", templateCode)
          .single();

        if (defaultTemplate) {
          templateSubject = defaultTemplate.subject;
          templateBody = defaultTemplate.body_html;
        } else {
          // Ultimate fallback - simple template
          templateBody = `
            <p>${reminder.owner_name},</p>
            <p>Un montant de <strong>${formatAmount(reminder.unpaid_amount)} EUR</strong> reste en attente
            pour votre lot <strong>${reminder.lot_ref}</strong>.</p>
            <p>Si votre paiement a ete effectue, merci de ne pas tenir compte de ce message.</p>
            <p>Cordialement,<br>Votre syndic</p>
          `;
        }
      }

      // Prepare variables
      const variables: Record<string, string> = {
        destinataire_civilite: "",
        destinataire_nom: reminder.owner_name || "Proprietaire",
        montant: formatAmount(reminder.unpaid_amount),
        lot_ref: reminder.lot_ref,
        copropriete_nom: copro?.name || "Votre copropriete",
        copropriete_adresse: copro ? `${copro.address}, ${copro.postal_code} ${copro.city}` : "",
        date_echeance: formatDate(reminder.oldest_due_date),
        jours_retard: String(reminder.days_overdue),
        syndic_nom: "Votre syndic",
      };

      const subject = renderTemplate(templateSubject, variables);
      const htmlBody = renderTemplate(templateBody, variables);

      // Dry run mode: simulate without actually sending
      if (isDryRun) {
        results.push({
          lot_id: reminder.lot_id,
          lot_ref: reminder.lot_ref,
          owner_email: reminder.owner_email,
          delay_level: reminder.delay_level,
          status: "sent", // Would be sent
        });
        sent++;
        continue;
      }

      // Create reminder record
      const { data: reminderId } = await supabase.rpc("create_payment_reminder", {
        p_copro_id: copro_id,
        p_lot_id: reminder.lot_id,
        p_owner_id: reminder.owner_id,
        p_unpaid_amount: reminder.unpaid_amount,
        p_oldest_due_date: reminder.oldest_due_date,
        p_days_overdue: reminder.days_overdue,
        p_delay_level: reminder.delay_level,
        p_rule_id: reminder.rule_id,
        p_recipient_email: reminder.owner_email,
        p_recipient_name: reminder.owner_name,
      });

      // Send email
      const emailResult = await sendEmailViaResend(reminder.owner_email, subject, htmlBody);

      if (emailResult.success) {
        await supabase.rpc("mark_reminder_sent", {
          p_reminder_id: reminderId,
          p_provider_message_id: emailResult.messageId,
        });

        results.push({
          lot_id: reminder.lot_id,
          lot_ref: reminder.lot_ref,
          owner_email: reminder.owner_email,
          delay_level: reminder.delay_level,
          status: "sent",
          reminder_id: reminderId,
        });
        sent++;
      } else {
        await supabase.rpc("mark_reminder_failed", {
          p_reminder_id: reminderId,
          p_error_message: emailResult.error,
        });

        results.push({
          lot_id: reminder.lot_id,
          lot_ref: reminder.lot_ref,
          owner_email: reminder.owner_email,
          delay_level: reminder.delay_level,
          status: "failed",
          reminder_id: reminderId,
          error: emailResult.error,
        });
        failed++;
      }

      // Throttle to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const response: RunResult = {
      success: true,
      copro_id,
      dry_run: isDryRun,
      summary: {
        processed: reminders.length,
        sent,
        failed,
        skipped,
        stale_cancelled: staleCancelled,
      },
      details: results,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Error in run_payment_reminders:", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
