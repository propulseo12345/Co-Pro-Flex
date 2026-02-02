'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';

export interface RemindersTemplatesProps {
    isManager: boolean;
}

export function RemindersTemplates({ isManager }: RemindersTemplatesProps) {
    return (
        <div className={styles.templates}>
            <div className={styles.templatesHeader}>
                <h2 className={styles.templatesTitle}>Modeles de relance</h2>
                {isManager && (
                    <Link href="/settings/reminders" className="btn btn-secondary btn-sm">
                        <Settings size={14} /> Gerer
                    </Link>
                )}
            </div>
            <div className={styles.templatesGrid}>
                <div className={styles.templateCard}>
                    <h3>1re relance (J+7)</h3>
                    <p>Information courtoise</p>
                </div>
                <div className={styles.templateCard}>
                    <h3>2e relance (J+30)</h3>
                    <p>Rappel avec delai</p>
                </div>
                <div className={styles.templateCard}>
                    <h3>Dernier rappel (J+60)</h3>
                    <p>Avant transmission conseil</p>
                </div>
            </div>
        </div>
    );
}
