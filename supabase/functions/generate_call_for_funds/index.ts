// ============================================================================
// Edge Function: generate_call_for_funds
// Émet un appel de fonds via la RPC canonique post_call_for_funds
// (écritures grand livre 450-x par lot / 701|702|105 selon la nature).
// CoProFlex - WP1 (socle grand livre)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateCallRequest {
  copro_id: string;
  period_id: string;
  budget_id?: string | null;
  repartition_key_id: string;
  label: string;
  trimester?: number | null;
  issue_date: string;
  due_date: string;
  total_amount: number;
  description?: string | null;
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
    // Auth obligatoire : endpoint qui meut de l'argent (création d'appels de fonds).
    // On exige un JWT valide et on agit avec les droits de l'utilisateur (pas service-role).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const body: GenerateCallRequest = await req.json();
    const { copro_id, period_id, budget_id, repartition_key_id, label, trimester, issue_date, due_date, total_amount, description } = body;

    if (!copro_id || !period_id || !repartition_key_id || !label || !issue_date || !due_date) {
      return jsonResponse({ error: "Missing required fields", received: { copro_id: !!copro_id, period_id: !!period_id, repartition_key_id: !!repartition_key_id, label: !!label, issue_date: !!issue_date, due_date: !!due_date } }, 400);
    }
    if (!total_amount || total_amount <= 0) {
      return jsonResponse({ error: "total_amount must be positive", received: total_amount }, 400);
    }

    const { data, error } = await supabase.rpc("post_call_for_funds", {
      p_copro_id: copro_id,
      p_period_id: period_id,
      p_budget_id: budget_id ?? null,
      p_repartition_key_id: repartition_key_id,
      p_label: label,
      p_trimester: trimester ?? null,
      p_issue_date: issue_date,
      p_due_date: due_date,
      p_total_amount: total_amount,
      p_description: description ?? null,
    });

    if (error) return jsonResponse({ error: "Failed to generate call for funds", detail: error.message }, 500);
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
