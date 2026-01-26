'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, UserCheck, Users, FileDown, Save, Eye, EyeOff, Vote } from 'lucide-react';
import SignatureCanvas from '@/ui/SignatureCanvas';
import { FeuillePresence, SignaturePresence, Coproprietaire, Lot, StatutPresence } from '@/types';
import styles from './feuille-presence.module.css';

// Mock data - en production, charger depuis l'API
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

export default function FeuillePresencePage() {
    const router = useRouter();
    const params = useParams();
    const agId = params.id as string;

    const [feuillePresence, setFeuillePresence] = useState<FeuillePresence | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [currentSignature, setCurrentSignature] = useState<SignaturePresence | null>(null);
    const [showSignatures, setShowSignatures] = useState(false);

    // Charger ou créer la feuille de présence
    useEffect(() => {
        const saved = localStorage.getItem(`feuille-presence-${agId}`);
        if (saved) {
            setFeuillePresence(JSON.parse(saved));
        } else {
            // Créer une nouvelle feuille de présence
            const nouvelleFeuille: FeuillePresence = {
                id: 'fp-' + Date.now(),
                agId,
                dateCreation: new Date().toISOString(),
                statut: 'BROUILLON',
                signatures: MOCK_COPROPRIETAIRES.map(cp => ({
                    id: 'sig-' + cp.id,
                    coproprietaireId: cp.id,
                    statut: 'ABSENT' as StatutPresence,
                }))
            };
            setFeuillePresence(nouvelleFeuille);
        }
    }, [agId]);

    // Sauvegarder automatiquement
    useEffect(() => {
        if (feuillePresence) {
            localStorage.setItem(`feuille-presence-${agId}`, JSON.stringify(feuillePresence));
        }
    }, [feuillePresence, agId]);

    const getCoproprietaireInfo = (cpId: string) => {
        return MOCK_COPROPRIETAIRES.find(cp => cp.id === cpId);
    };

    const getLotsForCoproprietaire = (cpId: string) => {
        return MOCK_LOTS.filter(lot => lot.coproprietaireId === cpId);
    };

    const getTotalTantiemes = (cpId: string) => {
        return getLotsForCoproprietaire(cpId).reduce((sum, lot) => sum + lot.tantiemesGeneraux, 0);
    };

    const handleStatutChange = (signatureId: string, newStatut: StatutPresence) => {
        if (!feuillePresence) return;

        setFeuillePresence({
            ...feuillePresence,
            signatures: feuillePresence.signatures.map(sig =>
                sig.id === signatureId ? { ...sig, statut: newStatut, representant: newStatut === 'REPRESENTE' ? sig.representant : undefined } : sig
            )
        });
    };

    const handleRepresentantChange = (signatureId: string, representant: string) => {
        if (!feuillePresence) return;

        setFeuillePresence({
            ...feuillePresence,
            signatures: feuillePresence.signatures.map(sig =>
                sig.id === signatureId ? { ...sig, representant } : sig
            )
        });
    };

    const handleOpenSignature = (signature: SignaturePresence) => {
        setCurrentSignature(signature);
        setShowSignatureModal(true);
    };

    const handleSaveSignature = (signatureData: string) => {
        if (!feuillePresence || !currentSignature) return;

        setFeuillePresence({
            ...feuillePresence,
            signatures: feuillePresence.signatures.map(sig =>
                sig.id === currentSignature.id ? {
                    ...sig,
                    signatureData,
                    dateSignature: new Date().toISOString()
                } : sig
            )
        });

        setShowSignatureModal(false);
        setCurrentSignature(null);
    };

    const handleOuvrirFeuille = () => {
        if (!feuillePresence) return;
        setFeuillePresence({
            ...feuillePresence,
            statut: 'OUVERTE',
            dateOuverture: new Date().toISOString()
        });
    };

    const handleCloturerFeuille = () => {
        if (!feuillePresence) return;
        if (!confirm('Êtes-vous sûr de vouloir clôturer la feuille de présence ? Cette action est irréversible.')) return;

        setFeuillePresence({
            ...feuillePresence,
            statut: 'CLOTUREE',
            dateCloture: new Date().toISOString()
        });
    };

    const handleExportPDF = () => {
        alert('Export PDF en cours de développement. Cette fonctionnalité utilisera jsPDF pour générer le PDF.');
        // TODO: Implémenter l'export PDF avec jsPDF
    };

    if (!feuillePresence) {
        return <div className="container">Chargement...</div>;
    }

    const totalTantiemes = MOCK_LOTS.reduce((sum, lot) => sum + lot.tantiemesGeneraux, 0);
    const presentsCount = feuillePresence.signatures.filter(s => s.statut === 'PRESENT').length;
    const representesCount = feuillePresence.signatures.filter(s => s.statut === 'REPRESENTE').length;
    const tantMemesPresents = feuillePresence.signatures
        .filter(s => s.statut === 'PRESENT' || s.statut === 'REPRESENTE')
        .reduce((sum, sig) => sum + getTotalTantiemes(sig.coproprietaireId), 0);
    const tauxParticipation = ((tantMemesPresents / totalTantiemes) * 100).toFixed(2);

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour
                </button>
                <div>
                    <h1 className={styles.title}>Feuille de présence</h1>
                    <p className={styles.subtitle}>
                        Assemblée Générale - {feuillePresence.statut === 'BROUILLON' ? 'Brouillon' : feuillePresence.statut === 'OUVERTE' ? 'Ouverte' : 'Clôturée'}
                    </p>
                </div>
            </div>

            {/* Statistiques */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <UserCheck size={24} aria-hidden="true" />
                    <div>
                        <div className={styles.statValue}>{presentsCount + representesCount}</div>
                        <div className={styles.statLabel}>Présents/Représentés</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <Users size={24} aria-hidden="true" />
                    <div>
                        <div className={styles.statValue}>{tantMemesPresents} / {totalTantiemes}</div>
                        <div className={styles.statLabel}>Tantièmes</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{tauxParticipation}%</div>
                    <div className={styles.statLabel}>Taux de participation</div>
                </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                {feuillePresence.statut === 'BROUILLON' && (
                    <button onClick={handleOuvrirFeuille} className="btn btn-primary">
                        Ouvrir la feuille de présence
                    </button>
                )}
                {feuillePresence.statut === 'OUVERTE' && (
                    <button onClick={handleCloturerFeuille} className="btn btn-warning">
                        Clôturer la feuille
                    </button>
                )}
                <button onClick={handleExportPDF} className="btn btn-secondary">
                    <FileDown size={16} />
                    Exporter en PDF
                </button>
                <button
                    onClick={() => setShowSignatures(!showSignatures)}
                    className="btn btn-secondary"
                >
                    {showSignatures ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    {showSignatures ? 'Masquer' : 'Afficher'} les signatures
                </button>
            </div>

            {/* Liste des copropriétaires */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Copropriétaire</th>
                            <th>Lot(s)</th>
                            <th>Tantièmes</th>
                            <th>Statut</th>
                            <th>Représentant</th>
                            <th>Signature</th>
                            <th>Votes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feuillePresence.signatures.map((signature) => {
                            const copro = getCoproprietaireInfo(signature.coproprietaireId);
                            const lots = getLotsForCoproprietaire(signature.coproprietaireId);
                            const tantiemes = getTotalTantiemes(signature.coproprietaireId);

                            if (!copro) return null;

                            return (
                                <tr key={signature.id} className={signature.statut !== 'ABSENT' ? styles.rowPresent : ''}>
                                    <td>
                                        <div className={styles.coproName}>
                                            {copro.prenom} {copro.nom}
                                        </div>
                                        <div className={styles.coproEmail}>{copro.email}</div>
                                    </td>
                                    <td>
                                        {lots.map(lot => lot.numero).join(', ')}
                                    </td>
                                    <td className={styles.tantiemes}>{tantiemes}</td>
                                    <td>
                                        <select
                                            value={signature.statut}
                                            onChange={(e) => handleStatutChange(signature.id, e.target.value as StatutPresence)}
                                            className={styles.statutSelect}
                                            disabled={feuillePresence.statut === 'CLOTUREE'}
                                        >
                                            <option value="ABSENT">Absent</option>
                                            <option value="PRESENT">Présent</option>
                                            <option value="REPRESENTE">Représenté</option>
                                        </select>
                                    </td>
                                    <td>
                                        {signature.statut === 'REPRESENTE' && (
                                            <input type="text" placeholder="Nom du représentant" value={signature.representant || ''} onChange={(e) => handleRepresentantChange(signature.id, e.target.value)}
                                                className={styles.representantInput}
                                                disabled={feuillePresence.statut === 'CLOTUREE'}
                                            />
                                        )}
                                    </td>
                                    <td>
                                        {signature.statut !== 'ABSENT' && (
                                            <div className={styles.signatureCell}>
                                                {signature.signatureData && showSignatures ? (
                                                    <img
                                                        src={signature.signatureData}
                                                        alt="Signature"
                                                        className={styles.signaturePreview}
                                                    />
                                                ) : null}
                                                <button
                                                    onClick={() => handleOpenSignature(signature)}
                                                    className="btn btn-sm btn-secondary"
                                                    disabled={feuillePresence.statut === 'CLOTUREE'}
                                                >
                                                    {signature.signatureData ? 'Modifier' : 'Signer'}
                                                </button>
                                                {signature.dateSignature && (
                                                    <div className={styles.signatureDate}>
                                                        {new Date(signature.dateSignature).toLocaleString('fr-FR')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => router.push(`/ag/${agId}/votes-correspondance/${signature.coproprietaireId}`)}
                                            className="btn btn-sm btn-primary"
                                        >
                                            <Vote size={16} aria-hidden="true" />
                                            Saisie des votes
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de signature */}
            {showSignatureModal && currentSignature && (
                <div className={styles.modalOverlay} aria-hidden="true" onClick={() => setShowSignatureModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
                        <h2 className={styles.modalTitle}>
                            Signature de {getCoproprietaireInfo(currentSignature.coproprietaireId)?.prenom} {getCoproprietaireInfo(currentSignature.coproprietaireId)?.nom}
                        </h2>
                        <SignatureCanvas
                            onSave={handleSaveSignature}
                            onCancel={() => {
                                setShowSignatureModal(false);
                                setCurrentSignature(null);
                            }}
                            initialSignature={currentSignature.signatureData}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
