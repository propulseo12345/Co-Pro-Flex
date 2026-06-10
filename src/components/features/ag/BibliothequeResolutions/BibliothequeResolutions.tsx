'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, X, Star, Tag, ChevronDown, ChevronUp, Plus, AlertCircle } from 'lucide-react';
import {
    MAJORITES,
    type ResolutionTemplate,
    type TypeAG,
    getResolutionsForAGType,
    getResolutionsObligatoires,
    getResolutionsByCategorieForAGType,
    searchResolutions
} from '@/lib/constants/resolutions';
import type { ResolutionTemplateRow, CreateTemplatePayload } from '@/lib/ag/resolutionTemplates/types';
import { duplicateTemplate, deleteTemplate, createTemplate, updateTemplate } from '@/lib/ag/resolutionTemplates/api';
import { useResolutionTemplates } from '@/providers/ResolutionTemplatesProvider';
import { TemplateEditorModal } from './TemplateEditorModal';
import styles from './BibliothequeResolutions.module.css';

interface BibliothequeResolutionsProps {
    typeAG: TypeAG;
    onSelectResolution: (resolution: ResolutionTemplate) => void;
    onClose: () => void;
    /** @deprecated Utiliser existingTitles à la place pour comparaison DB-driven */
    resolutionsDejaAjoutees?: string[];
    /** Titres (lowercase) des résolutions déjà ajoutées - utilisé pour comparaison DB-driven */
    existingTitles?: string[];
}

export function BibliothequeResolutions({
    typeAG,
    onSelectResolution,
    onClose,
    resolutionsDejaAjoutees = [],
    existingTitles = []
}: BibliothequeResolutionsProps) {
    const { templates, refresh, cabinetId, coproId } = useResolutionTemplates();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showObligatoiresOnly, setShowObligatoiresOnly] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));

    // État UI CRUD
    const [actionError, setActionError] = useState<string | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ResolutionTemplateRow | undefined>(undefined);
    const [editorSaveError, setEditorSaveError] = useState<string | null>(null);

    // Résolutions filtrées par type d'AG
    const resolutionsForAGType = useMemo(() => {
        return getResolutionsForAGType(templates, typeAG);
    }, [templates, typeAG]);

    // Résolutions obligatoires pour ce type d'AG
    const resolutionsObligatoires = useMemo(() => {
        return getResolutionsObligatoires(templates, typeAG);
    }, [templates, typeAG]);

    // Résolutions par catégorie pour ce type d'AG
    const resolutionsByCategorie = useMemo(() => {
        return getResolutionsByCategorieForAGType(templates, typeAG);
    }, [templates, typeAG]);

    // Résolutions filtrées (recherche + catégorie + obligatoires)
    const filteredResolutions = useMemo(() => {
        let results: ResolutionTemplate[];

        if (searchQuery.trim()) {
            results = searchResolutions(templates, searchQuery, typeAG);
        } else if (showObligatoiresOnly) {
            results = resolutionsObligatoires;
        } else if (selectedCategory !== 'all') {
            results = resolutionsByCategorie[selectedCategory] || [];
        } else {
            results = resolutionsForAGType;
        }

        return results;
    }, [templates, searchQuery, selectedCategory, showObligatoiresOnly, typeAG, resolutionsForAGType, resolutionsObligatoires, resolutionsByCategorie]);

    // Catégories disponibles pour ce type d'AG
    const categoriesDisponibles = useMemo(() => {
        return Object.keys(resolutionsByCategorie).sort();
    }, [resolutionsByCategorie]);

    // Ordre des catégories suggéré
    const categoryOrder = [
        'Assemblée Générale',
        'Finances',
        'Travaux',
        'Conseil syndical et syndic',
        'Contrats',
        'Action en justice',
        'Impayés',
        'Modification du règlement de copropriété et des lots',
        'Compteurs',
        'Règles de bonne conduite'
    ];

    const orderedCategories = categoryOrder.filter(cat => categoriesDisponibles.includes(cat));

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cat)) {
                newSet.delete(cat);
            } else {
                newSet.add(cat);
            }
            return newSet;
        });
    };

    const isResolutionObligatoire = (resId: string) => {
        return resolutionsObligatoires.some(r => r.id === resId);
    };

    const isResolutionDejaAjoutee = (resId: string, resTitle: string) => {
        // Comparaison par ID (legacy) ou par titre (DB-driven)
        return resolutionsDejaAjoutees.includes(resId) || existingTitles.includes(resTitle.toLowerCase());
    };

    const handleAddResolution = (resolution: ResolutionTemplate) => {
        onSelectResolution(resolution);
    };

    // ----------------------------------------------------------------
    // Actions CRUD
    // ----------------------------------------------------------------

    const handleDuplicate = useCallback(async (id: string) => {
        setActionError(null);
        if (!cabinetId) {
            setActionError('Aucun cabinet associé à votre compte.');
            return;
        }
        const result = await duplicateTemplate(id, cabinetId, null);
        if (result.success) {
            await refresh();
        } else {
            setActionError(result.error);
        }
    }, [cabinetId, refresh]);

    const handleDelete = useCallback(async (id: string) => {
        setActionError(null);
        if (!confirm('Supprimer ce modèle de résolution ? Cette action est irréversible.')) return;
        const result = await deleteTemplate(id);
        if (result.success) {
            await refresh();
        } else {
            setActionError(result.error);
        }
    }, [refresh]);

    const handleOpenCreate = useCallback(() => {
        setEditorSaveError(null);
        setEditingTemplate(undefined);
        setShowEditor(true);
    }, []);

    const handleOpenEdit = useCallback((row: ResolutionTemplateRow) => {
        setEditorSaveError(null);
        setEditingTemplate(row);
        setShowEditor(true);
    }, []);

    const handleEditorSave = useCallback(async (payload: CreateTemplatePayload, pourCopro: boolean) => {
        setEditorSaveError(null);
        if (!cabinetId) {
            setEditorSaveError('Aucun cabinet associé à votre compte. Impossible de créer un modèle.');
            return;
        }

        if (editingTemplate) {
            const result = await updateTemplate(editingTemplate.id, payload);
            if (!result.success) { setEditorSaveError(result.error); return; }
        } else {
            const result = await createTemplate(cabinetId, payload, pourCopro ? coproId : null);
            if (!result.success) { setEditorSaveError(result.error); return; }
        }

        await refresh();
        setShowEditor(false);
        setEditingTemplate(undefined);
    }, [cabinetId, coproId, editingTemplate, refresh]);

    // ----------------------------------------------------------------
    // Render d'une carte de résolution (bibliothèque inline)
    // ----------------------------------------------------------------

    const renderResolutionCard = (resolution: ResolutionTemplate) => {
        const isObligatoire = isResolutionObligatoire(resolution.id);
        const isDejaAjoutee = isResolutionDejaAjoutee(resolution.id, resolution.titre);
        // Récupérer les dimensions de tenance si dispo (le snapshot est des ResolutionTemplateRow)
        const row = resolution as ResolutionTemplateRow;
        const niveau = row.cabinet_id == null
            ? 'Système'
            : row.copro_id ? 'Cette copro' : 'Cabinet';
        const isEditable = row.cabinet_id != null;

        return (
            <div
                key={resolution.id}
                className={`${styles.resolutionCard} ${isObligatoire ? styles.obligatoire : ''} ${isDejaAjoutee ? styles.dejaAjoutee : ''}`}
            >
                <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                        <h4 className={styles.cardTitle}>{resolution.titre}</h4>
                        <div className={styles.cardBadges}>
                            {isObligatoire && (
                                <span className={styles.badgeObligatoire} title="Résolution obligatoire pour ce type d'AG">
                                    <Star size={12} /> Obligatoire
                                </span>
                            )}
                            <span className={
                                niveau === 'Système'
                                    ? styles.badgeSystem
                                    : niveau === 'Cabinet'
                                        ? styles.badgeCabinet
                                        : styles.badgeCopro
                            }>
                                {niveau}
                            </span>
                        </div>
                    </div>
                    {/* Actions de gestion */}
                    <div className={styles.cardCrudActions}>
                        <button
                            className={styles.crudBtn}
                            title="Dupliquer ce modèle"
                            onClick={() => void handleDuplicate(resolution.id)}
                            disabled={!cabinetId}
                        >
                            Dupliquer
                        </button>
                        {isEditable && (
                            <>
                                <button
                                    className={styles.crudBtn}
                                    title="Modifier ce modèle"
                                    onClick={() => handleOpenEdit(row)}
                                >
                                    Modifier
                                </button>
                                <button
                                    className={`${styles.crudBtn} ${styles.crudBtnDanger}`}
                                    title="Supprimer ce modèle"
                                    onClick={() => void handleDelete(resolution.id)}
                                >
                                    Supprimer
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <p className={styles.cardText}>{resolution.texte}</p>
                <div className={styles.cardMeta}>
                    <span className={styles.majorityBadge}>
                        {MAJORITES[resolution.majorite].nom}
                    </span>
                    {resolution.tags && resolution.tags.length > 0 && (
                        <div className={styles.tags}>
                            {resolution.tags.slice(0, 3).map(tag => (
                                <span key={tag} className={styles.tag}>
                                    <Tag size={10} /> {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className={styles.cardActions}>
                    {isDejaAjoutee ? (
                        <span className={styles.dejaAjouteeLabel}>Déjà ajoutée</span>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={() => handleAddResolution(resolution)}
                        >
                            Ajouter
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.modalHeader}>
                    <div className={styles.headerContent}>
                        <h2>Bibliothèque de résolutions</h2>
                        <span className={styles.agTypeBadge}>
                            {typeAG === 'ORDINAIRE' ? 'AG Ordinaire' : 'AG Extraordinaire'}
                        </span>
                    </div>
                    <div className={styles.headerActions}>
                        {/* Bouton créer un modèle */}
                        {cabinetId ? (
                            <button
                                className={styles.createBtn}
                                onClick={handleOpenCreate}
                                title="Créer un nouveau modèle"
                            >
                                <Plus size={14} /> Créer un modèle
                            </button>
                        ) : (
                            <span className={styles.noCabinetWarning}>
                                <AlertCircle size={14} /> Aucun cabinet associé
                            </span>
                        )}
                        <button onClick={onClose} className={styles.closeButton} aria-label="Fermer">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Message d'erreur action CRUD */}
                {actionError && (
                    <div className={styles.actionError}>
                        <AlertCircle size={14} />
                        <span>{actionError}</span>
                        <button className={styles.errorDismiss} onClick={() => setActionError(null)}>
                            <X size={12} />
                        </button>
                    </div>
                )}

                <div className={styles.filters}>
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Rechercher une résolution..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={styles.clearSearch}
                                aria-label="Effacer la recherche"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className={styles.filterOptions}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={showObligatoiresOnly}
                                onChange={e => {
                                    setShowObligatoiresOnly(e.target.checked);
                                    if (e.target.checked) setSelectedCategory('all');
                                }}
                            />
                            <span>Résolutions obligatoires uniquement ({resolutionsObligatoires.length})</span>
                        </label>
                    </div>

                    <div className={styles.categoryFilters}>
                        <button
                            className={`${styles.categoryFilter} ${selectedCategory === 'all' && !showObligatoiresOnly ? styles.active : ''}`}
                            onClick={() => {
                                setSelectedCategory('all');
                                setShowObligatoiresOnly(false);
                            }}
                        >
                            Toutes ({resolutionsForAGType.length})
                        </button>
                        {orderedCategories.map(cat => (
                            <button
                                key={cat}
                                className={`${styles.categoryFilter} ${selectedCategory === cat && !showObligatoiresOnly ? styles.active : ''}`}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setShowObligatoiresOnly(false);
                                }}
                            >
                                {cat} ({resolutionsByCategorie[cat]?.length || 0})
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.resolutionsList}>
                    {searchQuery || showObligatoiresOnly || selectedCategory !== 'all' ? (
                        // Vue filtrée
                        <div className={styles.filteredResults}>
                            <p className={styles.resultsCount}>
                                {filteredResolutions.length} résolution{filteredResolutions.length > 1 ? 's' : ''} trouvée{filteredResolutions.length > 1 ? 's' : ''}
                            </p>
                            <div className={styles.resolutionsGrid}>
                                {filteredResolutions.map(renderResolutionCard)}
                            </div>
                            {filteredResolutions.length === 0 && (
                                <div className={styles.emptyState}>
                                    <p>Aucune résolution trouvée</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Vue par catégories
                        <div className={styles.categorizedView}>
                            {orderedCategories.map(cat => {
                                const resInCat = resolutionsByCategorie[cat] || [];
                                const isExpanded = expandedCategories.has(cat);
                                const obligatoiresInCat = resInCat.filter(r => isResolutionObligatoire(r.id));

                                return (
                                    <div key={cat} className={styles.categorySection}>
                                        <button
                                            className={styles.categoryHeader}
                                            onClick={() => toggleCategory(cat)}
                                        >
                                            <div className={styles.categoryInfo}>
                                                <h3>{cat}</h3>
                                                <span className={styles.categoryCount}>
                                                    {resInCat.length} résolution{resInCat.length > 1 ? 's' : ''}
                                                    {obligatoiresInCat.length > 0 && (
                                                        <span className={styles.obligatoireCount}>
                                                            ({obligatoiresInCat.length} obligatoire{obligatoiresInCat.length > 1 ? 's' : ''})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                        {isExpanded && (
                                            <div className={styles.resolutionsGrid}>
                                                {resInCat
                                                    .sort((a, b) => {
                                                        // Obligatoires en premier
                                                        const aObl = isResolutionObligatoire(a.id);
                                                        const bObl = isResolutionObligatoire(b.id);
                                                        if (aObl && !bObl) return -1;
                                                        if (!aObl && bObl) return 1;
                                                        // Puis par ordre suggéré
                                                        return (a.ordre_suggere || 999) - (b.ordre_suggere || 999);
                                                    })
                                                    .map(renderResolutionCard)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modale éditeur */}
            {showEditor && (
                <TemplateEditorModal
                    template={editingTemplate}
                    cabinetId={cabinetId}
                    coproId={coproId}
                    onSave={handleEditorSave}
                    onCancel={() => { setShowEditor(false); setEditingTemplate(undefined); }}
                    errorMessage={editorSaveError}
                />
            )}
        </div>
    );
}
