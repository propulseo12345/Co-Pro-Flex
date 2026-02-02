'use client';

import { Plus, Check, X } from 'lucide-react';
import type { CleRepartition } from '../hooks/useInfoCoproPage';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

interface ClesRepartitionSectionProps {
  clesRepartition: CleRepartition[];
  nouvelleCle: { nom: string; visible: boolean };
  onShowForm: () => void;
  onHideForm: () => void;
  onUpdateNom: (nom: string) => void;
  onAjouter: () => void;
}

export function ClesRepartitionSection({
  clesRepartition,
  nouvelleCle,
  onShowForm,
  onHideForm,
  onUpdateNom,
  onAjouter,
}: ClesRepartitionSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Cles de repartition</h2>
        <button
          onClick={onShowForm}
          className="btn btn-secondary"
        >
          <Plus size={16} aria-hidden="true" />
          Ajouter une cle de repartition
        </button>
      </div>

      {nouvelleCle.visible && (
        <div className={styles.addCleForm}>
          <input
            type="text"
            placeholder="Nom de la cle (ex: Chauffage, Batiment A...)"
            value={nouvelleCle.nom}
            onChange={(e) => onUpdateNom(e.target.value)}
            className={styles.input}
            autoFocus
          />
          <div className={styles.addCleActions}>
            <button onClick={onAjouter} className="btn btn-primary">
              <Check size={16} aria-hidden="true" />
              Ajouter
            </button>
            <button
              onClick={onHideForm}
              className="btn btn-secondary"
            >
              <X size={16} aria-hidden="true" />
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className={styles.clesList}>
        {clesRepartition.map(cle => (
          <div key={cle.id} className={styles.cleBadge}>
            {cle.nom}
          </div>
        ))}
      </div>
    </section>
  );
}
