'use client';

import Link from 'next/link';
import { MessageSquare, Calendar, Mail } from 'lucide-react';
import styles from '../documents/documents.module.css';

export default function SocialPage() {
    const sections = [
        {
            title: 'Forum',
            description: 'Discussions entre copropriétaires',
            icon: MessageSquare,
            href: '/social/forum'
        },
        {
            title: 'Événements',
            description: 'Calendrier des événements',
            icon: Calendar,
            href: '/social/events'
        },
        {
            title: 'Messages privés',
            description: 'Messagerie privée',
            icon: Mail,
            href: '/social/messages'
        }
    ];

    return (
        <div className="container">
            <h1 className={styles.title}>Communication & Social</h1>
            <p className={styles.subtitle}>Espace d\'échange et de communication</p>

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
