// ============================================================================
// Edge Function: ag_send_convocations
// Envoi des convocations AG par email avec traçabilité juridique
// CoProFlex - Niveau 5A
// Référentiel légal:
//   - Art. 64 décret 67-223: délai 21 jours minimum convocation
//   - Art. 9 décret 67-223: contenu obligatoire convocation
//   - Art. 42 loi 65-557: nullité si copro non convoqué (CRITIQUE)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

type SendScope = "all" | "missing_only" | "selected";

interface SendConvocationsRequest {
  ag_id: string;
  send_to: SendScope;
  coproprietaire_ids?: string[];  // Si send_to = "selected"
  dry_run?: boolean;              // Test sans envoi réel
}

interface SendConvocationsResponse {
  success: boolean;
  error?: string;
  summary?: {
    total_recipients: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  details?: RecipientResult[];
  delay_warning?: string;
}

interface RecipientResult {
  coproprietaire_id: string;
  name: string;
  email: string;
  status: "sent" | "failed" | "skipped";
  notification_id?: string;
  provider_message_id?: string;
  error?: string;
}

interface Recipient {
  id: string;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  email: string;
  tantiemes: number;
  lots: string[];
  already_notified: boolean;
}

interface AgInfo {
  id: string;
  copro_id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: string;
}

interface CoproInfo {
  id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
}

interface DocumentInfo {
  id: string;
  storage_path: string;
  file_name: string;
}

interface EmailTemplate {
  subject: string;
  body_html: string;
  body_text: string | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateRequest(body: unknown): SendConvocationsRequest | null {
  if (!body || typeof body !== "object") return null;

  const req = body as Record<string, unknown>;

  if (!req.ag_id || typeof req.ag_id !== "string" || !isValidUUID(req.ag_id)) {
    return null;
  }

  if (!req.send_to || !["all", "missing_only", "selected"].includes(req.send_to as string)) {
    return null;
  }

  if (req.send_to === "selected") {
    if (!Array.isArray(req.coproprietaire_ids) || req.coproprietaire_ids.length === 0) {
      return null;
    }
    for (const id of req.coproprietaire_ids) {
      if (!isValidUUID(id)) return null;
    }
  }

  return {
    ag_id: req.ag_id as string,
    send_to: req.send_to as SendScope,
    coproprietaire_ids: req.coproprietaire_ids as string[] | undefined,
    dry_run: req.dry_run === true,
  };
}

// ============================================================================
// HELPER FUNCTIONS
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

function getDaysUntilAg(meetingDate: string): number {
  const meeting = new Date(meetingDate);
  const today = new Date();
  const diffTime = meeting.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function getAgInfo(supabase: SupabaseClient, agId: string): Promise<AgInfo | null> {
  const { data, error } = await supabase
    .from("ag_meetings")
    .select("id, copro_id, title, meeting_type, meeting_date, location, status")
    .eq("id", agId)
    .single();

  if (error || !data) return null;
  return data as AgInfo;
}

async function getCoproInfo(supabase: SupabaseClient, coproId: string): Promise<CoproInfo | null> {
  const { data, error } = await supabase
    .from("copros")
    .select("id, name, address, postal_code, city")
    .eq("id", coproId)
    .single();

  if (error || !data) return null;
  return data as CoproInfo;
}

async function getConvocationDocument(
  supabase: SupabaseClient,
  agId: string
): Promise<DocumentInfo | null> {
  const { data, error } = await supabase
    .from("ag_documents")
    .select("document_id, storage_path, file_name")
    .eq("ag_id", agId)
    .eq("doc_type", "convocation")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return {
    id: data.document_id,
    storage_path: data.storage_path,
    file_name: data.file_name,
  };
}

async function getRecipients(
  supabase: SupabaseClient,
  agId: string,
  scope: SendScope,
  selectedIds?: string[]
): Promise<Recipient[]> {
  // Utilise la fonction SQL pour récupérer les destinataires
  const onlyMissing = scope === "missing_only";

  const { data, error } = await supabase.rpc("get_ag_recipients", {
    p_ag_id: agId,
    p_notification_type: "convocation",
    p_only_missing: onlyMissing,
  });

  if (error) {
    console.error("Error fetching recipients:", error);
    return [];
  }

  let recipients = data as Recipient[];

  // Filtrer si sélection spécifique
  if (scope === "selected" && selectedIds) {
    recipients = recipients.filter((r) => selectedIds.includes(r.id));
  }

  return recipients;
}

async function getEmailTemplate(supabase: SupabaseClient, coproId: string): Promise<EmailTemplate> {
  // Chercher template personnalisé pour la copro, sinon template par défaut
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body_html, body_text")
    .eq("code", "ag_convocation")
    .or(`copro_id.eq.${coproId},copro_id.is.null`)
    .order("copro_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  if (data) {
    return data as EmailTemplate;
  }

  // Template par défaut hardcodé en fallback
  return {
    subject: "Convocation - Assemblée Générale {{ag_type}} du {{ag_date}}",
    body_html: `
      <p>{{destinataire_civilite}} {{destinataire_nom}},</p>
      <p>Nous avons l'honneur de vous convoquer à l'Assemblée Générale {{ag_type}} de votre copropriété.</p>
      <p><strong>Date :</strong> {{ag_date}} à {{ag_heure}}<br>
      <strong>Lieu :</strong> {{ag_lieu}}</p>
      <p>Vous trouverez ci-joint la convocation complète.</p>
      <p>Cordialement,<br>{{syndic_nom}}</p>
    `,
    body_text: null,
  };
}

async function createNotification(
  supabase: SupabaseClient,
  coproId: string,
  agId: string,
  recipient: Recipient,
  documentId: string | null
): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_ag_notification", {
    p_copro_id: coproId,
    p_ag_id: agId,
    p_coproprietaire_id: recipient.id,
    p_notification_type: "convocation",
    p_channel: "email",
    p_document_id: documentId,
  });

  if (error) {
    console.error("Error creating notification:", error);
    return null;
  }

  return data as string;
}

async function markNotificationSent(
  supabase: SupabaseClient,
  notificationId: string,
  providerMessageId: string
): Promise<void> {
  await supabase.rpc("mark_notification_sent", {
    p_notification_id: notificationId,
    p_provider_message_id: providerMessageId,
  });
}

async function markNotificationFailed(
  supabase: SupabaseClient,
  notificationId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await supabase.rpc("mark_notification_failed", {
    p_notification_id: notificationId,
    p_error_code: errorCode,
    p_error_message: errorMessage,
  });
}

// ============================================================================
// EMAIL SENDING (Resend)
// ============================================================================

interface ResendResponse {
  id?: string;
  error?: { message: string };
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string | null,
  attachmentUrl: string | null,
  attachmentName: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@coproflex.fr";
  const FROM_NAME = Deno.env.get("FROM_NAME") || "CoProFlex";

  // Construire le payload
  const payload: Record<string, unknown> = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: subject,
    html: htmlBody,
  };

  if (textBody) {
    payload.text = textBody;
  }

  // Ajouter la pièce jointe si disponible
  if (attachmentUrl && attachmentName) {
    try {
      // Télécharger le fichier depuis Supabase Storage
      const response = await fetch(attachmentUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        payload.attachments = [
          {
            filename: attachmentName,
            content: base64Content,
            type: "application/pdf",
          },
        ];
      }
    } catch (e) {
      console.error("Error downloading attachment:", e);
      // Continue sans pièce jointe
    }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result: ResendResponse = await response.json();

    if (response.ok && result.id) {
      return { success: true, messageId: result.id };
    } else {
      return {
        success: false,
        error: result.error?.message || `HTTP ${response.status}`,
      };
    }
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ============================================================================
// SIGNED URL GENERATION
// ============================================================================

async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("ged")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 jours

  if (error || !data) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
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

  // Only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request
    const body = await req.json();
    const request = validateRequest(body);

    if (!request) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request. Required: ag_id (UUID), send_to ('all' | 'missing_only' | 'selected')",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Init Supabase client
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
    const ag = await getAgInfo(supabase, request.ag_id);
    if (!ag) {
      return new Response(
        JSON.stringify({ success: false, error: "AG not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Vérifier le statut de l'AG
    if (ag.status === "closed" || ag.status === "pv_generated") {
      return new Response(
        JSON.stringify({ success: false, error: "AG is already closed, cannot send convocations" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get copro info
    const copro = await getCoproInfo(supabase, ag.copro_id);
    if (!copro) {
      return new Response(
        JSON.stringify({ success: false, error: "Copropriété not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Vérifier le délai légal (21 jours - Art. 64 décret)
    const daysUntilAg = getDaysUntilAg(ag.meeting_date);
    let delayWarning: string | undefined;

    if (daysUntilAg < 0) {
      return new Response(
        JSON.stringify({ success: false, error: "La date de l'AG est passée" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (daysUntilAg < 21) {
      delayWarning = `ATTENTION: Délai légal de 21 jours non respecté (Art. 64 décret 67-223). J-${daysUntilAg} avant l'AG.`;
    }

    // Get convocation document
    const document = await getConvocationDocument(supabase, request.ag_id);
    if (!document) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Convocation document not found. Please generate the convocation PDF first.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get signed URL for document
    const documentUrl = await getSignedUrl(supabase, document.storage_path);

    // Get recipients
    const recipients = await getRecipients(
      supabase,
      request.ag_id,
      request.send_to,
      request.coproprietaire_ids
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: { total_recipients: 0, sent: 0, failed: 0, skipped: 0 },
          details: [],
          delay_warning: delayWarning,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get email template
    const template = await getEmailTemplate(supabase, ag.copro_id);

    // Prepare variables for template
    const baseVariables = {
      copropriete_nom: copro.name,
      copropriete_adresse: `${copro.address}, ${copro.postal_code} ${copro.city}`,
      syndic_nom: "Votre syndic", // TODO: récupérer depuis paramètres
      ag_type: getMeetingTypeLabel(ag.meeting_type),
      ag_date: formatDate(ag.meeting_date),
      ag_heure: formatTime(ag.meeting_date),
      ag_lieu: ag.location,
      resolutions_count: "...", // TODO: compter les résolutions
      document_url: documentUrl || "#",
    };

    // Send emails
    const results: RecipientResult[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      // Skip if already notified (unless sending all)
      if (request.send_to === "missing_only" && recipient.already_notified) {
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email,
          status: "skipped",
        });
        skipped++;
        continue;
      }

      // Create notification record
      const notificationId = await createNotification(
        supabase,
        ag.copro_id,
        request.ag_id,
        recipient,
        document.id
      );

      if (!notificationId) {
        // Déjà notifié (contrainte unique)
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email,
          status: "skipped",
          error: "Already notified",
        });
        skipped++;
        continue;
      }

      // If dry run, don't actually send
      if (request.dry_run) {
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email,
          status: "sent",
          notification_id: notificationId,
          provider_message_id: "dry-run",
        });
        sent++;
        continue;
      }

      // Prepare email content
      const recipientVariables = {
        ...baseVariables,
        destinataire_civilite: recipient.civilite || "",
        destinataire_nom: recipient.nom,
        destinataire_prenom: recipient.prenom || "",
      };

      const subject = renderTemplate(template.subject, recipientVariables);
      const htmlBody = renderTemplate(template.body_html, recipientVariables);
      const textBody = template.body_text
        ? renderTemplate(template.body_text, recipientVariables)
        : null;

      // Send email
      const emailResult = await sendEmailViaResend(
        recipient.email,
        subject,
        htmlBody,
        textBody,
        documentUrl,
        document.file_name
      );

      if (emailResult.success) {
        await markNotificationSent(supabase, notificationId, emailResult.messageId || "");
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email,
          status: "sent",
          notification_id: notificationId,
          provider_message_id: emailResult.messageId,
        });
        sent++;
      } else {
        await markNotificationFailed(
          supabase,
          notificationId,
          "SEND_ERROR",
          emailResult.error || "Unknown error"
        );
        results.push({
          coproprietaire_id: recipient.id,
          name: `${recipient.prenom || ""} ${recipient.nom}`.trim(),
          email: recipient.email,
          status: "failed",
          notification_id: notificationId,
          error: emailResult.error,
        });
        failed++;
      }

      // Throttle to avoid rate limits (max 10 emails/second for Resend)
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Mettre à jour le statut de l'AG si première convocation
    if (sent > 0 && ag.status === "draft") {
      await supabase
        .from("ag_meetings")
        .update({ status: "convoked", convocation_date: new Date().toISOString() })
        .eq("id", request.ag_id);
    }

    const response: SendConvocationsResponse = {
      success: true,
      summary: {
        total_recipients: recipients.length,
        sent,
        failed,
        skipped,
      },
      details: results,
      delay_warning: delayWarning,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
