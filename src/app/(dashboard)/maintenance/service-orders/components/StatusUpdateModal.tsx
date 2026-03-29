'use client';

import { useState, useMemo } from 'react';
import { OrdreService, StatutOrdreService } from '@/types';
import { getStatutLabel, formatDateTime } from '@/lib/utils/service-order';
import { simulateGedArchive } from '@/lib/utils/service-order';
import { X, AlertCircle, CheckCircle, Loader, Clock, Calendar, Receipt, CreditCard } from 'lucide-react';
import {
    ORDRE_SERVICE_WORKFLOW_STEPS,
    ORDRE_SERVICE_STATUT_DESCRIPTIONS
} from '@/types/enums/statuts';
import styles from './StatusUpdateModal.module.css';
import clsx from 'clsx';

interface StatusUpdateModalProps {
    ordreService: OrdreService;
    onClose: () => void;
    onStatusUpdate: (updatedOS: OrdreService) => void;
}

// Délais minimum entre les étapes (en heures)
const DELAIS_MINIMUM: Record<string, number> = {
    'BROUILLON_TO_ENVOYE': 0, // Peut être envoyé immédiatement
    'ENVOYE_TO_EN_ATTENTE_PRESTATAIRE': 1, // Au moins 1h après envoi (temps de réception)
    'EN_ATTENTE_PRESTATAIRE_TO_INTERVENTION_PROGRAMMEE': 4, // Au moins 4h pour programmer
    'INTERVENTION_PROGRAMMEE_TO_INTERVENTION_REALISEE': 0, // L'intervention peut être le même jour si programmée
    'INTERVENTION_REALISEE_TO_CLOTURE': 0, // Peut clôturer immédiatement après réalisation
};

// Fonction utilitaire pour calculer la différence en heures entre deux dates
function getHoursDifference(date1: Date, date2: Date): number {
    return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
}

// Fonction pour formater une date pour input datetime-local
function formatDateForInput(isoString: string | undefined): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
}

export default function StatusUpdateModal({
    ordreService,
    onClose,
    onStatusUpdate
}: StatusUpdateModalProps) {
    const [newStatus, setNewStatus] = useState<StatutOrdreService>(ordreService.statut);
    const [dateInterventionProgrammee, setDateInterventionProgrammee] = useState('');
    const [dateInterventionRealisee, setDateInterventionRealisee] = useState('');
    const [montantFinal, setMontantFinal] = useState('');
    const [noteCloture, setNoteCloture] = useState('');
    const [numeroFacture, setNumeroFacture] = useState('');
    const [datePaiement, setDatePaiement] = useState('');
    const [raisonRefus, setRaisonRefus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Définir les transitions de statut valides (workflow strict + annulation)
    const validTransitions: Record<StatutOrdreService, StatutOrdreService[]> = {
        'BROUILLON': ['A_ENVOYER', 'ANNULE'],
        'A_ENVOYER': ['ENVOYE', 'BROUILLON', 'ANNULE'],
        'ENVOYE': ['ACCEPTE', 'REFUSE', 'EN_ATTENTE_PRESTATAIRE', 'ANNULE'],
        'EN_ATTENTE_PRESTATAIRE': ['INTERVENTION_PROGRAMMEE', 'PLANIFIE', 'ANNULE'],
        'ACCEPTE': ['PLANIFIE', 'ANNULE'],
        'REFUSE': ['A_ENVOYER', 'ANNULE'],
        'PLANIFIE': ['EN_COURS', 'ANNULE'],
        'INTERVENTION_PROGRAMMEE': ['INTERVENTION_REALISEE', 'EN_COURS', 'ANNULE'],
        'EN_COURS': ['REALISE', 'ANNULE'],
        'REALISE': ['FACTURE', 'CLOTURE'],
        'INTERVENTION_REALISEE': ['CLOTURE', 'FACTURE'],
        'FACTURE': ['PAYE'],
        'PAYE': ['CLOTURE'],
        'CLOTURE': [],
        'ANNULE': []
    };

    const availableStatuses = validTransitions[ordreService.statut] || [];

    const canTransitionTo = (status: StatutOrdreService): boolean => {
        return availableStatuses.includes(status);
    };

    // Calcul des dates de référence pour les validations
    const datesWorkflow = useMemo(() => {
        return {
            creation: new Date(ordreService.dateCreation),
            envoi: ordreService.dateEnvoi ? new Date(ordreService.dateEnvoi) : null,
            programmee: ordreService.dateInterventionProgrammee ? new Date(ordreService.dateInterventionProgrammee) : null,
            realisee: ordreService.dateInterventionRealisee ? new Date(ordreService.dateInterventionRealisee) : null,
            cloture: ordreService.dateCloture ? new Date(ordreService.dateCloture) : null,
        };
    }, [ordreService]);

    // Calcul de la date minimum pour l'intervention programmée
    const minDateInterventionProgrammee = useMemo(() => {
        // L'intervention doit être programmée après la date d'envoi ou de création
        const referenceDate = datesWorkflow.envoi || datesWorkflow.creation;
        const minDate = new Date(referenceDate);
        minDate.setHours(minDate.getHours() + DELAIS_MINIMUM['EN_ATTENTE_PRESTATAIRE_TO_INTERVENTION_PROGRAMMEE']);
        return formatDateForInput(minDate.toISOString());
    }, [datesWorkflow]);

    // Calcul de la date minimum pour l'intervention réalisée
    const minDateInterventionRealisee = useMemo(() => {
        // L'intervention réalisée doit être après la date programmée
        if (datesWorkflow.programmee) {
            return formatDateForInput(datesWorkflow.programmee.toISOString());
        }
        // Si pas encore programmée mais on saisit la date réalisée
        if (dateInterventionProgrammee) {
            return dateInterventionProgrammee;
        }
        return formatDateForInput(new Date().toISOString());
    }, [datesWorkflow, dateInterventionProgrammee]);

    const validate = (): boolean => {
        setError('');

        if (newStatus === ordreService.statut) {
            setError('Veuillez sélectionner un nouveau statut');
            return false;
        }

        if (!canTransitionTo(newStatus)) {
            setError('Cette transition de statut n\'est pas autorisée');
            return false;
        }

        // Validation pour PLANIFIE ou INTERVENTION_PROGRAMMEE
        if (newStatus === 'INTERVENTION_PROGRAMMEE' || newStatus === 'PLANIFIE') {
            if (!dateInterventionProgrammee) {
                setError('La date d\'intervention programmée est obligatoire');
                return false;
            }

            const dateProgrammee = new Date(dateInterventionProgrammee);
            const dateReference = datesWorkflow.envoi || datesWorkflow.creation;
            const delaiMinimum = DELAIS_MINIMUM['EN_ATTENTE_PRESTATAIRE_TO_INTERVENTION_PROGRAMMEE'];

            // Vérifier que la date programmée est postérieure à la date d'envoi/création
            if (dateProgrammee <= dateReference) {
                setError(`La date d'intervention programmée doit être postérieure à la date d'envoi (${formatDateTime(dateReference.toISOString())})`);
                return false;
            }

            // Vérifier le délai minimum
            const heuresDifference = getHoursDifference(dateReference, dateProgrammee);
            if (heuresDifference < delaiMinimum) {
                setError(`Un délai minimum de ${delaiMinimum}h est requis entre l'envoi et la programmation de l'intervention`);
                return false;
            }
        }

        // Validation pour REALISE ou INTERVENTION_REALISEE
        if (newStatus === 'INTERVENTION_REALISEE' || newStatus === 'REALISE') {
            if (!dateInterventionRealisee) {
                setError('La date d\'intervention réalisée est obligatoire');
                return false;
            }
            if (!montantFinal) {
                setError('Le montant final est obligatoire');
                return false;
            }

            const dateRealisee = new Date(dateInterventionRealisee);
            const dateProgrammee = datesWorkflow.programmee;

            // Vérifier que la date réalisée est postérieure ou égale à la date programmée
            if (dateProgrammee && dateRealisee < dateProgrammee) {
                setError(`La date de réalisation (${formatDateTime(dateRealisee.toISOString())}) ne peut pas être antérieure à la date programmée (${formatDateTime(dateProgrammee.toISOString())})`);
                return false;
            }

            // Vérifier que la date réalisée n'est pas dans le futur (avec une tolérance de 1h)
            const now = new Date();
            now.setHours(now.getHours() + 1); // Tolérance de 1h
            if (dateRealisee > now) {
                setError('La date de réalisation ne peut pas être dans le futur');
                return false;
            }
        }

        // Validation pour FACTURE
        if (newStatus === 'FACTURE') {
            if (!numeroFacture) {
                setError('Le numéro de facture est obligatoire');
                return false;
            }
        }

        // Validation pour PAYE
        if (newStatus === 'PAYE') {
            if (!datePaiement) {
                setError('La date de paiement est obligatoire');
                return false;
            }
        }

        // Validation pour REFUSE
        if (newStatus === 'REFUSE') {
            if (!raisonRefus) {
                setError('La raison du refus est obligatoire');
                return false;
            }
        }

        return true;
    };

    const handleConfirm = async () => {
        if (!validate()) {
            return;
        }

        setIsProcessing(true);

        try {
            const now = new Date().toISOString();
            const updatedOS: OrdreService = {
                ...ordreService,
                statut: newStatus,
                dateModification: now
            };

            // Mettre à jour les dates selon le statut
            if (newStatus === 'ENVOYE') {
                updatedOS.dateEnvoi = now;
            }

            if (newStatus === 'ACCEPTE') {
                updatedOS.historique.push({
                    id: `h-accepte-${Date.now()}`,
                    date: now,
                    auteur: 'Prestataire',
                    action: 'Intervention acceptée par le prestataire'
                });
            }

            if (newStatus === 'REFUSE') {
                updatedOS.historique.push({
                    id: `h-refuse-${Date.now()}`,
                    date: now,
                    auteur: 'Prestataire',
                    action: `Intervention refusée: ${raisonRefus}`
                });
            }

            if (newStatus === 'INTERVENTION_PROGRAMMEE' || newStatus === 'PLANIFIE') {
                updatedOS.dateInterventionProgrammee = new Date(dateInterventionProgrammee).toISOString();
            }

            if (newStatus === 'EN_COURS') {
                updatedOS.historique.push({
                    id: `h-encours-${Date.now()}`,
                    date: now,
                    auteur: 'Système',
                    action: 'Intervention démarrée'
                });
            }

            if (newStatus === 'INTERVENTION_REALISEE' || newStatus === 'REALISE') {
                updatedOS.dateInterventionRealisee = new Date(dateInterventionRealisee).toISOString();
                updatedOS.montantFinal = parseFloat(montantFinal);
            }

            if (newStatus === 'FACTURE') {
                updatedOS.historique.push({
                    id: `h-facture-${Date.now()}`,
                    date: now,
                    auteur: 'Syndic Admin',
                    action: `Facture reçue: ${numeroFacture}`
                });
            }

            if (newStatus === 'PAYE') {
                updatedOS.historique.push({
                    id: `h-paye-${Date.now()}`,
                    date: now,
                    auteur: 'Syndic Admin',
                    action: `Paiement effectué le ${new Date(datePaiement).toLocaleDateString('fr-FR')}`
                });
            }

            if (newStatus === 'CLOTURE') {
                updatedOS.dateCloture = now;

                // Archivage automatique
                const gedId = await simulateGedArchive(updatedOS);
                updatedOS.archiveGedId = gedId;
                updatedOS.archiveGedUrl = `#ged/${gedId}`;

                // Ajouter entrée historique pour l'archivage
                updatedOS.historique.push({
                    id: `h-archive-${Date.now()}`,
                    date: now,
                    auteur: 'Système',
                    action: 'Archivage automatique dans la GED',
                    champModifie: 'archiveGedId',
                    nouvelleValeur: gedId
                });

                alert(`✓ Ordre de service archivé dans la GED (${gedId})`);
            }

            // Ajouter entrée historique pour le changement de statut
            updatedOS.historique.push({
                id: `h-status-${Date.now()}`,
                date: now,
                auteur: 'Syndic Admin',
                action: `Changement de statut`,
                champModifie: 'statut',
                ancienneValeur: getStatutLabel(ordreService.statut),
                nouvelleValeur: getStatutLabel(newStatus)
            });

            // Si note de clôture fournie
            if (newStatus === 'CLOTURE' && noteCloture) {
                updatedOS.historique.push({
                    id: `h-note-${Date.now()}`,
                    date: now,
                    auteur: 'Syndic Admin',
                    action: `Note de clôture : ${noteCloture}`
                });
            }

            onStatusUpdate(updatedOS);
            onClose();
        } catch (err) {
            setError('Erreur lors de la mise à jour du statut');
            setIsProcessing(false);
        }
    };

    return (
        <div className={styles.overlay} aria-hidden="true" onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Changer le statut</h2>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Current Status */}
                    <div className={styles.currentStatus}>
                        <span className={styles.label}>Statut actuel :</span>
                        <span className={styles.statusBadge}>
                            {getStatutLabel(ordreService.statut)}
                        </span>
                    </div>

                    {/* Status Workflow Info - Timeline complète */}
                    <div className={styles.workflowInfo}>
                        <div className={styles.workflowTitle}>
                            <Clock size={16} aria-hidden="true" />
                            <span>Progression du workflow</span>
                        </div>
                        <div className={styles.workflowTimeline}>
                            {ORDRE_SERVICE_WORKFLOW_STEPS.map((step, index) => {
                                const currentIndex = ORDRE_SERVICE_WORKFLOW_STEPS.indexOf(ordreService.statut);
                                const isCompleted = index < currentIndex;
                                const isActive = step === ordreService.statut;
                                const isPending = index > currentIndex;

                                return (
                                    <div
                                        key={step}
                                        className={clsx(
                                            styles.timelineStep,
                                            isCompleted && styles.stepCompleted,
                                            isActive && styles.stepActive,
                                            isPending && styles.stepPending
                                        )}
                                    >
                                        <div className={styles.timelineMarker} />
                                        <div className={styles.timelineContent}>
                                            <span className={styles.timelineLabel}>
                                                {getStatutLabel(step)}
                                            </span>
                                            {isCompleted && (
                                                <span className={styles.timelineDate}>Terminé</span>
                                            )}
                                            {isActive && (
                                                <span className={styles.timelineDate}>En cours</span>
                                            )}
                                            {isPending && (
                                                <span className={styles.timelinePending}>En attente</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* New Status Selection */}
                    <div className={styles.formGroup}>
                        <label htmlFor="newStatus" className={styles.label}>
                            Nouveau statut *
                        </label>
                        <select
                            id="newStatus"
                            className="input"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as StatutOrdreService)}
                        >
                            <option value={ordreService.statut}>
                                {getStatutLabel(ordreService.statut)} (actuel)
                            </option>
                            {availableStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {getStatutLabel(status)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description du statut sélectionné */}
                    {newStatus !== ordreService.statut && ORDRE_SERVICE_STATUT_DESCRIPTIONS[newStatus] && (
                        <p className={styles.statusDescription}>
                            {ORDRE_SERVICE_STATUT_DESCRIPTIONS[newStatus]}
                        </p>
                    )}

                    {/* Champs conditionnels selon le nouveau statut */}

                    {/* REFUSE - Raison du refus */}
                    {newStatus === 'REFUSE' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="raisonRefus" className={styles.label}>
                                Raison du refus *
                            </label>
                            <textarea
                                id="raisonRefus"
                                className="input"
                                rows={3}
                                placeholder="Indiquez la raison du refus par le prestataire..."
                                value={raisonRefus}
                                onChange={(e) => setRaisonRefus(e.target.value)}
                            />
                        </div>
                    )}

                    {/* PLANIFIE / INTERVENTION_PROGRAMMEE - Date d'intervention */}
                    {(newStatus === 'INTERVENTION_PROGRAMMEE' || newStatus === 'PLANIFIE') && (
                        <div className={styles.formGroup}>
                            <label htmlFor="dateIntervention" className={styles.label}>
                                Date d'intervention programmée *
                            </label>
                            <input
                                id="dateIntervention"
                                type="datetime-local"
                                className="input"
                                value={dateInterventionProgrammee}
                                min={minDateInterventionProgrammee}
                                onChange={(e) => setDateInterventionProgrammee(e.target.value)}
                            />
                            <div className={styles.dateHint}>
                                <Calendar size={14} aria-hidden="true" />
                                <span>
                                    Doit être postérieure à l'envoi de l'ordre de service
                                    {datesWorkflow.envoi && ` (${formatDateTime(datesWorkflow.envoi.toISOString())})`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* REALISE / INTERVENTION_REALISEE - Date + Montant final */}
                    {(newStatus === 'INTERVENTION_REALISEE' || newStatus === 'REALISE') && (
                        <>
                            <div className={styles.formGroup}>
                                <label htmlFor="dateRealisee" className={styles.label}>
                                    Date d'intervention réalisée *
                                </label>
                                <input
                                    id="dateRealisee"
                                    type="datetime-local"
                                    className="input"
                                    value={dateInterventionRealisee}
                                    min={minDateInterventionRealisee}
                                    max={formatDateForInput(new Date().toISOString())}
                                    onChange={(e) => setDateInterventionRealisee(e.target.value)}
                                />
                                <div className={styles.dateHint}>
                                    <Calendar size={14} aria-hidden="true" />
                                    <span>
                                        Doit être postérieure ou égale à la date programmée
                                        {datesWorkflow.programmee && ` (${formatDateTime(datesWorkflow.programmee.toISOString())})`}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="montantFinal" className={styles.label}>
                                    Montant final (€) *
                                </label>
                                <input
                                    id="montantFinal"
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    placeholder="0.00"
                                    value={montantFinal}
                                    onChange={(e) => setMontantFinal(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* FACTURE - Numéro de facture */}
                    {newStatus === 'FACTURE' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="numeroFacture" className={styles.label}>
                                Numéro de facture *
                            </label>
                            <div className={styles.inputWithIcon}>
                                <Receipt size={16} aria-hidden="true" />
                                <input
                                    id="numeroFacture"
                                    type="text"
                                    className="input"
                                    placeholder="Ex: FAC-2024-001"
                                    value={numeroFacture}
                                    onChange={(e) => setNumeroFacture(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* PAYE - Date de paiement */}
                    {newStatus === 'PAYE' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="datePaiement" className={styles.label}>
                                Date de paiement *
                            </label>
                            <div className={styles.inputWithIcon}>
                                <CreditCard size={16} aria-hidden="true" />
                                <input
                                    id="datePaiement"
                                    type="date"
                                    className="input"
                                    value={datePaiement}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDatePaiement(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* CLOTURE - Note de clôture */}
                    {newStatus === 'CLOTURE' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="noteCloture" className={styles.label}>
                                Note de clôture
                            </label>
                            <textarea
                                id="noteCloture"
                                className="input"
                                rows={3}
                                placeholder="Observations finales (optionnel)..."
                                value={noteCloture}
                                onChange={(e) => setNoteCloture(e.target.value)}
                            />
                            <div className={styles.archiveNote}>
                                <AlertCircle size={16} aria-hidden="true" />
                                <span>L'ordre de service sera automatiquement archivé dans la GED</span>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={16} aria-hidden="true" />
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
                            padding: '8px 16px', borderRadius: 8,
                            background: '#131620', border: '1px solid rgba(148,163,184,0.08)',
                            color: '#e2e8f0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            fontFamily: 'inherit', opacity: isProcessing ? 0.5 : 1,
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8,
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
                                <CheckCircle size={15} aria-hidden="true" />
                                Confirmer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
