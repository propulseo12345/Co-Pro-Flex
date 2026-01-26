import { useState, useCallback } from 'react';

export interface VenteRecente {
  id: number;
  lot: string;
  vendeur: string;
  acquereur: string;
  statut: string;
  etape: string;
  dateCompromis: string;
  documentsManquants: number;
}

export interface ImpayeCritique {
  id: number;
  coproprietaire: string;
  lot: string;
  montant: number;
  retard: number;
  statut: string;
  type: string;
}

export interface ImpayeBreakdown {
  statut: string;
  label: string;
  count: number;
  montant: number;
  color: string;
  textColor: string;
}

export interface RecentActivity {
  id: number;
  type: string;
  title: string;
  description: string;
  date: string;
  color: string;
  link: string;
}

export function useVentesImpayesPage() {
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [selectedImpayes, setSelectedImpayes] = useState<number[]>([]);

  const toggleImpayeSelection = useCallback((id: number) => {
    setSelectedImpayes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleRelanceGroupee = useCallback(() => {
    setShowRelanceModal(true);
  }, []);

  const closeRelanceModal = useCallback(() => {
    setShowRelanceModal(false);
  }, []);

  return {
    showRelanceModal,
    selectedImpayes,
    toggleImpayeSelection,
    handleRelanceGroupee,
    closeRelanceModal,
    setShowRelanceModal,
  };
}

export const getStatutVenteLabel = (statut: string) => {
  switch (statut) {
    case 'en_cours': return 'En cours';
    case 'finalise': return 'Finalisé';
    case 'annule': return 'Annulé';
    default: return statut;
  }
};

export const getStatutVenteColor = (statut: string) => {
  switch (statut) {
    case 'en_cours': return { bg: '#dbeafe', text: '#1e40af' };
    case 'finalise': return { bg: '#d1fae5', text: '#065f46' };
    case 'annule': return { bg: '#fee2e2', text: '#991b1b' };
    default: return { bg: '#f3f4f6', text: '#374151' };
  }
};

export const getStatutImpayeLabel = (statut: string) => {
  switch (statut) {
    case 'en_retard': return 'En retard';
    case 'relance_1': return 'Relance 1';
    case 'relance_2': return 'Relance 2';
    case 'contentieux': return 'Contentieux';
    default: return statut;
  }
};

export const getStatutImpayeColor = (statut: string) => {
  switch (statut) {
    case 'en_retard': return { bg: '#fef3c7', text: '#92400e' };
    case 'relance_1': return { bg: '#fed7aa', text: '#9a3412' };
    case 'relance_2': return { bg: '#fecaca', text: '#991b1b' };
    case 'contentieux': return { bg: '#fee2e2', text: '#7f1d1d' };
    default: return { bg: '#f3f4f6', text: '#374151' };
  }
};
