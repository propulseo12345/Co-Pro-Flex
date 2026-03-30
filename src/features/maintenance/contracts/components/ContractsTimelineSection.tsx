'use client';

import { FileText, Shield, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import clsx from 'clsx';
import type { ContratDetaille, StatutContrat, TypeContrat } from '@/types';
import type { CategorieContrat } from '@/lib/constants/categories-contrat';
import ActionsDropdown from '@/components/features/maintenance/Contracts/ActionsDropdown';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsTimelineSectionProps {
  filteredContrats: ContratDetaille[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statutFilter: StatutContrat | 'TOUS';
  onStatutChange: (value: StatutContrat | 'TOUS') => void;
  categorieFilter: CategorieContrat | 'TOUS';
  onCategorieChange: (value: CategorieContrat | 'TOUS') => void;
  typeFilter: TypeContrat | 'TOUS';
  onTypeChange: (value: TypeContrat | 'TOUS') => void;
  prestataireFilter: string;
  onPrestataireChange: (value: string) => void;
  uniquePrestataires: string[];
  onVoirDetails: (contrat: { id: string }) => void;
  onModifier: (contrat: ContratDetaille) => void;
  onResilier: (contrat: ContratDetaille) => void;
  onTelecharger: (contrat: ContratDetaille) => void;
}

const STATUT_PRIORITY: Record<string, number> = {
  EXPIRE: 0, A_RENOUVELER: 1, ACTIF: 2, RESILIE: 3,
};

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIF: { label: 'Actif', color: '#3ecf8e' },
  A_RENOUVELER: { label: 'À renouveler', color: '#e5a63e' },
  EXPIRE: { label: 'Expiré', color: '#e35d6a' },
  RESILIE: { label: 'Résilié', color: '#7b8498' },
};

const SECTION_LABELS: Record<string, string> = {
  EXPIRE: 'Expirés — action requise',
  A_RENOUVELER: 'À renouveler',
  ACTIF: 'Actifs',
  RESILIE: 'Résiliés',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR') + ' €';
}

export default function ContractsTimelineSection({
  filteredContrats,
  searchTerm,
  onSearchChange,
  statutFilter,
  onStatutChange,
  typeFilter,
  onTypeChange,
  onVoirDetails,
  onModifier,
  onResilier,
  onTelecharger,
}: ContractsTimelineSectionProps) {
  const sorted = [...filteredContrats].sort((a, b) => {
    const pa = STATUT_PRIORITY[a.statut] ?? 4;
    const pb = STATUT_PRIORITY[b.statut] ?? 4;
    if (pa !== pb) return pa - pb;
    return new Date(a.dateFin).getTime() - new Date(b.dateFin).getTime();
  });

  // Group by status
  const groups: Array<{ statut: string; items: ContratDetaille[] }> = [];
  let currentStatut = '';
  for (const c of sorted) {
    if (c.statut !== currentStatut) {
      currentStatut = c.statut;
      groups.push({ statut: c.statut, items: [] });
    }
    groups[groups.length - 1].items.push(c);
  }

  return (
    <div className={styles.v2ListPanel}>
      <div className={styles.v2ListHeader}>
        <span className={styles.v2ListTitle}>
          <FileText size={14} />
          Contrats & Échéances
          <span className={styles.v2ListCount}>{filteredContrats.length}</span>
        </span>
        <div className={styles.v2Filters}>
          <div className={styles.v2SearchBox}>
            <Search size={13} />
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher..."
            />
          </div>
          <select
            className={styles.v2FilterChip}
            value={statutFilter}
            onChange={(e) => onStatutChange(e.target.value as StatutContrat | 'TOUS')}
          >
            <option value="TOUS">Tous statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="A_RENOUVELER">À renouveler</option>
            <option value="EXPIRE">Expirés</option>
            <option value="RESILIE">Résiliés</option>
          </select>
          <select
            className={styles.v2FilterChip}
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TypeContrat | 'TOUS')}
          >
            <option value="TOUS">Tous types</option>
            <option value="ASCENSEUR">Ascenseur</option>
            <option value="ASSURANCE">Assurance</option>
            <option value="CHAUFFAGE">Chauffage</option>
            <option value="MENAGE">Nettoyage</option>
            <option value="ELECTRICITE">Électricité</option>
            <option value="ESPACES_VERTS">Espaces verts</option>
            <option value="JURIDIQUE">Juridique</option>
          </select>
        </div>
      </div>

      <div className={styles.v2ListBody}>
        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={40} />
            <p>Aucun contrat trouvé</p>
            <span>Modifiez vos filtres ou ajoutez un nouveau contrat</span>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.statut}>
              <div className={styles.v2SectionLabel}>
                {group.statut === 'EXPIRE' && <AlertTriangle size={10} style={{ marginRight: 4, verticalAlign: -1 }} />}
                {SECTION_LABELS[group.statut] || group.statut}
              </div>
              {group.items.map((contrat) => {
                const config = STATUT_CONFIG[contrat.statut] ?? { label: contrat.statut, color: '#7b8498' };
                const isExpired = contrat.statut === 'EXPIRE';

                return (
                  <div
                    key={contrat.id}
                    className={clsx(styles.v2Row, isExpired && styles.v2RowExpired)}
                    onClick={() => onVoirDetails(contrat)}
                  >
                    <div className={styles.v2RowIndicator} style={{ background: config.color }} />
                    <div className={styles.v2RowMain}>
                      <div className={styles.v2RowTitle}>
                        {contrat.nom}
                        {contrat.estReglementaire && (
                          <span className={styles.v2ReglBadge}><Shield size={8} /> Régl.</span>
                        )}
                        {contrat.taciteReconduction && (
                          <span className={styles.v2Tacite}><RefreshCw size={10} /> tacite</span>
                        )}
                      </div>
                      <div className={styles.v2RowSub}>{contrat.fournisseur}</div>
                    </div>
                    <span
                      className={styles.v2RowBadge}
                      style={{ color: config.color, background: config.color + '12' }}
                    >
                      {config.label}
                    </span>
                    <span className={styles.v2RowDate}>{formatDate(contrat.dateFin)}</span>
                    <span className={contrat.coutAnnuel > 0 ? styles.v2RowAmount : styles.v2RowAmountZero}>
                      {contrat.coutAnnuel > 0 ? formatMontant(contrat.coutAnnuel) : '—'}
                    </span>
                    <div className={styles.v2RowActions} onClick={(e) => e.stopPropagation()}>
                      <ActionsDropdown
                        contrat={contrat}
                        onModifier={() => onModifier(contrat)}
                        onResilier={() => onResilier(contrat)}
                        onTelecharger={() => onTelecharger(contrat)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
