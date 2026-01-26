'use client';

import { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Check, Shield } from 'lucide-react';
import { useCurrentUser } from '@/providers/CurrentUserProvider';
import { UserRole } from '@/types/enums';
import styles from './UserSwitcher.module.css';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SYNDIC]: 'Syndic',
  [UserRole.PRESIDENT_CS]: 'President CS',
  [UserRole.MEMBRE_CS]: 'Membre CS',
  [UserRole.COPROPRIETAIRE]: 'Coproprietaire',
  [UserRole.LOCATAIRE]: 'Locataire',
};

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '#EF4444',
  [UserRole.SYNDIC]: '#2563EB',
  [UserRole.PRESIDENT_CS]: '#F59E0B',
  [UserRole.MEMBRE_CS]: '#F59E0B',
  [UserRole.COPROPRIETAIRE]: '#10B981',
  [UserRole.LOCATAIRE]: '#6B7280',
};

export function UserSwitcher() {
  const { currentUser, availableUsers, switchUser, mounted } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted || !currentUser) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonText} />
      </div>
    );
  }

  const roleColor = ROLE_COLORS[currentUser.role as UserRole] || '#6B7280';

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className={styles.userAvatar} style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
          <User size={14} />
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {currentUser.prenom} {currentUser.nom}
          </span>
          <span className={styles.userRole} style={{ color: roleColor }}>
            {ROLE_LABELS[currentUser.role as UserRole]}
          </span>
        </div>
        <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.dropdownHeader}>
            <Shield size={14} />
            <span>Changer de profil (dev)</span>
          </div>
          <div className={styles.dropdownList}>
            {availableUsers.map(user => {
              const userRoleColor = ROLE_COLORS[user.role as UserRole] || '#6B7280';
              const isSelected = user.id === currentUser.id;

              return (
                <button
                  key={user.id}
                  className={`${styles.userOption} ${isSelected ? styles.userOptionActive : ''}`}
                  onClick={() => {
                    switchUser(user.id);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div
                    className={styles.optionAvatar}
                    style={{ backgroundColor: `${userRoleColor}20`, color: userRoleColor }}
                  >
                    <User size={12} />
                  </div>
                  <div className={styles.optionInfo}>
                    <span className={styles.optionName}>
                      {user.prenom} {user.nom}
                    </span>
                    <span className={styles.optionRole} style={{ color: userRoleColor }}>
                      {ROLE_LABELS[user.role as UserRole]}
                    </span>
                  </div>
                  {isSelected && <Check size={14} className={styles.checkIcon} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
