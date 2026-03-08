'use client';

import { useState, useCallback } from 'react';
import { FileText, ChevronDown, ChevronRight, Eye, Edit, Trash2, Send, Download, Mail, Users } from 'lucide-react';
import { StatutAppelBadge } from './StatutAppelBadge';
import { formatCurrency, formatDate, peutEmettreAppelFonds } from './utils';
import type { GroupedAppelFonds, AppelFonds } from './types';
import styles from './AppelsFondsGroupedTable.module.css';

interface AppelsFondsGroupedTableProps {
  groups: GroupedAppelFonds[];
  onGestionClick: (appel: AppelFonds) => void;
  onMontantClick: (appel: AppelFonds) => void;
  onViewAppel: (appel: AppelFonds) => void;
  onEditAppel: (appel: AppelFonds) => void;
  onDeleteAppel: (appel: AppelFonds) => void;
  onEmettreAppel?: (appel: AppelFonds) => void;
  onVoirRelances?: (appel: AppelFonds) => void;
  onExportAvis?: (appel: AppelFonds) => void;
}

export function AppelsFondsGroupedTable({
  groups,
  onGestionClick,
  onMontantClick,
  onViewAppel,
  onEditAppel,
  onDeleteAppel,
  onEmettreAppel,
  onVoirRelances,
  onExportAvis,
}: AppelsFondsGroupedTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleExpand = useCallback((keyId: string) => {
    setExpandedKey(prev => prev === keyId ? null : keyId);
  }, []);

  if (groups.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FileText size={48} />
        <p>Aucun appel de fonds trouvé</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {groups.map(group => {
        const isExpanded = expandedKey === group.keyId;
        const tauxRecouvrement = group.montantAnnuel > 0
          ? Math.round((group.montantEncaisse / group.montantAnnuel) * 100)
          : 0;

        return (
          <div key={group.keyId} className={`${styles.group} ${isExpanded ? styles.groupExpanded : ''}`}>
            {/* Group header — clickable */}
            <button className={styles.groupHeader} onClick={() => toggleExpand(group.keyId)} type="button">
              <div className={styles.groupLeft}>
                <span className={styles.chevron}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <div className={styles.groupInfo}>
                  <span className={styles.groupName}>{group.keyName}</span>
                  <span className={styles.groupPeriode}>{group.periode}</span>
                </div>
              </div>
              <div className={styles.groupRight}>
                <div className={styles.groupMeta}>
                  <span className={styles.groupTrimestres}>
                    {group.nbTrimestres} {group.nbTrimestres > 1 ? 'appels' : 'appel'}
                  </span>
                  <StatutAppelBadge statut={group.statutGlobal} size="sm" />
                </div>
                <div className={styles.groupAmounts}>
                  <span className={styles.groupTotal}>{formatCurrency(group.montantAnnuel)}</span>
                  {group.montantEncaisse > 0 && (
                    <span className={styles.groupRecouvrement}>
                      {tauxRecouvrement}% encaissé
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Expanded: trimester rows */}
            {isExpanded && (
              <div className={styles.trimestres}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Période</th>
                      <th>Émission</th>
                      <th>Échéance</th>
                      <th>Statut</th>
                      <th className={styles.textRight}>Montant</th>
                      <th className={styles.textRight}>Encaissé</th>
                      <th className={styles.textCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.trimestres.map(appel => (
                      <tr key={appel.id}>
                        <td className={styles.periodeCell}>{appel.periode}</td>
                        <td className={styles.dateCell}>
                          {appel.dateEmission ? formatDate(appel.dateEmission) : '-'}
                        </td>
                        <td className={styles.dateCell}>{formatDate(appel.dateLimiteReglement)}</td>
                        <td>
                          <StatutAppelBadge statut={appel.statut} size="sm" />
                        </td>
                        <td className={styles.textRight}>
                          <button
                            className={styles.montantButton}
                            onClick={() => onMontantClick(appel)}
                            title="Voir la répartition"
                          >
                            {formatCurrency(appel.montantTotal)}
                          </button>
                        </td>
                        <td className={styles.textRight}>
                          <span className={appel.montantEncaisse && appel.montantEncaisse > 0 ? styles.encaisse : styles.zero}>
                            {formatCurrency(appel.montantEncaisse || 0)}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {peutEmettreAppelFonds(appel.statut) && onEmettreAppel && (
                              <button className={`${styles.actionBtn} ${styles.emitBtn}`} title="Émettre" onClick={() => onEmettreAppel(appel)}>
                                <Send size={15} />
                              </button>
                            )}
                            <button className={styles.actionBtn} title="Suivi envois" onClick={() => onGestionClick(appel)}>
                              <Users size={15} />
                            </button>
                            {onExportAvis && (
                              <button className={styles.actionBtn} title="Exporter" onClick={() => onExportAvis(appel)}>
                                <Download size={15} />
                              </button>
                            )}
                            {onVoirRelances && (
                              <button className={styles.actionBtn} title="Relances" onClick={() => onVoirRelances(appel)}>
                                <Mail size={15} />
                              </button>
                            )}
                            <button className={styles.actionBtn} title="Voir" onClick={() => onViewAppel(appel)}>
                              <Eye size={15} />
                            </button>
                            <button className={styles.actionBtn} title="Modifier" onClick={() => onEditAppel(appel)}>
                              <Edit size={15} />
                            </button>
                            <button className={styles.actionBtn} title="Supprimer" onClick={() => onDeleteAppel(appel)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
