'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Edit2, Download, Send } from 'lucide-react';
import type { Vente } from './types';
import { formatDate } from './utils';
import styles from './VenteDetail.module.css';

interface VenteHeaderProps {
  vente: Vente;
  onEdit: () => void;
  onExportPDF: () => void;
  onSendToNotaire: () => void;
}

export function VenteHeader({ vente, onEdit, onExportPDF, onSendToNotaire }: VenteHeaderProps) {
  return (
    <div className={styles.header}>
      <Link href="/ventes-impayes/ventes" className={styles.backLink}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour aux ventes
      </Link>

      <div className={styles.headerContent}>
        <div>
          <div className={styles.headerTitle}>
            <Building2 size={24} aria-hidden="true" />
            <h1 className={styles.title}>Vente {vente.lotId}</h1>
            <span className={styles.lotType}>
              {vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1)}
            </span>
          </div>
          <p className={styles.subtitle}>
            Créée le {formatDate(vente.dateCreation)}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button className="btn btn-secondary" onClick={onEdit}>
            <Edit2 size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Modifier
          </button>
          <button className="btn btn-secondary" onClick={onExportPDF}>
            <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Exporter PDF
          </button>
          <button className="btn btn-primary" onClick={onSendToNotaire}>
            <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Envoyer au notaire
          </button>
        </div>
      </div>
    </div>
  );
}
