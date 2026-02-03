'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { ArrowLeft, ArrowRight, Info, CheckSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import { useAgEnvoiPage, SENDING_METHODS } from '@/features/ag/hooks/useAgEnvoiPage';
import { EnvoiSidebar } from '@/features/ag/components/envoi';
import styles from './envoi.module.css';

export default function EnvoiPage() {
  const params = useParams();
  const agId = params.id as string;
  const page = useAgEnvoiPage({ agId });

  // Mise à jour de l'étape courante en DB (étape 4 = Envoi convocations)
  // Utilise un ref pour ne l'appeler qu'une seule fois
  const stepUpdatedRef = useRef(false);
  useEffect(() => {
    if (agId && !page.isLoading && !stepUpdatedRef.current) {
      stepUpdatedRef.current = true;
      updateAgCurrentStep(agId, 4);
    }
  }, [agId, page.isLoading]);

  // État de chargement
  if (page.isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={48} className={styles.spinner} />
          <h2>Chargement des données d&apos;envoi...</h2>
          <p>Récupération des copropriétaires depuis Supabase</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (page.status === 'error' && page.error) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>{page.error.message}</h2>
          {page.error.details && <p className={styles.errorDetails}>{page.error.details}</p>}
          <p className={styles.errorCode}>Code: {page.error.code}</p>
          <div className={styles.errorActions}>
            <button onClick={page.reload} className="btn btn-primary">
              Réessayer
            </button>
            <button onClick={page.goBack} className="btn btn-secondary">
              <ArrowLeft size={16} /> Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Envoi des convocations</h1>
          <p className={styles.subtitle}>Sélectionnez les modes d&apos;envoi pour chaque copropriétaire</p>
        </div>
      </div>

      <Stepper currentStep={4} agId={agId} />

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <div className={styles.statusMessage}>
            <p className={styles.statusText}>
              {page.selectedMethods.length === 0
                ? "Vous n'avez envoyé le procès-verbal à aucun copropriétaire."
                : `${page.sendingChoices.filter(c => c.methods.length > 0).length} copropriétaire(s) sélectionné(s).`}
            </p>
            {page.isSaving && (
              <span className={styles.savingIndicator}>
                <Loader2 size={14} className={styles.spinnerSmall} /> Sauvegarde...
              </span>
            )}
          </div>

          <div className={styles.instructionsBox}>
            <Info size={18} className={styles.infoIcon} aria-hidden="true" />
            <div className={styles.instructionsText}>
              <p>
                À tous les copropriétaires absents ou opposants (c&apos;est-à-dire ceux qui ont voté contre la majorité à au moins une décision) : vous devez envoyer les procès-verbaux par recommandés ou les remettre en main propre contre émargement. Pour les autres, vous pouvez l&apos;envoyer par le moyen de votre choix. Concernant les avis électroniques, ils ont la même valeur qu&apos;un recommandé physique, mais vous devez avoir l&apos;accord écrit du destinataire avant de l&apos;envoyer.
              </p>
            </div>
          </div>

          {page.selectedMethods.length > 0 && (
            <div className={styles.selectedMethodsBox}>
              <h3 className={styles.selectedMethodsTitle}>Actuellement sélectionné :</h3>
              <ul className={styles.selectedMethodsList}>
                {page.selectedMethods.map(method => (
                  <li key={method}>{SENDING_METHODS.find(m => m.value === method)?.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.quickActions}>
            <h3 className={styles.quickActionsTitle}>Actions rapides</h3>
            <div className={styles.quickActionsGrid}>
              {SENDING_METHODS.map(method => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => page.selectAllForMethod(method.value)}
                  className={styles.quickActionBtn}
                  disabled={page.isSent}
                >
                  <CheckSquare size={16} aria-hidden="true" />
                  <span>Tout en {method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {page.coproprietaires.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertCircle size={32} />
              <p>Aucun copropriétaire trouvé pour cette copropriété.</p>
              <p className={styles.emptyHint}>Vérifiez que des copropriétaires sont enregistrés dans Supabase.</p>
            </div>
          ) : (
            <div className={styles.coproList}>
              {page.coproprietaires.map(copro => {
                const choice = page.sendingChoices.find(c => c.coproprietaireId === copro.id);
                const coproMethods = choice?.methods || [];
                const hasSelection = coproMethods.length > 0;

                return (
                  <div key={copro.id} className={`${styles.coproCard} ${hasSelection ? styles.coproCardSelected : ''}`}>
                    <div className={styles.coproHeader}>
                      <div className={styles.coproInfo}>
                        <span className={styles.coproName}>{copro.nom}</span>
                        <span className={styles.coproDetails}>{copro.lot} • {copro.tantiemes} tantièmes</span>
                        {copro.email && <span className={styles.coproEmail}>{copro.email}</span>}
                      </div>
                      {hasSelection && (
                        <span className={styles.selectionBadge}>
                          {coproMethods.length} méthode{coproMethods.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className={styles.methodsGrid}>
                      {SENDING_METHODS.map(method => {
                        const isChecked = coproMethods.includes(method.value);
                        return (
                          <button
                            type="button"
                            key={method.value}
                            onClick={() => !page.isSent && page.toggleMethod(copro.id, method.value)}
                            className={`${styles.methodOption} ${isChecked ? styles.methodOptionActive : ''} ${page.isSent ? styles.methodOptionDisabled : ''}`}
                            disabled={page.isSent}
                          >
                            <div className={styles.methodContent}>
                              <span className={styles.methodName}>{method.label}</span>
                              <span className={styles.methodCost}>
                                {page.SENDING_COSTS[method.value] === 0 ? 'Gratuit' : `${page.SENDING_COSTS[method.value].toFixed(2)} €`}
                              </span>
                            </div>
                            <div className={styles.checkIndicator}>
                              {isChecked && <CheckCircle size={18} aria-hidden="true" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <EnvoiSidebar
          stats={page.stats}
          totalCost={page.totalCost}
          sendingCosts={page.SENDING_COSTS}
          isSent={page.isSent}
          onSend={page.handleSend}
        />
      </div>

      <div className={styles.footer}>
        <button onClick={page.goBack} className="btn btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Retour à la convocation
        </button>
        <button onClick={page.handleContinue} className="btn btn-primary">
          Continuer vers la préparation
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
