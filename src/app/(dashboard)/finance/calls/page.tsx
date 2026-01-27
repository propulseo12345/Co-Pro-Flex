'use client';

import { useState } from 'react';
import { CheckCircle, Info, RotateCcw, Zap, X, Settings, FileText, Clock, AlertTriangle } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { useCalls, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';
import styles from './calls.module.css';

// Helper to get status display info
function getStatusDisplay(status: string, linesPaidCount: number, linesCount: number) {
    switch (status) {
        case 'paid':
            return { icon: <CheckCircle size={16} className={styles.successIcon} aria-hidden="true" />, label: `Soldé (${linesPaidCount}/${linesCount})` };
        case 'partially_paid':
            return { icon: <Clock size={16} className={styles.warningIcon} aria-hidden="true" />, label: `Partiellement payé (${linesPaidCount}/${linesCount})` };
        case 'issued':
            return { icon: <CheckCircle size={16} className={styles.successIcon} aria-hidden="true" />, label: `Envoyé (${linesCount})` };
        case 'draft':
            return { icon: <AlertTriangle size={16} className={styles.warningIcon} aria-hidden="true" />, label: 'Brouillon' };
        case 'cancelled':
            return { icon: <X size={16} className={styles.errorIcon} aria-hidden="true" />, label: 'Annulé' };
        default:
            return { icon: null, label: status };
    }
}

export default function FundCallsPage() {
    const { currentCoproId, isManager } = useCopro();
    const { data: calls, isLoading, error, refresh } = useCalls();
    const { data: openPeriod } = useOpenPeriod();

    const [showAutomationModal, setShowAutomationModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);

    const handleEnableAutomation = () => {
        setIsAutomationEnabled(true);
        alert('Génération automatique des appels de fonds activée !');
    };

    const handleDisableAutomation = () => {
        setIsAutomationEnabled(false);
        alert('Génération automatique des appels de fonds désactivée !');
    };

    const handleCancelLastCall = () => {
        setShowCancelModal(true);
    };

    const confirmCancelLastCall = () => {
        alert('Dernier appel de fonds annulé avec succès !');
        setShowCancelModal(false);
    };

    // Mode Single Copro: le contexte charge automatiquement la copro active
    // Si pas encore chargé ou pas de copro, afficher loading
    if (!currentCoproId || isLoading) {
        return <LoadingState message="Chargement des appels de fonds..." />;
    }

    // Handle error state
    if (error) {
        return <ErrorState message={error} onRetry={refresh} />;
    }

    const callsList = calls || [];

    // Derive period info from data or open period
    const periodName = openPeriod?.name || new Date().getFullYear().toString();
    const periodStart = openPeriod?.start_date;
    const periodEnd = openPeriod?.end_date;

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Appels de fonds de l'exercice {periodName}</h1>
                    {periodStart && periodEnd && (
                        <p className={styles.subtitle}>
                            Exercice du {new Date(periodStart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} au {new Date(periodEnd).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </div>
                {isManager && (
                    <button
                        className="btn btn-primary"
                        onClick={isAutomationEnabled ? handleDisableAutomation : handleEnableAutomation}
                    >
                        <CheckCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                        {isAutomationEnabled ? 'Désactiver la génération' : 'Autoriser la génération'}
                    </button>
                )}
            </div>

            {isManager && (
                <div className={styles.automationCard}>
                    <div className={styles.automationIcon}><Zap size={24} aria-hidden="true" /></div>
                    <div className={styles.automationContent}>
                        <h3>Gagnez du temps et gardez l'esprit léger</h3>
                        <p>CoProFlex génère et envoie automatiquement vos appels de fonds en temps et en heure !</p>
                        <div className={styles.automationLinks}>
                            <button
                                className={styles.linkBtn}
                                onClick={() => setShowAutomationModal(true)}
                            >
                                Découvrir l'automatisation des appels de fonds
                            </button>
                            <span className={styles.separator}>|</span>
                            <button
                                className={styles.linkBtn}
                                onClick={() => setShowRulesModal(true)}
                            >
                                Modifier les règles d'automatisation
                            </button>
                            <span className={styles.separator}>|</span>
                            <button
                                className={styles.linkBtn}
                                onClick={() => setShowPaymentInfoModal(true)}
                            >
                                Modifier les informations de paiement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {callsList.length === 0 ? (
                <EmptyState
                    title="Aucun appel de fonds"
                    message="Aucun appel de fonds n'a été créé pour cette copropriété."
                />
            ) : (
                <div className="card">
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Date d'exigibilité</th>
                                <th>Libellé</th>
                                <th>Statut</th>
                                <th className="text-right">Montant total</th>
                                <th className="text-right">Encaissé</th>
                                <th className="text-right">Reste à percevoir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {callsList.map((call) => {
                                const statusInfo = getStatusDisplay(call.status, call.lines_paid_count, call.lines_count);
                                return (
                                    <tr key={call.id}>
                                        <td>
                                            <div className={styles.dateCell}>
                                                {new Date(call.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                <Info size={14} className={styles.infoIcon} aria-hidden="true" />
                                            </div>
                                        </td>
                                        <td>{call.label}</td>
                                        <td>
                                            <div className={styles.statusCell}>
                                                {statusInfo.icon}
                                                <span>{statusInfo.label}</span>
                                            </div>
                                        </td>
                                        <td className={styles.amount}>
                                            {Number(call.total_amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td className={styles.amount}>
                                            {Number(call.total_paid).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td className={styles.amount}>
                                            {Number(call.total_unpaid).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isManager && callsList.length > 0 && (
                <div className={styles.footerActions}>
                    <button
                        className="btn btn-secondary"
                        onClick={handleCancelLastCall}
                    >
                        <RotateCcw size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                        Annuler la génération du dernier appel de fonds
                    </button>
                </div>
            )}

            {/* Modal - Découvrir l'automatisation */}
            {showAutomationModal && (
                <div className={styles.modalOverlay} aria-hidden="true" onClick={() => setShowAutomationModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className={styles.modalHeader}>
                            <h2><Zap size={20} aria-hidden="true" /> Automatisation des appels de fonds</h2>
                            <button onClick={() => setShowAutomationModal(false)} className={styles.closeBtn}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <h3>Comment ça marche ?</h3>
                            <p>L'automatisation des appels de fonds vous permet de :</p>
                            <ul>
                                <li>Générer automatiquement les appels de fonds selon le calendrier défini</li>
                                <li>Envoyer les appels de fonds par email aux copropriétaires</li>
                                <li>Suivre les paiements en temps réel</li>
                                <li>Relancer automatiquement les impayés</li>
                            </ul>
                            <h3>Avantages</h3>
                            <p>Gain de temps considérable<br/>
                            Réduction des erreurs<br/>
                            Meilleure traçabilité<br/>
                            Copropriétaires informés en temps réel</p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowAutomationModal(false)}>
                                Fermer
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                setShowAutomationModal(false);
                                handleEnableAutomation();
                            }}>
                                Activer maintenant
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Modifier les règles */}
            {showRulesModal && (
                <div className={styles.modalOverlay} aria-hidden="true" onClick={() => setShowRulesModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className={styles.modalHeader}>
                            <h2><Settings size={20} aria-hidden="true" /> Règles d'automatisation</h2>
                            <button onClick={() => setShowRulesModal(false)} className={styles.closeBtn}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Fréquence de génération</label>
                                <select defaultValue="trimestriel" aria-label="Trier par">
                                    <option value="mensuel">Mensuel</option>
                                    <option value="trimestriel">Trimestriel</option>
                                    <option value="semestriel">Semestriel</option>
                                    <option value="annuel">Annuel</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Jour d'envoi</label>
                                <select defaultValue="1" aria-label="Sélectionner une option">
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Date d'exigibilité (jours après envoi)</label>
                                <input type="number" defaultValue="30" min="1" max="90" aria-label="Entrer un nombre"/>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowRulesModal(false)}>
                                Annuler
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                alert('Règles mises à jour avec succès !');
                                setShowRulesModal(false);
                            }}>
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Informations de paiement */}
            {showPaymentInfoModal && (
                <div className={styles.modalOverlay} aria-hidden="true" onClick={() => setShowPaymentInfoModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className={styles.modalHeader}>
                            <h2><FileText size={20} aria-hidden="true" /> Informations de paiement</h2>
                            <button onClick={() => setShowPaymentInfoModal(false)} className={styles.closeBtn}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>IBAN de la copropriété</label>
                                <input type="text" placeholder="FR76 1234 5678 9012 3456 7890 123" aria-label="FR76 1234 5678 9012 3456 7890 123"/>
                            </div>
                            <div className={styles.formGroup}>
                                <label>BIC</label>
                                <input type="text" placeholder="BNPAFRPPXXX" aria-label="BNPAFRPPXXX"/>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Titulaire du compte</label>
                                <input type="text" placeholder="Syndicat des copropriétaires" aria-label="Syndicat des copropriétaires"/>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Banque</label>
                                <input type="text" placeholder="BNP Paribas" aria-label="BNP Paribas"/>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowPaymentInfoModal(false)}>
                                Annuler
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                alert('Informations de paiement mises à jour avec succès !');
                                setShowPaymentInfoModal(false);
                            }}>
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Confirmation annulation */}
            {showCancelModal && (
                <div className={styles.modalOverlay} aria-hidden="true" onClick={() => setShowCancelModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className={styles.modalHeader}>
                            <h2>Confirmer l'annulation</h2>
                            <button onClick={() => setShowCancelModal(false)} className={styles.closeBtn}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Êtes-vous sûr de vouloir annuler le dernier appel de fonds généré ?</p>
                            <p><strong>Cette action est irréversible.</strong></p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                                Non, garder
                            </button>
                            <button className="btn btn-danger" onClick={confirmCancelLastCall}>
                                Oui, annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
