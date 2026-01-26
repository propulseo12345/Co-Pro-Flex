'use client';

import { MOCK_FORUM_TOPICS } from '@/data/mock';
import { MessageSquare, Plus, Search, User } from 'lucide-react';
import styles from './forum.module.css';
import Link from 'next/link';
import clsx from 'clsx';

export default function ForumPage() {
    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Forum de discussion</h1>
                    <p className={styles.subtitle}>
                        Échangez avec vos voisins et le conseil syndical.
                    </p>
                </div>
                <div className={styles.actions}>
                    <Link href="/social/forum/new" className="btn btn-primary">
                        <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Nouvelle discussion
                    </Link>
                </div>
            </div>

            <div className="card">
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                        <input type="text" placeholder="Rechercher un sujet..." className={styles.searchInput} aria-label="Rechercher un sujet..."/>
                    </div>
                    <div className={styles.filters}>
                        <button className={clsx(styles.filterBtn, styles.active)}>Tous</button>
                        <button className={styles.filterBtn}>Voisinage</button>
                        <button className={styles.filterBtn}>Travaux</button>
                        <button className={styles.filterBtn}>Annonces</button>
                    </div>
                </div>

                <div className={styles.topicList}>
                    {MOCK_FORUM_TOPICS.map((topic) => (
                        <Link key={topic.id} href={`/social/forum/${topic.id}`} className={styles.topicItem}>
                            <div className={styles.topicMain}>
                                <div className={styles.topicIcon}>
                                    <MessageSquare size={24} aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className={styles.topicTitle}>{topic.titre}</h3>
                                    <div className={styles.topicMeta}>
                                        <span className={styles.topicAuthor}>Par {topic.auteur}</span>
                                        <span className={styles.topicDate}>• {new Date(topic.dateCreation).toLocaleDateString('fr-FR')}</span>
                                        <span className={styles.topicCategory}>{topic.categorie}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.topicStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{topic.nbReponses}</span>
                                    <span className={styles.statLabel}>réponses</span>
                                </div>
                                <div className={styles.lastActivity}>
                                    <div className={styles.lastActivityUser}>
                                        <User size={12} aria-hidden="true" /> {topic.dernierAuteur}
                                    </div>
                                    <div className={styles.lastActivityDate}>
                                        {new Date(topic.dernierMessage!).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
