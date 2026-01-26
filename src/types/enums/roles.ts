/**
 * Rôles des utilisateurs dans la copropriété
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  SYNDIC = 'SYNDIC',
  PRESIDENT_CS = 'PRESIDENT_CS',
  MEMBRE_CS = 'MEMBRE_CS',
  COPROPRIETAIRE = 'COPROPRIETAIRE',
  LOCATAIRE = 'LOCATAIRE'
}

/**
 * Permissions par rôle
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.SYNDIC]: ['ag:*', 'finance:*', 'maintenance:*', 'documents:*', 'coproprietaires:*'],
  [UserRole.PRESIDENT_CS]: ['ag:read', 'ag:vote', 'finance:read', 'documents:read', 'documents:cs'],
  [UserRole.MEMBRE_CS]: ['ag:read', 'ag:vote', 'finance:read', 'documents:read', 'documents:cs'],
  [UserRole.COPROPRIETAIRE]: ['ag:vote', 'documents:read', 'finance:read:own'],
  [UserRole.LOCATAIRE]: ['documents:read:limited']
};
