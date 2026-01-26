// ============================================================================
// Edge Function: generate_owner_statement
// Génère un relevé individuel pour un copropriétaire
// CoProFlex - Niveau 2G
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types pour les paramètres d'entrée
interface StatementRequest {
  copro_id: string;
  owner_id: string;
  period_id?: string;
  date_from?: string; // Format YYYY-MM-DD
  date_to?: string;   // Format YYYY-MM-DD
}

// Types pour la réponse
interface StatementResponse {
  success: boolean;
  error?: string;
  generated_at?: string;
  copro?: {
    id: string;
    name: string;
    address?: string;
    siret?: string;
  };
  owner?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  period?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  filters?: {
    date_from?: string;
    date_to?: string;
  };
  summary?: {
    total_debit_calls: number;
    total_credit_payments: number;
    balance_end: number;
    unpaid_amount: number;
    unpaid_lines_count: number;
    oldest_due_date?: string;
    days_overdue?: number;
    lots_count: number;
    total_tantiemes: number;
  };
  lots?: Array<{
    lot_id: string;
    ref: string;
    type: string;
    tantiemes: number;
    floor?: string;
    surface?: number;
  }>;
  lines?: Array<{
    line_date: string;
    line_type: "call" | "payment";
    label: string;
    debit: number;
    credit: number;
    running_balance: number;
    related_id: string;
    lot_ref: string;
    due_date?: string;
    line_status: string;
  }>;
  lines_count?: number;
}

// Validation UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validation date format YYYY-MM-DD
function isValidDate(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Vérifier la méthode HTTP
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST or GET.",
        } as StatementResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extraire les paramètres selon la méthode
    let params: StatementRequest;

    if (req.method === "POST") {
      const body = await req.json();
      params = body as StatementRequest;
    } else {
      // GET: paramètres depuis l'URL
      const url = new URL(req.url);
      params = {
        copro_id: url.searchParams.get("copro_id") || "",
        owner_id: url.searchParams.get("owner_id") || "",
        period_id: url.searchParams.get("period_id") || undefined,
        date_from: url.searchParams.get("date_from") || undefined,
        date_to: url.searchParams.get("date_to") || undefined,
      };
    }

    // Validation des paramètres obligatoires
    if (!params.copro_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: copro_id",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.owner_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: owner_id",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation format UUID
    if (!isValidUUID(params.copro_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid copro_id format (must be UUID)",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(params.owner_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid owner_id format (must be UUID)",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (params.period_id && !isValidUUID(params.period_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid period_id format (must be UUID)",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation dates optionnelles
    if (params.date_from && !isValidDate(params.date_from)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid date_from format (must be YYYY-MM-DD)",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (params.date_to && !isValidDate(params.date_to)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid date_to format (must be YYYY-MM-DD)",
        } as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Créer le client Supabase avec le token de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Authorization header",
        } as StatementResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Appeler la fonction SQL get_owner_statement
    const { data, error } = await supabase.rpc("get_owner_statement", {
      p_copro_id: params.copro_id,
      p_owner_id: params.owner_id,
      p_period_id: params.period_id || null,
      p_date_from: params.date_from || null,
      p_date_to: params.date_to || null,
    });

    if (error) {
      console.error("RPC error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`,
        } as StatementResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier le succès de la fonction SQL
    if (!data.success) {
      return new Response(
        JSON.stringify(data as StatementResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retourner le relevé
    return new Response(
      JSON.stringify(data as StatementResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      } as StatementResponse),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
});
