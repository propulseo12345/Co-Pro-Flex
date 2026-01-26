// ============================================================================
// Edge Function: Council Syndical Workflow Operations
// CoProFlex - Opérations du Conseil Syndical
// Date: 2026-01-26
// Référentiel: Loi 65-557 Art.21-22
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// INTERFACES
// ============================================================================

interface CreateDecisionRequest {
  coproId: string;
  title: string;
  description?: string;
  submitImmediately?: boolean;
  linkedAgId?: string;
  linkedResolutionId?: string;
}

interface CastVoteRequest {
  decisionId: string;
  vote: "for" | "against" | "abstention";
  comment?: string;
}

interface UpdateDecisionStatusRequest {
  decisionId: string;
  newStatus: "submitted" | "approved" | "rejected" | "archived";
  rejectionReason?: string;
}

interface AttachDocumentRequest {
  coproId: string;
  documentId: string;
  visibility: "council_only" | "all_members" | "managers_only";
  linkedType?: string;
  linkedId?: string;
  label?: string;
  notes?: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "POST" ? await req.json() : null;

    let result;

    switch (action) {
      case "create-decision":
        result = await handleCreateDecision(supabase, body as CreateDecisionRequest, user.id);
        break;

      case "cast-vote":
        result = await handleCastVote(supabase, body as CastVoteRequest, user.id);
        break;

      case "update-decision-status":
        result = await handleUpdateDecisionStatus(supabase, body as UpdateDecisionStatusRequest, user.id);
        break;

      case "attach-document":
        result = await handleAttachDocument(supabase, body as AttachDocumentRequest, user.id);
        break;

      case "get-decision-results":
        result = await handleGetDecisionResults(supabase, body.decisionId);
        break;

      case "get-my-council-role":
        result = await handleGetMyCouncilRole(supabase, body.coproId, user.id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Council workflow error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Handler: Create Decision
// ============================================================================
async function handleCreateDecision(
  supabase: ReturnType<typeof createClient>,
  data: CreateDecisionRequest,
  userId: string
) {
  // Verify user is a council member
  const { data: membership, error: memberError } = await supabase
    .from("council_members")
    .select("id, role")
    .eq("copro_id", data.coproId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (memberError || !membership) {
    return {
      success: false,
      error: "Vous devez être membre du conseil syndical pour créer une décision"
    };
  }

  // Create the decision
  const decisionData: Record<string, unknown> = {
    copro_id: data.coproId,
    title: data.title,
    description: data.description || null,
    status: data.submitImmediately ? "submitted" : "draft",
    created_by: userId,
    linked_ag_id: data.linkedAgId || null,
    linked_resolution_id: data.linkedResolutionId || null,
  };

  if (data.submitImmediately) {
    decisionData.submitted_at = new Date().toISOString();
    decisionData.submitted_by = userId;
  }

  const { data: decision, error: insertError } = await supabase
    .from("council_decisions")
    .insert(decisionData)
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    decision,
    message: data.submitImmediately
      ? "Décision créée et soumise au vote"
      : "Décision créée en brouillon"
  };
}

// ============================================================================
// Handler: Cast Vote
// ============================================================================
async function handleCastVote(
  supabase: ReturnType<typeof createClient>,
  data: CastVoteRequest,
  userId: string
) {
  // Get the decision
  const { data: decision, error: decisionError } = await supabase
    .from("council_decisions")
    .select("id, copro_id, status")
    .eq("id", data.decisionId)
    .single();

  if (decisionError || !decision) {
    return { success: false, error: "Décision non trouvée" };
  }

  // Check decision is submitted (open for voting)
  if (decision.status !== "submitted") {
    return { success: false, error: "Cette décision n'est pas ouverte au vote" };
  }

  // Get user's council membership
  const { data: membership, error: memberError } = await supabase
    .from("council_members")
    .select("id")
    .eq("copro_id", decision.copro_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (memberError || !membership) {
    return {
      success: false,
      error: "Vous devez être membre actif du conseil syndical pour voter"
    };
  }

  // Upsert the vote (allows changing vote)
  const { data: vote, error: voteError } = await supabase
    .from("council_votes")
    .upsert({
      copro_id: decision.copro_id,
      decision_id: data.decisionId,
      council_member_id: membership.id,
      vote: data.vote,
      comment: data.comment || null,
      voted_at: new Date().toISOString(),
    }, {
      onConflict: "decision_id,council_member_id",
    })
    .select()
    .single();

  if (voteError) {
    return { success: false, error: voteError.message };
  }

  // Get updated results
  const { data: results } = await supabase.rpc("compute_decision_result", {
    p_decision_id: data.decisionId
  });

  return {
    success: true,
    vote,
    results,
    message: "Vote enregistré avec succès"
  };
}

// ============================================================================
// Handler: Update Decision Status
// ============================================================================
async function handleUpdateDecisionStatus(
  supabase: ReturnType<typeof createClient>,
  data: UpdateDecisionStatusRequest,
  userId: string
) {
  // Get the decision
  const { data: decision, error: decisionError } = await supabase
    .from("council_decisions")
    .select("id, copro_id, status, created_by")
    .eq("id", data.decisionId)
    .single();

  if (decisionError || !decision) {
    return { success: false, error: "Décision non trouvée" };
  }

  // Check user is council member
  const { data: membership, error: memberError } = await supabase
    .from("council_members")
    .select("id, role")
    .eq("copro_id", decision.copro_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (memberError || !membership) {
    return { success: false, error: "Vous devez être membre du conseil syndical" };
  }

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: ["archived"],
    rejected: ["archived"],
    archived: [],
  };

  if (!validTransitions[decision.status]?.includes(data.newStatus)) {
    return {
      success: false,
      error: `Transition de statut invalide: ${decision.status} -> ${data.newStatus}`
    };
  }

  // Only president can approve/reject
  if (["approved", "rejected"].includes(data.newStatus) && membership.role !== "president") {
    return {
      success: false,
      error: "Seul le président du CS peut approuver ou rejeter une décision"
    };
  }

  // Update the decision
  const updates: Record<string, unknown> = {
    status: data.newStatus,
    updated_at: new Date().toISOString(),
  };

  if (data.newStatus === "submitted") {
    updates.submitted_at = new Date().toISOString();
    updates.submitted_by = userId;
  }

  if (data.newStatus === "approved" || data.newStatus === "rejected") {
    updates.decided_at = new Date().toISOString();
    updates.decided_by = userId;

    if (data.newStatus === "rejected" && data.rejectionReason) {
      updates.rejection_reason = data.rejectionReason;
    }
  }

  const { data: updatedDecision, error: updateError } = await supabase
    .from("council_decisions")
    .update(updates)
    .eq("id", data.decisionId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    decision: updatedDecision,
    message: `Décision ${data.newStatus === "approved" ? "approuvée" : data.newStatus === "rejected" ? "rejetée" : "mise à jour"}`
  };
}

// ============================================================================
// Handler: Attach Document
// ============================================================================
async function handleAttachDocument(
  supabase: ReturnType<typeof createClient>,
  data: AttachDocumentRequest,
  userId: string
) {
  // Verify user is council member or manager
  const { data: membership } = await supabase
    .from("council_members")
    .select("id")
    .eq("copro_id", data.coproId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  // Also check if user is manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!membership && profile?.role !== "manager") {
    return {
      success: false,
      error: "Vous devez être membre du CS ou gestionnaire pour partager un document"
    };
  }

  // Create council document link
  const { data: councilDoc, error: insertError } = await supabase
    .from("council_documents")
    .insert({
      copro_id: data.coproId,
      document_id: data.documentId,
      visibility: data.visibility,
      linked_type: data.linkedType || null,
      linked_id: data.linkedId || null,
      label: data.label || null,
      notes: data.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    // Check if duplicate
    if (insertError.code === "23505") {
      return {
        success: false,
        error: "Ce document est déjà partagé avec le conseil syndical"
      };
    }
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    councilDocument: councilDoc,
    message: "Document partagé avec le conseil syndical"
  };
}

// ============================================================================
// Handler: Get Decision Results
// ============================================================================
async function handleGetDecisionResults(
  supabase: ReturnType<typeof createClient>,
  decisionId: string
) {
  const { data: results, error } = await supabase.rpc("compute_decision_result", {
    p_decision_id: decisionId
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Get individual votes
  const { data: votes } = await supabase
    .from("council_votes")
    .select(`
      id,
      vote,
      comment,
      voted_at,
      council_member_id,
      council_members (
        user_id,
        role,
        profiles:user_id (
          full_name
        )
      )
    `)
    .eq("decision_id", decisionId);

  return {
    success: true,
    results,
    votes
  };
}

// ============================================================================
// Handler: Get My Council Role
// ============================================================================
async function handleGetMyCouncilRole(
  supabase: ReturnType<typeof createClient>,
  coproId: string,
  userId: string
) {
  const { data: membership, error } = await supabase
    .from("council_members")
    .select("id, role, start_date, end_date, is_active")
    .eq("copro_id", coproId)
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (error || !membership) {
    return {
      success: true,
      isMember: false,
      role: null
    };
  }

  return {
    success: true,
    isMember: membership.is_active,
    role: membership.is_active ? membership.role : null,
    membership
  };
}
