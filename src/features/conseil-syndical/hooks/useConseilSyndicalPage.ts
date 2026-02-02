'use client';

import { useState, useCallback } from 'react';
import { rapportCSService } from '@/lib/services/rapport-cs.service';
import { MOCK_MEMBRES, MOCK_RAPPORTS } from '../data/mock-data';

export function useConseilSyndicalPage() {
  const [activeTab, setActiveTab] = useState<'membres' | 'rapports'>('rapports');

  const handleCreateRapport = useCallback(async () => {
    const now = new Date();
    const periodeDebut = new Date(now.getFullYear() - 1, 5, 1); // 1er juin année précédente
    const periodeFin = new Date(now.getFullYear(), 4, 31); // 31 mai année courante

    try {
      const rapport = await rapportCSService.creerRapport({
        conseilSyndicalId: 'cs-1',
        coproprieteId: 'copro-1',
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
  }, []);

  return {
    activeTab,
    setActiveTab,
    membres: MOCK_MEMBRES,
    rapports: MOCK_RAPPORTS,
    handleCreateRapport,
  };
}
