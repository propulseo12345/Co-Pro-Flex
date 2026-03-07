'use client';

import { ArrowLeft, Home, CheckCircle } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface FooterProps {
  isSigned: boolean;
  onBack: () => void;
  onFinish: () => void;
  onFinalisation?: () => void;
}

export function Footer({ isSigned, onBack, onFinish, onFinalisation }: FooterProps) {
  return (
    <div className={styles.footer}>
      <button onClick={onBack} className="btn btn-secondary">
        <ArrowLeft size={16} aria-hidden="true" />
        Retour à la session
      </button>
      {isSigned && (
        <>
          {onFinalisation && (
            <button onClick={onFinalisation} className="btn btn-secondary">
              <CheckCircle size={16} aria-hidden="true" />
              Finaliser les décisions
            </button>
          )}
          <button onClick={onFinish} className="btn btn-primary">
            Terminer
            <Home size={16} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
