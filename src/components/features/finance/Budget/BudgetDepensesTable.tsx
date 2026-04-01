'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Edit2, Send, ChevronDown, ChevronUp, Layers, User,
  Filter, ArrowUpDown, Search
} from 'lucide-react';
import { TruncatedText } from '@/components/ui';
import type { DepenseEtendue } from '@/types/models/finance';
import { PosteBudgetData, POSTE_COLORS, PosteBudget } from './types';
import { DepenseStatusBadge } from './DepenseStatusBadge';
import { PieceJustificativeCell } from './PieceJustificativeCell';
import { PieceJustificativeModal } from './PieceJustificativeModal';
import { usePieceJustificative } from '@/hooks/usePieceJustificative';
import { piecesJustificativesService } from '@/lib/services/pieces-justificatives.service';
import { PieceJustificative, DepenseAvecPJ, RoleAccesPJ } from '@/types/models/piece-justificative';
import styles from './Budget.module.css';

type GroupBy = 'none' | 'fournisseur' | 'categorie';
type SortField = 'date' | 'libelle' | 'fournisseur' | 'poste' | 'statut' | 'montant';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'BROUILLON' | 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

interface BudgetDepensesTableProps {
  depenses: DepenseEtendue[];
  postesBudget: PosteBudgetData[];
  onSelectDepense: (depense: DepenseEtendue) => void;
  onEditDepense?: (depense: DepenseEtendue) => void;
  onCreateDepense?: () => void;
  onSubmitForValidation?: (depenseId: string) => void;
  role?: RoleAccesPJ;
}

interface GroupedDepenses {
  key: string;
  label: string;
  color?: string;
  depenses: DepenseEtendue[];
  total: number;
  isCollapsed: boolean;
}

export function BudgetDepensesTable({
  depenses,
  postesBudget,
  onSelectDepense,
  onEditDepense,
  onCreateDepense,
  onSubmitForValidation,
  role = 'gestionnaire',
}: BudgetDepensesTableProps) {
  // État pour les dépenses enrichies avec leurs PJ
  const [depensesAvecPJ, setDepensesAvecPJ] = useState<Map<string, PieceJustificative[]>>(
    new Map()
  );
  const [piecesDepenseActive, setPiecesDepenseActive] = useState<PieceJustificative[]>([]);

  // États pour le tri, filtrage et groupement
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Hook pour gérer la visualisation des PJ
  const {
    selectedPiece,
    isModalOpen,
    ouvrirPiece,
    fermerModal,
    telechargerPiece,
    ouvrirDansNouvelOnglet,
    peutVoir,
    peutTelecharger,
  } = usePieceJustificative({ role });

  // Charger les PJ au montage
  useEffect(() => {
    const chargerPJ = async () => {
      try {
        const enrichies = await piecesJustificativesService.getDepensesAvecPJ(depenses);
        const pjMap = new Map<string, PieceJustificative[]>();
        enrichies.forEach((d: DepenseAvecPJ) => {
          pjMap.set(d.id, d.piecesJustificatives);
        });
        setDepensesAvecPJ(pjMap);
      } catch {
        setDepensesAvecPJ(new Map());
      }
    };

    chargerPJ();
  }, [depenses]);

  // Calcul des statistiques par statut
  const statusCounts = useMemo(() => {
    const counts = { BROUILLON: 0, EN_ATTENTE: 0, VALIDEE: 0, REJETEE: 0 };
    depenses.forEach(d => {
      const status = d.statut || 'BROUILLON';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [depenses]);

  // Filtrage des dépenses
  const filteredDepenses = useMemo(() => {
    if (statusFilter === 'all') return depenses;
    return depenses.filter(d => (d.statut || 'BROUILLON') === statusFilter);
  }, [depenses, statusFilter]);

  // Tri des dépenses
  const sortedDepenses = useMemo(() => {
    return [...filteredDepenses].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'libelle':
          comparison = a.libelle.localeCompare(b.libelle);
          break;
        case 'fournisseur':
          comparison = a.fournisseur.localeCompare(b.fournisseur);
          break;
        case 'poste':
          comparison = (a.poste || '').localeCompare(b.poste || '');
          break;
        case 'statut':
          comparison = (a.statut || 'BROUILLON').localeCompare(b.statut || 'BROUILLON');
          break;
        case 'montant':
          comparison = a.montant - b.montant;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredDepenses, sortField, sortDirection]);

  // Groupement des dépenses
  const groupedData = useMemo((): GroupedDepenses[] => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: 'Toutes les dépenses',
        depenses: sortedDepenses,
        total: sortedDepenses.reduce((sum, d) => sum + d.montant, 0),
        isCollapsed: false,
      }];
    }

    const groups = new Map<string, DepenseEtendue[]>();

    sortedDepenses.forEach(depense => {
      const key = groupBy === 'fournisseur' ? depense.fournisseur : (depense.poste || 'divers');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(depense);
    });

    return Array.from(groups.entries())
      .map(([key, deps]) => {
        const posteData = postesBudget.find(p => p.poste === key);
        return {
          key,
          label: groupBy === 'categorie' ? (posteData?.label || key) : key,
          color: groupBy === 'categorie' ? POSTE_COLORS[key as PosteBudget] : undefined,
          depenses: deps,
          total: deps.reduce((sum, d) => sum + d.montant, 0),
          isCollapsed: collapsedGroups.has(key),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [sortedDepenses, groupBy, postesBudget, collapsedGroups]);

  // Total général
  const grandTotal = useMemo(() => {
    return filteredDepenses.reduce((sum, d) => sum + d.montant, 0);
  }, [filteredDepenses]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const isEditable = (depense: DepenseEtendue): boolean => {
    return depense.statut === 'BROUILLON' || depense.statut === 'REJETEE';
  };

  const canSubmit = (depense: DepenseEtendue): boolean => {
    const pieces = depensesAvecPJ.get(depense.id) || [];
    const hasPJ =
      pieces.length > 0 || depense.pieceJointe || depense.pieceJointeDetails;
    return !!(hasPJ && depense.statut === 'BROUILLON');
  };

  const handleVoirPJ = (depenseId: string, piece: PieceJustificative) => {
    const pieces = depensesAvecPJ.get(depenseId) || [];
    setPiecesDepenseActive(pieces);
    ouvrirPiece(piece);
  };

  const handleChangePiece = (piece: PieceJustificative) => {
    ouvrirPiece(piece);
  };

  const getPiecesForDepense = (depense: DepenseEtendue): PieceJustificative[] => {
    return depensesAvecPJ.get(depense.id) || [];
  };

  const getPosteLabel = (poste: string): string => {
    return postesBudget.find(p => p.poste === poste)?.label || poste;
  };

  const renderSortHeader = (field: SortField, label: string) => {
    const isActive = sortField === field;
    return (
      <div
        className={`${styles.tableHeaderCell} ${isActive ? styles.sortActive : ''} ${isActive && sortDirection === 'desc' ? styles.sortDesc : ''}`}
        onClick={() => handleSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(field);
          }
        }}
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? <ChevronUp size={12} className={styles.sortIcon} /> : <ChevronDown size={12} className={styles.sortIcon} />
        ) : (
          <ArrowUpDown size={12} className={styles.sortIcon} />
        )}
      </div>
    );
  };

  const renderCategoryBadge = (poste: string) => {
    const color = POSTE_COLORS[poste as PosteBudget] || '#6B7280';
    const label = getPosteLabel(poste);
    return (
      <span
        className={styles.categoryBadge}
        style={{
          background: `${color}15`,
          color: color,
          borderColor: `${color}30`
        }}
      >
        <span className={styles.categoryDot} style={{ background: color }} />
        {label}
      </span>
    );
  };

  const renderDepenseRow = (depense: DepenseEtendue) => {
    const pieces = getPiecesForDepense(depense);

    return (
      <div
        key={depense.id}
        className={`${styles.tableRow} ${depense.statut === 'REJETEE' ? styles.rowRejected : ''}`}
        onClick={() => onSelectDepense(depense)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectDepense(depense);
          }
        }}
      >
        <div>{new Date(depense.date).toLocaleDateString('fr-FR')}</div>
        <div className={styles.cellTruncate}>
          <TruncatedText text={depense.libelle} maxWidth={150} tooltipPosition="bottom" />
        </div>
        <div className={styles.cellTruncate}>
          <TruncatedText text={depense.fournisseur} maxWidth={120} tooltipPosition="bottom" />
        </div>
        <div>
          {renderCategoryBadge(depense.poste || 'divers')}
        </div>
        <div>
          <DepenseStatusBadge
            statut={depense.statut || 'BROUILLON'}
            size="sm"
            showIcon={false}
          />
        </div>
        <div>
          <PieceJustificativeCell
            pieces={pieces}
            onVoir={(piece) => handleVoirPJ(depense.id, piece)}
            peutVoir={pieces.length === 0 || pieces.every((p) => peutVoir(p))}
          />
        </div>
        <div className={styles.montantNegatif}>
          -{depense.montant.toLocaleString()} €
        </div>

        {(onEditDepense || onSubmitForValidation) && (
          <div
            className={styles.actionsCell}
            onClick={(e) => e.stopPropagation()}
          >
            {onEditDepense && isEditable(depense) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onEditDepense(depense)}
                title="Modifier"
                aria-label="Modifier la dépense"
              >
                <Edit2 size={14} aria-hidden="true" />
              </button>
            )}
            {onSubmitForValidation && canSubmit(depense) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onSubmitForValidation(depense.id)}
                title="Soumettre à validation"
                aria-label="Soumettre à validation"
              >
                <Send size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="card">
        <div className={styles.depensesHeader}>
          <h2 className={styles.sectionTitle}>Dernières dépenses</h2>
          {onCreateDepense && (
            <button className="btn btn-primary btn-sm" onClick={onCreateDepense}>
              <Plus size={16} aria-hidden="true" />
              Ajouter une dépense
            </button>
          )}
        </div>

        {/* Controls Bar */}
        <div className={styles.depensesControls}>
          <div className={styles.depensesFilters}>
            <Filter size={14} />
            <div className={styles.statusFilterBar}>
              <button
                className={`${styles.filterPill} ${statusFilter === 'all' ? styles.active : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Tous
                <span className={styles.filterPillCount}>{depenses.length}</span>
              </button>
              <button
                className={`${styles.statusPill} ${styles.statusPillBrouillon} ${statusFilter === 'BROUILLON' ? styles.active : ''}`}
                onClick={() => setStatusFilter('BROUILLON')}
              >
                Brouillon
                <span className={styles.filterPillCount}>{statusCounts.BROUILLON}</span>
              </button>
              <button
                className={`${styles.statusPill} ${styles.statusPillEnAttente} ${statusFilter === 'EN_ATTENTE' ? styles.active : ''}`}
                onClick={() => setStatusFilter('EN_ATTENTE')}
              >
                En attente
                <span className={styles.filterPillCount}>{statusCounts.EN_ATTENTE}</span>
              </button>
              <button
                className={`${styles.statusPill} ${styles.statusPillValidee} ${statusFilter === 'VALIDEE' ? styles.active : ''}`}
                onClick={() => setStatusFilter('VALIDEE')}
              >
                Validée
                <span className={styles.filterPillCount}>{statusCounts.VALIDEE}</span>
              </button>
              <button
                className={`${styles.statusPill} ${styles.statusPillRejetee} ${statusFilter === 'REJETEE' ? styles.active : ''}`}
                onClick={() => setStatusFilter('REJETEE')}
              >
                Rejetée
                <span className={styles.filterPillCount}>{statusCounts.REJETEE}</span>
              </button>
            </div>
          </div>

          <div className={styles.groupingToggle}>
            <span>Grouper par</span>
            <button
              className={`${styles.groupingBtn} ${groupBy === 'none' ? styles.active : ''}`}
              onClick={() => setGroupBy('none')}
            >
              Aucun
            </button>
            <button
              className={`${styles.groupingBtn} ${groupBy === 'categorie' ? styles.active : ''}`}
              onClick={() => setGroupBy('categorie')}
            >
              <Layers size={12} />
              Catégorie
            </button>
            <button
              className={`${styles.groupingBtn} ${groupBy === 'fournisseur' ? styles.active : ''}`}
              onClick={() => setGroupBy('fournisseur')}
            >
              <User size={12} />
              Fournisseur
            </button>
          </div>
        </div>

        <div className={styles.depensesTable}>
          {/* Header */}
          <div className={styles.tableHeader}>
            {renderSortHeader('date', 'Date')}
            {renderSortHeader('libelle', 'Libellé')}
            {renderSortHeader('fournisseur', 'Fournisseur')}
            {renderSortHeader('poste', 'Catégorie')}
            {renderSortHeader('statut', 'Statut')}
            <div>PJ</div>
            {renderSortHeader('montant', 'Montant')}
            {(onEditDepense || onSubmitForValidation) && <div>Actions</div>}
          </div>

          {/* Content */}
          {filteredDepenses.length === 0 ? (
            <div className={styles.noResults}>
              <Search size={48} />
              <p>Aucune dépense ne correspond aux filtres sélectionnés</p>
              <button className={styles.clearFiltersBtn} onClick={() => setStatusFilter('all')}>
                Réinitialiser les filtres
              </button>
            </div>
          ) : groupBy === 'none' ? (
            // No grouping - simple list
            <>
              {sortedDepenses.map(renderDepenseRow)}

              {/* Footer with total */}
              <div className={styles.tableFooter}>
                <div className={styles.tableFooterLabel}>
                  Total ({filteredDepenses.length} dépense{filteredDepenses.length > 1 ? 's' : ''})
                </div>
                <div className={styles.tableFooterTotal}>
                  -{grandTotal.toLocaleString()} €
                </div>
                {(onEditDepense || onSubmitForValidation) && <div />}
              </div>
            </>
          ) : (
            // Grouped view
            groupedData.map(group => (
              <div key={group.key}>
                <div
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleGroup(group.key);
                    }
                  }}
                >
                  <div className={styles.groupHeaderLeft}>
                    <div
                      className={`${styles.groupHeaderIcon} ${group.isCollapsed ? styles.collapsed : ''}`}
                      style={group.color ? { background: `${group.color}15`, color: group.color } : undefined}
                    >
                      <ChevronDown size={16} />
                    </div>
                    <span className={styles.groupHeaderTitle}>{group.label}</span>
                    <span className={styles.groupHeaderCount}>{group.depenses.length}</span>
                  </div>
                  <div className={styles.groupHeaderRight}>
                    <div className={styles.groupTotal}>
                      <span className={styles.groupTotalLabel}>Total groupe</span>
                      <span className={styles.groupTotalValue}>-{group.total.toLocaleString()} €</span>
                    </div>
                  </div>
                </div>

                {!group.isCollapsed && (
                  <div className={styles.groupContent}>
                    {group.depenses.map(renderDepenseRow)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de visualisation des pièces justificatives */}
      <PieceJustificativeModal
        isOpen={isModalOpen}
        piece={selectedPiece}
        pieces={piecesDepenseActive}
        onClose={fermerModal}
        onTelecharger={telechargerPiece}
        onOuvrirNouvelOnglet={ouvrirDansNouvelOnglet}
        onChangePiece={handleChangePiece}
        peutTelecharger={selectedPiece ? peutTelecharger(selectedPiece) : false}
      />
    </>
  );
}
