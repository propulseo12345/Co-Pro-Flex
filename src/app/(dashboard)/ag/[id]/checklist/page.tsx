'use client';

import { MOCK_ASSEMBLEES } from '@/data/mock';
import { ArrowLeft, CheckSquare, Square, Calendar, Mail, MapPin } from 'lucide-react';
import styles from './checklist.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

export default function AGChecklistPage() {
    const params = useParams();
    const agId = params.id as string;
    const ag = MOCK_ASSEMBLEES.find(a => a.id === agId);

    const [tasks, setTasks] = useState([
        { id: 1, label: 'Réserver la salle', done: true, deadline: 'J-60' },
        { id: 2, label: 'Arrêter les comptes', done: true, deadline: 'J-45' },
        { id: 3, label: 'Préparer l\'ordre du jour', done: true, deadline: 'J-30' },
        { id: 4, label: 'Envoyer les convocations', done: false, deadline: 'J-21' },
        { id: 5, label: 'Vérifier les pouvoirs reçus', done: false, deadline: 'J-2' },
        { id: 6, label: 'Imprimer la feuille de présence', done: false, deadline: 'J-1' },
        { id: 7, label: 'Préparer le matériel de vote', done: false, deadline: 'J-1' },
    ]);

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    if (!ag) {
        return <div className="container">Assemblée non trouvée.</div>;
    }

    const progress = Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);

    return (
        <div className="container">
            <Link href="/ag/dashboard" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour au tableau de bord
            </Link>

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Checklist de préparation</h1>
                    <p className={styles.subtitle}>
                        Suivez les étapes clés pour une Assemblée Générale réussie.
                    </p>
                </div>
                <div className={styles.agInfo}>
                    <div className={styles.agInfoItem}>
                        <Calendar size={16} aria-hidden="true" /> {new Date(ag.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className={styles.agInfoItem}>
                        <MapPin size={16} aria-hidden="true" /> {ag.lieu}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className={styles.progressWrapper}>
                    <div className={styles.progressLabel}>
                        <span>Progression</span>
                        <span>{progress}%</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className={styles.taskList}>
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={clsx(styles.taskItem, task.done && styles.taskDone)}
                            onClick={() => toggleTask(task.id)}
                        >
                            <div className={styles.checkbox}>
                                {task.done ? <CheckSquare size={24} className={styles.checkIcon} aria-hidden="true" /> : <Square size={24} aria-hidden="true" />}
                            </div>
                            <div className={styles.taskContent}>
                                <span className={styles.taskLabel}>{task.label}</span>
                                <span className={styles.taskDeadline}>Échéance : {task.deadline}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
