'use client';

import { useState, useMemo } from 'react';
import { Search, X, Star, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import {
    RESOLUTIONS_BANK,
    getCategories,
    MAJORITES,
    type ResolutionTemplate,
    type TypeAG,
    getResolutionsForAGType,
    getResolutionsObligatoires,
    getResolutionsByCategorieForAGType,
    searchResolutions
} from '@/lib/constants/resolutions';
import styles from './BibliothequeResolutions.module.css';

interface BibliothequeResolutionsProps {
    typeAG: TypeAG;
    onSelectResolution: (resolution: ResolutionTemplate) => void;
    onClose: () => void;
    resolutionsDejaAjoutees?: string[];
}

export function BibliothequeResolutions({
    typeAG,
    onSelectResolution,
    onClose,
    resolutionsDejaAjoutees = []
}: BibliothequeResolutionsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showObligatoiresOnly, setShowObligatoiresOnly] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));

    // Résolutions filtrées par type d'AG
    const resolutionsForAGType = useMemo(() => {
        return getResolutionsForAGType(typeAG);
    }, [typeAG]);

    // Résolutions obligatoires pour ce type d'AG
    const resolutionsObligatoires = useMemo(() => {
        return getResolutionsObligatoires(typeAG);
    }, [typeAG]);

    // Résolutions par catégorie pour ce type d'AG
    const resolutionsByCategorie = useMemo(() => {
        return getResolutionsByCategorieForAGType(typeAG);
    }, [typeAG]);

    // Résolutions filtrées (recherche + catégorie + obligatoires)
    const filteredResolutions = useMemo(() => {
        let results: ResolutionTemplate[];

        if (searchQuery.trim()) {
            results = searchResolutions(searchQuery, typeAG);
        } else if (showObligatoiresOnly) {
            results = resolutionsObligatoires;
        } else if (selectedCategory !== 'all') {
            results = resolutionsByCategorie[selectedCategory] || [];
        } else {
            results = resolutionsForAGType;
        }

        return results;
    }, [searchQuery, selectedCategory, showObligatoiresOnly, typeAG, resolutionsForAGType, resolutionsObligatoires, resolutionsByCategorie]);

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

    const isResolutionDejaAjoutee = (resId: string) => {
        return resolutionsDejaAjoutees.includes(resId);
    };

    const handleAddResolution = (resolution: ResolutionTemplate) => {
        onSelectResolution(resolution);
    };

    const renderResolutionCard = (resolution: ResolutionTemplate) => {
        const isObligatoire = isResolutionObligatoire(resolution.id);
        const isDejaAjoutee = isResolutionDejaAjoutee(resolution.id);

        return (
            <div
                key={resolution.id}
                className={`${styles.resolutionCard} ${isObligatoire ? styles.obligatoire : ''} ${isDejaAjoutee ? styles.dejaAjoutee : ''}`}
            >
                <div className={styles.cardHeader}>
                    <h4 className={styles.cardTitle}>{resolution.titre}</h4>
                    {isObligatoire && (
                        <span className={styles.badgeObligatoire} title="Résolution obligatoire pour ce type d'AG">
                            <Star size={12} /> Obligatoire
                        </span>
                    )}
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
                    <button onClick={onClose} className={styles.closeButton} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

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
        </div>
    );
}
