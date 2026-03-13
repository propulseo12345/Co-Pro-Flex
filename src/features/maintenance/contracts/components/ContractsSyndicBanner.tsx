'use client';

import { Building2, Euro, Calendar, Settings } from 'lucide-react';
import type { ContratSyndic } from '@/types';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsSyndicBannerProps {
  contratSyndic: ContratSyndic | null;
  onEditSyndic: () => void;
  onSyndicAction: () => void;
}

export function ContractsSyndicBanner({
  contratSyndic,
  onEditSyndic,
  onSyndicAction,
}: ContractsSyndicBannerProps) {
  if (!contratSyndic) {
    return (
      <div className={styles.v2Syndic}>
        <div className={styles.v2SyndicAvatar}><Building2 size={17} /></div>
        <div className={styles.v2SyndicBody}>
          <span className={styles.v2SyndicName}>Syndic non configuré</span>
        </div>
        <button className={styles.v2SyndicBtn} onClick={onEditSyndic}>
          <Settings size={13} /> Configurer
        </button>
      </div>
    );
  }

  const dateFin = new Date(contratSyndic.dateFin);
  const dateDebut = new Date(contratSyndic.dateDebut);
  const now = new Date();
  const annees = Math.max(1, Math.round((dateFin.getTime() - dateDebut.getTime()) / (365 * 86400000)));
  const anneeEnCours = Math.min(annees, Math.max(1, now.getFullYear() - dateDebut.getFullYear() + 1));
  const joursRestants = Math.ceil((dateFin.getTime() - now.getTime()) / 86400000);
  const isActif = contratSyndic.statut === 'ACTIF';

  return (
    <div className={styles.v2Syndic}>
      <div className={styles.v2SyndicAvatar}><Building2 size={17} /></div>
      <div className={styles.v2SyndicBody}>
        <span className={styles.v2SyndicName}>{contratSyndic.nomSyndic}</span>
        <div className={styles.v2SyndicMeta}>
          <span><Euro size={11} /> {contratSyndic.montantAnnuel.toLocaleString('fr-FR')} €/an</span>
          <span><Calendar size={11} /> Éch. {dateFin.toLocaleDateString('fr-FR')}</span>
          <span>Année {anneeEnCours}/{annees}</span>
        </div>
      </div>
      <span className={isActif ? styles.v2SyndicBadgeActif : styles.v2SyndicBadgeWarning}>
        {isActif ? 'Actif' : 'À renouveler'}
      </span>
      {joursRestants <= 180 && joursRestants > 0 && (
        <button className={styles.v2SyndicBtn} onClick={onSyndicAction}>
          Préparer le renouvellement
        </button>
      )}
      <button className={styles.v2SyndicBtn} onClick={onEditSyndic}>Gérer</button>
    </div>
  );
}
