'use client';

import { Search, MoreVertical } from 'lucide-react';
import type { InterventionsTabProps } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
    EN_COURS: { label: 'En cours', color: '#FBBF24' },
    PLANIFIEE: { label: 'Planifiée', color: '#60A5FA' },
    TERMINEE: { label: 'Terminée', color: '#34D399' },
    URGENTE: { label: 'Urgent', color: '#EF4444' },
    URGENT: { label: 'Urgent', color: '#EF4444' },
};

export function InterventionsTab({
    interventions,
    searchTerm,
    statutFilter,
    prestataireFilter,
    equipementFilter,
    anneeFilter,
    years,
    equipements,
    allPrestataires,
    onSearchChange,
    onStatutFilterChange,
    onPrestataireFilterChange,
    onEquipementFilterChange,
    onAnneeFilterChange,
    onEditIntervention,
}: InterventionsTabProps) {
    return (
        <>
            {/* Search + Filters */}
            <div className={styles.v2SearchSection}>
                <div className={styles.v2SearchRow}>
                    <div className={styles.v2SearchInput}>
                        <Search size={16} className={styles.v2SearchIcon} />
                        <input
                            type="text"
                            placeholder="Rechercher une intervention..."
                            className={styles.v2SearchField}
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.v2FilterChips}>
                    <select
                        className={styles.v2Chip}
                        value={statutFilter}
                        onChange={(e) => onStatutFilterChange(e.target.value)}
                    >
                        <option value="TOUS">Tous statuts</option>
                        <option value="PLANIFIEE">Planifiée</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINEE">Terminée</option>
                    </select>
                    <select
                        className={styles.v2Chip}
                        value={prestataireFilter}
                        onChange={(e) => onPrestataireFilterChange(e.target.value)}
                    >
                        <option value="TOUS">Tous prestataires</option>
                        {allPrestataires.map(p => (
                            <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                    </select>
                    <select
                        className={styles.v2Chip}
                        value={equipementFilter}
                        onChange={(e) => onEquipementFilterChange(e.target.value)}
                    >
                        <option value="TOUS">Tous équipements</option>
                        {equipements.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                    <select
                        className={styles.v2Chip}
                        value={anneeFilter}
                        onChange={(e) => onAnneeFilterChange(e.target.value)}
                    >
                        <option value="TOUS">Toutes années</option>
                        {years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.v2ResultsSummary}>
                    <span>{interventions.length} intervention(s)</span>
                    <div className={styles.v2ResultsBadges}>
                        {Object.entries(
                            interventions.reduce<Record<string, number>>((acc, i) => {
                                acc[i.statut] = (acc[i.statut] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([statut, count]) => {
                            const cfg = STATUT_CONFIG[statut];
                            return cfg ? (
                                <span
                                    key={statut}
                                    className={styles.v2ResultBadge}
                                    style={{ color: cfg.color }}
                                >
                                    ● {count} {cfg.label.toLowerCase()}
                                </span>
                            ) : null;
                        })}
                    </div>
                </div>
            </div>

            {/* Table dense */}
            {interventions.length === 0 ? (
                <div className={styles.v2TableWrap}>
                    <div className={styles.v2EmptyState}>
                        Aucune intervention ne correspond aux filtres sélectionnés.
                    </div>
                </div>
            ) : (
                <div className={styles.v2TableWrap}>
                    <table className={styles.v2Table}>
                        <thead>
                            <tr>
                                <th className={styles.v2Th}>Titre</th>
                                <th className={styles.v2Th}>Statut</th>
                                <th className={styles.v2Th}>Date</th>
                                <th className={styles.v2Th}>Intervenant</th>
                                <th className={styles.v2Th}>Équipement</th>
                                <th className={`${styles.v2Th} ${styles.v2ThRight}`}>Coût</th>
                                <th className={styles.v2ThActions}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {interventions.map(intervention => {
                                const statut = STATUT_CONFIG[intervention.statut] || {
                                    label: intervention.statut,
                                    color: '#8892a4',
                                };
                                return (
                                    <tr
                                        key={intervention.id}
                                        className={styles.v2Tr}
                                        onClick={() => onEditIntervention(intervention)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className={styles.v2Td}>
                                            <span className={styles.v2TableTitre}>
                                                {intervention.titre}
                                            </span>
                                        </td>
                                        <td className={styles.v2Td}>
                                            <span
                                                className={styles.v2TableStatut}
                                                style={{
                                                    color: statut.color,
                                                    background: statut.color + '15',
                                                }}
                                            >
                                                {statut.label}
                                            </span>
                                        </td>
                                        <td className={styles.v2Td}>
                                            <span className={styles.v2TableMeta}>
                                                {new Date(intervention.date).toLocaleDateString('fr-FR')}
                                            </span>
                                        </td>
                                        <td className={styles.v2Td}>
                                            <span className={styles.v2TableMeta}>
                                                {intervention.intervenant}
                                            </span>
                                        </td>
                                        <td className={styles.v2Td}>
                                            <span className={styles.v2TableMeta}>
                                                {intervention.equipementConcerne || '—'}
                                            </span>
                                        </td>
                                        <td className={`${styles.v2Td} ${styles.v2TdRight}`}>
                                            <span className={styles.v2TableCout}>
                                                {intervention.cout
                                                    ? `${intervention.cout.toLocaleString('fr-FR')} €`
                                                    : '—'}
                                            </span>
                                        </td>
                                        <td className={styles.v2TdActions}>
                                            <button
                                                className={styles.v2TableActionBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditIntervention(intervention);
                                                }}
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
