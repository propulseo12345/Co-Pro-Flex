'use client';

import Link from 'next/link';
import { Download, Eye, Link2, Shield, ExternalLink, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { getDocumentLinks, getLinkableModule } from '@/lib/services/document-linking.service';
import { getDocumentVersioning, isDocumentObsolete, isOverdueForReview, getStatusLabel, getStatusColor } from '@/lib/services/document-versioning.service';
import { AccessBadge } from '@/components/features/documents/AccessBadge';
import { NiveauConfidentialite } from '@/types/enums';
import type { DocumentWithRelevance } from '../domain/types';
import { getFileIcon, getCategoryColor, getCategoryLabel, getLinkedEntityIcon } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface DocumentGridProps {
  documents: DocumentWithRelevance[];
  canManageAccess: boolean;
  onPreview: (doc: DocumentWithRelevance) => void;
  onLink: (doc: DocumentWithRelevance) => void;
  onAccessRights: (doc: DocumentWithRelevance) => void;
}

export function DocumentGrid({ documents, canManageAccess, onPreview, onLink, onAccessRights }: DocumentGridProps) {
  return (
    <div className={styles.grid}>
      {documents.map((doc) => {
        const docLinks = getDocumentLinks(doc.id);
        const versionData = getDocumentVersioning(doc.id);
        const isObsolete = isDocumentObsolete(doc.id);
        const isOverdue = isOverdueForReview(doc.id);

        return (
          <div
            key={doc.id}
            className={clsx(
              styles.docCard,
              isObsolete && styles.docCardObsolete,
              isOverdue && !isObsolete && styles.docCardWarning
            )}
            onClick={() => onPreview(doc)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onPreview(doc)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.docBadges}>
              {versionData && (
                <div
                  className={styles.docVersionBadge}
                  style={{
                    backgroundColor: `${getStatusColor(versionData.statut)}15`,
                    color: getStatusColor(versionData.statut),
                    borderColor: getStatusColor(versionData.statut),
                  }}
                  title={`${getStatusLabel(versionData.statut)} - v${versionData.version}`}
                >
                  {isObsolete && <AlertTriangle size={10} />}
                  v{versionData.version}
                </div>
              )}
              <AccessBadge level={doc.confidentialite || NiveauConfidentialite.PUBLIC} size="sm" />
            </div>

            <div
              className={styles.docIcon}
              style={{
                backgroundColor: `${getCategoryColor(doc.categorie)}15`,
                color: getCategoryColor(doc.categorie),
              }}
            >
              {getFileIcon(doc.type, doc.nom)}
            </div>

            <div className={styles.docInfo}>
              <h3 className={styles.docName} title={doc.nom}>
                {doc.nom}
              </h3>
              <p className={styles.docMeta}>
                {doc.taille} • {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
              </p>
              <div
                className={styles.docCategory}
                style={{
                  backgroundColor: `${getCategoryColor(doc.categorie)}20`,
                  color: getCategoryColor(doc.categorie),
                }}
              >
                {getCategoryLabel(doc.categorie)}
              </div>

              {docLinks.length > 0 && (
                <div className={styles.docLinks}>
                  {docLinks.map((link) => {
                    const module = getLinkableModule(link.entityType);
                    return module ? (
                      <Link
                        key={link.id}
                        href={`${module.routeBase}/${link.entityId}`}
                        className={styles.docLinkTag}
                        style={{ backgroundColor: `${module.color}15`, color: module.color }}
                        title={`Voir ${module.label}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getLinkedEntityIcon(link.entityType, 12)}
                        <span>{module.label}</span>
                        <ExternalLink size={10} />
                      </Link>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className={styles.docActions} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.previewBtn}
                title="Prévisualiser"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(doc);
                }}
                aria-label={`Prévisualiser ${doc.nom}`}
              >
                <Eye size={16} aria-hidden="true" />
              </button>
              <button
                className={styles.linkBtn}
                title="Lier à une entité"
                onClick={(e) => {
                  e.stopPropagation();
                  onLink(doc);
                }}
                aria-label={`Lier ${doc.nom} à une entité`}
              >
                <Link2 size={16} aria-hidden="true" />
              </button>
              {canManageAccess && (
                <button
                  className={styles.accessBtn}
                  title="Gérer les droits d'accès"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccessRights(doc);
                  }}
                  aria-label={`Gérer les droits d'accès de ${doc.nom}`}
                >
                  <Shield size={16} aria-hidden="true" />
                </button>
              )}
              <button className={styles.downloadBtn} title="Télécharger" aria-label={`Télécharger ${doc.nom}`}>
                <Download size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
