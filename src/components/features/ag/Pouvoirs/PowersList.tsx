'use client';

import { useState, useMemo, useRef } from 'react';
import {
    Users,
    User,
    Trash2,
    FileText,
    Upload,
    Eye,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import type { IPouvoir } from '@/types/models/ag';
import type { CoproprietaireForPouvoir } from '@/hooks/modules/usePouvoirs';
import { MAX_POUVOIRS_PAR_MANDATAIRE } from '@/hooks/modules/usePouvoirs';
import styles from './Pouvoirs.module.css';

interface PowersListProps {
    pouvoirs: IPouvoir[];
    coproprietaires: CoproprietaireForPouvoir[];
    onRemove: (pouvoirId: string) => void;
    onUploadJustificatif: (pouvoirId: string, file: File) => Promise<void>;
    onRemoveJustificatif: (pouvoirId: string) => void;
}

function formatDate(isoDate?: string): string {
    if (!isoDate) return '-';
    return new Date(isoDate).toLocaleDateString('fr-FR');
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

interface PouvoirWithDetails extends IPouvoir {
    mandantNom: string;
    mandantLot: string;
    mandantTantiemes: number;
    mandataireNom: string;
}

export function PowersList({
    pouvoirs,
    coproprietaires,
    onRemove,
    onUploadJustificatif,
    onRemoveJustificatif,
}: PowersListProps) {
    const [expandedMandataires, setExpandedMandataires] = useState<Set<string>>(new Set());
    const [showPreview, setShowPreview] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // Enrichir les pouvoirs avec les infos des copropriétaires
    const enrichedPouvoirs = useMemo<PouvoirWithDetails[]>(() => {
        return pouvoirs.map(p => {
            const mandant = coproprietaires.find(c => c.id === p.mandantCoproId);
            const mandataire = coproprietaires.find(c => c.id === p.mandataireCoproId);
            return {
                ...p,
                mandantNom: mandant?.nom || 'Inconnu',
                mandantLot: mandant?.lot || '-',
                mandantTantiemes: mandant?.tantiemes || 0,
                mandataireNom: mandataire?.nom || 'Inconnu',
            };
        });
    }, [pouvoirs, coproprietaires]);

    // Grouper par mandataire
    const pouvoirsByMandataire = useMemo(() => {
        const grouped = new Map<string, PouvoirWithDetails[]>();

        enrichedPouvoirs.forEach(p => {
            const existing = grouped.get(p.mandataireCoproId) || [];
            grouped.set(p.mandataireCoproId, [...existing, p]);
        });

        return grouped;
    }, [enrichedPouvoirs]);

    // Calculer les tantièmes totaux par mandataire
    const tantiemesByMandataire = useMemo(() => {
        const totals = new Map<string, number>();

        pouvoirsByMandataire.forEach((mandatairPouvoirs, mandataireId) => {
            const total = mandatairPouvoirs.reduce((sum, p) => sum + p.mandantTantiemes, 0);
            totals.set(mandataireId, total);
        });

        return totals;
    }, [pouvoirsByMandataire]);

    const toggleMandataire = (mandataireId: string) => {
        setExpandedMandataires(prev => {
            const next = new Set(prev);
            if (next.has(mandataireId)) {
                next.delete(mandataireId);
            } else {
                next.add(mandataireId);
            }
            return next;
        });
    };

    const handleFileChange = async (pouvoirId: string, file: File | null) => {
        if (!file) return;

        setUploadingId(pouvoirId);
        setUploadError(null);

        try {
            await onUploadJustificatif(pouvoirId, file);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
        } finally {
            setUploadingId(null);
            // Reset file input
            const input = fileInputRefs.current.get(pouvoirId);
            if (input) input.value = '';
        }
    };

    const previewPouvoir = pouvoirs.find(p => p.id === showPreview);

    if (pouvoirs.length === 0) {
        return (
            <div className={styles.emptyList}>
                <Users size={48} aria-hidden="true" />
                <h4>Aucun pouvoir enregistré</h4>
                <p>Utilisez le formulaire ci-dessus pour ajouter un pouvoir.</p>
            </div>
        );
    }

    return (
        <div className={styles.powersList}>
            <h4 className={styles.powersListTitle}>
                Pouvoirs enregistrés ({pouvoirs.length})
            </h4>

            {Array.from(pouvoirsByMandataire.entries()).map(([mandataireId, mandatairePouvoirs]) => {
                const mandataire = coproprietaires.find(c => c.id === mandataireId);
                const isExpanded = expandedMandataires.has(mandataireId);
                const count = mandatairePouvoirs.length;
                const isOverLimit = count > MAX_POUVOIRS_PAR_MANDATAIRE;
                const tantiemesRepresentes = tantiemesByMandataire.get(mandataireId) || 0;

                return (
                    <div
                        key={mandataireId}
                        className={`${styles.mandataireGroup} ${isOverLimit ? styles.mandataireGroupError : ''}`}
                    >
                        <button
                            type="button"
                            onClick={() => toggleMandataire(mandataireId)}
                            className={styles.mandataireHeader}
                        >
                            <div className={styles.mandataireInfo}>
                                {isExpanded ? (
                                    <ChevronDown size={18} aria-hidden="true" />
                                ) : (
                                    <ChevronRight size={18} aria-hidden="true" />
                                )}
                                <User size={18} aria-hidden="true" />
                                <span className={styles.mandataireName}>
                                    {mandataire?.nom || 'Inconnu'}
                                </span>
                                <span className={styles.mandataireLot}>
                                    Lot {mandataire?.lot || '-'}
                                </span>
                            </div>
                            <div className={styles.mandataireStats}>
                                <span className={`${styles.pouvoirBadge} ${isOverLimit ? styles.pouvoirBadgeError : count >= MAX_POUVOIRS_PAR_MANDATAIRE ? styles.pouvoirBadgeWarning : ''}`}>
                                    {count}/{MAX_POUVOIRS_PAR_MANDATAIRE} pouvoirs
                                </span>
                                <span className={styles.tantiemesBadge}>
                                    +{tantiemesRepresentes} t.
                                </span>
                            </div>
                        </button>

                        {isExpanded && (
                            <div className={styles.mandatairePouvoirs}>
                                {mandatairePouvoirs.map(pouvoir => (
                                    <div key={pouvoir.id} className={styles.pouvoirItem}>
                                        <div className={styles.pouvoirMain}>
                                            <div className={styles.pouvoirMandant}>
                                                <span className={styles.pouvoirMandantLabel}>Mandant :</span>
                                                <span className={styles.pouvoirMandantName}>
                                                    {pouvoir.mandantNom}
                                                </span>
                                                <span className={styles.pouvoirMandantDetails}>
                                                    Lot {pouvoir.mandantLot} • {pouvoir.mandantTantiemes} t.
                                                </span>
                                            </div>
                                            <div className={styles.pouvoirMeta}>
                                                <span className={styles.pouvoirDate}>
                                                    Signé le : {formatDate(pouvoir.signedAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.pouvoirJustificatif}>
                                            {pouvoir.justificatif ? (
                                                <div className={styles.justificatifInfo}>
                                                    <FileText size={16} className={styles.justificatifIcon} aria-hidden="true" />
                                                    <span className={styles.justificatifName}>
                                                        {pouvoir.justificatif.fileName}
                                                    </span>
                                                    <span className={styles.justificatifSize}>
                                                        ({formatFileSize(pouvoir.justificatif.size)})
                                                    </span>
                                                    <div className={styles.justificatifActions}>
                                                        {pouvoir.justificatif.dataUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPreview(pouvoir.id)}
                                                                className={styles.actionButton}
                                                                title="Voir"
                                                            >
                                                                <Eye size={16} aria-hidden="true" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveJustificatif(pouvoir.id)}
                                                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={16} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.justificatifMissing}>
                                                    <AlertTriangle size={16} aria-hidden="true" />
                                                    <span>Justificatif manquant</span>
                                                    <label className={styles.uploadLabel}>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={e => handleFileChange(pouvoir.id, e.target.files?.[0] || null)}
                                                            className={styles.uploadInput}
                                                            ref={el => {
                                                                if (el) fileInputRefs.current.set(pouvoir.id, el);
                                                            }}
                                                            disabled={uploadingId === pouvoir.id}
                                                        />
                                                        <Upload size={14} aria-hidden="true" />
                                                        {uploadingId === pouvoir.id ? 'Upload...' : 'Ajouter'}
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onRemove(pouvoir.id)}
                                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                            title="Supprimer ce pouvoir"
                                        >
                                            <Trash2 size={18} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {uploadError && (
                <div className={styles.uploadErrorBanner}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    {uploadError}
                </div>
            )}

            {/* Modal de prévisualisation */}
            {showPreview && previewPouvoir?.justificatif?.dataUrl && (
                <div className={styles.previewOverlay} onClick={() => setShowPreview(null)}>
                    <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.previewHeader}>
                            <span className={styles.previewTitle}>
                                {previewPouvoir.justificatif.fileName}
                            </span>
                            <button
                                onClick={() => setShowPreview(null)}
                                className={styles.previewClose}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.previewContent}>
                            {previewPouvoir.justificatif.mimeType === 'application/pdf' ? (
                                <iframe
                                    src={previewPouvoir.justificatif.dataUrl}
                                    className={styles.previewIframe}
                                    title="Prévisualisation du justificatif"
                                />
                            ) : (
                                <img
                                    src={previewPouvoir.justificatif.dataUrl}
                                    alt="Justificatif"
                                    className={styles.previewImage}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PowersList;
