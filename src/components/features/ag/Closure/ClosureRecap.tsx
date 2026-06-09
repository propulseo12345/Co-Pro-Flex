'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Lock } from 'lucide-react';
import { createUntypedClient } from '@/lib/ag/api/utils';
import { ClosureVariableInline } from './ClosureVariableInline';
import clsx from 'clsx';
import styles from './ClosureRecap.module.css';

// --- Types ---

interface MissingVariable {
    resolution_id: string;
    resolution_title: string;
    action_type: string;
    variable: string;
}

interface ValidationResult {
    valid: boolean;
    missing: MissingVariable[];
}

interface AdoptedResolution {
    id: string;
    title: string;
    action_type: string | null;
    variables: Record<string, string> | null;
    resolution_number: number;
}

interface ClosureRecapProps {
    agId: string;
    onClose: () => void;
}

// --- Human-readable labels ---

const VARIABLE_LABELS: Record<string, string> = {
    montant: 'Montant',
    date_debut: 'Date de debut',
    date_fin: 'Date de fin',
    pourcentage: 'Pourcentage',
    modalites_paiement: 'Modalites de paiement',
    modalites_paiement_budget: 'Modalites de paiement du budget',
    nom_syndic: 'Nom du syndic',
    description_travaux: 'Description des travaux',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
    APPROVE_ACCOUNTS: 'Comptes',
    CREATE_BUDGET: 'Budget',
    SCHEDULE_BUDGET_PAYMENTS: 'Echeancier budget',
    CREATE_ALUR_FUND: 'Fonds ALUR',
    SCHEDULE_ALUR_PAYMENTS: 'Echeancier ALUR',
    CREATE_WORK_BUDGET: 'Travaux',
    CREATE_EXCEPTIONAL_CALL: 'Appel exceptionnel',
    APPOINT_SYNDIC: 'Syndic',
    ELECT_COUNCIL: 'Conseil syndical',
    MANAGE_CONTRACT: 'Contrat',
    DESIGNATE_BUREAU: 'Bureau',
    GRANT_QUITUS: 'Quitus',
};

// --- Component ---

export function ClosureRecap({ agId, onClose }: ClosureRecapProps) {
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [resolutions, setResolutions] = useState<AdoptedResolution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createUntypedClient();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Load adopted resolutions with action_type
            // Note: action_type column added by migration, not yet in generated types
            const { data: resData, error: resError } = await supabase
                .from('ag_resolutions')
                .select('id, title, action_type, variables, resolution_number' as '*')
                .eq('ag_id', agId)
                .eq('is_approved', true)
                .not('action_type' as 'id', 'is', null)
                .order('resolution_number');

            if (resError) throw resError;
            setResolutions((resData as unknown as AdoptedResolution[]) || []);

            // Validate variables (RPC added by migration, not yet in generated types)
            const { data: valData, error: valError } = await (supabase.rpc as CallableFunction)(
                'validate_ag_variables', { p_ag_id: agId }
            );

            if (valError) throw valError;
            setValidation(valData as unknown as ValidationResult);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de chargement';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [agId, supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateVariable = useCallback(async (resolutionId: string, varName: string, value: string) => {
        // Get current variables for this resolution
        const resolution = resolutions.find(r => r.id === resolutionId);
        const currentVars = resolution?.variables || {};
        const updatedVars = { ...currentVars, [varName]: value };

        const { error: updateError } = await supabase
            .from('ag_resolutions')
            .update({ variables: updatedVars })
            .eq('id', resolutionId);

        if (updateError) throw updateError;

        // Re-validate after update
        await loadData();
    }, [resolutions, supabase, loadData]);

    const handleClose = useCallback(async () => {
        setIsClosing(true);
        try {
            // 1) close_ag : fige + APPROUVE les votes (calculate_resolution_result) et passe l'AG en 'closed'.
            //    close_ag derive copro_id et applique la garde gestionnaire en interne.
            const { data: closeResult, error: closeError } = await (supabase.rpc as CallableFunction)(
                'close_ag', { p_ag_id: agId, p_closing_notes: null }
            );

            if (closeError) throw closeError;

            const closeData = closeResult as Record<string, unknown> | null;
            if (closeData && closeData.success === false) {
                setError((closeData.message as string) || 'Erreur lors de la cloture');
                setIsClosing(false);
                return;
            }

            // 2) prepare_ag_decisions APRES close_ag : ne materialise que les resolutions desormais 'approved'.
            //    Ordre imperatif (inverser => 0 decision materialisee, echec silencieux).
            const { data: prepResult, error: prepError } = await (supabase.rpc as CallableFunction)(
                'prepare_ag_decisions', { p_ag_id: agId }
            );

            if (prepError) throw prepError;

            const prepData = prepResult as Record<string, unknown> | null;
            if (prepData && prepData.success === false) {
                setError((prepData.error as string) || 'Erreur lors de la preparation des decisions');
                setIsClosing(false);
                return;
            }

            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur lors de la cloture';
            setError(message);
            setIsClosing(false);
        }
    }, [agId, supabase, onClose]);

    // Group missing vars by resolution
    const missingByResolution = (validation?.missing || []).reduce<Record<string, MissingVariable[]>>((acc, item) => {
        if (!acc[item.resolution_id]) acc[item.resolution_id] = [];
        acc[item.resolution_id].push(item);
        return acc;
    }, {});

    const allValid = validation?.valid === true;

    // --- Render ---

    if (isLoading) {
        return <div className={styles.loading}>Chargement du recapitulatif...</div>;
    }

    if (error) {
        return (
            <div className={styles.error}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
            </div>
        );
    }

    if (resolutions.length === 0) {
        return (
            <div className={styles.emptyState}>
                Aucune resolution adoptee avec action automatique.
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Recapitulatif des decisions</h2>
                <p className={styles.subtitle}>
                    {resolutions.length} resolution{resolutions.length > 1 ? 's' : ''} adoptee{resolutions.length > 1 ? 's' : ''} avec action automatique
                </p>
            </div>

            {/* Summary banner */}
            <div className={clsx(styles.summaryBanner, allValid ? styles.summaryValid : styles.summaryInvalid)}>
                {allValid ? (
                    <>
                        <CheckCircle size={18} aria-hidden="true" />
                        <span>Toutes les variables sont renseignees. Vous pouvez cloturer l&apos;AG.</span>
                    </>
                ) : (
                    <>
                        <AlertTriangle size={18} aria-hidden="true" />
                        <span>
                            {validation?.missing.length} variable{(validation?.missing.length || 0) > 1 ? 's' : ''} manquante{(validation?.missing.length || 0) > 1 ? 's' : ''}.
                            Completez-les avant de cloturer.
                        </span>
                    </>
                )}
            </div>

            {/* Resolution list */}
            <div className={styles.resolutionList}>
                {resolutions.map((resolution) => {
                    const missing = missingByResolution[resolution.id];
                    const isComplete = !missing || missing.length === 0;

                    return (
                        <div key={resolution.id} className={styles.resolutionCard}>
                            <div className={styles.resolutionHeader}>
                                <span className={clsx(styles.statusIcon, isComplete ? styles.statusComplete : styles.statusMissing)}>
                                    {isComplete
                                        ? <CheckCircle size={20} aria-hidden="true" />
                                        : <AlertTriangle size={20} aria-hidden="true" />
                                    }
                                </span>
                                <span className={styles.resolutionTitle}>{resolution.title}</span>
                                {resolution.action_type && (
                                    <span className={styles.actionBadge}>
                                        {ACTION_TYPE_LABELS[resolution.action_type] || resolution.action_type}
                                    </span>
                                )}
                            </div>

                            {missing && missing.length > 0 && (
                                <div className={styles.missingVars}>
                                    {missing.map((m) => (
                                        <ClosureVariableInline
                                            key={`${m.resolution_id}-${m.variable}`}
                                            variableName={m.variable}
                                            variableLabel={VARIABLE_LABELS[m.variable] || m.variable}
                                            onSave={(value) => handleUpdateVariable(m.resolution_id, m.variable, value)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <button
                    className={styles.closeButton}
                    disabled={!allValid || isClosing}
                    onClick={handleClose}
                    type="button"
                >
                    <Lock size={16} aria-hidden="true" />
                    {isClosing ? 'Cloture en cours...' : 'Cloturer l\'AG'}
                </button>
            </div>
        </div>
    );
}
