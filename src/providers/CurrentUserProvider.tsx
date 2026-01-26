'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { UserRole } from '@/types/enums';
import type { IUser } from '@/types/models/user';

/**
 * Utilisateurs mock pour les tests (avant Supabase)
 */
const MOCK_USERS: IUser[] = [
  {
    id: 'user-syndic',
    email: 'syndic@cabinet-martin.fr',
    nom: 'MARTIN',
    prenom: 'Cabinet',
    role: UserRole.SYNDIC,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'user-president-cs',
    email: 'jean.dupont@email.fr',
    nom: 'DUPONT',
    prenom: 'Jean',
    role: UserRole.PRESIDENT_CS,
    isActive: true,
    createdAt: new Date('2021-06-15'),
    updatedAt: new Date(),
  },
  {
    id: 'user-membre-cs',
    email: 'marie.bernard@email.fr',
    nom: 'BERNARD',
    prenom: 'Marie',
    role: UserRole.MEMBRE_CS,
    isActive: true,
    createdAt: new Date('2022-03-10'),
    updatedAt: new Date(),
  },
  {
    id: 'user-copro-1',
    email: 'paul.leroy@gmail.com',
    nom: 'LEROY',
    prenom: 'Paul',
    role: UserRole.COPROPRIETAIRE,
    isActive: true,
    createdAt: new Date('2019-09-01'),
    updatedAt: new Date(),
  },
  {
    id: 'user-copro-2',
    email: 'sophie.durand@gmail.com',
    nom: 'DURAND',
    prenom: 'Sophie',
    role: UserRole.COPROPRIETAIRE,
    isActive: true,
    createdAt: new Date('2020-05-15'),
    updatedAt: new Date(),
  },
  {
    id: 'user-locataire',
    email: 'thomas.petit@gmail.com',
    nom: 'PETIT',
    prenom: 'Thomas',
    role: UserRole.LOCATAIRE,
    isActive: true,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date(),
  },
];

interface CurrentUserContextType {
  currentUser: IUser | null;
  isAuthenticated: boolean;
  switchUser: (userId: string) => void;
  availableUsers: IUser[];
  logout: () => void;
  mounted: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

const STORAGE_KEY = 'coproflex-current-user';

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUserId = localStorage.getItem(STORAGE_KEY);
    if (savedUserId) {
      const user = MOCK_USERS.find(u => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
        return;
      }
    }
    // Default: Syndic
    setCurrentUser(MOCK_USERS[0]);
  }, []);

  useEffect(() => {
    if (mounted && currentUser) {
      localStorage.setItem(STORAGE_KEY, currentUser.id);
    }
  }, [currentUser, mounted]);

  const switchUser = useCallback((userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <CurrentUserContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        switchUser,
        availableUsers: MOCK_USERS,
        logout,
        mounted,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  return context;
}

/**
 * Liste des utilisateurs disponibles pour les tests
 */
export { MOCK_USERS };
