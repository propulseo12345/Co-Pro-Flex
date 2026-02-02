'use client';

import { useNewFacturePage, Header, FactureFormCard, FormActions } from '@/features/finance/factures-new';
import styles from './new-facture.module.css';

export default function NewFacturePage() {
  const {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleBack,
  } = useNewFacturePage();

  return (
    <div className={styles.container}>
      <Header onBack={handleBack} />

      <form onSubmit={handleSubmit} className={styles.form}>
        <FactureFormCard
          formData={formData}
          errors={errors}
          onFieldChange={handleChange}
          onFileChange={handleFileChange}
        />

        <FormActions
          isSubmitting={isSubmitting}
          onCancel={handleBack}
        />
      </form>
    </div>
  );
}
