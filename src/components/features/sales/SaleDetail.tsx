'use client';

import { FileText, Download, Send, History, FileCheck, Building2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Sale, SaleDocument, DocumentType, DocumentStatut } from '@/types';
import { DOCUMENT_NAMES, STATUS_LABELS } from '@/hooks/modules/useSalesPage';
import styles from '../../../app/(dashboard)/sales/sales.module.css';

interface SaleDetailProps {
  sale: Sale;
  onShowHistory: () => void;
  onGenerateDocument: (type: DocumentType) => void;
  onSignDocument: (docId: string) => void;
  onSendToNotaire: () => void;
  onUpdateNotificationDate: (date: string) => void;
}

export function SaleDetail({
  sale,
  onShowHistory,
  onGenerateDocument,
  onSignDocument,
  onSendToNotaire,
  onUpdateNotificationDate,
}: SaleDetailProps) {
  const getStatusIcon = (statut: DocumentStatut) => {
    switch (statut) {
      case 'DISPONIBLE':
      case 'SIGNE':
        return <CheckCircle size={16} className={styles.iconSuccess} aria-hidden="true" />;
      case 'EN_ATTENTE':
        return <Clock size={16} className={styles.iconWarning} aria-hidden="true" />;
      case 'ENVOYE':
        return <Send size={16} className={styles.iconInfo} aria-hidden="true" />;
      case 'EXPIRE':
        return <AlertCircle size={16} className={styles.iconError} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="card">
        <div className={styles.saleHeader}>
          <div>
            <h2 className={styles.saleTitle}>Vente {sale.lotIds.join(' + ')}</h2>
            <div className={styles.saleInfo}>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Vendeur:</span><span className={styles.infoValue}>{sale.vendeur}</span></div>
              {sale.acquereur && <div className={styles.infoItem}><span className={styles.infoLabel}>Acquéreur:</span><span className={styles.infoValue}>{sale.acquereur}</span></div>}
              {sale.notaire && <div className={styles.infoItem}><span className={styles.infoLabel}>Notaire:</span><span className={styles.infoValue}>{sale.notaire}</span></div>}
              {sale.dateCompromis && <div className={styles.infoItem}><span className={styles.infoLabel}>Date compromis:</span><span className={styles.infoValue}>{new Date(sale.dateCompromis).toLocaleDateString('fr-FR')}</span></div>}
              {sale.dateActeAuthentique && <div className={styles.infoItem}><span className={styles.infoLabel}>Date acte authentique:</span><span className={styles.infoValue}>{new Date(sale.dateActeAuthentique).toLocaleDateString('fr-FR')}</span></div>}
              {sale.dateNotificationArticle6 && <div className={styles.infoItem}><span className={styles.infoLabel}>Notification article 6:</span><span className={styles.infoValue}>{new Date(sale.dateNotificationArticle6).toLocaleDateString('fr-FR')}</span></div>}
            </div>
          </div>
          <div className={styles.saleActions}>
            <button onClick={onShowHistory} className="btn btn-secondary"><History size={16} style={{ marginRight: 8 }} aria-hidden="true" />Historique</button>
            <button onClick={() => onGenerateDocument('PRE_ETAT_DATE')} className="btn btn-primary"><FileText size={16} style={{ marginRight: 8 }} aria-hidden="true" />Générer documents</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className={styles.sectionTitle}>Workflow des documents</h3>
        <div className={styles.workflowSteps}>
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}><h4>Génération automatique</h4><p>Pré-état daté, État daté, Certificat article 20-II</p><button onClick={() => onGenerateDocument('PRE_ETAT_DATE')} className="btn btn-secondary btn-sm">Générer</button></div>
          </div>
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}><h4>Signature</h4><p>Signature obligatoire par le syndic</p></div>
          </div>
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}><h4>Transmission au notaire</h4><p>Envoi de tous les documents nécessaires</p><button onClick={onSendToNotaire} className="btn btn-secondary btn-sm" disabled={!sale.documents.some(d => d.statut === 'SIGNE')}><Send size={14} style={{ marginRight: 4 }} aria-hidden="true" />Envoyer</button></div>
          </div>
          <div className={styles.workflowStep}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepContent}><h4>Notification article 6</h4><p>Réception de la notification du notaire</p><input type="date" value={sale.dateNotificationArticle6?.split('T')[0] || ''} onChange={(e) => onUpdateNotificationDate(e.target.value)} className={styles.dateInput} /></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className={styles.documentsHeader}><h3 className={styles.documentsTitle}>Documents</h3></div>
        <div className={styles.documentsList}>
          {sale.documents.map((doc) => (
            <div key={doc.id} className={styles.documentItem}>
              <div className={styles.documentIcon}><FileText size={24} aria-hidden="true" /></div>
              <div className={styles.documentInfo}>
                <div className={styles.documentName}>{doc.nom}</div>
                <div className={styles.documentMeta}>
                  <span className={styles.documentType}>{DOCUMENT_NAMES[doc.type]}</span>
                  <span className={styles.documentDate}>
                    {doc.dateUpload && `Ajouté le ${new Date(doc.dateUpload).toLocaleDateString('fr-FR')}`}
                    {doc.dateSignature && ` • Signé le ${new Date(doc.dateSignature).toLocaleDateString('fr-FR')}`}
                    {doc.dateEnvoi && ` • Envoyé le ${new Date(doc.dateEnvoi).toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
              </div>
              <div className={styles.documentStatus}>{getStatusIcon(doc.statut)}<span className={styles.statusLabel}>{STATUS_LABELS[doc.statut]}</span></div>
              <div className={styles.documentActions}>
                {(doc.type === 'ETAT_DATE' || doc.type === 'CERTIFICAT_ARTICLE_20') && doc.statut === 'EN_ATTENTE' && (<button onClick={() => onSignDocument(doc.id)} className="btn btn-primary btn-sm"><FileCheck size={14} style={{ marginRight: 4 }} aria-hidden="true" />Signer</button>)}
                <button className="btn btn-secondary btn-sm"><Download size={14} style={{ marginRight: 4 }} aria-hidden="true" />Télécharger</button>
              </div>
            </div>
          ))}
          {sale.documents.length === 0 && (
            <div className={styles.emptyState}><FileText size={48} className={styles.emptyIcon} aria-hidden="true" /><p>Aucun document généré</p><button onClick={() => onGenerateDocument('PRE_ETAT_DATE')} className="btn btn-primary">Générer les documents</button></div>
          )}
        </div>
      </div>
    </>
  );
}

export function EmptySaleDetail() {
  return (
    <div className="card">
      <div className={styles.emptyState}>
        <Building2 size={48} className={styles.emptyIcon} aria-hidden="true" />
        <p>Sélectionnez une vente pour voir les détails</p>
      </div>
    </div>
  );
}
