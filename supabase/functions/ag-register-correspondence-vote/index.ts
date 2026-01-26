import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VoteItem {
  resolution_id: string;
  vote: "for" | "against" | "abstention";
}

interface RequestBody {
  ag_id: string;
  coproprietaire_id: string;
  votes: VoteItem[];
  mode_reception?: "postal" | "email" | "remise_main";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const body: RequestBody = await req.json();
    const { ag_id, coproprietaire_id, votes, mode_reception = "postal" } = body;

    // Validate required fields
    if (!ag_id || !coproprietaire_id || !votes || !Array.isArray(votes)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: ag_id, coproprietaire_id, votes (array)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate votes array
    for (const v of votes) {
      if (!v.resolution_id || !v.vote) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Each vote must have resolution_id and vote fields",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!["for", "against", "abstention"].includes(v.vote)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Vote must be 'for', 'against', or 'abstention'",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Call the database function to register all votes
    const { data, error } = await supabase.rpc("register_correspondence_form_votes", {
      p_ag_id: ag_id,
      p_coproprietaire_id: coproprietaire_id,
      p_votes: votes,
      p_mode_reception: mode_reception,
    });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
