'use client';

import { Paperclip, Lock } from 'lucide-react';
import { PieceJustificative } from '@/types/models/piece-justificative';
import styles from './PieceJustificativeCell.module.css';

interface PieceJustificativeCellProps {
  pieces: PieceJustificative[];
  onVoir: (piece: PieceJustificative) => void;
  peutVoir?: boolean;
}

export function PieceJustificativeCell({
  pieces,
  onVoir,
  peutVoir = true,
}: PieceJustificativeCellProps) {
  // Pas de pièces
  if (!pieces || pieces.length === 0) {
    return (
      <span className={styles.noPiece} title="Aucune pièce justificative">
        —
      </span>
    );
  }

  // Accès restreint
  if (!peutVoir) {
    return (
      <span className={styles.locked} title="Accès restreint">
        <Lock size={14} aria-hidden="true" />
      </span>
    );
  }

  // Une seule pièce
  if (pieces.length === 1) {
    const piece = pieces[0];

    return (
      <button
        type="button"
        className={styles.pieceBtn}
        onClick={(e) => {
          e.stopPropagation();
          onVoir(piece);
        }}
        title={`Voir : ${piece.nomFichier}`}
        aria-label={`Voir la pièce justificative ${piece.nomFichier}`}
      >
        <Paperclip size={14} className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>Voir</span>
      </button>
    );
  }

  // Plusieurs pièces
  return (
    <button
      type="button"
      className={styles.pieceBtn}
      onClick={(e) => {
        e.stopPropagation();
        onVoir(pieces[0]); // Ouvre la première, la modal permettra de naviguer
      }}
      title={`${pieces.length} pièces justificatives`}
      aria-label={`Voir ${pieces.length} pièces justificatives`}
    >
      <Paperclip size={14} className={styles.icon} aria-hidden="true" />
      <span className={styles.badge}>{pieces.length}</span>
    </button>
  );
}
