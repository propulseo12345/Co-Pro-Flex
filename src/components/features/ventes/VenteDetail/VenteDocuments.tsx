'use client';

import { useState } from 'react';
import { FileText, Upload, Clock, CheckCircle2, Edit2, Download, Eye, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { VenteDocument, Vente } from './types';
import { getStatutStyle, formatDate } from './utils';
import { generateVenteDocumentPDF, previewVenteDocumentPDF } from '@/lib/pdf/generateVenteDocumentPDF';
import styles from './VenteDetail.module.css';

interface VenteDocumentsProps {
  documents: VenteDocument[];
  vente: Vente;
  onSignDocument: (doc: VenteDocument) => void;
}

export function VenteDocuments({ documents, vente, onSignDocument }: VenteDocumentsProps) {
  const [previewDoc, setPreviewDoc] = useState<VenteDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const handleView = (doc: VenteDocument) => {
    const url = previewVenteDocumentPDF({ vente, document: doc });
    setPreviewUrl(url);
    setPreviewDoc(doc);
    setZoom(100);
  };

  const handleDownload = (venteDoc: VenteDocument) => {
    const pdfDoc = generateVenteDocumentPDF({ vente, document: venteDoc });
    const fileName = `${venteDoc.type}_${vente.lotId.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfDoc.save(fileName);
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  return (
    <>
      <div className="card">
        <div className={styles.documentsHeader}>
          <h3>Documents de vente</h3>
          <button className="btn btn-primary">
            <Upload size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Ajouter un document
          </button>
        </div>

        <div className={styles.documentsList}>
          {documents.map((doc) => {
            const statutStyle = getStatutStyle(doc.statut);

            return (
              <div key={doc.id} className={styles.documentCard}>
                <div className={styles.documentIcon}>
                  <FileText size={24} aria-hidden="true" />
                </div>

                <div className={styles.documentContent}>
                  <div className={styles.documentHeader}>
                    <h4 className={styles.documentTitle}>
                      {doc.nom}
                      {doc.obligatoire && <span className={styles.required}>*</span>}
                    </h4>
                    <span
                      className={styles.statutBadge}
                      style={{ background: statutStyle.bg, color: statutStyle.color }}
                    >
                      {statutStyle.label}
                    </span>
                  </div>

                  <div className={styles.documentMeta}>
                    {doc.dateGeneration && (
                      <span className={styles.metaItem}>
                        <Clock size={12} aria-hidden="true" />
                        Généré le {formatDate(doc.dateGeneration)}
                      </span>
                    )}
                    {doc.dateSignature && (
                      <span className={styles.metaItem}>
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Signé le {formatDate(doc.dateSignature)} par {doc.signePar}
                      </span>
                    )}
                  </div>

                  {/* Prévisualisation de la signature manuscrite */}
                  {doc.statut === 'signe' && doc.signatureData && (
                    <div className={styles.documentSignaturePreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.signatureData}
                        alt="Signature"
                        className={styles.documentSignatureImg}
                      />
                      <div className={styles.documentSignatureInfo}>
                        <span className={styles.documentSignatureAuthor}>
                          {doc.signePar}
                        </span>
                        <span className={styles.documentSignatureDate}>
                          {doc.dateSignature && formatDate(doc.dateSignature)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.documentActions}>
                  {doc.statut === 'en_attente' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onSignDocument(doc)}
                    >
                      <Edit2 size={14} aria-hidden="true" />
                      Signer
                    </button>
                  )}
                  {(doc.statut === 'disponible' || doc.statut === 'signe') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download size={14} aria-hidden="true" />
                      Télécharger
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleView(doc)}
                    aria-label={`Voir ${doc.nom}`}
                  >
                    <Eye size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de prévisualisation */}
      {previewDoc && previewUrl && (
        <div className={styles.previewOverlay} onClick={closePreview}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>
                <FileText size={20} aria-hidden="true" />
                <h3>{previewDoc.nom}</h3>
              </div>
              <div className={styles.previewActions}>
                <div className={styles.zoomControls}>
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    className={styles.zoomBtn}
                    aria-label="Zoom arrière"
                  >
                    <ZoomOut size={16} aria-hidden="true" />
                  </button>
                  <span className={styles.zoomValue}>{zoom}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    className={styles.zoomBtn}
                    aria-label="Zoom avant"
                  >
                    <ZoomIn size={16} aria-hidden="true" />
                  </button>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload(previewDoc)}
                >
                  <Download size={14} aria-hidden="true" />
                  Télécharger
                </button>
                <button
                  onClick={closePreview}
                  className={styles.closeBtn}
                  aria-label="Fermer"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className={styles.previewContent}>
              <iframe
                src={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
                title={`Aperçu de ${previewDoc.nom}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
