'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Calendar, DollarSign, FileText, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { ModeEcheancier, Echeance } from '@/types';
import { genererResolutionBudget, validerBudgetPourResolution, BudgetData, ResolutionBudget } from '@/lib/utils/budget';
import { useCopro } from '@/providers/CoproContext';
import { useBudgetMutations } from '@/hooks/modules/useBudgetMutations';
import { getAccountingPeriod } from '@/lib/budget/api';
import styles from './validation.module.css';

export default function BudgetValidationPage() {
    const router = useRouter();
    const { currentCoproId } = useCopro();
    const [step, setStep] = useState<'config' | 'preview' | 'success'>('config');
    const [budget, setBudget] = useState<BudgetData>({
        id: '',
        annee: new Date().getFullYear() + 1,
        montantTotal: 0,
        dateDebut: '',
        dateFin: ''
    });
    const [modeEcheancier, setModeEcheancier] = useState<ModeEcheancier>('TRIMESTRIEL');
    const [cleRepartition, setCleRepartition] = useState('CHARGES_GENERALES');
    const [resolutionGeneree, setResolutionGeneree] = useState<ResolutionBudget | null>(null);
    const [createdBudgetId, setCreatedBudgetId] = useState<string | null>(null);

    // Supabase mutation hook
    const { createBudget, updateBudgetStatus, isSaving, error: mutationError } = useBudgetMutations({
        onError: (err) => console.error('[BudgetValidation] Mutation error:', err),
    });

    const clesRepartition = [
        { value: 'CHARGES_GENERALES', label: 'Charges générales' },
        { value: 'ASCENSEUR', label: 'Ascenseur' },
        { value: 'CHAUFFAGE', label: 'Chauffage' },
        { value: 'EAU', label: 'Eau' },
        { value: 'ELECTRICITE', label: 'Électricité' },
        { value: 'TRAVAUX', label: 'Travaux' },
        { value: 'AUTRE', label: 'Autre' }
    ];

    const handlePreview = () => {
        const validation = validerBudgetPourResolution(budget);
        if (!validation.valide) {
            alert('Erreurs de validation :\n' + validation.erreurs.join('\n'));
            return;
        }

        const resolution = genererResolutionBudget(
            budget,
            modeEcheancier,
            cleRepartition
        );
        setResolutionGeneree(resolution);
        setStep('preview');
    };

    const handleValider = async () => {
        if (!resolutionGeneree || !currentCoproId) return;

        try {
            // 1. Get accounting period for the year
            const period = await getAccountingPeriod(currentCoproId, budget.annee);
            if (!period) {
                alert(`Aucun exercice comptable trouvé pour l'année ${budget.annee}. Veuillez d'abord créer un exercice.`);
                return;
            }

            // 2. Create budget in Supabase
            const budgetId = await createBudget({
                period_id: period.id,
                budget_type: 'current',
                name: `Budget prévisionnel ${budget.annee}`,
                notes: `Échéancier: ${modeEcheancier}, Clé: ${cleRepartition}`,
            });

            if (!budgetId) {
                alert('Erreur lors de la création du budget. Veuillez réessayer.');
                return;
            }

            setCreatedBudgetId(budgetId);
            // Note: La résolution sera créée lors de la liaison avec une AG
            // Pour l'instant, on informe l'utilisateur qu'il doit aller lier le budget à une AG
            setStep('success');
        } catch (err) {
            console.error('[BudgetValidation] Error:', err);
            alert('Une erreur est survenue lors de la validation du budget.');
        }
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <h1 className={styles.title}>Validation du budget prévisionnel</h1>
                <p className={styles.subtitle}>
                    Créez et validez votre budget pour générer automatiquement la résolution d'approbation et l'échéancier d'appels de fonds
                </p>
            </div>

            {/* Erreur si pas de copropriété */}
            {!currentCoproId && (
                <div className={styles.content}>
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} aria-hidden="true" />
                        <h2>Aucune copropriété sélectionnée</h2>
                        <p>Veuillez sélectionner une copropriété pour créer un budget.</p>
                    </div>
                </div>
            )}

            {/* Erreur mutation */}
            {mutationError && (
                <div className={styles.content}>
                    <div className="card" style={{ background: 'var(--color-error-light)', padding: '1rem', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--color-error)', margin: 0 }}>
                            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} aria-hidden="true" />
                            {mutationError}
                        </p>
                    </div>
                </div>
            )}

            {/* Étape 1: Configuration */}
            {step === 'config' && currentCoproId && (
                <div className={styles.content}>
                    <div className="card">
                        <h2 className={styles.sectionTitle}>1. Informations du budget</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Année du budget</label>
                            <input type="number" className={styles.input} value={budget.annee} onChange={(e) => setBudget({ ...budget, annee: parseInt(e.target.value)})}
                                min={new Date().getFullYear()}
                                max={new Date().getFullYear() + 5}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Montant total du budget (€)</label>
                            <input type="number" className={styles.input} value={budget.montantTotal || ''} onChange={(e) => setBudget({ ...budget, montantTotal: parseFloat(e.target.value) || 0})}
                                step="0.01"
                                placeholder="Ex: 85000"
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date de début</label>
                                <input type="date" className={styles.input} value={budget.dateDebut} onChange={(e) => setBudget({ ...budget, dateDebut: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date de fin</label>
                                <input type="date" className={styles.input} value={budget.dateFin} onChange={(e) => setBudget({ ...budget, dateFin: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className={styles.sectionTitle}>2. Configuration de l'échéancier</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Mode de paiement des appels de fonds</label>
                            <select
                                className={styles.select}
                                value={modeEcheancier}
                                onChange={(e) => setModeEcheancier(e.target.value as ModeEcheancier)}
                            >
                                <option value="UNE_FOIS">Paiement en une fois</option>
                                <option value="SEMESTRIEL">Paiement semestriel (2 échéances)</option>
                                <option value="TRIMESTRIEL">Paiement trimestriel (4 échéances)</option>
                                <option value="PERSONNALISE">Échéancier personnalisé</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Clé de répartition</label>
                            <select
                                className={styles.select}
                                value={cleRepartition}
                                onChange={(e) => setCleRepartition(e.target.value)}
                            >
                                {clesRepartition.map(cle => (
                                    <option key={cle.value} value={cle.value}>{cle.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            onClick={() => router.back()}
                            className="btn btn-secondary"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handlePreview}
                            className="btn btn-primary"
                            disabled={budget.montantTotal <= 0}
                        >
                            Prévisualiser <ArrowRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}

            {/* Étape 2: Prévisualisation */}
            {step === 'preview' && resolutionGeneree && (
                <div className={styles.content}>
                    <div className="card">
                        <h2 className={styles.sectionTitle}>Résolution générée automatiquement</h2>

                        <div className={styles.resolutionPreview}>
                            <h3 className={styles.resolutionTitle}>{resolutionGeneree.titre}</h3>
                            <div className={styles.resolutionMeta}>
                                <span className={styles.badge}>Article 24 - Majorité simple</span>
                                <span className={styles.badge}>{clesRepartition.find(c => c.value === cleRepartition)?.label}</span>
                            </div>
                            <p className={styles.resolutionText}>{resolutionGeneree.texte}</p>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className={styles.sectionTitle}>Échéancier d'appels de fonds</h2>

                        {resolutionGeneree.echeancier && (
                            <div className={styles.echeancierPreview}>
                                <div className={styles.echeancierHeader}>
                                    <div>
                                        <strong>Mode :</strong> {modeEcheancier === 'TRIMESTRIEL' ? 'Trimestriel' : modeEcheancier === 'SEMESTRIEL' ? 'Semestriel' : modeEcheancier === 'UNE_FOIS' ? 'Une fois' : 'Personnalisé'}
                                    </div>
                                    <div>
                                        <strong>Montant total :</strong> {budget.montantTotal.toLocaleString('fr-FR')} €
                                    </div>
                                    <div>
                                        <strong>Nombre d'échéances :</strong> {resolutionGeneree.echeancier.echeances.length}
                                    </div>
                                </div>

                                <div className={styles.echeancesList}>
                                    {resolutionGeneree.echeancier.echeances.map((echeance: Echeance, index: number) => (
                                        <div key={echeance.id} className={styles.echeanceItem}>
                                            <div className={styles.echeanceNum}>#{index + 1}</div>
                                            <div className={styles.echeanceDetails}>
                                                <div className={styles.echeanceDate}>
                                                    <Calendar size={16} aria-hidden="true" />
                                                    <span>{new Date(echeance.dateExigibilite).toLocaleDateString('fr-FR')}</span>
                                                </div>
                                                <div className={styles.echeanceMontant}>
                                                    <DollarSign size={16} aria-hidden="true" />
                                                    <span>{echeance.montantTotal.toLocaleString('fr-FR')} €</span>
                                                </div>
                                                {echeance.description && (
                                                    <div className={styles.echeanceDesc}>{echeance.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            onClick={() => setStep('config')}
                            className="btn btn-secondary"
                        >
                            Modifier
                        </button>
                        <button
                            onClick={handleValider}
                            className="btn btn-primary"
                            disabled={isSaving || !currentCoproId}
                        >
                            {isSaving ? (
                                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            ) : (
                                <CheckCircle size={16} aria-hidden="true" />
                            )}
                            {isSaving ? 'Validation...' : 'Valider le budget'}
                        </button>
                    </div>
                </div>
            )}

            {/* Étape 3: Succès */}
            {step === 'success' && (
                <div className={styles.content}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <CheckCircle size={64} aria-hidden="true" />
                        </div>
                        <h2 className={styles.successTitle}>Budget créé avec succès !</h2>
                        <p className={styles.successText}>
                            Le budget prévisionnel {budget.annee} a été créé et enregistré.
                            Pour finaliser l'approbation, vous devez lier ce budget à une Assemblée Générale
                            et créer la résolution correspondante.
                        </p>

                        <div className={styles.successDetails}>
                            <div className={styles.successDetail}>
                                <FileText size={24} aria-hidden="true" />
                                <div>
                                    <strong>Résolution à créer</strong>
                                    <p>{resolutionGeneree?.titre}</p>
                                </div>
                            </div>
                            <div className={styles.successDetail}>
                                <Calendar size={24} aria-hidden="true" />
                                <div>
                                    <strong>Échéancier prévu</strong>
                                    <p>{resolutionGeneree?.echeancier?.echeances.length} appel(s) de fonds ({modeEcheancier.toLowerCase()})</p>
                                </div>
                            </div>
                            <div className={styles.successDetail}>
                                <DollarSign size={24} aria-hidden="true" />
                                <div>
                                    <strong>Montant total</strong>
                                    <p>{budget.montantTotal.toLocaleString('fr-FR')} €</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                onClick={() => router.push('/finance/budgets')}
                                className="btn btn-secondary"
                            >
                                Retour aux budgets
                            </button>
                            <button
                                onClick={() => router.push('/ag/new')}
                                className="btn btn-primary"
                            >
                                Créer une AG pour ce budget
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
