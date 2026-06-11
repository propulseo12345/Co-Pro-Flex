'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import {
    getAllContrats,
    subscribeToContracts,
} from '@/lib/services/contracts.service';
import {
    useLogbook as useLogbookSupabase,
    useProviders,
} from '@/hooks/modules/useMaintenanceData';
import { useCopro } from '@/providers/CoproContext';
import { useSyndicContract } from '@/hooks/useSyndicContract';
import { createClient } from '@/lib/supabase/client';
import type { LogbookOverview, LogbookAlert, LogbookEntryInsert } from '@/types/domain';
import type {
    Intervention,
    InterventionFormData,
    CoproprieteFormData,
    ActiveTab,
    InterventionView,
    ExportFormat,
    StatsCategorie,
    DocumentStats,
    LogbookKpis,
    DocumentsByCategory,
    CATEGORIES_DOCUMENTS,
    FiltreKpi,
    PrestataireOption,
    ResultatCreationIntervention,
    ToastCreationProps,
    ToastType
} from '@/components/features/maintenance/Logbook/types';
import { isDocumentExpired, isDocumentExpiringSoon, isEcheanceProche, isGarantieEnCours, getInitialInterventionForm } from '@/components/features/maintenance/Logbook/utils';
import { DocumentTechnique, ContratAssurance, CategoriePrestataire, TypeDocumentTechnique, SousTypeAssurance, TravauxPrevisionnel } from '@/types';
import type { Prestataire } from '@/types';

// ============================================================================
// MAPPING DB ↔ FRONT
// ============================================================================

const STATUS_DB_TO_FRONT: Record<string, Intervention['statut']> = {
    planifiee: 'PLANIFIEE',
    en_cours: 'EN_COURS',
    terminee: 'TERMINEE',
};
const STATUS_FRONT_TO_DB: Record<string, string> = {
    PLANIFIEE: 'planifiee',
    EN_COURS: 'en_cours',
    TERMINEE: 'terminee',
};
const CATEGORY_DB_TO_FRONT: Record<string, Intervention['categorie']> = {
    courante: 'COURANTE',
    travaux_importants: 'TRAVAUX_IMPORTANTS',
};
const CATEGORY_FRONT_TO_DB: Record<string, string> = {
    COURANTE: 'courante',
    TRAVAUX_IMPORTANTS: 'travaux_importants',
};
const TYPE_DB_TO_FRONT: Record<string, Intervention['type']> = {
    entretien: 'ENTRETIEN',
    controle: 'INSPECTION',
    incident: 'REPARATION',
    visite: 'INSPECTION',
    travaux: 'ENTRETIEN',
    diagnostic: 'INSPECTION',
};
const TYPE_FRONT_TO_DB: Record<string, string> = {
    ENTRETIEN: 'entretien',
    REPARATION: 'incident',
    INSPECTION: 'controle',
};

/** Convertit une entrée Supabase en type Intervention front */
function toIntervention(entry: LogbookOverview): Intervention {
    return {
        id: entry.id || '',
        date: entry.happened_at || '',
        titre: entry.title || '',
        description: entry.description || '',
        statut: STATUS_DB_TO_FRONT[entry.status || ''] || 'PLANIFIEE',
        categorie: CATEGORY_DB_TO_FRONT[entry.category || ''] || 'COURANTE',
        type: TYPE_DB_TO_FRONT[entry.entry_type || ''] || 'ENTRETIEN',
        cout: entry.cost ?? undefined,
        intervenant: entry.provider_name || '',
        prestataireId: entry.provider_id || undefined,
        equipementConcerne: (entry as Record<string, unknown>).equipment_concerned as string || undefined,
        contratId: entry.contract_id || undefined,
        ordreServiceId: entry.service_order_id || undefined,
    };
}

// Catégories de documents
const CATEGORIES_DOCS: Record<string, string[]> = {
    DTA: ['DTA'],
    DIAGNOSTICS: ['DIAGNOSTIC_PLOMB', 'DIAGNOSTIC_ELECTRICITE', 'DIAGNOSTIC_GAZ', 'DPE_COLLECTIF'],
    CONTROLES: ['CONTROLE_ASCENSEUR', 'CONTROLE_EXTINCTEURS', 'CONTROLE_CHAUFFERIE', 'RAPPORT_SECURITE'],
    GARANTIES: ['GARANTIE_DECENNALE', 'GARANTIE_PARFAIT_ACHEVEMENT']
};

// Labels des filtres KPI pour l'affichage
const LABELS_FILTRES_KPI: Record<Exclude<FiltreKpi, null>, string> = {
    en_cours: 'En cours',
    planifiees: 'Planifiées',
    travaux_prevus: 'Travaux prévus',
    travaux_votes: 'Travaux votés',
    cout_annee: 'Coût année',
    urgences: 'Urgences',
};

export function useLogbook() {
    // === CONTEXTE COPRO + SYNDIC ===
    const { currentCopro, currentCoproId } = useCopro();
    const { syndicInfo } = useSyndicContract(currentCoproId);

    // Synchroniser avec le service partagé des contrats
    const contrats = useSyncExternalStore(
        subscribeToContracts,
        getAllContrats,
        getAllContrats // SSR fallback
    );

    // === SUPABASE: interventions + prestataires ===
    const {
        entries: dbEntries,
        alerts: dbAlerts,
        isLoading: isLoadingEntries,
        error: entriesError,
        fetchEntries,
        createEntry,
        updateEntry,
    } = useLogbookSupabase();

    const {
        providers: dbProviders,
        createProvider,
    } = useProviders();

    // === SUPABASE: documents techniques, travaux, assurances ===
    const [technicalDocs, setTechnicalDocs] = useState<DocumentTechnique[]>([]);
    const [plannedWorks, setPlannedWorks] = useState<TravauxPrevisionnel[]>([]);
    const [insurancePolicies, setInsurancePolicies] = useState<ContratAssurance[]>([]);

    useEffect(() => {
        if (!currentCoproId) return;
        const supabase = createClient();

        // Charger les documents techniques
        supabase
            .from('technical_documents')
            .select('*')
            .eq('copro_id', currentCoproId)
            .order('doc_type')
            .then(({ data }) => {
                if (data) {
                    setTechnicalDocs(data.map((d: Record<string, unknown>) => ({
                        id: d.id as string,
                        nom: d.name as string,
                        type: (d.doc_type as string).toUpperCase() as TypeDocumentTechnique,
                        dateAjout: d.added_date as string,
                        dateValidite: d.validity_date as string | undefined,
                        url: d.storage_path as string || '#',
                        observations: d.observations as string | undefined,
                    })));
                }
            });

        // Charger les travaux prévisionnels
        supabase
            .from('planned_works')
            .select('*')
            .eq('copro_id', currentCoproId)
            .order('planned_date')
            .then(({ data }) => {
                if (data) {
                    setPlannedWorks(data.map((w: Record<string, unknown>) => ({
                        id: w.id as string,
                        titre: w.title as string,
                        description: (w.description as string) || '',
                        type: (w.work_type as string).toUpperCase() as TravauxPrevisionnel['type'],
                        datePrevisionnelle: w.planned_date as string || '',
                        dateVote: w.vote_date as string | undefined,
                        montantEstime: Number(w.estimated_amount) || 0,
                        montantVote: w.voted_amount ? Number(w.voted_amount) : undefined,
                        statut: (w.status as string).toUpperCase() as TravauxPrevisionnel['statut'],
                        priorite: (w.priority as string).toUpperCase() as TravauxPrevisionnel['priorite'],
                        issuPPT: w.from_ppt as boolean,
                        observations: w.observations as string | undefined,
                    })));
                }
            });

        // Charger les assurances
        supabase
            .from('insurance_policies')
            .select('*')
            .eq('copro_id', currentCoproId)
            .then(({ data }) => {
                if (data) {
                    setInsurancePolicies(data.map((p: Record<string, unknown>) => ({
                        id: p.id as string,
                        type: 'ASSURANCE' as const,
                        sousType: (p.sub_type as string).toUpperCase() as SousTypeAssurance,
                        nom: p.insurer_name as string,
                        assureur: p.insurer_name as string,
                        numeroPolice: p.policy_number as string,
                        dateDebut: (p.created_at as string).split('T')[0],
                        dateFin: '',
                        primeAnnuelle: Number(p.annual_premium) || 0,
                        franchise: p.deductible ? Number(p.deductible) : undefined,
                        garanties: (p.guarantees as string[]) || [],
                        observations: p.observations as string | undefined,
                    })));
                }
            });
    }, [currentCoproId]);

    // Mapper les entrées DB vers le type front
    const interventions = useMemo<Intervention[]>(
        () => dbEntries.map(toIntervention),
        [dbEntries]
    );

    // Liste des prestataires pour le sélecteur
    const prestatairesOptions = useMemo<PrestataireOption[]>(
        () => dbProviders
            .filter(p => p.id && p.name)
            .map(p => ({ id: p.id as string, nom: p.name as string })),
        [dbProviders]
    );

    // Alertes depuis la vue Supabase
    const interventionAlerts = useMemo(() => dbAlerts, [dbAlerts]);

    // État de soumission
    const [isSubmitting, setIsSubmitting] = useState(false);

    // États onglets et vues
    const [activeTab, setActiveTab] = useState<ActiveTab>('interventions');
    const [interventionView, setInterventionView] = useState<InterventionView>('all');
    const [filtreKpiActif, setFiltreKpiActif] = useState<FiltreKpi>(null);

    // État du toast de création
    const [toastCreation, setToastCreation] = useState<Omit<ToastCreationProps, 'onClose' | 'onVoirIntervention' | 'onAfficherTout'> | null>(null);

    // États filtres interventions
    const [searchTerm, setSearchTerm] = useState('');
    const [categorieFilter, setCategorieFilter] = useState<'TOUS' | 'COURANTE' | 'TRAVAUX_IMPORTANTS'>('TOUS');
    const [statutFilter, setStatutFilter] = useState<string>('TOUS');
    const [prestataireFilter, setPrestataireFilter] = useState<string>('TOUS');
    const [equipementFilter, setEquipementFilter] = useState<string>('TOUS');
    const [anneeFilter, setAnneeFilter] = useState<string>('TOUS');

    // États filtres documents
    const [searchDocuments, setSearchDocuments] = useState('');
    const [categorieDocFilter, setCategorieDocFilter] = useState<string>('TOUS');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['DTA', 'DIAGNOSTICS', 'CONTROLES', 'GARANTIES', 'AUTRES']);

    // États UI
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSimplifiedView, setIsSimplifiedView] = useState(false);

    // États modals
    const [selectedEquipement, setSelectedEquipement] = useState<string | null>(null);
    const [showNewInterventionModal, setShowNewInterventionModal] = useState(false);
    const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
    const [selectedAssurance, setSelectedAssurance] = useState<ContratAssurance | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<DocumentTechnique | null>(null);

    // États formulaires
    const [newInterventionForm, setNewInterventionForm] = useState<InterventionFormData>(getInitialInterventionForm());
    const [formData, setFormData] = useState<CoproprieteFormData>({
        nom: '',
        adresse: '',
        codePostal: '',
        ville: '',
        anneeConstruction: 0,
        nombreBatiments: 1,
        nombreLots: 0,
        syndicNom: '',
        syndicTelephone: '',
        syndicEmail: '',
    });

    // Synchroniser formData avec les données Supabase (CoproContext + SyndicContract)
    useEffect(() => {
        if (!currentCopro) return;
        setFormData({
            nom: currentCopro.name || '',
            adresse: currentCopro.address || '',
            codePostal: currentCopro.postal_code || '',
            ville: currentCopro.city || '',
            anneeConstruction: currentCopro.annee_construction || 0,
            // nb de bâtiments / lots : tables buildings/lots (non rebranchées ici) -> valeurs par défaut.
            nombreBatiments: 1,
            nombreLots: 0,
            syndicNom: syndicInfo.nom || '',
            syndicTelephone: syndicInfo.telephone || '',
            syndicEmail: syndicInfo.email || '',
        });
    }, [currentCopro, syndicInfo]);

    // Données — prestataires depuis Supabase
    const allPrestataires = useMemo(() => {
        const mapped = dbProviders
            .filter(p => p.id && p.name)
            .map(p => ({
                id: p.id as string,
                nom: p.name as string,
                categorie: (p.category || 'copropriete').toUpperCase(),
                domaines: ((p.domains || []) as string[]).map(d => d.toUpperCase()),
                telephone: p.phone || '',
                email: p.email || '',
                adresse: '',
                dateAjout: p.created_at || '',
                nombreInterventions: p.interventions_count || 0,
            }));
        return mapped as unknown as Prestataire[];
    }, [dbProviders]);

    // Helpers pour équipements - utilise les contrats synchronisés
    const getContratsForEquipement = useCallback((equipement: string) => {
        const keywords = equipement.toLowerCase().split(' ');
        return contrats.filter(c => {
            const contratText = `${c.nom} ${c.description || ''} ${c.type}`.toLowerCase();
            return keywords.some(keyword => contratText.includes(keyword)) ||
                (c.type === 'ASCENSEUR' && equipement.toLowerCase().includes('ascenseur')) ||
                (c.type === 'CHAUFFAGE' && equipement.toLowerCase().includes('chaudi')) ||
                (c.type === 'INTERPHONE' && equipement.toLowerCase().includes('interphone')) ||
                (c.type === 'PORTAIL' && equipement.toLowerCase().includes('portail'));
        });
    }, [contrats]);

    const getInterventionsForEquipement = useCallback((equipement: string) => {
        return interventions.filter(i =>
            i.equipementConcerne?.toLowerCase().includes(equipement.toLowerCase()) ||
            i.titre.toLowerCase().includes(equipement.toLowerCase())
        );
    }, [interventions]);

    const getDocumentsForEquipement = useCallback((equipement: string) => {
        const keywords = equipement.toLowerCase().split(' ');
        return technicalDocs.filter(d => {
            const docText = `${d.nom} ${d.type}`.toLowerCase();
            return keywords.some(keyword => docText.includes(keyword)) ||
                (d.type === 'CONTROLE_ASCENSEUR' && equipement.toLowerCase().includes('ascenseur')) ||
                (d.type === 'CONTROLE_CHAUFFERIE' && equipement.toLowerCase().includes('chaudi'));
        });
    }, []);

    // Filtrage interventions
    const filteredInterventions = useMemo(() => {
        return interventions.filter(intervention => {
            const matchesSearch = searchTerm === '' ||
                intervention.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                intervention.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                intervention.intervenant.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategorie = categorieFilter === 'TOUS' || intervention.categorie === categorieFilter;
            const matchesStatut = statutFilter === 'TOUS' || intervention.statut === statutFilter;
            const matchesPrestataire = prestataireFilter === 'TOUS' || intervention.prestataireId === prestataireFilter;
            const matchesEquipement = equipementFilter === 'TOUS' || intervention.equipementConcerne === equipementFilter;
            const matchesAnnee = anneeFilter === 'TOUS' || new Date(intervention.date).getFullYear().toString() === anneeFilter;

            return matchesSearch && matchesCategorie && matchesStatut && matchesPrestataire && matchesEquipement && matchesAnnee;
        }).sort((a, b) => {
            const statutPriority: Record<string, number> = {
                URGENTE: 0, URGENT: 0,
                EN_COURS: 1,
                PLANIFIEE: 2, PLANIFIE: 2,
                TERMINEE: 3, TERMINE: 3,
            };
            const pa = statutPriority[a.statut] ?? 4;
            const pb = statutPriority[b.statut] ?? 4;
            if (pa !== pb) return pa - pb;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [interventions, searchTerm, categorieFilter, statutFilter, prestataireFilter, equipementFilter, anneeFilter]);

    const interventionsCourantes = useMemo(() =>
        filteredInterventions.filter(i => i.categorie === 'COURANTE'),
        [filteredInterventions]
    );

    const travauxImportants = useMemo(() =>
        filteredInterventions.filter(i => i.categorie === 'TRAVAUX_IMPORTANTS'),
        [filteredInterventions]
    );

    const years = useMemo(() =>
        Array.from(new Set(interventions.map(i => new Date(i.date).getFullYear()))).sort((a, b) => b - a),
        [interventions]
    );

    const equipements = useMemo(() =>
        Array.from(new Set(interventions.map(i => i.equipementConcerne).filter(Boolean))) as string[],
        [interventions]
    );

    // Stats interventions
    const statsCategorie = useMemo<StatsCategorie>(() => {
        const allInterventions = interventions;
        const courantes = allInterventions.filter(i => i.categorie === 'COURANTE');
        const travaux = allInterventions.filter(i => i.categorie === 'TRAVAUX_IMPORTANTS');

        const calcStats = (items: typeof allInterventions) => ({
            total: items.length,
            terminees: items.filter(i => i.statut === 'TERMINEE').length,
            enCours: items.filter(i => i.statut === 'EN_COURS').length,
            planifiees: items.filter(i => i.statut === 'PLANIFIEE').length,
            coutTotal: items.reduce((sum, i) => sum + (i.cout || 0), 0),
            coutTermine: items.filter(i => i.statut === 'TERMINEE').reduce((sum, i) => sum + (i.cout || 0), 0),
        });

        return {
            courantes: calcStats(courantes),
            travaux: calcStats(travaux),
            global: calcStats(allInterventions),
        };
    }, [interventions]);

    // Filtrage documents
    const filteredDocuments = useMemo(() => {
        return technicalDocs.filter(doc => {
            const matchesSearch = searchDocuments === '' ||
                doc.nom.toLowerCase().includes(searchDocuments.toLowerCase());

            if (categorieDocFilter === 'TOUS') return matchesSearch;

            const categorieTypes = CATEGORIES_DOCS[categorieDocFilter];
            if (categorieTypes) {
                return matchesSearch && categorieTypes.includes(doc.type);
            }
            if (categorieDocFilter === 'AUTRES') {
                const allCategorizedTypes = Object.values(CATEGORIES_DOCS).flat();
                return matchesSearch && !allCategorizedTypes.includes(doc.type);
            }
            return matchesSearch;
        });
    }, [searchDocuments, categorieDocFilter]);

    const documentsByCategory = useMemo<DocumentsByCategory>(() => {
        const allCategorizedTypes = Object.values(CATEGORIES_DOCS).flat();
        return {
            DTA: filteredDocuments.filter(d => CATEGORIES_DOCS.DTA.includes(d.type)),
            DIAGNOSTICS: filteredDocuments.filter(d => CATEGORIES_DOCS.DIAGNOSTICS.includes(d.type)),
            CONTROLES: filteredDocuments.filter(d => CATEGORIES_DOCS.CONTROLES.includes(d.type)),
            GARANTIES: filteredDocuments.filter(d => CATEGORIES_DOCS.GARANTIES.includes(d.type)),
            AUTRES: filteredDocuments.filter(d => !allCategorizedTypes.includes(d.type))
        };
    }, [filteredDocuments]);

    const documentStats = useMemo<DocumentStats>(() => {
        const total = technicalDocs.length;
        const expired = technicalDocs.filter(d => isDocumentExpired(d.dateValidite)).length;
        const expiring = technicalDocs.filter(d => isDocumentExpiringSoon(d.dateValidite)).length;
        const valid = technicalDocs.filter(d => !d.dateValidite || (!isDocumentExpired(d.dateValidite) && !isDocumentExpiringSoon(d.dateValidite))).length;
        return { total, expired, expiring, valid };
    }, []);

    // KPIs — 6 tuiles du nouveau header
    const kpis = useMemo<LogbookKpis>(() => ({
        enCours: interventions.filter(i => i.statut === 'EN_COURS').length,
        planifiees: interventions.filter(i => i.statut === 'PLANIFIEE').length,
        travauxPrevus: plannedWorks.length,
        travauxVotes: plannedWorks.filter(t => t.statut === 'VOTE').length,
        coutAnnee: interventions
            .filter(i => new Date(i.date).getFullYear() === new Date().getFullYear())
            .reduce((sum, i) => sum + (i.cout || 0), 0),
        urgences: interventions.filter(i =>
            (i.statut as string) === 'URGENTE' || (i.statut as string) === 'URGENT'
        ).length,
    }), [interventions]);

    // Handlers
    const handleSaveInfo = useCallback(async () => {
        if (!currentCoproId) return;
        setSaveError(null);
        const supabase = createClient();

        // Sauvegarder les infos copropriété dans Supabase (colonnes réelles uniquement :
        // buildings_count / lots_count n'existent pas sur copros -> tables buildings/lots, hors scope).
        // Client non typé : les types générés (périmés) déclarent annee_construction en string
        // alors que la colonne est smallint -> régénération différée avec le rebranchement maintenance.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('copros')
            .update({
                name: formData.nom,
                address: formData.adresse,
                postal_code: formData.codePostal,
                city: formData.ville,
                annee_construction: formData.anneeConstruction || null,
            })
            .eq('id', currentCoproId);

        // Échec : on garde le mode édition ouvert ET on expose un message (sinon perte silencieuse).
        if (error) {
            setSaveError('La sauvegarde a échoué. Vérifiez votre connexion et réessayez.');
            return;
        }
        setIsEditing(false);
    }, [formData, currentCoproId]);

    /** Vérifie si une intervention est visible avec le filtre KPI actuel */
    const estVisibleAvecFiltreKpi = useCallback((intervention: Intervention, filtre: FiltreKpi): boolean => {
        switch (filtre) {
            case 'en_cours':
                return intervention.statut === 'EN_COURS';
            case 'planifiees':
                return intervention.statut === 'PLANIFIEE';
            case 'urgences':
                return (intervention.statut as string) === 'URGENTE' || (intervention.statut as string) === 'URGENT';
            case 'travaux_prevus':
            case 'travaux_votes':
            case 'cout_annee':
                return false; // Ces filtres ne concernent pas directement les interventions
            case null:
            default:
                return true;
        }
    }, []);

    /** Vérifie si une intervention passe les filtres de liste */
    const estVisibleAvecFiltresListe = useCallback((intervention: Intervention): boolean => {
        const matchesStatut = statutFilter === 'TOUS' || intervention.statut === statutFilter;
        const matchesCategorie = categorieFilter === 'TOUS' || intervention.categorie === categorieFilter;
        const matchesEquipement = equipementFilter === 'TOUS' || intervention.equipementConcerne === equipementFilter;
        const matchesAnnee = anneeFilter === 'TOUS' || new Date(intervention.date).getFullYear().toString() === anneeFilter;
        return matchesStatut && matchesCategorie && matchesEquipement && matchesAnnee;
    }, [statutFilter, categorieFilter, equipementFilter, anneeFilter]);

    /** Ferme le toast de création */
    const fermerToastCreation = useCallback(() => {
        setToastCreation(null);
    }, []);

    const handleCreateIntervention = useCallback(async (): Promise<ResultatCreationIntervention> => {
        // Validation
        if (!newInterventionForm.titre?.trim()) {
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur de validation',
                message: 'Le titre est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return { succes: false, erreur: 'Le titre est obligatoire', visibleAvecFiltreActuel: false };
        }

        if (!newInterventionForm.prestataireId && !newInterventionForm.intervenant?.trim()) {
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur de validation',
                message: 'Sélectionnez un prestataire ou saisissez un intervenant',
                estVisibleAvecFiltre: false,
            });
            return { succes: false, erreur: 'Prestataire obligatoire', visibleAvecFiltreActuel: false };
        }

        if (newInterventionForm.prestataireId === '__new__' && !newInterventionForm.nouveauPrestataire?.trim()) {
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur de validation',
                message: 'Le nom du nouveau prestataire est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return { succes: false, erreur: 'Nom prestataire obligatoire', visibleAvecFiltreActuel: false };
        }

        setIsSubmitting(true);

        try {
            // Si nouveau prestataire → créer d'abord
            let providerId: string | undefined;
            let providerName = newInterventionForm.intervenant.trim();

            if (newInterventionForm.prestataireId === '__new__') {
                const newProvider = await createProvider({
                    name: newInterventionForm.nouveauPrestataire.trim(),
                    category: 'copropriete',
                    domains: [],
                    copro_id: '',
                } as Parameters<typeof createProvider>[0]);
                providerId = newProvider.id;
                providerName = newProvider.name;
            } else if (newInterventionForm.prestataireId) {
                providerId = newInterventionForm.prestataireId;
                const found = prestatairesOptions.find(p => p.id === providerId);
                if (found) providerName = found.nom;
            }

            // Insert en DB
            const entry: LogbookEntryInsert = {
                title: newInterventionForm.titre.trim(),
                description: newInterventionForm.description || null,
                happened_at: newInterventionForm.date || new Date().toISOString().split('T')[0],
                category: CATEGORY_FRONT_TO_DB[newInterventionForm.categorie] as LogbookEntryInsert['category'],
                entry_type: TYPE_FRONT_TO_DB[newInterventionForm.type] as LogbookEntryInsert['entry_type'],
                status: (STATUS_FRONT_TO_DB[newInterventionForm.statut] || 'planifiee') as LogbookEntryInsert['status'],
                tiers_id: providerId || null,
                provider_name_snapshot: providerName || null,
                equipment_concerned: newInterventionForm.equipementConcerne || null,
                cost: newInterventionForm.cout ? parseFloat(newInterventionForm.cout) : null,
                copro_id: '', // sera rempli par createEntry
            };

            await createEntry(entry);

            // Construire l'intervention front pour le toast
            const nouvelleIntervention: Intervention = {
                id: `temp-${Date.now()}`,
                titre: newInterventionForm.titre.trim(),
                description: newInterventionForm.description || '',
                date: newInterventionForm.date || new Date().toISOString().split('T')[0],
                categorie: newInterventionForm.categorie,
                type: newInterventionForm.type,
                statut: newInterventionForm.statut,
                intervenant: providerName,
                prestataireId: providerId,
                equipementConcerne: newInterventionForm.equipementConcerne || undefined,
                cout: newInterventionForm.cout ? parseFloat(newInterventionForm.cout) : undefined,
            };

            // Vérifier la visibilité avec les filtres actuels
            const visibleKpi = estVisibleAvecFiltreKpi(nouvelleIntervention, filtreKpiActif);
            const visibleListe = estVisibleAvecFiltresListe(nouvelleIntervention);
            const estVisible = visibleKpi && visibleListe && activeTab === 'interventions';

            let labelFiltre: string | undefined;
            if (!estVisible) {
                if (!visibleKpi && filtreKpiActif !== null) {
                    labelFiltre = LABELS_FILTRES_KPI[filtreKpiActif];
                } else if (!visibleListe) {
                    labelFiltre = 'Filtres de liste actifs';
                } else if (activeTab !== 'interventions') {
                    labelFiltre = 'Onglet actuel';
                }
            }

            setToastCreation({
                visible: true,
                type: estVisible ? 'success' : 'warning',
                titre: estVisible ? 'Intervention créée' : 'Intervention créée (non visible)',
                message: `"${nouvelleIntervention.titre}" a été enregistrée.`,
                intervention: nouvelleIntervention,
                estVisibleAvecFiltre: estVisible,
                labelFiltre,
            });

            setShowNewInterventionModal(false);
            setNewInterventionForm(getInitialInterventionForm());

            setTimeout(() => { setToastCreation(null); }, estVisible ? 5000 : 10000);

            return {
                succes: true,
                intervention: nouvelleIntervention,
                visibleAvecFiltreActuel: estVisible,
                filtreActuel: filtreKpiActif,
                labelFiltre,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur lors de la création';
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur',
                message,
                estVisibleAvecFiltre: false,
            });
            setTimeout(() => { setToastCreation(null); }, 8000);
            return { succes: false, erreur: message, visibleAvecFiltreActuel: false };
        } finally {
            setIsSubmitting(false);
        }
    }, [newInterventionForm, filtreKpiActif, activeTab, estVisibleAvecFiltreKpi, estVisibleAvecFiltresListe, createEntry, createProvider, prestatairesOptions]);

    /** Affiche l'intervention créée en réinitialisant les filtres */
    const voirInterventionCreee = useCallback(() => {
        // Réinitialiser les filtres pour voir l'intervention
        setFiltreKpiActif(null);
        setStatutFilter('TOUS');
        setCategorieFilter('TOUS');
        setEquipementFilter('TOUS');
        setAnneeFilter('TOUS');
        setActiveTab('interventions');
        setToastCreation(null);
    }, []);

    const handleEditIntervention = useCallback((intervention: Intervention) => {
        setEditingIntervention(intervention);
        setNewInterventionForm({
            titre: intervention.titre,
            description: intervention.description,
            date: intervention.date,
            categorie: intervention.categorie,
            type: intervention.type,
            statut: intervention.statut,
            intervenant: intervention.intervenant,
            prestataireId: intervention.prestataireId || '',
            nouveauPrestataire: '',
            equipementConcerne: intervention.equipementConcerne || '',
            cout: intervention.cout?.toString() || '',
        });
    }, []);

    const handleSaveIntervention = useCallback(async () => {
        if (!newInterventionForm.titre?.trim()) {
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur de validation',
                message: 'Le titre est obligatoire',
                estVisibleAvecFiltre: false,
            });
            return;
        }

        if (!editingIntervention) return;

        setIsSubmitting(true);

        try {
            // Si nouveau prestataire → créer d'abord
            let providerId: string | undefined = editingIntervention.prestataireId;
            let providerName = newInterventionForm.intervenant.trim();

            if (newInterventionForm.prestataireId === '__new__' && newInterventionForm.nouveauPrestataire?.trim()) {
                const newProvider = await createProvider({
                    name: newInterventionForm.nouveauPrestataire.trim(),
                    category: 'copropriete',
                    domains: [],
                    copro_id: '',
                } as Parameters<typeof createProvider>[0]);
                providerId = newProvider.id;
                providerName = newProvider.name;
            } else if (newInterventionForm.prestataireId && newInterventionForm.prestataireId !== '__new__') {
                providerId = newInterventionForm.prestataireId;
                const found = prestatairesOptions.find(p => p.id === providerId);
                if (found) providerName = found.nom;
            }

            await updateEntry(editingIntervention.id, {
                title: newInterventionForm.titre.trim(),
                description: newInterventionForm.description || null,
                happened_at: newInterventionForm.date,
                category: CATEGORY_FRONT_TO_DB[newInterventionForm.categorie] as LogbookEntryInsert['category'],
                entry_type: TYPE_FRONT_TO_DB[newInterventionForm.type] as LogbookEntryInsert['entry_type'],
                status: (STATUS_FRONT_TO_DB[newInterventionForm.statut] || 'planifiee') as LogbookEntryInsert['status'],
                tiers_id: providerId || null,
                provider_name_snapshot: providerName || null,
                equipment_concerned: newInterventionForm.equipementConcerne || null,
                cost: newInterventionForm.cout ? parseFloat(newInterventionForm.cout) : null,
                completed_at: newInterventionForm.statut === 'TERMINEE' ? new Date().toISOString() : null,
            });

            const titreModifie = newInterventionForm.titre.trim();

            setEditingIntervention(null);
            setNewInterventionForm(getInitialInterventionForm());

            setToastCreation({
                visible: true, type: 'success',
                titre: 'Modifications enregistrées',
                message: `"${titreModifie}" a été mis à jour avec succès.`,
                estVisibleAvecFiltre: true,
            });

            setTimeout(() => { setToastCreation(null); }, 4000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
            setToastCreation({
                visible: true, type: 'error',
                titre: 'Erreur',
                message,
                estVisibleAvecFiltre: false,
            });
            setTimeout(() => { setToastCreation(null); }, 8000);
        } finally {
            setIsSubmitting(false);
        }
    }, [editingIntervention, newInterventionForm, updateEntry, createProvider, prestatairesOptions]);

    const handleFiltreKpiChange = useCallback((filtre: FiltreKpi) => {
        // Si on clique sur le même filtre, on désactive
        if (filtre === filtreKpiActif) {
            setFiltreKpiActif(null);
            setStatutFilter('TOUS');
            setActiveTab('interventions');
            return;
        }

        setFiltreKpiActif(filtre);

        switch (filtre) {
            case 'en_cours':
                setActiveTab('interventions');
                setStatutFilter('EN_COURS');
                break;
            case 'planifiees':
                setActiveTab('interventions');
                setStatutFilter('PLANIFIEE');
                break;
            case 'urgences':
                setActiveTab('interventions');
                setStatutFilter('URGENTE');
                break;
            case 'travaux_prevus':
            case 'travaux_votes':
                setActiveTab('travaux');
                break;
            case 'cout_annee':
                setActiveTab('interventions');
                setStatutFilter('TOUS');
                break;
            default:
                setActiveTab('interventions');
                setStatutFilter('TOUS');
                break;
        }
    }, [filtreKpiActif]);

    const handleExport = useCallback((format: ExportFormat) => {
        alert(`Export ${format} en cours...`);
        setShowExportMenu(false);
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    }, []);

    const handleFilterByEquipement = useCallback(() => {
        if (selectedEquipement) {
            setEquipementFilter(selectedEquipement);
            setActiveTab('interventions');
            setSelectedEquipement(null);
        }
    }, [selectedEquipement]);

    return {
        // Données — interventions depuis Supabase
        coproprieteInfo: {
            nom: formData.nom,
            adresse: formData.adresse,
            codePostal: formData.codePostal,
            ville: formData.ville,
            anneeConstruction: formData.anneeConstruction,
            nombreBatiments: formData.nombreBatiments,
            nombreLots: formData.nombreLots,
            equipementsPrincipaux: [],
            syndic: {
                nom: formData.syndicNom,
                telephone: formData.syndicTelephone,
                email: formData.syndicEmail,
            },
        },
        contrats,
        travaux: plannedWorks,
        documents: technicalDocs,
        assurances: insurancePolicies,
        allPrestataires,
        prestatairesOptions,
        interventionAlerts,
        isLoadingEntries,
        isSubmitting,

        // États
        activeTab,
        interventionView,
        filtreKpiActif,
        searchTerm,
        categorieFilter,
        statutFilter,
        prestataireFilter,
        equipementFilter,
        anneeFilter,
        searchDocuments,
        categorieDocFilter,
        expandedCategories,
        showExportMenu,
        isEditing,
        saveError,
        isSimplifiedView,
        selectedEquipement,
        showNewInterventionModal,
        editingIntervention,
        selectedAssurance,
        selectedDocument,
        newInterventionForm,
        formData,
        toastCreation,

        // Données calculées
        filteredInterventions,
        interventionsCourantes,
        travauxImportants,
        years,
        equipements,
        statsCategorie,
        filteredDocuments,
        documentsByCategory,
        documentStats,
        kpis,

        // Setters
        setActiveTab,
        setInterventionView,
        setFiltreKpiActif,
        setSearchTerm,
        setCategorieFilter,
        setStatutFilter,
        setPrestataireFilter,
        setEquipementFilter,
        setAnneeFilter,
        setSearchDocuments,
        setCategorieDocFilter,
        setShowExportMenu,
        setIsEditing,
        setIsSimplifiedView,
        setSelectedEquipement,
        setShowNewInterventionModal,
        setEditingIntervention,
        setSelectedAssurance,
        setSelectedDocument,
        setNewInterventionForm,
        setFormData,

        // Helpers
        getContratsForEquipement,
        getInterventionsForEquipement,
        getDocumentsForEquipement,

        // Handlers
        handleSaveInfo,
        handleCreateIntervention,
        handleEditIntervention,
        handleSaveIntervention,
        handleFiltreKpiChange,
        handleExport,
        toggleCategory,
        handleFilterByEquipement,
        fermerToastCreation,
        voirInterventionCreee,
    };
}
