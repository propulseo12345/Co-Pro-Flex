'use client';

import { Scale, Mail, UserCheck } from 'lucide-react';
import type { PresenceData } from '@/lib/utils/ag-session';
import syntheseStyles from './styles/synthese.module.css';

interface Coproprietaire {
    id: string;
    nom: string;
    tantiemes: number;
}

interface SyntheseTantièmesProps {
    coproprietaires: Coproprietaire[];
    presences: Record<string, boolean>;
    presencesEnrichies?: Record<string, PresenceData>;
    totalTantiemes?: number;
}

export function SyntheseTantiemes({
    coproprietaires,
    presences,
    presencesEnrichies,
    totalTantiemes
}: SyntheseTantièmesProps) {
    // Calcul du total des tantièmes de la copropriété
    const total = totalTantiemes || coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);

    // Calcul des tantièmes par mode de participation
    let tantièmesPresents = 0;
    let tantièmesCorrespondance = 0;
    let nombrePresents = 0;
    let nombreCorrespondance = 0;

    if (presencesEnrichies) {
        // Mode enrichi : distinguer présents et correspondance
        for (const copro of coproprietaires) {
            const presence = presencesEnrichies[copro.id];
            if (!presence) continue;

            if (presence.mode === 'present' || presence.mode === 'represente') {
                tantièmesPresents += copro.tantiemes;
                nombrePresents++;
            } else if (presence.mode === 'correspondance' && !presence.voteCorrespondanceNeutralise) {
                tantièmesCorrespondance += copro.tantiemes;
                nombreCorrespondance++;
            }
        }
    } else {
        // Mode simplifié (rétrocompatibilité)
        tantièmesPresents = coproprietaires
            .filter(c => presences[c.id])
            .reduce((sum, c) => sum + c.tantiemes, 0);
        nombrePresents = Object.values(presences).filter(p => p).length;
    }

    // Total des tantièmes participants (présents + correspondance)
    const tantièmesTotalParticipants = tantièmesPresents + tantièmesCorrespondance;

    // Calcul du pourcentage
    const pourcentage = total > 0 ? (tantièmesTotalParticipants / total) * 100 : 0;

    // Vérification des seuils atteints
    const seuilArt24Atteint = pourcentage >= 50;
    const seuilArt26Atteint = pourcentage >= 66.67;

    return (
        <div className={syntheseStyles.syntheseTantiemes}>
            <div className={syntheseStyles.syntheseHeader}>
                <Scale size={24} aria-hidden="true" />
                <h3>Synthèse des tantièmes</h3>
            </div>

            <div className={syntheseStyles.syntheseContent}>
                {/* Statistiques principales */}
                <div className={syntheseStyles.syntheseStats}>
                    <div className={syntheseStyles.syntheseStatMain}>
                        <span className={syntheseStyles.syntheseStatValue}>{tantièmesTotalParticipants.toLocaleString('fr-FR')}</span>
                        <span className={syntheseStyles.syntheseStatSeparator}>/</span>
                        <span className={syntheseStyles.syntheseStatTotal}>{total.toLocaleString('fr-FR')}</span>
                        <span className={syntheseStyles.syntheseStatLabel}>tantièmes</span>
                    </div>
                    <div className={syntheseStyles.syntheseStatSecondary}>
                        <span className={syntheseStyles.synthesePourcentage}>{pourcentage.toFixed(1)}%</span>
                        <div className={syntheseStyles.syntheseStatDetails}>
                            <span className={syntheseStyles.syntheseStatDetail}>
                                <UserCheck size={14} aria-hidden="true" />
                                {nombrePresents} présent{nombrePresents > 1 ? 's' : ''} ({tantièmesPresents.toLocaleString('fr-FR')} t.)
                            </span>
                            {nombreCorrespondance > 0 && (
                                <span className={syntheseStyles.syntheseStatDetail}>
                                    <Mail size={14} aria-hidden="true" />
                                    {nombreCorrespondance} correspondance ({tantièmesCorrespondance.toLocaleString('fr-FR')} t.)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Barre de progression avec seuils */}
                <div className={syntheseStyles.progressContainer}>
                    <div className={syntheseStyles.progressBar}>
                        <div
                            className={syntheseStyles.progressFill}
                            style={{ width: `${Math.min(pourcentage, 100)}%` }}
                        />
                        {/* Marqueurs de seuils */}
                        <div className={syntheseStyles.progressMarker} style={{ left: '50%' }} title="Article 24/25 - 50%">
                            <div className={syntheseStyles.progressMarkerLine} />
                            <span className={syntheseStyles.progressMarkerLabel}>50%</span>
                        </div>
                        <div className={syntheseStyles.progressMarker} style={{ left: '66.67%' }} title="Article 26 - 66,67%">
                            <div className={syntheseStyles.progressMarkerLine} />
                            <span className={syntheseStyles.progressMarkerLabel}>⅔</span>
                        </div>
                    </div>
                </div>

                {/* Indicateurs de seuils de majorité */}
                <div className={syntheseStyles.seuilsContainer}>
                    <div className={`${syntheseStyles.seuilItem} ${seuilArt24Atteint ? syntheseStyles.seuilAtteint : syntheseStyles.seuilNonAtteint}`}>
                        <div className={syntheseStyles.seuilHeader}>
                            <span className={syntheseStyles.seuilArticle}>Art. 24</span>
                            <span className={syntheseStyles.seuilStatus}>
                                {seuilArt24Atteint ? '✓' : '○'}
                            </span>
                        </div>
                        <span className={syntheseStyles.seuilDescription}>Majorité simple</span>
                        <span className={syntheseStyles.seuilValeur}>{Math.ceil(total / 2)} tantièmes</span>
                    </div>

                    <div className={`${syntheseStyles.seuilItem} ${seuilArt24Atteint ? syntheseStyles.seuilAtteint : syntheseStyles.seuilNonAtteint}`}>
                        <div className={syntheseStyles.seuilHeader}>
                            <span className={syntheseStyles.seuilArticle}>Art. 25</span>
                            <span className={syntheseStyles.seuilStatus}>
                                {seuilArt24Atteint ? '✓' : '○'}
                            </span>
                        </div>
                        <span className={syntheseStyles.seuilDescription}>Majorité absolue</span>
                        <span className={syntheseStyles.seuilValeur}>{Math.ceil(total / 2) + 1} tantièmes</span>
                    </div>

                    <div className={`${syntheseStyles.seuilItem} ${seuilArt26Atteint ? syntheseStyles.seuilAtteint : syntheseStyles.seuilNonAtteint}`}>
                        <div className={syntheseStyles.seuilHeader}>
                            <span className={syntheseStyles.seuilArticle}>Art. 26</span>
                            <span className={syntheseStyles.seuilStatus}>
                                {seuilArt26Atteint ? '✓' : '○'}
                            </span>
                        </div>
                        <span className={syntheseStyles.seuilDescription}>Double majorité</span>
                        <span className={syntheseStyles.seuilValeur}>{Math.ceil(total * 2 / 3)} tantièmes</span>
                    </div>
                </div>

                {/* Message de validation juridique */}
                {pourcentage < 50 && (
                    <div className={syntheseStyles.syntheseWarning}>
                        <span>⚠️ Quorum insuffisant pour les décisions à l&apos;article 25</span>
                    </div>
                )}
            </div>
        </div>
    );
}
