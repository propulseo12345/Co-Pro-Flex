'use client';

import { X, FileText, Wrench, CheckCircle, Loader2 } from 'lucide-react';
import type { NouvelleVenteFormData } from '@/hooks/modules/useNouvelleVenteForm';
import { formatLotType } from '@/hooks/modules/useNouvelleVenteForm';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes/nouvelle/nouvelle-vente.module.css';

// TODO: Replace with Supabase queries / props
const MOCK_COPROPRIETAIRES: Array<{ id: string; nom: string }> = [];
const MOCK_ORDRES_SERVICE: Array<{ id: string; titre: string }> = [];

interface DocumentOption { id: string; nom: string; description: string; obligatoire: boolean }
const DOCUMENTS_DISPONIBLES: DocumentOption[] = [
  { id: 'pre_etat_date', nom: 'Pre-etat date', description: 'Document preparatoire pour le compromis', obligatoire: true },
  { id: 'etat_date', nom: 'Etat date', description: 'Etat des charges et provisions', obligatoire: true },
  { id: 'certificat_art20', nom: 'Certificat article 20', description: 'Certificat de non-opposition a la vente', obligatoire: true },
  { id: 'carnet_entretien', nom: 'Carnet d\'entretien', description: 'Historique des travaux et entretiens', obligatoire: false },
  { id: 'reglement_copro', nom: 'Reglement de copropriete', description: 'Reglement et ses modificatifs', obligatoire: false },
  { id: 'pv_ag', nom: 'PV des 3 dernieres AG', description: 'Proces-verbaux des assemblees generales', obligatoire: false },
  { id: 'diagnostics', nom: 'Diagnostics techniques', description: 'DPE, amiante, plomb, etc.', obligatoire: false },
];

interface NouvelleVenteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: NouvelleVenteFormData;
  acquereurMode: 'selection' | 'saisie';
  isSubmitting: boolean;
  submitSuccess: boolean;
  vendeurNom: string;
}

export function NouvelleVenteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  acquereurMode,
  isSubmitting,
  submitSuccess,
  vendeurNom,
}: NouvelleVenteConfirmModalProps) {
  if (!isOpen) return null;

  const acquereurNom = acquereurMode === 'saisie'
    ? formData.acquereurNom
    : MOCK_COPROPRIETAIRES.find(c => c.id === formData.acquereurId)?.nom || '-';

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={() => !isSubmitting && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {submitSuccess ? (
          <div className={styles.successContent}>
            <div className={styles.successIcon}><CheckCircle size={48} aria-hidden="true" /></div>
            <h2>Vente créée avec succès</h2>
            <p>Les documents sont en cours de génération...</p>
            <div className={styles.documentsGeneres}>
              {formData.documentsAGenerer.map(docId => {
                const doc = DOCUMENTS_DISPONIBLES.find(d => d.id === docId);
                return (
                  <div key={docId} className={styles.docGenere}>
                    <FileText size={16} aria-hidden="true" /><span>{doc?.nom}</span>
                    <CheckCircle size={14} className={styles.docCheck} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
            <p className={styles.redirectMsg}>Redirection en cours...</p>
          </div>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <h2>Confirmer la création</h2>
              <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}><X size={20} aria-hidden="true" /></button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.recapSection}>
                <h3>Récapitulatif de la vente</h3>
                <div className={styles.recapGrid}>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Lot</span><span className={styles.recapValue}>{formData.lotId} - {formatLotType(formData.lotType)}</span></div>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Vendeur</span><span className={styles.recapValue}>{vendeurNom || '-'}</span></div>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Acquéreur</span><span className={styles.recapValue}>{acquereurNom}</span></div>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Notaire</span><span className={styles.recapValue}>{formData.notaireNom || '-'}</span></div>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Date compromis</span><span className={styles.recapValue}>{formData.dateCompromis ? new Date(formData.dateCompromis).toLocaleDateString('fr-FR') : '-'}</span></div>
                  <div className={styles.recapItem}><span className={styles.recapLabel}>Date acte prévu</span><span className={styles.recapValue}>{formData.dateActeAuthentique ? new Date(formData.dateActeAuthentique).toLocaleDateString('fr-FR') : '-'}</span></div>
                </div>
              </div>
              <div className={styles.recapSection}>
                <h3>Documents à générer ({formData.documentsAGenerer.length})</h3>
                <div className={styles.docsList}>
                  {formData.documentsAGenerer.map(docId => {
                    const doc = DOCUMENTS_DISPONIBLES.find(d => d.id === docId);
                    return (<div key={docId} className={styles.docItem}><FileText size={14} aria-hidden="true" /><span>{doc?.nom}</span></div>);
                  })}
                </div>
              </div>
              {formData.ordresService.length > 0 && (
                <div className={styles.recapSection}>
                  <h3>Ordres de service liés ({formData.ordresService.length})</h3>
                  <div className={styles.docsList}>
                    {formData.ordresService.map(osId => {
                      const os = MOCK_ORDRES_SERVICE.find(o => o.id === osId);
                      return (<div key={osId} className={styles.docItem}><Wrench size={14} aria-hidden="true" /><span>{os?.titre}</span></div>);
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Annuler</button>
              <button className="btn btn-primary" onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting ? (<><Loader2 size={16} className={styles.spinner} aria-hidden="true" />Création en cours...</>) : (<><CheckCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" />Confirmer et créer</>)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
