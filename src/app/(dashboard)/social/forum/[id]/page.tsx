'use client';

import { MOCK_FORUM_TOPICS, MOCK_FORUM_MESSAGES } from '@/data/mock';
import { ArrowLeft, Send, User } from 'lucide-react';
import styles from './topic.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

export default function ForumTopicPage() {
    const params = useParams();
    const topicId = params.id as string;
    const topic = MOCK_FORUM_TOPICS.find(t => t.id === topicId);
    const messages = MOCK_FORUM_MESSAGES.filter(m => m.topicId === topicId);

    const [newMessage, setNewMessage] = useState('');

    if (!topic) {
        return <div className="container">Sujet non trouvé.</div>;
    }

    return (
        <div className="container">
            <Link href="/social/forum" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour au forum
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>{topic.titre}</h1>
                <div className={styles.meta}>
                    <span className={styles.category}>{topic.categorie}</span>
                    <span className={styles.date}>Créé le {new Date(topic.dateCreation).toLocaleDateString('fr-FR')} par {topic.auteur}</span>
                </div>
            </div>

            <div className={styles.messagesList}>
                {messages.map((msg) => (
                    <div key={msg.id} className={clsx(styles.messageItem, msg.isMe && styles.myMessage)}>
                        <div className={styles.messageAvatar}>
                            <User size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.messageContent}>
                            <div className={styles.messageHeader}>
                                <span className={styles.messageAuthor}>{msg.auteur}</span>
                                <span className={styles.messageDate}>
                                    {new Date(msg.date).toLocaleDateString('fr-FR')} à {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className={styles.messageText}>{msg.contenu}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.replyBox}>
                <div className="card">
                    <h3 className={styles.replyTitle}>Répondre</h3>
                    <div className={styles.replyInputWrapper}>
                        <textarea
                            className={styles.replyInput}
                            rows={3}
                            placeholder="Votre message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button className="btn btn-primary">
                            <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Envoyer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
