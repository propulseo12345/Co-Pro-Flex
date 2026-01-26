/**
 * Articles de vote (conformité loi française copropriété)
 */
export enum VotingArticle {
  ARTICLE_24 = 'ARTICLE_24',     // Majorité simple des présents
  ARTICLE_25 = 'ARTICLE_25',     // Majorité absolue (50% + 1 de tous)
  ARTICLE_25_1 = 'ARTICLE_25_1', // Passerelle (re-vote en 24 si échec 25)
  ARTICLE_26 = 'ARTICLE_26',     // Double majorité (2/3 tantièmes + majorité copros)
  ARTICLE_26_1 = 'ARTICLE_26_1', // Passerelle article 26
  UNANIMITE = 'UNANIMITE'        // 100% des tantièmes
}

/**
 * Valeurs de vote possibles
 */
export enum VoteValue {
  POUR = 'POUR',
  CONTRE = 'CONTRE',
  ABSTENTION = 'ABSTENTION',
  NON_VOTE = 'NON_VOTE'
}

/**
 * Description des articles de vote
 */
export const VOTING_ARTICLE_DESCRIPTIONS: Record<VotingArticle, string> = {
  [VotingArticle.ARTICLE_24]: 'Majorité simple des voix des copropriétaires présents ou représentés',
  [VotingArticle.ARTICLE_25]: 'Majorité absolue de tous les copropriétaires (50% + 1 voix)',
  [VotingArticle.ARTICLE_25_1]: 'Passerelle : si non atteinte à l\'article 25, nouveau vote à l\'article 24',
  [VotingArticle.ARTICLE_26]: 'Double majorité : 2/3 des tantièmes + majorité des copropriétaires',
  [VotingArticle.ARTICLE_26_1]: 'Passerelle : si non atteinte à l\'article 26, nouveau vote à l\'article 25',
  [VotingArticle.UNANIMITE]: 'Unanimité de tous les copropriétaires (100% des tantièmes)'
};

/**
 * Types d'AG
 */
export enum AGType {
  ORDINAIRE = 'ORDINAIRE',
  EXTRAORDINAIRE = 'EXTRAORDINAIRE',
  URGENTE = 'URGENTE'
}

/**
 * Mode de présence
 */
export enum PresenceMode {
  PRESENT = 'PRESENT',
  REPRESENTE = 'REPRESENTE',
  ABSENT = 'ABSENT',
  VOTE_CORRESPONDANCE = 'VOTE_CORRESPONDANCE'
}

/**
 * Types de majorité (legacy compatible)
 */
export enum TypeMajorite {
  MAJORITE_SIMPLE = 'MAJORITE_SIMPLE',
  MAJORITE_ABSOLUE = 'MAJORITE_ABSOLUE',
  DOUBLE_MAJORITE = 'DOUBLE_MAJORITE',
  UNANIMITE = 'UNANIMITE'
}

/**
 * Types de passerelle
 */
export enum TypePasserelle {
  PASSERELLE_25_1 = 'PASSERELLE_25_1',
  PASSERELLE_26_1 = 'PASSERELLE_26_1'
}

/**
 * Résultat de vote
 */
export enum ResultatVote {
  ADOPTEE = 'ADOPTEE',
  REJETEE = 'REJETEE',
  AJOURNEE = 'AJOURNEE'
}
