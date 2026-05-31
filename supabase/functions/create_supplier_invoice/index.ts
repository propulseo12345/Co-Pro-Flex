// ============================================================================
// Edge Function: create_supplier_invoice
// Comptabilise une facture fournisseur via la RPC canonique post_supplier_invoice
// (débit charges 6xx par ligne / crédit 401, TVA portée sur la pièce).
// CoProFlex - WP1 (socle grand livre)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceLine {
  account_id: string;
  label: string;
  amount: number; // TTC
  repartition_key_id?: string;
  budget_line_id?: string;
  amount_ht?: number;
  amount_tva?: number;
  taux_pct?: number;
}

interface CreateInvoiceRequest {
  copro_id: string;
  period_id: string;
  supplier_id: string;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  label: string;
  lines: InvoiceLine[];
  document_id?: string;
  related_service_order_id?: string;
  post_immediately?: boolean;
  montant_ht?: number;
  montant_tva?: number;
  taux_tva?: number;
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

    const body: CreateInvoiceRequest = await req.json();
    const { copro_id, period_id, supplier_id, invoice_number, invoice_date, due_date, label, lines, document_id, related_service_order_id, post_immediately, montant_ht, montant_tva, taux_tva } = body;

    if (!copro_id || !period_id || !supplier_id || !invoice_date || !label || !lines?.length) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const { data, error } = await supabase.rpc("post_supplier_invoice", {
      p_copro_id: copro_id,
      p_period_id: period_id,
      p_supplier_id: supplier_id,
      p_invoice_number: invoice_number ?? null,
      p_invoice_date: invoice_date,
      p_due_date: due_date ?? null,
      p_label: label,
      p_lines: lines,
      p_document_id: document_id ?? null,
      p_related_service_order_id: related_service_order_id ?? null,
      p_post_immediately: post_immediately ?? true,
      p_montant_ht: montant_ht ?? null,
      p_montant_tva: montant_tva ?? null,
      p_taux_tva: taux_tva ?? null,
    });

    if (error) return jsonResponse({ error: "Failed to create supplier invoice", detail: error.message }, 500);
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
