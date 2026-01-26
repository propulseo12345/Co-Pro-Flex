'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Save, FileText } from 'lucide-react';
import { VoteCorrespondance, VoteResolution, ChoixVote, Coproprietaire, Lot } from '@/types';
import styles from './votes-correspondance.module.css';

// Mock data
const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
    { id: 'cp1', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@email.com', telephone: '0601020304' },
    { id: 'cp2', nom: 'Martin', prenom: 'Marie', email: 'marie.martin@email.com', telephone: '0602030405' },
    { id: 'cp3', nom: 'Bernard', prenom: 'Pierre', email: 'pierre.bernard@email.com', telephone: '0603040506' },
    { id: 'cp4', nom: 'Dubois', prenom: 'Sophie', email: 'sophie.dubois@email.com', telephone: '0604050607' },
];

const MOCK_LOTS: Lot[] = [
    { id: 'lot1', numero: 'A101', type: 'APPARTEMENT', estPrincipal: true, coproprietaireId: 'cp1', tantiemesGeneraux: 100 },
    { id: 'lot2', numero: 'A102', type: 'APPARTEMENT', estPrincipal: true, coproprietaireId: 'cp2', tantiemesGeneraux: 120 },
    { id: 'lot3', numero: 'B201', type: 'APPARTEMENT', estPrincipal: true, coproprietaireId: 'cp3', tantiemesGeneraux: 150 },
    { id: 'lot4', numero: 'B202', type: 'APPARTEMENT', estPrincipal: true, coproprietaireId: 'cp4', tantiemesGeneraux: 130 },
];

interface Resolution {
    id: string;
    titre: string;
    texte: string;
}

export default function VotesCorrespondancePage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;
    const coproId = params.coproId as string;

    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [voteCorrespondance, setVoteCorrespondance] = useState<VoteCorrespondance | null>(null);
    const [savedMessage, setSavedMessage] = useState(false);

    const copro = MOCK_COPROPRIETAIRES.find(c => c.id === coproId);
    const lots = MOCK_LOTS.filter(l => l.coproprietaireId === coproId);
    const totalTantiemes = lots.reduce((sum, lot) => sum + lot.tantiemesGeneraux, 0);

    // Charger les résolutions de l'AG
    useEffect(() => {
        const savedResolutions = localStorage.getItem(`ag-resolutions-${agId}`);
        if (savedResolutions) {
            setResolutions(JSON.parse(savedResolutions));
        }
    }, [agId]);

    // Charger ou créer le vote par correspondance
    useEffect(() => {
        const saved = localStorage.getItem(`vote-correspondance-${agId}-${coproId}`);
        if (saved) {
            setVoteCorrespondance(JSON.parse(saved));
        } else {
            // Créer un nouveau vote par correspondance
            const nouveauVote: VoteCorrespondance = {
                id: 'vote-' + Date.now(),
                agId,
                coproprietaireId: coproId,
                votes: resolutions.map(res => ({
                    resolutionId: res.id,
                    choix: 'NON_VOTE' as ChoixVote,
                    dateVote: ''
                })),
                dateEnregistrement: new Date().toISOString(),
                statut: 'BROUILLON'
            };
            setVoteCorrespondance(nouveauVote);
        }
    }, [agId, coproId, resolutions]);

    // Mettre à jour les votes quand les résolutions changent
    useEffect(() => {
        if (voteCorrespondance && resolutions.length > 0) {
            const existingVoteIds = voteCorrespondance.votes.map(v => v.resolutionId);
            const newResolutions = resolutions.filter(r => !existingVoteIds.includes(r.id));

            if (newResolutions.length > 0) {
                setVoteCorrespondance({
                    ...voteCorrespondance,
                    votes: [
                        ...voteCorrespondance.votes,
                        ...newResolutions.map(res => ({
                            resolutionId: res.id,
                            choix: 'NON_VOTE' as ChoixVote,
                            dateVote: ''
                        }))
                    ]
                });
            }
        }
    }, [resolutions, voteCorrespondance]);

    const handleVoteChange = (resolutionId: string, choix: ChoixVote) => {
        if (!voteCorrespondance) return;

        setVoteCorrespondance({
            ...voteCorrespondance,
            votes: voteCorrespondance.votes.map(vote =>
                vote.resolutionId === resolutionId
                    ? { ...vote, choix, dateVote: new Date().toISOString() }
                    : vote
            ),
            dateModification: new Date().toISOString()
        });
    };

    const handleSave = () => {
        if (!voteCorrespondance) return;

        localStorage.setItem(`vote-correspondance-${agId}-${coproId}`, JSON.stringify(voteCorrespondance));
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
    };

    const handleValider = () => {
        if (!voteCorrespondance) return;

        // Vérifier que tous les votes sont renseignés
        const votesNonRenseignes = voteCorrespondance.votes.filter(v => v.choix === 'NON_VOTE').length;
        if (votesNonRenseignes > 0) {
            if (!confirm(`${votesNonRenseignes} vote(s) n'est/ne sont pas renseigné(s). Voulez-vous quand même valider ?`)) {
                return;
            }
        }

        const voteValide = {
            ...voteCorrespondance,
            statut: 'VALIDE' as const,
            dateModification: new Date().toISOString()
        };

        localStorage.setItem(`vote-correspondance-${agId}-${coproId}`, JSON.stringify(voteValide));
        setVoteCorrespondance(voteValide);
        alert('Vote par correspondance validé avec succès !');
        router.back();
    };

    const getVoteForResolution = (resolutionId: string): VoteResolution | undefined => {
        return voteCorrespondance?.votes.find(v => v.resolutionId === resolutionId);
    };

    const votesComplets = voteCorrespondance?.votes.filter(v => v.choix !== 'NON_VOTE').length || 0;
    const totalVotes = resolutions.length;
    const progression = totalVotes > 0 ? Math.round((votesComplets / totalVotes) * 100) : 0;

    if (!copro) {
        return (
            <div className="container">
                <p>Copropriétaire non trouvé</p>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour
                </button>
                <div>
                    <h1 className={styles.title}>Vote par correspondance</h1>
                    <p className={styles.subtitle}>
                        {copro.prenom} {copro.nom} - {totalTantiemes} tantièmes
                    </p>
                </div>
            </div>

            {/* Progression */}
            <div className={styles.progressCard}>
                <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Progression</span>
                    <span className={styles.progressValue}>{votesComplets} / {totalVotes} votes</span>
                </div>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progression}%` }} />
                </div>
                <div className={styles.progressPercentage}>{progression}%</div>
            </div>

            {/* Statut */}
            {voteCorrespondance?.statut === 'VALIDE' && (
                <div className={styles.valideBanner}>
                    <Check size={20} aria-hidden="true" />
                    <span>Ce vote par correspondance a été validé</span>
                </div>
            )}

            {savedMessage && (
                <div className={styles.savedBanner}>
                    <Check size={20} aria-hidden="true" />
                    <span>Modifications enregistrées</span>
                </div>
            )}

            {/* Liste des résolutions */}
            <div className={styles.resolutionsList}>
                {resolutions.map((resolution, index) => {
                    const vote = getVoteForResolution(resolution.id);
                    const isVoted = vote && vote.choix !== 'NON_VOTE';

                    return (
                        <div key={resolution.id} className={`${styles.resolutionCard} ${isVoted ? styles.resolutionVoted : ''}`}>
                            <div className={styles.resolutionHeader}>
                                <div className={styles.resolutionNumber}>
                                    Résolution #{index + 1}
                                    {isVoted && <Check size={16} className={styles.checkIcon} aria-hidden="true" />}
                                </div>
                            </div>

                            <h3 className={styles.resolutionTitle}>{resolution.titre}</h3>
                            <p className={styles.resolutionText}>{resolution.texte}</p>

                            <div className={styles.voteButtons}>
                                <button
                                    className={`${styles.voteButton} ${styles.votePour} ${vote?.choix === 'POUR' ? styles.voteButtonActive : ''}`}
                                    onClick={() => handleVoteChange(resolution.id, 'POUR')}
                                    disabled={voteCorrespondance?.statut === 'VALIDE'}
                                >
                                    <Check size={16} aria-hidden="true" />
                                    Pour
                                </button>
                                <button
                                    className={`${styles.voteButton} ${styles.voteContre} ${vote?.choix === 'CONTRE' ? styles.voteButtonActive : ''}`}
                                    onClick={() => handleVoteChange(resolution.id, 'CONTRE')}
                                    disabled={voteCorrespondance?.statut === 'VALIDE'}
                                >
                                    ✕
                                    Contre
                                </button>
                                <button
                                    className={`${styles.voteButton} ${styles.voteAbstention} ${vote?.choix === 'ABSTENTION' ? styles.voteButtonActive : ''}`}
                                    onClick={() => handleVoteChange(resolution.id, 'ABSTENTION')}
                                    disabled={voteCorrespondance?.statut === 'VALIDE'}
                                >
                                    −
                                    Abstention
                                </button>
                            </div>

                            {vote?.dateVote && (
                                <div className={styles.voteDate}>
                                    Vote enregistré le {new Date(vote.dateVote).toLocaleString('fr-FR')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            {voteCorrespondance?.statut !== 'VALIDE' && (
                <div className={styles.actions}>
                    <button onClick={handleSave} className="btn btn-secondary">
                        <Save size={16} aria-hidden="true" />
                        Sauvegarder le brouillon
                    </button>
                    <button onClick={handleValider} className="btn btn-primary">
                        <Check size={16} aria-hidden="true" />
                        Valider le vote
                    </button>
                </div>
            )}
        </div>
    );
}
