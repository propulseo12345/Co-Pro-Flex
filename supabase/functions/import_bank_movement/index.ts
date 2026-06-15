// ============================================================================
// Edge Function: import_bank_movement
// Importe un relevé bancaire via la RPC canonique import_bank_movements
// (INSERT bank_movements en status 'unmatched', skip des doublons bank_ref).
// CoProFlex - T9 (rapprochement bancaire — voie d'écriture)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BankMovementInput {
  bank_date: string;
  value_date?: string;
  amount_signed: number;
  label: string;
  bank_ref?: string;
}

interface ImportBankMovementRequest {
  copro_id: string;
  period_id: string;
  account_id: string;
  movements: BankMovementInput[];
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

    const body: ImportBankMovementRequest = await req.json();
    const { copro_id, period_id, account_id, movements } = body;

    if (!copro_id || !period_id || !account_id || !Array.isArray(movements)) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.rpc("import_bank_movements", {
      p_copro_id: copro_id,
      p_period_id: period_id,
      p_account_id: account_id,
      p_movements: movements,
    });

    if (error) return jsonResponse({ error: "Failed to import bank movements", detail: error.message }, 500);
    return jsonResponse(data ?? { imported: 0, skipped: 0, errors: [] });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
