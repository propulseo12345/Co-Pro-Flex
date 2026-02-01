// ============================================================================
// API: AG (Assemblées Générales) - Supabase Backend
// ============================================================================

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

import type {
  AgOverview,
  AgMeeting,
  AgResolutionResult,
  AgAttendanceSummary,
  AgVoteDetailed,
  CreateAgInput,
  CreateAgResponse,
  AddResolutionInput,
  AddResolutionResponse,
  RegisterAttendanceInput,
  RegisterAttendanceResponse,
  CastVoteInput,
  CastVoteResponse,
  CloseAgInput,
  CloseAgResponse,
  StartAgInput,
  AgStatus,
  AgDocument,
  AgDocumentType,
  GenerateDocumentInput,
  GenerateDocumentResponse,
} from './types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Liste toutes les AG d'une copropriété (vue enrichie)
 */
export async function listAgMeetings(coproId: string): Promise<AgOverview[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('meeting_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AgOverview[];
}

/**
 * Récupère une AG par ID avec détails complets
 */
export async function getAg(agId: string): Promise<{
  meeting: AgMeeting;
  resolutions: AgResolutionResult[];
  attendance: AgAttendanceSummary[];
  quorum: {
    totalTantiemes: number;
    presentTantiemes: number;
    quorumRatio: number;
    attendeesCount: number;
  } | null;
} | null> {
  const supabase = createUntypedClient();

  // Fetch meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('ag_meetings')
    .select('*')
    .eq('id', agId)
    .single();

  if (meetingError) {
    if (meetingError.code === 'PGRST116') return null;
    throw new Error(meetingError.message);
  }

  // Fetch resolutions
  const { data: resolutions, error: resError } = await supabase
    .from('v_ag_resolutions_results')
    .select('*')
    .eq('ag_id', agId)
    .order('resolution_number', { ascending: true });

  if (resError) throw new Error(resError.message);

  // Fetch attendance
  const { data: attendance, error: attError } = await supabase
    .from('v_ag_attendance_summary')
    .select('*')
    .eq('ag_id', agId)
    .order('owner_name', { ascending: true });

  if (attError) throw new Error(attError.message);

  // Calculate quorum from attendance
  let quorum = null;
  if (attendance && attendance.length > 0) {
    const totalTantiemes = (attendance as Array<{ tantiemes?: number }>).reduce(
      (sum: number, a) => sum + (a.tantiemes || 0),
      0
    );
    // We need the total tantiemes of the copro, let's get it from the overview
    const { data: overview } = await supabase
      .from('v_ag_overview')
      .select('total_tantiemes, present_tantiemes, quorum_ratio, attendees_count')
      .eq('id', agId)
      .single();

    if (overview) {
      quorum = {
        totalTantiemes: overview.total_tantiemes || 0,
        presentTantiemes: overview.present_tantiemes || 0,
        quorumRatio: overview.quorum_ratio || 0,
        attendeesCount: overview.attendees_count || 0,
      };
    }
  }

  return {
    meeting: meeting as AgMeeting,
    resolutions: (resolutions || []) as AgResolutionResult[],
    attendance: (attendance || []) as AgAttendanceSummary[],
    quorum,
  };
}

/**
 * Liste les résolutions d'une AG
 */
export async function listResolutions(agId: string): Promise<AgResolutionResult[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_resolutions_results')
    .select('*')
    .eq('ag_id', agId)
    .order('resolution_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgResolutionResult[];
}

/**
 * Liste les présences d'une AG
 */
export async function listAttendance(agId: string): Promise<AgAttendanceSummary[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_attendance_summary')
    .select('*')
    .eq('ag_id', agId)
    .order('owner_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgAttendanceSummary[];
}

/**
 * Liste les votes d'une résolution
 */
export async function listVotes(resolutionId: string): Promise<AgVoteDetailed[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_votes_detailed')
    .select('*')
    .eq('resolution_id', resolutionId)
    .order('voter_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgVoteDetailed[];
}

/**
 * Liste les copropriétaires éligibles pour une AG (avec leurs lots)
 */
export async function listEligibleVoters(coproId: string): Promise<Array<{
  coproprietaire_id: string;
  name: string;
  email: string | null;
  lot_ids: string[];
  lot_refs: string[];
  tantiemes: number;
}>> {
  const supabase = createUntypedClient();

  // Get all current lot owners for this copro
  const { data, error } = await supabase
    .from('lot_owners')
    .select(`
      coproprietaire_id,
      is_primary,
      lots!inner (
        id,
        ref,
        tantiemes_generaux,
        copro_id
      ),
      coproprietaires!inner (
        id,
        first_name,
        last_name,
        company_name,
        is_company,
        email
      )
    `)
    .eq('lots.copro_id', coproId)
    .is('end_date', null)
    .eq('is_primary', true);

  if (error) throw new Error(error.message);

  // Group by coproprietaire
  const votersMap = new Map<string, {
    coproprietaire_id: string;
    name: string;
    email: string | null;
    lot_ids: string[];
    lot_refs: string[];
    tantiemes: number;
  }>();

  for (const row of data || []) {
    const copro = row.coproprietaires as {
      id: string;
      first_name: string;
      last_name: string;
      company_name: string | null;
      is_company: boolean;
      email: string | null;
    };
    const lot = row.lots as {
      id: string;
      ref: string;
      tantiemes_generaux: number;
    };

    const existing = votersMap.get(copro.id);
    const name = copro.is_company
      ? copro.company_name || 'Société'
      : `${copro.first_name} ${copro.last_name}`;

    if (existing) {
      existing.lot_ids.push(lot.id);
      existing.lot_refs.push(lot.ref);
      existing.tantiemes += lot.tantiemes_generaux || 0;
    } else {
      votersMap.set(copro.id, {
        coproprietaire_id: copro.id,
        name,
        email: copro.email,
        lot_ids: [lot.id],
        lot_refs: [lot.ref],
        tantiemes: lot.tantiemes_generaux || 0,
      });
    }
  }

  return Array.from(votersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// MUTATIONS VIA EDGE FUNCTIONS
// ============================================================================

/**
 * Helper pour appeler une edge function via le SDK Supabase
 * Utilise la méthode native functions.invoke qui gère mieux l'authentification
 */
async function invokeEdgeFunction<T>(
  functionName: string,
  payload: object
): Promise<T> {
  const supabase = createUntypedClient();

  console.log(`[invokeEdgeFunction] Appel de ${functionName} via SDK...`);
  console.log(`[invokeEdgeFunction] Payload:`, JSON.stringify(payload).substring(0, 200));

  try {
    // Utiliser la méthode native du SDK Supabase
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`[invokeEdgeFunction] Erreur SDK:`, error);

      // Si c'est une erreur d'auth, suggérer de se reconnecter
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('auth')) {
        throw new Error('Session expirée - veuillez vous déconnecter et vous reconnecter');
      }

      throw new Error(error.message || 'Erreur lors de l\'appel à la fonction');
    }

    console.log(`[invokeEdgeFunction] Résultat:`, data);
    return data as T;

  } catch (err) {
    console.error(`[invokeEdgeFunction] Exception:`, err);

    // Si le SDK échoue, essayer avec fetch direct après refresh de session
    console.log(`[invokeEdgeFunction] Fallback vers fetch direct...`);

    // Rafraîchir la session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error('[invokeEdgeFunction] Impossible de rafraîchir la session:', refreshError.message);
      throw new Error('Session expirée - veuillez vous déconnecter et vous reconnecter');
    }

    const session = refreshData?.session;
    if (!session?.access_token) {
      throw new Error('Non authentifié - veuillez vous reconnecter');
    }

    console.log(`[invokeEdgeFunction] Session rafraîchie, user: ${session.user?.email}`);

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[invokeEdgeFunction] Fallback response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[invokeEdgeFunction] Fallback HTTP Error: ${response.status}`, errorText);
      throw new Error(`Erreur: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[invokeEdgeFunction] Fallback résultat:`, result);
    return result as T;
  }
}

/**
 * Créer une nouvelle AG
 */
export async function createAg(input: CreateAgInput): Promise<CreateAgResponse> {
  return invokeEdgeFunction<CreateAgResponse>('ag_create', input);
}

/**
 * Ajouter une résolution à une AG
 * Essaie d'abord via edge function, puis fallback sur insert direct si échec auth
 */
export async function addResolution(input: AddResolutionInput): Promise<AddResolutionResponse> {
  try {
    // Essayer d'abord via edge function
    return await invokeEdgeFunction<AddResolutionResponse>('ag_add_resolution', input);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '';

    // Si c'est une erreur d'auth ou si l'edge function n'existe pas, utiliser insert direct
    if (errorMsg.includes('401') || errorMsg.includes('JWT') || errorMsg.includes('auth') ||
        errorMsg.includes('Session') || errorMsg.includes('FunctionsFetchError') ||
        errorMsg.includes('non_2xx_response')) {
      console.log('[addResolution] Edge function échouée, tentative d\'insert direct...');
      return addResolutionDirect(input);
    }

    throw err;
  }
}

/**
 * Insertion directe d'une résolution (fallback si edge function indisponible)
 */
async function addResolutionDirect(input: AddResolutionInput): Promise<AddResolutionResponse> {
  const supabase = createUntypedClient();

  console.log('[addResolutionDirect] Insert direct pour:', input.title);

  try {
    // Construire l'objet à insérer
    const insertData = {
      ag_id: input.ag_id,
      copro_id: input.copro_id,
      title: input.title,
      description: input.description || null,
      resolution_type: input.resolution_type || 'other',
      majority_type: input.majority_type || 'art24',
      resolution_number: input.resolution_number || 1,
      status: 'draft',
      variables: input.variables || null,
      is_customized: input.is_customized || false,
      tantiemes_for: 0,
      tantiemes_against: 0,
      tantiemes_abstention: 0,
      voters_for: 0,
      voters_against: 0,
      voters_abstention: 0,
      is_approved: null,
      is_bridgeable: false,
      vote_details: {},
    };

    console.log('[addResolutionDirect] Données à insérer:', insertData);

    const { data, error } = await supabase
      .from('ag_resolutions')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('[addResolutionDirect] Erreur insert:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'insertion',
      };
    }

    console.log('[addResolutionDirect] Résolution créée avec ID:', data?.id);

    return {
      success: true,
      resolution_id: data?.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[addResolutionDirect] Exception:', err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Enregistrer une présence
 */
export async function registerAttendance(input: RegisterAttendanceInput): Promise<RegisterAttendanceResponse> {
  return invokeEdgeFunction<RegisterAttendanceResponse>('ag_register_attendance', input);
}

/**
 * Enregistrer un vote
 */
export async function castVote(input: CastVoteInput): Promise<CastVoteResponse> {
  return invokeEdgeFunction<CastVoteResponse>('ag_cast_vote', input);
}

/**
 * Clôturer une AG
 */
export async function closeAg(input: CloseAgInput): Promise<CloseAgResponse> {
  return invokeEdgeFunction<CloseAgResponse>('ag_close', input);
}

/**
 * Démarrer une AG (mettre en statut in_progress)
 */
export async function startAg(input: StartAgInput): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'in_progress' as AgStatus,
      session_started_at: new Date().toISOString(),
      opening_notes: input.opening_notes || null,
    })
    .eq('id', input.ag_id)
    .eq('copro_id', input.copro_id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Marquer les convocations comme envoyées
 */
export async function markConvoked(agId: string, coproId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'convoked' as AgStatus,
      convocation_date: new Date().toISOString(),
    })
    .eq('id', agId)
    .eq('copro_id', coproId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// DIRECT MUTATIONS (for simpler operations)
// ============================================================================

/**
 * Supprimer une présence
 */
export async function removeAttendance(attendanceId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_attendance')
    .delete()
    .eq('id', attendanceId);

  if (error) throw new Error(error.message);
}

/**
 * Mettre à jour une résolution
 */
export async function updateResolution(
  resolutionId: string,
  updates: {
    title?: string;
    description?: string;
    resolution_type?: string;
    majority_type?: string;
    status?: string;
    variables?: Record<string, unknown>;
    is_customized?: boolean;
  }
): Promise<void> {
  const supabase = createUntypedClient();

  // Build update payload, filtering undefined values
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.resolution_type !== undefined) payload.resolution_type = updates.resolution_type;
  if (updates.majority_type !== undefined) payload.majority_type = updates.majority_type;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.variables !== undefined) payload.variables = updates.variables;
  if (updates.is_customized !== undefined) payload.is_customized = updates.is_customized;

  // Always set updated_at
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('ag_resolutions')
    .update(payload)
    .eq('id', resolutionId);

  if (error) throw new Error(error.message);
}

/**
 * Supprimer une résolution
 */
export async function deleteResolution(resolutionId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_resolutions')
    .delete()
    .eq('id', resolutionId);

  if (error) throw new Error(error.message);
}

/**
 * Réordonner les résolutions
 */
export async function reorderResolutions(
  agId: string,
  resolutionIds: string[]
): Promise<void> {
  const supabase = createUntypedClient();

  // Update each resolution with its new number
  for (let i = 0; i < resolutionIds.length; i++) {
    const { error } = await supabase
      .from('ag_resolutions')
      .update({ resolution_number: i + 1 })
      .eq('id', resolutionIds[i])
      .eq('ag_id', agId);

    if (error) throw new Error(error.message);
  }
}

/**
 * Mettre à jour une AG
 */
export async function updateAg(
  agId: string,
  updates: {
    title?: string;
    meeting_date?: string;
    location?: string;
    president_name?: string;
    secretary_name?: string;
    scrutineer1_name?: string;
    scrutineer2_name?: string;
    opening_notes?: string;
    closing_notes?: string;
  }
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update(updates)
    .eq('id', agId);

  if (error) throw new Error(error.message);
}

/**
 * Signer une présence
 */
export async function signAttendance(
  attendanceId: string,
  signatureData: string
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_attendance')
    .update({
      signed: true,
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
    })
    .eq('id', attendanceId);

  if (error) throw new Error(error.message);
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Génère un document PDF pour une AG (convocation, présence, PV)
 */
export async function generateAgDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResponse> {
  return invokeEdgeFunction<GenerateDocumentResponse>('ag_generate_document', input);
}

/**
 * Liste les documents générés pour une AG
 */
export async function listAgDocuments(agId: string): Promise<AgDocument[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_documents')
    .select('*')
    .eq('ag_id', agId)
    .order('generated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AgDocument[];
}

/**
 * Récupère le dernier document d'un type pour une AG
 */
export async function getLatestAgDocument(
  agId: string,
  docType: AgDocumentType
): Promise<AgDocument | null> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_documents')
    .select('*')
    .eq('ag_id', agId)
    .eq('doc_type', docType)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data as AgDocument;
}

/**
 * Génère une URL signée pour télécharger un document AG
 * @param storagePath Chemin du fichier dans le bucket storage
 * @param expiresInSeconds Durée de validité (défaut: 900 = 15 minutes)
 */
export async function getAgDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 900
): Promise<{ signedUrl: string; expiresAt: string }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase.storage
    .from('ged')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(error.message);

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return {
    signedUrl: data.signedUrl,
    expiresAt,
  };
}

/**
 * Télécharge directement un document AG (retourne les bytes)
 */
export async function downloadAgDocument(storagePath: string): Promise<Blob> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase.storage
    .from('ged')
    .download(storagePath);

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Vérifie si un document existe pour une AG
 */
export async function hasAgDocument(
  agId: string,
  docType: AgDocumentType
): Promise<boolean> {
  const doc = await getLatestAgDocument(agId, docType);
  return doc !== null;
}

/**
 * Met à jour le statut de l'AG après génération du PV
 */
export async function markPvGenerated(
  agId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'pv_generated' as AgStatus,
      pv_document_id: documentId,
    })
    .eq('id', agId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
