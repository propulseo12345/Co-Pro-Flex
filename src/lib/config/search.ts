export interface SearchableRoute {
    title: string;
    description: string;
    path: string;
    keywords: string[];
    category: string;
}

// Routes canoniques alignées sur la navigation (src/lib/config/navigation.ts).
// Ne PAS ajouter ici d'ancienne route doublon (invoices, bank-movements, budget-current,
// unpaid, social, sales…) — elles sont redirigées dans next.config.ts.
export const searchableRoutes: SearchableRoute[] = [
    // Principal
    {
        title: 'Tableau de bord',
        description: 'Vue d\'ensemble de la copropriété',
        path: '/dashboard',
        keywords: ['dashboard', 'tableau', 'bord', 'accueil', 'home', 'vue', 'ensemble'],
        category: 'Principal'
    },

    // Assemblées Générales
    {
        title: 'Tableau de bord AG',
        description: 'Vue d\'ensemble des assemblées générales',
        path: '/ag/dashboard',
        keywords: ['assemblée', 'ag', 'dashboard', 'tableau', 'bord', 'réunion'],
        category: 'Assemblées'
    },
    {
        title: 'Nouvelle AG',
        description: 'Créer une assemblée générale',
        path: '/ag/new',
        keywords: ['nouvelle', 'ag', 'assemblée', 'créer', 'convocation'],
        category: 'Assemblées'
    },
    {
        title: 'Bibliothèque des résolutions',
        description: 'Modèles et résolutions personnalisées',
        path: '/ag/resolutions',
        keywords: ['résolution', 'résolutions', 'vote', 'décision', 'ag', 'bibliothèque', 'modèle'],
        category: 'Assemblées'
    },

    // Copropriété
    {
        title: 'Copropriétaires',
        description: 'Annuaire des copropriétaires',
        path: '/coproprietaires',
        keywords: ['copropriétaire', 'copropriétaires', 'propriétaire', 'annuaire', 'occupant'],
        category: 'Copropriété'
    },
    {
        title: 'Lots & Répartition',
        description: 'Lots, tantièmes et clés de répartition',
        path: '/coproprietaires/lots',
        keywords: ['lot', 'lots', 'tantième', 'tantièmes', 'clé', 'répartition', 'charges', 'quote-part'],
        category: 'Copropriété'
    },

    // Finance
    {
        title: 'Comptabilité',
        description: 'Grand livre, balance, compte de gestion',
        path: '/finance/comptabilite',
        keywords: ['comptabilité', 'compta', 'grand livre', 'balance', 'écriture', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Budgets',
        description: 'Budget de fonctionnement, travaux et fonds ALUR',
        path: '/finance/budgets',
        keywords: ['budget', 'budgets', 'prévisionnel', 'travaux', 'alur', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Factures',
        description: 'Factures fournisseurs',
        path: '/finance/factures',
        keywords: ['facture', 'factures', 'fournisseur', 'paiement', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Appels de fonds',
        description: 'Gestion des appels de fonds',
        path: '/finance/appels-fonds',
        keywords: ['appel', 'fonds', 'charges', 'cotisation', 'provision', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Mouvements bancaires',
        description: 'Relevés, catégorisation et rapprochement',
        path: '/finance/mouvements-bancaires',
        keywords: ['banque', 'bancaire', 'mouvement', 'relevé', 'rapprochement', 'compte', 'finance'],
        category: 'Finance'
    },
    {
        title: 'États datés',
        description: 'Pré-états datés et états datés (mutations de lots)',
        path: '/ventes-impayes/ventes',
        keywords: ['état', 'daté', 'datés', 'mutation', 'vente', 'finance'],
        category: 'Finance'
    },
    {
        title: 'Tantièmes et clés de répartition',
        description: 'Gérez la répartition des charges',
        path: '/finance/tantiemes',
        keywords: ['tantième', 'tantièmes', 'clé', 'clés', 'répartition', 'charges', 'finance'],
        category: 'Finance'
    },

    // Maintenance
    {
        title: 'Carnet d\'entretien',
        description: 'Carnet d\'entretien de l\'immeuble',
        path: '/maintenance/logbook',
        keywords: ['carnet', 'entretien', 'historique', 'intervention', 'maintenance'],
        category: 'Maintenance'
    },
    {
        title: 'Contrats',
        description: 'Contrats de maintenance et assurances',
        path: '/maintenance/contracts',
        keywords: ['contrat', 'contrats', 'maintenance', 'abonnement', 'assurance'],
        category: 'Maintenance'
    },
    {
        title: 'Prestataires',
        description: 'Annuaire des prestataires',
        path: '/maintenance/providers',
        keywords: ['prestataire', 'prestataires', 'fournisseur', 'annuaire', 'contact', 'maintenance'],
        category: 'Maintenance'
    },
    {
        title: 'Ordres de service',
        description: 'Gestion des ordres de service',
        path: '/maintenance/service-orders',
        keywords: ['ordre', 'service', 'os', 'intervention', 'maintenance'],
        category: 'Maintenance'
    },

    // Conformité
    {
        title: 'PPT',
        description: 'Plan pluriannuel de travaux',
        path: '/conformite/ppt',
        keywords: ['ppt', 'plan', 'pluriannuel', 'travaux', 'conformité'],
        category: 'Conformité'
    },
    {
        title: 'DPE Collectif',
        description: 'Diagnostic de performance énergétique',
        path: '/conformite/dpe',
        keywords: ['dpe', 'diagnostic', 'énergie', 'performance', 'conformité'],
        category: 'Conformité'
    },
    {
        title: 'Factur-X',
        description: 'Facturation électronique conforme',
        path: '/conformite/facturx',
        keywords: ['factur-x', 'facturx', 'facture', 'électronique', 'conformité'],
        category: 'Conformité'
    },

    // Documents
    {
        title: 'GED — Mes documents',
        description: 'Gestion électronique des documents',
        path: '/documents/ged',
        keywords: ['ged', 'document', 'documents', 'fichier', 'pdf', 'archive'],
        category: 'Documents'
    },

    // Communication
    {
        title: 'Communication',
        description: 'Mail, messagerie et mur',
        path: '/communication',
        keywords: ['communication', 'annonce', 'information', 'diffusion'],
        category: 'Communication'
    },
    {
        title: 'Mail',
        description: 'Courrier officiel',
        path: '/communication/mail',
        keywords: ['mail', 'courrier', 'email', 'lettre', 'communication'],
        category: 'Communication'
    },
    {
        title: 'Messagerie',
        description: 'Messagerie privée',
        path: '/communication/messagerie',
        keywords: ['messagerie', 'message', 'chat', 'conversation', 'communication'],
        category: 'Communication'
    },
    {
        title: 'Mur',
        description: 'Mur communautaire',
        path: '/communication/mur',
        keywords: ['mur', 'communautaire', 'forum', 'post', 'communication'],
        category: 'Communication'
    },

    // Contentieux
    {
        title: 'Impayés',
        description: 'Suivi et recouvrement des impayés',
        path: '/contentieux/impayes',
        keywords: ['impayé', 'impayés', 'retard', 'dette', 'relance', 'recouvrement', 'contentieux'],
        category: 'Contentieux'
    },
    {
        title: 'Litiges',
        description: 'Gestion des litiges',
        path: '/contentieux/litiges',
        keywords: ['litige', 'litiges', 'conflit', 'juridique', 'contentieux'],
        category: 'Contentieux'
    },

    // Paramètres
    {
        title: 'Paramètres',
        description: 'Configuration de la copropriété',
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
