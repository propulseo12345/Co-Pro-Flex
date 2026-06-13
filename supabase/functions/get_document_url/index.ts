// ============================================================================
// Edge Function: get_document_url
// Génère des URLs signées sécurisées pour les documents GED
// CoProFlex - Niveau 6C
// Vérifie les droits d'accès avant de fournir l'URL
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface GetDocumentUrlRequest {
  document_id?: string;
  file_path?: string;
  copro_id: string;
  expires_in?: number;
  action?: "view" | "download";
}

interface GetDocumentUrlResponse {
  success: boolean;
  error?: string;
  signed_url?: string;
  expires_at?: string;
  file_name?: string;
  mime_type?: string;
  visibility?: string;
}

interface DocumentInfo {
  id: string;
  copro_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  visibility: string;
  status: string;
  deletion_blocked: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================================================
// ACCESS CHECK
// ============================================================================

async function checkDocumentAccess(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  coproId: string
): Promise<{ allowed: boolean; reason?: string; doc?: DocumentInfo }> {
  // Fetch document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, copro_id, file_path, file_name, mime_type, visibility, status, deletion_blocked")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return { allowed: false, reason: "Document non trouvé" };
  }

  // Verify copro match
  if (doc.copro_id !== coproId) {
    return { allowed: false, reason: "Document non accessible pour cette copropriété" };
  }

  // Soft-deleted : jamais servi
  if (doc.status === "deleted") {
    return { allowed: false, reason: "Document non trouvé" };
  }

  // Check document status
  if (doc.status === "archived") {
    // Only managers can access archived docs
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("copro_id", coproId)
      .single();

    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      return { allowed: false, reason: "Document archivé - accès réservé aux gestionnaires" };
    }
  }

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("copro_id", coproId)
    .single();

  if (membershipError || !membership) {
    return { allowed: false, reason: "Non membre de cette copropriété" };
  }

  // Niveau de visibilité canonique (enum document_visibility) :
  // gestionnaire_seul / conseil / tous_coproprietaires.
  // L'ancien modèle document_access (ACL fine) est abandonné — décision 0020 §A4.
  // Sémantique alignée sur user_can_view_document (0023) : l'appartenance au
  // conseil vit dans council_members (pas dans memberships.role).
  const visibility = doc.visibility || "gestionnaire_seul"; // défaut prudent
  const role = membership.role;
  const isManager = MANAGER_ROLES.includes(role);

  if (visibility === "gestionnaire_seul") {
    if (!isManager) {
      return { allowed: false, reason: "Accès réservé aux gestionnaires" };
    }
  } else if (visibility === "conseil") {
    if (!isManager && !(await isCouncilMember(supabase, userId, coproId))) {
      return { allowed: false, reason: "Accès réservé au conseil syndical et gestionnaires" };
    }
  }
  // tous_coproprietaires : tout membre de la copro (membership déjà vérifié)

  return { allowed: true, doc: doc as DocumentInfo };
}

// Rôles memberships réels (enum membership_role) : gestionnaire, coproprietaire,
// platform_admin — 'admin'/'conseil' n'existent pas.
const MANAGER_ROLES = ["gestionnaire", "platform_admin"];

/**
 * Membre actif du conseil syndical — sémantique IDENTIQUE au helper SQL
 * is_council_member (0023) : siège direct (cm.user_id) OU via la fiche
 * copropriétaire (co.user_id), actif et sans end_date.
 */
async function isCouncilMember(
  supabase: SupabaseClient,
  userId: string,
  coproId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("council_members")
    .select("user_id, coproprietaires:coproprietaire_id ( user_id )")
    .eq("copro_id", coproId)
    .eq("is_active", true)
    .is("end_date", null);

  if (error || !data) return false;
  return data.some(
    (row: { user_id: string | null; coproprietaires: { user_id: string | null } | null }) =>
      row.user_id === userId || row.coproprietaires?.user_id === userId
  );
}

async function checkPathAccess(
  supabase: SupabaseClient,
  userId: string,
  filePath: string,
  coproId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Chemin canonique : {copro_id}/{category}/{year}/... (0048 : les policies
  // storage isolent par copro sur le PREMIER segment). On tolère l'ancien
  // préfixe 'ged/' en le retirant.
  const normalized = filePath.startsWith("ged/") ? filePath.slice(4) : filePath;
  const pathParts = normalized.split("/");
  if (pathParts.length < 2) {
    return { allowed: false, reason: "Chemin de fichier invalide" };
  }

  const pathCoproId = pathParts[0];

  // Verify copro match
  if (pathCoproId !== coproId) {
    return { allowed: false, reason: "Chemin non accessible pour cette copropriété" };
  }

  // Check membership
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("copro_id", coproId)
    .single();

  if (error || !membership) {
    return { allowed: false, reason: "Non membre de cette copropriété" };
  }

  return { allowed: true };
}

// ============================================================================
// LOG ACCESS
// ============================================================================

async function logDocumentAccess(
  supabase: SupabaseClient,
  documentId: string | null,
  userId: string,
  action: string,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Log to access table if exists
    await supabase.from("document_access_logs").insert({
      document_id: documentId,
      user_id: userId,
      action,
      success,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore logging errors - table may not exist
    console.log("Access logging skipped");
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." } as GetDocumentUrlResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params: GetDocumentUrlRequest = await req.json();

    // Validation
    if (!params.copro_id || !isValidUUID(params.copro_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing copro_id" } as GetDocumentUrlResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!params.document_id && !params.file_path) {
      return new Response(
        JSON.stringify({ success: false, error: "Must provide document_id or file_path" } as GetDocumentUrlResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (params.document_id && !isValidUUID(params.document_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid document_id format" } as GetDocumentUrlResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" } as GetDocumentUrlResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client with user auth for queries
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not authenticated" } as GetDocumentUrlResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file path
    let filePath: string;
    let docInfo: DocumentInfo | undefined;

    if (params.document_id) {
      // Check document access and get path
      const accessCheck = await checkDocumentAccess(
        supabase,
        user.id,
        params.document_id,
        params.copro_id
      );

      if (!accessCheck.allowed) {
        await logDocumentAccess(supabase, params.document_id, user.id, params.action || "view", false, {
          reason: accessCheck.reason,
        });

        return new Response(
          JSON.stringify({ success: false, error: accessCheck.reason } as GetDocumentUrlResponse),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      filePath = accessCheck.doc!.file_path;
      docInfo = accessCheck.doc;
    } else {
      // Check path-based access
      const pathCheck = await checkPathAccess(
        supabase,
        user.id,
        params.file_path!,
        params.copro_id
      );

      if (!pathCheck.allowed) {
        await logDocumentAccess(supabase, null, user.id, params.action || "view", false, {
          reason: pathCheck.reason,
          file_path: params.file_path,
        });

        return new Response(
          JSON.stringify({ success: false, error: pathCheck.reason } as GetDocumentUrlResponse),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      filePath = params.file_path!;
    }

    // Admin client for storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate expiration (default 1 hour, max 24 hours)
    const defaultExpiry = 3600; // 1 hour
    const maxExpiry = 86400; // 24 hours
    const expiresIn = Math.min(Math.max(params.expires_in || defaultExpiry, 60), maxExpiry);

    // Generate signed URL — bucket unique 'ged' (0048) ; chemins canoniques
    // sans préfixe 'ged/' (toléré en entrée, retiré ici).
    const storagePath = filePath.startsWith("ged/") ? filePath.slice(4) : filePath;
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("ged")
      .createSignedUrl(storagePath, expiresIn);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur génération URL: ${signedUrlError.message}`,
        } as GetDocumentUrlResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful access
    await logDocumentAccess(supabase, params.document_id || null, user.id, params.action || "view", true, {
      file_path: filePath,
      expires_in: expiresIn,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        signed_url: signedUrlData.signedUrl,
        expires_at: expiresAt,
        file_name: docInfo?.file_name,
        mime_type: docInfo?.mime_type || undefined,
        visibility: docInfo?.visibility,
      } as GetDocumentUrlResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erreur inattendue: ${err instanceof Error ? err.message : String(err)}`,
      } as GetDocumentUrlResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
