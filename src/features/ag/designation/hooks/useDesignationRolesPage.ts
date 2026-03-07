'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RolesAG } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { RoleType } from '@/components/features/ag/RoleSelect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export interface CoproprietaireDB {
  id: string;
  full_name: string;
  email: string | null;
  tantiemes: number;
}

export interface GestionnaireDB {
  id: string;
  full_name: string;
  email: string | null;
  syndic_name: string | null;
}

interface PersonneSelectee {
  id?: string;
  nom: string;
  type: 'coproprietaire' | 'gestionnaire' | 'autre';
  estGestionnaire?: boolean;
  representeSyndic?: string;
  email?: string;
  telephone?: string;
}

export function useDesignationRolesPage(agId: string) {
  const [coproprietairesPresents, setCoproprietairesPresents] = useState<CoproprietaireDB[]>([]);
  const [gestionnaires, setGestionnaires] = useState<GestionnaireDB[]>([]);
  const [roles, setRoles] = useState<RolesAG>({});
  const [showRoleSelectModal, setShowRoleSelectModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isValidUUID(agId)) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      try {
        const supabase = createUntypedClient();

        const { data: agData, error: agError } = await supabase
          .from('ag_meetings')
          .select('copro_id')
          .eq('id', agId)
          .single();

        if (agError || !agData) {
          console.error('[DesignationRolesPage] AG not found:', agError);
          setIsLoading(false);
          return;
        }

        const coproprieteId = agData.copro_id;

        const { data: attendanceData, error: attendanceError } = await supabase
          .from('ag_attendance')
          .select('coproprietaire_id, presence_type')
          .eq('ag_id', agId)
          .in('presence_type', ['present', 'proxy']);

        if (attendanceError) {
          console.error('[DesignationRolesPage] Error loading attendance:', attendanceError);
        }

        const presentIds = (attendanceData || []).map((a: { coproprietaire_id: string }) => a.coproprietaire_id);

        if (presentIds.length > 0) {
          const { data: coprosData, error: coprosError } = await supabase
            .from('v_coproprietaires_overview')
            .select('id, display_name, email, total_tantiemes')
            .in('id', presentIds);

          if (coprosError) {
            console.error('[DesignationRolesPage] Error loading coproprietaires:', coprosError);
          }

          const uniqueMap = new Map<string, CoproprietaireDB>();
          (coprosData || []).forEach((c: { id: string; display_name: string; email: string | null; total_tantiemes: number }) => {
            if (!uniqueMap.has(c.id)) {
              uniqueMap.set(c.id, {
                id: c.id,
                full_name: c.display_name,
                email: c.email,
                tantiemes: c.total_tantiemes,
              });
            }
          });

          setCoproprietairesPresents(Array.from(uniqueMap.values()));
        }

        const { data: membershipsData, error: membershipsError } = await supabase
          .from('memberships')
          .select('user_id, role, profiles(id, full_name, email), coproprietes(name)')
          .eq('copro_id', coproprieteId)
          .in('role', ['manager', 'admin']);

        if (membershipsError) {
          console.error('[DesignationRolesPage] Error loading memberships:', membershipsError);
        }

        const mappedGestionnaires: GestionnaireDB[] = (membershipsData || []).map((m: {
          user_id: string;
          profiles: { id: string; full_name: string; email: string | null } | null;
          coproprietes: { name: string } | null;
        }) => ({
          id: m.user_id,
          full_name: m.profiles?.full_name || 'Gestionnaire',
          email: m.profiles?.email || null,
          syndic_name: m.coproprietes?.name || null,
        }));

        setGestionnaires(mappedGestionnaires);

        const { data: draftData, error: draftError } = await supabase.rpc('get_ag_session_draft', {
          p_ag_id: agId,
          p_draft_type: 'roles',
        });

        if (draftError) {
          console.error('[DesignationRolesPage] Error loading roles draft:', draftError);
        }

        if (draftData?.draft_data) {
          setRoles(draftData.draft_data as RolesAG);
        }
      } catch (err) {
        console.error('[DesignationRolesPage] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [agId]);

  const saveRoles = useCallback(async (rolesToSave: RolesAG) => {
    if (!isValidUUID(agId)) return;

    setIsSaving(true);

    try {
      const supabase = createUntypedClient();

      // 1. Save to drafts (session state)
      const { error } = await supabase.rpc('save_ag_session_draft', {
        p_ag_id: agId,
        p_draft_type: 'roles',
        p_draft_data: rolesToSave,
      });

      if (error) {
        console.error('[DesignationRolesPage] Error saving roles draft:', error);
      }

      // 2. Sync to ag_meetings (persistent, survives draft cleanup)
      const meetingUpdate: Record<string, string | null> = {};
      if (rolesToSave.presidentSeance?.nom) {
        meetingUpdate.president_name = rolesToSave.presidentSeance.nom;
      }
      if (rolesToSave.secretaireSeance?.nom) {
        meetingUpdate.secretary_name = rolesToSave.secretaireSeance.nom;
      }
      if (rolesToSave.scrutateur?.nom) {
        meetingUpdate.scrutineer1_name = rolesToSave.scrutateur.nom;
      }

      if (Object.keys(meetingUpdate).length > 0) {
        const { error: meetingError } = await supabase
          .from('ag_meetings')
          .update(meetingUpdate)
          .eq('id', agId);

        if (meetingError) {
          console.error('[DesignationRolesPage] Error syncing roles to ag_meetings:', meetingError);
        }
      }
    } catch (err) {
      console.error('[DesignationRolesPage] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [agId]);

  useEffect(() => {
    if (Object.keys(roles).length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveRoles(roles);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [roles, saveRoles]);

  const openModal = useCallback((role: RoleType) => {
    setCurrentRole(role);
    setShowRoleSelectModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowRoleSelectModal(false);
    setCurrentRole(null);
  }, []);

  const selectPerson = useCallback((personne: PersonneSelectee) => {
    if (!currentRole) return;

    const dateDesignation = new Date().toISOString();

    switch (currentRole) {
      case 'president':
        setRoles((prev) => ({
          ...prev,
          presidentSeance: {
            coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
            nom: personne.nom,
            dateDesignation
          }
        }));
        break;
      case 'secretaire':
        setRoles((prev) => ({
          ...prev,
          secretaireSeance: {
            coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
            nom: personne.nom,
            dateDesignation,
            estGestionnaire: personne.estGestionnaire,
            representeSyndic: personne.representeSyndic
          }
        }));
        break;
      case 'scrutateur':
        setRoles((prev) => ({
          ...prev,
          scrutateur: {
            coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
            nom: personne.nom,
            dateDesignation
          }
        }));
        break;
      case 'conseilTitulaire':
      case 'conseilSuppleant':
        setRoles((prev) => ({
          ...prev,
          membresConseilSyndical: [
            ...(prev.membresConseilSyndical || []),
            {
              coproprietaireId: personne.type === 'coproprietaire' ? personne.id : undefined,
              nom: personne.nom,
              type: currentRole === 'conseilTitulaire' ? 'TITULAIRE' : 'SUPPLEANT',
              dateDesignation
            }
          ]
        }));
        break;
    }

    closeModal();
  }, [currentRole, closeModal]);

  const removeMembre = useCallback((index: number) => {
    setRoles((prev) => ({
      ...prev,
      membresConseilSyndical: (prev.membresConseilSyndical || []).filter((_, i) => i !== index)
    }));
  }, []);

  const mappedCoproprietaires = coproprietairesPresents.map(cp => ({
    id: cp.id,
    nom: cp.full_name,
    email: cp.email || '',
    telephone: '',
    lot: '',
    tantiemes: cp.tantiemes || 0,
  }));

  const mappedGestionnaires = gestionnaires.map(g => {
    const nameParts = (g.full_name || '').split(' ');
    return {
      id: g.id,
      nom: nameParts.slice(1).join(' ') || g.full_name,
      prenom: nameParts[0] || '',
      email: g.email || '',
      telephone: '',
      syndicId: '',
      syndicNom: g.syndic_name || '',
    };
  });

  const allRolesDesigned = !!(roles.presidentSeance && roles.secretaireSeance && roles.scrutateur);

  return {
    coproprietairesPresents,
    roles,
    isLoading,
    isSaving,
    showRoleSelectModal,
    currentRole,
    mappedCoproprietaires,
    mappedGestionnaires,
    allRolesDesigned,
    openModal,
    closeModal,
    selectPerson,
    removeMembre,
  };
}
