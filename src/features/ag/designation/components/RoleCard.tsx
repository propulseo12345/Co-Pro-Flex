'use client';

import { Check, UserPlus, Briefcase } from 'lucide-react';
import type { RoleType } from '@/components/features/ag/RoleSelect';
import styles from '@/app/(dashboard)/ag/[id]/designation-roles/designation-roles.module.css';

interface RoleData {
  nom: string;
  dateDesignation: string;
  estGestionnaire?: boolean;
  representeSyndic?: string;
}

interface RoleCardProps {
  title: string;
  roleType: RoleType;
  roleData: RoleData | undefined;
  onDesignate: (role: RoleType) => void;
}

export function RoleCard({ title, roleType, roleData, onDesignate }: RoleCardProps) {
  return (
    <div className={styles.roleCard}>
      <div className={styles.roleHeader}>
        <h3 className={styles.roleTitle}>{title}</h3>
        {roleData && <Check size={20} className={styles.roleCheck} aria-hidden="true" />}
      </div>
      {roleData ? (
        <div className={styles.roleContent}>
          <div className={styles.roleName}>
            {roleData.nom}
            {roleData.estGestionnaire && (
              <span className={styles.gestionnaireBadge}>
                <Briefcase size={12} aria-hidden="true" />
                Gestionnaire
              </span>
            )}
          </div>
          {roleData.estGestionnaire && roleData.representeSyndic && (
            <div className={styles.representeSyndic}>
              Représentant le syndic {roleData.representeSyndic}
            </div>
          )}
          <div className={styles.roleDate}>
            Désigné le {new Date(roleData.dateDesignation).toLocaleString('fr-FR')}
          </div>
          <button
            onClick={() => onDesignate(roleType)}
            className="btn btn-sm btn-secondary"
          >
            Modifier
          </button>
        </div>
      ) : (
        <button
          onClick={() => onDesignate(roleType)}
          className="btn btn-primary"
        >
          <UserPlus size={16} aria-hidden="true" />
          Désigner
        </button>
      )}
    </div>
  );
}
