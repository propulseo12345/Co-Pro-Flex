'use client';

import Link from 'next/link';
import { Link2, X, Sparkles, Check, ExternalLink } from 'lucide-react';
import { getDocumentLinks, getLinkableModule, LINKABLE_MODULES } from '@/lib/services/document-linking.service';
import type { DocumentWithFolder, DetectedEntityType, ExtractedDocumentData, LinkedEntityType } from '../domain/types';
import { getFileIcon, getCategoryColor, getCategoryLabel, getLinkedEntityIcon } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface LinkModalProps {
  document: DocumentWithFolder;
  detectedEntityType: DetectedEntityType | null;
  extractedData: ExtractedDocumentData;
  onClose: () => void;
  onCreateLink: (entityType: LinkedEntityType, entityId?: string) => void;
}

export function LinkModal({
  document,
  detectedEntityType,
  extractedData,
  onClose,
  onCreateLink,
}: LinkModalProps) {
  const existingLinks = getDocumentLinks(document.id);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.linkModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.linkModalHeader}>
          <h2>
            <Link2 size={20} />
            Lier ce document
          </h2>
          <button className={styles.linkModalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.linkModalBody}>
          <div className={styles.linkSelectedDoc}>
            <div className={styles.linkDocIcon} style={{ color: getCategoryColor(document.categorie) }}>
              {getFileIcon(document.type, document.nom)}
            </div>
            <div className={styles.linkDocInfo}>
              <h3>{document.nom}</h3>
              <p>
                {getCategoryLabel(document.categorie)} • {document.taille}
              </p>
            </div>
          </div>

          {detectedEntityType && (
            <div className={styles.linkDetection}>
              <div className={styles.linkDetectionHeader}>
                <Sparkles size={16} />
                <span>Détection automatique</span>
                <span className={styles.confidenceBadge}>{detectedEntityType.confidence}% confiance</span>
              </div>
              <p>
                Ce document semble être lié à un(e){' '}
                <strong>{getLinkableModule(detectedEntityType.type)?.label}</strong>
              </p>
              {Object.keys(extractedData).length > 0 && (
                <div className={styles.extractedData}>
                  <span>Données détectées :</span>
                  {extractedData.fournisseur && (
                    <span>
                      <strong>Fournisseur :</strong> {extractedData.fournisseur}
                    </span>
                  )}
                  {extractedData.dateDocument && (
                    <span>
                      <strong>Date :</strong> {extractedData.dateDocument}
                    </span>
                  )}
                  {extractedData.periode && (
                    <span>
                      <strong>Période :</strong> {extractedData.periode}
                    </span>
                  )}
                  {extractedData.numero && (
                    <span>
                      <strong>Numéro :</strong> {extractedData.numero}
                    </span>
                  )}
                </div>
              )}
              <button
                className={styles.linkSuggestionBtn}
                onClick={() => onCreateLink(detectedEntityType.type)}
              >
                <Check size={16} />
                Créer {getLinkableModule(detectedEntityType.type)?.label} et lier
              </button>
            </div>
          )}

          <div className={styles.linkManualSection}>
            <h4>Ou lier manuellement à :</h4>
            <div className={styles.linkModulesGrid}>
              {LINKABLE_MODULES.map((mod) => (
                <button
                  key={mod.type}
                  className={styles.linkModuleBtn}
                  onClick={() => onCreateLink(mod.type)}
                  style={{ '--module-color': mod.color } as React.CSSProperties}
                >
                  {getLinkedEntityIcon(mod.type, 20)}
                  <span className={styles.linkModuleName}>{mod.label}</span>
                  <span className={styles.linkModuleAction}>
                    {detectedEntityType?.type === mod.type ? 'Suggéré' : 'Lier'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {existingLinks.length > 0 && (
            <div className={styles.linkExisting}>
              <h4>Liaisons existantes</h4>
              <div className={styles.linkExistingList}>
                {existingLinks.map((link) => {
                  const mod = getLinkableModule(link.entityType);
                  return mod ? (
                    <div key={link.id} className={styles.linkExistingItem}>
                      <span style={{ color: mod.color }}>{getLinkedEntityIcon(link.entityType, 16)}</span>
                      <span>{mod.label}</span>
                      <Link
                        href={`${mod.routeBase}/${link.entityId}`}
                        className={styles.linkExistingAction}
                      >
                        Voir <ExternalLink size={12} />
                      </Link>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
