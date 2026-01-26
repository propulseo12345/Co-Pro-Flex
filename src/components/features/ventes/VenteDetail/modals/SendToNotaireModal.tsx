'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Send,
  FileText,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Paperclip,
  MessageSquare,
  FileType,
  RefreshCw,
  Eye,
  Edit3
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Vente, VenteDocument, Partie } from '../types';
import { formatDate } from '../utils';
import {
  TEMPLATES_EMAIL_NOTAIRE,
  DEFAULT_TEMPLATE_NOTAIRE,
  type EmailTemplateVente,
} from '@/lib/constants/email-templates-ventes';
import {
  generateEmailNotaire,
  type VenteEmailData,
} from '@/lib/utils/email-vente';
import styles from '../VenteDetail.module.css';

interface SendToNotaireModalProps {
  vente: Vente;
  documents: VenteDocument[];
  onClose: () => void;
  onSend: (data: EnvoiNotaireData) => Promise<void>;
}

export interface EnvoiNotaireData {
  notaire: Partie;
  documents: VenteDocument[];
  message: string;
  includeAllDocuments: boolean;
}

export function SendToNotaireModal({ vente, documents, onClose, onSend }: SendToNotaireModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    isActive: true,
    escapeDeactivates: true,
    onEscape: onClose,
  });

  // Template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateVente>(DEFAULT_TEMPLATE_NOTAIRE);
  const [isEditMode, setIsEditMode] = useState(false);
  const [includeAllDocuments, setIncludeAllDocuments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Documents à envoyer (calculé ici pour utiliser dans l'email)
  const documentsToSend = useMemo(() => {
    return includeAllDocuments
      ? documents
      : documents.filter(doc => doc.statut === 'signe' || doc.obligatoire);
  }, [documents, includeAllDocuments]);

  // Préparer les données pour le template
  const emailData: VenteEmailData = useMemo(() => ({
    notaire: vente.notaire,
    vendeur: vente.vendeur,
    acquereur: vente.acquereur,
    lotId: vente.lotId,
    lotType: vente.lotType,
    copropriete: {
      nom: 'Résidence Les Jardins', // TODO: Récupérer depuis le contexte
      adresse: '50 Route La Carrière au Loup, 75002 Paris',
    },
    syndic: {
      civilite: 'M.',
      nom: 'Jean MARTIN', // TODO: Récupérer depuis le contexte utilisateur
      email: 'syndic@coproflex.fr',
      telephone: '01 23 45 67 89',
    },
    dateCompromis: vente.dateCompromis,
    dateActeAuthentique: vente.dateActeAuthentique,
    dateEtatDate: new Date().toISOString(),
    documents: documentsToSend.map(doc => ({
      nom: doc.nom,
      type: doc.type,
      statut: doc.statut,
    })),
  }), [vente, documentsToSend]);

  // Générer l'email à partir du template
  const generatedEmail = useMemo(() => {
    return generateEmailNotaire(emailData, selectedTemplate);
  }, [emailData, selectedTemplate]);

  // Message éditable (initialisé avec le template généré)
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const message = customMessage !== null ? customMessage : generatedEmail.corps;
  const objet = generatedEmail.objet;

  // Régénérer le message depuis le template
  const handleResetMessage = useCallback(() => {
    setCustomMessage(null);
    setIsEditMode(false);
  }, []);

  // Changer de template
  const handleTemplateChange = useCallback((templateId: string) => {
    const template = TEMPLATES_EMAIL_NOTAIRE.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setCustomMessage(null); // Reset le message personnalisé
    }
  }, []);

  const signedDocuments = documents.filter(doc => doc.statut === 'signe');
  const pendingDocuments = documents.filter(doc => doc.statut === 'en_attente' && doc.obligatoire);

  const handleSubmit = async () => {
    if (documentsToSend.length === 0) return;

    setIsSubmitting(true);

    try {
      await onSend({
        notaire: vente.notaire,
        documents: documentsToSend,
        message,
        includeAllDocuments
      });
      setIsSent(true);
    } catch {
      // Erreur gérée par le parent
    } finally {
      setIsSubmitting(false);
    }
  };

  // Écran de confirmation après envoi
  if (isSent) {
    return (
      <div className={styles.modal}>
        <div ref={focusTrapRef} className={styles.modalMedium} role="dialog" aria-modal="true" aria-labelledby="send-notaire-title">
          <div className={styles.modalBody} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className={styles.sendSuccessIcon}>
              <CheckCircle2 size={64} />
            </div>
            <h3 className={styles.sendSuccessTitle}>Envoi effectué avec succès</h3>
            <p className={styles.sendSuccessDesc}>
              Les documents ont été envoyés à <strong>Me. {vente.notaire.prenom} {vente.notaire.nom}</strong>
              <br />
              à l&apos;adresse <strong>{vente.notaire.email}</strong>
            </p>
            <div className={styles.sendSuccessSummary}>
              <span className={styles.sendSuccessCount}>{documentsToSend.length}</span>
              <span>document{documentsToSend.length > 1 ? 's' : ''} envoyé{documentsToSend.length > 1 ? 's' : ''}</span>
            </div>
            <button onClick={onClose} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div ref={focusTrapRef} className={styles.modalLarge} role="dialog" aria-modal="true" aria-labelledby="send-notaire-title">
        <div className={styles.modalHeader}>
          <h3 id="send-notaire-title">
            <Send size={20} aria-hidden="true" style={{ marginRight: 8 }} />
            Envoyer au notaire
          </h3>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Fermer" disabled={isSubmitting}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Alerte si documents non signés */}
          {pendingDocuments.length > 0 && (
            <div className={styles.warning} style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                {pendingDocuments.length} document{pendingDocuments.length > 1 ? 's' : ''} obligatoire{pendingDocuments.length > 1 ? 's' : ''} en attente de signature :
                {' '}{pendingDocuments.map(d => d.nom).join(', ')}
              </span>
            </div>
          )}

          {/* Destinataire */}
          <div className={styles.sendSection}>
            <h4 className={styles.sendSectionTitle}>
              <User size={18} aria-hidden="true" />
              Destinataire
            </h4>
            <div className={styles.sendRecipientCard}>
              <div className={styles.sendRecipientInfo}>
                <span className={styles.sendRecipientName}>
                  Me. {vente.notaire.prenom} {vente.notaire.nom}
                </span>
                <span className={styles.sendRecipientRole}>Notaire</span>
              </div>
              <div className={styles.sendRecipientContact}>
                <span className={styles.sendRecipientItem}>
                  <Mail size={14} aria-hidden="true" />
                  {vente.notaire.email}
                </span>
                <span className={styles.sendRecipientItem}>
                  <Phone size={14} aria-hidden="true" />
                  {vente.notaire.telephone}
                </span>
              </div>
            </div>
          </div>

          {/* Documents à envoyer */}
          <div className={styles.sendSection}>
            <h4 className={styles.sendSectionTitle}>
              <Paperclip size={18} aria-hidden="true" />
              Documents à envoyer ({documentsToSend.length})
            </h4>

            <div className={styles.sendDocumentsList}>
              {documentsToSend.map(doc => (
                <div key={doc.id} className={styles.sendDocumentItem}>
                  <FileText size={16} aria-hidden="true" />
                  <span className={styles.sendDocumentName}>{doc.nom}</span>
                  <span
                    className={styles.sendDocumentStatut}
                    style={{
                      background: doc.statut === 'signe' ? '#d1fae5' : '#fef3c7',
                      color: doc.statut === 'signe' ? '#065f46' : '#92400e'
                    }}
                  >
                    {doc.statut === 'signe' ? 'Signé' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>

            {documents.length > signedDocuments.length && (
              <label className={styles.sendCheckbox}>
                <input
                  type="checkbox"
                  checked={includeAllDocuments}
                  onChange={e => setIncludeAllDocuments(e.target.checked)}
                />
                <span>Inclure tous les documents (y compris non signés)</span>
              </label>
            )}
          </div>

          {/* Sélection du template */}
          <div className={styles.sendSection}>
            <h4 className={styles.sendSectionTitle}>
              <FileType size={18} aria-hidden="true" />
              Modèle d&apos;email
            </h4>
            <div className={styles.formGroup}>
              <select
                value={selectedTemplate.id}
                onChange={e => handleTemplateChange(e.target.value)}
                className={styles.templateSelect}
                disabled={isSubmitting}
              >
                {TEMPLATES_EMAIL_NOTAIRE.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.nom}
                  </option>
                ))}
              </select>
              <p className={styles.templateDescription}>
                {selectedTemplate.description}
              </p>
            </div>
          </div>

          {/* Objet de l'email */}
          <div className={styles.sendSection}>
            <h4 className={styles.sendSectionTitle}>
              <Mail size={18} aria-hidden="true" />
              Objet
            </h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                value={objet}
                readOnly
                className={styles.emailSubject}
              />
            </div>
          </div>

          {/* Message d'accompagnement */}
          <div className={styles.sendSection}>
            <div className={styles.sendSectionHeader}>
              <h4 className={styles.sendSectionTitle}>
                <MessageSquare size={18} aria-hidden="true" />
                Message d&apos;accompagnement
              </h4>
              <div className={styles.messageActions}>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className={styles.messageActionBtn}
                    title="Modifier le message"
                  >
                    <Edit3 size={14} aria-hidden="true" />
                    Modifier
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetMessage}
                    className={styles.messageActionBtn}
                    title="Régénérer depuis le template"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
            <div className={styles.formGroup}>
              {isEditMode ? (
                <textarea
                  value={message}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={12}
                  placeholder="Saisissez votre message..."
                  className={styles.emailBody}
                />
              ) : (
                <div className={styles.emailPreview}>
                  <div className={styles.emailPreviewHeader}>
                    <Eye size={14} aria-hidden="true" />
                    <span>Prévisualisation</span>
                  </div>
                  <pre className={styles.emailPreviewContent}>{message}</pre>
                </div>
              )}
            </div>
            {customMessage !== null && (
              <p className={styles.customMessageNote}>
                <AlertTriangle size={12} aria-hidden="true" />
                Message personnalisé - les modifications seront perdues si vous changez de template
              </p>
            )}
          </div>

          {/* Récapitulatif */}
          <div className={styles.sendSummary}>
            <div className={styles.sendSummaryItem}>
              <span className={styles.sendSummaryLabel}>Lot concerné</span>
              <span className={styles.sendSummaryValue}>{vente.lotId}</span>
            </div>
            <div className={styles.sendSummaryItem}>
              <span className={styles.sendSummaryLabel}>Date compromis</span>
              <span className={styles.sendSummaryValue}>{formatDate(vente.dateCompromis)}</span>
            </div>
            <div className={styles.sendSummaryItem}>
              <span className={styles.sendSummaryLabel}>Vendeur</span>
              <span className={styles.sendSummaryValue}>
                {vente.vendeur.prenom} {vente.vendeur.nom}
              </span>
            </div>
            <div className={styles.sendSummaryItem}>
              <span className={styles.sendSummaryLabel}>Acquéreur</span>
              <span className={styles.sendSummaryValue}>
                {vente.acquereur.prenom} {vente.acquereur.nom}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isSubmitting || documentsToSend.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                Envoyer ({documentsToSend.length} document{documentsToSend.length > 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
