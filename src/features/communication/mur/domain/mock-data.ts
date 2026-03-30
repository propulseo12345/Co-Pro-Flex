// ============================================================================
// Mur (Wall) — Données mockées
// ============================================================================

import type { IWallPost, IWallComment } from '@/features/communication/mur/domain/types';

// ----------------------------------------------------------------------------
// IDs constants
// ----------------------------------------------------------------------------

const COPRO_ID = 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

// Author IDs
const SYNDIC_ID = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const MOREAU_ID = 'u2000001-0000-4000-a000-000000000004';
const DUPONT_ID = 'u2000001-0000-4000-a000-000000000001';
const GARCIA_ID = 'u2000001-0000-4000-a000-000000000002';
const LEFEBVRE_ID = 'u2000001-0000-4000-a000-000000000003';

// Post IDs
const POST_FACADE   = 'wp000001-0000-4000-a000-000000000001';
const POST_COUPURE  = 'wp000001-0000-4000-a000-000000000002';
const POST_TRI      = 'wp000001-0000-4000-a000-000000000003';
const POST_AG       = 'wp000001-0000-4000-a000-000000000004';
const POST_BRUIT    = 'wp000001-0000-4000-a000-000000000005';
const POST_NOEL     = 'wp000001-0000-4000-a000-000000000006';

// ----------------------------------------------------------------------------
// Publications
// ----------------------------------------------------------------------------

export const MOCK_POSTS: IWallPost[] = [
  // ── 2 épinglés ────────────────────────────────────────────────────────
  {
    id: POST_FACADE,
    coproprieteId: COPRO_ID,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    title: 'Travaux façade — Planning prévisionnel',
    content: `Les travaux de ravalement de la façade côté rue débuteront le 14 avril 2025 pour une durée estimée de 8 semaines.

Pendant cette période :
- Des échafaudages seront installés côté rue
- L'accès au parking souterrain sera maintenu
- Les fenêtres des étages 1 à 4 devront rester fermées pendant les phases de sablage

Le planning détaillé sera affiché dans le hall. N'hésitez pas à me contacter pour toute question.`,
    category: 'information',
    isPinned: true,
    isLocked: false,
    attachments: [
      { id: 'pa001', name: 'planning_facade_2025.pdf', size: '1.2 Mo', type: 'pdf' },
    ],
    likesCount: 12,
    commentsCount: 4,
    isLikedByMe: false,
    createdAt: '2025-03-20T09:00:00Z',
    updatedAt: '2025-03-20T09:00:00Z',
  },
  {
    id: POST_COUPURE,
    coproprieteId: COPRO_ID,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    title: 'Coupure d\'eau lundi 31 mars — 9h à 12h',
    content: `Une coupure d'eau est prévue lundi 31 mars de 9h à 12h pour permettre la réparation de la colonne montante du bâtiment A (cage 2).

Pensez à faire des réserves d'eau si nécessaire. Les bâtiments B et C ne sont pas concernés.`,
    category: 'urgent',
    isPinned: true,
    isLocked: false,
    attachments: [],
    likesCount: 5,
    commentsCount: 2,
    isLikedByMe: true,
    createdAt: '2025-03-28T14:00:00Z',
    updatedAt: '2025-03-28T14:00:00Z',
  },

  // ── 4 non épinglés ───────────────────────────────────────────────────
  {
    id: POST_TRI,
    coproprieteId: COPRO_ID,
    authorId: GARCIA_ID,
    authorName: 'Maria Garcia',
    authorRole: 'copro',
    title: 'Question sur le tri sélectif — nouveaux bacs',
    content: `Bonjour à tous,

Les nouveaux bacs jaunes ont été livrés mais je ne comprends pas bien les consignes. Est-ce qu'on met les cartons d'emballage dans le jaune ou dans le local cartons ?

Quelqu'un a les nouvelles consignes de la Mairie ?`,
    category: 'question',
    isPinned: false,
    isLocked: false,
    attachments: [],
    likesCount: 3,
    commentsCount: 3,
    isLikedByMe: false,
    createdAt: '2025-03-27T11:00:00Z',
    updatedAt: '2025-03-27T11:00:00Z',
  },
  {
    id: POST_AG,
    coproprieteId: COPRO_ID,
    authorId: MOREAU_ID,
    authorName: 'Sophie Moreau',
    authorRole: 'conseil',
    title: 'Résultats AG 2025 — Résumé des votes',
    content: `Pour ceux qui n'ont pas pu assister à l'AG du 15 mars, voici un résumé des principales décisions :

• Budget prévisionnel 2025 : **adopté** (art. 24, 87% des voix)
• Ravalement façade : **adopté** (art. 25, 62% des tantièmes)
• Remplacement ascenseur : **reporté** (3 devis en attente)
• Changement syndic : **rejeté** (art. 25, majorité non atteinte)

Le PV complet sera envoyé par mail sous 15 jours.`,
    category: 'information',
    isPinned: false,
    isLocked: true,
    attachments: [],
    likesCount: 18,
    commentsCount: 0,
    isLikedByMe: true,
    createdAt: '2025-03-16T18:00:00Z',
    updatedAt: '2025-03-16T18:00:00Z',
  },
  {
    id: POST_BRUIT,
    coproprieteId: COPRO_ID,
    authorId: LEFEBVRE_ID,
    authorName: 'Philippe Lefebvre',
    authorRole: 'copro',
    title: 'Nuisances sonores 3ème étage — Lot 14A',
    content: `Bonsoir,

Je me permets de signaler des nuisances sonores récurrentes provenant du lot 14A (3ème étage). Travaux de perçage le soir après 21h, musique forte le week-end.

J'ai essayé de discuter avec le locataire mais sans succès. Quelqu'un d'autre est-il concerné ?`,
    category: 'question',
    isPinned: false,
    isLocked: false,
    attachments: [],
    likesCount: 7,
    commentsCount: 2,
    isLikedByMe: false,
    createdAt: '2025-03-25T21:30:00Z',
    updatedAt: '2025-03-25T21:30:00Z',
  },
  {
    id: POST_NOEL,
    coproprieteId: COPRO_ID,
    authorId: DUPONT_ID,
    authorName: 'Jean Dupont',
    authorRole: 'copro',
    title: 'Marché de Noël de la copro — Qui est partant ?',
    content: `Bonjour à tous !

L'année dernière notre petit marché de Noël dans la cour avait été un beau moment. Je propose de recommencer cette année !

Si vous êtes intéressés pour tenir un stand (gâteaux, vin chaud, artisanat, etc.), merci de vous manifester. On pourrait fixer une date début décembre.`,
    category: 'evenement',
    isPinned: false,
    isLocked: false,
    attachments: [],
    likesCount: 22,
    commentsCount: 0,
    isLikedByMe: true,
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2025-03-10T10:00:00Z',
  },
];

// ----------------------------------------------------------------------------
// Commentaires
// ----------------------------------------------------------------------------

export const MOCK_COMMENTS: IWallComment[] = [
  // ── Commentaires sur POST_FACADE (4 commentaires) ─────────────────────
  {
    id: 'wc000001-0000-4000-a000-000000000001',
    postId: POST_FACADE,
    authorId: DUPONT_ID,
    authorName: 'Jean Dupont',
    authorRole: 'copro',
    content: 'Merci pour l\'info. Est-ce que les places de parking extérieures seront aussi impactées ?',
    parentId: null,
    likesCount: 2,
    isLikedByMe: false,
    createdAt: '2025-03-20T10:15:00Z',
    updatedAt: '2025-03-20T10:15:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000002',
    postId: POST_FACADE,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    content: 'Non, seul le trottoir côté rue sera concerné. Les places extérieures côté jardin restent accessibles.',
    parentId: 'wc000001-0000-4000-a000-000000000001',
    likesCount: 3,
    isLikedByMe: true,
    createdAt: '2025-03-20T11:00:00Z',
    updatedAt: '2025-03-20T11:00:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000003',
    postId: POST_FACADE,
    authorId: GARCIA_ID,
    authorName: 'Maria Garcia',
    authorRole: 'copro',
    content: 'Et pour le bruit ? On travaille de la maison, ça va être compliqué pendant 8 semaines...',
    parentId: null,
    likesCount: 4,
    isLikedByMe: false,
    createdAt: '2025-03-20T12:30:00Z',
    updatedAt: '2025-03-20T12:30:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000004',
    postId: POST_FACADE,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    content: 'Les travaux bruyants (sablage) sont limités à 9h-12h et 14h-17h. Le reste du temps, ce sera de la peinture, beaucoup plus silencieux.',
    parentId: 'wc000001-0000-4000-a000-000000000003',
    likesCount: 5,
    isLikedByMe: true,
    createdAt: '2025-03-20T14:00:00Z',
    updatedAt: '2025-03-20T14:00:00Z',
  },

  // ── Commentaires sur POST_COUPURE (2 commentaires) ────────────────────
  {
    id: 'wc000001-0000-4000-a000-000000000005',
    postId: POST_COUPURE,
    authorId: LEFEBVRE_ID,
    authorName: 'Philippe Lefebvre',
    authorRole: 'copro',
    content: 'Merci pour le préavis. 3 heures c\'est long, il n\'y a pas moyen de réduire ?',
    parentId: null,
    likesCount: 1,
    isLikedByMe: false,
    createdAt: '2025-03-28T15:00:00Z',
    updatedAt: '2025-03-28T15:00:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000006',
    postId: POST_COUPURE,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    content: 'Le plombier estime 2h de travail effectif, le créneau de 3h inclut la remise en pression et les tests. On fera au plus vite.',
    parentId: 'wc000001-0000-4000-a000-000000000005',
    likesCount: 2,
    isLikedByMe: false,
    createdAt: '2025-03-28T15:30:00Z',
    updatedAt: '2025-03-28T15:30:00Z',
  },

  // ── Commentaires sur POST_TRI (3 commentaires) ────────────────────────
  {
    id: 'wc000001-0000-4000-a000-000000000007',
    postId: POST_TRI,
    authorId: DUPONT_ID,
    authorName: 'Jean Dupont',
    authorRole: 'copro',
    content: 'Bonne question ! Je crois que les cartons vont dans le jaune maintenant avec la nouvelle réforme.',
    parentId: null,
    likesCount: 1,
    isLikedByMe: false,
    createdAt: '2025-03-27T12:00:00Z',
    updatedAt: '2025-03-27T12:00:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000008',
    postId: POST_TRI,
    authorId: MOREAU_ID,
    authorName: 'Sophie Moreau',
    authorRole: 'conseil',
    content: 'Je confirme : depuis janvier 2025, tous les emballages (y compris cartons) vont dans le bac jaune. Le local cartons ne sert plus que pour les gros cartons (type déménagement).',
    parentId: 'wc000001-0000-4000-a000-000000000007',
    likesCount: 6,
    isLikedByMe: true,
    createdAt: '2025-03-27T13:15:00Z',
    updatedAt: '2025-03-27T13:15:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000009',
    postId: POST_TRI,
    authorId: GARCIA_ID,
    authorName: 'Maria Garcia',
    authorRole: 'copro',
    content: 'Merci Sophie, c\'est plus clair maintenant !',
    parentId: null,
    likesCount: 0,
    isLikedByMe: false,
    createdAt: '2025-03-27T14:00:00Z',
    updatedAt: '2025-03-27T14:00:00Z',
  },

  // ── Commentaires sur POST_BRUIT (2 commentaires) ──────────────────────
  {
    id: 'wc000001-0000-4000-a000-000000000010',
    postId: POST_BRUIT,
    authorId: DUPONT_ID,
    authorName: 'Jean Dupont',
    authorRole: 'copro',
    content: 'Même constat au 2ème. Perçage à 22h la semaine dernière. Le règlement interdit les travaux bruyants après 20h.',
    parentId: null,
    likesCount: 5,
    isLikedByMe: true,
    createdAt: '2025-03-26T08:00:00Z',
    updatedAt: '2025-03-26T08:00:00Z',
  },
  {
    id: 'wc000001-0000-4000-a000-000000000011',
    postId: POST_BRUIT,
    authorId: SYNDIC_ID,
    authorName: 'Marie Laurent',
    authorRole: 'syndic',
    content: 'J\'ai envoyé un courrier de rappel au propriétaire du lot 14A avec copie du règlement intérieur. Si ça continue, on passera aux mises en demeure.',
    parentId: null,
    likesCount: 8,
    isLikedByMe: false,
    createdAt: '2025-03-26T10:00:00Z',
    updatedAt: '2025-03-26T10:00:00Z',
  },
];
