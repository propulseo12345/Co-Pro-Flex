'use client';

import { useState } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';
import { EtatDateViewerLegacy } from './EtatDateViewerLegacy';
import { EtatDateHeader } from './etat-date/EtatDateHeader';
import { EtatDateSummary } from './etat-date/EtatDateSummary';
import { EtatDatePartie } from './etat-date/EtatDatePartie';
import { EtatDateAnnexe } from './etat-date/EtatDateAnnexe';
import { EtatDateTransactions } from './etat-date/EtatDateTransactions';
import { EtatDateJsonViewer } from './etat-date/EtatDateJsonViewer';
import { generateEtatDatePDF } from '../pdf/generateEtatDatePDF';
import { isPayloadV2 } from '../domain/types';
import type { EtatDateSnapshot, EtatDatePayloadV2 } from '../domain/types';
import styles from './EtatDateViewer.module.css';

interface EtatDateViewerProps {
  snapshot: EtatDateSnapshot;
  onViewDocument?: (documentId: string) => void;
}

export function EtatDateViewer({ snapshot, onViewDocument }: EtatDateViewerProps) {
  const payload = snapshot.payload;

  if (!isPayloadV2(payload)) {
    return <EtatDateViewerLegacy snapshot={snapshot} onViewDocument={onViewDocument} />;
  }

  return <EtatDateViewerV2 snapshot={snapshot} payload={payload} />;
}

function EtatDateViewerV2({ snapshot, payload }: { snapshot: EtatDateSnapshot; payload: EtatDatePayloadV2 }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      generateEtatDatePDF(payload);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FileText size={20} />
          <div>
            <h3>{snapshot.snapshot_type === 'pre' ? 'Pré-État Daté' : 'État Daté Définitif'}</h3>
            <p className={styles.legalRef}>{payload.legal_reference}</p>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.generatedAt}>
            <Calendar size={14} />
            Généré le {formatDate(snapshot.generated_at)}
          </span>
          <button
            className={styles.downloadBtn}
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={14} className={styles.spinner} /> : <Download size={14} />}
            Télécharger PDF
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <EtatDateSummary
        partie1Total={payload.partie1_vendeur_doit.total}
        partie2Total={payload.partie2_syndicat_doit.total}
        partie3Total={payload.partie3_acquereur.total}
      />

      {/* Header details */}
      <EtatDateHeader payload={payload} snapshotDate={snapshot.generated_at} />

      {/* Partie 1 */}
      <EtatDatePartie
        title="Partie 1 — Sommes dues par le vendeur au syndicat"
        total={payload.partie1_vendeur_doit.total}
        sections={[
          { label: 'Provisions budget prévisionnel', amount: payload.partie1_vendeur_doit.provisions_budget.amount, detail: payload.partie1_vendeur_doit.provisions_budget.detail },
          { label: 'Provisions travaux', amount: payload.partie1_vendeur_doit.provisions_travaux.amount, detail: payload.partie1_vendeur_doit.provisions_travaux.detail },
          { label: 'Arriérés exercices antérieurs', amount: payload.partie1_vendeur_doit.arrieres.amount, detail: payload.partie1_vendeur_doit.arrieres.detail },
          { label: 'Emprunts collectifs', amount: payload.partie1_vendeur_doit.emprunts_collectifs.amount, detail: payload.partie1_vendeur_doit.emprunts_collectifs.detail },
          { label: 'Avances exigibles', amount: payload.partie1_vendeur_doit.avances_exigibles.amount, detail: payload.partie1_vendeur_doit.avances_exigibles.detail },
        ]}
      />

      {/* Partie 2 */}
      <EtatDatePartie
        title="Partie 2 — Sommes dues par le syndicat au vendeur"
        total={payload.partie2_syndicat_doit.total}
        sections={[
          { label: 'Avances versées restituables', amount: payload.partie2_syndicat_doit.avances_versees.amount, detail: payload.partie2_syndicat_doit.avances_versees.detail },
          { label: 'Provisions post-mutation', amount: payload.partie2_syndicat_doit.provisions_post_mutation.amount },
          { label: 'Trop-perçus (régularisation)', amount: payload.partie2_syndicat_doit.trop_percus.amount },
        ]}
      />

      {/* Partie 3 */}
      <EtatDatePartie
        title="Partie 3 — Sommes incombant à l'acquéreur"
        total={payload.partie3_acquereur.total}
        sections={[
          { label: 'Reconstitution des avances', amount: payload.partie3_acquereur.reconstitution_avances.amount, detail: payload.partie3_acquereur.reconstitution_avances.detail },
          { label: 'Provisions non exigibles', amount: payload.partie3_acquereur.provisions_non_exigibles.amount },
          { label: 'Travaux votés non appelés', amount: payload.partie3_acquereur.travaux_votes_non_appeles.amount, detail: payload.partie3_acquereur.travaux_votes_non_appeles.detail },
          { label: 'Fonds travaux ALUR', amount: payload.partie3_acquereur.fonds_travaux_alur.balance },
        ]}
      />

      {/* Annexe */}
      <EtatDateAnnexe annexe={payload.annexe} />

      {/* Transactions */}
      {payload.annexe.recent_transactions.length > 0 && (
        <EtatDateTransactions transactions={payload.annexe.recent_transactions} />
      )}

      {/* JSON toggle */}
      <EtatDateJsonViewer payload={payload} />
    </div>
  );
}
