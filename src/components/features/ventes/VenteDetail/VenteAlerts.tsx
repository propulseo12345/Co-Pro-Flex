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
        <div className={styles.alertCard} style={{ background: '#fee2e2', borderColor: '#ef4444' }}>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} aria-hidden="true" />
          <div>
            <strong>Impayés vendeur</strong>
            <p>Le vendeur a {vente.vendeur.impayes} € d&apos;impayés</p>
          </div>
        </div>
      )}

      {documentsManquants > 0 && (
        <div className={styles.alertCard} style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
          <Clock size={20} style={{ color: '#f59e0b' }} aria-hidden="true" />
          <div>
            <strong>{documentsManquants} document(s) manquant(s)</strong>
            <p>Documents obligatoires à fournir</p>
          </div>
        </div>
      )}

      {documentsASigner > 0 && (
        <div className={styles.alertCard} style={{ background: '#dbeafe', borderColor: '#0284c7' }}>
          <Edit2 size={20} style={{ color: '#0284c7' }} aria-hidden="true" />
          <div>
            <strong>{documentsASigner} document(s) à signer</strong>
            <p>Signature syndic requise</p>
          </div>
        </div>
      )}
    </div>
  );
}
