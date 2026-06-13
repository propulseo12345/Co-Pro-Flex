// ============================================================================
// Edge Function: ag_register_attendance
// Enregistrer la présence d'un copropriétaire à une AG
// CoProFlex - Niveau 4B
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { log } from "../_shared/log.ts";

// Types pour les paramètres d'entrée
interface RegisterAttendanceRequest {
  ag_id: string;
  copro_id: string;
  coproprietaire_id: string;
  lot_ids?: string[]; // Si non fourni, récupéré automatiquement
  presence_type: "present" | "proxy" | "correspondence" | "absent";
  represented_by_id?: string; // UUID du représentant (copropriétaire)
  represented_by_name?: string; // Nom si représentant externe
  signed?: boolean;
  signature_data?: string; // Base64 de la signature
}

// Types pour la réponse
interface RegisterAttendanceResponse {
  success: boolean;
  error?: string;
  attendance_id?: string;
  coproprietaire_name?: string;
  presence_type?: string;
  tantiemes?: number;
  lots_count?: number;
  signed?: boolean;
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
        } as RegisterAttendanceResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parser le body
    const params: RegisterAttendanceRequest = await req.json();

    // Validation des paramètres obligatoires
    if (!params.ag_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: ag_id",
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation presence_type
    const validPresenceTypes = ["present", "proxy", "correspondence", "absent"];
    if (!params.presence_type || !validPresenceTypes.includes(params.presence_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid or missing presence_type. Must be one of: ${validPresenceTypes.join(", ")}`,
        } as RegisterAttendanceResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validation des lot_ids si fournis
    if (params.lot_ids && params.lot_ids.length > 0) {
      for (const lotId of params.lot_ids) {
        if (!isValidUUID(lotId)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Invalid lot_id format: ${lotId}`,
            } as RegisterAttendanceResponse),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Pour une procuration, il faut un représentant
    if (params.presence_type === "proxy" && !params.represented_by_id && !params.represented_by_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Proxy attendance requires represented_by_id or represented_by_name",
        } as RegisterAttendanceResponse),
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
        } as RegisterAttendanceResponse),
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

    // Vérifier que l'AG existe et accepte les présences
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
        } as RegisterAttendanceResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que l'AG est dans un état permettant l'enregistrement des présences
    if (!["convoked", "in_progress"].includes(ag.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot register attendance for AG in status: ${ag.status}. Must be 'convoked' or 'in_progress'.`,
        } as RegisterAttendanceResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que le copropriétaire existe
    const { data: coproprietaire, error: coproprietaireError } = await supabase
      .from("coproprietaires")
      .select("id, first_name, last_name")
      .eq("id", params.coproprietaire_id)
      .eq("copro_id", params.copro_id)
      .single();

    if (coproprietaireError || !coproprietaire) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Coproprietaire not found or access denied",
        } as RegisterAttendanceResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier qu'il n'y a pas déjà une présence enregistrée
    const { data: existingAttendance } = await supabase
      .from("ag_attendance")
      .select("id")
      .eq("ag_id", params.ag_id)
      .eq("coproprietaire_id", params.coproprietaire_id)
      .single();

    if (existingAttendance) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Attendance already registered for this coproprietaire",
        } as RegisterAttendanceResponse),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer les lots du copropriétaire si non fournis
    let lotIds = params.lot_ids;
    if (!lotIds || lotIds.length === 0) {
      const { data: lots } = await supabase
        .from("lot_owners")
        .select("lot_id")
        .eq("coproprietaire_id", params.coproprietaire_id)
        .is("end_date", null);

      lotIds = lots?.map(l => l.lot_id) || [];
    }

    if (lotIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Coproprietaire has no active lots",
        } as RegisterAttendanceResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Créer l'enregistrement de présence
    // Note: Les tantièmes seront calculés par le trigger
    const { data: attendance, error: attendanceError } = await supabase
      .from("ag_attendance")
      .insert({
        ag_id: params.ag_id,
        copro_id: params.copro_id,
        coproprietaire_id: params.coproprietaire_id,
        lot_ids: lotIds,
        presence_type: params.presence_type,
        represented_by_id: params.represented_by_id || null,
        represented_by_name: params.represented_by_name || null,
        signed: params.signed || false,
        signed_at: params.signed ? new Date().toISOString() : null,
        signature_data: params.signature_data || null,
        arrived_at: params.presence_type === "present" ? new Date().toISOString() : null,
      })
      .select("id, presence_type, tantiemes, signed")
      .single();

    if (attendanceError) {
      log.error("Insert error", { error: attendanceError });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${attendanceError.message}`,
        } as RegisterAttendanceResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const coproprietaireName = `${coproprietaire.first_name || ""} ${coproprietaire.last_name || ""}`.trim();

    return new Response(
      JSON.stringify({
        success: true,
        attendance_id: attendance.id,
        coproprietaire_name: coproprietaireName,
        presence_type: attendance.presence_type,
        tantiemes: attendance.tantiemes,
        lots_count: lotIds.length,
        signed: attendance.signed,
      } as RegisterAttendanceResponse),
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
      } as RegisterAttendanceResponse),
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
