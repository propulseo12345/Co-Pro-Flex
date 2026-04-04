export interface IBlogArticle {
  slug: string;
  title: string;
  category: 'Guides' | 'Réglementaire' | 'Conseils';
  date: string;
  author: { name: string; role: string };
  readTime: string;
  excerpt: string;
  content: string;
}

export const BLOG_ARTICLES: IBlogArticle[] = [
  {
    slug: 'organiser-ag-copropriete-efficace',
    title: 'Comment organiser une AG de copropriété efficace',
    category: 'Guides',
    date: '2026-03-15',
    author: { name: 'Claire Fontaine', role: 'Responsable contenu' },
    readTime: '8 min',
    excerpt:
      "L'assemblée générale est le moment clé de la vie d'une copropriété. Pourtant, entre convocations en retard et PV rédigés des semaines après, beaucoup d'AG virent au calvaire.",
    content:
      "Organiser une AG réussie commence bien avant le jour J. La convocation doit être envoyée au moins 21 jours à l'avance, avec un ordre du jour clair et les documents annexes. Le jour de l'assemblée, une feuille de présence rigoureuse est indispensable pour valider le quorum. Chaque résolution doit être votée selon la bonne règle de majorité (article 24, 25 ou 26), et les résultats consignés en temps réel. Enfin, le PV doit être rédigé rapidement et envoyé aux copropriétaires dans un délai raisonnable. Avec un outil comme CoProFlex, la plupart de ces étapes sont automatisées.",
  },
  {
    slug: 'comprendre-majorites-vote-copropriete',
    title: 'Comprendre les majorités de vote en copropriété',
    category: 'Réglementaire',
    date: '2026-02-02',
    author: { name: 'Antoine Mercier', role: 'Juriste spécialisé' },
    readTime: '10 min',
    excerpt:
      'Article 24, 25, 25-1, 26, unanimité... Les règles de majorité sont un casse-tête pour beaucoup de syndics. Décryptage complet.',
    content:
      "La loi du 10 juillet 1965 définit plusieurs niveaux de majorité selon la gravité de la décision. L'article 24 (majorité simple des présents et représentés) s'applique aux décisions courantes. L'article 25 (majorité absolue de tous les copropriétaires) concerne les travaux d'amélioration. Si le seuil de l'article 25 n'est pas atteint mais qu'un tiers des voix s'est exprimé, la passerelle de l'article 25-1 permet un nouveau vote à la majorité de l'article 24. L'article 26 (double majorité) s'applique aux actes de disposition. L'unanimité est requise pour toute aliénation de parties communes.",
  },
  {
    slug: 'erreurs-courantes-appels-de-fonds',
    title: '5 erreurs courantes dans la gestion des appels de fonds',
    category: 'Conseils',
    date: '2026-01-18',
    author: { name: 'Claire Fontaine', role: 'Responsable contenu' },
    readTime: '6 min',
    excerpt:
      'Les appels de fonds sont le nerf de la guerre en copropriété. Un échéancier mal calculé et c\'est toute la trésorerie qui vacille.',
    content:
      "Première erreur : ne pas respecter le calendrier voté en AG. Deuxième : calculer la répartition sur des tantièmes obsolètes. Troisième : oublier les relances. Un impayé non relancé devient vite irrécupérable. Quatrième : ne pas distinguer fonds courant, fonds travaux et fonds ALUR. Cinquième : envoyer des appels sans détail, ce qui génère des appels téléphoniques. Un outil comme CoProFlex automatise génération, répartition et relances.",
  },
  {
    slug: 'loi-alur-guide-syndic',
    title: 'Loi ALUR : ce que tout syndic doit savoir',
    category: 'Réglementaire',
    date: '2025-12-05',
    author: { name: 'Antoine Mercier', role: 'Juriste spécialisé' },
    readTime: '12 min',
    excerpt:
      "Adoptée en 2014, la loi ALUR a profondément transformé la gestion de copropriété. Fonds de travaux obligatoire, fiche synthétique, immatriculation : tour d'horizon.",
    content:
      "Le fonds de travaux obligatoire impose une cotisation annuelle d'au moins 5 % du budget prévisionnel. L'immatriculation au Registre National des Copropriétés est obligatoire. La fiche synthétique doit être mise à disposition de chaque copropriétaire. Le diagnostic technique global est encouragé. La mise en concurrence des contrats de syndic et la mise à disposition d'un extranet sont devenues des standards. CoProFlex intègre nativement la gestion du fonds ALUR.",
  },
  {
    slug: 'reduire-impayes-copropriete',
    title: 'Comment réduire les impayés en copropriété',
    category: 'Conseils',
    date: '2025-10-22',
    author: { name: 'Claire Fontaine', role: 'Responsable contenu' },
    readTime: '7 min',
    excerpt:
      'Les impayés sont le premier facteur de fragilité des copropriétés. Voici des stratégies concrètes pour les limiter.',
    content:
      'La clé : prévention et réactivité. Envoyer des appels clairs et détaillés. Automatiser les relances à J+15, J+30, J+60, J+90. Proposer des facilités de paiement. Maintenir un dialogue ouvert via un espace copropriétaire où chacun consulte son solde en temps réel.',
  },
  {
    slug: 'digitaliser-copropriete-par-ou-commencer',
    title: 'Digitaliser sa copropriété : par où commencer ?',
    category: 'Guides',
    date: '2025-09-08',
    author: { name: 'Claire Fontaine', role: 'Responsable contenu' },
    readTime: '9 min',
    excerpt:
      'Feuilles volantes, classeurs débordants : la gestion reste artisanale. La digitalisation n\'est ni compliquée ni coûteuse.',
    content:
      "Commencer par le plus douloureux. Pour la plupart : la comptabilité. Puis la gestion documentaire. Puis la communication. Enfin les AG. L'essentiel : choisir un outil unique plutôt qu'empiler des solutions disparates.",
  },
];

export const BLOG_CATEGORIES = ['Tous', 'Guides', 'Réglementaire', 'Conseils'] as const;
