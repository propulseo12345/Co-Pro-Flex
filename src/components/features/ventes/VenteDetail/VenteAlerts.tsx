'use client';

import { AlertTriangle, Clock, Edit2 } from 'lucide-react';
import type { Vente, VenteDocument } from './types';
import styles from './VenteDetail.module.css';

interface VenteAlertsProps {
  vente: Vente;
  documents: VenteDocument[];
}

export function VenteAlerts({ vente, documents }: VenteAlertsProps) {
  const documentsManquants = documents.filter(
    d => d.obligatoire && d.statut !== 'signe' && d.statut !== 'disponible'
  ).length;

  const documentsASigner = documents.filter(d => d.statut === 'en_attente').length;

  const hasAlerts = vente.vendeur.impayes > 0 || documentsManquants > 0 || documentsASigner > 0;

  if (!hasAlerts) return null;

  return (
    <div className={styles.alertsGrid}>
      {vente.vendeur.impayes > 0 && (
        <div className={styles.alertCard} style={{ background: 'var(--badge-danger-bg)', borderColor: 'var(--danger)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)' }} aria-hidden="true" />
          <div>
            <strong>Impayés vendeur</strong>
            <p>Le vendeur a {vente.vendeur.impayes} € d&apos;impayés</p>
          </div>
        </div>
      )}

      {documentsManquants > 0 && (
        <div className={styles.alertCard} style={{ background: 'var(--badge-warning-bg)', borderColor: 'var(--warning)' }}>
          <Clock size={20} style={{ color: 'var(--warning)' }} aria-hidden="true" />
          <div>
            <strong>{documentsManquants} document(s) manquant(s)</strong>
            <p>Documents obligatoires à fournir</p>
          </div>
        </div>
      )}

      {documentsASigner > 0 && (
        <div className={styles.alertCard} style={{ background: 'var(--badge-info-bg)', borderColor: 'var(--primary)' }}>
          <Edit2 size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <div>
            <strong>{documentsASigner} document(s) à signer</strong>
            <p>Signature syndic requise</p>
          </div>
        </div>
      )}
    </div>
  );
}
