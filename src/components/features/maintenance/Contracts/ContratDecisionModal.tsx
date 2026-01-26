'use client';

import { useState, useId } from 'react';
import {
    X,
    RefreshCw,
    Archive,
    AlertTriangle,
    Calendar,
    Building2,
    FileText,
    CheckCircle,
    Clock
} from 'lucide-react';
import clsx from 'clsx';
import { ContratDetaille } from '@/types';
import { getNiveauEscalade, ACTIONS_CONTRAT_EXPIRE, type NiveauEscalade, type ActionContratSuggeree } from '@/lib/utils/alerts';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './ContratDecisionModal.module.css';

interface ContratDecisionModalProps {
    contrat: ContratDetaille;
    joursDepasses: number;
    onClose: () => void;
    onRenouveler: (contrat: ContratDetaille, nouvelleDateFin: string) => void;
    onResilier: (contrat: ContratDetaille, raison: string, archiver: boolean) => void;
}

// Raisons de résiliation prédéfinies
const RAISONS_RESILIATION = [
    { id: 'fin-besoin', label: 'Fin du besoin', description: 'La prestation n\'est plus nécessaire' },
    { id: 'changement-prestataire', label: 'Changement de prestataire', description: 'Un autre prestataire a été sélectionné' },
    { id: 'insatisfaction', label: 'Insatisfaction', description: 'Qualité de service insuffisante' },
    { id: 'cout', label: 'Raisons budgétaires', description: 'Coût trop élevé ou budget réduit' },
    { id: 'defaillance', label: 'Défaillance prestataire', description: 'Le prestataire ne peut plus assurer la prestation' },
    { id: 'autre', label: 'Autre raison', description: 'Raison personnalisée' }
];

export default function ContratDecisionModal({
    contrat,
    joursDepasses,
    onClose,
    onRenouveler,
    onResilier
}: ContratDecisionModalProps) {
    const [mode, setMode] = useState<'choix' | 'renouveler' | 'resilier'>('choix');
    const [nouvelleDateFin, setNouvelleDateFin] = useState('');
    const [raisonResiliation, setRaisonResiliation] = useState('');
    const [raisonPersonnalisee, setRaisonPersonnalisee] = useState('');
    const [archiver, setArchiver] = useState(true);

    const titleId = useId();
    const focusTrapRef = useFocusTrap<HTMLDivElement>({
        isActive: true,
        escapeDeactivates: true,
        onEscape: onClose
    });

    const niveau = getNiveauEscalade(joursDepasses);
    const actions = ACTIONS_CONTRAT_EXPIRE[niveau];

    // Calculer la date de fin suggérée (1 an à partir d'aujourd'hui)
    const getDateFinSuggested = () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
    };

    const handleRenouveler = () => {
        if (!nouvelleDateFin) {
            alert('Veuillez sélectionner une nouvelle date de fin');
            return;
        }
        onRenouveler(contrat, nouvelleDateFin);
    };

    const handleResilier = () => {
        const raison = raisonResiliation === 'autre' ? raisonPersonnalisee : raisonResiliation;
        if (!raison) {
            alert('Veuillez sélectionner ou saisir une raison');
            return;
        }
        onResilier(contrat, raison, archiver);
    };

    const getNiveauLabel = (n: NiveauEscalade): string => {
        switch (n) {
            case 'tres_critique': return 'Très critique';
            case 'critique': return 'Critique';
            case 'urgence': return 'Urgent';
            case 'relance': return 'Relance';
            default: return 'Standard';
        }
    };

    const getNiveauClassName = (n: NiveauEscalade): string => {
        switch (n) {
            case 'tres_critique': return styles.tresCritique;
            case 'critique': return styles.critique;
            case 'urgence': return styles.urgence;
            case 'relance': return styles.relance;
            default: return '';
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                ref={focusTrapRef}
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                {/* Header */}
                <div className={clsx(styles.header, getNiveauClassName(niveau))}>
                    <div className={styles.headerContent}>
                        <AlertTriangle size={24} aria-hidden="true" />
                        <div>
                            <h2 id={titleId} className={styles.title}>
                                Décision requise : Contrat expiré
                            </h2>
                            <p className={styles.subtitle}>
                                Niveau d&apos;alerte : <strong>{getNiveauLabel(niveau)}</strong> (J+{joursDepasses})
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                {/* Infos contrat */}
                <div className={styles.contratInfo}>
                    <div className={styles.contratHeader}>
                        <Building2 size={20} aria-hidden="true" />
                        <div>
                            <h3 className={styles.contratNom}>{contrat.nom}</h3>
                            <p className={styles.contratFournisseur}>{contrat.fournisseur}</p>
                        </div>
                    </div>
                    <div className={styles.contratMeta}>
                        <span><Calendar size={14} /> Expiré le {new Date(contrat.dateFin).toLocaleDateString('fr-FR')}</span>
                        <span><Clock size={14} /> Il y a {joursDepasses} jours</span>
                    </div>
                </div>

                {/* Contenu selon le mode */}
                {mode === 'choix' && (
                    <div className={styles.choixContainer}>
                        <p className={styles.choixIntro}>
                            Ce contrat est expiré depuis <strong>{joursDepasses} jours</strong>.
                            Quelle action souhaitez-vous effectuer ?
                        </p>

                        <div className={styles.actionsGrid}>
                            {/* Action Renouveler */}
                            <button
                                className={clsx(styles.actionCard, styles.actionRenouveler)}
                                onClick={() => {
                                    setNouvelleDateFin(getDateFinSuggested());
                                    setMode('renouveler');
                                }}
                            >
                                <div className={styles.actionIcon}>
                                    <RefreshCw size={28} />
                                </div>
                                <div className={styles.actionContent}>
                                    <h4>Renouveler le contrat</h4>
                                    <p>Prolonger le contrat avec le même prestataire pour une nouvelle période</p>
                                </div>
                            </button>

                            {/* Action Résilier */}
                            <button
                                className={clsx(styles.actionCard, styles.actionResilier)}
                                onClick={() => setMode('resilier')}
                            >
                                <div className={styles.actionIcon}>
                                    <Archive size={28} />
                                </div>
                                <div className={styles.actionContent}>
                                    <h4>Résilier et archiver</h4>
                                    <p>Mettre fin définitivement au contrat et l&apos;archiver avec raison documentée</p>
                                </div>
                            </button>
                        </div>

                        {/* Actions suggérées selon le niveau */}
                        {niveau !== 'standard' && (
                            <div className={styles.suggestionBox}>
                                <h4><AlertTriangle size={16} /> Actions recommandées :</h4>
                                <ul>
                                    {actions.map((action: ActionContratSuggeree) => (
                                        <li key={action.id}>
                                            <strong>{action.label}</strong> - {action.description}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'renouveler' && (
                    <div className={styles.formContainer}>
                        <button className={styles.backBtn} onClick={() => setMode('choix')}>
                            ← Retour au choix
                        </button>

                        <h3 className={styles.formTitle}>
                            <RefreshCw size={20} /> Renouvellement du contrat
                        </h3>

                        <div className={styles.formGroup}>
                            <label htmlFor="nouvelleDateFin">Nouvelle date de fin *</label>
                            <input
                                type="date"
                                id="nouvelleDateFin"
                                value={nouvelleDateFin}
                                onChange={e => setNouvelleDateFin(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={styles.input}
                            />
                            <p className={styles.hint}>
                                Date de fin suggérée : {new Date(getDateFinSuggested()).toLocaleDateString('fr-FR')} (1 an)
                            </p>
                        </div>

                        <div className={styles.summary}>
                            <h4>Résumé du renouvellement</h4>
                            <ul>
                                <li><FileText size={14} /> Contrat : {contrat.nom}</li>
                                <li><Building2 size={14} /> Prestataire : {contrat.fournisseur}</li>
                                <li><Calendar size={14} /> Nouvelle échéance : {nouvelleDateFin ? new Date(nouvelleDateFin).toLocaleDateString('fr-FR') : '-'}</li>
                            </ul>
                        </div>

                        <div className={styles.formActions}>
                            <button className="btn btn-secondary" onClick={() => setMode('choix')}>
                                Annuler
                            </button>
                            <button className="btn btn-primary" onClick={handleRenouveler}>
                                <CheckCircle size={16} /> Confirmer le renouvellement
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'resilier' && (
                    <div className={styles.formContainer}>
                        <button className={styles.backBtn} onClick={() => setMode('choix')}>
                            ← Retour au choix
                        </button>

                        <h3 className={styles.formTitle}>
                            <Archive size={20} /> Résiliation et archivage
                        </h3>

                        <div className={styles.formGroup}>
                            <label>Raison de la résiliation *</label>
                            <div className={styles.raisonsGrid}>
                                {RAISONS_RESILIATION.map(raison => (
                                    <label
                                        key={raison.id}
                                        className={clsx(
                                            styles.raisonOption,
                                            raisonResiliation === raison.id && styles.selected
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="raison"
                                            value={raison.id}
                                            checked={raisonResiliation === raison.id}
                                            onChange={e => setRaisonResiliation(e.target.value)}
                                        />
                                        <div>
                                            <strong>{raison.label}</strong>
                                            <span>{raison.description}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {raisonResiliation === 'autre' && (
                            <div className={styles.formGroup}>
                                <label htmlFor="raisonPersonnalisee">Précisez la raison *</label>
                                <textarea
                                    id="raisonPersonnalisee"
                                    value={raisonPersonnalisee}
                                    onChange={e => setRaisonPersonnalisee(e.target.value)}
                                    placeholder="Décrivez la raison de la résiliation..."
                                    className={styles.textarea}
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={archiver}
                                    onChange={e => setArchiver(e.target.checked)}
                                />
                                <span>Archiver le contrat (recommandé pour la traçabilité)</span>
                            </label>
                        </div>

                        <div className={styles.warningBox}>
                            <AlertTriangle size={16} />
                            <p>
                                Cette action est définitive. Le contrat sera marqué comme résilié
                                {archiver ? ' et archivé' : ''} avec la raison documentée.
                            </p>
                        </div>

                        <div className={styles.formActions}>
                            <button className="btn btn-secondary" onClick={() => setMode('choix')}>
                                Annuler
                            </button>
                            <button className="btn btn-danger" onClick={handleResilier}>
                                <Archive size={16} /> Confirmer la résiliation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
