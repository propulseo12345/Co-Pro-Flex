'use client';

import { MOCK_CONVERSATIONS } from '@/data/mock';
import { MessageCircle, Search, User } from 'lucide-react';
import styles from './messages.module.css';
import Link from 'next/link';
import clsx from 'clsx';

export default function MessagesPage() {
    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Messagerie privée</h1>
                    <p className={styles.subtitle}>
                        Vos échanges directs avec les autres copropriétaires.
                    </p>
                </div>
            </div>

            <div className="card">
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                        <input type="text" placeholder="Rechercher une conversation..." className={styles.searchInput} aria-label="Rechercher une conversation..."/>
                    </div>
                </div>

                <div className={styles.conversationList}>
                    {MOCK_CONVERSATIONS.map((conv) => (
                        <Link key={conv.id} href={`/social/messages/${conv.id}`} className={clsx(styles.conversationItem, conv.nonLu && styles.unread)}>
                            <div className={styles.avatar}>
                                <User size={24} aria-hidden="true" />
                            </div>
                            <div className={styles.conversationContent}>
                                <div className={styles.conversationHeader}>
                                    <span className={styles.participants}>{conv.participants.join(', ')}</span>
                                    <span className={styles.date}>
                                        {new Date(conv.dateDernierMessage).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                                <p className={styles.lastMessage}>{conv.dernierMessage}</p>
                            </div>
                            {conv.nonLu && <div className={styles.unreadDot}></div>}
                        </Link>
                    ))}

                    {MOCK_CONVERSATIONS.length === 0 && (
                        <div className={styles.emptyState}>
                            Aucune conversation.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
