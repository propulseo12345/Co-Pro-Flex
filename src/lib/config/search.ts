export interface SearchableRoute {
    title: string;
    description: string;
    path: string;
    keywords: string[];
    category: string;
}

export const searchableRoutes: SearchableRoute[] = [
    // Dashboard
    {
        title: 'Tableau de bord',
        description: 'Vue d\'ensemble de la copropriété',
        path: '/dashboard',
        keywords: ['dashboard', 'tableau', 'bord', 'accueil', 'home', 'vue', 'ensemble'],
        category: 'Principal'
    },
    {
        title: 'Accueil',
        description: 'Page d\'accueil',
        path: '/',
        keywords: ['accueil', 'home', 'début', 'start'],
        category: 'Principal'
    },

    // Finance
    {
        title: 'Finance',
        description: 'Gestion financière',
        path: '/finance',
        keywords: ['finance', 'financier', 'argent', 'comptabilité', 'compta'],
        category: 'Finance'
    },
    {
        title: 'Tantièmes et clés de répartition',
        description: 'Gérez la répartition des charges',
        path: '/finance/tantiemes',
        keywords: ['tantième', 'tantièmes', 'clé', 'clés', 'répartition', 'charges', 'quote-part', 'pourcentage', 'vote', 'ag', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Budget',
        description: 'Gestion des budgets',
        path: '/finance/budgets',
        keywords: ['budget', 'budgets', 'prévisionnel', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Budget courant',
        description: 'Budget de l\'exercice en cours',
        path: '/finance/budget-current',
        keywords: ['budget', 'courant', 'actuel', 'exercice', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Budget travaux',
        description: 'Budget dédié aux travaux',
        path: '/finance/budget-works',
        keywords: ['budget', 'travaux', 'rénovation', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Factures',
        description: 'Gestion des factures',
        path: '/finance/invoices',
        keywords: ['facture', 'factures', 'invoice', 'paiement', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Nouvelle facture',
        description: 'Créer une nouvelle facture',
        path: '/finance/invoices/new',
        keywords: ['nouvelle', 'facture', 'créer', 'ajouter', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Paiement factures',
        description: 'Paiement des factures',
        path: '/finance/invoices/payment',
        keywords: ['paiement', 'facture', 'payer', 'régler', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Transactions',
        description: 'Historique des transactions',
        path: '/finance/transactions',
        keywords: ['transaction', 'transactions', 'historique', 'opération', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Mouvements bancaires',
        description: 'Relevés bancaires',
        path: '/finance/bank-movements',
        keywords: ['banque', 'bancaire', 'mouvement', 'relevé', 'compte', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Appels de fonds',
        description: 'Gestion des appels de fonds',
        path: '/finance/calls',
        keywords: ['appel', 'fonds', 'charges', 'cotisation', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Impayés',
        description: 'Gestion des impayés',
        path: '/finance/unpaid',
        keywords: ['impayé', 'impayés', 'retard', 'dette', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Relances impayés',
        description: 'Relances pour les impayés',
        path: '/finance/unpaid/reminders',
        keywords: ['relance', 'impayé', 'rappel', 'retard', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Virements',
        description: 'Gestion des virements',
        path: '/finance/transfer',
        keywords: ['virement', 'transfert', 'banque', 'finance'],
        category: 'Finance'
    },

    // Documents
    {
        title: 'Documents',
        description: 'Gestion documentaire',
        path: '/documents',
        keywords: ['document', 'documents', 'fichier', 'pdf'],
        category: 'Documents'
    },
    {
        title: 'Grand livre',
        description: 'Grand livre comptable',
        path: '/documents/ledger',
        keywords: ['grand', 'livre', 'comptable', 'document'],
        category: 'Documents'
    },
    {
        title: 'Grand livre complet',
        description: 'Grand livre complet',
        path: '/documents/ledger/full',
        keywords: ['grand', 'livre', 'complet', 'comptable', 'document'],
        category: 'Documents'
    },
    {
        title: 'Balance',
        description: 'Balance comptable',
        path: '/documents/balance',
        keywords: ['balance', 'comptable', 'document'],
        category: 'Documents'
    },
    {
        title: 'Compte de charges',
        description: 'Relevé des charges',
        path: '/documents/expenses',
        keywords: ['charge', 'charges', 'dépense', 'document'],
        category: 'Documents'
    },
    {
        title: 'Clôture',
        description: 'Documents de clôture',
        path: '/documents/closing',
        keywords: ['clôture', 'fin', 'exercice', 'document'],
        category: 'Documents'
    },
    {
        title: 'GED',
        description: 'Gestion électronique des documents',
        path: '/documents/ged',
        keywords: ['ged', 'gestion', 'électronique', 'document', 'archive'],
        category: 'Documents'
    },

    // Assemblées Générales
    {
        title: 'Assemblées Générales',
        description: 'Gestion des AG',
        path: '/ag',
        keywords: ['assemblée', 'ag', 'général', 'réunion', 'vote'],
        category: 'Assemblées'
    },
    {
        title: 'Tableau de bord AG',
        description: 'Vue d\'ensemble des AG',
        path: '/ag/dashboard',
        keywords: ['assemblée', 'ag', 'dashboard', 'tableau', 'bord'],
        category: 'Assemblées'
    },
    {
        title: 'Résolutions',
        description: 'Gestion des résolutions',
        path: '/ag/resolutions',
        keywords: ['résolution', 'résolutions', 'vote', 'décision', 'ag'],
        category: 'Assemblées'
    },
    {
        title: 'Assemblées',
        description: 'Liste des assemblées',
        path: '/assemblees',
        keywords: ['assemblée', 'assemblées', 'réunion', 'ag'],
        category: 'Assemblées'
    },

    // Maintenance
    {
        title: 'Maintenance',
        description: 'Gestion de la maintenance',
        path: '/maintenance',
        keywords: ['maintenance', 'entretien', 'réparation', 'technique'],
        category: 'Maintenance'
    },
    {
        title: 'Ordres de service',
        description: 'Gestion des ordres de service',
        path: '/maintenance/service-orders',
        keywords: ['ordre', 'service', 'os', 'intervention', 'maintenance'],
        category: 'Maintenance'
    },
    {
        title: 'Nouvel ordre de service',
        description: 'Créer un ordre de service',
        path: '/maintenance/service-orders/new',
        keywords: ['nouveau', 'ordre', 'service', 'créer', 'maintenance'],
        category: 'Maintenance'
    },
    {
        title: 'Annuaire',
        description: 'Annuaire des prestataires',
        path: '/maintenance/directory',
        keywords: ['annuaire', 'prestataire', 'contact', 'fournisseur', 'maintenance'],
        category: 'Maintenance'
    },
    {
        title: 'Contrats',
        description: 'Gestion des contrats',
        path: '/maintenance/contracts',
        keywords: ['contrat', 'contrats', 'maintenance', 'abonnement'],
        category: 'Maintenance'
    },
    {
        title: 'Carnet d\'entretien',
        description: 'Carnet d\'entretien de l\'immeuble',
        path: '/maintenance/logbook',
        keywords: ['carnet', 'entretien', 'historique', 'maintenance'],
        category: 'Maintenance'
    },

    // Social
    {
        title: 'Social',
        description: 'Espace social et communication',
        path: '/social',
        keywords: ['social', 'communauté', 'résidents', 'communication'],
        category: 'Social'
    },
    {
        title: 'Événements',
        description: 'Calendrier des événements',
        path: '/social/events',
        keywords: ['événement', 'événements', 'calendrier', 'social'],
        category: 'Social'
    },
    {
        title: 'Nouvel événement',
        description: 'Créer un événement',
        path: '/social/events/new',
        keywords: ['nouveau', 'événement', 'créer', 'social'],
        category: 'Social'
    },
    {
        title: 'Forum',
        description: 'Forum de discussion',
        path: '/social/forum',
        keywords: ['forum', 'discussion', 'débat', 'social'],
        category: 'Social'
    },
    {
        title: 'Nouvelle discussion',
        description: 'Créer une discussion',
        path: '/social/forum/new',
        keywords: ['nouveau', 'discussion', 'sujet', 'forum', 'social'],
        category: 'Social'
    },
    {
        title: 'Messages',
        description: 'Messagerie',
        path: '/social/messages',
        keywords: ['message', 'messages', 'messagerie', 'communication', 'social'],
        category: 'Social'
    },

    // Juridique
    {
        title: 'Litiges',
        description: 'Gestion des litiges',
        path: '/legal/disputes',
        keywords: ['litige', 'litiges', 'conflit', 'juridique', 'contentieux'],
        category: 'Juridique'
    },

    // Communication
    {
        title: 'Communication',
        description: 'Outils de communication',
        path: '/communication',
        keywords: ['communication', 'annonce', 'information', 'diffusion'],
        category: 'Communication'
    },

    // Ventes
    {
        title: 'Ventes',
        description: 'Gestion des ventes',
        path: '/sales',
        keywords: ['vente', 'ventes', 'cession', 'lot'],
        category: 'Ventes'
    },


    // Analytics
    {
        title: 'Analytics',
        description: 'Analyses et statistiques',
        path: '/analytics',
        keywords: ['analytics', 'analyse', 'statistique', 'rapport', 'dashboard'],
        category: 'Analytics'
    },

    // Paramètres
    {
        title: 'Paramètres',
        description: 'Configuration de l\'application',
        path: '/settings',
        keywords: ['paramètre', 'paramètres', 'configuration', 'réglage', 'settings'],
        category: 'Paramètres'
    }
];

export function searchRoutes(query: string): SearchableRoute[] {
    if (!query || query.trim() === '') {
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    return searchableRoutes
        .filter(route => {
            // Recherche dans le titre
            if (route.title.toLowerCase().includes(normalizedQuery)) {
                return true;
            }

            // Recherche dans la description
            if (route.description.toLowerCase().includes(normalizedQuery)) {
                return true;
            }

            // Recherche dans les mots-clés
            if (route.keywords.some(keyword => keyword.includes(normalizedQuery))) {
                return true;
            }

            // Recherche dans la catégorie
            if (route.category.toLowerCase().includes(normalizedQuery)) {
                return true;
            }

            return false;
        })
        .sort((a, b) => {
            // Priorité si le titre commence par la recherche
            const aTitleStarts = a.title.toLowerCase().startsWith(normalizedQuery);
            const bTitleStarts = b.title.toLowerCase().startsWith(normalizedQuery);

            if (aTitleStarts && !bTitleStarts) return -1;
            if (!aTitleStarts && bTitleStarts) return 1;

            // Sinon, tri alphabétique
            return a.title.localeCompare(b.title);
        })
        .slice(0, 10); // Limiter à 10 résultats
}
