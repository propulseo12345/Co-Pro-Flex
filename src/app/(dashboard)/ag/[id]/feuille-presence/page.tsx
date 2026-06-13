'use client';

/**
 * Feuille de présence AG - 100% DB-First
 * Étape 6/8 du workflow AG
 *
 * Sources Supabase :
 * - rpc_get_ag_coproprietaires : copropriétaires avec tantièmes
 * - v_ag_attendance_summary : présences enregistrées
 * - compute_ag_quorum : stats quorum temps réel
 *
 * Zéro mock, zéro localStorage, zéro state comme vérité métier.
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { useFeuillePresencePage } from '@/features/ag/feuille-presence';
import {
  FeuillePresenceHeader,
  QuorumStats,
  QuorumThresholds,
  PresenceActions,
  PresenceTable,
  SignatureModal,
  PresenceEmptyState,
  PresenceLoadingState,
  PresenceErrorState,
} from '@/features/ag/feuille-presence';

export default function FeuillePresencePage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;

  const {
    // Data
    coproprietaires,
    attendanceByCoprId,
    quorumStats,
    quorumThresholds,
    agInfo,

    // Loading states
    isLoading,
    isSaving,
    error,

    // UI state
    lastBulkAction,
    showSignatures,
    showSignatureModal,
    currentCopro,

    // Handlers
    handleBack,
    handlePresenceChange,
    handleRepresentantChange,
    handleBulkPresent,
    handleBulkAbsent,
    handleOpenSignature,
    handleSaveSignature,
    handleCloseSignatureModal,
    handleExportPDF,
    handleToggleSignatures,
    refresh,
  } = useFeuillePresencePage();

  // Update current step in DB (step 6 = Feuille de présence)
  useEffect(() => {
    if (!isLoading && agId) {
      updateAgCurrentStep(agId, 6);
    }
  }, [isLoading, agId]);

  // Loading state
  if (isLoading) {
    return <PresenceLoadingState />;
  }

  // Error state
  if (error) {
    return <PresenceErrorState error={error} onRefresh={refresh} />;
  }

  return (
    <div className="container">
      <FeuillePresenceHeader
        agTitle={agInfo?.title}
        isSaving={isSaving}
        onBack={handleBack}
      />

      <Stepper currentStep={6} agId={agId} />

      {quorumStats && <QuorumStats stats={quorumStats} />}

      {quorumThresholds && <QuorumThresholds thresholds={quorumThresholds} />}

      <PresenceActions
        showSignatures={showSignatures}
        isSaving={isSaving}
        isLoading={isLoading}
        lastBulkAction={lastBulkAction}
        onBulkPresent={handleBulkPresent}
        onBulkAbsent={handleBulkAbsent}
        onExportPDF={handleExportPDF}
        onToggleSignatures={handleToggleSignatures}
        onRefresh={refresh}
      />

      {coproprietaires.length === 0 && <PresenceEmptyState />}

      {coproprietaires.length > 0 && (
        <PresenceTable
          coproprietaires={coproprietaires}
          attendanceByCoprId={attendanceByCoprId}
          showSignatures={showSignatures}
          isSaving={isSaving}
          onPresenceChange={handlePresenceChange}
          onRepresentantChange={handleRepresentantChange}
          onOpenSignature={handleOpenSignature}
        />
      )}

      {showSignatureModal && currentCopro && (
        <SignatureModal
          copro={currentCopro}
          initialSignature={attendanceByCoprId.get(currentCopro.id)?.signatureData}
          onSave={handleSaveSignature}
          onCancel={handleCloseSignatureModal}
        />
      )}

      {/* Footer avec navigation */}
      <div style={{
        marginTop: 'var(--spacing-6)',
        padding: 'var(--spacing-4)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--spacing-4)',
      }}>
        <button
          className="btn btn-secondary"
          onClick={handleBack}
        >
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <Users size={16} />
          <span>
            {quorumStats ? `${quorumStats.presentCount + quorumStats.proxyCount} présent(s)` : '0 présent'}
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            // Check for unsigned present/proxy attendees (correspondence excluded)
            const unsignedNames: string[] = [];
            coproprietaires.forEach((copro) => {
              const att = attendanceByCoprId.get(copro.id);
              if (att && att.presenceType !== 'correspondence' && !att.signed) {
                unsignedNames.push(copro.displayName);
              }
            });

            if (unsignedNames.length > 0) {
              const proceed = confirm(
                `${unsignedNames.length} copropriétaire(s) présent(s) n'ont pas encore signé la feuille de présence :\n\n` +
                `${unsignedNames.slice(0, 10).join('\n')}${unsignedNames.length > 10 ? `\n... et ${unsignedNames.length - 10} autre(s)` : ''}\n\n` +
                `Voulez-vous continuer malgré tout ?`
              );
              if (!proceed) return;
            }

            router.push(`/ag/${agId}/session`);
          }}
          disabled={isSaving || !quorumStats || (quorumStats.presentCount + quorumStats.proxyCount) === 0}
        >
          Continuer vers la session
          <ArrowRight size={16} style={{ marginLeft: 8 }} />
        </button>
      </div>
    </div>
  );
}
