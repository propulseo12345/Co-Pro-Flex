'use client';

import { Download, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';
import type { IDPE, StatutDPE } from '@/types';
import { DPEEnergyScale } from './DPEEnergyScale';
import { DPEHistorique } from './DPEHistorique';
import styles from './DPEFicheDetail.module.css';

type AlertConfig = { msg: string; containerClass: string };

const STATUT_ALERT: Record<StatutDPE, AlertConfig> = {
  VALIDE:         { msg: 'DPE en cours de validité.',                                           containerClass: styles.alertInfo    },
  EXPIRE_BIENTOT: { msg: 'Le DPE expire dans moins de 6 mois. Planifiez le renouvellement.',   containerClass: styles.alertWarning },
  EXPIRE:         { msg: "DPE expiré — un nouveau diagnostic est obligatoire.",                 containerClass: styles.alertDanger  },
  MANQUANT:       { msg: 'Aucun DPE enregistré pour cette copropriété.',                        containerClass: styles.alertNeutral },
};

function AlertIcon({ statut }: { statut: StatutDPE }) {
  if (statut === 'VALIDE') return <Info size={15} />;
  return <AlertTriangle size={15} />;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

interface DPEFicheDetailProps {
  dpe: IDPE;
}

export function DPEFicheDetail({ dpe }: DPEFicheDetailProps) {
  const alert = STATUT_ALERT[dpe.statut];

  return (
    <div className={styles.layout}>
      {/* Colonne gauche */}
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Classe énergétique</div>
          <DPEEnergyScale classeActive={dpe.classeEnergie} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Informations DPE</div>
          <dl className={styles.fields}>
            <dt>Date diagnostic</dt><dd>{new Date(dpe.dateDiagnostic).toLocaleDateString('fr-FR')}</dd>
            <dt>Date expiration</dt><dd>{new Date(dpe.dateExpiration).toLocaleDateString('fr-FR')}</dd>
            <dt>Diagnostiqueur</dt><dd>{dpe.diagnostiqueur}</dd>
            <dt>N° ADEME</dt><dd className={styles.mono}>{dpe.numeroADEME}</dd>
            <dt>Conso. énergie</dt><dd className={styles.mono}>{dpe.consoEnergie} kWh/m²/an</dd>
            <dt>Émissions GES</dt><dd className={styles.mono}>{dpe.emissionsGES} kgCO₂/m²/an</dd>
          </dl>
          <div className={styles.actions}>
            <button type="button" className={styles.btnPrimary} aria-label="Télécharger le DPE en PDF">
              <Download size={14} /> Télécharger PDF
            </button>
            <button type="button" className={styles.btnGhost} aria-label="Planifier le renouvellement du DPE">
              <RotateCcw size={14} /> Planifier renouvellement
            </button>
          </div>
        </div>
      </div>

      {/* Colonne droite */}
      <div className={styles.right}>
        <div className={clsx(styles.alertBanner, alert.containerClass)}>
          <AlertIcon statut={dpe.statut} /> {alert.msg}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Travaux recommandés suite au DPE</div>
          {dpe.travauxRecommandes.length === 0 ? (
            <p className={styles.empty}>Aucun travail recommandé enregistré.</p>
          ) : (
            dpe.travauxRecommandes.map(t => (
              <div key={t.id} className={styles.travailRow}>
                <span>{t.titre}</span>
                <span className={styles.mono}>{formatEur(t.montantEstime)}</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Historique des DPE</div>
          <DPEHistorique historique={dpe.historique} />
        </div>
      </div>
    </div>
  );
}
