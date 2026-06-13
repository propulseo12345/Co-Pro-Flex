// ============================================================================
// Edge Function: send_manual_payment_reminder
// Envoi manuel d'une relance pour un lot spécifique
// CoProFlex - Niveau 5B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

// ============================================================================
// TYPES
// ============================================================================

interface SendManualReminderRequest {
  copro_id: string;
  lot_id: string;
  delay_level?: number; // Optionnel, sinon déterminé automatiquement
  custom_message?: string; // Message personnalisé optionnel
  dry_run?: boolean; // Mode simulation - ne pas envoyer d'email
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateRequest(body: unknown): SendManualReminderRequest | null {
  if (!body || typeof body !== "object") return null;

  const req = body as Record<string, unknown>;

  if (!req.copro_id || typeof req.copro_id !== "string" || !isValidUUID(req.copro_id)) {
    return null;
  }

  if (!req.lot_id || typeof req.lot_id !== "string" || !isValidUUID(req.lot_id)) {
    return null;
  }

  return {
    copro_id: req.copro_id,
    lot_id: req.lot_id,
    delay_level: typeof req.delay_level === "number" ? req.delay_level : undefined,
    custom_message: typeof req.custom_message === "string" ? req.custom_message : undefined,
    dry_run: req.dry_run === true,
  };
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

function determineDelayLevel(daysOverdue: number): number {
  if (daysOverdue >= 60) return 60;
  if (daysOverdue >= 30) return 30;
  return 7;
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
    const request = validateRequest(body);

    if (!request) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request. Required: copro_id (UUID), lot_id (UUID)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auth required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get unpaid info for the lot
    const { data: unpaidInfo, error: unpaidError } = await supabase
      .from("v_unpaid_by_lot")
      .select("*")
      .eq("copro_id", request.copro_id)
      .eq("lot_id", request.lot_id)
      .single();

    if (unpaidError || !unpaidInfo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Lot not found or no unpaid balance",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!unpaidInfo.owner_email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No email address for this owner",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get copro info
    const { data: copro } = await supabase
      .from("copros")
      .select("name, address, postal_code, city")
      .eq("id", request.copro_id)
      .single();

    // Determine delay level
    const delayLevel = request.delay_level || determineDelayLevel(unpaidInfo.days_overdue);

    // Check if already reminded at this level
    const { data: existingReminder } = await supabase
      .from("payment_reminders")
      .select("id")
      .eq("lot_id", request.lot_id)
      .eq("delay_level", delayLevel)
      .in("status", ["sent", "pending"])
      .single();

    if (existingReminder) {
      // In dry_run mode, return preview without error
      if (request.dry_run) {
        return new Response(
          JSON.stringify({
            success: true,
            dry_run: true,
            would_send: false,
            delay_level: delayLevel,
            recipient_email: unpaidInfo.owner_email,
            error: `Une relance niveau ${delayLevel} jours a deja ete envoyee pour ce lot`,
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: `Une relance niveau ${delayLevel} jours a deja ete envoyee pour ce lot`,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Dry run mode: return preview without sending
    if (request.dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          would_send: true,
          delay_level: delayLevel,
          recipient_email: unpaidInfo.owner_email,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Get template
    const templateCode = `payment_reminder_${delayLevel}`;
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("code", templateCode)
      .single();

    let subject = template?.subject || `Rappel - Charges de copropriete en attente`;
    let htmlBody = template?.body_html || "";

    // Fallback template
    if (!htmlBody) {
      htmlBody = `
        <p>${unpaidInfo.owner_name || "Madame, Monsieur"},</p>
        <p>Un montant de <strong>${formatAmount(unpaidInfo.total_unpaid)} EUR</strong> reste en attente
        pour votre lot <strong>${unpaidInfo.lot_ref}</strong>.</p>
        ${request.custom_message ? `<p>${request.custom_message}</p>` : ""}
        <p>Si votre paiement a ete effectue, merci de ne pas tenir compte de ce message.</p>
        <p>Cordialement,<br>Votre syndic</p>
      `;
    }

    // Prepare variables
    const variables: Record<string, string> = {
      destinataire_civilite: "",
      destinataire_nom: unpaidInfo.owner_name || "Proprietaire",
      montant: formatAmount(unpaidInfo.total_unpaid),
      lot_ref: unpaidInfo.lot_ref,
      copropriete_nom: copro?.name || "Votre copropriete",
      copropriete_adresse: copro ? `${copro.address}, ${copro.postal_code} ${copro.city}` : "",
      date_echeance: formatDate(unpaidInfo.oldest_due_date),
      jours_retard: String(unpaidInfo.days_overdue),
      syndic_nom: "Votre syndic",
      message_personnalise: request.custom_message || "",
    };

    subject = renderTemplate(subject, variables);
    htmlBody = renderTemplate(htmlBody, variables);

    // Add custom message if provided and not in template
    if (request.custom_message && !template?.body_html?.includes("{{message_personnalise}}")) {
      htmlBody = htmlBody.replace(
        "</body>",
        `<p style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #2563eb;">
          <strong>Message du syndic:</strong><br>${request.custom_message}
        </p></body>`
      );
    }

    // Get lot owner info
    const { data: lot } = await supabase
      .from("lots")
      .select("owner_id")
      .eq("id", request.lot_id)
      .single();

    // Get reminder rule if exists
    const { data: rule } = await supabase
      .from("payment_reminder_rules")
      .select("id")
      .eq("copro_id", request.copro_id)
      .eq("delay_days", delayLevel)
      .eq("is_active", true)
      .single();

    // Create reminder record
    const { data: reminderId } = await supabase.rpc("create_payment_reminder", {
      p_copro_id: request.copro_id,
      p_lot_id: request.lot_id,
      p_owner_id: lot?.owner_id || null,
      p_unpaid_amount: unpaidInfo.total_unpaid,
      p_oldest_due_date: unpaidInfo.oldest_due_date,
      p_days_overdue: unpaidInfo.days_overdue,
      p_delay_level: delayLevel,
      p_rule_id: rule?.id || null,
      p_recipient_email: unpaidInfo.owner_email,
      p_recipient_name: unpaidInfo.owner_name,
    });

    // Send email
    const emailResult = await sendEmailViaResend(unpaidInfo.owner_email, subject, htmlBody);

    if (emailResult.success) {
      await supabase.rpc("mark_reminder_sent", {
        p_reminder_id: reminderId,
        p_provider_message_id: emailResult.messageId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          reminder_id: reminderId,
          recipient_email: unpaidInfo.owner_email,
          delay_level: delayLevel,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    } else {
      await supabase.rpc("mark_reminder_failed", {
        p_reminder_id: reminderId,
        p_error_message: emailResult.error,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to send email: ${emailResult.error}`,
          reminder_id: reminderId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }
  } catch (e) {
    log.error("Error in send_manual_payment_reminder", { error: e });
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
