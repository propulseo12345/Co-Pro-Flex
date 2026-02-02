'use client';

import { AlertCircle, Shield } from 'lucide-react';
import { ConvocationDegradedBanner } from '@/components/features/ag/Convocation';
import type { VariableValidationResult } from '@/lib/utils/variable-resolution';
import type { ReviewValidation } from '@/hooks/modules/useConvocationPreview';
import styles from '@/app/(dashboard)/ag/[id]/convocation/convocation.module.css';

interface ConvocationAlertsProps {
  status: 'loading' | 'ready' | 'error' | 'degraded';
  degradedMode: {
    agDataFailed: boolean;
    resolutionsFailed: boolean;
    coproprietairesFailed: boolean;
  };
  variableValidation: VariableValidationResult | null;
  reviewValidation: ReviewValidation | null;
  onRetry: () => void;
  onDownloadPDF: () => void;
  onNavigateToAgenda: () => void;
  onResetReview: () => void;
}

export function ConvocationAlerts({
  status,
  degradedMode,
  variableValidation,
  reviewValidation,
  onRetry,
  onDownloadPDF,
  onNavigateToAgenda,
  onResetReview,
}: ConvocationAlertsProps) {
  return (
    <>
      {/* Degraded mode banner */}
      {status === 'degraded' && (
        <ConvocationDegradedBanner
          {...degradedMode}
          onRetry={onRetry}
          onDownloadPDF={onDownloadPDF}
        />
      )}

      {/* Variable validation warning */}
      {variableValidation && !variableValidation.isComplete && (
        <div className={`${styles.alertBanner} ${styles.alertBannerWarning}`}>
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>Variables non remplies</strong>
            <p>{variableValidation.unfilledVariables.length} variable(s) à compléter.</p>
            <button onClick={onNavigateToAgenda} className={styles.alertLink}>
              Retourner à l&apos;ordre du jour
            </button>
          </div>
        </div>
      )}

      {/* Validation banner */}
      {reviewValidation && (
        <div className={styles.validatedBanner}>
          <Shield size={20} aria-hidden="true" />
          <span>
            Convocation validée par {reviewValidation.reluPar} (v{reviewValidation.version})
          </span>
          <button onClick={onResetReview} className={styles.resetReviewBtn}>
            Réinitialiser
          </button>
        </div>
      )}
    </>
  );
}
