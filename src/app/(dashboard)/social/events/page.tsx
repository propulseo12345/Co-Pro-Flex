'use client';

import { MOCK_EVENTS } from '@/data/mock';
import { Calendar, MapPin, Plus, User } from 'lucide-react';
import styles from './events.module.css';
import Link from 'next/link';
import clsx from 'clsx';

export default function EventsPage() {
    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Événements</h1>
                    <p className={styles.subtitle}>
                        L'agenda de la vie de la copropriété.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-primary">
                        <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Créer un événement
                    </button>
                </div>
            </div>

            <div className="card">
                <div className={styles.eventsList}>
                    {MOCK_EVENTS.map((event) => (
                        <div key={event.id} className={styles.eventItem}>
                            <div className={styles.dateBox}>
                                <span className={styles.dateDay}>{new Date(event.date).getDate()}</span>
                                <span className={styles.dateMonth}>{new Date(event.date).toLocaleString('fr-FR', { month: 'short' })}</span>
                            </div>

                            <div className={styles.eventContent}>
                                <div className={styles.eventHeader}>
                                    <h3 className={styles.eventTitle}>{event.titre}</h3>
                                    <span className={clsx(styles.eventType, styles[event.type.toLowerCase()])}>{event.type}</span>
                                </div>

                                <div className={styles.eventMeta}>
                                    <div className={styles.metaItem}>
                                        <Calendar size={14} aria-hidden="true" />
                                        <span>{new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <MapPin size={14} aria-hidden="true" />
                                        <span>{event.lieu}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <User size={14} aria-hidden="true" />
                                        <span>{event.organisateur}</span>
                                    </div>
                                </div>

                                <p className={styles.eventDesc}>{event.description}</p>
                            </div>
                        </div>
                    ))}

                    {MOCK_EVENTS.length === 0 && (
                        <div className={styles.emptyState}>
                            Aucun événement à venir.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
