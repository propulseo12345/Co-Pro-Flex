'use client';

import { useState } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  User,
  Wallet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Loader2,
} from 'lucide-react';
import { getDocumentSignedUrl } from '../api/mutationsApi';
import type { EtatDateSnapshot, EtatDatePayloadV1 } from '../domain/types';
import styles from './EtatDateViewer.module.css';

interface EtatDateViewerLegacyProps {
  snapshot: EtatDateSnapshot;
  onViewDocument?: (documentId: string) => void;
}

export function EtatDateViewerLegacy({ snapshot, onViewDocument }: EtatDateViewerLegacyProps) {
  const [showJson, setShowJson] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const payload = snapshot.payload as EtatDatePayloadV1;

  const handleDownloadPDF = async () => {
    if (!snapshot.document_id) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const result = await getDocumentSignedUrl(snapshot.document_id);

      if (result.success && result.signed_url) {
        // Ouvrir le PDF dans un nouvel onglet
        window.open(result.signed_url, '_blank');
      } else {
        setDownloadError(result.error || 'Impossible de télécharger le document');
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Erreur de téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FileText size={20} />
          <div>
            <h3>
              {snapshot.snapshot_type === 'pre' ? 'Pré-État Daté' : 'État Daté Définitif'}
            </h3>
            <p className={styles.legalRef}>{payload.legal_reference}</p>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.generatedAt}>
            <Calendar size={14} />
            Généré le {formatDate(snapshot.generated_at)}
          </span>
          {snapshot.document_id && (
            <button
              className={styles.downloadBtn}
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              title="Télécharger le PDF"
            >
              {isDownloading ? (
                <Loader2 size={14} className={styles.spinner} />
              ) : (
                <Download size={14} />
              )}
              Télécharger PDF
            </button>
          )}
          {snapshot.document_id && onViewDocument && (
            <button
              className={styles.viewDocBtn}
              onClick={() => onViewDocument(snapshot.document_id!)}
            >
              <ExternalLink size={14} />
              Voir données
            </button>
          )}
        </div>
        {downloadError && (
          <div className={styles.downloadError}>
            <AlertTriangle size={14} />
            {downloadError}
          </div>
        )}
      </div>

      {/* Copropriété & Lot */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Building2 size={16} />
          <span>Copropriété & Lot</span>
        </div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Copropriété</span>
            <span className={styles.value}>{payload.copro.name}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>SIRET</span>
            <span className={styles.value}>{payload.copro.siret || '-'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Lot</span>
            <span className={styles.value}>
              {payload.lot.ref} ({payload.lot.type})
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Tantièmes</span>
            <span className={styles.value}>{payload.lot.tantiemes_generaux}</span>
          </div>
        </div>
      </div>

      {/* Vendeur */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <User size={16} />
          <span>Vendeur</span>
        </div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Nom</span>
            <span className={styles.value}>{payload.seller.name}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{payload.seller.email || '-'}</span>
          </div>
        </div>
      </div>

      {/* Situation Financière (Art. 20) */}
      <div className={`${styles.section} ${styles.financialSection}`}>
        <div className={styles.sectionHeader}>
          <Wallet size={16} />
          <span>Situation Financière (Art. 20)</span>
        </div>

        {/* Solde & Résumé */}
        <div className={styles.financialGrid}>
          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>Solde compte copropriétaire</span>
            <span
              className={`${styles.financialValue} ${
                payload.financial_situation.current_balance < 0 ? styles.negative : ''
              }`}
            >
              {formatCurrency(payload.financial_situation.current_balance)}
            </span>
          </div>

          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>Total appels émis</span>
            <span className={styles.financialValue}>
              {formatCurrency(payload.financial_situation.total_calls_issued)}
            </span>
          </div>

          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>Total paiements reçus</span>
            <span className={styles.financialValue}>
              {formatCurrency(payload.financial_situation.total_payments_received)}
            </span>
          </div>
        </div>

        {/* Impayés (obligatoire) */}
        <div className={styles.subSection}>
          <h4 className={styles.subTitle}>
            <AlertTriangle size={14} />
            Impayés exigibles
          </h4>
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Montant</span>
              <span
                className={`${styles.value} ${
                  payload.financial_situation.unpaid.amount > 0 ? styles.error : styles.success
                }`}
              >
                {formatCurrency(payload.financial_situation.unpaid.amount)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Lignes impayées</span>
              <span className={styles.value}>
                {payload.financial_situation.unpaid.lines_count}
              </span>
            </div>
            {payload.financial_situation.unpaid.oldest_due_date && (
              <div className={styles.field}>
                <span className={styles.label}>Plus ancienne échéance</span>
                <span className={styles.value}>
                  {formatDate(payload.financial_situation.unpaid.oldest_due_date)} (
                  {payload.financial_situation.unpaid.days_overdue}j de retard)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fonds travaux ALUR (Art. 14-2 II) */}
        <div className={styles.subSection}>
          <h4 className={styles.subTitle}>Quote-part fonds travaux (Art. 14-2 II ALUR)</h4>
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Solde fonds travaux</span>
              <span className={styles.value}>
                {formatCurrency(payload.financial_situation.work_fund_alur.balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Appels à venir */}
        <div className={styles.subSection}>
          <h4 className={styles.subTitle}>Appels de fonds à venir</h4>
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Montant non échu</span>
              <span className={styles.value}>
                {formatCurrency(payload.financial_situation.pending_calls.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions récentes */}
      {payload.recent_transactions && payload.recent_transactions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FileText size={16} />
            <span>Dernières opérations ({payload.recent_transactions_count})</span>
          </div>
          <div className={styles.transactionsTable}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Libellé</th>
                  <th>Débit</th>
                  <th>Crédit</th>
                  <th>Solde</th>
                </tr>
              </thead>
              <tbody>
                {payload.recent_transactions.map((tx, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(tx.line_date)}</td>
                    <td>
                      <span
                        className={`${styles.txType} ${
                          tx.line_type === 'call' ? styles.txCall : styles.txPayment
                        }`}
                      >
                        {tx.line_type === 'call' ? 'Appel' : 'Paiement'}
                      </span>
                    </td>
                    <td>{tx.label}</td>
                    <td className={styles.debit}>
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                    </td>
                    <td className={styles.credit}>
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                    </td>
                    <td>{formatCurrency(tx.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON brut (toggle) */}
      <div className={styles.jsonSection}>
        <button className={styles.jsonToggle} onClick={() => setShowJson(!showJson)}>
          {showJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{showJson ? 'Masquer' : 'Afficher'} le JSON brut</span>
        </button>
        {showJson && (
          <pre className={styles.jsonContent}>{JSON.stringify(payload, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
