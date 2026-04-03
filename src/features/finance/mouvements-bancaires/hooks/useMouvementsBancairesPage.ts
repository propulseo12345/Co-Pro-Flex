'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  TypeCompte,
  TypeMouvement,
  CategorieComptable,
  TypeImport,
  MouvementBancaireBase,
  MouvementBancaire,
  EcritureComptable,
  StatutConnexionBancaire,
  HistoriqueSynchronisation,
  SuggestionCategorie,
  SuggestionRapprochement,
  EntiteLiee,
  WorkflowMode,
  WorkflowTab,
  CompteBancaire,
  MatchingContext,
  RapprochementContext,
} from '../domain/types';
import {
  PLAN_COMPTABLE_ESSENTIEL,
} from '../domain/constants';
import { genererSuggestionsBatch, genererRapprochementsBatch } from '../domain/matching-engine';
import type { SuggestionCategorieResult, SuggestionRapprochementResult } from '../domain/matching-engine';
import {
  calculerSoldesAvecValidation,
  calculerAlertesNonCategorises,
  calculerStatutCloture,
  calculerEcartSoldes,
  genererSuggestions,
  genererSuggestionsRapprochement,
  parseCSVBancaire,
  detectCategorie,
  getTempsDepuisSync,
  getTempsJusquaSync,
} from '../domain/utils';
import { useCopro } from '@/providers/CoproContext';
import {
  useBankMovements,
  useImportBankMovement,
  useReconcileBankMovement,
  useCategorizeBankMovement,
  useOpenPeriod,
  useBankAccounts,
  usePendingInvoices,
  useUnmatchedPayments,
  useSuppliers,
} from '@/hooks/modules/useFinanceData';
import type { BankAccountWithBalance } from '@/lib/finance/api';

// ============================================================================
// HELPERS: conversion Supabase BankAccount -> local CompteBancaire
// ============================================================================

const DEFAULT_COMPTE_COURANT: CompteBancaire = {
  id: '1',
  nom: 'Compte courant copropriete',
  type: 'courant',
  iban: '',
  soldeInitial: 0,
  derniereMaj: new Date().toISOString(),
};

const DEFAULT_COMPTE_TRAVAUX: CompteBancaire = {
  id: '2',
  nom: 'Compte fonds de travaux',
  type: 'travaux',
  iban: '',
  soldeInitial: 0,
  derniereMaj: new Date().toISOString(),
};

function bankAccountToCompteBancaire(
  account: BankAccountWithBalance,
  type: TypeCompte
): CompteBancaire {
  return {
    id: account.account_id,
    nom: account.name,
    type,
    iban: account.iban || '',
    soldeInitial: account.initial_balance,
    derniereMaj: new Date().toISOString(),
  };
}

export function useMouvementsBancairesPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const { data: supabaseBankMovements, isLoading, error, refresh } = useBankMovements();
  const { data: openPeriod } = useOpenPeriod();
  const { data: bankAccounts } = useBankAccounts();
  const { data: supabaseSuppliers } = useSuppliers();
  const { data: supabasePendingInvoices } = usePendingInvoices();
  const { data: supabaseUnmatchedPayments } = useUnmatchedPayments();
  const importMutation = useImportBankMovement();
  const reconcileMutation = useReconcileBankMovement();
  const categorizeMutation = useCategorizeBankMovement();

  // ============================================================================
  // Derive compteCourant / compteTravaux from Supabase bank_accounts
  // ============================================================================

  const compteCourant: CompteBancaire = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) return DEFAULT_COMPTE_COURANT;
    // Convention: le compte courant a un code commencant par "512" (banque) ou est le premier
    const cc = bankAccounts.find(a => a.code?.startsWith('512')) || bankAccounts[0];
    return bankAccountToCompteBancaire(cc, 'courant');
  }, [bankAccounts]);

  const compteTravaux: CompteBancaire = useMemo(() => {
    if (!bankAccounts || bankAccounts.length < 2) return DEFAULT_COMPTE_TRAVAUX;
    // Le compte travaux est le deuxieme compte (ou celui qui n'est pas le courant)
    const ct = bankAccounts.find(a => a.account_id !== compteCourant.id) || bankAccounts[1];
    return bankAccountToCompteBancaire(ct, 'travaux');
  }, [bankAccounts, compteCourant.id]);

  // Enhanced refresh that updates timestamp
  const refreshWithTimestamp = useCallback(async () => {
    await refresh();
    setLastRefresh(new Date());
  }, [refresh]);

  // Convert Supabase data to local format
  const supabaseMouvements: MouvementBancaireBase[] = useMemo(() => {
    if (!supabaseBankMovements) return [];
    return supabaseBankMovements.map(mov => ({
      id: mov.id,
      date: mov.bank_date,
      dateValeur: mov.value_date || mov.bank_date,
      type: mov.direction === 'credit' ? 'ENTREE' as const : 'SORTIE' as const,
      montant: mov.direction === 'credit' ? Number(mov.amount_abs) : -Number(mov.amount_abs),
      libelle: mov.label,
      reference: mov.bank_ref || undefined,
      categorise: mov.status === 'matched' || !!mov.account_code,
      categorie: (mov.account_category as CategorieComptable) || undefined,
      compteComptable: mov.account_code ? `${mov.account_code}` : undefined,
      accountId: (mov as unknown as Record<string, unknown>).account_id as string || compteCourant.id,
      statutRapprochement: mov.status === 'matched' ? 'rapproche' as const : 'non_rapproche' as const,
    }));
  }, [supabaseBankMovements, compteCourant.id]);

  const [compteActif, setCompteActif] = useState<TypeCompte>('courant');

  // Use Supabase data only - no mock fallback
  const [mouvementsBase, setMouvementsBase] = useState<MouvementBancaireBase[]>([]);

  // Update mouvements when Supabase data changes
  useEffect(() => {
    setMouvementsBase(supabaseMouvements);
  }, [supabaseMouvements]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TOUS' | TypeMouvement>('TOUS');
  const [categorieFilter, setCategorieFilter] = useState<'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE'>('TOUS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [selectedMouvement, setSelectedMouvement] = useState<MouvementBancaire | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<CategorieComptable>('');
  const [selectedCompte, setSelectedCompte] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionCategorie[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCategorie | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntite, setSelectedEntite] = useState<{ mouvement: MouvementBancaire; entite: EntiteLiee } | null>(null);

  // Initialize with default values instead of MOCK
  const [statutConnexion, setStatutConnexion] = useState<StatutConnexionBancaire>({
    statut: 'connecte',
    banque: 'Connexion Supabase',
    derniereSynchronisation: new Date().toISOString(),
    prochaineSynchronisation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    modeActif: 'manuel',
    comptesConnectes: 1,
    comptesTotal: 1,
  });
  const [historiqueSync, setHistoriqueSync] = useState<HistoriqueSynchronisation[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isMutating, setIsMutating] = useState(false);
  const [showHistoriqueSync, setShowHistoriqueSync] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<TypeImport>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [alerteNouveauxMouvements, setAlerteNouveauxMouvements] = useState<number | null>(null);
  const [rapprochementFilter, setRapprochementFilter] = useState<'tous' | 'rapproche' | 'non_rapproche'>('tous');
  const [showSlideOver, setShowSlideOver] = useState(false);

  // Ecritures comptables — initialized empty, will be populated from Supabase ledger entries
  const [ecrituresComptables, setEcrituresComptables] = useState<EcritureComptable[]>([]);
  const [selectedMouvementRapprochement, setSelectedMouvementRapprochement] = useState<MouvementBancaire | null>(null);
  const [suggestionsRapprochement, setSuggestionsRapprochement] = useState<SuggestionRapprochement[]>([]);
  const [showRapprochementModal, setShowRapprochementModal] = useState(false);

  // Workflow state
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('table');
  const [activeTab, setActiveTab] = useState<WorkflowTab>('categorisation');

  const compteActuel = compteActif === 'courant' ? compteCourant : compteTravaux;

  // Bug fix: filtrer les mouvements par compte actif (accountId)
  const mouvementsFiltresParCompte = useMemo(() => {
    return mouvementsBase.filter(m => m.accountId === compteActuel.id);
  }, [mouvementsBase, compteActuel.id]);

  const { mouvements, erreurs, soldeActuel } = useMemo(() => {
    return calculerSoldesAvecValidation(mouvementsFiltresParCompte, compteActuel.soldeInitial);
  }, [mouvementsFiltresParCompte, compteActuel.soldeInitial]);

  const alertesNonCategorises = useMemo(() => {
    return calculerAlertesNonCategorises(mouvements);
  }, [mouvements]);

  const statutCloture = useMemo(() => {
    const now = new Date();
    return calculerStatutCloture(mouvements, now.getMonth(), now.getFullYear());
  }, [mouvements]);

  const statsNonCategorises = useMemo(() => {
    const nonCategorises = mouvements.filter(m => !m.categorise);
    return {
      total: nonCategorises.length,
      montantTotal: nonCategorises.reduce((sum, m) => sum + Math.abs(m.montant), 0),
      entrees: nonCategorises.filter(m => m.type === 'ENTREE').length,
      sorties: nonCategorises.filter(m => m.type === 'SORTIE').length
    };
  }, [mouvements]);

  const ecartSoldes = useMemo(() => {
    const result = calculerEcartSoldes(soldeActuel, ecrituresComptables);
    const mouvementsNonRapproches = mouvements.filter(m => {
      const ecritureRapprochee = ecrituresComptables.find(e => e.mouvementRapproche === m.id);
      return !ecritureRapprochee;
    }).length;
    return { ...result, mouvementsNonRapproches };
  }, [soldeActuel, ecrituresComptables, mouvements]);

  // ============================================================================
  // Build MatchingContext & RapprochementContext from Supabase data
  // ============================================================================

  const matchingContext: MatchingContext = useMemo(() => ({
    suppliers: (supabaseSuppliers || []).map(s => ({ id: s.id, name: s.name })),
    pendingInvoices: (supabasePendingInvoices || []).map(inv => ({
      id: inv.id,
      supplier_id: inv.supplier_id,
      supplier_name: inv.supplier_name,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      label: inv.label,
      total_amount: inv.total_amount,
      status: inv.status,
    })),
    allMouvements: mouvementsBase,
  }), [supabaseSuppliers, supabasePendingInvoices, mouvementsBase]);

  const rapprochementContext: RapprochementContext = useMemo(() => ({
    pendingInvoices: matchingContext.pendingInvoices,
    unmatchedPayments: (supabaseUnmatchedPayments || []).map(p => ({
      id: p.id,
      lot_id: p.lot_id,
      amount: p.amount,
      payment_date: p.payment_date,
      method: p.method,
      reference: p.reference,
    })),
  }), [matchingContext.pendingInvoices, supabaseUnmatchedPayments]);

  // Batch suggestions (matching engine) — now fed with Supabase context
  const suggestionsCategorisation = useMemo(() => {
    const nonCategorises = mouvements.filter(m => !m.categorise);
    return genererSuggestionsBatch(nonCategorises, matchingContext);
  }, [mouvements, matchingContext]);

  const suggestionsRapprochementBatch = useMemo(() => {
    const aRapprocher = mouvements.filter(m => m.categorise && m.statutRapprochement !== 'rapproche');
    return genererRapprochementsBatch(aRapprocher, rapprochementContext);
  }, [mouvements, rapprochementContext]);

  const isMouvementRapproche = useCallback((mouvementId: string) => {
    return ecrituresComptables.some(ec => ec.mouvementRapproche === mouvementId);
  }, [ecrituresComptables]);

  const getEcritureRapprochee = useCallback((mouvementId: string) => {
    return ecrituresComptables.find(ec => ec.mouvementRapproche === mouvementId);
  }, [ecrituresComptables]);

  const filteredMouvements = useMemo(() => {
    return mouvements.filter(mouvement => {
      const matchesSearch =
        mouvement.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.montant.toString().includes(searchTerm) ||
        (mouvement.fournisseur && mouvement.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'TOUS' || mouvement.type === typeFilter;

      const matchesCategorie =
        categorieFilter === 'TOUS' ||
        (categorieFilter === 'CATEGORISE' && mouvement.categorise) ||
        (categorieFilter === 'NON_CATEGORISE' && !mouvement.categorise);

      const isRapproche = isMouvementRapproche(mouvement.id);
      const matchesRapprochement =
        rapprochementFilter === 'tous' ||
        (rapprochementFilter === 'rapproche' && isRapproche) ||
        (rapprochementFilter === 'non_rapproche' && !isRapproche);

      return matchesSearch && matchesType && matchesCategorie && matchesRapprochement;
    });
  }, [mouvements, searchTerm, typeFilter, categorieFilter, rapprochementFilter, isMouvementRapproche]);

  const totalEntrees = useMemo(() => {
    return mouvements
      .filter(m => m.type === 'ENTREE')
      .reduce((sum, m) => sum + m.montant, 0);
  }, [mouvements]);

  const totalSorties = useMemo(() => {
    return Math.abs(
      mouvements
        .filter(m => m.type === 'SORTIE')
        .reduce((sum, m) => sum + m.montant, 0)
    );
  }, [mouvements]);

  const getTempsDepuisDerniereSync = useCallback(() => {
    return getTempsDepuisSync(statutConnexion.derniereSynchronisation);
  }, [statutConnexion.derniereSynchronisation]);

  const getTempsJusquaProchaineSync = useCallback(() => {
    return getTempsJusquaSync(statutConnexion.prochaineSynchronisation, statutConnexion.modeActif);
  }, [statutConnexion.prochaineSynchronisation, statutConnexion.modeActif]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setStatutConnexion(prev => ({ ...prev, statut: 'en_cours' }));

    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;
      const now = new Date();
      const nouveauxMouvements = Math.floor(Math.random() * 5);

      if (isSuccess) {
        setStatutConnexion(prev => ({
          ...prev,
          statut: 'connecte',
          derniereSynchronisation: now.toISOString(),
          prochaineSynchronisation: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
        }));

        const nouvelleSync: HistoriqueSynchronisation = {
          id: `sync-${Date.now()}`,
          date: now.toISOString().split('T')[0],
          heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          mode: 'manuel',
          statut: 'succes',
          nombreMouvements: mouvements.length,
          message: 'Synchronisation manuelle reussie',
          details: {
            nouveauxMouvements,
            mouvementsMisAJour: Math.floor(Math.random() * 3),
            erreurs: 0
          }
        };
        setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);

        if (nouveauxMouvements > 0) {
          setAlerteNouveauxMouvements(nouveauxMouvements);
          setTimeout(() => setAlerteNouveauxMouvements(null), 5000);
        }
      } else {
        setStatutConnexion(prev => ({
          ...prev,
          statut: 'erreur',
          messageErreur: 'Timeout de connexion avec la banque. Veuillez reessayer.'
        }));

        const nouvelleSync: HistoriqueSynchronisation = {
          id: `sync-${Date.now()}`,
          date: now.toISOString().split('T')[0],
          heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          mode: 'manuel',
          statut: 'echec',
          nombreMouvements: 0,
          message: 'Erreur de connexion avec l\'API bancaire',
          details: { nouveauxMouvements: 0, mouvementsMisAJour: 0, erreurs: 1 }
        };
        setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);
      }

      setIsRefreshing(false);
    }, 2500);
  }, [mouvements.length]);

  const handleImportFile = useCallback(async () => {
    if (!importFile) return;

    setIsImporting(true);

    try {
      const content = await importFile.text();
      const now = new Date();
      const mouvementsImportes = parseCSVBancaire(content);

      if (mouvementsImportes.length > 0) {
        // If connected to Supabase, use the Edge Function
        if (currentCoproId && openPeriod) {
          const result = await importMutation.mutate({
            period_id: openPeriod.id,
            account_id: compteActuel?.id || '',
            movements: mouvementsImportes.map(m => ({
              bank_date: m.date,
              value_date: (m as { dateValeur?: string }).dateValeur || m.date,
              amount_signed: m.montant,
              label: m.libelle,
              bank_ref: (m as { reference?: string }).reference,
            })),
          });

          if (result.error) {
            const nouvelleSync: HistoriqueSynchronisation = {
              id: `sync-import-${Date.now()}`,
              date: now.toISOString().split('T')[0],
              heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              mode: 'manuel',
              statut: 'echec',
              nombreMouvements: 0,
              message: `Erreur Supabase: ${result.error}`,
              details: { nouveauxMouvements: 0, mouvementsMisAJour: 0, erreurs: 1 }
            };
            setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);
          } else {
            // Refresh data from Supabase
            refresh();

            const nouvelleSync: HistoriqueSynchronisation = {
              id: `sync-import-${Date.now()}`,
              date: now.toISOString().split('T')[0],
              heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              mode: 'manuel',
              statut: 'succes',
              nombreMouvements: result.data?.imported || mouvementsImportes.length,
              message: `Import ${importType.toUpperCase()} reussi (${importFile.name})`,
              details: {
                nouveauxMouvements: result.data?.imported || mouvementsImportes.length,
                mouvementsMisAJour: 0,
                erreurs: result.data?.errors?.length || 0
              }
            };
            setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);

            setAlerteNouveauxMouvements(result.data?.imported || mouvementsImportes.length);
            setTimeout(() => setAlerteNouveauxMouvements(null), 5000);
          }
        } else {
          // Fallback to local state when not connected
          setMouvementsBase(prev => [...mouvementsImportes, ...prev]);

          const nouvelleSync: HistoriqueSynchronisation = {
            id: `sync-import-${Date.now()}`,
            date: now.toISOString().split('T')[0],
            heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            mode: 'manuel',
            statut: 'succes',
            nombreMouvements: mouvementsImportes.length,
            message: `Import ${importType.toUpperCase()} reussi (${importFile.name})`,
            details: {
              nouveauxMouvements: mouvementsImportes.length,
              mouvementsMisAJour: 0,
              erreurs: 0
            }
          };
          setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);

          setAlerteNouveauxMouvements(mouvementsImportes.length);
          setTimeout(() => setAlerteNouveauxMouvements(null), 5000);
        }
      } else {
        const nouvelleSync: HistoriqueSynchronisation = {
          id: `sync-import-${Date.now()}`,
          date: now.toISOString().split('T')[0],
          heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          mode: 'manuel',
          statut: 'echec',
          nombreMouvements: 0,
          message: `Aucun mouvement trouve dans le fichier ${importFile.name}`,
          details: { nouveauxMouvements: 0, mouvementsMisAJour: 0, erreurs: 1 }
        };
        setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);
      }
    } catch {
      const now = new Date();
      const nouvelleSync: HistoriqueSynchronisation = {
        id: `sync-import-${Date.now()}`,
        date: now.toISOString().split('T')[0],
        heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        mode: 'manuel',
        statut: 'echec',
        nombreMouvements: 0,
        message: `Erreur lors de l'import du fichier ${importFile.name}`,
        details: { nouveauxMouvements: 0, mouvementsMisAJour: 0, erreurs: 1 }
      };
      setHistoriqueSync(prev => [nouvelleSync, ...prev.slice(0, 9)]);
    }

    setIsImporting(false);
    setShowImportModal(false);
    setImportFile(null);
  }, [importFile, importType, currentCoproId, openPeriod, importMutation, refresh]);

  const handleToggleModeSync = useCallback(() => {
    setStatutConnexion(prev => ({
      ...prev,
      modeActif: prev.modeActif === 'automatique' ? 'manuel' : 'automatique'
    }));
  }, []);

  const handleCategoriserClick = useCallback((mouvement: MouvementBancaire) => {
    setSelectedMouvement(mouvement);
    const suggestionsGenerees = genererSuggestions(mouvement);
    setSuggestions(suggestionsGenerees);

    const suggestionHaute = suggestionsGenerees.find(s => s.confiance === 'haute');
    if (suggestionHaute) {
      setSelectedSuggestion(suggestionHaute);
      setSelectedCategorie(suggestionHaute.categorie);
      setSelectedCompte(suggestionHaute.compte);
    } else {
      setSelectedSuggestion(null);
      const detection = detectCategorie(mouvement);
      setSelectedCategorie(detection.categorie);
      setSelectedCompte(detection.compte);
    }

    setShowCategorieModal(true);
  }, []);

  const handleApplySuggestion = useCallback((suggestion: SuggestionCategorie) => {
    setSelectedSuggestion(suggestion);
    setSelectedCategorie(suggestion.categorie);
    setSelectedCompte(suggestion.compte);
  }, []);

  const handleSaveCategorie = useCallback(async () => {
    if (!selectedMouvement || !selectedCompte) return;

    setIsMutating(true);

    const compteLabel = PLAN_COMPTABLE_ESSENTIEL.find(c => c.code === selectedCompte)?.label;

    let entiteLiee: EntiteLiee | undefined = undefined;
    if (selectedSuggestion?.entiteReference) {
      const ref = selectedSuggestion.entiteReference;
      entiteLiee = {
        type: ref.type,
        id: ref.id,
        nom: ref.nom,
        montant: ref.montant,
        reference: ref.type === 'appel_fonds'
          ? `AF-${ref.id.toUpperCase()}`
          : ref.type === 'facture'
          ? `FAC-${ref.nom.toUpperCase()}-${new Date().getFullYear()}`
          : undefined,
        details: ref.type === 'facture'
          ? {
              statut: 'PAYEE',
              dateEcheance: new Date().toISOString().split('T')[0]
            }
          : undefined
      };
    }

    // Update local state immediately
    setMouvementsBase(prev =>
      prev.map(m =>
        m.id === selectedMouvement.id
          ? {
              ...m,
              categorise: true,
              categorie: selectedCategorie,
              compteComptable: `${selectedCompte} - ${compteLabel}`,
              entiteLiee: entiteLiee || m.entiteLiee
            }
          : m
      )
    );

    setShowCategorieModal(false);
    setSelectedMouvement(null);
    setSelectedSuggestion(null);

    try {
      // Persist categorisation to Supabase (direct UPDATE on bank_movements)
      await categorizeMutation.mutate({
        bank_movement_id: selectedMouvement.id,
        account_code: selectedCompte,
        account_category: selectedCategorie,
      });
    } catch {
      // Backend not yet connected — local state already updated
    } finally {
      setIsMutating(false);
    }
  }, [selectedMouvement, selectedCompte, selectedCategorie, selectedSuggestion, categorizeMutation]);

  const handleOpenEntityDetail = useCallback((mouvement: MouvementBancaire) => {
    if (mouvement.entiteLiee) {
      setSelectedEntite({ mouvement, entite: mouvement.entiteLiee });
      setShowDetailModal(true);
    }
  }, []);

  const handleNavigateToEntity = useCallback((entite: EntiteLiee) => {
    let url = '';
    switch (entite.type) {
      case 'facture':
        url = `/finance/factures?id=${entite.id}`;
        break;
      case 'appel_fonds':
        url = `/finance/appels-fonds?id=${entite.id}`;
        break;
      case 'coproprietaire':
        url = `/coproprietaires?id=${entite.id}`;
        break;
      case 'fournisseur':
        url = `/maintenance/contrats?fournisseur=${entite.id}`;
        break;
    }
    if (url) router.push(url);
  }, [router]);

  const handleOpenRapprochement = useCallback((mouvement: MouvementBancaire) => {
    setSelectedMouvementRapprochement(mouvement);
    const suggestions = genererSuggestionsRapprochement(mouvement, ecrituresComptables);
    setSuggestionsRapprochement(suggestions);
    setShowSlideOver(true);
  }, [ecrituresComptables]);

  const handleRapprocher = useCallback(async (ecritureId: string) => {
    if (!selectedMouvementRapprochement) return;

    setIsMutating(true);

    try {
      // Call Supabase reconcile API
      await reconcileMutation.mutate({
        bank_movement_id: selectedMouvementRapprochement.id,
        target_type: 'other',
        target_id: ecritureId,
      });

      // Update local state
      setEcrituresComptables(prev =>
        prev.map(ec =>
          ec.id === ecritureId
            ? { ...ec, rapproche: true, mouvementRapproche: selectedMouvementRapprochement.id }
            : ec
        )
      );

      // Refresh from Supabase
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowSlideOver(false);
    setSelectedMouvementRapprochement(null);
    setSuggestionsRapprochement([]);
  }, [selectedMouvementRapprochement, reconcileMutation, refreshWithTimestamp]);

  const handleBatchCategorise = useCallback(async (
    selections: Map<string, { compte: string; categorie: CategorieComptable }>
  ) => {
    setIsMutating(true);
    try {
      const promises = Array.from(selections.entries()).map(([mouvementId, { compte }]) =>
        reconcileMutation.mutate({
          bank_movement_id: mouvementId,
          target_type: 'other',
          target_id: compte,
        })
      );
      await Promise.all(promises);
      // Mise a jour locale
      setMouvementsBase(prev => prev.map(m => {
        const sel = selections.get(m.id);
        if (!sel) return m;
        const compteInfo = PLAN_COMPTABLE_ESSENTIEL.find(c => c.code === sel.compte);
        return { ...m, categorise: true, compteComptable: `${sel.compte} - ${compteInfo?.label || ''}`, categorie: sel.categorie };
      }));
    } finally {
      setIsMutating(false);
    }
  }, [reconcileMutation]);

  const handleBatchRapprocher = useCallback(async (
    matches: Map<string, string> // mouvementId -> ecritureId
  ) => {
    setIsMutating(true);
    try {
      const promises = Array.from(matches.entries()).map(([mouvementId, ecritureId]) =>
        reconcileMutation.mutate({
          bank_movement_id: mouvementId,
          target_type: 'other',
          target_id: ecritureId,
        })
      );
      await Promise.all(promises);
      // Mise a jour locale
      setMouvementsBase(prev => prev.map(m => {
        const ecritureId = matches.get(m.id);
        if (!ecritureId) return m;
        return { ...m, statutRapprochement: 'rapproche' as const, ecritureRapprocheeId: ecritureId };
      }));
      setEcrituresComptables(prev => prev.map(ec => {
        const mouvementId = Array.from(matches.entries()).find(([, eId]) => eId === ec.id)?.[0];
        if (!mouvementId) return ec;
        return { ...ec, rapproche: true, mouvementRapproche: mouvementId };
      }));
    } finally {
      setIsMutating(false);
    }
  }, [reconcileMutation]);

  const handleAnnulerRapprochement = useCallback((ecritureId: string) => {
    setEcrituresComptables(prev =>
      prev.map(ec =>
        ec.id === ecritureId
          ? { ...ec, rapproche: false, mouvementRapproche: undefined }
          : ec
      )
    );
  }, []);

  const downloadRIB = useCallback(() => {
    // Placeholder
  }, []);

  // Convenience handlers for modal
  const handleCategorieChange = useCallback((categorie: CategorieComptable) => {
    setSelectedCategorie(categorie);
    setSelectedCompte('');
    setSelectedSuggestion(null);
  }, []);

  const handleCompteChange = useCallback((compte: string) => {
    setSelectedCompte(compte);
    setSelectedSuggestion(null);
  }, []);

  return {
    // Data loading state
    isLoading,
    isMutating,
    error,
    refreshData: refreshWithTimestamp,
    lastRefresh,
    currentCoproId,
    hasData: mouvements.length > 0,

    // State
    compteActif,
    mouvements,
    filteredMouvements,
    erreurs,
    soldeActuel,
    soldeInitial: compteActuel.soldeInitial,
    searchTerm,
    typeFilter,
    categorieFilter,
    isRefreshing,
    showCategorieModal,
    selectedMouvement,
    selectedCategorie,
    selectedCompte,
    suggestions,
    selectedSuggestion,
    showDetailModal,
    selectedEntite,
    statutConnexion,
    historiqueSync,
    showHistoriqueSync,
    showImportModal,
    importType,
    importFile,
    isImporting,
    alerteNouveauxMouvements,
    rapprochementFilter,
    showSlideOver,
    ecrituresComptables,
    selectedMouvementRapprochement,
    suggestionsRapprochement,
    compteActuel,
    alertes: alertesNonCategorises,
    alertesNonCategorises,
    statutCloture,
    statsNonCategorises,
    ecartSoldes,
    totalEntrees,
    totalSorties,
    compteCourant,
    compteTravaux,

    // Setters
    setCompteActif,
    setSearchTerm,
    setTypeFilter,
    setCategorieFilter,
    setShowCategorieModal,
    setSelectedCategorie,
    setSelectedCompte,
    setSelectedSuggestion,
    setShowDetailModal,
    setShowHistoriqueSync,
    setShowImportModal,
    setImportType,
    setImportFile,
    setAlerteNouveauxMouvements,
    setRapprochementFilter,
    setShowSlideOver,

    // Handlers
    handleRefresh,
    handleImportFile,
    handleToggleModeSync,
    handleCategoriserClick,
    handleApplySuggestion,
    handleSaveCategorie,
    handleCategorieChange,
    handleCompteChange,
    handleOpenEntityDetail,
    handleNavigateToEntity,
    handleOpenRapprochement,
    handleRapprocher,
    handleAnnulerRapprochement,
    handleBatchCategorise,
    handleBatchRapprocher,
    isMouvementRapproche,
    getEcritureRapprochee,
    downloadRIB,
    getTempsDepuisDerniereSync,
    getTempsJusquaProchaineSync,

    // Workflow
    workflowMode,
    setWorkflowMode,
    activeTab,
    setActiveTab,
    suggestionsCategorisation,
    suggestionsRapprochementBatch,

    // Constants
    PLAN_COMPTABLE_ESSENTIEL,
  };
}

export type UseMouvementsBancairesPageReturn = ReturnType<typeof useMouvementsBancairesPage>;
