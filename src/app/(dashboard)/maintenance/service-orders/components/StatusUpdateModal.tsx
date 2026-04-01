'use client';

import { useState, useMemo } from 'react';
import { OrdreService, StatutOrdreService } from '@/types';
import { getStatutLabel, formatDateTime } from '@/lib/utils/service-order';
import { simulateGedArchive } from '@/lib/utils/service-order';
import { X, AlertCircle, CheckCircle, Loader, Ban } from 'lucide-react';
import styles from './StatusUpdateModal.module.css';
import clsx from 'clsx';

interface StatusUpdateModalProps {
    ordreService: OrdreService;
    onClose: () => void;
    onStatusUpdate: (updatedOS: OrdreService) => void;
}

// Pipeline steps in order (canonical statuses shown in the pipeline)
const PIPELINE_STEPS = [
    'BROUILLON', 'A_ENVOYER', 'ENVOYE', 'EN_ATTENTE_PRESTATAIRE',
    'INTERVENTION_PROGRAMMEE', 'EN_COURS', 'INTERVENTION_REALISEE', 'CLOTURE'
] as const;

// Map alias statuses to their pipeline equivalent
const STATUS_TO_PIPELINE: Record<string, string> = {
    'ACCEPTE': 'EN_ATTENTE_PRESTATAIRE',
    'PLANIFIE': 'INTERVENTION_PROGRAMMEE',
    'REALISE': 'INTERVENTION_REALISEE',
    'FACTURE': 'INTERVENTION_REALISEE',
    'PAYE': 'CLOTURE',
    'ANNULE': 'CLOTURE',
    'REFUSE': 'ENVOYE',
};

const PIPELINE_LABELS: Record<string, string> = {
    'BROUILLON': 'Brouillon',
    'A_ENVOYER': 'À envoyer',
    'ENVOYE': 'Envoyé',
    'EN_ATTENTE_PRESTATAIRE': 'Accepté',
    'ACCEPTE': 'Accepté',
    'INTERVENTION_PROGRAMMEE': 'Programmé',
    'PLANIFIE': 'Programmé',
    'EN_COURS': 'En cours',
    'INTERVENTION_REALISEE': 'Réalisé',
    'REALISE': 'Réalisé',
    'FACTURE': 'Facturé',
    'PAYE': 'Payé',
    'CLOTURE': 'Clôturé',
    'ANNULE': 'Annulé',
    'REFUSE': 'Refusé',
};

// Valid transitions
const VALID_TRANSITIONS: Record<string, StatutOrdreService[]> = {
    'BROUILLON': ['A_ENVOYER'],
    'A_ENVOYER': ['ENVOYE', 'BROUILLON'],
    'ENVOYE': ['EN_ATTENTE_PRESTATAIRE', 'ACCEPTE', 'REFUSE'],
    'EN_ATTENTE_PRESTATAIRE': ['INTERVENTION_PROGRAMMEE', 'PLANIFIE'],
    'ACCEPTE': ['PLANIFIE', 'INTERVENTION_PROGRAMMEE'],
    'REFUSE': ['A_ENVOYER'],
    'PLANIFIE': ['EN_COURS'],
    'INTERVENTION_PROGRAMMEE': ['INTERVENTION_REALISEE', 'EN_COURS'],
    'EN_COURS': ['REALISE', 'INTERVENTION_REALISEE'],
    'REALISE': ['FACTURE', 'CLOTURE'],
    'INTERVENTION_REALISEE': ['CLOTURE', 'FACTURE'],
    'FACTURE': ['PAYE'],
    'PAYE': ['CLOTURE'],
    'CLOTURE': [],
    'ANNULE': []
};

// Checklist items per transition
const CHECKLIST_ITEMS: Record<string, string[]> = {
    'EN_ATTENTE_PRESTATAIRE': ['Confirmation du prestataire reçue', 'Devis conforme au budget'],
    'ACCEPTE': ['Confirmation du prestataire reçue', 'Devis conforme au budget'],
    'INTERVENTION_PROGRAMMEE': ['Date d\'intervention confirmée', 'Accès au site organisé'],
    'PLANIFIE': ['Date d\'intervention confirmée', 'Accès au site organisé'],
    'EN_COURS': ['Prestataire présent sur site'],
    'INTERVENTION_REALISEE': ['Travaux vérifiés', 'PV de réception signé'],
    'REALISE': ['Travaux vérifiés', 'PV de réception signé'],
    'FACTURE': ['Facture reçue et vérifiée'],
    'PAYE': ['Paiement effectué'],
    'CLOTURE': ['Tous les documents archivés'],
};

// Fields needed per status
function needsDateProgrammee(status: string): boolean {
    return ['INTERVENTION_PROGRAMMEE', 'PLANIFIE'].includes(status);
}
function needsDateRealisee(status: string): boolean {
    return ['INTERVENTION_REALISEE', 'REALISE'].includes(status);
}
function needsMontant(status: string): boolean {
    return ['INTERVENTION_REALISEE', 'REALISE'].includes(status);
}
function needsFacture(status: string): boolean {
    return status === 'FACTURE';
}
function needsPaiement(status: string): boolean {
    return status === 'PAYE';
}
function needsRefus(status: string): boolean {
    return status === 'REFUSE';
}

export default function StatusUpdateModal({
    ordreService,
    onClose,
    onStatusUpdate
}: StatusUpdateModalProps) {
    const currentStatus = ordreService.statut;
    const pipelineStatus = STATUS_TO_PIPELINE[currentStatus] || currentStatus;
    const currentIndex = PIPELINE_STEPS.indexOf(pipelineStatus as typeof PIPELINE_STEPS[number]);

    // Available next steps (excluding cancel)
    const availableNextSteps = useMemo(() => {
        return (VALID_TRANSITIONS[currentStatus] || []).filter(s => s !== 'ANNULE');
    }, [currentStatus]);

    // Default to first available
    const [selectedStatus, setSelectedStatus] = useState<StatutOrdreService | null>(
        availableNextSteps.length > 0 ? availableNextSteps[0] : null
    );

    // Checklist state
    const checklistItems = selectedStatus ? (CHECKLIST_ITEMS[selectedStatus] || []) : [];
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    // Form fields
    const [dateProgrammee, setDateProgrammee] = useState('');
    const [dateRealisee, setDateRealisee] = useState('');
    const [montantFinal, setMontantFinal] = useState('');
    const [numeroFacture, setNumeroFacture] = useState('');
    const [datePaiement, setDatePaiement] = useState('');
    const [raisonRefus, setRaisonRefus] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [noteCloture, setNoteCloture] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Map pipeline step to available transition
    const pipelineToTransition = useMemo(() => {
        const map: Record<string, string> = {};
        for (const step of PIPELINE_STEPS) {
            if ((availableNextSteps as string[]).includes(step)) {
                map[step] = step;
            }
            for (const next of availableNextSteps) {
                const mapped = STATUS_TO_PIPELINE[next] || next;
                if (mapped === step) {
                    map[step] = next;
                }
            }
        }
        return map;
    }, [availableNextSteps]);

    const handleStageClick = (step: string) => {
        const transition = pipelineToTransition[step];
        if (transition) {
            setSelectedStatus(transition as StatutOrdreService);
            setCheckedItems(new Set());
            setError('');
        }
    };

    const toggleCheck = (index: number) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const validate = (): boolean => {
        setError('');
        if (!selectedStatus) { setError('Sélectionnez une étape'); return false; }

        if (needsDateProgrammee(selectedStatus) && !dateProgrammee) {
            setError('La date d\'intervention programmée est obligatoire');
            return false;
        }
        if (needsDateRealisee(selectedStatus) && !dateRealisee) {
            setError('La date de réalisation est obligatoire');
            return false;
        }
        if (needsMontant(selectedStatus) && !montantFinal) {
            setError('Le montant final est obligatoire');
            return false;
        }
        if (needsFacture(selectedStatus) && !numeroFacture) {
            setError('Le numéro de facture est obligatoire');
            return false;
        }
        if (needsPaiement(selectedStatus) && !datePaiement) {
            setError('La date de paiement est obligatoire');
            return false;
        }
        if (needsRefus(selectedStatus) && !raisonRefus) {
            setError('La raison du refus est obligatoire');
            return false;
        }
        return true;
    };

    const handleConfirm = async () => {
        if (!validate() || !selectedStatus) return;
        setIsProcessing(true);

        try {
            const now = new Date().toISOString();
            const updatedOS: OrdreService = {
                ...ordreService,
                statut: selectedStatus,
                dateModification: now,
            };

            if (selectedStatus === 'ENVOYE') updatedOS.dateEnvoi = now;
            if (needsDateProgrammee(selectedStatus)) {
                updatedOS.dateInterventionProgrammee = new Date(dateProgrammee).toISOString();
            }
            if (needsDateRealisee(selectedStatus)) {
                updatedOS.dateInterventionRealisee = new Date(dateRealisee).toISOString();
                updatedOS.montantFinal = parseFloat(montantFinal);
            }
            if (selectedStatus === 'CLOTURE') {
                updatedOS.dateCloture = now;
                const gedId = await simulateGedArchive(updatedOS);
                updatedOS.archiveGedId = gedId;
                updatedOS.archiveGedUrl = `#ged/${gedId}`;
            }

            // Historique
            const entries = [];
            if (selectedStatus === 'REFUSE') {
                entries.push({ id: `h-${Date.now()}`, date: now, auteur: 'Prestataire', action: `Refusé: ${raisonRefus}` });
            }
            if (selectedStatus === 'FACTURE') {
                entries.push({ id: `h-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: `Facture: ${numeroFacture}` });
            }
            if (selectedStatus === 'PAYE') {
                entries.push({ id: `h-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: `Paiement le ${new Date(datePaiement).toLocaleDateString('fr-FR')}` });
            }
            if (commentaire.trim()) {
                entries.push({ id: `h-c-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: commentaire });
            }
            if (noteCloture.trim()) {
                entries.push({ id: `h-n-${Date.now()}`, date: now, auteur: 'Syndic Admin', action: `Note: ${noteCloture}` });
            }
            entries.push({
                id: `h-s-${Date.now()}`, date: now, auteur: 'Syndic Admin',
                action: 'Changement de statut',
                champModifie: 'statut',
                ancienneValeur: getStatutLabel(currentStatus),
                nouvelleValeur: getStatutLabel(selectedStatus),
            });

            updatedOS.historique = [...ordreService.historique, ...entries];

            onStatusUpdate(updatedOS);
            onClose();
        } catch {
            setError('Erreur lors de la mise à jour du statut');
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Annuler cet ordre de service ?')) return;
        setIsProcessing(true);
        try {
            const now = new Date().toISOString();
            const updatedOS: OrdreService = {
                ...ordreService,
                statut: 'ANNULE' as StatutOrdreService,
                dateModification: now,
                historique: [...ordreService.historique, {
                    id: `h-cancel-${Date.now()}`, date: now, auteur: 'Syndic Admin',
                    action: 'Ordre de service annulé', champModifie: 'statut',
                    ancienneValeur: getStatutLabel(currentStatus), nouvelleValeur: 'Annulé',
                }],
            };
            onStatusUpdate(updatedOS);
            onClose();
        } catch {
            setError('Erreur lors de l\'annulation');
            setIsProcessing(false);
        }
    };

    const selectedLabel = selectedStatus ? (PIPELINE_LABELS[selectedStatus] || selectedStatus) : '';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Progression de l&apos;ordre de service</h2>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Pipeline */}
                    <div className={styles.pipeline}>
                        {PIPELINE_STEPS.map((step, index) => {
                            const isDone = index < currentIndex;
                            const isCurrent = index === currentIndex;
                            const isClickable = !!pipelineToTransition[step];
                            const isSelected = selectedStatus === pipelineToTransition[step];

                            return (
                                <div key={step} style={{ display: 'contents' }}>
                                    {index > 0 && (
                                        <div className={clsx(styles.pipelineConnector, isDone && styles.connectorDone)} />
                                    )}
                                    <div
                                        className={clsx(
                                            styles.pipelineStage,
                                            isDone && styles.stageDone,
                                            isCurrent && styles.stageCurrent,
                                            isClickable && styles.stageClickable,
                                            isSelected && styles.stageSelected,
                                        )}
                                        onClick={() => isClickable && handleStageClick(step as string)}
                                    >
                                        {PIPELINE_LABELS[step] || getStatutLabel(step)}
                                        {isDone && <span className={styles.stageDoneIcon}>✓</span>}
                                        {isCurrent && <span className={styles.stageCurrentDot}>●</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action zone */}
                    {selectedStatus && (
                        <div className={styles.actionZone}>
                            {/* From → To */}
                            <div className={styles.actionHeader}>
                                <span className={clsx(styles.badge, styles.badgeBlue)}>
                                    {PIPELINE_LABELS[currentStatus] || getStatutLabel(currentStatus)}
                                </span>
                                <span className={styles.actionArrow}>→</span>
                                <span className={clsx(styles.badge, styles.badgeGreen)}>
                                    {selectedLabel}
                                </span>
                            </div>

                            <div className={styles.divider} />

                            {/* Checklist */}
                            {checklistItems.length > 0 && (
                                <>
                                    <div className={styles.label}>Checklist avant validation</div>
                                    <ul className={styles.checklist}>
                                        {checklistItems.map((item, i) => (
                                            <li key={i} className={styles.checklistItem}>
                                                <button
                                                    type="button"
                                                    className={clsx(styles.checkBox, checkedItems.has(i) && styles.checkBoxChecked)}
                                                    onClick={() => toggleCheck(i)}
                                                >
                                                    {checkedItems.has(i) ? '✓' : ''}
                                                </button>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className={styles.divider} />
                                </>
                            )}

                            {/* Contextual fields */}
                            {needsDateProgrammee(selectedStatus) && (
                                <div className={styles.fieldsRow}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Date d&apos;intervention *</label>
                                        <input
                                            type="datetime-local"
                                            className={styles.fieldInput}
                                            value={dateProgrammee}
                                            onChange={e => setDateProgrammee(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {needsDateRealisee(selectedStatus) && (
                                <div className={styles.fieldsRow}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Date de réalisation *</label>
                                        <input
                                            type="datetime-local"
                                            className={styles.fieldInput}
                                            value={dateRealisee}
                                            onChange={e => setDateRealisee(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Montant final (€) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={styles.fieldInput}
                                            placeholder="0.00"
                                            value={montantFinal}
                                            onChange={e => setMontantFinal(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {needsFacture(selectedStatus) && (
                                <div className={styles.fieldsRow}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Numéro de facture *</label>
                                        <input
                                            type="text"
                                            className={styles.fieldInput}
                                            placeholder="FAC-2026-001"
                                            value={numeroFacture}
                                            onChange={e => setNumeroFacture(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {needsPaiement(selectedStatus) && (
                                <div className={styles.fieldsRow}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Date de paiement *</label>
                                        <input
                                            type="date"
                                            className={styles.fieldInput}
                                            value={datePaiement}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setDatePaiement(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {needsRefus(selectedStatus) && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Raison du refus *</label>
                                    <textarea
                                        className={styles.fieldInput}
                                        rows={2}
                                        placeholder="Indiquez la raison..."
                                        value={raisonRefus}
                                        onChange={e => setRaisonRefus(e.target.value)}
                                        style={{ resize: 'vertical', minHeight: 56 }}
                                    />
                                </div>
                            )}

                            {selectedStatus === 'CLOTURE' && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Note de clôture</label>
                                    <textarea
                                        className={styles.fieldInput}
                                        rows={2}
                                        placeholder="Observations finales (optionnel)..."
                                        value={noteCloture}
                                        onChange={e => setNoteCloture(e.target.value)}
                                        style={{ resize: 'vertical', minHeight: 56 }}
                                    />
                                </div>
                            )}

                            {/* Comment */}
                            <div className={styles.commentBox}>
                                <div className={styles.label}>Note interne</div>
                                <textarea
                                    placeholder="Ajouter un commentaire visible dans l'historique..."
                                    value={commentaire}
                                    onChange={e => setCommentaire(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* No available transitions */}
                    {availableNextSteps.length === 0 && (
                        <div className={styles.actionZone} style={{ textAlign: 'center', padding: 32 }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                Cet ordre de service est {getStatutLabel(currentStatus).toLowerCase()} — aucune transition disponible.
                            </p>
                        </div>
                    )}

                    {/* Cancel shortcut */}
                    {currentStatus !== 'CLOTURE' && currentStatus !== 'ANNULE' && (
                        <div className={styles.cancelRow}>
                            <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={handleCancel}
                                disabled={isProcessing}
                            >
                                <Ban size={13} />
                                Annuler cet OS
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 20px', borderRadius: 8,
                            background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.08)',
                            color: 'var(--text-main)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            fontFamily: 'inherit', opacity: isProcessing ? 0.5 : 1,
                        }}
                    >
                        Fermer
                    </button>
                    {selectedStatus && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 20px', borderRadius: 8,
                                background: '#3b82f6', border: 'none',
                                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'inherit', opacity: isProcessing ? 0.5 : 1,
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader size={15} className={styles.spinner} />
                                    Traitement...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={15} />
                                    Valider → {selectedLabel}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
