export type MajorityType = 'ART_24' | 'ART_25' | 'ART_25_1' | 'ART_26' | 'ART_26_1' | 'UNANIMITE' | 'INFORMATION';

// Types de variables pour les champs dynamiques
export type VariableType =
    | 'text'                    // Texte libre (court)
    | 'textarea'                // Texte long multi-lignes
    | 'coproprietaire'          // Sélection d'un copropriétaire (tous)
    | 'coproprietaire_present'  // Sélection d'un copropriétaire présent/représenté uniquement
    | 'gestionnaire'            // Sélection syndic/gestionnaire
    | 'date'                    // Date avec calendrier
    | 'montant'                 // Montant en euros
    | 'duree_mois'              // Durée en mois
    | 'duree_ans'               // Durée en années
    | 'pourcentage'             // Pourcentage
    | 'numero'                  // Numéro entier
    | 'modalites_paiement'      // Dropdown: Mensuel/Trimestriel/Semestriel/Annuel/Au choix du syndic
    | 'modalites_paiement_budget'; // Dropdown pour budget avec génération auto des échéances

// Options prédéfinies pour les modalités de paiement
export const MODALITES_PAIEMENT_OPTIONS = [
    { value: 'mensuel', label: 'Mensuel' },
    { value: 'trimestriel', label: 'Trimestriel' },
    { value: 'semestriel', label: 'Semestriel' },
    { value: 'annuel', label: 'Annuel' },
    { value: 'au_choix_syndic', label: 'Au choix du syndic' }
];

export interface VariableDefinition {
    name: string;
    type: VariableType;
    label?: string;     // Label pour l'affichage
    placeholder?: string;
    required?: boolean;
    // Pour les variables liées aux rôles de séance (président, secrétaire, scrutateur)
    // filtrer uniquement les copropriétaires présents/représentés
    filterPresents?: boolean;
}

// Types d'AG
export type TypeAG = 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';

// Scope des templates (multi-tenant)
export type TemplateScope = 'system' | 'org' | 'shared';

// Statut du template
export type TemplateStatus = 'active' | 'deprecated' | 'draft';

// Catégories disponibles
export const CATEGORIES_RESOLUTIONS = [
    'Assemblée Générale',
    'Travaux',
    'Finances',
    'Conseil syndical et syndic',
    'Contrats',
    'Action en justice',
    'Impayés',
    'Modification du règlement',
    'Compteurs',
    'Règles de bonne conduite',
    'Sécurité et conformité',
    'Énergie et environnement',
    'Parking et espaces communs',
    'Assurances',
    'Copropriétaires',
    'Divers',
] as const;

export type CategorieResolution = typeof CATEGORIES_RESOLUTIONS[number];

export interface ResolutionTemplate {
    id: string;
    titre: string;
    categorie: string;
    texte: string;
    majorite: MajorityType;
    variables?: string[];           // Liste simple pour rétrocompatibilité
    variablesTypees?: VariableDefinition[]; // Nouvelles définitions typées
    isInformation?: boolean;        // Point d'information sans vote
    // Applicabilité par type d'AG
    applicable_ag?: TypeAG[];       // Si non défini, applicable à tous les types
    obligatoire_pour?: TypeAG[];    // Types d'AG pour lesquels cette résolution est obligatoire
    ordre_suggere?: number;         // Ordre suggéré dans l'ordre du jour
    tags?: string[];                // Tags pour la recherche
    // Nouveaux champs pour multi-tenant et versioning
    scope?: TemplateScope;          // 'system' (global), 'org' (privé), 'shared' (partagé)
    status?: TemplateStatus;        // 'active', 'deprecated', 'draft'
    legalRef?: string;              // Référence juridique (ex: "Loi du 10 juillet 1965, art. 24")
    version?: string;               // Version du template (ex: "1.0", "2.1")
    ownerOrgId?: string;            // ID de l'organisation propriétaire (si scope != 'system')
    deprecatedBy?: string;          // ID du template qui remplace celui-ci
    createdAt?: string;             // Date de création ISO
    updatedAt?: string;             // Date de mise à jour ISO
    usageCount?: number;            // Compteur d'utilisation (pour tri par popularité)
    action_type?: string;           // Action automatisée déclenchée si résolution adoptée (AG Decision Engine)
}

export const MAJORITES: Record<MajorityType, { nom: string; description: string; seuil: string }> = {
    ART_24: {
        nom: 'Article 24',
        description: 'Majorité simple',
        seuil: 'Majorité des voix exprimées des copropriétaires présents, représentés ou ayant voté par correspondance'
    },
    ART_25: {
        nom: 'Article 25',
        description: 'Majorité absolue',
        seuil: 'Majorité de tous les copropriétaires (50% + 1 des tantièmes)'
    },
    ART_25_1: {
        nom: 'Article 25-1',
        description: 'Passerelle 25→24',
        seuil: 'Second vote à la majorité simple des voix exprimées (article 24)'
    },
    ART_26: {
        nom: 'Article 26',
        description: 'Double majorité renforcée',
        seuil: 'Majorité des copropriétaires représentant au moins 2/3 des voix'
    },
    ART_26_1: {
        nom: 'Article 26-1',
        description: 'Passerelle article 26',
        seuil: 'Application si le vote art. 26 a recueilli au moins la moitié des voix'
    },
    UNANIMITE: {
        nom: 'Unanimité',
        description: 'Accord de tous',
        seuil: '100% des copropriétaires'
    },
    INFORMATION: {
        nom: 'Information',
        description: 'Point d\'information',
        seuil: 'Pas de vote requis - prise d\'acte uniquement'
    }
};

export const RESOLUTIONS_BANK: ResolutionTemplate[] = [
    // ========== Assemblée Générale (10 résolutions) ==========
    {
        id: 'ag-01',
        titre: 'Élection du président de séance',
        categorie: 'Assemblée Générale',
        texte: 'M./Mme {nom_president} est élu(e) président(e) de séance de cette assemblée générale.',
        majorite: 'ART_24',
        variables: ['nom_president'],
        variablesTypees: [
            { name: 'nom_president', type: 'coproprietaire_present', label: 'Président de séance', required: true, filterPresents: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        ordre_suggere: 1,
        tags: ['organisation', 'bureau'],
        action_type: 'DESIGNATE_BUREAU'
    },
    {
        id: 'ag-02',
        titre: 'Désignation du secrétaire de séance',
        categorie: 'Assemblée Générale',
        texte: 'M./Mme {nom_secretaire} est désigné(e) comme secrétaire de séance pour la rédaction du procès-verbal.',
        majorite: 'ART_24',
        variables: ['nom_secretaire'],
        variablesTypees: [
            { name: 'nom_secretaire', type: 'coproprietaire_present', label: 'Secrétaire de séance', required: true, filterPresents: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        ordre_suggere: 2,
        tags: ['organisation', 'bureau'],
        action_type: 'DESIGNATE_BUREAU'
    },
    {
        id: 'ag-03',
        titre: 'Désignation du scrutateur',
        categorie: 'Assemblée Générale',
        texte: 'M./Mme {nom_scrutateur} est élu(e) scrutateur de cette assemblée générale.',
        majorite: 'ART_24',
        variables: ['nom_scrutateur'],
        variablesTypees: [
            { name: 'nom_scrutateur', type: 'coproprietaire_present', label: 'Scrutateur', required: true, filterPresents: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        ordre_suggere: 3,
        tags: ['organisation', 'bureau'],
        action_type: 'DESIGNATE_BUREAU'
    },
    {
        id: 'ag-04',
        titre: 'Compte rendu d\'activité du conseil syndical',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale prend connaissance du compte rendu d\'activité du conseil syndical pour l\'exercice écoulé. Le compte rendu est présenté en séance par le conseil syndical.',
        majorite: 'INFORMATION',
        isInformation: true,
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        ordre_suggere: 4,
        tags: ['conseil syndical', 'rapport']
    },
    {
        id: 'ag-05',
        titre: 'Quitus au syndic',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale donne quitus au syndic pour sa gestion au cours de l\'exercice du {date_debut} au {date_fin}.',
        majorite: 'ART_24',
        variables: ['date_debut', 'date_fin'],
        variablesTypees: [
            { name: 'date_debut', type: 'date', label: 'Date de début d\'exercice', required: true },
            { name: 'date_fin', type: 'date', label: 'Date de fin d\'exercice', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 6,
        tags: ['syndic', 'quitus', 'gestion'],
        action_type: 'GRANT_QUITUS'
    },
    {
        id: 'ag-06',
        titre: 'Approvisionnement du fonds de travaux (loi ALUR)',
        categorie: 'Assemblée Générale',
        texte: 'Conformément à l\'article 14-2 de la loi du 10 juillet 1965, l\'assemblée générale décide de provisionner le fonds de travaux à hauteur de {pourcentage}% du budget prévisionnel de l\'exercice, soit {montant} euros.',
        majorite: 'ART_24',
        variables: ['pourcentage', 'montant'],
        variablesTypees: [
            { name: 'pourcentage', type: 'pourcentage', label: 'Pourcentage du budget', required: true },
            { name: 'montant', type: 'montant', label: 'Montant du fonds (calculé)', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 10,
        tags: ['fonds travaux', 'ALUR', 'budget'],
        action_type: 'CREATE_ALUR_FUND'
    },
    {
        id: 'ag-07',
        titre: 'Calendrier de financement du budget prévisionnel',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale approuve le calendrier de financement du budget prévisionnel selon les modalités suivantes : {modalites_paiement_budget}. Les appels de fonds seront exigibles aux dates suivantes : {dates_echeances_budget}.',
        majorite: 'ART_24',
        variables: ['modalites_paiement_budget', 'dates_echeances_budget'],
        variablesTypees: [
            { name: 'modalites_paiement_budget', type: 'modalites_paiement_budget', label: 'Modalités de paiement', required: true },
            { name: 'dates_echeances_budget', type: 'text', label: 'Dates d\'échéances', placeholder: 'Générées automatiquement selon la modalité choisie', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 9,
        tags: ['budget', 'appels de fonds', 'échéancier'],
        action_type: 'SCHEDULE_BUDGET_PAYMENTS'
    },
    {
        id: 'ag-08',
        titre: 'Seuil de consultation du conseil syndical',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale fixe à {montant} euros le seuil au-delà duquel le syndic devra consulter le conseil syndical avant d\'engager toute dépense non prévue au budget.',
        majorite: 'ART_24',
        variables: ['montant'],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 13,
        tags: ['conseil syndical', 'seuil', 'dépenses']
    },
    {
        id: 'ag-09',
        titre: 'Seuil de mise en concurrence',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale fixe à {montant} euros le seuil au-delà duquel le syndic devra obligatoirement mettre en concurrence au moins trois entreprises avant de passer une commande.',
        majorite: 'ART_24',
        variables: ['montant'],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 14,
        tags: ['mise en concurrence', 'seuil', 'marchés']
    },
    {
        id: 'ag-10',
        titre: 'Calendrier de financement du fonds de travaux',
        categorie: 'Assemblée Générale',
        texte: 'L\'assemblée générale approuve le calendrier de financement du fonds de travaux selon les modalités suivantes : {modalites_paiement_fonds}. Les versements au fonds de travaux seront exigibles aux dates suivantes : {dates_echeances_fonds}.',
        majorite: 'ART_24',
        variables: ['modalites_paiement_fonds', 'dates_echeances_fonds'],
        variablesTypees: [
            { name: 'modalites_paiement_fonds', type: 'modalites_paiement_budget', label: 'Modalités de paiement', required: true },
            { name: 'dates_echeances_fonds', type: 'text', label: 'Dates d\'échéances', placeholder: 'Générées automatiquement selon la modalité choisie', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 11,
        tags: ['fonds travaux', 'appels de fonds', 'échéancier'],
        action_type: 'SCHEDULE_ALUR_PAYMENTS'
    },

    // ========== Travaux (7 résolutions) ==========
    {
        id: 'travaux-01',
        titre: 'Vote de travaux',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser les travaux suivants : {description}. Le montant des travaux est estimé à {montant} euros. Le syndic est autorisé à lancer une consultation auprès d\'au moins trois entreprises.',
        majorite: 'ART_25',
        variables: ['description', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['travaux', 'devis', 'consultation'],
        action_type: 'CREATE_WORK_BUDGET'
    },
    {
        id: 'travaux-02',
        titre: 'Vote de travaux et honoraires',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser les travaux suivants : {description} pour un montant estimé à {montant} euros, et d\'engager des honoraires de maîtrise d\'œuvre pour un montant de {montant_honoraires} euros.',
        majorite: 'ART_25',
        variables: ['description', 'montant', 'montant_honoraires'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['travaux', 'maîtrise d\'œuvre', 'honoraires']
    },
    {
        id: 'travaux-03',
        titre: 'Études et diagnostic',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale autorise le syndic à faire réaliser une étude/diagnostic concernant {objet} pour un montant maximum de {montant} euros.',
        majorite: 'ART_24',
        variables: ['objet', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['études', 'diagnostic', 'audit']
    },
    {
        id: 'travaux-04',
        titre: 'Réalisation d\'une étude de faisabilité pour l\'installation de bornes de recharge pour véhicules électriques',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale autorise le syndic à faire réaliser une étude de faisabilité technique et financière pour l\'installation de bornes de recharge pour véhicules électriques dans la copropriété, pour un montant maximum de {montant} euros.',
        majorite: 'ART_24',
        variables: ['montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['IRVE', 'borne de recharge', 'véhicule électrique', 'étude']
    },
    {
        id: 'travaux-05',
        titre: 'Travaux d\'urgence',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale autorise le syndic à réaliser en urgence les travaux suivants : {description}, sans limitation de montant si la sécurité l\'exige.',
        majorite: 'ART_24',
        variables: ['description'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['urgence', 'sécurité', 'sinistre']
    },
    {
        id: 'travaux-06',
        titre: 'Travaux d\'amélioration énergétique',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser des travaux d\'amélioration énergétique : {description}, pour un montant de {montant} euros, permettant une économie d\'énergie estimée à {pourcentage}%.',
        majorite: 'ART_25',
        variables: ['description', 'montant', 'pourcentage'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['rénovation énergétique', 'isolation', 'DPE', 'économie d\'énergie']
    },
    {
        id: 'travaux-07',
        titre: 'Travaux de mise en conformité',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser les travaux de mise en conformité suivants : {description}, imposés par {autorite}, pour un montant de {montant} euros.',
        majorite: 'ART_25',
        variables: ['description', 'autorite', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['mise en conformité', 'réglementation', 'normes']
    },
    // --- Résolutions supplémentaires pour AGE (gros travaux) ---
    {
        id: 'travaux-08',
        titre: 'Ravalement de façades',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser le ravalement des façades de l\'immeuble selon le devis de l\'entreprise {entreprise} d\'un montant de {montant} euros TTC. Les travaux débuteront le {date_debut} pour une durée prévisionnelle de {duree} mois.',
        majorite: 'ART_25',
        variables: ['entreprise', 'montant', 'date_debut', 'duree'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['ravalement', 'façade', 'gros travaux']
    },
    {
        id: 'travaux-09',
        titre: 'Réfection de la toiture',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de réaliser la réfection de la toiture selon le devis de l\'entreprise {entreprise} d\'un montant de {montant} euros TTC. Nature des travaux : {description}.',
        majorite: 'ART_25',
        variables: ['entreprise', 'montant', 'description'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['toiture', 'couverture', 'gros travaux', 'étanchéité']
    },
    {
        id: 'travaux-10',
        titre: 'Modernisation ou remplacement de l\'ascenseur',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale décide de procéder à {type_travaux} de l\'ascenseur selon le devis de l\'entreprise {entreprise} d\'un montant de {montant} euros TTC. Cette décision fait suite au rapport de contrôle technique.',
        majorite: 'ART_25',
        variables: ['type_travaux', 'entreprise', 'montant'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['ascenseur', 'mise aux normes', 'gros travaux']
    },
    {
        id: 'travaux-11',
        titre: 'Plan pluriannuel de travaux (PPT)',
        categorie: 'Travaux',
        texte: 'L\'assemblée générale adopte le plan pluriannuel de travaux présenté par {auteur} pour la période {periode}. Ce plan prévoit un montant total de travaux de {montant_total} euros, avec une provision annuelle de {provision_annuelle} euros.',
        majorite: 'ART_24',
        variables: ['auteur', 'periode', 'montant_total', 'provision_annuelle'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['PPT', 'planification', 'entretien', 'loi Climat']
    },

    // ========== Finances (9 résolutions) ==========
    {
        id: 'fin-01',
        titre: 'Appel de fonds exceptionnel',
        categorie: 'Finances',
        texte: 'L\'assemblée générale décide de lancer un appel de fonds exceptionnel d\'un montant de {montant} euros pour financer {objet}. Cet appel sera réparti selon les tantièmes et exigible le {date}.',
        majorite: 'ART_25',
        variables: ['montant', 'objet', 'date'],
        variablesTypees: [
            { name: 'montant', type: 'montant', label: 'Montant de l\'appel', required: true },
            { name: 'objet', type: 'text', label: 'Objet de l\'appel', required: true },
            { name: 'date', type: 'date', label: 'Date d\'exigibilité', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['appel de fonds', 'financement', 'travaux'],
        action_type: 'CREATE_EXCEPTIONAL_CALL'
    },
    {
        id: 'fin-02',
        titre: 'Instauration d\'une avance de trésorerie prévue par le règlement de copropriété',
        categorie: 'Finances',
        texte: 'L\'assemblée générale décide d\'instaurer une avance de trésorerie, conformément à l\'article {article} du règlement de copropriété, d\'un montant de {montant} euros.',
        majorite: 'ART_24',
        variables: ['article', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['trésorerie', 'avance', 'règlement']
    },
    {
        id: 'fin-03',
        titre: 'Instauration d\'une avance de trésorerie non prévue par le règlement de copropriété',
        categorie: 'Finances',
        texte: 'L\'assemblée générale décide d\'instaurer une avance de trésorerie, bien que non prévue par le règlement de copropriété, d\'un montant de {montant} euros pour {objet}.',
        majorite: 'ART_25',
        variables: ['montant', 'objet'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['trésorerie', 'avance']
    },
    {
        id: 'fin-04',
        titre: 'Ajustement de l\'avance de trésorerie',
        categorie: 'Finances',
        texte: 'L\'assemblée générale décide d\'ajuster le montant de l\'avance de trésorerie, qui passe de {montant_ancien} euros à {montant_nouveau} euros.',
        majorite: 'ART_24',
        variables: ['montant_ancien', 'montant_nouveau'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['trésorerie', 'avance', 'ajustement']
    },
    {
        id: 'fin-05',
        titre: 'Approbation des comptes',
        categorie: 'Finances',
        texte: 'L\'assemblée générale approuve les comptes de l\'exercice du {date_debut} au {date_fin}, faisant apparaître un résultat de {montant} euros.',
        majorite: 'ART_24',
        variables: ['date_debut', 'date_fin', 'montant'],
        variablesTypees: [
            { name: 'date_debut', type: 'date', label: 'Date de début d\'exercice', required: true },
            { name: 'date_fin', type: 'date', label: 'Date de fin d\'exercice', required: true },
            { name: 'montant', type: 'montant', label: 'Résultat de l\'exercice', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 5,
        tags: ['comptes', 'approbation', 'exercice'],
        action_type: 'APPROVE_ACCOUNTS'
    },
    {
        id: 'fin-06',
        titre: 'Approbation du budget prévisionnel',
        categorie: 'Finances',
        texte: 'L\'assemblée générale approuve le budget prévisionnel pour l\'exercice du {date_debut} au {date_fin}, arrêté à la somme de {montant} euros.',
        majorite: 'ART_24',
        variables: ['date_debut', 'date_fin', 'montant'],
        variablesTypees: [
            { name: 'date_debut', type: 'date', label: 'Date de début d\'exercice', required: true },
            { name: 'date_fin', type: 'date', label: 'Date de fin d\'exercice', required: true },
            { name: 'montant', type: 'montant', label: 'Montant total du budget', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 8,
        tags: ['budget', 'prévisionnel', 'exercice'],
        action_type: 'CREATE_BUDGET'
    },
    {
        id: 'fin-07',
        titre: 'Autorisation d\'ouvrir un compte bancaire séparé (syndic non professionnel)',
        categorie: 'Finances',
        texte: 'L\'assemblée générale autorise le syndic non professionnel à ouvrir un compte bancaire séparé au nom du syndicat des copropriétaires auprès de {banque}.',
        majorite: 'ART_24',
        variables: ['banque'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['compte bancaire', 'syndic bénévole']
    },
    {
        id: 'fin-08',
        titre: 'Changement du représentant légal auprès des services bancaires',
        categorie: 'Finances',
        texte: 'L\'assemblée générale décide de modifier le représentant légal du syndicat des copropriétaires auprès des services bancaires. M./Mme {nom} est désigné(e) en remplacement de M./Mme {nom_ancien}.',
        majorite: 'ART_24',
        variables: ['nom', 'nom_ancien'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['banque', 'représentant légal']
    },
    {
        id: 'fin-09',
        titre: 'Souscription d\'un emprunt collectif',
        categorie: 'Finances',
        texte: 'L\'assemblée générale autorise la souscription d\'un emprunt collectif d\'un montant de {montant} euros sur une durée de {duree} ans, au taux maximal de {taux}%, destiné au financement de {objet}.',
        majorite: 'ART_25',
        variables: ['montant', 'duree', 'taux', 'objet'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['emprunt', 'financement', 'prêt collectif']
    },
    {
        id: 'fin-10',
        titre: 'Situation de trésorerie et quitus au syndic',
        categorie: 'Finances',
        texte: 'L\'assemblée générale prend acte de la situation de trésorerie au {date}, présentant un solde de {solde} euros. L\'assemblée générale donne quitus au syndic {nom_syndic} pour sa gestion de l\'exercice écoulé.',
        majorite: 'ART_24',
        variables: ['date', 'solde', 'nom_syndic'],
        variablesTypees: [
            { name: 'date', type: 'date', label: 'Date de la situation', required: true },
            { name: 'solde', type: 'montant', label: 'Solde de trésorerie', required: true },
            { name: 'nom_syndic', type: 'gestionnaire', label: 'Nom du syndic', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        ordre_suggere: 6,
        tags: ['trésorerie', 'quitus', 'syndic', 'gestion']
    },

    // ========== Conseil syndical et syndic (11 résolutions) ==========
    {
        id: 'cs-01',
        titre: 'Désignation des membres suppléants du conseil syndical',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale élit les copropriétaires suivants en qualité de membres suppléants du conseil syndical : {noms}.',
        majorite: 'ART_24',
        variables: ['noms'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['conseil syndical', 'élection', 'suppléants']
    },
    {
        id: 'cs-02',
        titre: 'Élection des membres titulaires du conseil syndical',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale élit les copropriétaires suivants en qualité de membres titulaires du conseil syndical : {noms}. Leurs mandats prendront effet à compter de la clôture de la présente assemblée.',
        majorite: 'ART_24',
        variables: ['noms'],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 12,
        tags: ['conseil syndical', 'élection', 'titulaires'],
        action_type: 'ELECT_COUNCIL'
    },
    {
        id: 'cs-03',
        titre: 'Révocation d\'un membre du conseil syndical',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale décide de révoquer M./Mme {nom} de ses fonctions de membre du conseil syndical pour le motif suivant : {motif}.',
        majorite: 'ART_24',
        variables: ['nom', 'motif'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['conseil syndical', 'révocation']
    },
    {
        id: 'cs-04',
        titre: 'Nomination du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale nomme {nom_syndic} en qualité de syndic de la copropriété pour une durée de {duree_mandat_mois}, à compter du {date_debut}. Les honoraires sont fixés à {honoraires_annuels_ttc} TTC par an.',
        majorite: 'ART_24',
        variables: ['nom_syndic', 'duree_mandat_mois', 'date_debut', 'honoraires_annuels_ttc'],
        variablesTypees: [
            { name: 'nom_syndic', type: 'gestionnaire', label: 'Nom du syndic', required: true },
            { name: 'duree_mandat_mois', type: 'duree_mois', label: 'Durée du mandat (3 à 36 mois)', placeholder: 'Ex: 12', required: true },
            { name: 'date_debut', type: 'date', label: 'Date de début du mandat', required: true },
            { name: 'honoraires_annuels_ttc', type: 'montant', label: 'Honoraires annuels TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['syndic', 'nomination', 'contrat'],
        action_type: 'APPOINT_SYNDIC'
    },
    {
        id: 'cs-05',
        titre: 'Renouvellement du mandat du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale renouvelle le mandat du syndic {nom_syndic} pour une durée de {duree_mandat_mois}. Les honoraires sont fixés à {honoraires_annuels_ttc} TTC par an.',
        majorite: 'ART_24',
        variables: ['nom_syndic', 'duree_mandat_mois', 'honoraires_annuels_ttc'],
        variablesTypees: [
            { name: 'nom_syndic', type: 'gestionnaire', label: 'Nom du syndic', required: true },
            { name: 'duree_mandat_mois', type: 'duree_mois', label: 'Durée du mandat (3 à 36 mois)', placeholder: 'Ex: 12', required: true },
            { name: 'honoraires_annuels_ttc', type: 'montant', label: 'Honoraires annuels TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        obligatoire_pour: ['ORDINAIRE'],
        ordre_suggere: 7,
        tags: ['syndic', 'renouvellement', 'contrat'],
        action_type: 'APPOINT_SYNDIC'
    },
    {
        id: 'cs-06',
        titre: 'Révocation du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale décide de révoquer {nom_syndic} de ses fonctions de syndic pour le motif suivant : {motif}. La révocation prendra effet le {date}.',
        majorite: 'ART_24',
        variables: ['nom_syndic', 'motif', 'date'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['syndic', 'révocation']
    },
    {
        id: 'cs-07',
        titre: 'Augmentation des honoraires du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale accepte l\'augmentation des honoraires du syndic, qui passent de {montant_ancien_ttc} TTC à {montant_nouveau_ttc} TTC par an.',
        majorite: 'ART_24',
        variables: ['montant_ancien_ttc', 'montant_nouveau_ttc'],
        variablesTypees: [
            { name: 'montant_ancien_ttc', type: 'montant', label: 'Ancien montant TTC', required: true },
            { name: 'montant_nouveau_ttc', type: 'montant', label: 'Nouveau montant TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['syndic', 'honoraires', 'augmentation']
    },
    {
        id: 'cs-08',
        titre: 'Mandat au conseil syndical',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale donne mandat au conseil syndical pour {objet}, dans la limite d\'un montant de {montant} euros.',
        majorite: 'ART_24',
        variables: ['objet', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['conseil syndical', 'mandat', 'délégation']
    },
    {
        id: 'cs-09',
        titre: 'Rémunération exceptionnelle du conseil syndical',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale décide d\'allouer une rémunération exceptionnelle de {montant} euros au conseil syndical pour {motif}.',
        majorite: 'ART_24',
        variables: ['montant', 'motif'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['conseil syndical', 'rémunération']
    },
    {
        id: 'cs-10',
        titre: 'Honoraires forfaitaires du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale fixe les honoraires forfaitaires du syndic pour l\'année {annee} à {montant_ttc} TTC, répartis selon les tantièmes.',
        majorite: 'ART_24',
        variables: ['annee', 'montant_ttc'],
        variablesTypees: [
            { name: 'annee', type: 'text', label: 'Année', placeholder: 'Ex: 2026', required: true },
            { name: 'montant_ttc', type: 'montant', label: 'Montant TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['syndic', 'honoraires']
    },
    {
        id: 'cs-11',
        titre: 'Honoraires complémentaires du syndic',
        categorie: 'Conseil syndical et syndic',
        texte: 'L\'assemblée générale accepte de verser au syndic des honoraires complémentaires d\'un montant de {montant_ttc} TTC pour {prestation}.',
        majorite: 'ART_24',
        variables: ['montant_ttc', 'prestation'],
        variablesTypees: [
            { name: 'montant_ttc', type: 'montant', label: 'Montant TTC', required: true },
            { name: 'prestation', type: 'text', label: 'Prestation concernée', placeholder: 'Ex: suivi des travaux de ravalement', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['syndic', 'honoraires', 'complémentaires']
    },

    // ========== Contrats (9 résolutions) ==========
    {
        id: 'contrat-01',
        titre: 'Souscription d\'un contrat',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale autorise le syndic à souscrire un contrat de {type} auprès de {prestataire} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['type', 'prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['contrat', 'souscription', 'prestataire'],
        action_type: 'MANAGE_CONTRACT'
    },
    {
        id: 'contrat-02',
        titre: 'Renouvellement d\'un contrat',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale approuve le renouvellement du contrat de {type} avec {prestataire} pour une durée de {duree} an(s), au tarif de {montant} euros par an.',
        majorite: 'ART_24',
        variables: ['type', 'prestataire', 'duree', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['contrat', 'renouvellement', 'prestataire'],
        action_type: 'MANAGE_CONTRACT'
    },
    {
        id: 'contrat-03',
        titre: 'Résiliation d\'un contrat',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale décide de résilier le contrat de {type} avec {prestataire}, avec effet au {date}.',
        majorite: 'ART_24',
        variables: ['type', 'prestataire', 'date'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['contrat', 'résiliation', 'prestataire'],
        action_type: 'MANAGE_CONTRACT'
    },
    {
        id: 'contrat-04',
        titre: 'Contrat d\'assurance multirisque',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale approuve la souscription/le renouvellement du contrat d\'assurance multirisque de l\'immeuble auprès de {compagnie} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['compagnie', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['assurance', 'multirisque', 'contrat']
    },
    {
        id: 'contrat-05',
        titre: 'Contrat d\'entretien ascenseur',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale autorise le syndic à signer un contrat d\'entretien des ascenseurs avec {prestataire} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['ascenseur', 'entretien', 'contrat']
    },
    {
        id: 'contrat-06',
        titre: 'Contrat d\'entretien chaudière',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale approuve le contrat d\'entretien de la chaudière avec {prestataire} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['chaudière', 'chauffage', 'entretien', 'contrat']
    },
    {
        id: 'contrat-07',
        titre: 'Contrat de nettoyage',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale autorise le syndic à signer un contrat de nettoyage des parties communes avec {prestataire} pour un montant de {montant} euros par {periodicite}.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant', 'periodicite'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['nettoyage', 'entretien', 'contrat']
    },
    {
        id: 'contrat-08',
        titre: 'Contrat d\'espaces verts',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale approuve le contrat d\'entretien des espaces verts avec {prestataire} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['espaces verts', 'jardinage', 'entretien', 'contrat']
    },
    {
        id: 'contrat-09',
        titre: 'Contrat de télésurveillance',
        categorie: 'Contrats',
        texte: 'L\'assemblée générale autorise la souscription d\'un contrat de télésurveillance auprès de {prestataire} pour un montant mensuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['sécurité', 'télésurveillance', 'contrat']
    },

    // ========== Action en justice (2 résolutions) ==========
    {
        id: 'justice-01',
        titre: 'Engagement d\'une action en justice',
        categorie: 'Action en justice',
        texte: 'L\'assemblée générale autorise le syndic à engager une action en justice contre {partie} concernant {objet}, et à mandater Maître {avocat} pour défendre les intérêts du syndicat.',
        majorite: 'ART_25',
        variables: ['partie', 'objet', 'avocat'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['justice', 'contentieux', 'avocat', 'procédure']
    },
    {
        id: 'justice-02',
        titre: 'Désistement d\'une action en justice',
        categorie: 'Action en justice',
        texte: 'L\'assemblée générale autorise le syndic à se désister de l\'action en justice engagée contre {partie} concernant {objet}.',
        majorite: 'ART_25',
        variables: ['partie', 'objet'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['justice', 'désistement', 'contentieux']
    },

    // ========== Impayés (3 résolutions) ==========
    {
        id: 'imp-01',
        titre: 'Mise en demeure pour impayés',
        categorie: 'Impayés',
        texte: 'L\'assemblée générale autorise le syndic à adresser une mise en demeure à M./Mme {nom} concernant des impayés d\'un montant de {montant} euros.',
        majorite: 'ART_24',
        variables: ['nom', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['impayés', 'mise en demeure', 'recouvrement']
    },
    {
        id: 'imp-02',
        titre: 'Engagement d\'une procédure contentieuse pour impayés',
        categorie: 'Impayés',
        texte: 'L\'assemblée générale autorise le syndic à engager une procédure contentieuse contre M./Mme {nom} pour des impayés d\'un montant de {montant} euros.',
        majorite: 'ART_25',
        variables: ['nom', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['impayés', 'contentieux', 'recouvrement', 'procédure']
    },
    {
        id: 'imp-03',
        titre: 'Remise gracieuse de pénalités de retard',
        categorie: 'Impayés',
        texte: 'L\'assemblée générale décide d\'accorder une remise gracieuse des pénalités de retard à M./Mme {nom} pour un montant de {montant} euros, suite à {motif}.',
        majorite: 'ART_24',
        variables: ['nom', 'montant', 'motif'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['impayés', 'remise', 'pénalités']
    },

    // ========== Modification du règlement de copropriété et des lots (5 résolutions) ==========
    {
        id: 'reglement-01',
        titre: 'Modification du règlement de copropriété',
        categorie: 'Modification du règlement de copropriété et des lots',
        texte: 'L\'assemblée générale décide de modifier le règlement de copropriété comme suit : {description}.',
        majorite: 'ART_26',
        variables: ['description'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['règlement', 'modification', 'copropriété']
    },
    {
        id: 'reglement-02',
        titre: 'Modification de la destination de l\'immeuble',
        categorie: 'Modification du règlement de copropriété et des lots',
        texte: 'L\'assemblée générale décide de modifier la destination de l\'immeuble pour permettre {description}.',
        majorite: 'UNANIMITE',
        variables: ['description'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['règlement', 'destination', 'unanimité']
    },
    {
        id: 'reglement-03',
        titre: 'Changement d\'affectation d\'un lot',
        categorie: 'Modification du règlement de copropriété et des lots',
        texte: 'L\'assemblée générale autorise M./Mme {nom} à changer l\'affectation du lot n°{numero} de {affectation_ancienne} à {affectation_nouvelle}.',
        majorite: 'ART_26',
        variables: ['nom', 'numero', 'affectation_ancienne', 'affectation_nouvelle'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['lot', 'affectation', 'changement']
    },
    {
        id: 'reglement-04',
        titre: 'Répartition des charges',
        categorie: 'Modification du règlement de copropriété et des lots',
        texte: 'L\'assemblée générale décide de modifier la répartition des charges comme suit : {description}.',
        majorite: 'UNANIMITE',
        variables: ['description'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['charges', 'répartition', 'unanimité']
    },
    {
        id: 'reglement-05',
        titre: 'Modification de la répartition des tantièmes',
        categorie: 'Modification du règlement de copropriété et des lots',
        texte: 'L\'assemblée générale décide de modifier la répartition des tantièmes suite à {motif}. Nouvelle répartition : {repartition}.',
        majorite: 'UNANIMITE',
        variables: ['motif', 'repartition'],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['tantièmes', 'répartition', 'unanimité']
    },

    // ========== Compteurs (6 résolutions) ==========
    {
        id: 'compteur-01',
        titre: 'Achat de compteurs divisionnaires (eau froide et/ou eau chaude)',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale décide d\'installer des compteurs divisionnaires {type} dans la copropriété. Le montant des travaux est estimé à {montant} euros.',
        majorite: 'ART_25',
        variables: ['type', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['compteurs', 'eau', 'installation']
    },
    {
        id: 'compteur-02',
        titre: 'Signature d\'un contrat de location-entretien-relève des compteurs divisionnaires',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale autorise le syndic à signer un contrat de location-entretien-relève des compteurs divisionnaires avec {prestataire} pour un montant annuel de {montant} euros.',
        majorite: 'ART_24',
        variables: ['prestataire', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['compteurs', 'contrat', 'relève']
    },
    {
        id: 'compteur-03',
        titre: 'Recours en cas de refus d\'installation des compteurs divisionnaires',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale autorise le syndic à engager un recours contre M./Mme {nom} pour refus d\'installation, de maintenance ou de relève des compteurs divisionnaires.',
        majorite: 'ART_25',
        variables: ['nom'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['compteurs', 'recours', 'refus']
    },
    {
        id: 'compteur-04',
        titre: 'Application d\'un forfait de consommation pour compteurs non relevés',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale décide d\'appliquer un forfait de consommation {type} de {montant} euros pour les lots dont les compteurs n\'ont pas pu être relevés.',
        majorite: 'ART_24',
        variables: ['type', 'montant'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['compteurs', 'forfait', 'consommation']
    },
    {
        id: 'compteur-05',
        titre: 'Remplacement des compteurs divisionnaires',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale décide de remplacer les compteurs divisionnaires {type} obsolètes pour un montant de {montant} euros.',
        majorite: 'ART_25',
        variables: ['type', 'montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['compteurs', 'remplacement']
    },
    {
        id: 'compteur-06',
        titre: 'Individualisation des frais de chauffage',
        categorie: 'Compteurs',
        texte: 'L\'assemblée générale décide de procéder à l\'individualisation des frais de chauffage par l\'installation de compteurs, pour un montant estimé à {montant} euros.',
        majorite: 'ART_25',
        variables: ['montant'],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['chauffage', 'individualisation', 'compteurs']
    },

    // ========== Règles de bonne conduite (3 résolutions) ==========
    {
        id: 'conduite-01',
        titre: 'Adoption d\'un règlement intérieur',
        categorie: 'Règles de bonne conduite',
        texte: 'L\'assemblée générale adopte le règlement intérieur de la copropriété tel que présenté, qui précise notamment les règles concernant {points_importants}.',
        majorite: 'ART_24',
        variables: ['points_importants'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['règlement intérieur', 'règles', 'vie commune']
    },
    {
        id: 'conduite-02',
        titre: 'Interdiction de certains comportements',
        categorie: 'Règles de bonne conduite',
        texte: 'L\'assemblée générale décide d\'interdire formellement {comportement} dans les parties communes de l\'immeuble.',
        majorite: 'ART_24',
        variables: ['comportement'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['interdiction', 'comportement', 'parties communes']
    },
    {
        id: 'conduite-03',
        titre: 'Mise en place d\'horaires pour travaux',
        categorie: 'Règles de bonne conduite',
        texte: 'L\'assemblée générale décide de fixer les horaires autorisés pour les travaux bruyants : {horaires}.',
        majorite: 'ART_24',
        variables: ['horaires'],
        applicable_ag: ['ORDINAIRE'],
        tags: ['travaux', 'horaires', 'bruit']
    },

    // ========== Sécurité et conformité (8 résolutions) ==========
    {
        id: 'securite-01',
        titre: 'Mise aux normes des installations électriques',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide de faire réaliser la mise aux normes des installations électriques des parties communes, conformément au diagnostic électrique établi par {nom_diagnostiqueur} le {date_diagnostic}. Le montant des travaux est estimé à {montant_travaux} TTC. Les travaux seront confiés à l\'entreprise {nom_entreprise}.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_diagnostiqueur', type: 'text', label: 'Nom du diagnostiqueur', required: true },
            { name: 'date_diagnostic', type: 'date', label: 'Date du diagnostic', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true },
            { name: 'nom_entreprise', type: 'text', label: 'Nom de l\'entreprise', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['électricité', 'normes', 'sécurité', 'diagnostic'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-02',
        titre: 'Installation d\'un système de vidéosurveillance',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide d\'installer un système de vidéosurveillance dans les parties communes de l\'immeuble. Le système comprendra {nombre_cameras} caméras placées aux emplacements suivants : {emplacements}. Le coût d\'installation est de {montant_installation} TTC et le coût de maintenance annuel de {montant_maintenance} TTC. La déclaration à la CNIL sera effectuée par le syndic.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'nombre_cameras', type: 'numero', label: 'Nombre de caméras', required: true },
            { name: 'emplacements', type: 'textarea', label: 'Emplacements des caméras', required: true },
            { name: 'montant_installation', type: 'montant', label: 'Coût d\'installation TTC', required: true },
            { name: 'montant_maintenance', type: 'montant', label: 'Coût maintenance annuel TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['vidéosurveillance', 'sécurité', 'caméras', 'CNIL'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-03',
        titre: 'Mise en conformité des garde-corps et balcons',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide de procéder à la mise en conformité des garde-corps et balcons selon les normes NF P01-012 et NF P01-013. Le montant des travaux est estimé à {montant_travaux} TTC. Les travaux concernent {description_travaux}.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true },
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['garde-corps', 'balcons', 'normes', 'sécurité'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-04',
        titre: 'Installation de détecteurs de fumée',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide d\'installer des détecteurs avertisseurs autonomes de fumée (DAAF) dans les parties communes de l\'immeuble. Le nombre d\'équipements est de {nombre_detecteurs}. Le coût total est de {montant_total} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nombre_detecteurs', type: 'numero', label: 'Nombre de détecteurs', required: true },
            { name: 'montant_total', type: 'montant', label: 'Coût total TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['incendie', 'détecteurs', 'fumée', 'sécurité'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-05',
        titre: 'Mise aux normes accessibilité PMR',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide de réaliser des travaux de mise en accessibilité pour les personnes à mobilité réduite (PMR). Les travaux comprennent : {description_travaux}. Le montant total est estimé à {montant_travaux} TTC.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['accessibilité', 'PMR', 'handicap', 'normes'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-06',
        titre: 'Contrôle et entretien des extincteurs',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale approuve le contrat de maintenance des extincteurs avec la société {nom_societe} pour un montant annuel de {montant_annuel} TTC. Le contrat prévoit {nombre_visites} visites de contrôle par an.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_societe', type: 'text', label: 'Nom de la société', required: true },
            { name: 'montant_annuel', type: 'montant', label: 'Montant annuel TTC', required: true },
            { name: 'nombre_visites', type: 'numero', label: 'Nombre de visites/an', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['extincteurs', 'incendie', 'sécurité', 'maintenance'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-07',
        titre: 'Diagnostic amiante des parties communes',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide de faire réaliser un diagnostic amiante des parties communes par un organisme certifié. Le coût du diagnostic est de {montant_diagnostic} TTC. En cas de présence d\'amiante, le syndic convoquera une assemblée générale extraordinaire pour décider des travaux nécessaires.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'montant_diagnostic', type: 'montant', label: 'Coût du diagnostic TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['amiante', 'diagnostic', 'sécurité', 'santé'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'securite-08',
        titre: 'Installation d\'un système de contrôle d\'accès',
        categorie: 'Sécurité et conformité',
        texte: 'L\'assemblée générale décide d\'installer un système de contrôle d\'accès par {type_systeme} pour les entrées de l\'immeuble. Chaque copropriétaire recevra {nombre_badges} badge(s)/clé(s). Le coût d\'installation est de {montant_installation} TTC et les badges/clés supplémentaires seront facturés {prix_badge} TTC l\'unité.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'type_systeme', type: 'text', label: 'Type de système (badge, digicode, etc.)', required: true },
            { name: 'nombre_badges', type: 'numero', label: 'Nombre de badges par lot', required: true },
            { name: 'montant_installation', type: 'montant', label: 'Coût d\'installation TTC', required: true },
            { name: 'prix_badge', type: 'montant', label: 'Prix badge supplémentaire TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['contrôle d\'accès', 'badge', 'digicode', 'sécurité'],
        scope: 'system',
        status: 'active'
    },

    // ========== Énergie et environnement (8 résolutions) ==========
    {
        id: 'energie-01',
        titre: 'Réalisation d\'un audit énergétique',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide de faire réaliser un audit énergétique de l\'immeuble par {nom_bureau_etudes}. Le coût de l\'audit est de {montant_audit} TTC. Les résultats seront présentés lors d\'une prochaine assemblée générale avec les préconisations de travaux.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_bureau_etudes', type: 'text', label: 'Bureau d\'études', required: true },
            { name: 'montant_audit', type: 'montant', label: 'Coût de l\'audit TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['audit énergétique', 'DPE', 'énergie', 'environnement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-02',
        titre: 'Installation de panneaux solaires',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide d\'installer des panneaux solaires photovoltaïques sur la toiture de l\'immeuble. La puissance installée sera de {puissance_kwc} kWc. Le montant des travaux est de {montant_travaux} TTC. La production sera {utilisation} (autoconsommation collective / revente EDF). Les économies annuelles estimées sont de {economies_annuelles}.',
        majorite: 'ART_26',
        variablesTypees: [
            { name: 'puissance_kwc', type: 'numero', label: 'Puissance en kWc', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true },
            { name: 'utilisation', type: 'text', label: 'Mode d\'utilisation', required: true },
            { name: 'economies_annuelles', type: 'montant', label: 'Économies annuelles estimées', required: true }
        ],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['solaire', 'photovoltaïque', 'énergie renouvelable', 'environnement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-03',
        titre: 'Remplacement de la chaudière collective',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide de remplacer la chaudière collective par une chaudière {type_chaudiere} de marque {marque_modele}. Le montant des travaux est de {montant_travaux} TTC. Les économies d\'énergie attendues sont de {pourcentage_economie}% par an.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'type_chaudiere', type: 'text', label: 'Type de chaudière', required: true },
            { name: 'marque_modele', type: 'text', label: 'Marque et modèle', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true },
            { name: 'pourcentage_economie', type: 'pourcentage', label: 'Économies attendues (%)', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['chaudière', 'chauffage', 'énergie', 'économies'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-04',
        titre: 'Isolation thermique par l\'extérieur (ITE)',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide de réaliser l\'isolation thermique par l\'extérieur (ITE) des façades de l\'immeuble. Les travaux comprennent : {description_travaux}. Le montant total est de {montant_travaux} TTC. Les aides disponibles (MaPrimeRénov\', CEE) sont estimées à {montant_aides}.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant total TTC', required: true },
            { name: 'montant_aides', type: 'montant', label: 'Montant des aides estimées', required: false }
        ],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['isolation', 'ITE', 'façade', 'énergie', 'rénovation'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-05',
        titre: 'Remplacement des fenêtres des parties communes',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide de remplacer les fenêtres des parties communes par des fenêtres {type_vitrage}. Le nombre de fenêtres concernées est de {nombre_fenetres}. Le montant total est de {montant_travaux} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'type_vitrage', type: 'text', label: 'Type de vitrage (double, triple)', required: true },
            { name: 'nombre_fenetres', type: 'numero', label: 'Nombre de fenêtres', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant total TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['fenêtres', 'vitrage', 'isolation', 'énergie'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-06',
        titre: 'Installation de bornes de recharge véhicules électriques',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide d\'installer {nombre_bornes} borne(s) de recharge pour véhicules électriques dans le parking de la copropriété. Le montant des travaux d\'infrastructure est de {montant_infrastructure} TTC. Le coût par borne individuelle à la charge de chaque copropriétaire demandeur sera de {cout_borne} TTC.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'nombre_bornes', type: 'numero', label: 'Nombre de bornes', required: true },
            { name: 'montant_infrastructure', type: 'montant', label: 'Coût infrastructure TTC', required: true },
            { name: 'cout_borne', type: 'montant', label: 'Coût par borne TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['véhicule électrique', 'borne', 'recharge', 'parking', 'environnement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-07',
        titre: 'Mise en place du tri sélectif',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide de mettre en place le tri sélectif dans la copropriété. L\'aménagement comprend : {description_amenagement}. Le coût des équipements est de {montant_equipement} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'description_amenagement', type: 'textarea', label: 'Description de l\'aménagement', required: true },
            { name: 'montant_equipement', type: 'montant', label: 'Coût des équipements TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['tri sélectif', 'déchets', 'environnement', 'poubelles'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'energie-08',
        titre: 'Installation de robinets thermostatiques',
        categorie: 'Énergie et environnement',
        texte: 'L\'assemblée générale décide d\'installer des robinets thermostatiques sur tous les radiateurs des parties communes et des logements. Le nombre de robinets à installer est de {nombre_robinets}. Le coût total est de {montant_total} TTC, soit {cout_unitaire} par robinet.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'nombre_robinets', type: 'numero', label: 'Nombre de robinets', required: true },
            { name: 'montant_total', type: 'montant', label: 'Coût total TTC', required: true },
            { name: 'cout_unitaire', type: 'montant', label: 'Coût unitaire TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['robinets', 'thermostatique', 'chauffage', 'énergie'],
        scope: 'system',
        status: 'active'
    },

    // ========== Parking et espaces communs (6 résolutions) ==========
    {
        id: 'parking-01',
        titre: 'Réfection du revêtement du parking',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide de procéder à la réfection du revêtement du parking souterrain. Les travaux comprennent : {description_travaux}. Le montant total est de {montant_travaux} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['parking', 'revêtement', 'sol', 'travaux'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'parking-02',
        titre: 'Attribution des places de parking',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide d\'attribuer les places de parking selon les modalités suivantes : {modalites_attribution}. Les places concernées sont : {liste_places}.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'modalites_attribution', type: 'textarea', label: 'Modalités d\'attribution', required: true },
            { name: 'liste_places', type: 'textarea', label: 'Liste des places', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['parking', 'attribution', 'places'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'parking-03',
        titre: 'Aménagement d\'un local vélos',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide d\'aménager un local à vélos dans {emplacement}. Le local pourra accueillir {capacite} vélos. Le montant des travaux d\'aménagement est de {montant_travaux} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'emplacement', type: 'text', label: 'Emplacement du local', required: true },
            { name: 'capacite', type: 'numero', label: 'Capacité (nombre de vélos)', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['vélos', 'local', 'aménagement', 'mobilité douce'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'parking-04',
        titre: 'Rénovation des espaces verts',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide de procéder à la rénovation des espaces verts de la copropriété. Les travaux comprennent : {description_travaux}. Le montant total est de {montant_travaux} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['espaces verts', 'jardin', 'végétation', 'aménagement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'parking-05',
        titre: 'Installation de jeux pour enfants',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide d\'installer une aire de jeux pour enfants dans {emplacement}. Les équipements comprennent : {liste_equipements}. Le montant total est de {montant_total} TTC, maintenance incluse pour {duree_maintenance}.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'emplacement', type: 'text', label: 'Emplacement', required: true },
            { name: 'liste_equipements', type: 'textarea', label: 'Liste des équipements', required: true },
            { name: 'montant_total', type: 'montant', label: 'Montant total TTC', required: true },
            { name: 'duree_maintenance', type: 'text', label: 'Durée maintenance incluse', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['jeux', 'enfants', 'aire de jeux', 'aménagement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'parking-06',
        titre: 'Création d\'un local poubelles',
        categorie: 'Parking et espaces communs',
        texte: 'L\'assemblée générale décide de créer un local à poubelles dans {emplacement}. Le local respectera les normes d\'hygiène et comprendra {description_amenagement}. Le montant des travaux est de {montant_travaux} TTC.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'emplacement', type: 'text', label: 'Emplacement du local', required: true },
            { name: 'description_amenagement', type: 'textarea', label: 'Description de l\'aménagement', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['poubelles', 'local', 'déchets', 'aménagement'],
        scope: 'system',
        status: 'active'
    },

    // ========== Assurances (5 résolutions) ==========
    {
        id: 'assurance-01',
        titre: 'Renouvellement du contrat d\'assurance multirisque immeuble',
        categorie: 'Assurances',
        texte: 'L\'assemblée générale décide de renouveler le contrat d\'assurance multirisque immeuble avec la compagnie {nom_assureur}. La prime annuelle est de {montant_prime} TTC. Les garanties couvrent : {liste_garanties}. Le contrat prend effet le {date_effet}.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_assureur', type: 'text', label: 'Nom de l\'assureur', required: true },
            { name: 'montant_prime', type: 'montant', label: 'Prime annuelle TTC', required: true },
            { name: 'liste_garanties', type: 'textarea', label: 'Liste des garanties', required: true },
            { name: 'date_effet', type: 'date', label: 'Date d\'effet du contrat', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['assurance', 'multirisque', 'contrat', 'renouvellement'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'assurance-02',
        titre: 'Changement d\'assureur',
        categorie: 'Assurances',
        texte: 'L\'assemblée générale décide de changer d\'assureur multirisque immeuble. Le nouveau contrat sera souscrit auprès de {nom_nouvel_assureur} pour une prime annuelle de {montant_prime} TTC, contre {montant_ancien} TTC précédemment. Le syndic est autorisé à résilier le contrat actuel dans les formes légales.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_nouvel_assureur', type: 'text', label: 'Nouvel assureur', required: true },
            { name: 'montant_prime', type: 'montant', label: 'Nouvelle prime annuelle TTC', required: true },
            { name: 'montant_ancien', type: 'montant', label: 'Ancienne prime TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['assurance', 'changement', 'résiliation', 'économies'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'assurance-03',
        titre: 'Souscription d\'une assurance protection juridique',
        categorie: 'Assurances',
        texte: 'L\'assemblée générale décide de souscrire une assurance protection juridique auprès de {nom_assureur} pour un montant annuel de {montant_prime} TTC. Cette assurance couvre : {liste_garanties}.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_assureur', type: 'text', label: 'Nom de l\'assureur', required: true },
            { name: 'montant_prime', type: 'montant', label: 'Prime annuelle TTC', required: true },
            { name: 'liste_garanties', type: 'textarea', label: 'Garanties couvertes', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['assurance', 'protection juridique', 'contentieux'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'assurance-04',
        titre: 'Déclaration de sinistre et autorisation de travaux',
        categorie: 'Assurances',
        texte: 'L\'assemblée générale autorise le syndic à déclarer le sinistre survenu le {date_sinistre} à l\'assurance et à engager les travaux de réparation pour un montant de {montant_travaux} TTC. La franchise de {montant_franchise} sera répartie selon les tantièmes.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'date_sinistre', type: 'date', label: 'Date du sinistre', required: true },
            { name: 'montant_travaux', type: 'montant', label: 'Montant des travaux TTC', required: true },
            { name: 'montant_franchise', type: 'montant', label: 'Montant de la franchise', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['sinistre', 'assurance', 'réparation', 'franchise'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'assurance-05',
        titre: 'Souscription d\'une garantie dommages-ouvrage',
        categorie: 'Assurances',
        texte: 'L\'assemblée générale décide de souscrire une assurance dommages-ouvrage pour les travaux de {description_travaux}. Le montant de la prime est de {montant_prime} TTC. Cette assurance est obligatoire pour les travaux de construction.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true },
            { name: 'montant_prime', type: 'montant', label: 'Montant de la prime TTC', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['dommages-ouvrage', 'assurance', 'construction', 'travaux'],
        scope: 'system',
        status: 'active'
    },

    // ========== Copropriétaires (3 résolutions) ==========
    {
        id: 'copro-01',
        titre: 'Autorisation de travaux privatifs affectant les parties communes',
        categorie: 'Copropriétaires',
        texte: 'L\'assemblée générale autorise M./Mme {nom_coproprietaire}, propriétaire du lot n° {numero_lot}, à réaliser les travaux suivants affectant les parties communes : {description_travaux}. Ces travaux seront réalisés sous la responsabilité et aux frais exclusifs du demandeur, dans le respect des règles de l\'art.',
        majorite: 'ART_25',
        variablesTypees: [
            { name: 'nom_coproprietaire', type: 'coproprietaire', label: 'Nom du copropriétaire', required: true },
            { name: 'numero_lot', type: 'text', label: 'Numéro du lot', required: true },
            { name: 'description_travaux', type: 'textarea', label: 'Description des travaux', required: true }
        ],
        applicable_ag: ['ORDINAIRE', 'EXTRAORDINAIRE'],
        tags: ['travaux privatifs', 'autorisation', 'parties communes'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'copro-02',
        titre: 'Régularisation d\'occupation d\'une partie commune',
        categorie: 'Copropriétaires',
        texte: 'L\'assemblée générale autorise la régularisation de l\'occupation par M./Mme {nom_coproprietaire} de la partie commune {description_partie} moyennant une indemnité de {montant_indemnite} versée à la copropriété.',
        majorite: 'ART_26',
        variablesTypees: [
            { name: 'nom_coproprietaire', type: 'coproprietaire', label: 'Nom du copropriétaire', required: true },
            { name: 'description_partie', type: 'text', label: 'Description de la partie commune', required: true },
            { name: 'montant_indemnite', type: 'montant', label: 'Montant de l\'indemnité', required: true }
        ],
        applicable_ag: ['EXTRAORDINAIRE'],
        tags: ['régularisation', 'occupation', 'parties communes', 'indemnité'],
        scope: 'system',
        status: 'active'
    },
    {
        id: 'copro-03',
        titre: 'Mise en demeure pour non-respect du règlement',
        categorie: 'Copropriétaires',
        texte: 'L\'assemblée générale autorise le syndic à mettre en demeure M./Mme {nom_coproprietaire} de cesser {description_infraction} sous {delai_jours} jours, sous peine de poursuites judiciaires aux frais du contrevenant.',
        majorite: 'ART_24',
        variablesTypees: [
            { name: 'nom_coproprietaire', type: 'coproprietaire', label: 'Nom du copropriétaire', required: true },
            { name: 'description_infraction', type: 'textarea', label: 'Description de l\'infraction', required: true },
            { name: 'delai_jours', type: 'numero', label: 'Délai en jours', required: true }
        ],
        applicable_ag: ['ORDINAIRE'],
        tags: ['mise en demeure', 'infraction', 'règlement', 'poursuites'],
        scope: 'system',
        status: 'active'
    },
];

export function getResolutionsByCategory(templates: ResolutionTemplate[], category?: string): ResolutionTemplate[] {
    if (!category || category === 'all') return templates;
    return templates.filter(r => r.categorie === category);
}

export function getCategories(): string[] {
    return Array.from(new Set(RESOLUTIONS_BANK.map(r => r.categorie)));
}

export function getResolutionById(templates: ResolutionTemplate[], id: string): ResolutionTemplate | undefined {
    return templates.find(r => r.id === id);
}

export function getResolutionByTitle(templates: ResolutionTemplate[], title: string): ResolutionTemplate | undefined {
    const normalized = title.toLowerCase().trim();
    return templates.find(r => r.titre.toLowerCase().trim() === normalized);
}

export function replaceVariables(texte: string, variables: Record<string, string>): string {
    let result = texte;
    Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return result;
}

// Obtenir le type d'une variable pour une résolution
export function getVariableType(resolution: ResolutionTemplate, variableName: string): VariableType {
    // Chercher dans les variables typées (priorité absolue)
    if (resolution.variablesTypees) {
        const varTypee = resolution.variablesTypees.find(v => v.name === variableName);
        if (varTypee) return varTypee.type;
    }

    // Déduction automatique basée sur le nom de la variable
    // ATTENTION: L'ordre est important - les patterns plus spécifiques d'abord
    const name = variableName.toLowerCase();

    // Variables numériques/nombre - AVANT les autres pour éviter les faux positifs
    // Ex: "nombre_reunions" ne doit PAS matcher "nom"
    if (name.startsWith('nombre') || name === 'nb' || name.endsWith('_nb')) return 'numero';

    // Modalités de paiement
    if (name.includes('modalites_paiement')) {
        if (name.includes('budget')) return 'modalites_paiement_budget';
        return 'modalites_paiement';
    }

    // Texte long / résumé
    if (name.includes('resume') || name.includes('description') || name.includes('activites') || name.includes('commentaire')) return 'textarea';

    // Dates - vérifier avant montant car "echeance" peut apparaître dans les deux
    if (name.includes('date') || (name.includes('echeance') && !name.includes('dates_echeances'))) return 'date';

    // Montants
    if (name.includes('montant') || name.includes('prix') || name.includes('cout') || name.includes('honoraire')) return 'montant';

    // Durées
    if (name.includes('duree') && name.includes('mois')) return 'duree_mois';
    if (name.includes('duree') || name.includes('ans') || name.includes('annee')) return 'duree_ans';

    // Pourcentages
    if (name.includes('pourcentage') || name.includes('taux')) return 'pourcentage';

    // Copropriétaires - patterns très spécifiques pour éviter les faux positifs
    // "nom_president", "nom_secretaire", "nom_scrutateur" → coproprietaire_present
    if (name === 'nom_president' || name === 'nom_secretaire' || name === 'nom_scrutateur') return 'coproprietaire_present';
    // "nom" seul ou avec suffixe spécifique de copropriétaire
    if (name === 'nom' || name === 'noms' || name.includes('coproprietaire')) return 'coproprietaire';

    // Syndic/Gestionnaire
    if (name.includes('syndic') || name.includes('gestionnaire') || name === 'nom_syndic') return 'gestionnaire';

    // Numéros génériques (après les autres patterns)
    if (name.includes('numero') || name.includes('article')) return 'numero';

    return 'text';
}

// Obtenir la définition complète d'une variable
export function getVariableDefinition(resolution: ResolutionTemplate, variableName: string): VariableDefinition {
    // Chercher dans les variables typées
    if (resolution.variablesTypees) {
        const varTypee = resolution.variablesTypees.find(v => v.name === variableName);
        if (varTypee) return varTypee;
    }

    // Créer une définition par défaut
    return {
        name: variableName,
        type: getVariableType(resolution, variableName),
        label: variableName.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
        required: false
    };
}

// Vérifier si une résolution est un point d'information (sans vote)
export function isInformationResolution(resolution: ResolutionTemplate): boolean {
    return resolution.isInformation === true || resolution.majorite === 'INFORMATION';
}

// Formater une valeur selon son type
export function formatVariableValue(value: string, type: VariableType): string {
    if (!value) return '';

    switch (type) {
        case 'date':
            // Formater en JJ/MM/AAAA
            try {
                const date = new Date(value);
                return date.toLocaleDateString('fr-FR');
            } catch {
                return value;
            }
        case 'montant':
            // Formater en euros
            const num = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(num)) {
                return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
            }
            return value;
        case 'pourcentage':
            return `${value}%`;
        case 'duree_mois':
            // Affichage intelligent de la durée en mois
            const mois = parseInt(value);
            if (isNaN(mois) || mois < 1) return value;
            if (mois < 12) {
                return `${mois} mois`;
            }
            const annees = Math.floor(mois / 12);
            const moisRestants = mois % 12;
            if (moisRestants === 0) {
                return `${mois} mois (${annees} an${annees > 1 ? 's' : ''})`;
            }
            return `${mois} mois (${annees} an${annees > 1 ? 's' : ''} et ${moisRestants} mois)`;
        case 'duree_ans':
            return `${value} an${parseInt(value) > 1 ? 's' : ''}`;
        case 'modalites_paiement':
        case 'modalites_paiement_budget':
            // Retourner le label correspondant
            const option = MODALITES_PAIEMENT_OPTIONS.find(o => o.value === value);
            return option ? option.label : value;
        default:
            return value;
    }
}

// Générer les dates d'échéance selon les modalités de paiement
export function generateEcheancesDates(modalite: string, exercice: string | number): string {
    const annee = typeof exercice === 'string' ? parseInt(exercice) : exercice;

    switch (modalite) {
        case 'trimestriel':
            return `1er janvier ${annee}, 1er avril ${annee}, 1er juillet ${annee}, 1er octobre ${annee}`;
        case 'semestriel':
            return `1er janvier ${annee}, 1er juillet ${annee}`;
        case 'mensuel':
            return `Le 1er de chaque mois de janvier à décembre ${annee}`;
        case 'annuel':
            return `1er janvier ${annee}`;
        case 'au_choix_syndic':
            return 'Selon décision du syndic';
        default:
            return '';
    }
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE FILTRAGE PAR TYPE D'AG
// ═══════════════════════════════════════════════════════════════

/**
 * Obtenir toutes les résolutions applicables à un type d'AG
 * @param typeAG - Le type d'AG ('ORDINAIRE' ou 'EXTRAORDINAIRE')
 * @returns Liste des résolutions applicables, triées par ordre suggéré
 */
export function getResolutionsForAGType(templates: ResolutionTemplate[], typeAG: TypeAG): ResolutionTemplate[] {
    return templates
        .filter(r => !r.applicable_ag || r.applicable_ag.includes(typeAG))
        .sort((a, b) => (a.ordre_suggere || 999) - (b.ordre_suggere || 999));
}

/**
 * Obtenir les résolutions obligatoires pour un type d'AG
 * @param typeAG - Le type d'AG
 * @returns Liste des résolutions obligatoires, triées par ordre suggéré
 */
export function getResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG): ResolutionTemplate[] {
    return templates
        .filter(r => r.obligatoire_pour?.includes(typeAG))
        .sort((a, b) => (a.ordre_suggere || 999) - (b.ordre_suggere || 999));
}

/**
 * Obtenir les résolutions suggérées (non obligatoires) pour un type d'AG
 * @param typeAG - Le type d'AG
 * @returns Liste des résolutions suggérées
 */
export function getResolutionsSuggerees(templates: ResolutionTemplate[], typeAG: TypeAG): ResolutionTemplate[] {
    return getResolutionsForAGType(templates, typeAG)
        .filter(r => !r.obligatoire_pour?.includes(typeAG));
}

/**
 * Obtenir les résolutions par catégorie pour un type d'AG
 * @param typeAG - Le type d'AG
 * @returns Objet avec les catégories comme clés et les résolutions comme valeurs
 */
export function getResolutionsByCategorieForAGType(templates: ResolutionTemplate[], typeAG: TypeAG): Record<string, ResolutionTemplate[]> {
    const resolutions = getResolutionsForAGType(templates, typeAG);

    return resolutions.reduce((acc, r) => {
        if (!acc[r.categorie]) acc[r.categorie] = [];
        acc[r.categorie].push(r);
        return acc;
    }, {} as Record<string, ResolutionTemplate[]>);
}

/**
 * Rechercher des résolutions par mots-clés, optionnellement filtré par type d'AG
 * @param query - La requête de recherche
 * @param typeAG - Le type d'AG (optionnel)
 * @returns Liste des résolutions correspondantes
 */
export function searchResolutions(templates: ResolutionTemplate[], query: string, typeAG?: TypeAG): ResolutionTemplate[] {
    const allResolutions = typeAG
        ? getResolutionsForAGType(templates, typeAG)
        : templates;

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return allResolutions;

    return allResolutions.filter(r =>
        r.titre.toLowerCase().includes(lowerQuery) ||
        r.texte.toLowerCase().includes(lowerQuery) ||
        r.categorie.toLowerCase().includes(lowerQuery) ||
        r.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Obtenir le nombre de résolutions obligatoires pour un type d'AG
 * @param typeAG - Le type d'AG
 * @returns Nombre de résolutions obligatoires
 */
export function getNombreResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG): number {
    return getResolutionsObligatoires(templates, typeAG).length;
}
