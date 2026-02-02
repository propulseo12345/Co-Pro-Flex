'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useMutationDetail } from '@/features/ventes';
import { MutationStatusBadge } from '@/features/ventes/components';
import { MUTATION_TYPE_LABELS } from '@/features/ventes/domain/types';
import { DataState } from '@/components/ui/DataState';
import {
  SignatureModal,
  ValidationModal,
  MutationTimeline,
  MutationActions,
  MutationLotInfo,
  MutationParties,
  MutationEtatsDates,
  MutationToast,
} from '@/features/ventes/detail';
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
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
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

  const handleMarkAsSigned = async () => {
    await markAsSigned(signatureDate);
    setShowSignModal(false);
  };

  const handleValidate = async () => {
    await validateMutation({
      signature_date: mutation?.signature_date || signatureDate,
      ...(mutation?.buyer_name ? {} : buyerInfo),
    });
    setShowValidateModal(false);
  };

  const handleCancel = async () => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette mutation ?')) {
      await cancelMutation();
    }
  };

  const timelineSteps = [
    { label: 'Notifiée', status: mutation?.status, completed: true, date: mutation?.requested_at },
    { label: 'Pré-état généré', status: 'pre_etat_generated', completed: ['pre_etat_generated', 'etat_generated', 'signed', 'validated'].includes(mutation?.status || ''), date: preEtatSnapshot?.generated_at },
    { label: 'État daté final', status: 'etat_generated', completed: ['etat_generated', 'signed', 'validated'].includes(mutation?.status || ''), date: finalEtatSnapshot?.generated_at },
    { label: 'Acte signé', status: 'signed', completed: ['signed', 'validated'].includes(mutation?.status || ''), date: mutation?.signature_date },
    { label: 'Validée', status: 'validated', completed: mutation?.status === 'validated', date: mutation?.effective_date },
  ];

  return (
    <div className="container">
      <DataState isLoading={isLoading} error={error} isEmpty={!mutation} emptyMessage="Mutation non trouvée">
        {mutation && (
          <>
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
                    {MUTATION_TYPE_LABELS[mutation.mutation_type]} • Notifiée le {formatDate(mutation.requested_at)}
                  </p>
                </div>
              </div>
            </div>

            {mutation.days_until_pre_etat_deadline !== null &&
              mutation.days_until_pre_etat_deadline <= 5 &&
              !mutation.has_pre_etat && (
                <div className={styles.alertsGrid}>
                  <div
                    className={styles.alertCard}
                    style={{
                      background: mutation.days_until_pre_etat_deadline < 0 ? '#fee2e2' : '#fef3c7',
                      borderColor: mutation.days_until_pre_etat_deadline < 0 ? '#fca5a5' : '#fbbf24',
                      color: mutation.days_until_pre_etat_deadline < 0 ? '#991b1b' : '#92400e',
                    }}
                  >
                    <AlertTriangle size={24} />
                    <div>
                      <strong>
                        {mutation.days_until_pre_etat_deadline < 0 ? 'Délai dépassé' : `${mutation.days_until_pre_etat_deadline}j restants`}
                      </strong>
                      <p>Le pré-état daté doit être généré sous 15 jours (Art. 20 Loi 65-557)</p>
                    </div>
                  </div>
                </div>
              )}

            <div className={styles.layout}>
              <div className={styles.sidebar}>
                <MutationActions
                  availableActions={availableActions}
                  isProcessing={isProcessing}
                  onGeneratePreEtat={() => generateEtatDate('pre')}
                  onGenerateFinalEtat={() => generateEtatDate('final')}
                  onMarkAsSigned={() => setShowSignModal(true)}
                  onValidate={() => setShowValidateModal(true)}
                  onCancel={handleCancel}
                />
                <MutationTimeline steps={timelineSteps} currentStatus={mutation.status} />
                <MutationLotInfo lotRef={mutation.lot_ref} lotType={mutation.lot_type} tantiemes={mutation.tantiemes_generaux} />
              </div>

              <div className={styles.main}>
                <MutationParties
                  sellerName={mutation.seller_name}
                  sellerEmail={mutation.seller_email}
                  buyerName={mutation.buyer_name}
                  buyerEmail={mutation.buyer_email}
                  notaryName={mutation.notary_name}
                  notaryEmail={mutation.notary_email}
                  notaryReference={mutation.notary_reference}
                />
                <MutationEtatsDates
                  snapshots={snapshots}
                  preEtatSnapshot={preEtatSnapshot}
                  finalEtatSnapshot={finalEtatSnapshot}
                  canGeneratePreEtat={availableActions.canGeneratePreEtat}
                  isProcessing={isProcessing}
                  onGeneratePreEtat={() => generateEtatDate('pre')}
                  onViewDocument={(docId) => router.push(`/documents/ged?doc=${docId}`)}
                />
                {mutation.notes && (
                  <div className={styles.mainCard}>
                    <h3 className={styles.cardTitle}>Notes</h3>
                    <p className={styles.notes}>{mutation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {showSignModal && (
              <SignatureModal
                signatureDate={signatureDate}
                onSignatureDateChange={setSignatureDate}
                onConfirm={handleMarkAsSigned}
                onClose={() => setShowSignModal(false)}
                isProcessing={isProcessing}
              />
            )}

            {showValidateModal && (
              <ValidationModal
                buyerInfo={buyerInfo}
                onBuyerInfoChange={setBuyerInfo}
                onConfirm={handleValidate}
                onClose={() => setShowValidateModal(false)}
                isProcessing={isProcessing}
                showBuyerForm={!mutation.buyer_name}
              />
            )}

            <MutationToast toast={toast} onHide={hideToast} />
          </>
        )}
      </DataState>
    </div>
  );
}
