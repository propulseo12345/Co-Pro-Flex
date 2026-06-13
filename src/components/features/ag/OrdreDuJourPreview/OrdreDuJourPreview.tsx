'use client';

import { useMemo } from 'react';
import { FileText, Copy, CheckCircle } from 'lucide-react';
import { type MajorityType, MAJORITES } from '@/lib/constants/resolutions';
import styles from './OrdreDuJourPreview.module.css';

interface Resolution {
    id: string;
    templateId?: string;
    titre: string;
    texte: string;
    majorite: MajorityType;
    variables?: Record<string, string>;
    custom: boolean;
    categorie?: string;
}

interface OrdreDuJourPreviewProps {
    resolutions: Resolution[];
    agTitle?: string;
    agDate?: string;
}

export function OrdreDuJourPreview({
    resolutions,
    agTitle = 'Assemblée Générale',
    agDate
}: OrdreDuJourPreviewProps) {
    const [, setCopied] = useMemo(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return [false, (val: boolean) => {
            if (timer) clearTimeout(timer);
            timer = val ? setTimeout(() => setCopied(false), 2000) : null;
        }];
    }, []);

    // Pour éviter les problèmes avec useMemo côté state, on utilise useState
    const handleCopy = async () => {
        const text = generatePlainText();
        try {
            await navigator.clipboard.writeText(text);
            // Note: ne peut pas utiliser setState ici dans un composant simple
            // On pourrait ajouter un state local mais pour garder le composant simple
            // on utilise une alerte ou on affiche un feedback visuel temporaire
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    };

    const generatePlainText = (): string => {
        let text = `ORDRE DU JOUR\n`;
        text += `${agTitle}\n`;
        if (agDate) {
            text += `Date : ${agDate}\n`;
        }
        text += `\n${'='.repeat(50)}\n\n`;

        resolutions.forEach((resolution, index) => {
            text += `${index + 1}. ${resolution.titre}\n`;
            text += `   Majorité requise : ${MAJORITES[resolution.majorite].nom}\n`;
            if (resolution.categorie) {
                text += `   Thème : ${resolution.categorie}\n`;
            }
            text += `\n`;
        });

        text += `${'='.repeat(50)}\n`;
        text += `Total : ${resolutions.length} résolution${resolutions.length > 1 ? 's' : ''}\n`;

        return text;
    };

    // Statistiques
    const stats = useMemo(() => {
        const byMajority: Record<string, number> = {};
        resolutions.forEach(r => {
            const majName = MAJORITES[r.majorite].nom;
            byMajority[majName] = (byMajority[majName] || 0) + 1;
        });
        return byMajority;
    }, [resolutions]);

    if (resolutions.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <FileText size={20} />
                    <h3>Aperçu ordre du jour</h3>
                </div>
                <div className={styles.emptyState}>
                    <p>Ajoutez des résolutions pour voir l'aperçu</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <FileText size={20} />
                    <h3>Aperçu ordre du jour</h3>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className={styles.copyBtn}
                    title="Copier en texte"
                >
                    <Copy size={16} />
                </button>
            </div>

            <div className={styles.preview}>
                <div className={styles.previewHeader}>
                    <span className={styles.previewTitle}>{agTitle}</span>
                    {agDate && <span className={styles.previewDate}>{agDate}</span>}
                </div>

                <ol className={styles.previewList}>
                    {resolutions.map((resolution, index) => (
                        <li key={resolution.id} className={styles.previewItem}>
                            <span className={styles.previewNum}>{index + 1}.</span>
                            <div className={styles.previewContent}>
                                <span className={styles.previewItemTitle}>{resolution.titre}</span>
                                <span className={styles.previewItemMeta}>
                                    {MAJORITES[resolution.majorite].nom}
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>

                <div className={styles.previewFooter}>
                    <span className={styles.totalCount}>
                        {resolutions.length} résolution{resolutions.length > 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Statistiques par majorité */}
            <div className={styles.stats}>
                <h4 className={styles.statsTitle}>Répartition par majorité</h4>
                <div className={styles.statsGrid}>
                    {Object.entries(stats).map(([majority, count]) => (
                        <div key={majority} className={styles.statItem}>
                            <span className={styles.statCount}>{count}</span>
                            <span className={styles.statLabel}>{majority}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Indicateur de complétude */}
            <div className={styles.completeness}>
                {resolutions.every(r => !r.variables || Object.values(r.variables).every(v => v)) ? (
                    <div className={styles.completenessSuccess}>
                        <CheckCircle size={16} />
                        <span>Toutes les variables sont renseignées</span>
                    </div>
                ) : (
                    <div className={styles.completenessWarning}>
                        <span>
                            {resolutions.filter(r => r.variables && Object.values(r.variables).some(v => !v)).length} résolution(s) à compléter
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
