'use client';

import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import styles from './closing.module.css';
import clsx from 'clsx';

export default function ClosingPage() {
    const exerciceYear = new Date().getFullYear() - 1; // Année précédente pour la clôture

    return (
        <div className="container">
            <div className={styles.header}>
                <h1 className={styles.title}>Exercice {exerciceYear} - Arrêté</h1>
                <div className={styles.period}>
                    Période : Exercice du 1 janvier {exerciceYear} au 31 décembre {exerciceYear}
                </div>
            </div>

            <div className={styles.actions}>
                <button className="btn btn-primary"><CheckCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Approuver les comptes</button>
                <button className="btn btn-secondary"><XCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Annuler l'arrêté des comptes</button>
            </div>

            <div className={styles.tabs}>
                <div className={clsx(styles.tab, styles.active)}>Annexe 1</div>
                <div className={styles.tab}>Complément de l'annexe 1</div>
                <div className={styles.tab}>Annexe 2</div>
                <div className={styles.tab}>Annexe 3</div>
                <div className={styles.tab}>Annexe 4</div>
                <div className={styles.tab}>Annexe 5</div>
            </div>

            <div className="card">
                <div className={styles.emptyState}>
                    <AlertCircle size={48} className={styles.emptyIcon} aria-hidden="true" />
                    <p>Cette annexe n'est pas disponible sur CoProFlex</p>
                </div>
            </div>
        </div>
    );
}
