'use client';

import { useState, useId, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  X, Download, FileText, ZoomIn, ZoomOut, RotateCcw, RotateCw,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Printer,
  Share2, Trash2, FolderInput, Edit3, Info, Link2, Clock,
  Eye, Calendar, HardDrive, Tag, User, ExternalLink,
  Image, FileSpreadsheet, FolderOpen, Receipt, FileSignature,
  Users, ClipboardList, Banknote, AlertTriangle, Wrench, Home,
  History, GitBranch, Plus, CheckCircle, Archive, FileEdit, XCircle,
  Upload, BarChart3, Lock, Unlock, Globe, Shield, Type,
  ArrowRight
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  getDocumentLinks,
  getLinkableModule,
  LinkedEntityType,
} from '@/lib/services/document-linking.service';
import {
  getDocumentVersioning,
  getDocumentVersionHistory,
  isDocumentObsolete,
  needsReview,
  isOverdueForReview,
  getStatusLabel,
  getStatusColor,
  getModificationTypeLabel,
  DocumentValidityStatus,
} from '@/lib/services/document-versioning.service';
import {
  getDocumentMetadata,
  getDocumentActions,
  getDocumentRelations,
  getDocumentTags,
  getActionTypeLabel,
  getRelationTypeLabel,
  getRelationTypeColor,
  getConfidentialityLabel,
  getConfidentialityColor,
  formatRelativeDate,
  formatDateTime,
  DocumentActionType,
} from '@/lib/services/document-metadata.service';
import styles from './DocumentViewerModal.module.css';

// Type pour les dossiers GED
interface GEDFolder {
  id: string;
  nom: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  ordre: number;
}

// Type pour les documents avec métadonnées complètes
export interface DocumentForViewer {
  id: string;
  nom: string;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  categorie: string;
  dateAjout: string;
  taille: string;
  dossierId?: string;
}

interface DocumentViewerModalProps {
  document: DocumentForViewer;
  onClose: () => void;
  onRename?: (doc: DocumentForViewer, newName: string) => void;
  onMove?: (doc: DocumentForViewer, newFolderId: string) => void;
  onDelete?: (doc: DocumentForViewer) => void;
  onShare?: (doc: DocumentForViewer) => void;
  folders?: GEDFolder[];
}

// Helper function to compute folder path from folder list
function computeFolderPath(folderId: string | undefined, folders: GEDFolder[]): GEDFolder[] {
  if (!folderId || folders.length === 0) return [];

  const path: GEDFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    if (folder) {
      path.unshift(folder);
      currentId = folder.parentId;
    } else {
      break;
    }
  }

  return path;
}

// Historique de consultation simulé
const MOCK_VIEW_HISTORY = [
  { date: '2024-12-28T14:30:00', user: 'Jean Dupont', action: 'Consulté' },
  { date: '2024-12-15T10:15:00', user: 'Marie Martin', action: 'Téléchargé' },
  { date: '2024-11-20T16:45:00', user: 'Jean Dupont', action: 'Consulté' },
];

// Icône pour les types d'entités liées
function getLinkedEntityIcon(entityType: LinkedEntityType, size = 14) {
  const icons: Record<LinkedEntityType, React.ReactNode> = {
    FACTURE: <Receipt size={size} />,
    CONTRAT: <FileSignature size={size} />,
    ASSEMBLEE_GENERALE: <Users size={size} />,
    ORDRE_SERVICE: <ClipboardList size={size} />,
    APPEL_FONDS: <Banknote size={size} />,
    IMPAYE: <AlertTriangle size={size} />,
    INTERVENTION: <Wrench size={size} />,
    VENTE: <Home size={size} />,
    COPROPRIETAIRE: <User size={size} />,
  };
  return icons[entityType] || <Link2 size={size} />;
}

// Icône selon le type de fichier
function getFileIcon(type: string, nom: string, size = 64) {
  if (type === 'IMAGE' || nom.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return <Image size={size} />;
  }
  if (nom.match(/\.(xlsx?|csv)$/i)) {
    return <FileSpreadsheet size={size} />;
  }
  if (nom.match(/\.(zip|rar|7z)$/i)) {
    return <FolderOpen size={size} />;
  }
  return <FileText size={size} />;
}

// Labels des catégories
const CATEGORY_LABELS: Record<string, string> = {
  PV_AG: "PV d'Assemblée Générale",
  REGLEMENT: 'Règlement',
  CONTRAT: 'Contrat',
  FACTURE: 'Facture',
  DIAGNOSTIC: 'Diagnostic',
  PLAN: 'Plan',
  CORRESPONDANCE: 'Correspondance',
  PHOTO: 'Photo',
  ORDRE_SERVICE: 'Ordre de Service',
  AUTRE: 'Autre',
};

export default function DocumentViewerModal({
  document,
  onClose,
  onRename,
  onMove,
  onDelete,
  onShare,
  folders = [],
}: DocumentViewerModalProps) {
  // États de l'interface
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'info' | 'links' | 'versions' | 'history'>('preview');
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newName, setNewName] = useState(document.nom);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);

  const titleId = useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    isActive: true,
    escapeDeactivates: true,
    onEscape: onClose,
  });

  // Nombre de pages simulé (basé sur la taille du fichier)
  const totalPages = useMemo(() => {
    const sizeMo = parseFloat(document.taille);
    return Math.max(1, Math.ceil(sizeMo * 3)); // ~3 pages par Mo
  }, [document.taille]);

  // Type de fichier
  const isPdf = document.nom.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.nom);
  const isPreviewable = isPdf || isImage;

  // Documents liés
  const linkedEntities = useMemo(() => {
    return getDocumentLinks(document.id);
  }, [document.id]);

  // Données de versioning
  const versioningData = useMemo(() => {
    return getDocumentVersioning(document.id);
  }, [document.id]);

  const versionHistory = useMemo(() => {
    return getDocumentVersionHistory(document.id);
  }, [document.id]);

  const documentIsObsolete = useMemo(() => isDocumentObsolete(document.id), [document.id]);
  const documentNeedsReview = useMemo(() => needsReview(document.id), [document.id]);
  const documentIsOverdue = useMemo(() => isOverdueForReview(document.id), [document.id]);

  // Métadonnées complètes
  const metadata = useMemo(() => getDocumentMetadata(document.id), [document.id]);
  const actionHistory = useMemo(() => getDocumentActions(document.id, 20), [document.id]);
  const documentRelations = useMemo(() => getDocumentRelations(document.id), [document.id]);
  const documentTags = useMemo(() => getDocumentTags(document.id), [document.id]);

  // Chemin du dossier
  const folderPath = useMemo(() => {
    return computeFolderPath(document.dossierId, folders);
  }, [document.dossierId, folders]);

  // Handlers
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(300, z + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(25, z - 25));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation(r => (r - 90 + 360) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation(r => (r + 90) % 360);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(p => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleDownload = useCallback(() => {
    alert(`Téléchargement de "${document.nom}" en cours...\n\nFonctionnalité disponible après intégration Supabase.`);
  }, [document.nom]);

  const handlePrint = useCallback(() => {
    alert(`Impression de "${document.nom}"...\n\nFonctionnalité disponible après intégration Supabase.`);
  }, [document.nom]);

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(document);
    } else {
      alert(`Partage de "${document.nom}"...\n\nUn lien sécurisé sera généré après intégration Supabase.`);
    }
  }, [document, onShare]);

  const handleRename = useCallback(() => {
    if (newName.trim() && newName !== document.nom) {
      if (onRename) {
        onRename(document, newName.trim());
      } else {
        alert(`Document renommé : "${newName.trim()}"\n\nFonctionnalité disponible après intégration Supabase.`);
      }
    }
    setShowRenameInput(false);
  }, [document, newName, onRename]);

  const handleMove = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (onMove) {
      onMove(document, folderId);
    } else {
      alert(`Document déplacé vers "${folder?.nom || folderId}"\n\nFonctionnalité disponible après intégration Supabase.`);
    }
    setShowMoveModal(false);
  }, [document, onMove, folders]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Voulez-vous vraiment supprimer "${document.nom}" ?`)) {
      if (onDelete) {
        onDelete(document);
      } else {
        alert(`Document supprimé.\n\nFonctionnalité disponible après intégration Supabase.`);
      }
      onClose();
    }
  }, [document, onDelete, onClose]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(f => !f);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`${styles.overlay} ${isFullscreen ? styles.overlayFullscreen : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={focusTrapRef}
        className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.docIcon}>
              {getFileIcon(document.type, document.nom, 24)}
            </div>
            {showRenameInput ? (
              <div className={styles.renameInputWrapper}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setShowRenameInput(false);
                  }}
                  className={styles.renameInput}
                  autoFocus
                />
                <button className={styles.renameConfirm} onClick={handleRename}>OK</button>
                <button className={styles.renameCancel} onClick={() => setShowRenameInput(false)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <h2 id={titleId} className={styles.docTitle} title={document.nom}>
                {document.nom}
              </h2>
            )}
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.actionBtn}
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={16} />
            Aperçu
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={16} />
            Informations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'links' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('links')}
          >
            <Link2 size={16} />
            Entités liées
            {linkedEntities.length > 0 && (
              <span className={styles.tabBadge}>{linkedEntities.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'versions' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('versions')}
          >
            <GitBranch size={16} />
            Versions
            {versioningData && (
              <span
                className={styles.tabBadge}
                style={{ backgroundColor: getStatusColor(versioningData.statut) }}
              >
                {versioningData.version}
              </span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={16} />
            Historique
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <>
              {/* Toolbar */}
              {isPreviewable && (
                <div className={styles.toolbar}>
                  {/* Navigation pages (PDF) */}
                  {isPdf && totalPages > 1 && (
                    <div className={styles.pageNav}>
                      <button
                        className={styles.toolBtn}
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        title="Page précédente"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className={styles.pageInfo}>
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        className={styles.toolBtn}
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        title="Page suivante"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Zoom */}
                  <div className={styles.zoomControls}>
                    <button
                      className={styles.toolBtn}
                      onClick={handleZoomOut}
                      disabled={zoom <= 25}
                      title="Zoom arrière"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <span className={styles.zoomValue}>{zoom}%</span>
                    <button
                      className={styles.toolBtn}
                      onClick={handleZoomIn}
                      disabled={zoom >= 300}
                      title="Zoom avant"
                    >
                      <ZoomIn size={18} />
                    </button>
                  </div>

                  {/* Rotation */}
                  <div className={styles.rotationControls}>
                    <button
                      className={styles.toolBtn}
                      onClick={handleRotateLeft}
                      title="Pivoter à gauche"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      className={styles.toolBtn}
                      onClick={handleRotateRight}
                      title="Pivoter à droite"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className={styles.toolbarActions}>
                    <button
                      className={styles.toolBtn}
                      onClick={handlePrint}
                      title="Imprimer"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
                      onClick={handleDownload}
                      title="Télécharger"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Area */}
              <div className={styles.previewArea}>
                {isPdf ? (
                  <div
                    className={styles.pdfContainer}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    }}
                  >
                    <div className={styles.pdfPreview}>
                      <div className={styles.pdfPage}>
                        <FileText size={48} className={styles.pdfIcon} />
                        <h3>Aperçu du document</h3>
                        <p className={styles.pdfFilename}>{document.nom}</p>
                        <p className={styles.pdfPageNum}>Page {currentPage} sur {totalPages}</p>
                        <div className={styles.pdfMockContent}>
                          <div className={styles.pdfLine} style={{ width: '80%' }} />
                          <div className={styles.pdfLine} style={{ width: '95%' }} />
                          <div className={styles.pdfLine} style={{ width: '70%' }} />
                          <div className={styles.pdfLine} style={{ width: '85%' }} />
                          <div className={styles.pdfLine} style={{ width: '60%' }} />
                          <div className={styles.pdfLine} style={{ width: '90%' }} />
                          <div className={styles.pdfLine} style={{ width: '75%' }} />
                        </div>
                        <p className={styles.pdfNote}>
                          Prévisualisation simulée - En production, le PDF réel sera affiché via PDF.js
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isImage ? (
                  <div
                    className={styles.imageContainer}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    }}
                  >
                    <div className={styles.imagePreview}>
                      <Image size={64} className={styles.imageIcon} />
                      <h3>Aperçu de l'image</h3>
                      <p className={styles.imageFilename}>{document.nom}</p>
                      <p className={styles.imageNote}>
                        Prévisualisation simulée - En production, l'image réelle sera affichée
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.unsupportedPreview}>
                    {getFileIcon(document.type, document.nom, 64)}
                    <h3>Aperçu non disponible</h3>
                    <p>Ce format de fichier ne peut pas être prévisualisé directement.</p>
                    <button className={styles.downloadBtnLarge} onClick={handleDownload}>
                      <Download size={18} />
                      Télécharger le fichier
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className={styles.infoTab}>
              {/* Informations générales */}
              <div className={styles.infoSection}>
                <h3>Informations générales</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      <FileText size={14} /> Nom
                    </span>
                    <span className={styles.infoValue}>{document.nom}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      <Tag size={14} /> Catégorie
                    </span>
                    <span className={styles.infoValue}>
                      {CATEGORY_LABELS[document.categorie] || document.categorie}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      <HardDrive size={14} /> Taille
                    </span>
                    <span className={styles.infoValue}>{document.taille}</span>
                  </div>
                  {folderPath.length > 0 && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        <FolderOpen size={14} /> Emplacement
                      </span>
                      <span className={styles.infoValue}>
                        {folderPath.map(f => f.nom).join(' / ')}
                      </span>
                    </div>
                  )}
                  {metadata?.description && (
                    <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
                      <span className={styles.infoLabel}>
                        <Info size={14} /> Description
                      </span>
                      <span className={styles.infoValue}>{metadata.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Traçabilité */}
              <div className={styles.infoSection}>
                <h3>
                  <Upload size={16} />
                  Traçabilité
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      <User size={14} /> Uploadé par
                    </span>
                    <span className={styles.infoValue}>
                      {metadata?.uploadedByName || 'Inconnu'}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>
                      <Calendar size={14} /> Date d'upload
                    </span>
                    <span className={styles.infoValue}>
                      {metadata?.uploadedAt
                        ? formatDateTime(metadata.uploadedAt)
                        : new Date(document.dateAjout).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {metadata?.lastModifiedByName && (
                    <>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>
                          <Edit3 size={14} /> Dernière modification
                        </span>
                        <span className={styles.infoValue}>
                          {formatDateTime(metadata.lastModifiedAt!)}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>
                          <User size={14} /> Modifié par
                        </span>
                        <span className={styles.infoValue}>{metadata.lastModifiedByName}</span>
                      </div>
                    </>
                  )}
                  {metadata?.source && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        <Type size={14} /> Source
                      </span>
                      <span className={styles.infoValue}>{metadata.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistiques d'usage */}
              {metadata && (
                <div className={styles.infoSection}>
                  <h3>
                    <BarChart3 size={16} />
                    Statistiques d'usage
                  </h3>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <Eye size={20} />
                      <span className={styles.statValue}>{metadata.viewCount}</span>
                      <span className={styles.statLabel}>Consultations</span>
                    </div>
                    <div className={styles.statCard}>
                      <Download size={20} />
                      <span className={styles.statValue}>{metadata.downloadCount}</span>
                      <span className={styles.statLabel}>Téléchargements</span>
                    </div>
                    <div className={styles.statCard}>
                      <Printer size={20} />
                      <span className={styles.statValue}>{metadata.printCount}</span>
                      <span className={styles.statLabel}>Impressions</span>
                    </div>
                    <div className={styles.statCard}>
                      <Share2 size={20} />
                      <span className={styles.statValue}>{metadata.shareCount}</span>
                      <span className={styles.statLabel}>Partages</span>
                    </div>
                  </div>
                  {metadata.lastViewedAt && (
                    <div className={styles.lastViewedInfo}>
                      <span>Dernière consultation :</span>
                      <strong>{formatRelativeDate(metadata.lastViewedAt)}</strong>
                      {metadata.lastViewedByName && (
                        <span>par {metadata.lastViewedByName}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              <div className={styles.infoSection}>
                <h3>
                  <Tag size={16} />
                  Tags
                </h3>
                {documentTags.length > 0 ? (
                  <div className={styles.tagsContainer}>
                    {documentTags.map((tag) => (
                      <span
                        key={tag.id}
                        className={styles.tagBadge}
                        style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                    <button className={styles.addTagBtn}>
                      <Plus size={14} />
                      Ajouter
                    </button>
                  </div>
                ) : (
                  <div className={styles.noTags}>
                    <span>Aucun tag</span>
                    <button className={styles.addTagBtn}>
                      <Plus size={14} />
                      Ajouter un tag
                    </button>
                  </div>
                )}
              </div>

              {/* Documents liés (Relations) */}
              {(documentRelations.asSource.length > 0 || documentRelations.asTarget.length > 0) && (
                <div className={styles.infoSection}>
                  <h3>
                    <Link2 size={16} />
                    Documents liés
                  </h3>
                  <div className={styles.relationsContainer}>
                    {documentRelations.asSource.map((relation) => (
                      <div key={relation.id} className={styles.relationItem}>
                        <div
                          className={styles.relationBadge}
                          style={{
                            backgroundColor: `${getRelationTypeColor(relation.relationType)}15`,
                            color: getRelationTypeColor(relation.relationType),
                          }}
                        >
                          <ArrowRight size={12} />
                          {getRelationTypeLabel(relation.relationType)}
                        </div>
                        <span className={styles.relationDocName}>
                          {relation.targetDocumentId}
                        </span>
                        {relation.description && (
                          <span className={styles.relationDescription}>{relation.description}</span>
                        )}
                      </div>
                    ))}
                    {documentRelations.asTarget.map((relation) => (
                      <div key={relation.id} className={styles.relationItem}>
                        <div
                          className={styles.relationBadge}
                          style={{
                            backgroundColor: `${getRelationTypeColor(relation.relationType)}15`,
                            color: getRelationTypeColor(relation.relationType),
                          }}
                        >
                          {getRelationTypeLabel(relation.relationType)} par
                        </div>
                        <span className={styles.relationDocName}>
                          {relation.sourceDocumentId}
                        </span>
                        {relation.description && (
                          <span className={styles.relationDescription}>{relation.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidentialité */}
              {metadata && (
                <div className={styles.infoSection}>
                  <h3>
                    <Shield size={16} />
                    Confidentialité
                  </h3>
                  <div
                    className={styles.confidentialityBadge}
                    style={{
                      backgroundColor: `${getConfidentialityColor(metadata.confidentiality)}15`,
                      color: getConfidentialityColor(metadata.confidentiality),
                      borderColor: getConfidentialityColor(metadata.confidentiality),
                    }}
                  >
                    {metadata.confidentiality === 'PUBLIC' ? (
                      <Globe size={16} />
                    ) : metadata.confidentiality === 'CONSEIL_SYNDICAL' ? (
                      <Users size={16} />
                    ) : metadata.confidentiality === 'CONFIDENTIEL' ? (
                      <Shield size={16} />
                    ) : (
                      <Lock size={16} />
                    )}
                    {getConfidentialityLabel(metadata.confidentiality)}
                  </div>
                </div>
              )}

              {/* Notes */}
              {metadata?.notes && (
                <div className={styles.infoSection}>
                  <h3>
                    <Edit3 size={16} />
                    Notes
                  </h3>
                  <div className={styles.notesContent}>
                    {metadata.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.infoSection}>
                <h3>Actions</h3>
                <div className={styles.actionsGrid}>
                  <button className={styles.actionCard} onClick={() => setShowRenameInput(true)}>
                    <Edit3 size={20} />
                    <span>Renommer</span>
                  </button>
                  <button className={styles.actionCard} onClick={() => setShowMoveModal(true)}>
                    <FolderInput size={20} />
                    <span>Déplacer</span>
                  </button>
                  <button className={styles.actionCard} onClick={handleShare}>
                    <Share2 size={20} />
                    <span>Partager</span>
                  </button>
                  <button className={styles.actionCard} onClick={handleDownload}>
                    <Download size={20} />
                    <span>Télécharger</span>
                  </button>
                  <button className={styles.actionCard} onClick={handlePrint}>
                    <Printer size={20} />
                    <span>Imprimer</span>
                  </button>
                  <button className={`${styles.actionCard} ${styles.actionCardDanger}`} onClick={handleDelete}>
                    <Trash2 size={20} />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Links Tab */}
          {activeTab === 'links' && (
            <div className={styles.linksTab}>
              {linkedEntities.length > 0 ? (
                <div className={styles.linkedEntitiesList}>
                  <h3>Entités liées à ce document</h3>
                  {linkedEntities.map((link) => {
                    const module = getLinkableModule(link.entityType);
                    return module ? (
                      <div key={link.id} className={styles.linkedEntityCard}>
                        <div
                          className={styles.linkedEntityIcon}
                          style={{ backgroundColor: `${module.color}15`, color: module.color }}
                        >
                          {getLinkedEntityIcon(link.entityType, 20)}
                        </div>
                        <div className={styles.linkedEntityInfo}>
                          <span className={styles.linkedEntityType}>{module.label}</span>
                          <span className={styles.linkedEntityId}>ID: {link.entityId}</span>
                          {link.extractedData?.objet && (
                            <span className={styles.linkedEntityDesc}>
                              {link.extractedData.objet}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`${module.routeBase}/${link.entityId}`}
                          className={styles.linkedEntityLink}
                        >
                          Voir <ExternalLink size={14} />
                        </Link>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className={styles.noLinksState}>
                  <Link2 size={48} className={styles.noLinksIcon} />
                  <h3>Aucune entité liée</h3>
                  <p>Ce document n'est pas encore lié à une facture, un contrat ou une autre entité.</p>
                  <button className={styles.linkBtn}>
                    <Link2 size={16} />
                    Lier à une entité
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div className={styles.versionsTab}>
              {/* Alerte si document obsolète ou à réviser */}
              {(documentIsObsolete || documentIsOverdue || documentNeedsReview) && (
                <div
                  className={`${styles.versionAlert} ${
                    documentIsObsolete || documentIsOverdue
                      ? styles.versionAlertDanger
                      : styles.versionAlertWarning
                  }`}
                >
                  <AlertTriangle size={20} />
                  <div className={styles.versionAlertContent}>
                    {documentIsObsolete && (
                      <>
                        <strong>Document obsolète</strong>
                        <p>Ce document n'est plus à jour et devrait être remplacé par une nouvelle version.</p>
                      </>
                    )}
                    {documentIsOverdue && !documentIsObsolete && (
                      <>
                        <strong>Révision en retard</strong>
                        <p>
                          Ce document aurait dû être révisé le{' '}
                          {versioningData?.prochainExamen &&
                            new Date(versioningData.prochainExamen).toLocaleDateString('fr-FR')}
                        </p>
                      </>
                    )}
                    {documentNeedsReview && !documentIsObsolete && !documentIsOverdue && (
                      <>
                        <strong>Révision à prévoir</strong>
                        <p>
                          Ce document devra être révisé avant le{' '}
                          {versioningData?.prochainExamen &&
                            new Date(versioningData.prochainExamen).toLocaleDateString('fr-FR')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Informations de version actuelles */}
              {versioningData ? (
                <>
                  <div className={styles.versionCurrent}>
                    <div className={styles.versionHeader}>
                      <h3>Version actuelle</h3>
                      <div
                        className={styles.versionStatus}
                        style={{ backgroundColor: `${getStatusColor(versioningData.statut)}15`, color: getStatusColor(versioningData.statut) }}
                      >
                        {versioningData.statut === 'VALIDE' && <CheckCircle size={14} />}
                        {versioningData.statut === 'OBSOLETE' && <XCircle size={14} />}
                        {versioningData.statut === 'ARCHIVE' && <Archive size={14} />}
                        {versioningData.statut === 'BROUILLON' && <FileEdit size={14} />}
                        {getStatusLabel(versioningData.statut)}
                      </div>
                    </div>

                    <div className={styles.versionDetails}>
                      <div className={styles.versionDetailItem}>
                        <span className={styles.versionDetailLabel}>Version</span>
                        <span className={styles.versionDetailValue}>v{versioningData.version}</span>
                      </div>
                      {versioningData.dateValidite && (
                        <div className={styles.versionDetailItem}>
                          <span className={styles.versionDetailLabel}>Valide jusqu'au</span>
                          <span className={styles.versionDetailValue}>
                            {new Date(versioningData.dateValidite).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {versioningData.derniereVerification && (
                        <div className={styles.versionDetailItem}>
                          <span className={styles.versionDetailLabel}>Dernière vérification</span>
                          <span className={styles.versionDetailValue}>
                            {new Date(versioningData.derniereVerification).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {versioningData.prochainExamen && (
                        <div className={styles.versionDetailItem}>
                          <span className={styles.versionDetailLabel}>Prochain examen</span>
                          <span
                            className={`${styles.versionDetailValue} ${
                              documentIsOverdue ? styles.versionDetailValueDanger : ''
                            }`}
                          >
                            {new Date(versioningData.prochainExamen).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {versioningData.motifModification && (
                        <div className={styles.versionDetailItem}>
                          <span className={styles.versionDetailLabel}>Motif dernière modification</span>
                          <span className={styles.versionDetailValue}>{versioningData.motifModification}</span>
                        </div>
                      )}
                    </div>

                    <button
                      className={styles.newVersionBtn}
                      onClick={() => setShowNewVersionModal(true)}
                    >
                      <Plus size={16} />
                      Créer une nouvelle version
                    </button>
                  </div>

                  {/* Historique des versions */}
                  {versionHistory && versionHistory.versions.length > 0 && (
                    <div className={styles.versionHistorySection}>
                      <h3>
                        <History size={18} />
                        Historique des versions
                      </h3>
                      <div className={styles.versionTimeline}>
                        {versionHistory.versions.slice().reverse().map((version, idx) => (
                          <div
                            key={version.documentId}
                            className={`${styles.versionTimelineItem} ${
                              version.version === versioningData.version
                                ? styles.versionTimelineItemCurrent
                                : ''
                            }`}
                          >
                            <div className={styles.versionTimelineDot}>
                              {version.version === versioningData.version ? (
                                <CheckCircle size={16} />
                              ) : (
                                <GitBranch size={14} />
                              )}
                            </div>
                            <div className={styles.versionTimelineContent}>
                              <div className={styles.versionTimelineHeader}>
                                <span className={styles.versionNumber}>v{version.version}</span>
                                <span className={styles.versionDate}>
                                  {new Date(version.dateCreation).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className={styles.versionTimelineMeta}>
                                <span className={styles.versionAuthor}>
                                  <User size={12} /> {version.creePar}
                                </span>
                                <span className={styles.versionType}>
                                  {getModificationTypeLabel(version.modificationType)}
                                </span>
                              </div>
                              {version.motif && (
                                <p className={styles.versionMotif}>
                                  <strong>Motif :</strong> {version.motif}
                                </p>
                              )}
                              {version.changements && (
                                <p className={styles.versionChangements}>{version.changements}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noVersioningState}>
                  <GitBranch size={48} className={styles.noVersioningIcon} />
                  <h3>Pas de versioning</h3>
                  <p>Ce document n'a pas encore d'informations de version.</p>
                  <button
                    className={styles.initVersionBtn}
                    onClick={() => setShowNewVersionModal(true)}
                  >
                    <Plus size={16} />
                    Initialiser le versioning
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className={styles.historyTab}>
              <h3>Historique des actions</h3>
              <div className={styles.historyList}>
                {actionHistory.length > 0 ? (
                  actionHistory.map((entry) => (
                    <div key={entry.id} className={styles.historyEntry}>
                      <div className={styles.historyIcon}>
                        {entry.type === 'DOWNLOAD' ? (
                          <Download size={16} />
                        ) : entry.type === 'UPLOAD' ? (
                          <Upload size={16} />
                        ) : entry.type === 'EDIT' ? (
                          <Edit3 size={16} />
                        ) : entry.type === 'PRINT' ? (
                          <Printer size={16} />
                        ) : entry.type === 'SHARE' ? (
                          <Share2 size={16} />
                        ) : entry.type === 'TAG_ADD' || entry.type === 'TAG_REMOVE' ? (
                          <Tag size={16} />
                        ) : entry.type === 'LINK_ADD' || entry.type === 'LINK_REMOVE' ? (
                          <Link2 size={16} />
                        ) : entry.type === 'VERSION_CREATE' ? (
                          <GitBranch size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </div>
                      <div className={styles.historyInfo}>
                        <span className={styles.historyAction}>{getActionTypeLabel(entry.type)}</span>
                        <span className={styles.historyUser}>
                          <User size={12} /> {entry.userName}
                        </span>
                        {entry.details && (
                          <span className={styles.historyDetails}>{entry.details}</span>
                        )}
                      </div>
                      <span className={styles.historyDate}>
                        {new Date(entry.timestamp).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={styles.noHistory}>
                    <History size={24} />
                    <span>Aucun historique disponible pour ce document</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Move Modal */}
        {showMoveModal && (
          <div className={styles.subModalOverlay} onClick={() => setShowMoveModal(false)}>
            <div className={styles.subModal} onClick={e => e.stopPropagation()}>
              <div className={styles.subModalHeader}>
                <h3>Déplacer le document</h3>
                <button onClick={() => setShowMoveModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent}>
                <p>Sélectionnez le dossier de destination :</p>
                <div className={styles.folderList}>
                  {folders.length > 0 ? (
                    folders.filter(f => f.parentId === null).map(folder => (
                      <button
                        key={folder.id}
                        className={styles.folderItem}
                        onClick={() => handleMove(folder.id)}
                      >
                        <FolderOpen size={18} style={{ color: folder.color }} />
                        <span>{folder.nom}</span>
                      </button>
                    ))
                  ) : (
                    <p className={styles.noFolders}>Aucun dossier disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Version Modal */}
        {showNewVersionModal && (
          <div className={styles.subModalOverlay} onClick={() => setShowNewVersionModal(false)}>
            <div className={`${styles.subModal} ${styles.subModalLarge}`} onClick={e => e.stopPropagation()}>
              <div className={styles.subModalHeader}>
                <h3>
                  <GitBranch size={18} />
                  Créer une nouvelle version
                </h3>
                <button onClick={() => setShowNewVersionModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent}>
                <div className={styles.newVersionForm}>
                  {/* Type de modification */}
                  <div className={styles.formGroup}>
                    <label>Type de modification</label>
                    <div className={styles.modificationTypeGrid}>
                      <button className={`${styles.modTypeBtn} ${styles.modTypeBtnActive}`}>
                        <FileEdit size={16} />
                        <span>Modification mineure</span>
                        <small>Corrections, ajustements (v1.0 → v1.1)</small>
                      </button>
                      <button className={styles.modTypeBtn}>
                        <History size={16} />
                        <span>Modification majeure</span>
                        <small>Refonte importante (v1.x → v2.0)</small>
                      </button>
                      <button className={styles.modTypeBtn}>
                        <FileText size={16} />
                        <span>Remplacement</span>
                        <small>Nouveau document remplaçant l'ancien</small>
                      </button>
                    </div>
                  </div>

                  {/* Motif */}
                  <div className={styles.formGroup}>
                    <label htmlFor="version-motif">Motif de la modification *</label>
                    <input
                      id="version-motif"
                      type="text"
                      className={styles.formInput}
                      placeholder="Ex: Mise en conformité réglementation 2024"
                    />
                  </div>

                  {/* Description des changements */}
                  <div className={styles.formGroup}>
                    <label htmlFor="version-changes">Description des changements</label>
                    <textarea
                      id="version-changes"
                      className={styles.formTextarea}
                      rows={3}
                      placeholder="Décrivez les modifications apportées..."
                    />
                  </div>

                  {/* Date de validité */}
                  <div className={styles.formGroup}>
                    <label htmlFor="version-validity">Date de validité (optionnel)</label>
                    <input
                      id="version-validity"
                      type="date"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Upload nouveau fichier */}
                  <div className={styles.formGroup}>
                    <label>Nouveau fichier *</label>
                    <div className={styles.uploadZone}>
                      <FileText size={24} />
                      <p>Glissez le nouveau fichier ici</p>
                      <span>ou cliquez pour sélectionner</span>
                    </div>
                  </div>

                  {/* Version info */}
                  <div className={styles.newVersionInfo}>
                    <span>Version actuelle :</span>
                    <strong>v{versioningData?.version || '1.0'}</strong>
                    <span className={styles.versionArrow}>→</span>
                    <span>Nouvelle version :</span>
                    <strong className={styles.newVersionNumber}>v{versioningData ? `${parseInt(versioningData.version)}.${parseInt(versioningData.version.split('.')[1] || '0') + 1}` : '1.0'}</strong>
                  </div>
                </div>

                <div className={styles.subModalActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setShowNewVersionModal(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className={styles.confirmBtn}
                    onClick={() => {
                      alert('Nouvelle version créée !\n\nFonctionnalité disponible après intégration Supabase.');
                      setShowNewVersionModal(false);
                    }}
                  >
                    <Plus size={16} />
                    Créer la version
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
