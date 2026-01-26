import type { Signataire } from './types';

export const INITIAL_SIGNATAIRES: Signataire[] = [
  { id: '1', role: 'president', roleLabel: 'Président de séance', nom: '', prenom: '', email: '', telephone: '' },
  { id: '2', role: 'secretaire', roleLabel: 'Secrétaire de séance', nom: '', prenom: '', email: '', telephone: '' },
  { id: '3', role: 'scrutateur', roleLabel: 'Scrutateur', nom: '', prenom: '', email: '', telephone: '' },
];

export const LOAD_TIMEOUT_MS = 10000;
