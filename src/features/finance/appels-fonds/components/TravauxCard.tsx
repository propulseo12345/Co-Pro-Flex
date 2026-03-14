'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { TravauxProject } from '../types';
import { formatEuros } from '../utils';
import { EcheanceCard } from './EcheanceCard';
import styles from '../styles/Cards.module.css';

interface TravauxCardProps {
  project: TravauxProject;
  onEmit?: (callId: string) => void;
}

export function TravauxCard({ project, onEmit }: TravauxCardProps) {
  const router = useRouter();
  const currentCall = project.calls.find(
    c => c.status === 'issued' || c.status === 'partially_paid'
  );
  const unpaidCount = project.calls.reduce((sum, c) => sum + c.lines_unpaid_count, 0);

  return (
    <div className={styles.travauxCard}>
      <div className={styles.travauxHeader}>
        <div>
          <div className={styles.travauxTitle}>{project.budgetLabel}</div>
          <div className={styles.travauxOrigin}>
            {project.agDate && `AG du ${new Date(project.agDate).toLocaleDateString('fr-FR')} · `}
            {project.resolutionTitle}
            {project.article && ` · `}
            {project.article && (
              <span className={styles.travauxOriginLink}>Art. {project.article}</span>
            )}
            {` · Clé : ${project.repartitionKeyName}`}
          </div>
        </div>
        <div className={styles.travauxAmount}>
          <div className={styles.travauxTotal}>{formatEuros(project.totalAmount)}</div>
          <div className={styles.travauxSub}>Encaissé : {formatEuros(project.totalPaid)}</div>
        </div>
      </div>

      <div className={styles.travauxProgress}>
        <div className={styles.travauxProgressBar}>
          <div
            className={styles.travauxProgressFill}
            style={{ '--progress-width': `${project.recoveryRate}%` } as React.CSSProperties}
          />
        </div>
        <span className={styles.travauxPct}>{project.recoveryRate} %</span>
      </div>

      <div className={styles.echeancierLabel}>
        Échéancier — {project.calls.length} appel{project.calls.length > 1 ? 's' : ''}
      </div>
      <div className={styles.echeancierGrid}>
        {project.calls.map((call, i) => (
          <EcheanceCard key={call.id} call={call} index={i} total={project.calls.length} />
        ))}
      </div>

      <div className={styles.travauxActions}>
        <button className={styles.actionBtn}>📄 Avis PDF</button>
        {currentCall && (
          <button
            className={styles.actionBtnPrimary}
            onClick={() => router.push(`/finance/appels-fonds/${currentCall.id}`)}
          >
            📊 Détail
          </button>
        )}
        {unpaidCount > 0 && (
          <button className={styles.actionBtn}>Relancer ({unpaidCount})</button>
        )}
        <button className={styles.actionBtn}>📨 Envoyer</button>
      </div>
    </div>
  );
}
