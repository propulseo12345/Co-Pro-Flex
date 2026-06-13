// ============================================================================
// Edge Function: ag_cast_vote
// Enregistrer un vote sur une résolution
// CoProFlex - Niveau 4B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

// Types pour les paramètres d'entrée
interface CastVoteRequest {
  resolution_id: string;
  copro_id: string;
  coproprietaire_id: string;
  vote: "for" | "against" | "abstention";
  vote_source?: "live" | "correspondence" | "proxy";
}

// Types pour la réponse
interface CastVoteResponse {
  success: boolean;
  error?: string;
  vote_id?: string;
  resolution_title?: string;
  vote?: string;
  tantiemes?: number;
  vote_source?: string;
  current_result?: {
    votes_for: number;
    votes_against: number;
    votes_abstention: number;
    tantiemes_for: number;
    tantiemes_against: number;
    tantiemes_abstention: number;
  };
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
        } as CastVoteResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le body
    const params: CastVoteRequest = await req.json();

    // Validation des paramètres obligatoires
    if (!params.resolution_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: resolution_id",
        } as CastVoteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(params.resolution_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid resolution_id format (must be UUID)",
        } as CastVoteResponse),
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
        } as CastVoteResponse),
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
        } as CastVoteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!params.coproprietaire_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: coproprietaire_id",
        } as CastVoteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUUID(params.coproprietaire_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid coproprietaire_id format (must be UUID)",
        } as CastVoteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation vote
    const validVotes = ["for", "against", "abstention"];
    if (!params.vote || !validVotes.includes(params.vote)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid or missing vote. Must be one of: ${validVotes.join(", ")}`,
        } as CastVoteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation vote_source si fourni
    const validSources = ["live", "correspondence", "proxy"];
    if (params.vote_source && !validSources.includes(params.vote_source)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid vote_source. Must be one of: ${validSources.join(", ")}`,
        } as CastVoteResponse),
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
        } as CastVoteResponse),
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

    // Appeler la fonction SQL cast_vote
    const { data, error } = await supabase.rpc("cast_vote", {
      p_resolution_id: params.resolution_id,
      p_coproprietaire_id: params.coproprietaire_id,
      p_vote: params.vote,
      p_vote_source: params.vote_source || "live",
    });

    if (error) {
      log.error("RPC error", { error });

      // Vérifier si c'est une erreur métier connue
      if (error.message.includes("already voted")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This coproprietaire has already voted on this resolution",
          } as CastVoteResponse),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (error.message.includes("not registered")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Coproprietaire is not registered as attending this AG",
          } as CastVoteResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (error.message.includes("not in voting status")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Resolution is not open for voting",
          } as CastVoteResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`,
        } as CastVoteResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer les détails du vote créé
    const { data: voteDetails } = await supabase
      .from("ag_votes")
      .select("id, vote, tantiemes, vote_source")
      .eq("resolution_id", params.resolution_id)
      .eq("coproprietaire_id", params.coproprietaire_id)
      .single();

    // Récupérer le titre de la résolution
    const { data: resolution } = await supabase
      .from("ag_resolutions")
      .select("title")
      .eq("id", params.resolution_id)
      .single();

    // Récupérer les résultats actuels
    const { data: currentResults } = await supabase
      .from("ag_votes")
      .select("vote, tantiemes")
      .eq("resolution_id", params.resolution_id);

    const results = {
      votes_for: 0,
      votes_against: 0,
      votes_abstention: 0,
      tantiemes_for: 0,
      tantiemes_against: 0,
      tantiemes_abstention: 0,
    };

    if (currentResults) {
      for (const v of currentResults) {
        if (v.vote === "for") {
          results.votes_for++;
          results.tantiemes_for += v.tantiemes || 0;
        } else if (v.vote === "against") {
          results.votes_against++;
          results.tantiemes_against += v.tantiemes || 0;
        } else if (v.vote === "abstention") {
          results.votes_abstention++;
          results.tantiemes_abstention += v.tantiemes || 0;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        vote_id: voteDetails?.id || data,
        resolution_title: resolution?.title,
        vote: voteDetails?.vote || params.vote,
        tantiemes: voteDetails?.tantiemes,
        vote_source: voteDetails?.vote_source || params.vote_source || "live",
        current_result: results,
      } as CastVoteResponse),
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
      } as CastVoteResponse),
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
