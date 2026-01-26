// ============================================================================
// Edge Function: ag_create
// Créer une nouvelle Assemblée Générale
// CoProFlex - Niveau 4B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types pour les paramètres d'entrée
interface CreateAGRequest {
  copro_id: string;
  title: string;
  meeting_type?: "ordinary" | "extraordinary" | "special";
  meeting_date: string; // ISO format
  location: string;
  convocation_date?: string; // ISO format
  include_standard_resolutions?: boolean; // Pour AG ordinaire
}

// Types pour la réponse
interface CreateAGResponse {
  success: boolean;
  error?: string;
  ag_id?: string;
  title?: string;
  meeting_date?: string;
  status?: string;
  convocation_date?: string;
  resolutions_count?: number;
}

// Validation UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validation date ISO
function isValidISODate(str: string): boolean {
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
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
        } as CreateAGResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le body
    const params: CreateAGRequest = await req.json();

    // Validation des paramètres obligatoires
    if (!params.copro_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: copro_id",
        } as CreateAGResponse),
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
        } as CreateAGResponse),
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
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.meeting_date) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: meeting_date",
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidISODate(params.meeting_date)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid meeting_date format (must be ISO date)",
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.location || params.location.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: location",
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation meeting_type
    const validTypes = ["ordinary", "extraordinary", "special"];
    if (params.meeting_type && !validTypes.includes(params.meeting_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid meeting_type. Must be one of: ${validTypes.join(", ")}`,
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation convocation_date si fournie
    if (params.convocation_date && !isValidISODate(params.convocation_date)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid convocation_date format (must be ISO date)",
        } as CreateAGResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que la date de l'AG est dans le futur
    const meetingDate = new Date(params.meeting_date);
    if (meetingDate <= new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "meeting_date must be in the future",
        } as CreateAGResponse),
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
        } as CreateAGResponse),
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

    // Vérifier que la copropriété existe
    const { data: copro, error: coproError } = await supabase
      .from("copros")
      .select("id, name")
      .eq("id", params.copro_id)
      .single();

    if (coproError || !copro) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Copropriété not found or access denied",
        } as CreateAGResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Si include_standard_resolutions est true et c'est une AG ordinaire, utiliser la fonction SQL
    if (params.include_standard_resolutions && params.meeting_type !== "extraordinary") {
      const { data, error } = await supabase.rpc("create_ag_with_standard_resolutions", {
        p_copro_id: params.copro_id,
        p_title: params.title.trim(),
        p_meeting_date: params.meeting_date,
        p_location: params.location.trim(),
      });

      if (error) {
        console.error("RPC error:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${error.message}`,
          } as CreateAGResponse),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Récupérer le nombre de résolutions créées
      const { count } = await supabase
        .from("ag_resolutions")
        .select("*", { count: "exact", head: true })
        .eq("ag_id", data);

      return new Response(
        JSON.stringify({
          success: true,
          ag_id: data,
          title: params.title.trim(),
          meeting_date: params.meeting_date,
          status: "draft",
          resolutions_count: count || 0,
        } as CreateAGResponse),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sinon, créer l'AG simplement
    const { data: ag, error: agError } = await supabase
      .from("ag_meetings")
      .insert({
        copro_id: params.copro_id,
        title: params.title.trim(),
        meeting_type: params.meeting_type || "ordinary",
        meeting_date: params.meeting_date,
        location: params.location.trim(),
        convocation_date: params.convocation_date || null,
        status: "draft",
      })
      .select("id, title, meeting_date, status, convocation_date")
      .single();

    if (agError) {
      console.error("Insert error:", agError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${agError.message}`,
        } as CreateAGResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ag_id: ag.id,
        title: ag.title,
        meeting_date: ag.meeting_date,
        status: ag.status,
        convocation_date: ag.convocation_date,
        resolutions_count: 0,
      } as CreateAGResponse),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      } as CreateAGResponse),
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
