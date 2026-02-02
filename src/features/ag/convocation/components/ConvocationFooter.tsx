'use client';

import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/convocation/convocation.module.css';

interface ConvocationFooterProps {
  canValidate: boolean;
  canSend: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function ConvocationFooter({
  canValidate,
  canSend,
  onBack,
  onContinue,
}: ConvocationFooterProps) {
  return (
    <div className={styles.footer}>
      <button onClick={onBack} className="btn btn-secondary">
        <ArrowLeft size={16} aria-hidden="true" /> Retour
      </button>
      <button
        onClick={onContinue}
        className="btn btn-primary"
        disabled={!canValidate || !canSend}
      >
        <Send size={16} aria-hidden="true" /> Envoyer et continuer{' '}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
