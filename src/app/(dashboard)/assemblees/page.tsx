'use client';

import { Search, ChevronDown } from 'lucide-react';
import styles from './assemblees.module.css';
import { useState } from 'react';

export default function AssembleesPage() {
    const [selectedResolution, setSelectedResolution] = useState('2');

    const votes = [
        { id: 1, nom: 'GONTCHAROV François', pour: true, abstention: false, contre: false },
        { id: 2, nom: 'LE GUENNEC Martine', pour: true, abstention: false, contre: false },
        { id: 3, nom: 'MANAN Ranga', pour: true, abstention: false, contre: false },
        { id: 4, nom: 'MANDRIN Sandrine', pour: true, abstention: false, contre: false },
        { id: 5, nom: 'SCI Dvnis', pour: true, abstention: false, contre: false },
        { id: 6, nom: 'SCI Gerard', pour: true, abstention: false, contre: false }
    ];

    const stats = {
        presents: '282.76 / 282.76',
        pour: '282.76 tantièmes pour',
        contre: '0.00 tantièmes contre'
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <div className={styles.presidentInfo}>
                        M./Mme <strong>Denis</strong> est élu(e) président(e) de séance.
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.searchBar}>
                    <Search size={16} aria-hidden="true" />
                    <input type="text" placeholder="Rechercher" className="input" aria-label="Rechercher"/>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>{stats.presents} tantièmes présents ou représentés (Charges générales)</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{stats.pour}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{stats.contre}</span>
                    </div>
                </div>

                <div className={styles.resolutionSelector}>
                    <select
                        className="input"
                        value={selectedResolution}
                        onChange={(e) => setSelectedResolution(e.target.value)}
                    >
                        <option value="1">1. Élection du président...</option>
                        <option value="2">2. Élection du secrét...</option>
                        <option value="3">3. Autre résolution...</option>
                    </select>
                    <button className="btn btn-primary">
                        Répliquer les votes
                    </button>
                </div>

                <div className={styles.voteTable}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerCell}>Nom</div>
                        <div className={styles.headerCell}>
                            Pour (10)
                            <div className={styles.headerLink}>Aucun</div>
                        </div>
                        <div className={styles.headerCell}>
                            Abstention (0)
                            <div className={styles.headerLink}>Tous</div>
                        </div>
                        <div className={styles.headerCell}>
                            Contre (0)
                            <div className={styles.headerLink}>Tous</div>
                        </div>
                    </div>

                    <div className={styles.tableBody}>
                        {votes.map((vote) => (
                            <div key={vote.id} className={styles.voteRow}>
                                <div className={styles.voteName}>{vote.nom}</div>
                                <div className={styles.voteOption}>
                                    <input
                                        type="radio"
                                        name={`vote-${vote.id}`}
                                        checked={vote.pour}
                                        readOnly
                                        className={styles.radioGreen}
                                    />
                                </div>
                                <div className={styles.voteOption}>
                                    <input
                                        type="radio"
                                        name={`vote-${vote.id}`}
                                        checked={vote.abstention}
                                        readOnly
                                    />
                                </div>
                                <div className={styles.voteOption}>
                                    <input
                                        type="radio"
                                        name={`vote-${vote.id}`}
                                        checked={vote.contre}
                                        readOnly
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className="btn btn-primary btn-lg">
                        Valider le vote
                    </button>
                </div>
            </div>
        </div>
    );
}
