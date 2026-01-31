'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Pencil, ChevronDown as ExpandIcon, ChevronUp as CollapseIcon } from 'lucide-react';
import { type MajorityType, MAJORITES } from '@/lib/constants/resolutions';
import styles from './ResolutionDraggableItem.module.css';

export interface Resolution {
    id: string;
    templateId?: string;
    titre: string;
    texte: string;
    majorite: MajorityType;
    variables?: Record<string, string>;
    custom: boolean;
    categorie?: string;
}

interface ResolutionDraggableItemProps {
    resolution: Resolution;
    index: number;
    totalCount: number;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onDelete: (id: string) => void;
    onEdit?: (resolution: Resolution) => void;
    renderVariables?: (resolution: Resolution) => React.ReactNode;
}

export function ResolutionDraggableItem({
    resolution,
    index,
    totalCount,
    isExpanded,
    onToggleExpand,
    onMoveUp,
    onMoveDown,
    onDelete,
    onEdit,
    renderVariables
}: ResolutionDraggableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: resolution.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    const hasEmptyVars = resolution.variables && Object.values(resolution.variables).some(v => !v);
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;

    const handleMoveUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMoveUp(index);
    };

    const handleMoveDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMoveDown(index);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(resolution.id);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(resolution);
        }
    };

    const handleToggle = () => {
        onToggleExpand(resolution.id);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
        >
            <div className={styles.row} onClick={handleToggle}>
                {/* Handle de drag */}
                <div
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    title="Glisser pour réordonner"
                >
                    <GripVertical size={18} />
                </div>

                {/* Numéro */}
                <span className={styles.number}>{index + 1}</span>

                {/* Titre */}
                <span className={styles.title}>{resolution.titre}</span>

                {/* Catégorie (thème) */}
                {resolution.categorie && (
                    <span className={styles.categorie}>{resolution.categorie}</span>
                )}

                {/* Majorité */}
                <span className={styles.majority}>
                    <span className={styles.majorityBadge}>
                        {MAJORITES[resolution.majorite].nom}
                    </span>
                </span>

                {/* Statut */}
                <span className={styles.status}>
                    {hasEmptyVars ? (
                        <span className={styles.statusIncomplete}>À compléter</span>
                    ) : (
                        <span className={styles.statusComplete}>Complet</span>
                    )}
                </span>

                {/* Boutons de réordonnancement */}
                <div className={styles.reorderButtons}>
                    <button
                        type="button"
                        onClick={handleMoveUp}
                        disabled={isFirst}
                        className={styles.reorderBtn}
                        title="Remonter"
                        aria-label="Remonter la résolution"
                    >
                        <ChevronUp size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={handleMoveDown}
                        disabled={isLast}
                        className={styles.reorderBtn}
                        title="Descendre"
                        aria-label="Descendre la résolution"
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>

                {/* Expand toggle */}
                <span className={styles.expandToggle}>
                    {isExpanded ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
                </span>
            </div>

            {/* Contenu étendu */}
            {isExpanded && (
                <div className={styles.expandedContent}>
                    <div className={styles.resolutionText}>
                        {renderVariables ? renderVariables(resolution) : resolution.texte}
                    </div>
                    <div className={styles.expandedActions}>
                        {onEdit && (
                            <button
                                type="button"
                                onClick={handleEdit}
                                className={styles.editBtn}
                                title="Modifier"
                            >
                                <Pencil size={14} /> Modifier
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={styles.deleteBtn}
                            title="Supprimer"
                        >
                            <Trash2 size={14} /> Supprimer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
