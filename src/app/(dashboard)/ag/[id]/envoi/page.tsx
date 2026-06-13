'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { ArrowLeft, Info, AlertCircle, Loader2, X } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import { useAgEnvoiPage, SENDING_METHODS } from '@/features/ag/hooks/useAgEnvoiPage';
import { SendProgressModal } from '@/features/ag/components/envoi/SendProgressModal';
import styles from './envoi.module.css';

export default function EnvoiPage() {
  const params = useParams();
  const agId = params.id as string;
  const page = useAgEnvoiPage({ agId });

  const stepUpdatedRef = useRef(false);
  useEffect(() => {
    if (agId && !page.isLoading && !stepUpdatedRef.current) {
      stepUpdatedRef.current = true;
      updateAgCurrentStep(agId, 4);
    }
  }, [agId, page.isLoading]);

  if (page.isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={48} className={styles.spinner} />
          <h2>Chargement des données d&apos;envoi...</h2>
        </div>
      </div>
    );
  }

  if (page.status === 'error' && page.error) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <h2>{page.error.message}</h2>
          {page.error.code && (
            <p style={{ color: 'var(--warning)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              Code: {page.error.code}
            </p>
          )}
          {page.error.details && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'monospace', maxWidth: '600px', wordBreak: 'break-word' }}>
              Détails: {page.error.details}
            </p>
          )}
          <button onClick={page.reload} className="btn btn-primary">Réessayer</button>
        </div>
      </div>
    );
  }

  // Count selections per method
  const methodCounts = SENDING_METHODS.map(method => ({
    ...method,
    count: page.sendingChoices.filter(c => c.methods.includes(method.value)).length,
  }));

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <h1 className={styles.title}>Envoi des convocations</h1>
        <p className={styles.subtitle}>Sélectionnez les modes d&apos;envoi pour chaque copropriétaire</p>
      </div>

      <Stepper currentStep={4} agId={agId} />

      {/* Status */}
      <p className={styles.statusText}>
        {page.sendingChoices.filter(c => c.methods.length > 0).length === 0
          ? "Vous n'avez envoyé la convocation à aucun copropriétaire."
          : `${page.sendingChoices.filter(c => c.methods.length > 0).length} copropriétaire(s) configuré(s).`}
      </p>

      {/* Legal info */}
      <div className={styles.infoBox}>
        <Info size={16} aria-hidden="true" />
        <p>
          L&apos;envoi des convocations doit être fait par avis électronique ou remise en main propre avec émargement.
          Les notifications par avis électronique deviennent une pratique par défaut, sauf si un copropriétaire vous a demandé de les recevoir par voie papier.
        </p>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <strong>Actuellement sélectionné :</strong>
        <ul>
          {methodCounts.map(m => (
            <li key={m.value}>{m.count} {m.label.toLowerCase()}</li>
          ))}
        </ul>
      </div>

      {/* Quick action buttons */}
      <div className={styles.docButtons}>
        <button
          className={styles.docButton}
          onClick={() => window.open(`/ag/${agId}/feuille-presence`, '_blank')}
        >
          Feuille d&apos;émargement
        </button>
        <button
          className={styles.docButton}
          onClick={() => window.open(`/ag/${agId}/convocation`, '_blank')}
        >
          Convocation
        </button>
      </div>

      {/* Table */}
      {page.coproprietaires.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={32} />
          <p>Aucun copropriétaire trouvé pour cette copropriété.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thName}>Copropriétaire</th>
                {SENDING_METHODS.map(method => (
                  <th key={method.value} className={styles.thMethod}>
                    {method.label}
                    <button
                      className={styles.selectAllBtn}
                      onClick={() => page.selectAllForMethod(method.value)}
                      disabled={page.isSent}
                    >
                      Tout cocher
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.coproprietaires.map(copro => {
                const choice = page.sendingChoices.find(c => c.coproprietaireId === copro.id);
                const coproMethods = choice?.methods || [];
                const hasEmail = !!copro.email;

                return (
                  <tr key={copro.id} className={styles.row}>
                    <td className={styles.tdName}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => {
                          // Deselect all methods for this copro
                          coproMethods.forEach(m => page.toggleMethod(copro.id, m));
                        }}
                        disabled={page.isSent}
                        title="Désélectionner tout"
                      >
                        <X size={14} />
                      </button>
                      <span>{copro.nom}</span>
                    </td>
                    {SENDING_METHODS.map(method => {
                      const isChecked = coproMethods.includes(method.value);
                      const needsEmail = (method.value === 'AVIS_ELECTRONIQUE' || method.value === 'EMAIL') && !hasEmail;

                      return (
                        <td key={method.value} className={styles.tdMethod}>
                          {needsEmail ? (
                            <button className={styles.emailMissing} disabled>
                              Renseigner l&apos;email
                            </button>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => page.toggleMethod(copro.id, method.value)}
                              disabled={page.isSent}
                              className={styles.checkbox}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button onClick={page.goBack} className="btn btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Modifier l&apos;ordre du jour
        </button>
        <button onClick={page.handleSend} className="btn btn-primary" disabled={page.isSent}>
          Envoyer la convocation
        </button>
      </div>

      <SendProgressModal
        progress={page.progress}
        onCancel={page.handleCancelSend}
        onDownloadZip={page.handleDownloadZip}
        onContinue={page.handleCloseProgress}
      />
    </div>
  );
}
