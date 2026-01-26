'use client';

import { useMemo } from 'react';
import { PosteBudgetData, PosteBudget, POSTE_COLORS, DonneesRepartition } from './types';
import { RepartitionChartInteractif } from './RepartitionChartInteractif';
import { FiltrePosteBadge } from './FiltrePosteBadge';
import styles from './Budget.module.css';

interface BudgetChartProps {
  postesBudget: PosteBudgetData[];
  budgetAnnuelVote: number;
  totalConsomme: number;
  budgetRestant: number;
  // Props pour le graphique interactif
  posteActif?: PosteBudget | null;
  onPosteSelect?: (posteId: PosteBudget | null) => void;
  onPosteClick?: (poste: PosteBudgetData) => void;
}

export function BudgetChart({
  postesBudget,
  budgetAnnuelVote,
  totalConsomme,
  budgetRestant,
  posteActif = null,
  onPosteSelect,
  onPosteClick,
}: BudgetChartProps) {
  // Construire les données pour le graphique interactif
  const donneesRepartition: DonneesRepartition[] = useMemo(() => {
    return postesBudget
      .filter((p) => p.consomme > 0)
      .map((p) => ({
        posteId: p.poste,
        poste: p.label,
        montant: p.consomme,
        pourcentage: totalConsomme > 0 ? (p.consomme / totalConsomme) * 100 : 0,
        couleur: POSTE_COLORS[p.poste],
        nombreDepenses: 0,
      }))
      .sort((a, b) => b.montant - a.montant);
  }, [postesBudget, totalConsomme]);

  // Informations du poste actif pour le badge
  const posteActifData = useMemo(() => {
    if (!posteActif) return null;
    const data = postesBudget.find((p) => p.poste === posteActif);
    if (!data) return null;
    return {
      label: data.label,
      couleur: POSTE_COLORS[data.poste],
      montant: data.consomme,
    };
  }, [posteActif, postesBudget]);

  // Mode interactif si onPosteSelect est fourni
  const isInteractive = Boolean(onPosteSelect);

  return (
    <div className="card">
      <h2 className={styles.sectionTitle}>Répartition du budget</h2>

      {/* Graphique interactif Donut */}
      {isInteractive && donneesRepartition.length > 0 && (
        <RepartitionChartInteractif
          donnees={donneesRepartition}
          posteActif={posteActif}
          onPosteSelect={onPosteSelect!}
          hauteur={320}
        />
      )}

      {/* Badge de filtre actif */}
      {isInteractive && posteActif && posteActifData && (
        <div style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <FiltrePosteBadge
            poste={posteActifData.label}
            couleur={posteActifData.couleur}
            total={posteActifData.montant}
            nombreDepenses={0}
            onRemove={() => onPosteSelect!(null)}
          />
        </div>
      )}

      {/* Barre horizontale de progression (mode non interactif) */}
      {!isInteractive && (
        <>
          <div className={styles.stackedBarContainer}>
            <div className={styles.stackedBar}>
              {postesBudget.map((poste) => {
                const width = (poste.consomme / budgetAnnuelVote) * 100;
                return (
                  <div
                    key={poste.poste}
                    className={styles.stackedBarSegment}
                    style={{
                      width: `${width}%`,
                      backgroundColor: POSTE_COLORS[poste.poste],
                    }}
                    title={`${poste.label}: ${poste.consomme.toLocaleString()} € (${width.toFixed(1)}%)`}
                    onClick={() => onPosteClick?.(poste)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPosteClick?.(poste);
                      }
                    }}
                    aria-label={`Voir le détail du poste ${poste.label}`}
                  />
                );
              })}
              <div
                className={styles.stackedBarSegment}
                style={{
                  width: `${(budgetRestant / budgetAnnuelVote) * 100}%`,
                  backgroundColor: 'var(--bg-secondary)',
                  cursor: 'default',
                }}
                title={`Restant: ${budgetRestant.toLocaleString()} €`}
              />
            </div>
            <div className={styles.stackedBarLabels}>
              <span>0 €</span>
              <span>{(budgetAnnuelVote / 2).toLocaleString()} €</span>
              <span>{budgetAnnuelVote.toLocaleString()} €</span>
            </div>
          </div>

          <div className={styles.chartLegend}>
            {postesBudget.map((poste) => (
              <div
                key={poste.poste}
                className={styles.legendItem}
                onClick={() => onPosteClick?.(poste)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPosteClick?.(poste);
                  }
                }}
                aria-label={`Voir le détail du poste ${poste.label}`}
                style={{ cursor: onPosteClick ? 'pointer' : 'default' }}
              >
                <span
                  className={styles.legendColor}
                  style={{ backgroundColor: POSTE_COLORS[poste.poste] }}
                />
                <span className={styles.legendLabel}>{poste.label}</span>
                <span className={styles.legendValue}>{poste.consomme.toLocaleString()} €</span>
                <span className={styles.legendPercent}>
                  ({((poste.consomme / totalConsomme) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
            <div className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}
              />
              <span className={styles.legendLabel}>Disponible</span>
              <span className={styles.legendValue}>{budgetRestant.toLocaleString()} €</span>
              <span className={styles.legendPercent}>
                ({((budgetRestant / budgetAnnuelVote) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
