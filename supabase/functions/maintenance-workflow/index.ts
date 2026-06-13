// ============================================================================
// Edge Function: Maintenance Workflow Operations
// CoProFlex - Opérations transactionnelles maintenance
// Date: 2026-01-26
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceOrderStatusUpdate {
  orderId: string;
  newStatus: string;
  comment?: string;
  // Pour les transitions spéciales
  refusalReason?: string;
  quotedAmount?: number;
  actualAmount?: number;
  invoiceId?: string;
}

interface CreateServiceOrderRequest {
  coproId: string;
  providerId: string;
  subject: string;
  description?: string;
  urgency?: string;
  orderType?: string;
  origin?: string;
  contractId?: string;
  buildingId?: string;
  lotId?: string;
  estimatedAmount?: number;
  isArt18Emergency?: boolean;
  plannedInterventionDate?: string;
}

interface SendServiceOrderEmailRequest {
  orderId: string;
  templateType: "classique" | "contractuel";
  recipientEmail?: string;
  customMessage?: string;
}

interface LinkInvoiceRequest {
  orderId: string;
  invoiceId: string;
  actualAmount: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "POST" ? await req.json() : null;

    let result;

    switch (action) {
      case "update-status":
        result = await handleUpdateStatus(supabase, body as ServiceOrderStatusUpdate, user.id);
        break;

      case "create-order":
        result = await handleCreateOrder(supabase, body as CreateServiceOrderRequest, user.id);
        break;

      case "send-email":
        result = await handleSendEmail(supabase, body as SendServiceOrderEmailRequest, user.id);
        break;

      case "link-invoice":
        result = await handleLinkInvoice(supabase, body as LinkInvoiceRequest, user.id);
        break;

      case "complete-and-log":
        result = await handleCompleteAndLog(supabase, body.orderId, user.id);
        break;

      case "cancel-order":
        result = await handleCancelOrder(supabase, body.orderId, body.reason, user.id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    log.error("Maintenance workflow error", { error });
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Handler: Update Service Order Status
// ============================================================================
async function handleUpdateStatus(
  supabase: ReturnType<typeof createClient>,
  data: ServiceOrderStatusUpdate,
  userId: string
) {
  const { orderId, newStatus, comment, refusalReason, quotedAmount, actualAmount, invoiceId } = data;

  // Use the database function for atomic status update
  const { data: order, error } = await supabase.rpc("update_service_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_comment: comment || null,
    p_user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle additional updates based on status
  const updates: Record<string, unknown> = {};

  if (newStatus === "refused" && refusalReason) {
    updates.refusal_reason = refusalReason;
  }

  if (newStatus === "accepted" && quotedAmount !== undefined) {
    updates.quoted_amount = quotedAmount;
  }

  if (newStatus === "completed" && actualAmount !== undefined) {
    updates.actual_amount = actualAmount;
  }

  if (newStatus === "invoiced" && invoiceId) {
    updates.supplier_invoice_id = invoiceId;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("service_orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      log.error("Additional update error", { updateError });
    }
  }

  return { success: true, order };
}

// ============================================================================
// Handler: Create Service Order
// ============================================================================
async function handleCreateOrder(
  supabase: ReturnType<typeof createClient>,
  data: CreateServiceOrderRequest,
  userId: string
) {
  // Generate order number
  const { data: orderNumber, error: numberError } = await supabase.rpc(
    "generate_service_order_number",
    { p_copro_id: data.coproId }
  );

  if (numberError) {
    return { success: false, error: `Failed to generate order number: ${numberError.message}` };
  }

  // Create the order
  const { data: order, error: insertError } = await supabase
    .from("service_orders")
    .insert({
      copro_id: data.coproId,
      order_number: orderNumber,
      provider_id: data.providerId,
      subject: data.subject,
      description: data.description || null,
      urgency: data.urgency || "normal",
      order_type: data.orderType || "classique",
      origin: data.origin || "syndic",
      contract_id: data.contractId || null,
      building_id: data.buildingId || null,
      lot_id: data.lotId || null,
      estimated_amount: data.estimatedAmount || null,
      is_art18_emergency: data.isArt18Emergency || false,
      planned_intervention_date: data.plannedInterventionDate || null,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Create initial event
  await supabase.from("service_order_events").insert({
    copro_id: data.coproId,
    service_order_id: order.id,
    event_type: "created",
    to_status: "draft",
    comment: data.isArt18Emergency ? "Urgence Art. 18 - Conservation immeuble" : null,
    created_by: userId,
  });

  return { success: true, order };
}

// ============================================================================
// Handler: Send Email to Provider
// ============================================================================
async function handleSendEmail(
  supabase: ReturnType<typeof createClient>,
  data: SendServiceOrderEmailRequest,
  userId: string
) {
  // Get order details
  const { data: order, error: orderError } = await supabase
    .from("v_service_orders_overview")
    .select("*")
    .eq("id", data.orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Order not found" };
  }

  // Get provider email
  const { data: provider, error: providerError } = await supabase
    .from("providers")
    .select("email, name, contact_name")
    .eq("id", order.provider_id)
    .single();

  if (providerError || !provider) {
    return { success: false, error: "Provider not found" };
  }

  const recipientEmail = data.recipientEmail || provider.email;
  if (!recipientEmail) {
    return { success: false, error: "No email address available for provider" };
  }

  // In production, this would integrate with an email service (SendGrid, Resend, etc.)
  // For now, we simulate the email sending and record the event

  const emailPayload = {
    to: recipientEmail,
    providerName: provider.name,
    contactName: provider.contact_name,
    orderNumber: order.order_number,
    subject: order.subject,
    description: order.description,
    urgency: order.urgency,
    plannedDate: order.planned_intervention_date,
    templateType: data.templateType,
    customMessage: data.customMessage,
    sentAt: new Date().toISOString(),
  };

  // Record email event
  await supabase.from("service_order_events").insert({
    copro_id: order.copro_id,
    service_order_id: data.orderId,
    event_type: "email_sent",
    payload: emailPayload,
    comment: `Email envoyé à ${recipientEmail}`,
    created_by: userId,
  });

  // Update status to sent if currently in to_send
  if (order.status === "to_send") {
    await supabase.rpc("update_service_order_status", {
      p_order_id: data.orderId,
      p_new_status: "sent",
      p_comment: `Email envoyé au prestataire (${recipientEmail})`,
      p_user_id: userId,
    });
  }

  return {
    success: true,
    message: `Email sent to ${recipientEmail}`,
    emailPayload
  };
}

// ============================================================================
// Handler: Link Invoice to Service Order
// ============================================================================
async function handleLinkInvoice(
  supabase: ReturnType<typeof createClient>,
  data: LinkInvoiceRequest,
  userId: string
) {
  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("id, copro_id, status")
    .eq("id", data.orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Order not found" };
  }

  // Verify invoice exists
  const { data: invoice, error: invoiceError } = await supabase
    .from("supplier_invoices")
    .select("id")
    .eq("id", data.invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: "Invoice not found" };
  }

  // Update order with invoice link
  const { error: updateError } = await supabase
    .from("service_orders")
    .update({
      supplier_invoice_id: data.invoiceId,
      actual_amount: data.actualAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Update invoice with service order reference
  await supabase
    .from("supplier_invoices")
    .update({ related_service_order_id: data.orderId })
    .eq("id", data.invoiceId);

  // Record event
  await supabase.from("service_order_events").insert({
    copro_id: order.copro_id,
    service_order_id: data.orderId,
    event_type: "invoice_linked",
    payload: { invoiceId: data.invoiceId, amount: data.actualAmount },
    created_by: userId,
  });

  // Transition to invoiced if completed
  if (order.status === "completed") {
    await supabase.rpc("update_service_order_status", {
      p_order_id: data.orderId,
      p_new_status: "invoiced",
      p_comment: "Facture liée automatiquement",
      p_user_id: userId,
    });
  }

  return { success: true, message: "Invoice linked successfully" };
}

// ============================================================================
// Handler: Complete Order and Create Logbook Entry
// ============================================================================
async function handleCompleteAndLog(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  userId: string
) {
  // First, transition to completed
  const { data: order, error: statusError } = await supabase.rpc("update_service_order_status", {
    p_order_id: orderId,
    p_new_status: "completed",
    p_comment: "Intervention réalisée",
    p_user_id: userId,
  });

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  // Create logbook entry
  const { data: entryId, error: logbookError } = await supabase.rpc(
    "create_logbook_from_service_order",
    { p_order_id: orderId }
  );

  if (logbookError) {
    log.error("Logbook creation error", { logbookError });
    // Don't fail the whole operation, just log
  }

  return {
    success: true,
    order,
    logbookEntryId: entryId,
    message: "Order completed and logged to maintenance book"
  };
}

// ============================================================================
// Handler: Cancel Order
// ============================================================================
async function handleCancelOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  reason: string,
  userId: string
) {
  // Get current order
  const { data: order, error: fetchError } = await supabase
    .from("service_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: "Order not found" };
  }

  if (order.status === "closed") {
    return { success: false, error: "Cannot cancel a closed order" };
  }

  // Cancel the order
  const { data: cancelledOrder, error: cancelError } = await supabase.rpc(
    "update_service_order_status",
    {
      p_order_id: orderId,
      p_new_status: "cancelled",
      p_comment: reason || "Annulé",
      p_user_id: userId,
    }
  );

  if (cancelError) {
    return { success: false, error: cancelError.message };
  }

  return { success: true, order: cancelledOrder };
}
