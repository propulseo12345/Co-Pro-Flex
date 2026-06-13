'use client';

import { useState, useCallback } from 'react';
import {
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Zap,
    Edit3,
    Clock
} from 'lucide-react';
import type { VariableInfo } from '@/lib/utils/resolution-variables';
import styles from './VariablesDetectedPanel.module.css';

interface VariablesDetectedPanelProps {
    variables: VariableInfo[];
    onUpdateVariable: (name: string, value: string) => void;
    onResetAll: () => void;
    onResetVariable: (name: string) => void;
    getHistory?: (name: string) => string[];
    isCollapsible?: boolean;
    defaultCollapsed?: boolean;
}

export function VariablesDetectedPanel({
    variables,
    onUpdateVariable,
    onResetAll,
    onResetVariable,
    getHistory,
    isCollapsible = true,
    defaultCollapsed = false
}: VariablesDetectedPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [editingVar, setEditingVar] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

    // Statistiques
    const autoCount = variables.filter(v => v.status === 'auto').length;
    const manualCount = variables.filter(v => v.status === 'manual').length;
    const missingCount = variables.filter(v => v.status === 'missing').length;
    const errorCount = variables.filter(v => v.value && !v.validation.isValid).length;

    // Début de l'édition
    const startEdit = useCallback((varInfo: VariableInfo) => {
        setEditingVar(varInfo.name);
        setEditValue(varInfo.value);
        setShowHistoryFor(null);
    }, []);

    // Sauvegarde de l'édition
    const saveEdit = useCallback(() => {
        if (editingVar) {
            onUpdateVariable(editingVar, editValue);
            setEditingVar(null);
            setEditValue('');
        }
    }, [editingVar, editValue, onUpdateVariable]);

    // Annulation de l'édition
    const cancelEdit = useCallback(() => {
        setEditingVar(null);
        setEditValue('');
    }, []);

    // Sélection depuis l'historique
    const selectFromHistory = useCallback((varName: string, value: string) => {
        onUpdateVariable(varName, value);
        setShowHistoryFor(null);
    }, [onUpdateVariable]);

    // Rendu du badge de statut
    const renderStatusBadge = (varInfo: VariableInfo) => {
        if (!varInfo.value) {
            return (
                <span className={`${styles.badge} ${styles.badgeMissing}`}>
                    <AlertCircle size={12} />
                    Manquant
                </span>
            );
        }

        if (!varInfo.validation.isValid) {
            return (
                <span className={`${styles.badge} ${styles.badgeError}`}>
                    <AlertCircle size={12} />
                    Erreur
                </span>
            );
        }

        if (varInfo.status === 'auto') {
            return (
                <span className={`${styles.badge} ${styles.badgeAuto}`}>
                    <Zap size={12} />
                    Auto
                </span>
            );
        }

        return (
            <span className={`${styles.badge} ${styles.badgeManual}`}>
                <Edit3 size={12} />
                Manuel
            </span>
        );
    };

    // Rendu d'une variable
    const renderVariable = (varInfo: VariableInfo) => {
        const isEditing = editingVar === varInfo.name;
        const history = getHistory ? getHistory(varInfo.name) : [];
        const showHistory = showHistoryFor === varInfo.name && history.length > 0;

        return (
            <div
                key={varInfo.name}
                className={`${styles.variableItem} ${!varInfo.value ? styles.variableItemMissing : ''} ${!varInfo.validation.isValid && varInfo.value ? styles.variableItemError : ''}`}
            >
                <div className={styles.variableHeader}>
                    <span className={styles.variableName}>{varInfo.name}</span>
                    {varInfo.source && (
                        <span className={styles.variableSource}>{varInfo.source}</span>
                    )}
                    {renderStatusBadge(varInfo)}
                </div>

                {isEditing ? (
                    <div className={styles.editContainer}>
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                            }}
                            className={styles.editInput}
                            autoFocus
                            placeholder={`Valeur pour ${varInfo.name}`}
                        />
                        <div className={styles.editActions}>
                            <button
                                type="button"
                                onClick={saveEdit}
                                className={styles.editSave}
                                title="Valider"
                            >
                                <CheckCircle size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className={styles.editCancel}
                                title="Annuler"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.variableValue}>
                        <span
                            className={`${styles.valueText} ${!varInfo.value ? styles.valueEmpty : ''}`}
                            onClick={() => startEdit(varInfo)}
                            title="Cliquer pour modifier"
                        >
                            {varInfo.value || '(Non renseigné)'}
                        </span>
                        <div className={styles.variableActions}>
                            {history.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowHistoryFor(showHistory ? null : varInfo.name)}
                                    className={styles.historyBtn}
                                    title="Historique"
                                >
                                    <Clock size={14} />
                                </button>
                            )}
                            {varInfo.status !== 'auto' && (
                                <button
                                    type="button"
                                    onClick={() => onResetVariable(varInfo.name)}
                                    className={styles.resetBtn}
                                    title="Réinitialiser à la suggestion"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Historique */}
                {showHistory && (
                    <div className={styles.historyDropdown}>
                        <div className={styles.historyTitle}>Valeurs récentes</div>
                        {/* Valeurs d'historique : simples chaînes pouvant se répéter, pas de clé stable disponible */}
                        {history.slice(0, 5).map((val, idx) => (
                            <button
                                // eslint-disable-next-line react/no-array-index-key
                                key={idx}
                                type="button"
                                onClick={() => selectFromHistory(varInfo.name, val)}
                                className={styles.historyItem}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                )}

                {/* Erreur de validation */}
                {varInfo.value && !varInfo.validation.isValid && varInfo.validation.error && (
                    <div className={styles.validationError}>
                        <AlertCircle size={12} />
                        {varInfo.validation.error}
                    </div>
                )}
            </div>
        );
    };

    if (variables.length === 0) {
        return null;
    }

    return (
        <div className={styles.panel}>
            {/* Header */}
            <div
                className={styles.header}
                onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
                role={isCollapsible ? 'button' : undefined}
                tabIndex={isCollapsible ? 0 : undefined}
            >
                <div className={styles.headerTitle}>
                    <h4>Variables détectées</h4>
                    <span className={styles.headerCount}>
                        {variables.length} variable{variables.length > 1 ? 's' : ''}
                    </span>
                </div>

                <div className={styles.headerStats}>
                    {autoCount > 0 && (
                        <span className={styles.statAuto} title="Pré-remplies automatiquement">
                            <Zap size={12} /> {autoCount}
                        </span>
                    )}
                    {manualCount > 0 && (
                        <span className={styles.statManual} title="Saisies manuellement">
                            <Edit3 size={12} /> {manualCount}
                        </span>
                    )}
                    {missingCount > 0 && (
                        <span className={styles.statMissing} title="À compléter">
                            <AlertCircle size={12} /> {missingCount}
                        </span>
                    )}
                    {errorCount > 0 && (
                        <span className={styles.statError} title="Erreurs de validation">
                            <AlertCircle size={12} /> {errorCount}
                        </span>
                    )}
                </div>

                {isCollapsible && (
                    <span className={styles.collapseIcon}>
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </span>
                )}
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div className={styles.content}>
                    {/* Actions globales */}
                    <div className={styles.globalActions}>
                        <button
                            type="button"
                            onClick={onResetAll}
                            className={styles.resetAllBtn}
                        >
                            <RefreshCw size={14} />
                            Réinitialiser depuis les données
                        </button>
                    </div>

                    {/* Liste des variables */}
                    <div className={styles.variablesList}>
                        {variables.map(renderVariable)}
                    </div>

                    {/* Message si incomplet */}
                    {missingCount > 0 && (
                        <div className={styles.warningMessage}>
                            <AlertCircle size={16} />
                            <span>
                                {missingCount} variable{missingCount > 1 ? 's' : ''} non renseignée{missingCount > 1 ? 's' : ''}.
                                La résolution ne pourra pas être finalisée.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
