'use client';

import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, X, RefreshCw, Home } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { useLots, type LotWithOwner } from '@/hooks/modules/useLotsData';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import styles from './tantiemes.module.css';

interface EditValues {
  ref: string;
  tantiemes: number;
}

export default function TantiemesPage() {
  const { currentCoproId, isManager } = useCopro();
  const { lots, isLoading, error, refresh, updateLot, isMutating, stats } = useLots();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({ ref: '', tantiemes: 0 });

  // Calculate stats
  const totalTantiemes = stats.totalTantiemes;
  const totalLots = stats.totalLots;

  // Aggregate by owner for display
  const ownerAggregates = useMemo(() => {
    const aggregates = new Map<string, {
      id: string;
      nom: string;
      tantiemes: number;
      lotsCount: number;
    }>();

    lots.forEach(lot => {
      const ownerId = lot.coproprietaire_id || 'sans-proprietaire';
      const ownerName = lot.owner_display_name || 'Sans propriétaire';

      if (aggregates.has(ownerId)) {
        const existing = aggregates.get(ownerId)!;
        existing.tantiemes += lot.tantiemes_generaux;
        existing.lotsCount += 1;
      } else {
        aggregates.set(ownerId, {
          id: ownerId,
          nom: ownerName,
          tantiemes: lot.tantiemes_generaux,
          lotsCount: 1,
        });
      }
    });

    return Array.from(aggregates.values()).sort((a, b) => b.tantiemes - a.tantiemes);
  }, [lots]);

  const handleEdit = (lot: LotWithOwner) => {
    if (!isManager) return;
    setEditingId(lot.id);
    setEditValues({ ref: lot.ref, tantiemes: lot.tantiemes_generaux });
  };

  const handleSave = async (lotId: string) => {
    if (!isManager) return;
    const success = await updateLot(lotId, {
      ref: editValues.ref,
      tantiemes_generaux: editValues.tantiemes,
    });
    if (success) {
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ ref: '', tantiemes: 0 });
  };

  // Mode Single Copro: si pas encore chargé ou en cours de chargement
  if (!currentCoproId || isLoading) {
    return (
      <div className="container">
        <LoadingState message="Chargement des tantièmes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tantièmes et clés de répartition</h1>
          <p className={styles.subtitle}>
            Gestion de la répartition des charges et pondération des votes en AG
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => refresh()}
          disabled={isLoading}
          title="Rafraîchir"
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} aria-hidden="true" />
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
              Les tantièmes sont enregistrés sur chaque lot pour permettre au logiciel de calculer automatiquement
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
              Le système calcule automatiquement les résultats selon la
              majorité applicable (24, 25, 25-1, 26, unanimité).
            </p>
          </div>
        </div>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total tantièmes</span>
          <span className={styles.statValue}>{totalTantiemes.toLocaleString('fr-FR')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Nombre de lots</span>
          <span className={styles.statValue}>{totalLots}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Copropriétaires</span>
          <span className={styles.statValue}>{ownerAggregates.length}</span>
        </div>
      </div>

      {/* Lots Table */}
      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Tantièmes par lot</h2>
        {lots.length === 0 ? (
          <EmptyState
            title="Aucun lot"
            message="Aucun lot n'a été créé pour cette copropriété."
          />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Type</th>
                  <th>Propriétaire</th>
                  <th>Tantièmes</th>
                  <th>%</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => (
                  <tr key={lot.id}>
                    <td>
                      <div className={styles.lotCell}>
                        <Home size={16} className={styles.lotIcon} />
                        {editingId === lot.id ? (
                          <input
                            type="text"
                            value={editValues.ref}
                            onChange={e => setEditValues(prev => ({ ...prev, ref: e.target.value }))}
                            className={styles.input}
                          />
                        ) : (
                          <span>{lot.ref}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>
                        {lot.type || 'N/A'}
                      </span>
                    </td>
                    <td>{lot.owner_display_name || <span className={styles.noOwner}>Sans propriétaire</span>}</td>
                    <td>
                      {editingId === lot.id ? (
                        <input
                          type="number"
                          value={editValues.tantiemes}
                          onChange={e => setEditValues(prev => ({ ...prev, tantiemes: parseInt(e.target.value) || 0 }))}
                          className={styles.input}
                          min="0"
                        />
                      ) : (
                        <strong>{lot.tantiemes_generaux.toLocaleString('fr-FR')}</strong>
                      )}
                    </td>
                    <td>
                      {totalTantiemes > 0
                        ? `${((lot.tantiemes_generaux / totalTantiemes) * 100).toFixed(2)}%`
                        : '-'}
                    </td>
                    {isManager && (
                      <td>
                        <div className={styles.actions}>
                          {editingId === lot.id ? (
                            <>
                              <button
                                className={styles.actionBtn}
                                onClick={() => handleSave(lot.id)}
                                title="Enregistrer"
                                disabled={isMutating}
                              >
                                <Check size={16} aria-hidden="true" />
                              </button>
                              <button
                                className={styles.actionBtn}
                                onClick={handleCancel}
                                title="Annuler"
                              >
                                <X size={16} aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <button
                              className={styles.actionBtn}
                              onClick={() => handleEdit(lot)}
                              title="Modifier"
                            >
                              <Edit2 size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td><strong>{totalTantiemes.toLocaleString('fr-FR')}</strong></td>
                  <td><strong>100%</strong></td>
                  {isManager && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Owners Summary */}
      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Tantièmes par copropriétaire</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Copropriétaire</th>
                <th>Lots</th>
                <th>Tantièmes</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {ownerAggregates.map(owner => (
                <tr key={owner.id}>
                  <td>{owner.nom}</td>
                  <td>{owner.lotsCount}</td>
                  <td><strong>{owner.tantiemes.toLocaleString('fr-FR')}</strong></td>
                  <td>
                    {totalTantiemes > 0
                      ? `${((owner.tantiemes / totalTantiemes) * 100).toFixed(2)}%`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td><strong>Total</strong></td>
                <td><strong>{totalLots}</strong></td>
                <td><strong>{totalTantiemes.toLocaleString('fr-FR')}</strong></td>
                <td><strong>100%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={styles.exampleSection}>
        <h2 className={styles.sectionTitle}>Exemple concret de vote en AG</h2>
        <div className={styles.exampleCard}>
          <p className={styles.exampleText}>
            Une résolution demande la <strong>majorité de l'article 25</strong> (majorité absolue).
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
            <p>POUR = 400 + 250 = <strong>650 tantièmes</strong></p>
            <p>CONTRE = <strong>350 tantièmes</strong></p>
          </div>

          <div className={styles.result}>
            <h4>Résultat :</h4>
            <p className={styles.resultText}>
              650 / 1000 = <strong className={styles.adopted}>Résolution adoptée</strong>
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
