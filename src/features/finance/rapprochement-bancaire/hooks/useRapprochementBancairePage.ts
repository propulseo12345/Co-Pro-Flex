'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type {
  StatutRapprochement,
  LigneReleve,
  LigneLogiciel,
  LigneRapprochement,
  SessionRapprochement,
} from '../domain/types';
import { MOCK_LIGNES_RELEVE, MOCK_LIGNES_LOGICIEL } from '../domain/constants';
import { effectuerRapprochementAutomatique, calculerStats, filtrerLignes } from '../domain/utils';
import { useCopro } from '@/providers/CoproContext';
import { useBankMovements, useReconcileBankMovement } from '@/hooks/modules/useFinanceData';

export function useRapprochementBancairePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentCoproId } = useCopro();
  const { data: supabaseBankMovements, refresh: refreshBankMovements } = useBankMovements('unmatched');
  const reconcileMutation = useReconcileBankMovement();

  // Convert Supabase data to local format for reconciliation UI
  const supabaseLignesLogiciel: LigneLogiciel[] = useMemo(() => {
    if (!supabaseBankMovements) return [];
    return supabaseBankMovements.map(mov => ({
      id: mov.id,
      date: mov.bank_date,
      libelle: mov.label,
      montant: Number(mov.amount_signed),
      reference: mov.bank_ref || undefined,
      categorise: false,
      statut: mov.status === 'matched' ? 'RAPPROCHE' as const : 'EN_ATTENTE' as const,
    }));
  }, [supabaseBankMovements]);

  // Session state
  const [sessionActive, setSessionActive] = useState<SessionRapprochement | null>(null);
  const [moisSelectionne, setMoisSelectionne] = useState(new Date().getMonth());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());

  // Data
  const [lignesReleve, setLignesReleve] = useState<LigneReleve[]>([]);

  // Use Supabase data if available, otherwise fall back to mock
  const initialLignesLogiciel = currentCoproId && supabaseLignesLogiciel.length > 0 ? supabaseLignesLogiciel : MOCK_LIGNES_LOGICIEL;
  const [lignesLogiciel, setLignesLogiciel] = useState<LigneLogiciel[]>(initialLignesLogiciel);

  // Update lignesLogiciel when Supabase data changes
  useEffect(() => {
    if (currentCoproId && supabaseLignesLogiciel.length > 0) {
      setLignesLogiciel(supabaseLignesLogiciel);
    } else if (!currentCoproId) {
      setLignesLogiciel(MOCK_LIGNES_LOGICIEL);
    }
  }, [currentCoproId, supabaseLignesLogiciel]);
  const [lignesRapprochement, setLignesRapprochement] = useState<LigneRapprochement[]>([]);

  // Balances
  const [soldeReleveDebut, setSoldeReleveDebut] = useState<number>(43943.50);
  const [soldeReleveFin, setSoldeReleveFin] = useState<number>(45230.50);

  // Filters and UI
  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | StatutRapprochement>('TOUS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Computed stats
  const stats = useMemo(() => {
    return calculerStats(lignesRapprochement, lignesLogiciel, soldeReleveDebut, soldeReleveFin);
  }, [lignesRapprochement, lignesLogiciel, soldeReleveDebut, soldeReleveFin]);

  // Filtered lines
  const lignesFiltrees = useMemo(() => {
    return filtrerLignes(lignesRapprochement, filtreStatut, searchTerm);
  }, [lignesRapprochement, filtreStatut, searchTerm]);

  // Import handler
  const handleImportCSV = useCallback(() => {
    setIsImporting(true);

    setTimeout(() => {
      setLignesReleve(MOCK_LIGNES_RELEVE);

      const rapprochement = effectuerRapprochementAutomatique(MOCK_LIGNES_RELEVE, lignesLogiciel);
      setLignesRapprochement(rapprochement);

      setSessionActive({
        id: `session-${Date.now()}`,
        mois: moisSelectionne,
        annee: anneeSelectionnee,
        dateDebut: new Date().toISOString(),
        statut: 'EN_COURS',
        soldeReleveDebut,
        soldeReleveFin,
        soldeLogicielDebut: soldeReleveDebut,
        soldeLogicielFin: soldeReleveDebut + lignesLogiciel.reduce((sum, l) => sum + l.montant, 0),
        nombreLignesRapprochees: rapprochement.filter(l => l.statut === 'RAPPROCHE').length,
        nombreEcarts: rapprochement.filter(l => l.statut !== 'RAPPROCHE').length,
      });

      setIsImporting(false);
      setShowImportModal(false);
    }, 1500);
  }, [lignesLogiciel, moisSelectionne, anneeSelectionnee, soldeReleveDebut, soldeReleveFin]);

  // Validate line manually
  const handleValiderLigne = useCallback((ligneId: string) => {
    setLignesRapprochement(prev => prev.map(l => {
      if (l.id === ligneId) {
        return {
          ...l,
          statut: 'RAPPROCHE',
          valideManuellemnt: true,
          dateValidation: new Date().toISOString()
        };
      }
      return l;
    }));
  }, []);

  // Reject line
  const handleRejeterLigne = useCallback((ligneId: string) => {
    setLignesRapprochement(prev => prev.map(l => {
      if (l.id === ligneId) {
        return {
          ...l,
          statut: 'ECART',
          valideManuellemnt: false,
        };
      }
      return l;
    }));
  }, []);

  // Create missing movement
  const handleCreerMouvement = useCallback((ligne: LigneRapprochement) => {
    if (!ligne.ligneReleve) return;
    alert(`Créer mouvement: ${ligne.ligneReleve.libelle} - ${ligne.ligneReleve.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);
  }, []);

  // Certify reconciliation
  const handleCertifier = useCallback(() => {
    if (!stats.peutCertifier) return;

    setSessionActive(prev => prev ? {
      ...prev,
      statut: 'CERTIFIE',
      dateFin: new Date().toISOString(),
      certifiePar: 'Syndic Principal',
      dateCertification: new Date().toISOString()
    } : null);

    setShowCertificationModal(false);
  }, [stats.peutCertifier]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((ligneId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ligneId)) {
        newSet.delete(ligneId);
      } else {
        newSet.add(ligneId);
      }
      return newSet;
    });
  }, []);

  return {
    // Refs
    fileInputRef,

    // Session state
    sessionActive,
    moisSelectionne,
    anneeSelectionnee,

    // Data
    lignesReleve,
    lignesLogiciel,
    lignesRapprochement,
    lignesFiltrees,

    // Balances
    soldeReleveDebut,
    soldeReleveFin,

    // Filters & UI
    filtreStatut,
    searchTerm,
    showImportModal,
    showCertificationModal,
    isImporting,
    expandedRows,

    // Computed
    stats,

    // Setters
    setMoisSelectionne,
    setAnneeSelectionnee,
    setSoldeReleveDebut,
    setSoldeReleveFin,
    setFiltreStatut,
    setSearchTerm,
    setShowImportModal,
    setShowCertificationModal,

    // Handlers
    handleImportCSV,
    handleValiderLigne,
    handleRejeterLigne,
    handleCreerMouvement,
    handleCertifier,
    toggleRowExpansion,
  };
}
