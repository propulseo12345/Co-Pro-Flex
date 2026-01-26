'use client';

import React, { useState, useCallback } from 'react';
import {
    FileText,
    Image,
    File,
    Download,
    Eye,
    Trash2,
    Loader2,
    ExternalLink,
} from 'lucide-react';
import type { PieceJointeOS } from '@/types';
import styles from './PieceJointeOSItem.module.css';

interface PieceJointeOSItemProps {
    pieceJointe: PieceJointeOS;
    onTelecharger?: (pj: PieceJointeOS) => void;
    onPrevisualiser?: (pj: PieceJointeOS) => void;
    onSupprimer?: (pj: PieceJointeOS) => void;
    compact?: boolean;
    readOnly?: boolean;
}

/** Formate la taille du fichier */
function formatTaille(taille: string): string {
    // La taille est déjà formatée dans le mock (ex: "1.25 Mo")
    return taille;
}

/** Retourne l'icône selon le type */
function getIconeType(type: PieceJointeOS['type']) {
    switch (type) {
        case 'PDF':
            return FileText;
        case 'IMAGE':
            return Image;
        default:
            return File;
    }
}

/** Retourne la classe CSS selon le type */
function getTypeClass(type: PieceJointeOS['type']): string {
    switch (type) {
        case 'PDF':
            return styles.typePdf;
        case 'IMAGE':
            return styles.typeImage;
        default:
            return styles.typeAutre;
    }
}

export function PieceJointeOSItem({
    pieceJointe,
    onTelecharger,
    onPrevisualiser,
    onSupprimer,
    compact = false,
    readOnly = false,
}: PieceJointeOSItemProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationSuppression, setConfirmationSuppression] = useState(false);

    const IconeType = getIconeType(pieceJointe.type);
    const peutPrevisualiser = ['PDF', 'IMAGE'].includes(pieceJointe.type);
    const hasValidUrl = pieceJointe.url && !pieceJointe.url.includes('mockup');

    const handleTelecharger = useCallback(async () => {
        if (!onTelecharger && !hasValidUrl) {
            alert('Téléchargement non disponible (fichier simulé)');
            return;
        }

        setIsLoading(true);

        if (onTelecharger) {
            await onTelecharger(pieceJointe);
        } else if (hasValidUrl) {
            // Téléchargement direct via URL
            const link = document.createElement('a');
            link.href = pieceJointe.url;
            link.download = pieceJointe.nom;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setIsLoading(false);
    }, [onTelecharger, pieceJointe, hasValidUrl]);

    const handlePrevisualiser = useCallback(() => {
        if (onPrevisualiser) {
            onPrevisualiser(pieceJointe);
        } else if (hasValidUrl) {
            window.open(pieceJointe.url, '_blank', 'noopener,noreferrer');
        } else {
            alert('Prévisualisation non disponible (fichier simulé)');
        }
    }, [onPrevisualiser, pieceJointe, hasValidUrl]);

    const handleSupprimer = useCallback(async () => {
        if (!confirmationSuppression) {
            setConfirmationSuppression(true);
            return;
        }

        setIsLoading(true);
        if (onSupprimer) {
            await onSupprimer(pieceJointe);
        }
        setIsLoading(false);
        setConfirmationSuppression(false);
    }, [confirmationSuppression, onSupprimer, pieceJointe]);

    // Mode compact
    if (compact) {
        return (
            <div className={styles.itemCompact}>
                <IconeType size={16} className={getTypeClass(pieceJointe.type)} aria-hidden="true" />
                <button
                    type="button"
                    onClick={handlePrevisualiser}
                    className={styles.lienCompact}
                    title={pieceJointe.nom}
                >
                    {pieceJointe.nom}
                </button>
                <button
                    type="button"
                    onClick={handleTelecharger}
                    className={styles.btnIcone}
                    title="Télécharger"
                    disabled={isLoading}
                    aria-label={`Télécharger ${pieceJointe.nom}`}
                >
                    {isLoading ? (
                        <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
                    ) : (
                        <Download size={14} aria-hidden="true" />
                    )}
                </button>
            </div>
        );
    }

    // Mode standard
    return (
        <div className={styles.item}>
            {/* Icône type */}
            <div className={`${styles.iconeWrapper} ${getTypeClass(pieceJointe.type)}`}>
                <IconeType size={24} aria-hidden="true" />
            </div>

            {/* Infos fichier */}
            <div className={styles.infos}>
                <span className={styles.nom} title={pieceJointe.nom}>
                    {pieceJointe.nom}
                </span>
                <span className={styles.meta}>
                    {formatTaille(pieceJointe.taille)}
                    {' • '}
                    {new Date(pieceJointe.dateAjout).toLocaleDateString('fr-FR')}
                </span>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                {/* Prévisualiser */}
                {peutPrevisualiser && (
                    <button
                        type="button"
                        onClick={handlePrevisualiser}
                        className={styles.btnAction}
                        title="Prévisualiser"
                        aria-label={`Prévisualiser ${pieceJointe.nom}`}
                    >
                        <Eye size={18} aria-hidden="true" />
                    </button>
                )}

                {/* Ouvrir dans nouvel onglet */}
                {hasValidUrl && (
                    <a
                        href={pieceJointe.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnAction}
                        title="Ouvrir dans un nouvel onglet"
                        aria-label={`Ouvrir ${pieceJointe.nom} dans un nouvel onglet`}
                    >
                        <ExternalLink size={18} aria-hidden="true" />
                    </a>
                )}

                {/* Télécharger */}
                <button
                    type="button"
                    onClick={handleTelecharger}
                    className={styles.btnAction}
                    title="Télécharger"
                    disabled={isLoading}
                    aria-label={`Télécharger ${pieceJointe.nom}`}
                >
                    {isLoading ? (
                        <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
                    ) : (
                        <Download size={18} aria-hidden="true" />
                    )}
                </button>

                {/* Supprimer */}
                {!readOnly && onSupprimer && (
                    <button
                        type="button"
                        onClick={handleSupprimer}
                        className={`${styles.btnAction} ${confirmationSuppression ? styles.btnDanger : ''}`}
                        title={confirmationSuppression ? 'Confirmer la suppression' : 'Supprimer'}
                        disabled={isLoading}
                        onBlur={() => setConfirmationSuppression(false)}
                        aria-label={
                            confirmationSuppression
                                ? `Confirmer la suppression de ${pieceJointe.nom}`
                                : `Supprimer ${pieceJointe.nom}`
                        }
                    >
                        <Trash2 size={18} aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default PieceJointeOSItem;
