'use client';

import { ArrowLeft, Calendar } from 'lucide-react';
import styles from './new-event.module.css';
import Link from 'next/link';
import { useState } from 'react';

export default function NewEventPage() {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState('AUTRE');
    const [description, setDescription] = useState('');

    return (
        <div className="container">
            <Link href="/social/events" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux événements
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>Nouvel événement</h1>
                <p className={styles.subtitle}>
                    Ajoutez un événement à l'agenda de la copropriété.
                </p>
            </div>

            <div className={styles.centerCard}>
                <div className="card">
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="title">Titre de l'événement</label>
                            <input
                                type="text"
                                id="title"
                                className="input"
                                placeholder="Ex: Fête des voisins"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label htmlFor="date">Date</label>
                                <input type="date" id="date" className="input" value={date} onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="time">Heure</label>
                                <input type="time" id="time" className="input" value={time} onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="location">Lieu</label>
                            <input
                                type="text"
                                id="location"
                                className="input"
                                placeholder="Ex: Cour intérieure"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="type">Type d'événement</label>
                            <select
                                id="type"
                                className="input"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="AUTRE">Autre</option>
                                <option value="FETE">Fête / Convivialité</option>
                                <option value="REUNION">Réunion</option>
                                <option value="TRAVAUX">Travaux / Maintenance</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                className="input"
                                rows={5}
                                placeholder="Détails de l'événement..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className={styles.actions}>
                            <button className="btn btn-primary w-full">
                                <Calendar size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Créer l'événement
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
