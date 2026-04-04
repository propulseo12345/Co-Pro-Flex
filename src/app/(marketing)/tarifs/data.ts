/* ── Plan data ── */

export interface Plan {
  name: string;
  slug: string;
  monthly: string;
  annual: string;
  unit: string;
  tagline: string;
  highlighted: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
}

export const plans: Plan[] = [
  {
    name: 'Essentiel',
    slug: 'essentiel',
    monthly: '1,90',
    annual: '1,58',
    unit: '/lot/mois',
    tagline: 'Idéal pour les petites copropriétés et les syndics bénévoles.',
    highlighted: false,
    features: [
      "Jusqu'à 3 copropriétés",
      'Tableau de bord avec KPIs',
      'Gestion des AG',
      'Calcul automatique des majorités',
      'Génération de PV en PDF',
      'Budgets prévisionnels',
      'Appels de fonds avec échéancier',
      "Carnet d'entretien numérique",
      'Stockage documents (5 Go)',
      'Messagerie privée',
      'Support par email sous 48h',
      'Mises à jour incluses',
    ],
    cta: "Commencer l'essai gratuit",
    ctaHref: '/contact',
  },
  {
    name: 'Professionnel',
    slug: 'professionnel',
    monthly: '2,90',
    annual: '2,42',
    unit: '/lot/mois',
    tagline: 'Conçu pour les syndics professionnels qui gèrent plusieurs copropriétés.',
    highlighted: true,
    features: [
      'Copropriétés illimitées',
      'Tout le plan Essentiel, plus :',
      'Vue consolidée multi-copropriétés',
      'Comptabilité complète',
      'Relances automatiques des impayés',
      'Gestion des contrats avec alertes',
      'Ordres de service et suivi prestataires',
      'Vote par correspondance',
      'Stockage documents (50 Go)',
      'Mur communautaire et événements',
      'Rôles et permissions avancés',
      'Export PDF avec votre logo',
      'Support prioritaire sous 4h',
    ],
    cta: "Commencer l'essai gratuit",
    ctaHref: '/contact',
  },
  {
    name: 'Entreprise',
    slug: 'entreprise',
    monthly: 'Sur devis',
    annual: 'Sur devis',
    unit: '',
    tagline: 'Pour les cabinets de syndic et les structures multi-gestionnaires.',
    highlighted: false,
    features: [
      'Tout le plan Professionnel, plus :',
      'Gestionnaires illimités',
      'Stockage documents illimité',
      'API et intégrations',
      'SSO entreprise',
      'SLA garanti',
      'Formation dédiée',
      'Migration accompagnée',
      'Interlocuteur dédié',
      'Personnalisation interface',
      'Rapports avancés',
    ],
    cta: 'Contactez notre équipe',
    ctaHref: '/contact',
  },
];

/* ── Comparison table ── */

export interface ComparisonRow {
  feature: string;
  essentiel: boolean | string;
  professionnel: boolean | string;
  entreprise: boolean | string;
}

export const comparisonRows: ComparisonRow[] = [
  { feature: 'Tableau de bord avec KPIs', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Gestion des AG', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Calcul automatique des majorités', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Génération de PV en PDF', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Budgets prévisionnels', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Appels de fonds avec échéancier', essentiel: true, professionnel: true, entreprise: true },
  { feature: "Carnet d'entretien numérique", essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Messagerie privée', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Mises à jour incluses', essentiel: true, professionnel: true, entreprise: true },
  { feature: 'Nombre de copropriétés', essentiel: '3', professionnel: 'Illimité', entreprise: 'Illimité' },
  { feature: 'Stockage documents', essentiel: '5 Go', professionnel: '50 Go', entreprise: 'Illimité' },
  { feature: 'Vue consolidée multi-copropriétés', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Comptabilité complète', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Relances automatiques', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Gestion des contrats', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Ordres de service', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Vote par correspondance', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Rôles et permissions avancés', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'Export PDF personnalisé', essentiel: false, professionnel: true, entreprise: true },
  { feature: 'API et intégrations', essentiel: false, professionnel: false, entreprise: true },
  { feature: 'SSO entreprise', essentiel: false, professionnel: false, entreprise: true },
  { feature: 'Interlocuteur dédié', essentiel: false, professionnel: false, entreprise: true },
];

/* ── FAQ ── */

export interface TarifsFaqItem {
  question: string;
  answer: string;
}

export const faqItems: TarifsFaqItem[] = [
  {
    question: 'Y a-t-il un engagement minimum ?',
    answer:
      'Non. Tous nos plans sont sans engagement. Vous pouvez annuler à tout moment depuis votre espace, sans frais ni justification. Vos données restent exportables pendant 30 jours après la clôture.',
  },
  {
    question: 'Combien coûte la migration ?',
    answer:
      'La migration est incluse dans tous les plans. Notre équipe vous accompagne pour importer vos données existantes : copropriétaires, lots, tantièmes, documents. Comptez 48h ouvrables pour une migration standard.',
  },
  {
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. 30 jours d\'essai gratuit, sans carte bancaire. Vous accédez à toutes les fonctionnalités du plan Professionnel pour tester en conditions réelles.',
  },
  {
    question: 'Comment fonctionne la facturation ?',
    answer:
      'La facturation est mensuelle, calculée sur le nombre de lots gérés. Vous recevez une facture détaillée chaque mois. Le paiement se fait par carte bancaire ou prélèvement SEPA.',
  },
  {
    question: 'Existe-t-il une remise annuelle ?',
    answer:
      'Oui. En choisissant la facturation annuelle, vous bénéficiez de 2 mois offerts, soit une économie de 17% par rapport au tarif mensuel.',
  },
  {
    question: 'Que se passe-t-il si je dépasse mon plan ?',
    answer:
      'Vous recevez une notification à 80% puis à 95% de votre quota (copropriétés ou stockage). Aucune coupure : nous vous proposons simplement de passer au plan supérieur pour continuer en toute sérénité.',
  },
];
