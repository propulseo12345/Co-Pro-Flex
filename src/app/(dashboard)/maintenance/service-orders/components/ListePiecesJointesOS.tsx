'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, Paperclip, Loader2, FileText } from 'lucide-react';
import type { PieceJointeOS } from '@/types';
import { PieceJointeOSItem } from './PieceJointeOSItem';
import styles from './ListePiecesJointesOS.module.css';

interface ListePiecesJointesOSProps {
    piecesJointes: PieceJointeOS[];
    onUpload?: (fichiers: File[]) => Promise<void>;
    onSupprimer?: (pj: PieceJointeOS) => void;
    onTelecharger?: (pj: PieceJointeOS) => void;
    onPrevisualiser?: (pj: PieceJointeOS) => void;
    lectureSeule?: boolean;
    isLoading?: boolean;
    maxFiles?: number;
    maxSizeMB?: number;
}

/** Types MIME acceptés */
const TYPES_ACCEPTES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx';

export function ListePiecesJointesOS({
    piecesJointes,
    onUpload,
    onSupprimer,
    onTelecharger,
    onPrevisualiser,
    lectureSeule = false,
    isLoading = false,
    maxFiles = 10,
    maxSizeMB = 25,
}: ListePiecesJointesOSProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = useCallback(async (fichiers: FileList | null) => {
        if (!fichiers || fichiers.length === 0 || !onUpload) return;

        // Validation nombre de fichiers
        if (piecesJointes.length + fichiers.length > maxFiles) {
            alert(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichiers.`);
            return;
        }

        // Validation taille
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        const fichiersTropGros = Array.from(fichiers).filter(f => f.size > maxSizeBytes);
        if (fichiersTropGros.length > 0) {
            alert(
                `Certains fichiers dépassent la taille maximale de ${maxSizeMB} Mo:\n` +
                fichiersTropGros.map(f => f.name).join('\n')
            );
            return;
        }

        setIsUploading(true);
        try {
            await onUpload(Array.from(fichiers));
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            alert('Une erreur est survenue lors de l\'upload des fichiers.');
        } finally {
            setIsUploading(false);
            // Reset input
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    }, [onUpload, piecesJointes.length, maxFiles, maxSizeMB]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!lectureSeule) {
            setIsDragOver(true);
        }
    }, [lectureSeule]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (lectureSeule || !onUpload) return;

        const fichiers = e.dataTransfer.files;
        await handleFileSelect(fichiers);
    }, [lectureSeule, onUpload, handleFileSelect]);

    // Calcul taille totale
    const tailleTotale = piecesJointes.reduce((sum, pj) => {
        const match = pj.taille.match(/[\d.]+/);
        return sum + (match ? parseFloat(match[0]) : 0);
    }, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h4 className={styles.titre}>
                    <Paperclip size={16} aria-hidden="true" />
                    Pièces jointes
                    {piecesJointes.length > 0 && (
                        <span className={styles.compteur}>{piecesJointes.length}</span>
                    )}
                </h4>
                {piecesJointes.length > 0 && (
                    <span className={styles.tailleTotale}>
                        {tailleTotale.toFixed(2)} Mo
                    </span>
                )}
            </div>

            {/* Zone de drop / upload */}
            {!lectureSeule && onUpload && (
                <div
                    className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            inputRef.current?.click();
                        }
                    }}
                    aria-label="Zone de téléversement de fichiers"
                >
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={TYPES_ACCEPTES}
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className={styles.inputHidden}
                        disabled={isUploading}
                        aria-hidden="true"
                    />

                    {isUploading ? (
                        <>
                            <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
                            <span>Envoi en cours...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={24} className={styles.iconeUpload} aria-hidden="true" />
                            <span className={styles.dropTexte}>
                                Glissez des fichiers ici ou <strong>cliquez pour sélectionner</strong>
                            </span>
                            <span className={styles.dropFormats}>
                                PDF, images, documents Word/Excel (max {maxSizeMB} Mo par fichier)
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Liste des PJ */}
            {isLoading ? (
                <div className={styles.loading}>
                    <Loader2 size={20} className={styles.spinner} aria-hidden="true" />
                    Chargement...
                </div>
            ) : piecesJointes.length === 0 ? (
                <div className={styles.vide}>
                    <FileText size={20} aria-hidden="true" />
                    Aucune pièce jointe
                </div>
            ) : (
                <div className={styles.liste}>
                    {piecesJointes.map((pj) => (
                        <PieceJointeOSItem
                            key={pj.id}
                            pieceJointe={pj}
                            onTelecharger={onTelecharger}
                            onPrevisualiser={onPrevisualiser}
                            onSupprimer={lectureSeule ? undefined : onSupprimer}
                            readOnly={lectureSeule}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ListePiecesJointesOS;
