'use client';

import { Filter, CheckCircle, Clock } from 'lucide-react';
import type { StatutFilter } from '@/hooks/modules/useExpenses';
import styles from './Expenses.module.css';

interface ExpensesFiltersProps {
    statutFilter: StatutFilter;
    setStatutFilter: (filter: StatutFilter) => void;
    nombreTotal: number;
    nbValidees: number;
    nbEnAttente: number;
    nbNonValidees: number;
}

export function ExpensesFilters({
    statutFilter, setStatutFilter, nombreTotal, nbValidees, nbEnAttente, nbNonValidees
}: ExpensesFiltersProps) {
    return (
        <div className={styles.filtersBar}>
            <div className={styles.filterGroup}>
                <Filter size={16} />
                <span>Filtrer par statut :</span>
                <div className={styles.filterButtons}>
                    <button
                        className={`${styles.filterBtn} ${statutFilter === 'TOUTES' ? styles.filterBtnActive : ''}`}
                        onClick={() => setStatutFilter('TOUTES')}
                    >
                        Toutes ({nombreTotal})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statutFilter === 'VALIDEE' ? styles.filterBtnActive : ''}`}
                        onClick={() => setStatutFilter('VALIDEE')}
                    >
                        <CheckCircle size={14} /> Validées ({nbValidees})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statutFilter === 'EN_ATTENTE_VALIDATION' ? styles.filterBtnActive : ''}`}
                        onClick={() => setStatutFilter('EN_ATTENTE_VALIDATION')}
                    >
                        <Clock size={14} /> En attente ({nbEnAttente})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statutFilter === 'NON_VALIDEE' ? styles.filterBtnActive : ''}`}
                        onClick={() => setStatutFilter('NON_VALIDEE')}
                    >
                        Non validées ({nbNonValidees})
                    </button>
                </div>
            </div>
        </div>
    );
}
