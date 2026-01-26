'use client';

import { CheckCircle, Send, PenTool, Home } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface SidebarProps {
  isSigned: boolean;
  onOpenSignatairesModal: () => void;
  onShowSignatairesModal: () => void;
  onFinish: () => void;
}

export function Sidebar({ isSigned, onOpenSignatairesModal, onShowSignatairesModal, onFinish }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className="card">
        <h3 className={styles.sidebarTitle}>Prochaines étapes</h3>
        <div className={styles.stepsList}>
          <div className={styles.stepItem}>
            <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
            <span>PV généré automatiquement</span>
          </div>
          {!isSigned ? (
            <>
              <div className={styles.stepItem}>
                <div className={styles.stepBullet}>2</div>
                <span>Recueillir les signatures</span>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepBullet}>3</div>
                <span>Diffuser le PV aux copropriétaires</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.stepItem}>
                <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
                <span>Signatures recueillies</span>
              </div>
              <div className={styles.stepItem}>
                <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
                <span>Prêt pour diffusion</span>
              </div>
            </>
          )}
        </div>
      </div>

      {!isSigned ? (
        <div className={styles.signatureButtons}>
          <button onClick={onOpenSignatairesModal} className="btn btn-primary w-full">
            <Send size={16} aria-hidden="true" />
            Envoyer pour signatures
          </button>
          <button onClick={onShowSignatairesModal} className="btn btn-secondary w-full">
            <PenTool size={16} aria-hidden="true" />
            Signature sur place
          </button>
        </div>
      ) : (
        <button onClick={onFinish} className="btn btn-primary w-full">
          <Home size={16} aria-hidden="true" />
          Terminer et retourner au dashboard
        </button>
      )}

      <div className={`${styles.infoBox} card`}>
        <h3>Information</h3>
        <p>Le PV doit être signé par le président de séance, le secrétaire et le scrutateur.</p>
        <p>Il sera ensuite notifié à tous les copropriétaires dans les délais légaux.</p>
      </div>
    </div>
  );
}
