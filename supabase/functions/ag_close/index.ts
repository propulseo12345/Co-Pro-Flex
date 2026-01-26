// ============================================================================
// Edge Function: ag_close
// Clôturer une Assemblée Générale
// CoProFlex - Niveau 4B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types pour les paramètres d'entrée
interface CloseAGRequest {
  ag_id: string;
  copro_id: string;
  closing_notes?: string;
  generate_pv?: boolean; // Si true, génère le PV automatiquement
}

// Types pour la réponse
interface CloseAGResponse {
  success: boolean;
  error?: string;
  ag_id?: string;
  status?: string;
  session_ended_at?: string;
  summary?: {
    total_resolutions: number;
    resolutions_adopted: number;
    resolutions_rejected: number;
    resolutions_pending: number;
    total_attendees: number;
    attendees_present: number;
    attendees_proxy: number;
    attendees_correspondence: number;
    quorum_reached: boolean;
    total_tantiemes_present: number;
    quorum_percentage: number;
  };
  warnings?: string[];
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
        } as CloseAGResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le body
    const params: CloseAGRequest = await req.json();

    // Validation des paramètres obligatoires
    if (!params.ag_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: ag_id",
        } as CloseAGResponse),
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
        } as CloseAGResponse),
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
        } as CloseAGResponse),
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
        } as CloseAGResponse),
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
        } as CloseAGResponse),
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

    // Appeler la fonction SQL close_ag
    const { data, error } = await supabase.rpc("close_ag", {
      p_ag_id: params.ag_id,
      p_closing_notes: params.closing_notes || null,
    });

    if (error) {
      console.error("RPC error:", error);

      // Vérifier si c'est une erreur métier connue
      if (error.message.includes("not in_progress")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AG is not in progress. Only in_progress AG can be closed.",
          } as CloseAGResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (error.message.includes("not found")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AG not found or access denied",
          } as CloseAGResponse),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`,
        } as CloseAGResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer les détails de l'AG clôturée
    const { data: ag } = await supabase
      .from("ag_meetings")
      .select("id, status, session_ended_at")
      .eq("id", params.ag_id)
      .single();

    // Récupérer le résumé des résolutions
    const { data: resolutions } = await supabase
      .from("ag_resolutions")
      .select("status")
      .eq("ag_id", params.ag_id);

    const resolutionsSummary = {
      total: resolutions?.length || 0,
      adopted: resolutions?.filter(r => r.status === "adopted").length || 0,
      rejected: resolutions?.filter(r => r.status === "rejected").length || 0,
      pending: resolutions?.filter(r => r.status === "pending" || r.status === "voting").length || 0,
    };

    // Récupérer le résumé des présences
    const { data: attendees } = await supabase
      .from("ag_attendance")
      .select("presence_type, tantiemes")
      .eq("ag_id", params.ag_id);

    const attendeesSummary = {
      total: attendees?.length || 0,
      present: attendees?.filter(a => a.presence_type === "present").length || 0,
      proxy: attendees?.filter(a => a.presence_type === "proxy").length || 0,
      correspondence: attendees?.filter(a => a.presence_type === "correspondence").length || 0,
    };

    // Calculer le quorum
    const { data: quorum } = await supabase.rpc("compute_ag_quorum", {
      p_ag_id: params.ag_id,
    });

    const warnings: string[] = [];

    // Avertissements
    if (resolutionsSummary.pending > 0) {
      warnings.push(`${resolutionsSummary.pending} résolution(s) non votée(s)`);
    }

    if (quorum && !quorum.quorum_reached) {
      warnings.push("Le quorum n'était pas atteint");
    }

    // Si demandé, on pourrait déclencher la génération du PV ici
    // Pour l'instant, on retourne juste un indicateur
    if (params.generate_pv) {
      warnings.push("La génération automatique du PV n'est pas encore implémentée");
    }

    return new Response(
      JSON.stringify({
        success: true,
        ag_id: ag?.id || params.ag_id,
        status: ag?.status || "closed",
        session_ended_at: ag?.session_ended_at,
        summary: {
          total_resolutions: resolutionsSummary.total,
          resolutions_adopted: resolutionsSummary.adopted,
          resolutions_rejected: resolutionsSummary.rejected,
          resolutions_pending: resolutionsSummary.pending,
          total_attendees: attendeesSummary.total,
          attendees_present: attendeesSummary.present,
          attendees_proxy: attendeesSummary.proxy,
          attendees_correspondence: attendeesSummary.correspondence,
          quorum_reached: quorum?.quorum_reached || false,
          total_tantiemes_present: quorum?.tantiemes_present || 0,
          quorum_percentage: quorum?.quorum_percentage || 0,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      } as CloseAGResponse),
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
      } as CloseAGResponse),
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
