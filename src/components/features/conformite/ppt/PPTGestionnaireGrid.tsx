'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { IPPTCopropriete } from '@/types';
import { TravauxPrevisionnelStatut } from '@/types/enums';
import { getStatutGlobal } from '@/hooks/usePPT';
import styles from './PPTGestionnaireGrid.module.css';

interface PPTGestionnaireGridProps {
  coproprietes: IPPTCopropriete[];
}

function getProgressPercent(travaux: IPPTCopropriete['travaux']): number {
  if (travaux.length === 0) return 0;
  const termines = travaux.filter(t => t.statut === TravauxPrevisionnelStatut.TERMINE).length;
  return Math.round((termines / travaux.length) * 100);
}

function getVariant(copro: IPPTCopropriete): { label: string; variant: 'success' | 'danger' | 'neutral' } {
  const statut = getStatutGlobal(copro);
  if (statut === 'A_COMPLETER') return { label: 'À compléter', variant: 'neutral' };
  if (statut === 'EN_RETARD') return { label: 'En retard', variant: 'danger' };
  return { label: 'À jour', variant: 'success' };
}

export function PPTGestionnaireGrid({ coproprietes }: PPTGestionnaireGridProps) {
  const router = useRouter();

  if (coproprietes.length === 0) {
    return (
      <div className={styles.empty}>
        <Building2 size={40} />
        <p>Aucune copropriété ne correspond aux filtres sélectionnés.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {coproprietes.map(copro => {
        const { label, variant } = getVariant(copro);
        const progress = getProgressPercent(copro.travaux);
        const byStatut = {
          aEtude: copro.travaux.filter(t => t.statut === TravauxPrevisionnelStatut.A_L_ETUDE).length,
          prevu: copro.travaux.filter(t => t.statut === TravauxPrevisionnelStatut.PREVU).length,
          vote: copro.travaux.filter(t => t.statut === TravauxPrevisionnelStatut.VOTE).length,
          enCours: copro.travaux.filter(t => t.statut === TravauxPrevisionnelStatut.EN_COURS).length,
          termine: copro.travaux.filter(t => t.statut === TravauxPrevisionnelStatut.TERMINE).length,
        };
        const variantCap = variant.charAt(0).toUpperCase() + variant.slice(1);

        return (
          <div key={copro.coproprieteId} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>{copro.nom}</div>
                <div className={styles.cardMeta}>{copro.nbLots} lots · {copro.travaux.length} travaux planifiés</div>
              </div>
              <span className={clsx(styles.badge, styles[`badge${variantCap}`])}>
                {variant === 'success' && <CheckCircle size={11} />}
                {variant === 'danger' && <AlertTriangle size={11} />}
                {variant === 'neutral' && <Clock size={11} />}
                {label}
              </span>
            </div>

            <div className={styles.statRow}>
              <span className={styles.stat}><span className={clsx(styles.statDot, styles.dotEtude)} />{byStatut.aEtude} à l&apos;étude</span>
              <span className={styles.stat}><span className={clsx(styles.statDot, styles.dotPrevu)} />{byStatut.prevu} prévus</span>
              <span className={styles.stat}><span className={clsx(styles.statDot, styles.dotVote)} />{byStatut.vote} votés</span>
              <span className={styles.stat}><span className={clsx(styles.statDot, styles.dotEnCours)} />{byStatut.enCours} en cours</span>
              <span className={styles.stat}><span className={clsx(styles.statDot, styles.dotTermine)} />{byStatut.termine} terminés</span>
            </div>

            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressLabel}>{progress}% terminé</span>
            </div>

            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => router.push(`/conformite/ppt/${copro.coproprieteId}`)}
            >
              Voir le PPT <ArrowRight size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
