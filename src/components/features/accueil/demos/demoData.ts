// Données marketing pour les mini-démos landing page

export const DEMO_DASHBOARD = {
  kpis: [
    { label: 'Solde global', value: '127 450 €', trend: '+3.2%', color: '#22c55e' },
    { label: 'Impayés', value: '4 280 €', trend: '-12%', color: '#ef4444' },
    { label: 'Prochaine AG', value: '15 Avr.', trend: '12 jours', color: '#3b82f6' },
    { label: 'Exercice', value: '2025-2026', trend: 'En cours', color: '#94a3b8' },
  ],
  priorities: [
    { label: 'Relance impayés T1 — Lot 12B', type: 'urgent' as const },
    { label: 'Contrat ascenseur — Renouvellement J-15', type: 'warning' as const },
    { label: 'Appel de fonds T2 à émettre', type: 'info' as const },
    { label: 'PV AG du 12/03 — Signature manquante', type: 'warning' as const },
  ],
  activity: [
    { text: 'Paiement reçu — M. Lefèvre (Lot 8A)', time: 'Il y a 2h', type: 'success' as const },
    { text: 'Facture validée — Jardinage Mars', time: 'Il y a 4h', type: 'info' as const },
    { text: 'Ordre de service créé — Fuite toiture', time: 'Hier', type: 'warning' as const },
  ],
};

export const DEMO_AG = {
  nextAg: {
    title: 'AG Ordinaire Annuelle 2026',
    date: '15 Avril 2026 — 18h30',
    location: 'Salle des fêtes, 12 rue de la Paix',
    status: 'Convoquée',
    quorum: '67%',
    resolutions: 14,
    participants: '38 / 52 copropriétaires',
  },
  stats: [
    { label: 'Total AG', value: '8', color: '#e2e8f0' },
    { label: 'Brouillons', value: '1', color: '#f59e0b' },
    { label: 'Convoquées', value: '1', color: '#3b82f6' },
    { label: 'Clôturées', value: '6', color: '#22c55e' },
  ],
  resolutions: [
    { num: 1, title: 'Approbation des comptes 2025', article: 'Art. 24' },
    { num: 2, title: 'Vote du budget prévisionnel 2026', article: 'Art. 24' },
    { num: 3, title: 'Travaux ravalement façade', article: 'Art. 25' },
    { num: 4, title: 'Remplacement chaudière collective', article: 'Art. 25' },
    { num: 5, title: 'Mandat du syndic', article: 'Art. 25' },
  ],
};

export const DEMO_FINANCE = {
  kpis: [
    { label: 'Budget total', value: '245 000 €', color: '#e2e8f0' },
    { label: 'Dépensé', value: '89 320 €', color: '#3b82f6' },
    { label: 'Disponible', value: '155 680 €', color: '#22c55e' },
    { label: 'Écart', value: '-2.1%', color: '#f59e0b' },
  ],
  postes: [
    { name: 'Entretien parties communes', budget: 42000, spent: 18200, pct: 43 },
    { name: 'Ascenseurs', budget: 28000, spent: 14000, pct: 50 },
    { name: 'Chauffage collectif', budget: 65000, spent: 22100, pct: 34 },
    { name: 'Assurances', budget: 18500, spent: 18500, pct: 100 },
    { name: 'Honoraires syndic', budget: 24000, spent: 12000, pct: 50 },
    { name: 'Eau', budget: 15000, spent: 4520, pct: 30 },
  ],
};

export const DEMO_MAINTENANCE = {
  kpis: [
    { label: 'Interventions', value: '24', color: '#e2e8f0' },
    { label: 'Planifiées', value: '3', color: '#3b82f6' },
    { label: 'En cours', value: '2', color: '#f59e0b' },
    { label: 'Terminées', value: '19', color: '#22c55e' },
  ],
  interventions: [
    { title: 'Remplacement pompe surpresseur', provider: 'Durand Plomberie', status: 'En cours', date: '22/03/2026', priority: 'high' as const },
    { title: 'Entretien espaces verts — Mars', provider: 'Vert & Co', status: 'Terminé', date: '18/03/2026', priority: 'normal' as const },
    { title: 'Inspection annuelle ascenseur', provider: 'Otis', status: 'Planifié', date: '02/04/2026', priority: 'normal' as const },
    { title: 'Réparation interphone bât. B', provider: 'Élec Express', status: 'En cours', date: '20/03/2026', priority: 'high' as const },
  ],
};

export const DEMO_DOCUMENTS = {
  folders: [
    { name: 'PV Assemblées', count: 12, icon: '📋' },
    { name: 'Règlement', count: 3, icon: '📜' },
    { name: 'Contrats', count: 8, icon: '📑' },
    { name: 'Diagnostics', count: 5, icon: '🔍' },
    { name: 'Comptabilité', count: 15, icon: '📊' },
  ],
  files: [
    { name: 'PV AG 12-03-2026.pdf', category: 'PV Assemblées', date: 'Il y a 12j', size: '2.4 MB' },
    { name: 'Budget prévisionnel 2026.pdf', category: 'Comptabilité', date: 'Il y a 18j', size: '890 KB' },
    { name: 'Contrat Otis 2024-2027.pdf', category: 'Contrats', date: 'Il y a 2 mois', size: '1.1 MB' },
    { name: 'DPE Bâtiment A.pdf', category: 'Diagnostics', date: 'Il y a 3 mois', size: '3.2 MB' },
  ],
};

export const DEMO_AG_VOTES = {
  resolutions: [
    { num: 1, title: 'Approbation des comptes 2025', article: 'Art. 24', pour: 78, contre: 15, abstention: 7, status: 'Adoptée' as const },
    { num: 2, title: 'Budget prévisionnel 2026', article: 'Art. 24', pour: 82, contre: 12, abstention: 6, status: 'Adoptée' as const },
    { num: 3, title: 'Ravalement façade nord', article: 'Art. 25', pour: 55, contre: 35, abstention: 10, status: 'Rejetée' as const },
    { num: 4, title: 'Remplacement chaudière collective', article: 'Art. 25', pour: 68, contre: 22, abstention: 10, status: 'Adoptée' as const },
    { num: 5, title: 'Mandat du syndic 2026-2029', article: 'Art. 25', pour: 71, contre: 20, abstention: 9, status: 'Adoptée' as const },
  ],
  summary: {
    total: 14,
    adoptees: 11,
    rejetees: 2,
    enCours: 1,
  },
};

export const DEMO_AG_PV = {
  sections: [
    { title: 'Ouverture de séance', content: 'Le président du conseil syndical ouvre la séance à 18h35. Le quorum est atteint avec 67% des tantièmes représentés.' },
    { title: 'Désignation du bureau', content: 'M. Martin est élu président de séance. Mme Duval est désignée secrétaire. M. Lefèvre est scrutateur.' },
    { title: 'Résolution n°1 — Approbation des comptes', content: 'Les comptes de l\'exercice 2025 sont approuvés à la majorité de l\'article 24 avec 78% des voix pour.' },
    { title: 'Résolution n°2 — Budget prévisionnel', content: 'Le budget prévisionnel 2026 de 245 000 € est voté à la majorité de l\'article 24.' },
  ],
  meta: {
    ag: 'AG Ordinaire Annuelle 2026',
    date: '15 Avril 2026',
    pages: 8,
    status: 'Prêt à signer',
    signataires: { fait: 2, total: 3 },
  },
};

export const DEMO_APPELS_FONDS = {
  kpis: [
    { label: 'Montant total', value: '245 000 €', color: '#e2e8f0' },
    { label: 'Encaissé', value: '183 200 €', color: '#22c55e' },
    { label: 'En attente', value: '57 520 €', color: '#f59e0b' },
    { label: 'Impayés', value: '4 280 €', color: '#ef4444' },
  ],
  echeancier: [
    { trimestre: 'T1 — Janv. 2026', montant: 61250, encaisse: 61250, taux: 100, status: 'Soldé' as const },
    { trimestre: 'T2 — Avr. 2026', montant: 61250, encaisse: 58700, taux: 96, status: 'En cours' as const },
    { trimestre: 'T3 — Juil. 2026', montant: 61250, encaisse: 42130, taux: 69, status: 'En cours' as const },
    { trimestre: 'T4 — Oct. 2026', montant: 61250, encaisse: 21120, taux: 34, status: 'À venir' as const },
  ],
};

export const DEMO_COMMUNICATION = {
  messages: [
    { from: 'Syndic', subject: 'Convocation AG — 15 Avril 2026', time: 'Il y a 2j', unread: true },
    { from: 'M. Lefèvre (8A)', subject: 'Question sur les charges T1', time: 'Il y a 3j', unread: false },
    { from: 'Conseil syndical', subject: 'CR réunion du 10/03', time: 'Il y a 5j', unread: false },
  ],
};
