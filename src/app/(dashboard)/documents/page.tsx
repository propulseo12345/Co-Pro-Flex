'use client';

import Link from 'next/link';
import { FileText, Book, Scale, Receipt, ClipboardList } from 'lucide-react';
import styles from './documents.module.css';

export default function DocumentsPage() {
    const sections = [
        {
            title: 'GED - Gestion documentaire',
            description: 'Accédez à tous vos documents de copropriété',
            icon: FileText,
            href: '/documents/ged'
        },
        {
            title: 'Grand livre',
            description: 'Consultez le grand livre comptable',
            icon: Book,
            href: '/documents/ledger'
        },
        {
            title: 'Balance comptable',
            description: 'Balance des comptes de la copropriété',
            icon: Scale,
            href: '/documents/balance'
        },
        {
            title: 'Dépenses',
            description: 'Suivi détaillé des dépenses',
            icon: Receipt,
            href: '/documents/expenses'
        },
        {
            title: 'Annexes comptables',
            description: 'Annexes réglementaires (Décret 2005-240)',
            icon: ClipboardList,
            href: '/documents/annexes'
        }
    ];

    return (
        <div className="container">
            <h1 className={styles.title}>Documents</h1>
            <p className={styles.subtitle}>Accédez à tous les documents de la copropriété</p>

            <div className={styles.grid}>
                {sections.map((section, idx) => {
                    const Icon = section.icon;
                    return (
                        <Link key={idx} href={section.href} className={styles.card} aria-hidden="true">
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
