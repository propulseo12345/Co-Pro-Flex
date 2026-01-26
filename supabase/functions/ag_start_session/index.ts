/**
 * Edge Function: ag_start_session
 * ACTION 8: Démarrer une session AG (remplace l'écriture directe front)
 *
 * Vérifie:
 * - L'utilisateur est manager de la copro
 * - L'AG existe et est en statut 'convoked'
 * - Met à jour le statut vers 'in_progress' et session_started_at
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types
interface RequestBody {
  ag_id: string;
}

interface AgMeeting {
  id: string;
  copro_id: string;
  status: string;
  title: string;
  meeting_date: string;
}

interface SuccessResponse {
  success: true;
  ag_id: string;
  status: string;
  started_at: string;
  message: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type Response = SuccessResponse | ErrorResponse;

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { ag_id } = body;

    if (!ag_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: ag_id",
          code: "INVALID_INPUT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the AG
    const { data: ag, error: agError } = await supabase
      .from("ag_meetings")
      .select("id, copro_id, status, title, meeting_date")
      .eq("id", ag_id)
      .single();

    if (agError || !ag) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `AG not found: ${ag_id}`,
          code: "NOT_FOUND",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const agData = ag as AgMeeting;

    // Check user is manager of the copro via RPC
    const { data: isManager, error: managerError } = await supabase.rpc(
      "user_is_copro_manager",
      { p_copro_id: agData.copro_id }
    );

    if (managerError) {
      console.error("Manager check error:", managerError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify permissions",
          code: "PERMISSION_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isManager) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only managers can start an AG session",
          code: "FORBIDDEN",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check AG status
    const validStartStatuses = ["convoked"];
    if (!validStartStatuses.includes(agData.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot start AG in status '${agData.status}'. Must be in 'convoked' status.`,
          code: "INVALID_STATUS",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update AG status to in_progress
    const startedAt = new Date().toISOString();
    const { data: updatedAg, error: updateError } = await supabase
      .from("ag_meetings")
      .update({
        status: "in_progress",
        session_started_at: startedAt,
        updated_at: startedAt,
      })
      .eq("id", ag_id)
      .eq("status", "convoked") // Optimistic locking
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to start AG session. It may have been modified by another user.",
          code: "UPDATE_FAILED",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update all pending resolutions to ready for voting
    await supabase
      .from("ag_resolutions")
      .update({ status: "pending" })
      .eq("ag_id", ag_id)
      .eq("status", "draft");

    // Success response
    const response: SuccessResponse = {
      success: true,
      ag_id: ag_id,
      status: "in_progress",
      started_at: startedAt,
      message: `AG "${agData.title}" session started successfully`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
