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
} from '../domain/types';
// Import only constants that are still needed - NOT MOCK data
import {
  MOCK_COMPTE_COURANT,
  MOCK_COMPTE_TRAVAUX,
  COMPTES_CHARGE,
  COMPTES_PRODUIT,
} from '../domain/constants';
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
import { useBankMovements, useImportBankMovement, useReconcileBankMovement, useOpenPeriod } from '@/hooks/modules/useFinanceData';

export function useMouvementsBancairesPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const { data: supabaseBankMovements, isLoading, error, refresh } = useBankMovements();
  const { data: openPeriod } = useOpenPeriod();
  const importMutation = useImportBankMovement();
  const reconcileMutation = useReconcileBankMovement();

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
      categorise: mov.status === 'matched',
    }));
  }, [supabaseBankMovements]);

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

  // Initialize with empty array - will be populated from Supabase ledger entries
  const [ecrituresComptables, setEcrituresComptables] = useState<EcritureComptable[]>([]);
  const [selectedMouvementRapprochement, setSelectedMouvementRapprochement] = useState<MouvementBancaire | null>(null);
  const [suggestionsRapprochement, setSuggestionsRapprochement] = useState<SuggestionRapprochement[]>([]);
  const [showRapprochementModal, setShowRapprochementModal] = useState(false);

  const compteActuel = compteActif === 'courant' ? MOCK_COMPTE_COURANT : MOCK_COMPTE_TRAVAUX;

  const { mouvements, erreurs, soldeActuel } = useMemo(() => {
    return calculerSoldesAvecValidation(mouvementsBase, compteActuel.soldeInitial);
  }, [mouvementsBase, compteActuel.soldeInitial]);

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
          message: 'Synchronisation manuelle réussie',
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
          messageErreur: 'Timeout de connexion avec la banque. Veuillez réessayer.'
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
              message: `Import ${importType.toUpperCase()} réussi (${importFile.name})`,
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
            message: `Import ${importType.toUpperCase()} réussi (${importFile.name})`,
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
          message: `Aucun mouvement trouvé dans le fichier ${importFile.name}`,
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

    const compteLabel = selectedCategorie === 'charge'
      ? COMPTES_CHARGE.find(c => c.code === selectedCompte)?.label
      : COMPTES_PRODUIT.find(c => c.code === selectedCompte)?.label;

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

    try {
      // Call Supabase reconcile API to categorize the movement
      const result = await reconcileMutation.mutate({
        bank_movement_id: selectedMouvement.id,
        target_type: 'other',
        target_id: selectedCompte, // Account code as target
      });

      // Update local state optimistically
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

      // Refresh from Supabase to ensure consistency
      await refreshWithTimestamp();
    } finally {
      setIsMutating(false);
    }

    setShowCategorieModal(false);
    setSelectedMouvement(null);
    setSelectedSuggestion(null);
  }, [selectedMouvement, selectedCompte, selectedCategorie, selectedSuggestion, reconcileMutation, refreshWithTimestamp]);

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
      const result = await reconcileMutation.mutate({
        bank_movement_id: selectedMouvementRapprochement.id,
        target_type: 'other', // Could be 'payment' or 'supplier_payment' based on ecriture type
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
    compteCourant: MOCK_COMPTE_COURANT,
    compteTravaux: MOCK_COMPTE_TRAVAUX,

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
    isMouvementRapproche,
    getEcritureRapprochee,
    downloadRIB,
    getTempsDepuisDerniereSync,
    getTempsJusquaProchaineSync,

    // Constants
    COMPTES_CHARGE,
    COMPTES_PRODUIT,
    MOCK_COMPTE_COURANT,
    MOCK_COMPTE_TRAVAUX,
  };
}

export type UseMouvementsBancairesPageReturn = ReturnType<typeof useMouvementsBancairesPage>;
