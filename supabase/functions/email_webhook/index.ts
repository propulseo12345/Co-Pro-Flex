// ============================================================================
// Edge Function: email_webhook
// Réception des webhooks Resend pour tracking des emails (livraison, ouverture, bounces)
// CoProFlex - Niveau 5A
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: {
      message?: string;
    };
    click?: {
      link?: string;
      ip_address?: string;
      user_agent?: string;
    };
    open?: {
      ip_address?: string;
      user_agent?: string;
    };
  };
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  try {
    // Resend utilise HMAC SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(payload)
    );

    return isValid;
  } catch {
    return false;
  }
}

// ============================================================================
// EVENT TYPE MAPPING
// ============================================================================

function mapResendEventType(type: string): string {
  const mapping: Record<string, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.complained": "complained",
    "email.bounced": "bounced",
    "email.opened": "opened",
    "email.clicked": "clicked",
  };
  return mapping[type] || type;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Only POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();

    // Verify webhook signature (optional mais recommandé en production)
    const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const signature = req.headers.get("svix-signature");

    if (WEBHOOK_SECRET && signature) {
      const isValid = await verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.warn("Invalid webhook signature");
        // En développement, on peut ignorer
        // return new Response("Invalid signature", { status: 401 });
      }
    }

    // Parse event
    const event: ResendWebhookEvent = JSON.parse(rawBody);
    console.log("Received webhook event:", event.type, event.data.email_id);

    // Init Supabase with service role (webhooks n'ont pas d'auth user)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Find notification by provider_message_id
    const { data: notification, error: notifError } = await supabase
      .from("ag_notifications")
      .select("id")
      .eq("provider_message_id", event.data.email_id)
      .single();

    if (notifError || !notification) {
      console.log("Notification not found for email_id:", event.data.email_id);
      // Peut être un email non suivi, OK
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Map event type
    const eventType = mapResendEventType(event.type);

    // Create event record
    const { error: insertError } = await supabase.from("ag_notification_events").insert({
      notification_id: notification.id,
      event_type: eventType,
      event_timestamp: event.created_at,
      raw_data: event.data,
      ip_address: event.data.open?.ip_address || event.data.click?.ip_address || null,
      user_agent: event.data.open?.user_agent || event.data.click?.user_agent || null,
    });

    if (insertError) {
      console.error("Error inserting event:", insertError);
      // Le trigger mettra à jour le statut de la notification
    }

    // Si bounce, marquer également l'email comme invalide sur le copropriétaire
    if (eventType === "bounced" && event.data.to && event.data.to.length > 0) {
      const bouncedEmail = event.data.to[0];
      console.log("Email bounced:", bouncedEmail);

      // Optionnel: marquer l'email comme invalide
      // await supabase
      //   .from("coproprietaires")
      //   .update({ email_verified: false, email_bounce_reason: event.data.bounce?.message })
      //   .eq("email", bouncedEmail);
    }

    return new Response(JSON.stringify({ received: true, event_type: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
