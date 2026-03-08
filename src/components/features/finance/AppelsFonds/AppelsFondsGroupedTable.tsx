'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, Users, ArrowRight } from 'lucide-react';
import { StatutAppelBadge } from './StatutAppelBadge';
import { formatCurrency, formatDate, peutEmettreAppelFonds } from './utils';
import type { GroupedAppelFonds, AppelFonds } from './types';
import styles from './AppelsFondsGroupedTable.module.css';

interface AppelsFondsGroupedTableProps {
  groups: GroupedAppelFonds[];
  onEmettreAppel?: (appel: AppelFonds) => void;
}

interface TrimesterRow {
  periode: string;
  appels: AppelFonds[];
  montantTotal: number;
  montantEncaisse: number;
  dateEmission: string | undefined;
  dateLimiteReglement: string;
  statutGlobal: string;
  /** First appel ID for navigation */
  firstAppelId: string;
}

/** Pick the "worst" status across multiple calls */
function worstStatus(appels: AppelFonds[]): string {
  const statuts = appels.map(a => (a.statut || '').toString().toUpperCase());
  if (statuts.some(s => s === 'A_GENERER' || s === 'EN_PREPARATION' || s === 'draft')) return 'A_GENERER';
  if (statuts.some(s => s === 'EMIS' || s === 'ENVOYE' || s === 'issued')) return 'EMIS';
  if (statuts.some(s => s === 'PARTIELLEMENT_PAYE' || s === 'partially_paid')) return 'PARTIELLEMENT_PAYE';
  if (statuts.every(s => s === 'SOLDE' || s === 'PAYE' || s === 'paid')) return 'SOLDE';
  if (statuts.some(s => s === 'ANNULE' || s === 'cancelled')) return 'ANNULE';
  return appels[0]?.statut || 'A_GENERER';
}

/** Check if ALL calls in trimester can be emitted */
function canEmitTrimester(appels: AppelFonds[]): boolean {
  return appels.every(a => peutEmettreAppelFonds(a.statut));
}

function getContextualLabel(statut: string): { label: string; icon: 'send' | 'users' | 'arrow' } {
  const s = statut.toUpperCase();
  if (s === 'A_GENERER' || s === 'EN_PREPARATION' || s === 'draft') return { label: 'Générer', icon: 'send' };
  if (s === 'EMIS' || s === 'ENVOYE' || s === 'issued') return { label: 'Gérer envois', icon: 'users' };
  if (s === 'PARTIELLEMENT_PAYE' || s === 'partially_paid') return { label: 'Suivi', icon: 'users' };
  return { label: 'Voir', icon: 'arrow' };
}

const ICON_MAP = { send: Send, users: Users, arrow: ArrowRight } as const;

export function AppelsFondsGroupedTable({
  groups,
  onEmettreAppel,
}: AppelsFondsGroupedTableProps) {
  const router = useRouter();

  // Regroup by trimester period (T1, T2...) instead of by key
  const trimesterRows = useMemo<TrimesterRow[]>(() => {
    const allAppels = groups.flatMap(g => g.trimestres);
    const map = new Map<string, AppelFonds[]>();

    allAppels.forEach(appel => {
      const key = appel.periode; // "T1 2027", "T2 2027", etc.
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appel);
    });

    return Array.from(map.entries())
      .map(([periode, appels]) => ({
        periode,
        appels,
        montantTotal: appels.reduce((sum, a) => sum + a.montantTotal, 0),
        montantEncaisse: appels.reduce((sum, a) => sum + (a.montantEncaisse || 0), 0),
        dateEmission: appels[0].dateEmission,
        dateLimiteReglement: appels[0].dateLimiteReglement,
        statutGlobal: worstStatus(appels),
        firstAppelId: appels[0].id,
      }))
      .sort((a, b) => a.periode.localeCompare(b.periode));
  }, [groups]);

  if (trimesterRows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FileText size={48} />
        <p>Aucun appel de fonds trouvé</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Période</th>
              <th>Émission</th>
              <th>Échéance</th>
              <th>Statut</th>
              <th className={styles.textRight}>Montant</th>
              <th className={styles.textRight}>Encaissé</th>
              <th className={styles.textCenter}>Action</th>
            </tr>
          </thead>
          <tbody>
            {trimesterRows.map(row => {
              const ctx = getContextualLabel(row.statutGlobal);
              const IconComponent = ICON_MAP[ctx.icon];
              const canEmit = canEmitTrimester(row.appels);

              return (
                <tr
                  key={row.periode}
                  className={styles.clickableRow}
                  onClick={() => router.push(`/finance/appels-fonds/${row.firstAppelId}`)}
                >
                  <td className={styles.periodeCell}>{row.periode}</td>
                  <td className={styles.dateCell}>
                    {row.dateEmission ? formatDate(row.dateEmission) : '-'}
                  </td>
                  <td className={styles.dateCell}>{formatDate(row.dateLimiteReglement)}</td>
                  <td>
                    <StatutAppelBadge statut={row.statutGlobal} size="sm" />
                  </td>
                  <td className={styles.textRight}>
                    <span className={styles.montantValue}>
                      {formatCurrency(row.montantTotal)}
                    </span>
                  </td>
                  <td className={styles.textRight}>
                    <span className={row.montantEncaisse > 0 ? styles.encaisse : styles.zero}>
                      {formatCurrency(row.montantEncaisse)}
                    </span>
                  </td>
                  <td className={styles.textCenter}>
                    {canEmit && onEmettreAppel ? (
                      <button
                        className={`${styles.contextBtn} ${styles.emitBtn}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Emit first appel — TODO: emit all at once
                          onEmettreAppel(row.appels[0]);
                        }}
                      >
                        <Send size={14} />
                        <span>Générer</span>
                      </button>
                    ) : (
                      <span className={styles.contextLink}>
                        <IconComponent size={14} />
                        <span>{ctx.label}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
