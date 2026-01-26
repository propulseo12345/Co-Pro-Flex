'use client';

import Link from 'next/link';
import { Users, BookOpen, CheckSquare } from 'lucide-react';
import styles from '../documents/documents.module.css';

export default function AGPage() {
    const sections = [
        {
            title: 'Dashboard AG',
            description: 'Vue d\'ensemble des assemblées générales',
            icon: Users,
            href: '/ag/dashboard'
        },
        {
            title: 'Bibliothèque de résolutions',
            description: 'Modèles de résolutions pré-définis et personnalisés',
            icon: BookOpen,
            href: '/ag/resolutions'
        }
    ];

    return (
        <div className="container">
            <h1 className={styles.title}>Assemblées Générales</h1>
            <p className={styles.subtitle}>Gestion des assemblées générales de copropriétaires</p>

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
