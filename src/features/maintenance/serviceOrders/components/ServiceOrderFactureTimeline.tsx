'use client';

import { OrdreService } from '@/types';
import type { Facture } from '@/components/features/finance/Factures/types';
import { calculerEcart, STATUT_FACTURE_LABELS } from '../hooks/useServiceOrderDetailPage';
import { Receipt, AlertTriangle, TrendingUp, TrendingDown, FileCheck, Clock, FileText, Wrench, CreditCard } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './ServiceOrderFactureTimeline.module.css';

interface FactureSectionProps {
    ordreServiceId: string;
    currentData: OrdreService;
    facture: Facture | undefined;
}

export function ServiceOrderFactureSection({ currentData, facture }: FactureSectionProps) {
    return (
        <div className={styles.factureSection}>
            <div className={styles.factureCard}>
                <h2 className={styles.factureCardTitle}>
                    <Receipt size={18} aria-hidden="true" />
                    Facture liée
                </h2>

                {!facture ? (
                    <div className={styles.noFacture}>
                        <Receipt size={40} aria-hidden="true" />
                        <p>Aucune facture associée à cet ordre de service</p>
                    </div>
                ) : (
                    <FactureContent currentData={currentData} facture={facture} />
                )}
            </div>
        </div>
    );
}

function FactureContent({ currentData, facture }: { currentData: OrdreService; facture: Facture }) {
    const ecartInfo = calculerEcart(currentData.montantEstime, facture.montant);

    return (
        <div className={styles.factureContent}>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Référence</span>
                <Link href={`/finance/factures?id=${facture.id}`} className={styles.factureLink}>
                    <FileCheck size={16} />
                    {facture.reference}
                </Link>
            </div>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Fournisseur</span>
                <span className={styles.factureValue}>{facture.fournisseur}</span>
            </div>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Date facture</span>
                <span className={styles.factureValue}>
                    {new Date(facture.date).toLocaleDateString('fr-FR')}
                </span>
            </div>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Montant facturé</span>
                <span className={styles.factureMontant}>
                    {facture.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
            </div>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Écart vs estimé</span>
                {ecartInfo ? (
                    <span className={clsx(
                        styles.factureEcart,
                        ecartInfo.ecart > 0 ? styles.factureEcartPositif : styles.factureEcartNegatif,
                        ecartInfo.estAlerte && styles.factureEcartAlerte
                    )}>
                        {ecartInfo.estAlerte && <AlertTriangle size={14} />}
                        {ecartInfo.ecart > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {ecartInfo.ecart > 0 ? '+' : ''}{ecartInfo.ecart.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        {' '}({ecartInfo.pourcentage > 0 ? '+' : ''}{ecartInfo.pourcentage.toFixed(0)}%)
                    </span>
                ) : (
                    <span className={styles.factureValue}>-</span>
                )}
            </div>
            <div className={styles.factureItem}>
                <span className={styles.factureLabel}>Statut facture</span>
                <span className={clsx(
                    styles.factureStatut,
                    facture.statut === 'PAYEE' && styles.factureStatutPayee,
                    facture.statut === 'A_PAYER' && styles.factureStatutAPayer,
                    (facture.statut === 'BROUILLON' || facture.statut === 'A_VALIDER' || facture.statut === 'VALIDEE') && styles.factureStatutEnCours
                )}>
                    {STATUT_FACTURE_LABELS[facture.statut]}
                </span>
            </div>
            {facture.datePaiement && (
                <div className={styles.factureItem}>
                    <span className={styles.factureLabel}>Date de paiement</span>
                    <span className={styles.factureValue}>
                        {new Date(facture.datePaiement).toLocaleDateString('fr-FR')}
                    </span>
                </div>
            )}
        </div>
    );
}

interface TimelineProps {
    currentData: OrdreService;
    facture: Facture | undefined;
}

export function ServiceOrderTimeline({ currentData, facture }: TimelineProps) {
    const hasFacture = !!facture;
    const isPaid = facture?.statut === 'PAYEE';
    const isInterventionCompleted = ['INTERVENTION_REALISEE', 'CLOTURE'].includes(currentData.statut);
    const isFactureReceived = hasFacture;
    const isPaiementEffectue = isPaid;

    const getCurrentStep = () => {
        if (!isInterventionCompleted) return 'intervention';
        if (!isFactureReceived) return 'facture';
        if (!isPaiementEffectue) return 'paiement';
        return 'done';
    };
    const currentStep = getCurrentStep();

    return (
        <div className={styles.timelineSection}>
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                    <Clock size={18} aria-hidden="true" />
                    Parcours complet
                </h2>
                <div className={styles.timeline}>
                    <div className={clsx(styles.timelineStep, styles.timelineStepCompleted)}>
                        <div className={styles.timelineIcon}><FileText size={18} /></div>
                        <span className={styles.timelineLabel}>Ordre créé</span>
                        <span className={styles.timelineDate}>
                            {new Date(currentData.dateCreation).toLocaleDateString('fr-FR')}
                        </span>
                    </div>

                    <div className={clsx(
                        styles.timelineStep,
                        isInterventionCompleted ? styles.timelineStepCompleted :
                        currentStep === 'intervention' ? styles.timelineStepCurrent : styles.timelineStepPending
                    )}>
                        <div className={styles.timelineIcon}><Wrench size={18} /></div>
                        <span className={styles.timelineLabel}>Intervention</span>
                        <span className={styles.timelineDate}>
                            {currentData.dateInterventionRealisee
                                ? new Date(currentData.dateInterventionRealisee).toLocaleDateString('fr-FR')
                                : currentStep === 'intervention' ? 'En cours' : 'À venir'}
                        </span>
                    </div>

                    <div className={clsx(
                        styles.timelineStep,
                        isFactureReceived && isInterventionCompleted ? styles.timelineStepCompleted :
                        currentStep === 'facture' ? styles.timelineStepCurrent : styles.timelineStepPending
                    )}>
                        <div className={styles.timelineIcon}><Receipt size={18} /></div>
                        <span className={styles.timelineLabel}>Facture reçue</span>
                        <span className={styles.timelineDate}>
                            {facture
                                ? new Date(facture.date).toLocaleDateString('fr-FR')
                                : currentStep === 'facture' ? 'En attente' : 'À venir'}
                        </span>
                    </div>

                    <div className={clsx(
                        styles.timelineStep,
                        isPaiementEffectue ? styles.timelineStepCompleted :
                        currentStep === 'paiement' ? styles.timelineStepCurrent : styles.timelineStepPending
                    )}>
                        <div className={styles.timelineIcon}><CreditCard size={18} /></div>
                        <span className={styles.timelineLabel}>Paiement</span>
                        <span className={styles.timelineDate}>
                            {facture?.datePaiement
                                ? new Date(facture.datePaiement).toLocaleDateString('fr-FR')
                                : currentStep === 'paiement' ? 'En attente' : 'À venir'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
