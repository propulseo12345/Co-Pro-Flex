// ============================================================================
// Edge Function: ag_add_resolution
// Ajouter une résolution à une AG
// CoProFlex - Niveau 4B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

// Types pour les paramètres d'entrée
interface AddResolutionRequest {
  ag_id: string;
  copro_id: string;
  resolution_number?: number; // Auto-incrémenté si non fourni
  title: string;
  description?: string;
  majority_type: "art24" | "art25" | "art25_1" | "art26" | "art26_1" | "unanimity";
  resolution_type?: "accounts" | "budget" | "works" | "management" | "rules" | "election" | "other";
  amount?: number;
  variables?: Record<string, unknown>; // JSONB variables for template interpolation
}

// Types pour la réponse
interface AddResolutionResponse {
  success: boolean;
  error?: string;
  resolution_id?: string;
  resolution_number?: number;
  title?: string;
  majority_type?: string;
  status?: string;
}

// Validation UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
        } as AddResolutionResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le body
    const params: AddResolutionRequest = await req.json();

    // Validation des paramètres obligatoires
    if (!params.ag_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: ag_id",
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(params.ag_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid ag_id format (must be UUID)",
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.copro_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: copro_id",
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(params.copro_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid copro_id format (must be UUID)",
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.title || params.title.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: title",
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation majority_type
    const validMajorities = ["art24", "art25", "art25_1", "art26", "art26_1", "unanimity"];
    if (!params.majority_type || !validMajorities.includes(params.majority_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid or missing majority_type. Must be one of: ${validMajorities.join(", ")}`,
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation resolution_type si fourni
    const validTypes = ["accounts", "budget", "works", "management", "rules", "election", "other"];
    if (params.resolution_type && !validTypes.includes(params.resolution_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid resolution_type. Must be one of: ${validTypes.join(", ")}`,
        } as AddResolutionResponse),
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
        } as AddResolutionResponse),
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

    // Vérifier que l'AG existe et est modifiable (draft ou convoked)
    const { data: ag, error: agError } = await supabase
      .from("ag_meetings")
      .select("id, status, copro_id")
      .eq("id", params.ag_id)
      .eq("copro_id", params.copro_id)
      .single();

    if (agError || !ag) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AG not found or access denied",
        } as AddResolutionResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que l'AG peut être modifiée
    if (!["draft", "convoked"].includes(ag.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot add resolution to AG in status: ${ag.status}. Only 'draft' or 'convoked' allowed.`,
        } as AddResolutionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Déterminer le numéro de résolution
    let resolutionNumber = params.resolution_number;
    if (!resolutionNumber) {
      // Récupérer le numéro max actuel
      const { data: maxRes } = await supabase
        .from("ag_resolutions")
        .select("resolution_number")
        .eq("ag_id", params.ag_id)
        .order("resolution_number", { ascending: false })
        .limit(1)
        .single();

      resolutionNumber = (maxRes?.resolution_number || 0) + 1;
    }

    // Créer la résolution (include variables for template interpolation)
    const { data: resolution, error: resError } = await supabase
      .from("ag_resolutions")
      .insert({
        ag_id: params.ag_id,
        copro_id: params.copro_id,
        resolution_number: resolutionNumber,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        majority_type: params.majority_type,
        resolution_type: params.resolution_type || "other",
        amount: params.amount || null,
        status: "pending",
        variables: params.variables || null, // JSONB variables for template
      })
      .select("id, resolution_number, title, majority_type, status")
      .single();

    if (resError) {
      log.error("Insert error", { error: resError });

      // Vérifier si c'est une erreur de doublon
      if (resError.code === "23505") {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Resolution number ${resolutionNumber} already exists for this AG`,
          } as AddResolutionResponse),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${resError.message}`,
        } as AddResolutionResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        resolution_id: resolution.id,
        resolution_number: resolution.resolution_number,
        title: resolution.title,
        majority_type: resolution.majority_type,
        status: resolution.status,
      } as AddResolutionResponse),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    log.error("Unexpected error", { error: err });
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      } as AddResolutionResponse),
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
