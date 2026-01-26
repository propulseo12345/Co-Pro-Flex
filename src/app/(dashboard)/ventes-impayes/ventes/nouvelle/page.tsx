'use client';

import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useNouvelleVenteForm } from '@/hooks/modules/useNouvelleVenteForm';
import { NouvelleVenteForm, NouvelleVenteConfirmModal } from '@/components/features/ventes-impayes';
import { MOCK_COPROPRIETAIRES, MOCK_LOTS } from '@/data/mock/nouvelle-vente.mock';
import styles from './nouvelle-vente.module.css';

export default function NouvelleVentePage() {
  const {
    formData,
    updateFormData,
    acquereurMode,
    setAcquereurMode,
    notaireMode,
    setNotaireMode,
    errors,
    showConfirmModal,
    setShowConfirmModal,
    isSubmitting,
    submitSuccess,
    expandedSections,
    toggleSection,
    toggleDocument,
    toggleOrdreService,
    handlePreSubmit,
    handleConfirmSubmit,
  } = useNouvelleVenteForm();

  const getLotInfo = () => MOCK_LOTS.find(l => l.id === formData.lotId) || null;
  const getVendeurInfo = () => MOCK_COPROPRIETAIRES.find(c => c.id === formData.vendeurId) || null;
  const getCoproprietaires = () => MOCK_COPROPRIETAIRES;

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href="/ventes-impayes/ventes" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Retour aux ventes
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Nouvelle vente</h1>
          <p className={styles.subtitle}>
            Créez un nouveau dossier de vente avec génération automatique des documents
          </p>
        </div>
      </div>

      <NouvelleVenteForm
        formData={formData}
        onUpdate={updateFormData}
        acquereurMode={acquereurMode}
        onAcquereurModeChange={setAcquereurMode}
        notaireMode={notaireMode}
        onNotaireModeChange={setNotaireMode}
        errors={errors}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        onToggleDocument={toggleDocument}
        onToggleOrdreService={toggleOrdreService}
        onSubmit={handlePreSubmit}
      />

      <div className={styles.actionsBar}>
        <Link href="/ventes-impayes/ventes" className="btn btn-secondary">
          <X size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Annuler
        </Link>
        <button className="btn btn-primary" onClick={handlePreSubmit}>
          <Save size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Créer la vente
        </button>
      </div>

      <NouvelleVenteConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleConfirmSubmit(getLotInfo, getVendeurInfo, getCoproprietaires)}
        formData={formData}
        acquereurMode={acquereurMode}
        isSubmitting={isSubmitting}
        submitSuccess={submitSuccess}
        vendeurNom={getVendeurInfo()?.nom || ''}
      />
    </div>
  );
}
