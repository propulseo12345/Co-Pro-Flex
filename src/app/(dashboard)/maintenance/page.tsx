'use client';

import Link from 'next/link';
import { Wrench, FileText, Users, ClipboardList } from 'lucide-react';
import styles from '../documents/documents.module.css';

export default function MaintenancePage() {
    const sections = [
        {
            title: 'Carnet d\'entretien',
            description: 'Historique des interventions',
            icon: FileText,
            href: '/maintenance/logbook'
        },
        {
            title: 'Contrats',
            description: 'Contrats de maintenance et assurances',
            icon: ClipboardList,
            href: '/maintenance/contracts'
        },
        {
            title: 'Annuaire professionnels',
            description: 'Coordonnées des prestataires',
            icon: Users,
            href: '/maintenance/providers'
        },
        {
            title: 'Ordres de service',
            description: 'Gestion des ordres de service',
            icon: Wrench,
            href: '/maintenance/service-orders'
        }
    ];

    return (
        <div className="container">
            <h1 className={styles.title}>Maintenance & Entretien</h1>
            <p className={styles.subtitle}>Gestion de la maintenance de la copropriété</p>

            <div className={styles.grid}>
                {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link key={section.href} href={section.href} className={styles.card} aria-hidden="true">
                            <div className={styles.iconWrapper}>
                                <Icon size={32} aria-hidden="true" />
                            </div>
                            <h2 className={styles.cardTitle}>{section.title}</h2>
                            <p className={styles.cardDesc}>{section.description}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
