'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import styles from './minutes.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import clsx from 'clsx';

interface AGData {
    type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
    date: string;
    heure: string;
    lieu: string;
    adresse: string | { nomLieu: string; rue: string; codePostal: string; ville: string };
    adresseComplete?: string;
}

export default function AGMinutesPage() {
    const params = useParams();
    const agId = params.id as string;
    const [agData, setAgData] = useState<AGData | null>(null);
    const [resolutions, setResolutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Charger depuis localStorage d'abord (AG créée via workflow)
        const savedData = localStorage.getItem(`ag-draft-${agId}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData) as AGData;
                setAgData(data);
                
                // Charger les résolutions
                const savedResolutions = localStorage.getItem(`ag-resolutions-${agId}`);
                if (savedResolutions) {
                    setResolutions(JSON.parse(savedResolutions));
                }
            } catch (error) {
                console.error('Erreur lors du chargement des données AG:', error);
            }
        }
        setIsLoading(false);
    }, [agId]);

    if (isLoading) {
        return <div className="container">Chargement...</div>;
    }

    if (!agData) {
        return <div className="container">Assemblée non trouvée.</div>;
    }

    return (
        <div className="container">
            <Link href="/ag/dashboard" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour au tableau de bord
            </Link>

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Procès-Verbal</h1>
                    <p className={styles.subtitle}>
                        Assemblée Générale {agData.type === 'ORDINAIRE' ? 'Ordinaire' : 'Extraordinaire'} du {new Date(agData.date).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-primary">
                        <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Télécharger le PV (PDF)
                    </button>
                </div>
            </div>

            <div className="card">
                <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Date</span>
                        <span className={styles.summaryValue}>{new Date(agData.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Lieu</span>
                        <span className={styles.summaryValue}>
                            {typeof agData.adresse === 'string' ? agData.adresse : agData.adresseComplete || agData.lieu}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Statut</span>
                        <span className={clsx(styles.badge, styles.terminee)}>
                            Terminée
                        </span>
                    </div>
                </div>

                <div className={styles.resolutionsList}>
                    <h2 className={styles.sectionTitle}>Résolutions votées</h2>

                    {resolutions.map((res, index) => (
                        <div key={res.id || `res-${index}`} className={styles.resolutionItem}>
                            <div className={styles.resolutionHeader}>
                                <span className={styles.resolutionNumber}>Résolution n°{index + 1}</span>
                                <span className={clsx(styles.resultBadge, res.resultat === 'ADOPTEE' ? styles.adopted : styles.rejected)}>
                                    {res.resultat === 'ADOPTEE' ? 'Adoptée' : 'Rejetée'}
                                </span>
                            </div>

                            <h3 className={styles.resolutionTitle}>{res.titre}</h3>
                            <p className={styles.resolutionDesc}>{res.texte || res.titre}</p>

                            <div className={styles.votesDetail}>
                                <div className={styles.voteItem}>
                                    <CheckCircle size={16} className={styles.voteIconPour} aria-hidden="true" />
                                    <span>Pour : <strong>{res.pour || 0}</strong></span>
                                </div>
                                <div className={styles.voteItem}>
                                    <XCircle size={16} className={styles.voteIconContre} aria-hidden="true" />
                                    <span>Contre : <strong>{res.contre || 0}</strong></span>
                                </div>
                                <div className={styles.voteItem}>
                                    <MinusCircle size={16} className={styles.voteIconAbs} aria-hidden="true" />
                                    <span>Abstention : <strong>{res.abstention || 0}</strong></span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {(!resolutions || resolutions.length === 0) && (
                        <div className={styles.emptyState}>
                            Aucune résolution enregistrée pour cette assemblée.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
