// ============================================================================
// Edge Function: pay_supplier_invoice
// Règle une facture fournisseur via la RPC canonique post_supplier_payment
// (débit 401 / crédit 512, lettrage de la facture).
// CoProFlex - WP1 (socle grand livre)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayInvoiceRequest {
  copro_id: string;
  period_id: string;
  supplier_invoice_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  idempotency_key?: string;
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const body: PayInvoiceRequest = await req.json();
    const { copro_id, period_id, supplier_invoice_id, amount, payment_date, method, reference, idempotency_key } = body;

    if (!copro_id || !period_id || !supplier_invoice_id || !amount || !payment_date) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.rpc("post_supplier_payment", {
      p_copro_id: copro_id,
      p_period_id: period_id,
      p_supplier_invoice_id: supplier_invoice_id,
      p_amount: amount,
      p_payment_date: payment_date,
      p_method: method ?? "transfer",
      p_reference: reference ?? null,
      p_idempotency_key: idempotency_key ?? null,
    });

    if (error) return jsonResponse({ error: "Failed to pay supplier invoice", detail: error.message }, 500);
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
