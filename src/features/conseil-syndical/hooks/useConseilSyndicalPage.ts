'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { useSupabase } from '@/hooks/useSupabase';
import { rapportCSService } from '@/lib/services/rapport-cs.service';
import type { RapportActiviteCS } from '@/types/models/conseil-syndical';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// Interface locale pour les membres affichés dans la page
export interface MembreCSDisplay {
  id: string;
  nom: string;
  prenom: string;
  role: 'president' | 'secretaire' | 'tresorier' | 'membre';
  email: string;
}

export function useConseilSyndicalPage() {
  const { currentCoproId } = useCopro();
  const { user } = useSupabase();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [activeTab, setActiveTab] = useState<'membres' | 'rapports'>('rapports');
  const [membres, setMembres] = useState<MembreCSDisplay[]>([]);
  const [rapports, setRapports] = useState<RapportActiviteCS[]>([]);

  // Charger les membres du conseil syndical depuis Supabase
  useEffect(() => {
    if (!currentCoproId) return;

    async function loadData() {
      // Charger les membres
      const { data: membersData } = await supabase
        .from('council_members')
        .select('*')
        .eq('copro_id', currentCoproId)
        .eq('is_active', true)
        .order('role', { ascending: true });

      if (membersData) {
        setMembres(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          membersData.map((m: any) => ({
            id: m.id,
            nom: m.last_name ?? '',
            prenom: m.first_name ?? '',
            role: m.role ?? 'membre',
            email: m.email ?? '',
          }))
        );
      }

      // Charger les rapports (table dédiée 0053 — council_documents est une
      // table de LIENS vers la GED, elle n'a jamais porté les rapports)
      try {
        const rapportsData = await rapportCSService.listerRapports(currentCoproId!);
        setRapports(rapportsData);
      } catch (error) {
        console.error('Erreur chargement rapports CS:', error);
      }
    }

    loadData();
  }, [currentCoproId, supabase]);

  const handleCreateRapport = useCallback(async () => {
    if (!currentCoproId) return;
    if (!user?.id) {
      alert('Session expirée — reconnectez-vous pour créer un rapport.');
      return;
    }

    const now = new Date();
    const periodeDebut = new Date(now.getFullYear() - 1, 5, 1);
    const periodeFin = new Date(now.getFullYear(), 4, 31);

    try {
      const rapport = await rapportCSService.creerRapport({
        conseilSyndicalId: '', // legacy, ignoré par le service (0053)
        coproprieteId: currentCoproId,
        auteurId: user.id,
        periodeDebut,
        periodeFin,
        titre: `Rapport d'activité ${periodeDebut.getFullYear()}-${periodeFin.getFullYear()}`,
      });

      window.location.href = `/conseil-syndical/rapport/${rapport.id}`;
    } catch (error) {
      console.error('Erreur création rapport:', error);
      alert('Erreur lors de la création du rapport');
    }
  }, [currentCoproId, user?.id]);

  return {
    activeTab,
    setActiveTab,
    membres,
    rapports,
    handleCreateRapport,
  };
}
