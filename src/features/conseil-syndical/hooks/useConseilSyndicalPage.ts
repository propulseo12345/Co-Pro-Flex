'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
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

      // Charger les rapports
      const { data: rapportsData } = await supabase
        .from('council_documents')
        .select('*')
        .eq('copro_id', currentCoproId)
        .eq('document_type', 'rapport_activite')
        .order('created_at', { ascending: false });

      if (rapportsData) {
        setRapports(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rapportsData.map((r: any) => ({
            id: r.id,
            conseilSyndicalId: r.council_id ?? '',
            coproprieteId: r.copro_id,
            periodeDebut: new Date(r.period_start ?? r.created_at),
            periodeFin: new Date(r.period_end ?? r.created_at),
            titre: r.title ?? 'Rapport sans titre',
            introduction: r.introduction ?? '',
            contenu: r.content ?? '',
            contenuBrut: r.content_text ?? '',
            sections: r.sections ?? [],
            annexes: r.annexes ?? [],
            statut: r.status ?? 'brouillon',
            agId: r.ag_id ?? undefined,
            auteurId: r.author_id ?? '',
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at ?? r.created_at),
          }))
        );
      }
    }

    loadData();
  }, [currentCoproId, supabase]);

  const handleCreateRapport = useCallback(async () => {
    if (!currentCoproId) return;

    const now = new Date();
    const periodeDebut = new Date(now.getFullYear() - 1, 5, 1);
    const periodeFin = new Date(now.getFullYear(), 4, 31);

    try {
      const rapport = await rapportCSService.creerRapport({
        conseilSyndicalId: 'cs-1',
        coproprieteId: currentCoproId,
        auteurId: '1',
        periodeDebut,
        periodeFin,
        titre: `Rapport d'activité ${periodeDebut.getFullYear()}-${periodeFin.getFullYear()}`,
      });

      window.location.href = `/conseil-syndical/rapport/${rapport.id}`;
    } catch (error) {
      console.error('Erreur création rapport:', error);
      alert('Erreur lors de la création du rapport');
    }
  }, [currentCoproId]);

  return {
    activeTab,
    setActiveTab,
    membres,
    rapports,
    handleCreateRapport,
  };
}
