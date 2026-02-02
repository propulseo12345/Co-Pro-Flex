'use client';

import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface TitreSectionProps {
  titre: string;
  onTitreChange: (titre: string) => void;
}

export function TitreSection({ titre, onTitreChange }: TitreSectionProps) {
  return (
    <>
      {titre && (
        <div className={styles.titreAffichage}>
          <h2>{titre}</h2>
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="titre" className={styles.label}>
          Titre de la resolution
        </label>
        <input
          type="text"
          id="titre"
          className={styles.input}
          placeholder="Ex : Point d'information sur ..."
          value={titre}
          onChange={(e) => onTitreChange(e.target.value)}
          required
        />
      </div>
    </>
  );
}
