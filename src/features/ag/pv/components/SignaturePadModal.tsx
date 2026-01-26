'use client';

import { RefObject } from 'react';
import { PenTool, X, Trash2, CheckCircle } from 'lucide-react';
import type { Signataire } from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface SignaturePadModalProps {
  isOpen: boolean;
  currentSignataire: Signataire | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onStopDrawing: () => void;
}

export function SignaturePadModal({
  isOpen,
  currentSignataire,
  canvasRef,
  onClose,
  onClear,
  onSave,
  onStartDrawing,
  onDraw,
  onStopDrawing,
}: SignaturePadModalProps) {
  if (!isOpen || !currentSignataire) return null;

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.signaturePadModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <PenTool size={24} aria-hidden="true" />
            Signature - {currentSignataire.roleLabel}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className={styles.signaturePadInstructions}>
          {currentSignataire.prenom} {currentSignataire.nom}, veuillez signer dans la zone ci-dessous.
        </p>

        <div className={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            className={styles.signatureCanvas}
            onMouseDown={onStartDrawing}
            onMouseMove={onDraw}
            onMouseUp={onStopDrawing}
            onMouseLeave={onStopDrawing}
            onTouchStart={onStartDrawing}
            onTouchMove={onDraw}
            onTouchEnd={onStopDrawing}
          />
        </div>

        <div className={styles.signaturePadActions}>
          <button onClick={onClear} className="btn btn-secondary">
            <Trash2 size={16} aria-hidden="true" />
            Effacer
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={onSave} className="btn btn-primary">
            <CheckCircle size={16} aria-hidden="true" />
            Valider la signature
          </button>
        </div>
      </div>
    </div>
  );
}
