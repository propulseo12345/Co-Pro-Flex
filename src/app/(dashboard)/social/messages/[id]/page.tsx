'use client';

import { MOCK_CONVERSATIONS, MOCK_PRIVATE_MESSAGES } from '@/data/mock';
import { ArrowLeft, Send, User } from 'lucide-react';
import styles from './conversation.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;
    const conversation = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
    const messages = MOCK_PRIVATE_MESSAGES.filter(m => m.conversationId === conversationId);

    const [newMessage, setNewMessage] = useState('');

    if (!conversation) {
        return <div className="container">Conversation non trouvée.</div>;
    }

    return (
        <div className="container">
            <Link href="/social/messages" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux messages
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>{conversation.participants.join(', ')}</h1>
            </div>

            <div className={styles.messagesList}>
                {messages.map((msg) => (
                    <div key={msg.id} className={clsx(styles.messageItem, msg.isMe && styles.myMessage)}>
                        <div className={styles.messageContent}>
                            <p className={styles.messageText}>{msg.contenu}</p>
                            <span className={styles.messageDate}>
                                {new Date(msg.date).toLocaleDateString('fr-FR')} {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.replyBox}>
                <div className={styles.replyInputWrapper}>
                    <input type="text" className={styles.replyInput} placeholder="Votre message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button className="btn btn-primary" aria-label="Envoyer"><Send size={16} aria-hidden="true" /></button>
                </div>
            </div>
        </div>
    );
}
