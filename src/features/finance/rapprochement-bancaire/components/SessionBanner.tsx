'use client';

import { Shield, FileCheck, Lock } from 'lucide-react';
import type { SessionRapprochement } from '../domain/types';
import { MOIS_FR } from '../domain/constants';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface SessionBannerProps {
  session: SessionRapprochement;
}

export function SessionBanner({ session }: SessionBannerProps) {
  return (
    <div className={`${styles.sessionBanner} ${session.statut === 'CERTIFIE' ? styles.sessionCertifiee : ''}`}>
      <div className={styles.sessionInfo}>
        {session.statut === 'CERTIFIE' ? (
          <Shield size={24} className={styles.sessionIconSuccess} />
        ) : (
          <FileCheck size={24} className={styles.sessionIcon} />
        )}
        <div>
          <span className={styles.sessionTitle}>
            {session.statut === 'CERTIFIE'
              ? `Rapprochement certifié - ${MOIS_FR[session.mois]} ${session.annee}`
              : `Rapprochement en cours - ${MOIS_FR[session.mois]} ${session.annee}`
            }
          </span>
          {session.statut === 'CERTIFIE' && (
            <span className={styles.sessionDetail}>
              Certifié par {session.certifiePar} le {new Date(session.dateCertification!).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>
      {session.statut === 'CERTIFIE' && (
        <span className={styles.certifiedBadge}>
          <Lock size={16} /> Certifié
        </span>
      )}
    </div>
  );
}
