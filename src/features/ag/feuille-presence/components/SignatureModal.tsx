'use client';

import SignatureCanvas from '@/ui/SignatureCanvas';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface CoproprietaireData {
  id: string;
  displayName: string;
  email?: string | null;
  tantiemes?: number;
}

interface SignatureModalProps {
  copro: CoproprietaireData;
  initialSignature?: string;
  onSave: (signatureData: string) => void;
  onCancel: () => void;
}

export function SignatureModal({ copro, initialSignature, onSave, onCancel }: SignatureModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>
          Signature de {copro.displayName}
        </h2>
        <SignatureCanvas
          onSave={onSave}
          onCancel={onCancel}
          initialSignature={initialSignature}
        />
      </div>
    </div>
  );
}
