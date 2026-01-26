/**
 * Mock Data - Users
 *
 * @source Migré depuis src/providers/CurrentUserProvider.tsx
 * @created 2025-01-19
 *
 * Relations:
 * - Aucune FK (entité racine)
 *
 * Notes:
 * - 6 utilisateurs avec différents rôles pour tester les permissions
 * - Le syndic est l'utilisateur par défaut
 */

import { BaseEntity, UserRole } from '../types';

// ============================================
// TYPE USER
// ============================================

export interface User extends BaseEntity {
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  telephone?: string;
  derniere_connexion?: string;
  preferences?: {
    notifications_email: boolean;
    notifications_push: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

// ============================================
// IDS PRÉGÉNÉRÉS (pour cohérence des FK)
// ============================================

export const USER_IDS = {
  SYNDIC: 'usr_f47ac10b-58cc-4372-a567-0e02b2c3d479',
  PRESIDENT_CS: 'usr_7c9e6679-7425-40de-944b-e07fc1f90ae7',
  MEMBRE_CS: 'usr_550e8400-e29b-41d4-a716-446655440001',
  COPRO_1: 'usr_6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  COPRO_2: 'usr_6ba7b811-9dad-11d1-80b4-00c04fd430c9',
  LOCATAIRE: 'usr_f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
  ADMIN: 'usr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const USERS_MOCK: User[] = [
  {
    id: USER_IDS.SYNDIC,
    email: 'syndic@cabinet-martin.fr',
    nom: 'MARTIN',
    prenom: 'Cabinet',
    role: UserRole.SYNDIC,
    is_active: true,
    telephone: '01 45 67 89 00',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
    derniere_connexion: '2025-01-19T09:30:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: true,
      theme: 'light',
    },
  },
  {
    id: USER_IDS.PRESIDENT_CS,
    email: 'jean.dupont@email.fr',
    nom: 'DUPONT',
    prenom: 'Jean',
    role: UserRole.PRESIDENT_CS,
    is_active: true,
    telephone: '06 12 34 56 78',
    created_at: '2021-06-15T00:00:00Z',
    updated_at: '2025-01-18T14:30:00Z',
    derniere_connexion: '2025-01-18T14:30:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: false,
      theme: 'system',
    },
  },
  {
    id: USER_IDS.MEMBRE_CS,
    email: 'marie.bernard@email.fr',
    nom: 'BERNARD',
    prenom: 'Marie',
    role: UserRole.MEMBRE_CS,
    is_active: true,
    telephone: '06 23 45 67 89',
    created_at: '2022-03-10T00:00:00Z',
    updated_at: '2025-01-15T11:00:00Z',
    derniere_connexion: '2025-01-15T11:00:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: true,
      theme: 'dark',
    },
  },
  {
    id: USER_IDS.COPRO_1,
    email: 'paul.leroy@gmail.com',
    nom: 'LEROY',
    prenom: 'Paul',
    role: UserRole.COPROPRIETAIRE,
    is_active: true,
    telephone: '06 34 56 78 90',
    created_at: '2019-09-01T00:00:00Z',
    updated_at: '2025-01-10T16:45:00Z',
    derniere_connexion: '2025-01-10T16:45:00Z',
    preferences: {
      notifications_email: false,
      notifications_push: true,
      theme: 'light',
    },
  },
  {
    id: USER_IDS.COPRO_2,
    email: 'sophie.durand@gmail.com',
    nom: 'DURAND',
    prenom: 'Sophie',
    role: UserRole.COPROPRIETAIRE,
    is_active: true,
    telephone: '06 45 67 89 01',
    created_at: '2020-05-15T00:00:00Z',
    updated_at: '2025-01-12T09:20:00Z',
    derniere_connexion: '2025-01-12T09:20:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: false,
      theme: 'system',
    },
  },
  {
    id: USER_IDS.LOCATAIRE,
    email: 'thomas.petit@gmail.com',
    nom: 'PETIT',
    prenom: 'Thomas',
    role: UserRole.LOCATAIRE,
    is_active: true,
    telephone: '06 56 78 90 12',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2025-01-05T18:00:00Z',
    derniere_connexion: '2025-01-05T18:00:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: true,
      theme: 'light',
    },
  },
  {
    id: USER_IDS.ADMIN,
    email: 'support@coproflex.fr',
    nom: 'Support',
    prenom: 'CoProFlex',
    role: UserRole.ADMIN,
    is_active: true,
    telephone: '01 23 45 67 89',
    created_at: '2019-01-01T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
    derniere_connexion: '2025-01-19T10:00:00Z',
    preferences: {
      notifications_email: true,
      notifications_push: true,
      theme: 'light',
    },
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const USERS_STATS = {
  total: USERS_MOCK.length,
  by_role: {
    [UserRole.SYNDIC]: USERS_MOCK.filter((u) => u.role === UserRole.SYNDIC).length,
    [UserRole.PRESIDENT_CS]: USERS_MOCK.filter((u) => u.role === UserRole.PRESIDENT_CS).length,
    [UserRole.MEMBRE_CS]: USERS_MOCK.filter((u) => u.role === UserRole.MEMBRE_CS).length,
    [UserRole.COPROPRIETAIRE]: USERS_MOCK.filter((u) => u.role === UserRole.COPROPRIETAIRE).length,
    [UserRole.LOCATAIRE]: USERS_MOCK.filter((u) => u.role === UserRole.LOCATAIRE).length,
  },
  actifs: USERS_MOCK.filter((u) => u.is_active).length,
};

// ============================================
// TABLE DE CORRESPONDANCE (ancien → nouveau ID)
// ============================================

export const USERS_ID_MAP: Record<string, string> = {
  'user-syndic': USER_IDS.SYNDIC,
  'user-president-cs': USER_IDS.PRESIDENT_CS,
  'user-membre-cs': USER_IDS.MEMBRE_CS,
  'user-copro-1': USER_IDS.COPRO_1,
  'user-copro-2': USER_IDS.COPRO_2,
  'user-locataire': USER_IDS.LOCATAIRE,
};

// ============================================
// HELPERS
// ============================================

/**
 * Récupère un utilisateur par son ID
 */
export function getUserById(id: string): User | undefined {
  return USERS_MOCK.find((u) => u.id === id);
}

/**
 * Récupère un utilisateur par son email
 */
export function getUserByEmail(email: string): User | undefined {
  return USERS_MOCK.find((u) => u.email === email);
}

/**
 * Récupère les utilisateurs par rôle
 */
export function getUsersByRole(role: UserRole): User[] {
  return USERS_MOCK.filter((u) => u.role === role);
}

/**
 * Récupère l'utilisateur syndic par défaut
 */
export function getDefaultSyndicUser(): User {
  return USERS_MOCK.find((u) => u.role === UserRole.SYNDIC)!;
}
