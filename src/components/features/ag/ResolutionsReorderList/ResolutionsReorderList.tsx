'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Layers, List } from 'lucide-react';
import { ResolutionDraggableItem, type Resolution } from '../ResolutionDraggableItem';
import styles from './ResolutionsReorderList.module.css';

interface ResolutionsReorderListProps {
    resolutions: Resolution[];
    onReorder: (newResolutions: Resolution[]) => void;
    onDelete: (id: string) => void;
    onEdit?: (resolution: Resolution) => void;
    renderVariables?: (resolution: Resolution) => React.ReactNode;
    variant?: 'table' | 'cards';
}

type GroupedResolutions = Record<string, Resolution[]>;

const THEME_ORDER = [
    'Assemblée Générale',
    'Finances',
    'Travaux',
    'Conseil syndical et syndic',
    'Contrats',
    'Autres'
];

export function ResolutionsReorderList({
    resolutions,
    onReorder,
    onDelete,
    onEdit,
    renderVariables,
    variant = 'table'
}: ResolutionsReorderListProps) {
    const isCardsVariant = variant === 'cards';
    const [groupByTheme, setGroupByTheme] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    const handleMoveUp = useCallback((index: number) => {
        if (index === 0) return;
        const newResolutions = arrayMove(resolutions, index, index - 1);
        onReorder(newResolutions);
    }, [resolutions, onReorder]);

    const handleMoveDown = useCallback((index: number) => {
        if (index === resolutions.length - 1) return;
        const newResolutions = arrayMove(resolutions, index, index + 1);
        onReorder(newResolutions);
    }, [resolutions, onReorder]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = resolutions.findIndex(r => r.id === active.id);
            const newIndex = resolutions.findIndex(r => r.id === over.id);

            const newResolutions = arrayMove(resolutions, oldIndex, newIndex);
            onReorder(newResolutions);
        }
    }, [resolutions, onReorder]);

    const handleDelete = useCallback((id: string) => {
        if (confirm('Supprimer cette résolution ?')) {
            onDelete(id);
        }
    }, [onDelete]);

    // Groupement par thème (catégorie)
    const groupedResolutions = useMemo((): GroupedResolutions => {
        if (!groupByTheme) return {};

        return resolutions.reduce((acc, resolution) => {
            const theme = resolution.categorie || 'Autres';
            if (!acc[theme]) {
                acc[theme] = [];
            }
            acc[theme].push(resolution);
            return acc;
        }, {} as GroupedResolutions);
    }, [resolutions, groupByTheme]);

    const orderedThemes = useMemo(() => {
        if (!groupByTheme) return [];
        const themes = Object.keys(groupedResolutions);
        return THEME_ORDER.filter(t => themes.includes(t)).concat(
            themes.filter(t => !THEME_ORDER.includes(t))
        );
    }, [groupedResolutions, groupByTheme]);

    // Calcul du numéro global pour chaque résolution (même en mode groupé)
    const getGlobalIndex = useCallback((resolutionId: string): number => {
        return resolutions.findIndex(r => r.id === resolutionId);
    }, [resolutions]);

    if (resolutions.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Aucune résolution ajoutée</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Toggle groupement par thème */}
            {!isCardsVariant && (
                <div className={styles.toolbar}>
                    <button
                        type="button"
                        onClick={() => setGroupByTheme(!groupByTheme)}
                        className={`${styles.toggleBtn} ${groupByTheme ? styles.toggleBtnActive : ''}`}
                    >
                        {groupByTheme ? <Layers size={16} /> : <List size={16} />}
                        {groupByTheme ? 'Vue groupée' : 'Vue liste'}
                    </button>
                    <span className={styles.hint}>
                        Glissez les éléments ou utilisez les boutons ↑↓ pour réordonner
                    </span>
                </div>
            )}

            {/* Header */}
            {variant === 'table' && (
                <div className={styles.listHeader}>
                    <span className={styles.headerHandle}></span>
                    <span className={styles.headerNum}>#</span>
                    <span className={styles.headerTitle}>Titre</span>
                    <span className={styles.headerCategorie}>Thème</span>
                    <span className={styles.headerMaj}>Majorité</span>
                    <span className={styles.headerStatus}>Statut</span>
                    <span className={styles.headerActions}>Ordre</span>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                {!isCardsVariant && groupByTheme ? (
                    // Vue groupée par thème
                    <div className={styles.groupedView}>
                        {orderedThemes.map(theme => (
                            <div key={theme} className={styles.themeGroup}>
                                <div className={styles.themeHeader}>
                                    <span className={styles.themeName}>{theme}</span>
                                    <span className={styles.themeCount}>
                                        {groupedResolutions[theme].length} résolution{groupedResolutions[theme].length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <SortableContext
                                    items={groupedResolutions[theme].map(r => r.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className={styles.list}>
                                        {groupedResolutions[theme].map(resolution => {
                                            const globalIndex = getGlobalIndex(resolution.id);
                                            return (
                                                <ResolutionDraggableItem
                                                    key={resolution.id}
                                                    resolution={resolution}
                                                    index={globalIndex}
                                                    totalCount={resolutions.length}
                                                    variant={variant}
                                                    onMoveUp={handleMoveUp}
                                                    onMoveDown={handleMoveDown}
                                                    onDelete={handleDelete}
                                                    onEdit={onEdit}
                                                    renderVariables={renderVariables}
                                                />
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Vue liste standard
                    <SortableContext
                        items={resolutions.map(r => r.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={styles.list}>
                            {resolutions.map((resolution, index) => (
                                <ResolutionDraggableItem
                                    key={resolution.id}
                                    resolution={resolution}
                                    index={index}
                                    totalCount={resolutions.length}
                                    variant={variant}
                                    onMoveUp={handleMoveUp}
                                    onMoveDown={handleMoveDown}
                                    onDelete={handleDelete}
                                    onEdit={onEdit}
                                    renderVariables={renderVariables}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </DndContext>
        </div>
    );
}
