import { RapportActiviteCS } from '@/types/models/conseil-syndical';

export interface MembreCS {
  id: string;
  nom: string;
  prenom: string;
  role: 'president' | 'secretaire' | 'tresorier' | 'membre';
  email: string;
}

export const MOCK_MEMBRES: MembreCS[] = [
  { id: '1', nom: 'Martin', prenom: 'Pierre', role: 'president', email: 'p.martin@email.com' },
  { id: '2', nom: 'Dupont', prenom: 'Marie', role: 'secretaire', email: 'm.dupont@email.com' },
  { id: '3', nom: 'Bernard', prenom: 'Jean', role: 'tresorier', email: 'j.bernard@email.com' },
  { id: '4', nom: 'Lambert', prenom: 'Sophie', role: 'membre', email: 's.lambert@email.com' },
];

export const MOCK_RAPPORTS: RapportActiviteCS[] = [
  {
    id: 'rapport-1',
    conseilSyndicalId: 'cs-1',
    coproprieteId: 'copro-1',
    periodeDebut: new Date('2023-06-01'),
    periodeFin: new Date('2024-05-31'),
    titre: 'Rapport d\'activité 2023-2024',
    introduction: 'Présentation des activités du Conseil Syndical pour l\'exercice 2023-2024.',
    contenu: '',
    contenuBrut: '',
    sections: [],
    annexes: [],
    statut: 'brouillon',
    auteurId: '1',
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-20'),
  },
  {
    id: 'rapport-2',
    conseilSyndicalId: 'cs-1',
    coproprieteId: 'copro-1',
    periodeDebut: new Date('2022-06-01'),
    periodeFin: new Date('2023-05-31'),
    titre: 'Rapport d\'activité 2022-2023',
    introduction: 'Présentation des activités du Conseil Syndical pour l\'exercice 2022-2023.',
    contenu: 'Contenu détaillé du rapport...',
    contenuBrut: 'Contenu détaillé du rapport...',
    sections: [],
    annexes: [{ id: 'a1', rapportId: 'rapport-2', nom: 'Audit comptable', type: 'document', ordre: 1 }],
    statut: 'publie',
    agId: 'ag-2023',
    auteurId: '1',
    createdAt: new Date('2023-04-10'),
    updatedAt: new Date('2023-05-15'),
  },
];
