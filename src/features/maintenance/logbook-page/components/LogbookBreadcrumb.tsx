'use client';

import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import type { BreadcrumbConfig } from '../hooks/useLogbookPage';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export interface LogbookBreadcrumbProps {
    config: BreadcrumbConfig;
}

export function LogbookBreadcrumb({ config }: LogbookBreadcrumbProps) {
    return (
        <div className={styles.breadcrumb}>
            <Link href={config.parentPath} className={styles.breadcrumbLink}>
                <Home size={14} aria-hidden="true" /> {config.parentLabel}
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span>{config.currentLabel}</span>
        </div>
    );
}
