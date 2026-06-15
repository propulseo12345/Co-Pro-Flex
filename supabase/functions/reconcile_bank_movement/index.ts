// ============================================================================
// Edge Function: reconcile_bank_movement
// Pointe un mouvement bancaire avec un paiement DÉJÀ saisi via la RPC canonique
// reconcile_bank_movement (POINTAGE PUR : INSERT bank_matches + status='matched',
// ZÉRO écriture grand livre — le 512 est déjà mouvementé à la saisie du paiement).
// CoProFlex - T9 (rapprochement bancaire — voie d'écriture)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReconcileBankMovementRequest {
  copro_id: string;
  bank_movement_id: string;
  target_type: "payment" | "supplier_payment" | "other";
  target_id: string;
  amount_matched?: number;
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

    const body: ReconcileBankMovementRequest = await req.json();
    const { copro_id, bank_movement_id, target_type, target_id, amount_matched } = body;

    if (!copro_id || !bank_movement_id || !target_type || !target_id) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.rpc("reconcile_bank_movement", {
      p_copro_id: copro_id,
      p_bank_movement_id: bank_movement_id,
      p_target_type: target_type,
      p_target_id: target_id,
      p_amount_matched: amount_matched ?? null,
    });

    if (error) return jsonResponse({ error: "Failed to reconcile bank movement", detail: error.message }, 500);
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
