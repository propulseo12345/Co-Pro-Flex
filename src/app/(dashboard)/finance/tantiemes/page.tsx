'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import styles from './tantiemes.module.css';

interface Copropriétaire {
    id: string;
    nom: string;
    tantiemes: number;
    pourcentage: number;
}

export default function TantiemesPage() {
    const [totalTantiemes] = useState(1000);
    const [coproprietaires, setCoproprietaires] = useState<Copropriétaire[]>([
        { id: '1', nom: 'Copropriétaire A', tantiemes: 0, pourcentage: 0 },
        { id: '2', nom: 'Copropriétaire B', tantiemes: 0, pourcentage: 0 },
        { id: '3', nom: 'Copropriétaire C', tantiemes: 0, pourcentage: 0 },
    ]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ nom: '', tantiemes: 0 });

    const handleEdit = (copro: Copropriétaire) => {
        setEditingId(copro.id);
        setEditValues({ nom: copro.nom, tantiemes: copro.tantiemes });
    };

    const handleSave = (id: string) => {
        setCoproprietaires(prev =>
            prev.map(c =>
                c.id === id
                    ? {
                          ...c,
                          nom: editValues.nom,
                          tantiemes: editValues.tantiemes,
                          pourcentage: (editValues.tantiemes / totalTantiemes) * 100,
                      }
                    : c
            )
        );
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce copropriétaire ?')) {
            setCoproprietaires(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleAdd = () => {
        const newId = (Math.max(...coproprietaires.map(c => parseInt(c.id)), 0) + 1).toString();
        const newCopro: Copropriétaire = {
            id: newId,
            nom: 'Nouveau copropriétaire',
            tantiemes: 0,
            pourcentage: 0,
        };
        setCoproprietaires(prev => [...prev, newCopro]);
        setEditingId(newId);
        setEditValues({ nom: newCopro.nom, tantiemes: 0 });
    };

    const totalAssigne = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);
    const totalPourcentage = coproprietaires.reduce((sum, c) => sum + c.pourcentage, 0);

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Tantièmes et clés de répartition</h1>
                    <p className={styles.subtitle}>
                        Gestion de la répartition des charges et pondération des votes en AG
                    </p>
                </div>
                <button className={styles.addButton} onClick={handleAdd}>
                    <Plus size={20} aria-hidden="true" />
                    Ajouter un copropriétaire
                </button>
            </div>

            <div className={styles.infoSection}>
                <h2 className={styles.sectionTitle}>A — Tantièmes et clés de répartition</h2>
                <p className={styles.description}>
                    Les tantièmes correspondent à la quote-part de chaque copropriétaire dans la
                    copropriété. Ils servent à répartir les charges et à pondérer les votes en AG.
                </p>

                <div className={styles.twoColumns}>
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>1 — Répartition des charges</h3>
                        <p className={styles.cardText}>
                            Chaque copropriétaire paie ses charges en fonction de ses tantièmes.
                        </p>
                        <p className={styles.cardHighlight}>
                            ➡️ Les tantièmes doivent donc être enregistrés sur la fiche de chaque
                            copropriétaire pour permettre au logiciel de calculer automatiquement
                            les appels de fonds, les soldes et la comptabilité.
                        </p>
                    </div>

                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>2 — Pondération des votes en AG</h3>
                        <p className={styles.cardText}>
                            En Assemblée Générale, le poids du vote dépend des tantièmes (et pas du
                            nombre de personnes).
                        </p>
                        <p className={styles.cardHighlight}>
                            ➡️ Le système doit donc calculer automatiquement les résultats selon la
                            majorité applicable (24, 25, 25-1, 26, unanimité).
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.statsSection}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total tantièmes</span>
                    <span className={styles.statValue}>{totalTantiemes}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tantièmes assignés</span>
                    <span
                        className={`${styles.statValue} ${
                            totalAssigne !== totalTantiemes ? styles.warning : styles.success
                        }`}
                    >
                        {totalAssigne}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Restant à assigner</span>
                    <span className={styles.statValue}>{totalTantiemes - totalAssigne}</span>
                </div>
            </div>

            {totalAssigne !== totalTantiemes && (
                <div className={styles.alert}>
                    ⚠️ Attention : Le total des tantièmes assignés ({totalAssigne}) ne correspond
                    pas au total de la copropriété ({totalTantiemes})
                </div>
            )}

            <div className={styles.tableSection}>
                <h2 className={styles.sectionTitle}>Répartition actuelle</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Copropriétaire</th>
                                <th>Tantièmes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coproprietaires.map(copro => (
                                <tr key={copro.id}>
                                    <td>
                                        {editingId === copro.id ? (
                                            <input
                                                type="text"
                                                value={editValues.nom}
                                                onChange={e =>
                                                    setEditValues(prev => ({
                                                        ...prev,
                                                        nom: e.target.value,
                                                    }))
                                                }
                                                className={styles.input}
                                            />
                                        ) : (
                                            copro.nom
                                        )}
                                    </td>
                                    <td>
                                        {editingId === copro.id ? (
                                            <input type="number" value={editValues.tantiemes} onChange={e => setEditValues(prev => ({
                                                        ...prev,
                                                        tantiemes: parseInt(e.target.value) || 0,}))
                                                }
                                                className={styles.input}
                                            />
                                        ) : (
                                            copro.tantiemes
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            {editingId === copro.id ? (
                                                <>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleSave(copro.id)}
                                                        title="Enregistrer"
                                                    >
                                                        <Check size={16} aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => setEditingId(null)}
                                                        title="Annuler"
                                                    >
                                                        <X size={16} aria-hidden="true" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleEdit(copro)}
                                                        title="Modifier"
                                                    >
                                                        <Edit2 size={16} aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleDelete(copro.id)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} aria-hidden="true" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className={styles.totalRow}>
                                <td>
                                    <strong>Total</strong>
                                </td>
                                <td>
                                    <strong>{totalAssigne}</strong>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className={styles.exampleSection}>
                <h2 className={styles.sectionTitle}>Exemple concret de vote en AG</h2>
                <div className={styles.exampleCard}>
                    <p className={styles.exampleText}>
                        Une résolution demande la <strong>majorité de l'article 25</strong>{' '}
                        (majorité absolue).
                    </p>

                    <div className={styles.voteExample}>
                        <div className={styles.voteItem}>
                            <span className={styles.voteName}>Copropriétaire A :</span>
                            <span className={styles.voteChoice}>
                                <span className={styles.votePour}>POUR</span> (400 tantièmes)
                            </span>
                        </div>
                        <div className={styles.voteItem}>
                            <span className={styles.voteName}>Copropriétaire B :</span>
                            <span className={styles.voteChoice}>
                                <span className={styles.voteContre}>CONTRE</span> (350 tantièmes)
                            </span>
                        </div>
                        <div className={styles.voteItem}>
                            <span className={styles.voteName}>Copropriétaire C :</span>
                            <span className={styles.voteChoice}>
                                <span className={styles.votePour}>POUR</span> (250 tantièmes)
                            </span>
                        </div>
                    </div>

                    <div className={styles.calculation}>
                        <h4>Calcul automatique :</h4>
                        <p>
                            POUR = 400 + 250 = <strong>650 tantièmes</strong>
                        </p>
                        <p>
                            CONTRE = <strong>350 tantièmes</strong>
                        </p>
                    </div>

                    <div className={styles.result}>
                        <h4>Résultat :</h4>
                        <p className={styles.resultText}>
                            ➡️ 650 / 1000 = <strong className={styles.adopted}>Résolution adoptée</strong>
                        </p>
                        <p className={styles.resultDetail}>
                            (car 50% + 1 copropriétaire = majorité atteinte)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
