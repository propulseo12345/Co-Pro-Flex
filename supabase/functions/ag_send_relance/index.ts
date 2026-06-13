// ============================================================================
// Edge Function: ag_send_relance
// Envoi des relances de convocation AG aux copropriétaires non répondants
// CoProFlex - Niveau 5A
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

// ============================================================================
// TYPES
// ============================================================================

interface SendRelanceRequest {
  ag_id: string;
  coproprietaire_ids: string[];  // Liste des copropriétaires à relancer
  message_personnalise?: string; // Message personnalisé optionnel
}

interface RelanceResult {
  coproprietaire_id: string;
  name: string;
  email: string;
  status: "sent" | "failed";
  notification_id?: string;
  error?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateRequest(body: unknown): SendRelanceRequest | null {
  if (!body || typeof body !== "object") return null;

  const req = body as Record<string, unknown>;

  if (!req.ag_id || typeof req.ag_id !== "string" || !isValidUUID(req.ag_id)) {
    return null;
  }

  if (!Array.isArray(req.coproprietaire_ids) || req.coproprietaire_ids.length === 0) {
    return null;
  }

  for (const id of req.coproprietaire_ids) {
    if (!isValidUUID(id)) return null;
  }

  return {
    ag_id: req.ag_id as string,
    coproprietaire_ids: req.coproprietaire_ids as string[],
    message_personnalise: typeof req.message_personnalise === "string" ? req.message_personnalise : undefined,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysUntilAg(meetingDate: string): number {
  const meeting = new Date(meetingDate);
  const today = new Date();
  const diffTime = meeting.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMeetingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ordinary: "Ordinaire",
    extraordinary: "Extraordinaire",
    mixed: "Mixte",
  };
  return labels[type] || type;
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
// EMAIL SENDING
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
          error: "Invalid request. Required: ag_id (UUID), coproprietaire_ids (UUID[])",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Init Supabase
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

    // Get AG info
    const { data: ag, error: agError } = await supabase
      .from("ag_meetings")
      .select("id, copro_id, title, meeting_type, meeting_date, location, status")
      .eq("id", request.ag_id)
      .single();

    if (agError || !ag) {
      return new Response(
        JSON.stringify({ success: false, error: "AG not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get copro info
    const { data: copro } = await supabase
      .from("copros")
      .select("name, address, postal_code, city")
      .eq("id", ag.copro_id)
      .single();

    // Get convocation document URL
    const { data: docData } = await supabase
      .from("ag_documents")
      .select("storage_path")
      .eq("ag_id", request.ag_id)
      .eq("doc_type", "convocation")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    let documentUrl: string | null = null;
    if (docData?.storage_path) {
      const { data: signedData } = await supabase.storage
        .from("ged")
        .createSignedUrl(docData.storage_path, 60 * 60 * 24 * 7);
      documentUrl = signedData?.signedUrl || null;
    }

    // Get copropriétaires
    const { data: coproprietaires } = await supabase
      .from("coproprietaires")
      .select("id, civilite, nom, prenom, email")
      .in("id", request.coproprietaire_ids)
      .not("email", "is", null);

    if (!coproprietaires || coproprietaires.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No valid recipients found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get relance template
    const { data: templateData } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("code", "ag_relance")
      .limit(1)
      .single();

    const daysRemaining = getDaysUntilAg(ag.meeting_date);

    // Prepare base variables
    const baseVariables = {
      copropriete_nom: copro?.name || "Votre copropriété",
      copropriete_adresse: copro ? `${copro.address}, ${copro.postal_code} ${copro.city}` : "",
      syndic_nom: "Votre syndic",
      ag_type: getMeetingTypeLabel(ag.meeting_type),
      ag_date: formatDate(ag.meeting_date),
      ag_heure: formatTime(ag.meeting_date),
      ag_lieu: ag.location,
      days_remaining: String(daysRemaining),
      document_url: documentUrl || "#",
      message_personnalise: request.message_personnalise || "",
    };

    // Send relances
    const results: RelanceResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of coproprietaires) {
      // Create notification
      const { data: notifId } = await supabase.rpc("create_ag_notification", {
        p_copro_id: ag.copro_id,
        p_ag_id: request.ag_id,
        p_coproprietaire_id: recipient.id,
        p_notification_type: "relance",
        p_channel: "email",
        p_document_id: null,
      });

      const variables = {
        ...baseVariables,
        destinataire_civilite: recipient.civilite || "",
        destinataire_nom: recipient.nom,
      };

      const subject = templateData
        ? renderTemplate(templateData.subject, variables)
        : `RAPPEL - Assemblée Générale du ${formatDate(ag.meeting_date)}`;

      const htmlBody = templateData
        ? renderTemplate(templateData.body_html, variables)
        : `
          <p>${recipient.civilite || ""} ${recipient.nom},</p>
          <p>Nous vous rappelons que l'Assemblée Générale ${getMeetingTypeLabel(ag.meeting_type)} de votre copropriété se tiendra le <strong>${formatDate(ag.meeting_date)}</strong> à ${formatTime(ag.meeting_date)}.</p>
          <p><strong>Lieu :</strong> ${ag.location}</p>
          ${request.message_personnalise ? `<p>${request.message_personnalise}</p>` : ""}
          <p>J-${daysRemaining} avant l'AG.</p>
          ${documentUrl ? `<p><a href="${documentUrl}">Consulter la convocation</a></p>` : ""}
          <p>Cordialement,<br>Votre syndic</p>
        `;

      const emailResult = await sendEmailViaResend(recipient.email!, subject, htmlBody);

      if (emailResult.success && notifId) {
        await supabase.rpc("mark_notification_sent", {
          p_notification_id: notifId,
          p_provider_message_id: emailResult.messageId,
        });
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email!,
          status: "sent",
          notification_id: notifId,
        });
        sent++;
      } else {
        if (notifId) {
          await supabase.rpc("mark_notification_failed", {
            p_notification_id: notifId,
            p_error_code: "SEND_ERROR",
            p_error_message: emailResult.error,
          });
        }
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email!,
          status: "failed",
          error: emailResult.error,
        });
        failed++;
      }

      // Throttle
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: coproprietaires.length, sent, failed },
        details: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (e) {
    log.error("Erreur inattendue", { error: e });
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
