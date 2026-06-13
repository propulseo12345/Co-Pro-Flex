'use client';

import { useMemo, useState, useCallback } from 'react';
import { ArrowRight, Check, Search, RefreshCw, AlertCircle, CreditCard, Database, Clock } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { useBankMovements, useAccounts, useReconcileBankMovement, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import styles from './bank-movements.module.css';

export default function BankMovementsPage() {
    const { currentCoproId } = useCopro();
    const { data: bankMovements, isLoading, error, refresh } = useBankMovements('unmatched');
    const { data: accounts } = useAccounts();
    // Abonnement à la période ouverte conservé (effet du hook) même si la valeur n'est pas lue ici
    useOpenPeriod();
    const reconcileMutation = useReconcileBankMovement();

    const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
    const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Get expense/revenue accounts for categorization
    const categorisationAccounts = useMemo(() => {
        if (!accounts) return [];
        return accounts.filter(acc =>
            acc.account_type === 'expense' || acc.account_type === 'revenue'
        ).sort((a, b) => a.code.localeCompare(b.code));
    }, [accounts]);

    const handleAccountSelect = (movementId: string, accountId: string) => {
        setSelectedAccounts(prev => ({ ...prev, [movementId]: accountId }));
    };

    const handleRefresh = useCallback(async () => {
        await refresh();
        setLastRefresh(new Date());
    }, [refresh]);

    const handleValidate = useCallback(async (movementId: string) => {
        const accountId = selectedAccounts[movementId];
        if (!accountId) return;

        // Mark as validating
        setValidatingIds(prev => new Set(prev).add(movementId));

        try {
            // Call Supabase reconcile API
            const result = await reconcileMutation.mutate({
                bank_movement_id: movementId,
                target_type: 'other',
                target_id: accountId, // Using account ID as target for categorization
            });

            if (result.error) {
                console.error('Reconcile error:', result.error);
                // Keep selection on error for retry
            } else {
                // Clear selection after successful validation
                setSelectedAccounts(prev => {
                    const newState = { ...prev };
                    delete newState[movementId];
                    return newState;
                });
            }

            // Refresh data to get updated list
            await refresh();
            setLastRefresh(new Date());
        } finally {
            // Remove from validating
            setValidatingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(movementId);
                return newSet;
            });
        }
    }, [selectedAccounts, reconcileMutation, refresh]);

    // Mode Single Copro: si pas encore chargé ou en cours de chargement
    if (!currentCoproId || isLoading) {
        return (
            <div className="container">
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
                    <p style={{ marginTop: '1rem' }}>Chargement des mouvements bancaires...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container">
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}>
                    <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
                    <h2>Erreur de chargement</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
                    <button className="btn btn-primary" onClick={refresh} style={{ marginTop: '1rem' }}>
                        <RefreshCw size={16} style={{ marginRight: 8 }} /> Réessayer
                    </button>
                </div>
            </div>
        );
    }

    const movements = bankMovements || [];

    return (
        <div className="container">
            {/* Source indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--color-bg-secondary)',
                borderRadius: '4px',
                width: 'fit-content'
            }}>
                <Database size={14} style={{ color: 'var(--color-success)' }} />
                <span>Source: Supabase (v_bank_movements_overview)</span>
                <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span>
                <Clock size={14} />
                <span>Dernière actualisation: {lastRefresh.toLocaleTimeString('fr-FR')}</span>
            </div>

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Catégorisation des mouvements bancaires</h1>
                    <p className={styles.subtitle}>
                        Affectez vos mouvements bancaires aux comptes de charges ou de produits correspondants.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={handleRefresh} title="Actualiser les données">
                        <RefreshCw size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Actualiser
                    </button>
                </div>
            </div>

            {movements.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <CreditCard size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
                    <h2>Tous les mouvements sont catégorisés</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Il n&apos;y a pas de mouvements bancaires en attente de catégorisation.
                    </p>
                </div>
            ) : (
                <div className="card">
                    <h2 className={styles.sectionTitle}>Mouvements à catégoriser ({movements.length})</h2>

                    <div className={styles.movementsList}>
                        {movements.map((mouvement) => (
                            <div key={mouvement.id} className={styles.movementRow}>
                                <div className={styles.movementInfo}>
                                    <div className={styles.date}>
                                        {new Date(mouvement.bank_date).toLocaleDateString('fr-FR')}
                                    </div>
                                    <div className={styles.libelle}>{mouvement.label}</div>
                                    <div
                                        className={styles.amount}
                                        style={{ color: mouvement.direction === 'credit' ? '#059669' : '#DC2626' }}
                                    >
                                        {mouvement.direction === 'credit' ? '+' : '-'}
                                        {Number(mouvement.amount_abs).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                </div>

                                <div className={styles.categorization}>
                                    <ArrowRight className={styles.arrow} size={20} aria-hidden="true" />
                                    <div className={styles.selectWrapper}>
                                        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                                        <select
                                            className={styles.accountSelect}
                                            value={selectedAccounts[mouvement.id] || ''}
                                            onChange={(e) => handleAccountSelect(mouvement.id, e.target.value)}
                                        >
                                            <option value="">Rechercher un compte (ex: 601 Eau)...</option>
                                            {categorisationAccounts.map(account => (
                                                <option key={account.id} value={account.id}>
                                                    {account.code} - {account.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        disabled={!selectedAccounts[mouvement.id] || validatingIds.has(mouvement.id)}
                                        onClick={() => handleValidate(mouvement.id)}
                                    >
                                        {validatingIds.has(mouvement.id) ? (
                                            <>
                                                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Validation...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} aria-hidden="true" /> Valider
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
