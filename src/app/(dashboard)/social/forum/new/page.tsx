'use client';

import { ArrowLeft, Send } from 'lucide-react';
import styles from './new-topic.module.css';
import Link from 'next/link';
import { useState } from 'react';

export default function NewTopicPage() {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [content, setContent] = useState('');

    return (
        <div className="container">
            <Link href="/social/forum" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour au forum
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>Nouvelle discussion</h1>
                <p className={styles.subtitle}>
                    Lancez un sujet pour échanger avec la copropriété.
                </p>
            </div>

            <div className={styles.centerCard}>
                <div className="card">
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="title">Titre du sujet</label>
                            <input
                                type="text"
                                id="title"
                                className="input"
                                placeholder="Ex: Question sur le tri sélectif"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="category">Catégorie</label>
                            <select
                                id="category"
                                className="input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="GENERAL">Général</option>
                                <option value="TRAVAUX">Travaux</option>
                                <option value="VOISINAGE">Voisinage</option>
                                <option value="ANNONCES">Petites annonces</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="content">Message</label>
                            <textarea
                                id="content"
                                className="input"
                                rows={8}
                                placeholder="Votre message..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>

                        <div className={styles.actions}>
                            <button className="btn btn-primary w-full">
                                <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Publier la discussion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
