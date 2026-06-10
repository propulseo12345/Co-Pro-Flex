// ============================================================================
// Edge Function: record_payment
// Encaisse un paiement copropriétaire via la RPC canonique post_owner_payment
// (allocation FIFO + écritures 512 / 450-x ventilées, trop-perçu -> 450-3).
// CoProFlex - WP1 (socle grand livre)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecordPaymentRequest {
  copro_id: string;
  period_id: string;
  lot_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  call_line_ids?: string[];
  idempotency_key?: string;
  nature_filter?: string;
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

    const body: RecordPaymentRequest = await req.json();
    const { copro_id, period_id, lot_id, amount, payment_date, method, reference, call_line_ids, idempotency_key, nature_filter } = body;

    if (!copro_id || !period_id || !lot_id || !amount || !payment_date) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.rpc("post_owner_payment", {
      p_copro_id: copro_id,
      p_period_id: period_id,
      p_lot_id: lot_id,
      p_amount: amount,
      p_payment_date: payment_date,
      p_method: method ?? "transfer",
      p_reference: reference ?? null,
      p_call_line_ids: call_line_ids ?? null,
      p_idempotency_key: idempotency_key ?? null,
      p_nature_filter: nature_filter ?? null,
    });

    if (error) return jsonResponse({ error: "Failed to record payment", detail: error.message }, 500);
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
