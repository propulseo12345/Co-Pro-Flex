'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import styles from './CategoryBlock.module.css';

interface KpiItem {
    label: string;
    value: string | number;
    icon: React.ElementType;
}

interface CategoryBlockProps {
    title: string;
    description: string;
    icon: React.ElementType;
    count: number;
    href: string;
    kpiItems: KpiItem[];
    accentColor: 'primary' | 'secondary' | 'tertiary';
}

export function CategoryBlock({
    title,
    description,
    icon: Icon,
    count,
    href,
    kpiItems,
    accentColor
}: CategoryBlockProps) {
    const colorClasses = {
        primary: styles.blockPrimary,
        secondary: styles.blockSecondary,
        tertiary: styles.blockTertiary
    };

    return (
        <div className={clsx(styles.categoryBlock, colorClasses[accentColor])}>
            <div className={styles.blockHeader}>
                <div className={styles.blockIcon}>
                    <Icon size={28} aria-hidden="true" />
                </div>
                <div className={styles.blockInfo}>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
                <div className={styles.blockCount}>
                    <span className={styles.countValue}>{count}</span>
                    <span className={styles.countLabel}>prestataires</span>
                </div>
            </div>

            <div className={styles.blockKpis}>
                {kpiItems.map((kpi) => (
                    <div key={kpi.label} className={styles.kpiItem}>
                        <kpi.icon size={16} />
                        <span className={styles.kpiLabel}>{kpi.label}</span>
                        <span className={styles.kpiValue}>{kpi.value}</span>
                    </div>
                ))}
            </div>

            <Link href={href} className={styles.blockAction}>
                Voir la liste complète <ChevronRight size={18} aria-hidden="true" />
            </Link>
        </div>
    );
}
