'use client';

import { ArrowLeft, Save, Send } from 'lucide-react';
import Link from 'next/link';
import {
    ServiceOrderTypeSelector,
    ServiceOrderCategorySection,
    ServiceOrderProviderSection,
    ServiceOrderDetailsSection,
    ServiceOrderContactSection,
    ServiceOrderEmailSection,
    ServiceOrderAttachmentSection
} from '../../../../../features/maintenance/serviceOrders/components';
import { useNewServiceOrderPage } from '../../../../../features/maintenance/serviceOrders/hooks';
import styles from './new-os.module.css';

export default function NewServiceOrderPage() {
    const {
        formData,
        errors,
        contactSearchTerm,
        showContactDropdown,
        prestatairesFiltered,
        alerteCoherence,
        filteredCoproprietaires,
        contrats,
        setContactSearchTerm,
        setShowContactDropdown,
        handleTypeChange,
        handleCategorieChange,
        handleProviderSelect,
        handleContractSelect,
        handleEmailChange,
        handleAttachmentsChange,
        handleContactSelect,
        handleClearContact,
        handleSaveDraft,
        handleSend,
        updateFormField
    } = useNewServiceOrderPage();

    return (
        <div className={styles.container}>
            <Link href="/maintenance/service-orders" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux ordres de service
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>Nouvel ordre de service</h1>
                <p className={styles.subtitle}>
                    Créez un ordre de service pour mandater un prestataire.
                </p>
            </div>

            <div className={styles.formContainer}>
                <ServiceOrderTypeSelector
                    typeOrdre={formData.typeOrdre}
                    onTypeChange={handleTypeChange}
                />

                {formData.typeOrdre === 'CLASSIQUE' && (
                    <ServiceOrderCategorySection
                        categorieIntervention={formData.categorieIntervention}
                        prestatairesCount={prestatairesFiltered.length}
                        onCategorieChange={handleCategorieChange}
                    />
                )}

                <ServiceOrderProviderSection
                    formData={formData}
                    prestataires={prestatairesFiltered}
                    contrats={contrats}
                    alerteCoherence={alerteCoherence}
                    errors={errors}
                    onProviderSelect={handleProviderSelect}
                    onContractSelect={handleContractSelect}
                />

                <ServiceOrderDetailsSection
                    formData={formData}
                    errors={errors}
                    onFieldChange={updateFormField}
                />

                <ServiceOrderContactSection
                    formData={formData}
                    contactSearchTerm={contactSearchTerm}
                    showContactDropdown={showContactDropdown}
                    filteredCoproprietaires={filteredCoproprietaires}
                    onSearchTermChange={setContactSearchTerm}
                    onShowDropdown={setShowContactDropdown}
                    onContactSelect={handleContactSelect as Parameters<typeof ServiceOrderContactSection>[0]['onContactSelect']}
                    onClearContact={handleClearContact}
                />

                <ServiceOrderEmailSection
                    formData={formData}
                    onEmailChange={handleEmailChange}
                />

                <ServiceOrderAttachmentSection
                    attachments={formData.piecesJointes}
                    onAttachmentsChange={handleAttachmentsChange}
                />

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 20px', borderRadius: 8,
                            background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.08)',
                            color: 'var(--text-main)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        <Save size={15} aria-hidden="true" />
                        Enregistrer en brouillon
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 20px', borderRadius: 8,
                            background: '#3b82f6', border: 'none',
                            color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        <Send size={15} aria-hidden="true" />
                        Générer et envoyer
                    </button>
                </div>
            </div>
        </div>
    );
}
