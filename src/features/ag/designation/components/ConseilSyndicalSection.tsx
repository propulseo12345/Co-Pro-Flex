'use client';

import { UserPlus, Users } from 'lucide-react';
import type { RoleType } from '@/components/features/ag/RoleSelect';
import styles from '@/app/(dashboard)/ag/[id]/designation-roles/designation-roles.module.css';

interface MembreConseil {
  nom: string;
  type: 'TITULAIRE' | 'SUPPLEANT';
  dateDesignation: string;
}

interface ConseilSyndicalSectionProps {
  membres: MembreConseil[] | undefined;
  onAddTitulaire: () => void;
  onAddSuppleant: () => void;
  onRemoveMembre: (index: number) => void;
}

export function ConseilSyndicalSection({
  membres,
  onAddTitulaire,
  onAddSuppleant,
  onRemoveMembre,
}: ConseilSyndicalSectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Membres du conseil syndical</h2>

      <div className={styles.conseilSection}>
        <div className={styles.conseilActions}>
          <button onClick={onAddTitulaire} className="btn btn-primary">
            <UserPlus size={16} aria-hidden="true" />
            Ajouter un titulaire
          </button>
          <button onClick={onAddSuppleant} className="btn btn-secondary">
            <UserPlus size={16} aria-hidden="true" />
            Ajouter un suppléant
          </button>
        </div>

        {membres && membres.length > 0 ? (
          <div className={styles.membresList}>
            {membres.map((membre, index) => (
              <div key={index} className={styles.membreCard}>
                <div className={styles.membreInfo}>
                  <div className={styles.membreName}>{membre.nom}</div>
                  <div className={styles.membreType}>
                    {membre.type === 'TITULAIRE' ? 'Titulaire' : 'Suppléant'}
                  </div>
                  <div className={styles.membreDate}>
                    {new Date(membre.dateDesignation).toLocaleString('fr-FR')}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveMembre(index)}
                  className="btn btn-sm btn-danger"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Users size={48} aria-hidden="true" />
            <p>Aucun membre du conseil syndical désigné</p>
          </div>
        )}
      </div>
    </div>
  );
}
