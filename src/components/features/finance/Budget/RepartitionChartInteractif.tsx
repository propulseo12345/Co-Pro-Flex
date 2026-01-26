'use client';

import { useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DonneesRepartition, PosteBudget } from './types';
import styles from './RepartitionChartInteractif.module.css';

interface RepartitionChartInteractifProps {
  donnees: DonneesRepartition[];
  posteActif: PosteBudget | null;
  onPosteSelect: (posteId: PosteBudget | null) => void;
  hauteur?: number;
}

/**
 * Formate un montant en euros
 */
function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant);
}

/**
 * Tooltip personnalisé
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DonneesRepartition }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipColor} style={{ backgroundColor: data.couleur }} />
      <div className={styles.tooltipContent}>
        <span className={styles.tooltipLabel}>{data.poste}</span>
        <span className={styles.tooltipValue}>{formatMontant(data.montant)}</span>
        <span className={styles.tooltipPercent}>{data.pourcentage.toFixed(1)}%</span>
      </div>
    </div>
  );
};

/**
 * Composant principal du graphique de répartition interactif
 */
export function RepartitionChartInteractif({
  donnees,
  posteActif,
  onPosteSelect,
  hauteur = 350,
}: RepartitionChartInteractifProps) {
  // Handler de clic sur un segment
  const handlePieClick = useCallback(
    (_data: any, index: number) => {
      const posteId = donnees[index].posteId;

      // Toggle : si même poste, désélectionner
      if (posteId === posteActif) {
        onPosteSelect(null);
      } else {
        onPosteSelect(posteId);
      }
    },
    [donnees, posteActif, onPosteSelect]
  );

  // Handler de clic sur la légende
  const handleLegendClick = useCallback(
    (data: any) => {
      const posteId = data.payload?.posteId;
      if (!posteId) return;

      if (posteId === posteActif) {
        onPosteSelect(null);
      } else {
        onPosteSelect(posteId);
      }
    },
    [posteActif, onPosteSelect]
  );

  // Si pas de données
  if (!donnees || donnees.length === 0) {
    return (
      <div className={styles.noData}>
        <p>Aucune donnée de répartition disponible</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={hauteur}>
        <PieChart>
          <Pie
            data={donnees}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={120}
            dataKey="montant"
            nameKey="poste"
            onClick={handlePieClick}
            paddingAngle={2}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
            }
            labelLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
          >
            {donnees.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.couleur}
                opacity={posteActif !== null && entry.posteId !== posteActif ? 0.35 : 1}
                stroke={entry.posteId === posteActif ? entry.couleur : '#fff'}
                strokeWidth={entry.posteId === posteActif ? 4 : 2}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />

          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            onClick={handleLegendClick}
            wrapperStyle={{
              cursor: 'pointer',
              paddingLeft: '20px',
            }}
            formatter={(value, entry: any) => {
              const isActive = entry.payload?.posteId === posteActif;
              return (
                <span
                  className={styles.legendItem}
                  style={{
                    fontWeight: isActive ? 600 : 400,
                    opacity: posteActif && !isActive ? 0.5 : 1,
                  }}
                >
                  {value}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Affichage du poste sélectionné */}
      {posteActif && (
        <div className={styles.selectedInfo}>
          {(() => {
            const selected = donnees.find((d) => d.posteId === posteActif);
            if (!selected) return null;
            return (
              <>
                <strong style={{ color: selected.couleur }}>{selected.poste}</strong>
                <span>{formatMontant(selected.montant)}</span>
                <span>({selected.pourcentage.toFixed(1)}%)</span>
              </>
            );
          })()}
        </div>
      )}

      {/* Instructions */}
      <p className={styles.instructions}>
        Cliquez sur un segment ou la légende pour filtrer les dépenses
      </p>
    </div>
  );
}
