'use client';

import Link from 'next/link';
import { Send, Lock, Settings } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';
import type { HeaderState } from '../hooks/useRemindersPage';

export interface RemindersHeaderProps {
    header: HeaderState;
}

export function RemindersHeader({ header }: RemindersHeaderProps) {
    const { isManager, isRunning, unpaidCount, onOpenBulkModal } = header;

    return (
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>Gestion des relances</h1>
                <p className={styles.subtitle}>
                    Envoyez des relances automatiques aux coproprietaires en retard de paiement
                </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                {isManager ? (
                    <button
                        className="btn btn-primary"
                        onClick={onOpenBulkModal}
                        disabled={isRunning || unpaidCount === 0}
                    >
                        <Send size={16} /> Executer les relances auto
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        disabled
                        title="Acces reserve aux gestionnaires"
                    >
                        <Lock size={16} /> Relances (acces restreint)
                    </button>
                )}
                {isManager && (
                    <Link href="/settings/reminders" className="btn btn-secondary">
                        <Settings size={16} /> Parametrer
                    </Link>
                )}
                <Link href="/finance/unpaid" className="btn btn-secondary">
                    Retour aux impayes
                </Link>
            </div>
        </div>
    );
}
