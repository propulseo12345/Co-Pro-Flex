'use client';

import { AlertCircle } from 'lucide-react';
import { useNewFacturePage, Header, FactureFormCard, FormActions } from '@/features/finance/factures-new';
import styles from './new-facture.module.css';

export default function NewFacturePage() {
  const {
    formData,
    errors,
    suppliers,
    chargeAccounts,
    isLoadingRefs,
    blockingError,
    submitError,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleBack,
  } = useNewFacturePage();

  return (
    <div className={styles.container}>
      <Header onBack={handleBack} />

      {blockingError ? (
        <div className={styles.formCard}>
          <span className={styles.errorMessage}>
            <AlertCircle size={16} aria-hidden="true" />
            {blockingError}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <FactureFormCard
            formData={formData}
            errors={errors}
            suppliers={suppliers}
            chargeAccounts={chargeAccounts}
            onFieldChange={handleChange}
          />

          {submitError && (
            <span className={styles.errorMessage} role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              {submitError}
            </span>
          )}

          <FormActions
            isSubmitting={isSubmitting || isLoadingRefs}
            onCancel={handleBack}
          />
        </form>
      )}
    </div>
  );
}
