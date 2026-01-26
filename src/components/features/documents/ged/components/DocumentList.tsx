'use client';

import Link from 'next/link';
import { Download, Eye, Link2, Shield, Plus } from 'lucide-react';
import { getDocumentLinks, getLinkableModule } from '@/lib/services/document-linking.service';
import { AccessBadge } from '@/components/features/documents/AccessBadge';
import { NiveauConfidentialite } from '@/types/enums';
import type { DocumentWithRelevance } from '../domain/types';
import { getFileIcon, getCategoryColor, getCategoryLabel, getLinkedEntityIcon } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface DocumentListProps {
  documents: DocumentWithRelevance[];
  canManageAccess: boolean;
  onPreview: (doc: DocumentWithRelevance) => void;
  onLink: (doc: DocumentWithRelevance) => void;
  onAccessRights: (doc: DocumentWithRelevance) => void;
}

export function DocumentList({ documents, canManageAccess, onPreview, onLink, onAccessRights }: DocumentListProps) {
  return (
    <div className={styles.listView}>
      <table className={styles.listTable}>
        <thead>
          <tr>
            <th>Document</th>
            <th>Catégorie</th>
            <th>Accès</th>
            <th>Entités liées</th>
            <th>Date</th>
            <th>Taille</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const docLinks = getDocumentLinks(doc.id);

            return (
              <tr
                key={doc.id}
                onClick={() => onPreview(doc)}
                className={styles.listRow}
                style={{ cursor: 'pointer' }}
              >
                <td className={styles.listDocName}>
                  <span className={styles.listIcon} style={{ color: getCategoryColor(doc.categorie) }}>
                    {getFileIcon(doc.type, doc.nom)}
                  </span>
                  {doc.nom}
                </td>
                <td>
                  <span
                    className={styles.listCategory}
                    style={{
                      backgroundColor: `${getCategoryColor(doc.categorie)}20`,
                      color: getCategoryColor(doc.categorie),
                    }}
                  >
                    {getCategoryLabel(doc.categorie)}
                  </span>
                </td>
                <td>
                  <AccessBadge
                    level={doc.confidentialite || NiveauConfidentialite.PUBLIC}
                    showLabel
                    size="sm"
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {docLinks.length > 0 ? (
                    <div className={styles.listLinksCell}>
                      {docLinks.map((link) => {
                        const module = getLinkableModule(link.entityType);
                        return module ? (
                          <Link
                            key={link.id}
                            href={`${module.routeBase}/${link.entityId}`}
                            className={styles.listLinkTag}
                            style={{ color: module.color }}
                            title={`Voir ${module.label}`}
                          >
                            {getLinkedEntityIcon(link.entityType, 12)}
                            <span>{module.label}</span>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <button
                      className={styles.listLinkBtn}
                      onClick={() => onLink(doc)}
                      title="Lier à une entité"
                    >
                      <Plus size={14} /> Lier
                    </button>
                  )}
                </td>
                <td>{new Date(doc.dateAjout).toLocaleDateString('fr-FR')}</td>
                <td>{doc.taille}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className={styles.listActions}>
                    <button
                      className={styles.listPreviewBtn}
                      onClick={() => onPreview(doc)}
                      aria-label="Prévisualiser"
                      title="Prévisualiser"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={styles.listLinkIconBtn}
                      onClick={() => onLink(doc)}
                      aria-label="Lier"
                      title="Lier à une entité"
                    >
                      <Link2 size={16} aria-hidden="true" />
                    </button>
                    {canManageAccess && (
                      <button
                        className={styles.listAccessBtn}
                        onClick={() => onAccessRights(doc)}
                        aria-label="Gérer les droits d'accès"
                        title="Gérer les droits d'accès"
                      >
                        <Shield size={16} aria-hidden="true" />
                      </button>
                    )}
                    <button className={styles.listDownloadBtn} aria-label={`Télécharger ${doc.nom}`}>
                      <Download size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
