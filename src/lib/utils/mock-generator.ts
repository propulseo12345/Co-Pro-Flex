/**
 * Générateur de données mockées pour tests de charge
 * Permet de générer des jeux de données de 8/50/200 copropriétaires
 */

import type { Coproprietaire } from '@/types';

// Noms de famille français courants
const NOMS = [
  'MARTIN', 'BERNARD', 'THOMAS', 'PETIT', 'ROBERT', 'RICHARD', 'DURAND', 'DUBOIS',
  'MOREAU', 'LAURENT', 'SIMON', 'MICHEL', 'LEFEBVRE', 'LEROY', 'ROUX', 'DAVID',
  'BERTRAND', 'MOREL', 'FOURNIER', 'GIRARD', 'BONNET', 'DUPONT', 'LAMBERT', 'FONTAINE',
  'ROUSSEAU', 'VINCENT', 'MULLER', 'LEFEVRE', 'FAURE', 'ANDRE', 'MERCIER', 'BLANC',
  'GUERIN', 'BOYER', 'GARNIER', 'CHEVALIER', 'FRANCOIS', 'LEGRAND', 'GAUTHIER', 'GARCIA',
  'PERRIN', 'ROBIN', 'CLEMENT', 'MORIN', 'NICOLAS', 'HENRY', 'ROUSSEL', 'MATHIEU',
];

const PRENOMS = [
  'Marie', 'Jean', 'Pierre', 'Sophie', 'Michel', 'Françoise', 'Philippe', 'Catherine',
  'André', 'Anne', 'Jacques', 'Monique', 'Bernard', 'Nathalie', 'Patrick', 'Isabelle',
  'Daniel', 'Sylvie', 'Claude', 'Christine', 'Alain', 'Martine', 'René', 'Nicole',
  'Paul', 'Véronique', 'Henri', 'Brigitte', 'François', 'Dominique', 'Robert', 'Elisabeth',
  'Marc', 'Laurence', 'Christian', 'Pascale', 'Louis', 'Sandrine', 'Gilles', 'Valérie',
  'Eric', 'Corinne', 'Bruno', 'Carole', 'Olivier', 'Céline', 'Laurent', 'Stéphanie',
];

const RUES = [
  'rue de la Paix', 'avenue Victor Hugo', 'boulevard Haussmann', 'rue du Commerce',
  'place de la République', 'rue des Lilas', 'avenue des Champs-Élysées', 'rue Pasteur',
  'boulevard Saint-Germain', 'rue de Rivoli', 'avenue Foch', 'rue de la Liberté',
  'place du Marché', 'rue Jean Jaurès', 'avenue Gambetta', 'rue Nationale',
];

const VILLES = [
  { ville: 'Paris', codePostal: '75' },
  { ville: 'Lyon', codePostal: '69' },
  { ville: 'Marseille', codePostal: '13' },
  { ville: 'Toulouse', codePostal: '31' },
  { ville: 'Nice', codePostal: '06' },
  { ville: 'Nantes', codePostal: '44' },
  { ville: 'Strasbourg', codePostal: '67' },
  { ville: 'Montpellier', codePostal: '34' },
  { ville: 'Bordeaux', codePostal: '33' },
  { ville: 'Lille', codePostal: '59' },
];

// Types de lots
const BATIMENTS = ['A', 'B', 'C', 'D', 'E'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefixes = ['06', '07'];
  const prefix = randomElement(prefixes);
  const rest = Array.from({ length: 4 }, () =>
    String(Math.floor(Math.random() * 100)).padStart(2, '0')
  ).join(' ');
  return `${prefix} ${rest}`;
}

function generateEmail(prenom: string, nom: string): string {
  const domains = ['example.fr', 'mail.fr', 'email.com', 'copro.fr'];
  return `${prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${nom.toLowerCase()}@${randomElement(domains)}`;
}

/**
 * Génère un copropriétaire mock
 */
function generateCoproprietaire(index: number, totalTantiemes: number, count: number): Coproprietaire {
  const prenom = randomElement(PRENOMS);
  const nom = randomElement(NOMS);
  const villeData = randomElement(VILLES);
  const batiment = BATIMENTS[index % BATIMENTS.length];
  const etage = Math.floor((index % 20) / 2);
  const porte = (index % 2) + 1;

  // Répartition des tantièmes : on vise un total de 1000 (ou totalTantiemes)
  // Distribution aléatoire mais cohérente
  const baseTantiemes = Math.floor(totalTantiemes / count);
  const variation = Math.floor(baseTantiemes * 0.5);
  const tantiemes = baseTantiemes + Math.floor(Math.random() * variation * 2) - variation;

  return {
    id: `gen-${index + 1}`,
    nom: `${prenom} ${nom}`,
    lot: `${batiment}${etage}${porte}`,
    email: generateEmail(prenom, nom),
    telephone: generatePhone(),
    adressePostale: {
      rue: `${Math.floor(Math.random() * 200) + 1} ${randomElement(RUES)}`,
      codePostal: `${villeData.codePostal}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      ville: villeData.ville,
    },
    tantiemes: Math.max(10, tantiemes), // Minimum 10 tantièmes
    accepteAvisElectronique: Math.random() > 0.2, // 80% acceptent
  };
}

/**
 * Types de jeux de données disponibles
 */
export type MockDatasetSize = 'small' | 'medium' | 'large';

export interface MockDatasetConfig {
  size: MockDatasetSize;
  count: number;
  label: string;
}

export const MOCK_DATASET_CONFIGS: Record<MockDatasetSize, MockDatasetConfig> = {
  small: { size: 'small', count: 8, label: 'Petite copropriété (8 copropriétaires)' },
  medium: { size: 'medium', count: 50, label: 'Moyenne copropriété (50 copropriétaires)' },
  large: { size: 'large', count: 200, label: 'Grande copropriété (200 copropriétaires)' },
};

/**
 * Génère un jeu de données de copropriétaires
 * @param count Nombre de copropriétaires à générer
 * @param totalTantiemes Total des tantièmes (défaut: 1000)
 * @returns Tableau de copropriétaires
 */
export function generateMockCoproprietaires(
  count: number,
  totalTantiemes: number = 1000
): Coproprietaire[] {
  const coproprietaires: Coproprietaire[] = [];

  // Générer les copropriétaires
  for (let i = 0; i < count; i++) {
    coproprietaires.push(generateCoproprietaire(i, totalTantiemes, count));
  }

  // Ajuster les tantièmes pour atteindre exactement le total
  const currentTotal = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);
  const diff = totalTantiemes - currentTotal;

  if (diff !== 0) {
    // Distribuer la différence sur les premiers copropriétaires
    const abssDiff = Math.abs(diff);
    const sign = diff > 0 ? 1 : -1;
    for (let i = 0; i < abssDiff; i++) {
      coproprietaires[i % coproprietaires.length].tantiemes += sign;
    }
  }

  return coproprietaires;
}

/**
 * Génère un jeu de données prédéfini (small/medium/large)
 */
export function generateMockDataset(size: MockDatasetSize): Coproprietaire[] {
  const config = MOCK_DATASET_CONFIGS[size];
  return generateMockCoproprietaires(config.count);
}

/**
 * Vérifie si les données mockées actuelles sont générées
 */
export function isGeneratedMock(coproprietaires: Coproprietaire[]): boolean {
  return coproprietaires.length > 0 && coproprietaires[0].id.startsWith('gen-');
}

/**
 * Calcule les statistiques d'un jeu de données
 */
export function getMockDatasetStats(coproprietaires: Coproprietaire[]): {
  count: number;
  totalTantiemes: number;
  avgTantiemes: number;
  minTantiemes: number;
  maxTantiemes: number;
} {
  if (coproprietaires.length === 0) {
    return { count: 0, totalTantiemes: 0, avgTantiemes: 0, minTantiemes: 0, maxTantiemes: 0 };
  }

  const tantiemes = coproprietaires.map(c => c.tantiemes);
  const total = tantiemes.reduce((a, b) => a + b, 0);

  return {
    count: coproprietaires.length,
    totalTantiemes: total,
    avgTantiemes: Math.round(total / coproprietaires.length),
    minTantiemes: Math.min(...tantiemes),
    maxTantiemes: Math.max(...tantiemes),
  };
}
