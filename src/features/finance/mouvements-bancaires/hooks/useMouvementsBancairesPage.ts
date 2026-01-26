'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  TypeCompte,
  TypeMouvement,
  CategorieComptable,
  OngletActif,
  TypeImport,
  MouvementBancaireBase,
  MouvementBancaire,
  EcritureComptable,
  StatutConnexionBancaire,
  HistoriqueSynchronisation,
  SuggestionCategorie,
  SuggestionRapprochement,
  EntiteLiee,
  ErreurCoherence,
} from '../domain/types';
import {
  MOCK_MOUVEMENTS_BASE,
  MOCK_ECRITURES_COMPTABLES,
  MOCK_STATUT_CONNEXION,
  MOCK_HISTORIQUE_SYNC,
  MOCK_COMPTE_COURANT,
  MOCK_COMPTE_TRAVAUX,
  MOCK_APPELS_EN_ATTENTE,
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
  const { currentCoproId } = useCopro();
  const { data: supabaseBankMovements, isLoading, error, refresh } = useBankMovements();
  const { data: openPeriod } = useOpenPeriod();
  const importMutation = useImportBankMovement();
  const reconcileMutation = useReconcileBankMovement();

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

  // Use Supabase data if available, otherwise fall back to mock
  const initialMouvements = currentCoproId && supabaseMouvements.length > 0 ? supabaseMouvements : MOCK_MOUVEMENTS_BASE;
  const [mouvementsBase, setMouvementsBase] = useState<MouvementBancaireBase[]>(initialMouvements);

  // Update mouvements when Supabase data changes
  useEffect(() => {
    if (currentCoproId && supabaseMouvements.length > 0) {
      setMouvementsBase(supabaseMouvements);
    } else if (!currentCoproId) {
      setMouvementsBase(MOCK_MOUVEMENTS_BASE);
    }
  }, [currentCoproId, supabaseMouvements]);
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

  const [statutConnexion, setStatutConnexion] = useState<StatutConnexionBancaire>(MOCK_STATUT_CONNEXION);
  const [historiqueSync, setHistoriqueSync] = useState<HistoriqueSynchronisation[]>(MOCK_HISTORIQUE_SYNC);
  const [showHistoriqueSync, setShowHistoriqueSync] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<TypeImport>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [alerteNouveauxMouvements, setAlerteNouveauxMouvements] = useState<number | null>(null);

  const [ongletActif, setOngletActif] = useState<OngletActif>('mouvements');
  const [ecrituresComptables, setEcrituresComptables] = useState<EcritureComptable[]>(MOCK_ECRITURES_COMPTABLES);
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

      return matchesSearch && matchesType && matchesCategorie;
    });
  }, [mouvements, searchTerm, typeFilter, categorieFilter]);

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

  const handleSaveCategorie = useCallback(() => {
    if (!selectedMouvement || !selectedCompte) return;

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
        details: ref.type === 'appel_fonds'
          ? {
              periode: MOCK_APPELS_EN_ATTENTE.find(a => a.id === ref.id)?.periode,
            }
          : ref.type === 'facture'
          ? {
              statut: 'PAYEE',
              dateEcheance: new Date().toISOString().split('T')[0]
            }
          : undefined
      };
    }

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
  }, [selectedMouvement, selectedCompte, selectedCategorie, selectedSuggestion]);

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
    window.location.href = url;
  }, []);

  const handleOpenRapprochement = useCallback((mouvement: MouvementBancaire) => {
    setSelectedMouvementRapprochement(mouvement);
    const suggestions = genererSuggestionsRapprochement(mouvement, ecrituresComptables);
    setSuggestionsRapprochement(suggestions);
    setShowRapprochementModal(true);
  }, [ecrituresComptables]);

  const handleRapprocher = useCallback((ecritureId: string) => {
    if (!selectedMouvementRapprochement) return;

    setEcrituresComptables(prev =>
      prev.map(ec =>
        ec.id === ecritureId
          ? { ...ec, rapproche: true, mouvementRapproche: selectedMouvementRapprochement.id }
          : ec
      )
    );

    setShowRapprochementModal(false);
    setSelectedMouvementRapprochement(null);
    setSuggestionsRapprochement([]);
  }, [selectedMouvementRapprochement]);

  const handleAnnulerRapprochement = useCallback((ecritureId: string) => {
    setEcrituresComptables(prev =>
      prev.map(ec =>
        ec.id === ecritureId
          ? { ...ec, rapproche: false, mouvementRapproche: undefined }
          : ec
      )
    );
  }, []);

  const isMouvementRapproche = useCallback((mouvementId: string) => {
    return ecrituresComptables.some(ec => ec.mouvementRapproche === mouvementId);
  }, [ecrituresComptables]);

  const getEcritureRapprochee = useCallback((mouvementId: string) => {
    return ecrituresComptables.find(ec => ec.mouvementRapproche === mouvementId);
  }, [ecrituresComptables]);

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
    ongletActif,
    ecrituresComptables,
    selectedMouvementRapprochement,
    suggestionsRapprochement,
    showRapprochementModal,
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
    setOngletActif,
    setShowRapprochementModal,

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
