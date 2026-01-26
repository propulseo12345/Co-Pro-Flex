import { BaseEntity, ID } from '../common';
import { UserRole } from '../enums';

export interface IUser extends BaseEntity {
  email: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: Date;
}

export interface IUserCredentials {
  email: string;
  password: string;
}

export interface IUserSession {
  user: IUser;
  token: string;
  expiresAt: Date;
}

/**
 * Legacy User interface for backward compatibility
 */
export interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole | string;
  avatarUrl?: string;
}

/**
 * Access invitation
 */
export interface AccesInvitation {
  email: string;
  role: UserRole | string;
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'EXPIRE';
}

/**
 * Access level with permissions
 */
export interface NiveauAcces {
  role: UserRole | string;
  permissions: string[];
}
