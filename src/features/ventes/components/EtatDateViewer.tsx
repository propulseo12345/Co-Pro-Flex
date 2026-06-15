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
import type { PartieLine } from './etat-date/EtatDatePartie';
import { EtatDateAnnexe } from './etat-date/EtatDateAnnexe';
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

/** Construit les lignes d'une partie 45x (P1/P2) à partir de ses `items`. */
function itemsToLines(items: EtatDatePayloadV2['partie_1_sommes_dues_vendeur']['items']): PartieLine[] {
  return items.map((it) => ({
    label: it.nature ? `${it.code} · ${it.nature}` : it.code,
    amount: it.amount,
  }));
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

  const p1 = payload.partie_1_sommes_dues_vendeur;
  const p2 = payload.partie_2_dues_par_syndicat;
  const p3 = payload.partie_3_charge_acquereur;

  // Partie 3 : lignes plates issues des champs dédiés (pas d'items).
  const p3Lines: PartieLine[] = [
    { label: 'Reconstitution des avances', amount: p3.reconstitution_avances },
    { label: 'Provisions appelées non échues', amount: p3.provisions_appelees_non_echues },
    { label: 'Provisions votées non appelées — courant', amount: p3.provisions_votees_non_appelees_courant },
    { label: 'Provisions votées non appelées — travaux', amount: p3.provisions_votees_non_appelees_travaux },
    { label: 'Cotisation ALUR à venir', amount: p3.alur_a_venir },
  ];

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
        partie1Total={p1.total}
        partie2Total={p2.total}
        partie3Total={p3.total}
      />

      {/* Header details (identité gelée) */}
      <EtatDateHeader payload={payload} />

      {/* Partie 1 — sommes dues par le vendeur */}
      <EtatDatePartie
        title={p1.label}
        total={p1.total}
        lines={itemsToLines(p1.items)}
      />

      {/* Partie 2 — sommes dues au vendeur par le syndicat */}
      <EtatDatePartie
        title={p2.label}
        total={p2.total}
        lines={itemsToLines(p2.items)}
        note={p2.note}
      />

      {/* Partie 3 — à la charge de l'acquéreur */}
      <EtatDatePartie
        title={p3.label}
        total={p3.total}
        lines={p3Lines}
        note={p3.alur_note}
      />

      {/* Annexe — bases de calcul de la quote-part */}
      <EtatDateAnnexe annexe={payload.annexe_quote_part} />

      {/* JSON toggle */}
      <EtatDateJsonViewer payload={payload} />
    </div>
  );
}
