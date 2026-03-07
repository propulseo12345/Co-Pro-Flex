'use client';

/**
 * useFeuillePresence - Hook DB-first pour la feuille de présence AG
 *
 * Sources de données Supabase :
 * - rpc_get_ag_coproprietaires(ag_id) : liste des copropriétaires avec tantièmes
 * - v_ag_attendance_summary : présences enregistrées
 * - compute_ag_quorum(ag_id) : stats quorum temps réel
 *
 * Mutations via :
 * - registerAttendance edge function : ajouter/modifier présence
 * - removeAttendance : supprimer présence (absent)
 * - signAttendance : enregistrer signature
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerAttendance, removeAttendance, signAttendance } from '@/lib/ag/api';
import type { AttendanceType } from '@/lib/ag/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface CoproprietairePresence {
  id: string;
  displayName: string;
  email: string | null;
  tantiemes: number;
  lotsCount: number;
}

export interface AttendanceRecord {
  id: string;
  coproprietaireId: string;
  presenceType: AttendanceType;
  representedByName: string | null;
  signed: boolean;
  signedAt: string | null;
  signatureData?: string;
  arrivedAt: string | null;
  leftAt: string | null;
  tantiemes: number;
  lotIds: string[];
  lotRefs: string[];
}

export interface QuorumStats {
  totalTantiemes: number;
  presentTantiemes: number;
  quorumRatio: number;
  isQuorumReached: boolean;
  attendeesCount: number;
  presentCount: number;
  proxyCount: number;
  correspondenceCount: number;
}

export interface QuorumThresholds {
  art24: { threshold: number; reached: boolean; label: string };
  art25: { threshold: number; reached: boolean; label: string };
  art26: { threshold: number; reached: boolean; label: string };
}

interface UseFeuillePresenceParams {
  agId: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useFeuillePresence({ agId }: UseFeuillePresenceParams) {
  // State
  const [coproprietaires, setCoproprietaires] = useState<CoproprietairePresence[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [quorumStats, setQuorumStats] = useState<QuorumStats | null>(null);
  const [agInfo, setAgInfo] = useState<{ coproId: string; status: string; title: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!agId) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      // 1. Load AG info
      const { data: agData, error: agError } = await supabase
        .from('ag_meetings')
        .select('id, copro_id, status, title')
        .eq('id', agId)
        .single();

      if (agError || !agData) {
        throw new Error('AG non trouvée');
      }

      setAgInfo({
        coproId: agData.copro_id,
        status: agData.status,
        title: agData.title,
      });

      // 2. Load copropriétaires via RPC (scoped by AG -> copro)
      const { data: coprosData, error: coprosError } = await supabase
        .rpc('rpc_get_ag_coproprietaires', { p_ag_id: agId });

      if (coprosError) {
        console.error('[useFeuillePresence] Error loading coproprietaires:', coprosError);
        throw new Error('Erreur chargement copropriétaires');
      }

      const mappedCopros: CoproprietairePresence[] = (coprosData || []).map((c: {
        id: string;
        display_name: string;
        email: string | null;
        total_tantiemes: number;
        lots_count: number;
      }) => ({
        id: c.id,
        displayName: c.display_name || 'Inconnu',
        email: c.email,
        tantiemes: c.total_tantiemes || 0,
        lotsCount: c.lots_count || 0,
      }));

      setCoproprietaires(mappedCopros);

      // 3. Load existing attendance records (from table directly for signature_data)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('ag_attendance')
        .select('id, coproprietaire_id, presence_type, represented_by_name, signed, signed_at, signature_data, arrived_at, left_at, tantiemes, lot_ids')
        .eq('ag_id', agId);

      if (attendanceError) {
        console.error('[useFeuillePresence] Error loading attendance:', attendanceError);
      }

      const mappedAttendance: AttendanceRecord[] = (attendanceData || []).map((a: {
        id: string;
        coproprietaire_id: string;
        presence_type: AttendanceType;
        represented_by_name: string | null;
        signed: boolean;
        signed_at: string | null;
        signature_data?: string;
        arrived_at: string | null;
        left_at: string | null;
        tantiemes: number;
        lot_ids: string[];
      }) => ({
        id: a.id,
        coproprietaireId: a.coproprietaire_id,
        presenceType: a.presence_type,
        representedByName: a.represented_by_name,
        signed: a.signed,
        signedAt: a.signed_at,
        signatureData: a.signature_data,
        arrivedAt: a.arrived_at,
        leftAt: a.left_at,
        tantiemes: a.tantiemes,
        lotIds: a.lot_ids || [],
        lotRefs: [],
      }));

      setAttendanceRecords(mappedAttendance);

      // 4. Load quorum stats
      const { data: quorumData, error: quorumError } = await supabase
        .rpc('compute_ag_quorum', { p_ag_id: agId });

      if (quorumError) {
        console.error('[useFeuillePresence] Error computing quorum:', quorumError);
      }

      if (quorumData && quorumData.length > 0) {
        const q = quorumData[0];
        setQuorumStats({
          totalTantiemes: q.total_tantiemes || 0,
          presentTantiemes: q.present_tantiemes || 0,
          quorumRatio: q.quorum_ratio || 0,
          isQuorumReached: q.is_quorum_reached || false,
          attendeesCount: q.attendees_count || 0,
          presentCount: q.present_count || 0,
          proxyCount: q.proxy_count || 0,
          correspondenceCount: q.correspondence_count || 0,
        });
      } else {
        // Compute from copros if no attendance yet
        const totalTantiemes = mappedCopros.reduce((sum, c) => sum + c.tantiemes, 0);
        setQuorumStats({
          totalTantiemes,
          presentTantiemes: 0,
          quorumRatio: 0,
          isQuorumReached: false,
          attendeesCount: 0,
          presentCount: 0,
          proxyCount: 0,
          correspondenceCount: 0,
        });
      }

    } catch (err) {
      console.error('[useFeuillePresence] Load error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Map attendance by coproprietaire ID for quick lookup
  const attendanceByCoprId = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(a => map.set(a.coproprietaireId, a));
    return map;
  }, [attendanceRecords]);

  // Quorum thresholds (French law)
  const quorumThresholds = useMemo((): QuorumThresholds | null => {
    if (!quorumStats) return null;

    const { totalTantiemes, presentTantiemes } = quorumStats;
    if (totalTantiemes === 0) return null;

    // Art. 24: Majorité simple des présents/représentés (50%+1 des présents)
    const art24Threshold = Math.floor(presentTantiemes / 2) + 1;

    // Art. 25: Majorité absolue de tous (50%+1 du total)
    const art25Threshold = Math.floor(totalTantiemes / 2) + 1;

    // Art. 26: Double majorité (2/3 du total)
    const art26Threshold = Math.floor((totalTantiemes * 2) / 3) + 1;

    return {
      art24: {
        threshold: art24Threshold,
        reached: presentTantiemes >= art24Threshold,
        label: 'Art. 24 - Majorité simple',
      },
      art25: {
        threshold: art25Threshold,
        reached: presentTantiemes >= art25Threshold,
        label: 'Art. 25 - Majorité absolue',
      },
      art26: {
        threshold: art26Threshold,
        reached: presentTantiemes >= art26Threshold,
        label: 'Art. 26 - Double majorité (2/3)',
      },
    };
  }, [quorumStats]);

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Toggle presence for a coproprietaire
   * - If absent -> present
   * - If present -> absent (remove record)
   */
  const togglePresence = useCallback(async (
    coproprietaireId: string,
    newPresenceType: AttendanceType | 'absent'
  ) => {
    if (!agInfo) return { success: false, error: 'AG non chargée' };

    setIsSaving(true);
    try {
      const existingRecord = attendanceByCoprId.get(coproprietaireId);
      const copro = coproprietaires.find(c => c.id === coproprietaireId);

      if (!copro) {
        throw new Error('Copropriétaire non trouvé');
      }

      if (newPresenceType === 'absent') {
        // Block setting absent if copro has correspondence votes
        if (existingRecord?.presenceType === 'correspondence') {
          return { success: false, error: 'Vote par correspondance : présence obligatoire' };
        }
        // Remove attendance record
        if (existingRecord) {
          await removeAttendance(existingRecord.id);
        }
      } else {
        // Register attendance via edge function
        await registerAttendance({
          ag_id: agId,
          copro_id: agInfo.coproId,
          coproprietaire_id: coproprietaireId,
          lot_ids: existingRecord?.lotIds || [],
          presence_type: newPresenceType,
        });
      }

      // Re-fetch data from DB
      await loadData();
      return { success: true };

    } catch (err) {
      console.error('[useFeuillePresence] Toggle error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSaving(false);
    }
  }, [agId, agInfo, attendanceByCoprId, coproprietaires, loadData]);

  /**
   * Set represented_by for a coproprietaire with proxy
   */
  const setRepresentedBy = useCallback(async (
    coproprietaireId: string,
    representedByName: string
  ) => {
    if (!agInfo) return { success: false, error: 'AG non chargée' };

    setIsSaving(true);
    try {
      const existingRecord = attendanceByCoprId.get(coproprietaireId);

      await registerAttendance({
        ag_id: agId,
        copro_id: agInfo.coproId,
        coproprietaire_id: coproprietaireId,
        lot_ids: existingRecord?.lotIds || [],
        presence_type: 'proxy',
        represented_by_name: representedByName,
      });

      await loadData();
      return { success: true };

    } catch (err) {
      console.error('[useFeuillePresence] SetRepresentedBy error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSaving(false);
    }
  }, [agId, agInfo, attendanceByCoprId, loadData]);

  /**
   * Bulk set all coproprietaires as present or absent
   * Uses direct DB operations (no edge function) for performance
   */
  const bulkSetPresence = useCallback(async (
    presenceType: AttendanceType | 'absent'
  ) => {
    if (!agInfo) return { success: false, error: 'AG non chargée' };

    setIsSaving(true);
    try {
      const supabase = createUntypedClient();

      if (presenceType === 'absent') {
        // Delete attendance records except correspondence votes
        await supabase
          .from('ag_attendance')
          .delete()
          .eq('ag_id', agId)
          .neq('presence_type', 'correspondence');
      } else {
        // Get tantièmes for all copropriétaires via lot_owners
        const { data: allLotOwners } = await supabase
          .from('lot_owners')
          .select('coproprietaire_id, lot_id, lots(id, tantiemes_generaux)')
          .eq('copro_id', agInfo.coproId)
          .is('end_date', null);

        // Build tantiemes map per coproprietaire
        const tantMap = new Map<string, { tantiemes: number; lotIds: string[] }>();
        if (allLotOwners) {
          for (const lo of allLotOwners) {
            const cId = lo.coproprietaire_id as string;
            const lot = lo.lots as { id: string; tantiemes_generaux: number } | null;
            const existing = tantMap.get(cId) || { tantiemes: 0, lotIds: [] };
            existing.tantiemes += lot?.tantiemes_generaux || 0;
            if (lot?.id) existing.lotIds.push(lot.id);
            tantMap.set(cId, existing);
          }
        }

        // Exclure les copropriétaires ayant voté par correspondance
        const correspondenceIds = new Set(
          attendanceRecords
            .filter(a => a.presenceType === 'correspondence')
            .map(a => a.coproprietaireId)
        );

        // Upsert attendance for all copropriétaires (sauf correspondance)
        const records = coproprietaires
          .filter(copro => !correspondenceIds.has(copro.id))
          .map(copro => {
            const info = tantMap.get(copro.id) || { tantiemes: 0, lotIds: [] };
            return {
              ag_id: agId,
              copro_id: agInfo.coproId,
              coproprietaire_id: copro.id,
              lot_ids: info.lotIds,
              tantiemes: info.tantiemes,
              presence_type: presenceType,
              signed: false,
              updated_at: new Date().toISOString(),
            };
          });

        const { error: upsertError } = await supabase
          .from('ag_attendance')
          .upsert(records, { onConflict: 'ag_id,coproprietaire_id' });

        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      await loadData();
      return { success: true };

    } catch (err) {
      console.error('[useFeuillePresence] Bulk error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSaving(false);
    }
  }, [agId, agInfo, coproprietaires, attendanceRecords, loadData]);

  /**
   * Save signature for a coproprietaire
   */
  const saveSignature = useCallback(async (
    coproprietaireId: string,
    signatureData: string
  ) => {
    const existingRecord = attendanceByCoprId.get(coproprietaireId);
    if (!existingRecord) {
      return { success: false, error: 'Aucune présence enregistrée' };
    }

    setIsSaving(true);
    try {
      await signAttendance(existingRecord.id, signatureData);
      await loadData();
      return { success: true };

    } catch (err) {
      console.error('[useFeuillePresence] Signature error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSaving(false);
    }
  }, [attendanceByCoprId, loadData]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    coproprietaires,
    attendanceRecords,
    attendanceByCoprId,
    quorumStats,
    quorumThresholds,
    agInfo,

    // State
    isLoading,
    isSaving,
    error,

    // Actions
    togglePresence,
    setRepresentedBy,
    bulkSetPresence,
    saveSignature,
    refresh: loadData,
  };
}
