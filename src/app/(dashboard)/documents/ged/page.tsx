'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Folder, FolderOpen, Search, Upload, Download, Plus,
  ChevronDown, ChevronRight, Eye, Lock, Star, Clock, Image, File,
  Link, Trash2, Shield, HardDrive, Edit3, FolderPlus, MoreVertical, X,
} from 'lucide-react';
import clsx from 'clsx';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal/DocumentViewerModal';
import { AccessRightsManager } from '@/components/features/documents/AccessRightsManager';
import { NiveauConfidentialite } from '@/types/enums';
import { useGedPageSupabase, useDocumentSearch } from '@/components/features/documents/ged/hooks';
import * as documentsApi from '@/lib/documents/api';
import { useCopro } from '@/providers/CoproContext';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import { LinkModal } from '@/components/features/documents/ged/components';
import { UploadDocumentModal } from '@/components/features/documents/ged/components/UploadDocumentModal';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/features/documents/ged/domain/constants';
import type { DocumentWithFolder, GEDFolder } from '@/components/features/documents/ged/domain/types';
import styles from './ged.module.css';

type SidebarTab = 'dossiers' | 'recents' | 'favoris';

function DocIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = type === 'PDF' ? FileText : type === 'IMAGE' ? Image : File;
  const color = type === 'PDF' ? '#EF4444' : type === 'IMAGE' ? '#84CC16' : '#6B7280';
  return <Icon size={size} style={{ color }} />;
}

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS[cat.toLowerCase()] || '#6B7280';
}

function getCatLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || CATEGORY_LABELS[cat.toLowerCase()] || cat;
}

function getRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
  if (days < 365) return `il y a ${Math.floor(days / 30)}mois`;
  return `il y a ${Math.floor(days / 365)}an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

export default function GEDPage() {
  const hook = useGedPageSupabase();
  const {
    documents, folders, rootFolders, stats,
    isLoading, error,
    showLinkModal, selectedDocForLink, detectedEntityType, extractedData,
    previewDocument, showAccessRightsModal, selectedDocForAccess, canManageAccess,
    handleOpenLinkModal, handleCloseLinkModal, handleCreateLink,
    handlePreviewDocument, handleClosePreview,
    handleOpenAccessRights, handleCloseAccessRights,
    handleFilesSelected,
    handleCreateFolder, handleRenameFolder, handleDeleteFolder, handleDeleteDocument,
    refreshData,
  } = hook;

  const { currentCoproId } = useCopro();

  const searchHook = useDocumentSearch({ documents, folders });
  const { searchQuery, setSearchQuery, filters } = searchHook;

  const filteredDocuments = useMemo(
    () => hook.getFilteredDocuments(searchQuery, filters),
    [hook.getFilteredDocuments, searchQuery, filters]
  );

  // Local state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('dossiers');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // CRUD modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Selected document
  const selectedDoc = useMemo(() => {
    if (selectedDocId) return documents.find(d => d.id === selectedDocId) || null;
    return documents[0] || null;
  }, [selectedDocId, documents]);

  // Build folder→children map for recursive lookup
  const childFolderIds = useMemo(() => {
    const map = new Map<string, string[]>();
    folders.forEach(f => {
      if (!map.has(f.id)) map.set(f.id, []);
      if (f.parentId) {
        if (!map.has(f.parentId)) map.set(f.parentId, []);
        map.get(f.parentId)!.push(f.id);
      }
    });
    return map;
  }, [folders]);

  // Get all descendant folder IDs (recursive)
  const getAllDescendantIds = useCallback((folderId: string): string[] => {
    const children = childFolderIds.get(folderId) || [];
    const all = [...children];
    children.forEach(cid => all.push(...getAllDescendantIds(cid)));
    return all;
  }, [childFolderIds]);

  // Docs by folder (including docs in sub-folders)
  const docsByFolder = useMemo(() => {
    const map = new Map<string, DocumentWithFolder[]>();
    // Direct mapping
    const directMap = new Map<string, DocumentWithFolder[]>();
    documents.forEach(d => {
      const fid = d.dossierId || '__root__';
      if (!directMap.has(fid)) directMap.set(fid, []);
      directMap.get(fid)!.push(d);
    });
    // For each root folder, include docs from all descendants
    folders.forEach(f => {
      const descendantIds = [f.id, ...getAllDescendantIds(f.id)];
      const allDocs: DocumentWithFolder[] = [];
      descendantIds.forEach(did => {
        const docs = directMap.get(did);
        if (docs) allDocs.push(...docs);
      });
      map.set(f.id, allDocs);
    });
    map.set('__root__', directMap.get('__root__') || []);
    return map;
  }, [documents, folders, getAllDescendantIds]);

  // Display folders (filtered, non-empty first, then empty)
  const displayFolders = useMemo(() => {
    const all = rootFolders.length > 0 ? rootFolders : folders;
    const filtered = sidebarSearch
      ? all.filter(f => f.nom.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : all;
    // Sort: non-empty first
    return [...filtered].sort((a, b) => {
      const aCount = (docsByFolder.get(a.id) || []).length;
      const bCount = (docsByFolder.get(b.id) || []).length;
      if (aCount > 0 && bCount === 0) return -1;
      if (aCount === 0 && bCount > 0) return 1;
      return a.nom.localeCompare(b.nom);
    });
  }, [rootFolders, folders, sidebarSearch, docsByFolder]);

  // Root docs (not in any folder)
  const rootDocs = useMemo(() => docsByFolder.get('__root__') || [], [docsByFolder]);

  // Recent docs (sorted by date desc)
  const recentDocs = useMemo(() =>
    [...documents].sort((a, b) => new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime()).slice(0, 10),
    [documents]
  );

  // Mock favorites (starred docs) — first 3 for now
  const favoriteDocs = useMemo(() => documents.slice(0, 3), [documents]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // KPIs
  const kpis = [
    { label: 'Documents', value: documents.length, color: '#2563eb', icon: FileText },
    { label: 'Dossiers', value: rootFolders.length, color: '#10B981', icon: Folder },
    { label: 'Actifs', value: stats?.active_count ?? '—', color: '#F59E0B', icon: Shield },
    { label: 'Stockage', value: stats?.total_size_bytes ? `${(stats.total_size_bytes / (1024 * 1024)).toFixed(1)} Mo` : '—', color: '#A78BFA', icon: HardDrive },
  ];

  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Mes documents</h1></div>
        <LoadingState message="Chargement des documents..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Mes documents</h1></div>
        <ErrorState message={error} />
      </div>
    );
  }

  const catColor = selectedDoc ? getCatColor(selectedDoc.categorie) : '#6B7280';
  const catLabel = selectedDoc ? getCatLabel(selectedDoc.categorie) : '';

  return (
    <div className="container">
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mes documents</h1>
        <div className={styles.pageActions}>
          <button className={styles.btnSecondary} onClick={() => { setCreateFolderParentId(null); setNewFolderName(''); setShowCreateFolderModal(true); }}>
            <FolderPlus size={15} /> Nouveau dossier
          </button>
          <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
          <button className={styles.btnPrimary} onClick={() => setShowUploadModal(true)}>
            <Upload size={15} /> Importer
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <div className={styles.kpiBar}>
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: k.color + '15', color: k.color }}><Icon size={16} /></div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiValue}>{k.value}</span>
                <span className={styles.kpiLabel}>{k.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search global */}
      <div className={styles.searchSection}>
        <div className={styles.searchRow}>
          <div className={styles.searchInputWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher un document..."
              className={styles.searchField}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className={styles.splitView}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Tabs */}
          <div className={styles.sidebarTabs}>
            {([
              { id: 'dossiers' as const, label: 'Dossiers', icon: Folder },
              { id: 'recents' as const, label: 'Récents', icon: Clock },
              { id: 'favoris' as const, label: 'Favoris', icon: Star },
            ]).map(t => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.id}
                  className={clsx(styles.sidebarTabBtn, sidebarTab === t.id && styles.sidebarTabBtnActive)}
                  onClick={() => setSidebarTab(t.id)}
                >
                  <TIcon size={13} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Mini search */}
          {sidebarTab === 'dossiers' && (
            <div className={styles.sidebarSearchWrap}>
              <Search size={13} className={styles.sidebarSearchIconSm} />
              <input
                type="text"
                placeholder="Filtrer dossiers..."
                className={styles.sidebarSearchInput}
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
              />
            </div>
          )}

          {/* Content */}
          <div className={styles.sidebarContent}>
            {/* Dossiers tab */}
            {sidebarTab === 'dossiers' && displayFolders.map(f => {
              const isExpanded = expandedFolders.has(f.id);
              const folderDocs = docsByFolder.get(f.id) || [];
              const color = f.color || '#2563eb';
              const isMenuOpen = folderMenuId === f.id;
              return (
                <div key={f.id}>
                  <div className={styles.sidebarFolderRowWrap}>
                    <button
                      className={clsx(styles.sidebarFolderRow, isExpanded && styles.sidebarFolderRowOpen)}
                      onClick={() => toggleFolder(f.id)}
                    >
                      <div className={styles.sidebarFolderIconBox} style={{ background: color + '12', color }}>
                        {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                      </div>
                      <div className={styles.sidebarFolderInfo}>
                        {renamingFolderId === f.id ? (
                          <input
                            className={styles.renameInput}
                            value={renameFolderValue}
                            onChange={e => setRenameFolderValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleRenameFolder(f.id, renameFolderValue);
                                setRenamingFolderId(null);
                              }
                              if (e.key === 'Escape') setRenamingFolderId(null);
                            }}
                            onBlur={() => {
                              if (renameFolderValue.trim()) handleRenameFolder(f.id, renameFolderValue);
                              setRenamingFolderId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span className={styles.sidebarFolderName}>{f.nom}</span>
                        )}
                        <span className={styles.sidebarFolderMeta}>{folderDocs.length} document{folderDocs.length !== 1 ? 's' : ''}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={13} className={styles.sidebarChev} /> : <ChevronRight size={13} className={styles.sidebarChev} />}
                    </button>
                    <button
                      className={styles.folderMenuBtn}
                      onClick={e => { e.stopPropagation(); setFolderMenuId(isMenuOpen ? null : f.id); }}
                    >
                      <MoreVertical size={14} />
                    </button>
                    {isMenuOpen && (
                      <div className={styles.folderMenu}>
                        <button onClick={() => { setRenamingFolderId(f.id); setRenameFolderValue(f.nom); setFolderMenuId(null); }}>
                          <Edit3 size={12} /> Renommer
                        </button>
                        <button onClick={() => { setCreateFolderParentId(f.id); setNewFolderName(''); setShowCreateFolderModal(true); setFolderMenuId(null); }}>
                          <FolderPlus size={12} /> Sous-dossier
                        </button>
                        <button className={styles.folderMenuDanger} onClick={() => { setConfirmDeleteFolder(f.id); setFolderMenuId(null); }}>
                          <Trash2 size={12} /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                  {isExpanded && folderDocs.map(doc => (
                    <div key={doc.id} className={styles.sidebarDocRowWrap}>
                      <button
                        className={clsx(styles.sidebarDocRow, doc.id === (selectedDoc?.id) && styles.sidebarDocRowActive)}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        <DocIcon type={doc.type} size={13} />
                        <span className={styles.sidebarDocName}>{doc.nom}</span>
                        <span className={styles.sidebarDocSize}>{doc.taille}</span>
                      </button>
                      <button
                        className={styles.docDeleteBtn}
                        onClick={e => { e.stopPropagation(); setConfirmDeleteDoc(doc.id); }}
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Root docs (no folder) */}
            {sidebarTab === 'dossiers' && rootDocs.length > 0 && (
              <div>
                <div className={styles.sidebarDivider} />
                <div style={{ padding: '0.375rem 0.75rem', fontSize: '0.625rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Sans dossier ({rootDocs.length})
                </div>
                {rootDocs.map(doc => (
                  <button
                    key={doc.id}
                    className={clsx(styles.sidebarDocRow, doc.id === (selectedDoc?.id) && styles.sidebarDocRowActive)}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <DocIcon type={doc.type} size={13} />
                    <span className={styles.sidebarDocName}>{doc.nom}</span>
                    <span className={styles.sidebarDocSize}>{doc.taille}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Récents tab */}
            {sidebarTab === 'recents' && recentDocs.map(doc => (
              <button
                key={doc.id}
                className={clsx(styles.sidebarDocRow, doc.id === (selectedDoc?.id) && styles.sidebarDocRowActive)}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <span className={styles.catDot} style={{ background: getCatColor(doc.categorie) }} />
                <DocIcon type={doc.type} size={13} />
                <span className={styles.sidebarDocName}>{doc.nom}</span>
                <span className={styles.sidebarRelDate}>{getRelativeDate(doc.dateAjout)}</span>
              </button>
            ))}

            {/* Favoris tab */}
            {sidebarTab === 'favoris' && favoriteDocs.map(doc => (
              <button
                key={doc.id}
                className={clsx(styles.sidebarDocRow, doc.id === (selectedDoc?.id) && styles.sidebarDocRowActive)}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <Star size={12} fill="#FBBF24" color="#FBBF24" />
                <span className={styles.catDot} style={{ background: getCatColor(doc.categorie) }} />
                <span className={styles.sidebarDocName}>{doc.nom}</span>
              </button>
            ))}

            {/* Empty states */}
            {sidebarTab === 'dossiers' && displayFolders.length === 0 && (
              <div className={styles.sidebarEmpty}>Aucun dossier</div>
            )}
            {sidebarTab === 'recents' && recentDocs.length === 0 && (
              <div className={styles.sidebarEmpty}>Aucun document récent</div>
            )}
            {sidebarTab === 'favoris' && favoriteDocs.length === 0 && (
              <div className={styles.sidebarEmpty}>Aucun favori</div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedDoc ? (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div className={styles.detailIconLg} style={{ background: catColor + '12', color: catColor }}>
                <DocIcon type={selectedDoc.type} size={28} />
              </div>
              <div>
                <h3 className={styles.detailName}>
                  {selectedDoc.confidentialite && selectedDoc.confidentialite !== 'public' && <Lock size={14} className={styles.lockIcon} />}
                  {selectedDoc.nom}
                </h3>
                <span className={styles.detailFolder}><Folder size={12} /> {folders.find(f => f.id === selectedDoc.dossierId)?.nom || 'Racine'}</span>
              </div>
            </div>

            <div className={styles.detailBadges}>
              <span className={styles.catBadge} style={{ color: catColor, background: catColor + '15' }}>{catLabel}</span>
              {selectedDoc.confidentialite && selectedDoc.confidentialite !== 'public' && (
                <span className={styles.confidBadge}><Lock size={10} /> Confidentiel</span>
              )}
              {(selectedDoc.tags || []).map(t => <span key={t} className={styles.tagBadge}>{t}</span>)}
            </div>

            <div className={styles.detailStatsRow}>
              <div className={styles.detailStatCard}>
                <span className={styles.detailStatValue}>{new Date(selectedDoc.dateAjout).toLocaleDateString('fr-FR')}</span>
                <span className={styles.detailStatLabel}>Date d&apos;ajout</span>
              </div>
              <div className={styles.detailStatCard}>
                <span className={styles.detailStatValue}>{selectedDoc.taille}</span>
                <span className={styles.detailStatLabel}>Taille</span>
              </div>
              <div className={styles.detailStatCard}>
                <span className={styles.detailStatValue}>{selectedDoc.type}</span>
                <span className={styles.detailStatLabel}>Format</span>
              </div>
            </div>

            <div className={styles.previewZone}>
              <div className={styles.previewPlaceholder}>
                <DocIcon type={selectedDoc.type} size={40} />
                <span>Aperçu du document</span>
              </div>
            </div>

            <div className={styles.detailActions}>
              <button className={styles.btnPrimary} onClick={() => handlePreviewDocument(selectedDoc)}>
                <Eye size={14} /> Ouvrir
              </button>
              <button className={styles.btnSecondary}><Download size={14} /> Télécharger</button>
              <button className={styles.btnSecondary} onClick={() => handleOpenLinkModal(selectedDoc)}>
                <Link size={14} /> Lier
              </button>
              {canManageAccess && (
                <button className={styles.btnSecondary} onClick={() => handleOpenAccessRights(selectedDoc)}>
                  <Shield size={14} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.detailPanel}>
            <div className={styles.emptyDetail}>
              <FileText size={40} />
              <p>Sélectionnez un document</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLinkModal && selectedDocForLink && (
        <LinkModal document={selectedDocForLink} detectedEntityType={detectedEntityType} extractedData={extractedData} onClose={handleCloseLinkModal} onCreateLink={handleCreateLink} />
      )}
      {previewDocument && (
        <DocumentViewerModal
          document={{ id: previewDocument.id, nom: previewDocument.nom, type: previewDocument.type as 'PDF' | 'IMAGE' | 'AUTRE', categorie: previewDocument.categorie, dateAjout: previewDocument.dateAjout, taille: previewDocument.taille, dossierId: previewDocument.dossierId || undefined, filePath: previewDocument.url }}
          onClose={handleClosePreview}
          folders={folders}
        />
      )}
      {showAccessRightsModal && selectedDocForAccess && (
        <AccessRightsManager documentId={selectedDocForAccess.id} documentName={selectedDocForAccess.nom} currentConfidentiality={selectedDocForAccess.confidentialite as NiveauConfidentialite || NiveauConfidentialite.PUBLIC} onClose={handleCloseAccessRights} />
      )}

      {/* Upload Document Modal */}
      {showUploadModal && currentCoproId && (
        <UploadDocumentModal
          folders={folders}
          onUpload={async (file, opts) => {
            await documentsApi.uploadDocument(file, currentCoproId, opts.category, {
              folderId: opts.folderId,
              title: opts.title,
              description: opts.description,
              tags: opts.tags,
              confidentiality: opts.confidentiality,
            });
            await refreshData();
          }}
          onCreateFolder={handleCreateFolder}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FolderPlus size={18} />
                {createFolderParentId ? 'Nouveau sous-dossier' : 'Nouveau dossier'}
              </h3>
              <button className={styles.modalClose} onClick={() => setShowCreateFolderModal(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.modalInput}
                placeholder="Nom du dossier..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder(newFolderName, createFolderParentId);
                    setShowCreateFolderModal(false);
                  }
                }}
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowCreateFolderModal(false)}>Annuler</button>
              <button
                className={styles.btnPrimary}
                disabled={!newFolderName.trim()}
                onClick={() => { handleCreateFolder(newFolderName, createFolderParentId); setShowCreateFolderModal(false); }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Folder */}
      {confirmDeleteFolder && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteFolder(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Trash2 size={18} color="#EF4444" /> Supprimer le dossier</h3>
              <button className={styles.modalClose} onClick={() => setConfirmDeleteFolder(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Supprimer le dossier <strong>{folders.find(f => f.id === confirmDeleteFolder)?.nom}</strong> ?
                Les documents qu&apos;il contient ne seront pas supprimés mais déplacés à la racine.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDeleteFolder(null)}>Annuler</button>
              <button
                className={styles.btnDanger}
                onClick={() => { handleDeleteFolder(confirmDeleteFolder); setConfirmDeleteFolder(null); }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Document */}
      {confirmDeleteDoc && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteDoc(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Trash2 size={18} color="#EF4444" /> Supprimer le document</h3>
              <button className={styles.modalClose} onClick={() => setConfirmDeleteDoc(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Supprimer définitivement <strong>{documents.find(d => d.id === confirmDeleteDoc)?.nom}</strong> ?
                Cette action est irréversible.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDeleteDoc(null)}>Annuler</button>
              <button
                className={styles.btnDanger}
                onClick={() => {
                  handleDeleteDocument(confirmDeleteDoc);
                  if (selectedDocId === confirmDeleteDoc) setSelectedDocId(null);
                  setConfirmDeleteDoc(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
