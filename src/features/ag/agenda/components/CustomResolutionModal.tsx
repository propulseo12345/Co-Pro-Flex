'use client';

import { useState } from 'react';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import styles from '@/app/(dashboard)/ag/[id]/agenda/agenda.module.css';

interface CustomResolutionModalProps {
  onSave: (titre: string, texte: string, majorite: MajorityType) => void;
  onClose: () => void;
}

export function CustomResolutionModal({ onSave, onClose }: CustomResolutionModalProps) {
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [majorite, setMajorite] = useState<MajorityType>('ART_24');

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Resolution personnalisee</h2>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          className={styles.modalInput}
        />
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Texte"
          rows={6}
          className={styles.modalTextarea}
        />
        <select
          value={majorite}
          onChange={(e) => setMajorite(e.target.value as MajorityType)}
          className={styles.modalSelect}
        >
          {Object.entries(MAJORITES).map(([key, maj]) => (
            <option key={key} value={key}>{maj.nom}</option>
          ))}
        </select>
        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button
            onClick={() => onSave(titre, texte, majorite)}
            className="btn btn-primary"
            disabled={!titre.trim()}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
