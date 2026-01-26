'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Calendar,
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  Pen,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useMutationDetail } from '@/features/ventes';
import { MutationStatusBadge, EtatDateViewer } from '@/features/ventes/components';
import {
  MUTATION_STATUS_LABELS,
  MUTATION_TYPE_LABELS,
} from '@/features/ventes/domain/types';
import { DataState } from '@/components/ui/DataState';
import styles from './detail-vente.module.css';

export default function DetailMutationPage() {
  const params = useParams();
  const router = useRouter();
  const mutationId = params.id as string;

  const {
    mutation,
    snapshots,
    preEtatSnapshot,
    finalEtatSnapshot,
    isLoading,
    error,
    isProcessing,
    toast,
    hideToast,
    generateEtatDate,
    markAsSigned,
    validateMutation,
    cancelMutation,
    availableActions,
  } = useMutationDetail({ mutationId });

  const [showSignModal, setShowSignModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [signatureDate, setSignatureDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [buyerInfo, setBuyerInfo] = useState({
    buyer_first_name: '',
    buyer_last_name: '',
    buyer_email: '',
    buyer_is_company: false,
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleGeneratePreEtat = async () => {
    await generateEtatDate('pre');
  };

  const handleGenerateFinalEtat = async () => {
    await generateEtatDate('final');
  };

  const handleMarkAsSigned = async () => {
    await markAsSigned(signatureDate);
    setShowSignModal(false);
  };

  const handleValidate = async () => {
    await validateMutation({
      signature_date: mutation?.signature_date || signatureDate,
      ...(mutation?.buyer_name
        ? {}
        : {
            buyer_first_name: buyerInfo.buyer_first_name,
            buyer_last_name: buyerInfo.buyer_last_name,
            buyer_email: buyerInfo.buyer_email,
            buyer_is_company: buyerInfo.buyer_is_company,
          }),
    });
    setShowValidateModal(false);
  };

  const handleCancel = async () => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette mutation ?')) {
      await cancelMutation();
    }
  };

  // Timeline steps
  const timelineSteps = [
    {
      label: 'Notifiée',
      status: mutation?.status,
      completed: true,
      date: mutation?.requested_at,
    },
    {
      label: 'Pré-état généré',
      status: 'pre_etat_generated',
      completed: ['pre_etat_generated', 'etat_generated', 'signed', 'validated'].includes(
        mutation?.status || ''
      ),
      date: preEtatSnapshot?.generated_at,
    },
    {
      label: 'État daté final',
      status: 'etat_generated',
      completed: ['etat_generated', 'signed', 'validated'].includes(mutation?.status || ''),
      date: finalEtatSnapshot?.generated_at,
    },
    {
      label: 'Acte signé',
      status: 'signed',
      completed: ['signed', 'validated'].includes(mutation?.status || ''),
      date: mutation?.signature_date,
    },
    {
      label: 'Validée',
      status: 'validated',
      completed: mutation?.status === 'validated',
      date: mutation?.effective_date,
    },
  ];

  return (
    <div className="container">
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!mutation}
        emptyMessage="Mutation non trouvée"
      >
        {mutation && (
          <>
            {/* Header */}
            <div className={styles.header}>
              <Link href="/ventes-impayes/ventes" className={styles.backLink}>
                <ArrowLeft size={16} />
                Retour aux mutations
              </Link>
              <div className={styles.headerContent}>
                <div>
                  <div className={styles.headerTitle}>
                    <h1 className={styles.title}>Mutation - Lot {mutation.lot_ref}</h1>
                    <MutationStatusBadge status={mutation.status} />
                  </div>
                  <p className={styles.subtitle}>
                    {MUTATION_TYPE_LABELS[mutation.mutation_type]} • Notifiée le{' '}
                    {formatDate(mutation.requested_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {mutation.days_until_pre_etat_deadline !== null &&
              mutation.days_until_pre_etat_deadline <= 5 &&
              !mutation.has_pre_etat && (
                <div className={styles.alertsGrid}>
                  <div
                    className={styles.alertCard}
                    style={{
                      background: mutation.days_until_pre_etat_deadline < 0 ? '#fee2e2' : '#fef3c7',
                      borderColor:
                        mutation.days_until_pre_etat_deadline < 0 ? '#fca5a5' : '#fbbf24',
                      color: mutation.days_until_pre_etat_deadline < 0 ? '#991b1b' : '#92400e',
                    }}
                  >
                    <AlertTriangle size={24} />
                    <div>
                      <strong>
                        {mutation.days_until_pre_etat_deadline < 0
                          ? 'Délai dépassé'
                          : `${mutation.days_until_pre_etat_deadline}j restants`}
                      </strong>
                      <p>
                        Le pré-état daté doit être généré sous 15 jours (Art. 20 Loi 65-557)
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Layout */}
            <div className={styles.layout}>
              {/* Sidebar */}
              <div className={styles.sidebar}>
                {/* Actions */}
                <div className={`${styles.sidebarCard} ${styles.actionsCard}`}>
                  <h3 className={styles.cardTitle}>Actions</h3>
                  <div className={styles.actionsList}>
                    {availableActions.canGeneratePreEtat && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionPrimary}`}
                        onClick={handleGeneratePreEtat}
                        disabled={isProcessing}
                      >
                        <FileText size={18} />
                        Générer le pré-état daté
                      </button>
                    )}

                    {availableActions.canGenerateFinalEtat && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionPrimary}`}
                        onClick={handleGenerateFinalEtat}
                        disabled={isProcessing}
                      >
                        <FileCheck size={18} />
                        Générer l&apos;état daté final
                      </button>
                    )}

                    {availableActions.canMarkAsSigned && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionSecondary}`}
                        onClick={() => setShowSignModal(true)}
                        disabled={isProcessing}
                      >
                        <Pen size={18} />
                        Marquer acte signé
                      </button>
                    )}

                    {availableActions.canValidate && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionSuccess}`}
                        onClick={() => setShowValidateModal(true)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 size={18} />
                        Valider la mutation
                      </button>
                    )}

                    {availableActions.canCancel && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={handleCancel}
                        disabled={isProcessing}
                      >
                        <XCircle size={18} />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className={styles.sidebarCard}>
                  <h3 className={styles.cardTitle}>
                    <Clock size={16} />
                    Workflow
                  </h3>
                  <div className={styles.timeline}>
                    {timelineSteps.map((step, idx) => (
                      <div key={idx} className={styles.timelineItem}>
                        <div
                          className={`${styles.timelineDot} ${
                            step.completed ? styles.completed : ''
                          } ${
                            mutation?.status === step.status && step.status !== 'validated'
                              ? styles.active
                              : ''
                          }`}
                        />
                        <div className={styles.timelineContent}>
                          <span
                            className={`${styles.timelineTitle} ${
                              !step.completed ? styles.pending : ''
                            }`}
                          >
                            {step.label}
                          </span>
                          {step.date && (
                            <span className={styles.timelineDate}>{formatDate(step.date)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infos lot */}
                <div className={styles.sidebarCard}>
                  <h3 className={styles.cardTitle}>
                    <Building2 size={16} />
                    Lot
                  </h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Référence</span>
                      <span className={styles.infoValue}>{mutation.lot_ref}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Type</span>
                      <span className={styles.infoValue}>{mutation.lot_type}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Tantièmes</span>
                      <span className={styles.infoValue}>{mutation.tantiemes_generaux}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main */}
              <div className={styles.main}>
                {/* Parties */}
                <div className={styles.mainCard}>
                  <h3 className={styles.cardTitle}>
                    <User size={16} />
                    Parties
                  </h3>
                  <div className={styles.partiesGrid}>
                    <div className={styles.partyCard}>
                      <span className={styles.partyLabel}>Vendeur</span>
                      <span className={styles.partyName}>{mutation.seller_name}</span>
                      {mutation.seller_email && (
                        <span className={styles.partyEmail}>{mutation.seller_email}</span>
                      )}
                    </div>
                    <div className={styles.partyArrow}>→</div>
                    <div className={styles.partyCard}>
                      <span className={styles.partyLabel}>Acquéreur</span>
                      <span className={styles.partyName}>
                        {mutation.buyer_name || 'Non renseigné'}
                      </span>
                      {mutation.buyer_email && (
                        <span className={styles.partyEmail}>{mutation.buyer_email}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notaire */}
                {(mutation.notary_name || mutation.notary_email) && (
                  <div className={styles.mainCard}>
                    <h3 className={styles.cardTitle}>
                      <Briefcase size={16} />
                      Notaire
                    </h3>
                    <div className={styles.infoGrid}>
                      {mutation.notary_name && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Nom</span>
                          <span className={styles.infoValue}>{mutation.notary_name}</span>
                        </div>
                      )}
                      {mutation.notary_email && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Email</span>
                          <span className={styles.infoValue}>{mutation.notary_email}</span>
                        </div>
                      )}
                      {mutation.notary_reference && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Référence</span>
                          <span className={styles.infoValue}>{mutation.notary_reference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* États datés */}
                <div className={styles.mainCard}>
                  <h3 className={styles.cardTitle}>
                    <FileText size={16} />
                    États Datés (Art. 20)
                  </h3>

                  {snapshots.length === 0 ? (
                    <div className={styles.emptyState}>
                      <FileText size={48} />
                      <p>Aucun état daté généré</p>
                      {availableActions.canGeneratePreEtat && (
                        <button
                          className="btn btn-primary"
                          onClick={handleGeneratePreEtat}
                          disabled={isProcessing}
                          style={{ marginTop: '1rem' }}
                        >
                          Générer le pré-état daté
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={styles.etatDateList}>
                      {preEtatSnapshot && (
                        <EtatDateViewer
                          snapshot={preEtatSnapshot}
                          onViewDocument={(docId) =>
                            router.push(`/documents/ged?doc=${docId}`)
                          }
                        />
                      )}
                      {finalEtatSnapshot && (
                        <EtatDateViewer
                          snapshot={finalEtatSnapshot}
                          onViewDocument={(docId) =>
                            router.push(`/documents/ged?doc=${docId}`)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {mutation.notes && (
                  <div className={styles.mainCard}>
                    <h3 className={styles.cardTitle}>Notes</h3>
                    <p className={styles.notes}>{mutation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Signature */}
            {showSignModal && (
              <div className={styles.modalOverlay} onClick={() => setShowSignModal(false)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <h3>Marquer l&apos;acte comme signé</h3>
                  <div className={styles.modalField}>
                    <label htmlFor="signatureDate">Date de signature</label>
                    <input
                      id="signatureDate"
                      type="date"
                      value={signatureDate}
                      onChange={(e) => setSignatureDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowSignModal(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleMarkAsSigned}
                      disabled={isProcessing}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Validation */}
            {showValidateModal && (
              <div className={styles.modalOverlay} onClick={() => setShowValidateModal(false)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <h3>Valider la mutation</h3>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    Cette action va transférer la propriété du lot à l&apos;acquéreur.
                  </p>

                  {!mutation.buyer_name && (
                    <>
                      <div className={styles.modalField}>
                        <label htmlFor="buyerFirstName">Prénom de l&apos;acquéreur</label>
                        <input
                          id="buyerFirstName"
                          type="text"
                          value={buyerInfo.buyer_first_name}
                          onChange={(e) =>
                            setBuyerInfo((prev) => ({
                              ...prev,
                              buyer_first_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className={styles.modalField}>
                        <label htmlFor="buyerLastName">Nom de l&apos;acquéreur</label>
                        <input
                          id="buyerLastName"
                          type="text"
                          value={buyerInfo.buyer_last_name}
                          onChange={(e) =>
                            setBuyerInfo((prev) => ({
                              ...prev,
                              buyer_last_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className={styles.modalField}>
                        <label htmlFor="buyerEmail">Email</label>
                        <input
                          id="buyerEmail"
                          type="email"
                          value={buyerInfo.buyer_email}
                          onChange={(e) =>
                            setBuyerInfo((prev) => ({
                              ...prev,
                              buyer_email: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className={styles.modalActions}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowValidateModal(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleValidate}
                      disabled={isProcessing}
                    >
                      Valider le transfert
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div
                className={`${styles.toast} ${
                  toast.type === 'success' ? styles.toastSuccess : styles.toastError
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
                {toast.message}
                <button className={styles.toastClose} onClick={hideToast}>
                  <X size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </DataState>
    </div>
  );
}
