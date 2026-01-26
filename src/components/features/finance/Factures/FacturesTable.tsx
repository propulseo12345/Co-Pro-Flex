'use client';

import { useRouter } from 'next/navigation';
import { FileText, Building2, Eye, Edit, Trash2, Clock, CheckCircle, AlertTriangle, ReceiptText, Link2, Wallet, Paperclip, AlertOctagon, FileEdit, ClipboardCheck, CheckCircle2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { TruncatedText } from '@/components/ui';
import { Facture, StatutFacture, isFactureEnRetard, getJoursAvantEcheance, calculerMontantNet, hasAvoirsLies, MOTIFS_AVOIR } from './types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { getStatutBadgeClass, getStatutLabel, isStatutClickable, formatCurrency, formatDate, POSTE_BUDGET_LABELS, getResteDisponible, getPourcentageConsommation, hasPieceJointe, countPiecesJointes, isPJManquanteAlerte, getJoursDepuisCreation, getJoursRetard } from './utils';
import styles from './Factures.module.css';

export type SortColumn = 'date' | 'dateEcheance' | 'fournisseur' | 'montant' | 'statut';
export type SortDirection = 'asc' | 'desc';

interface FacturesTableProps {
  factures: Facture[];
  postesBudget: PosteBudgetData[];
  onStatutClick: (facture: Facture) => void;
  onCategorize: (facture: Facture) => void;
  onView: (facture: Facture) => void;
  onEdit: (facture: Facture) => void;
  onDelete: (facture: Facture) => void;
  onCreateAvoir?: (facture: Facture) => void;
  onViewPJ?: (facture: Facture) => void;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortColumn) => void;
}

function getStatutIcon(statut: StatutFacture) {
  switch (statut) {
    case 'BROUILLON':
      return <FileEdit size={14} aria-hidden="true" />;
    case 'A_VALIDER':
      return <ClipboardCheck size={14} aria-hidden="true" />;
    case 'VALIDEE':
      return <CheckCircle2 size={14} aria-hidden="true" />;
    case 'A_PAYER':
      return <Clock size={14} aria-hidden="true" />;
    case 'PAYEE':
      return <CheckCircle size={14} aria-hidden="true" />;
  }
}

// Formatte l'échéance avec indication du délai
function formatEcheance(facture: Facture): { text: string; className: string; showBadge: boolean } {
  const joursRestants = getJoursAvantEcheance(facture.dateEcheance);
  const enRetard = isFactureEnRetard(facture);
  const dateFormatee = formatDate(facture.dateEcheance);

  // Si déjà payée, pas d'alerte d'échéance
  if (facture.statut === 'PAYEE') {
    return { text: dateFormatee, className: '', showBadge: false };
  }

  if (enRetard) {
    const joursRetard = Math.abs(joursRestants);
    return {
      text: `${dateFormatee} (${joursRetard}j de retard)`,
      className: styles.echeanceEnRetard,
      showBadge: true
    };
  }

  if (joursRestants <= 7) {
    return {
      text: `${dateFormatee} (${joursRestants}j)`,
      className: styles.echeanceProche,
      showBadge: false
    };
  }

  return { text: dateFormatee, className: '', showBadge: false };
}

export function FacturesTable({
  factures,
  postesBudget,
  onStatutClick,
  onCategorize,
  onView,
  onEdit,
  onDelete,
  onCreateAvoir,
  onViewPJ,
  sortColumn,
  sortDirection,
  onSort
}: FacturesTableProps) {
  const router = useRouter();

  if (factures.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <FileText size={48} aria-hidden="true" />
          <p>Aucune facture trouvée</p>
        </div>
      </div>
    );
  }

  // Trouver la facture d'origine pour un avoir
  const getFactureOrigine = (avoirId: string): Facture | undefined => {
    const avoir = factures.find(f => f.id === avoirId);
    if (avoir?.factureOrigineId) {
      return factures.find(f => f.id === avoir.factureOrigineId);
    }
    return undefined;
  };

  const handleRowClick = (facture: Facture, e: React.MouseEvent) => {
    // Ne pas naviguer si on clique sur un bouton ou un élément interactif
    if ((e.target as HTMLElement).closest('button')) return;
    router.push(`/finance/factures/${facture.id}`);
  };

  const renderSortIcon = (column: SortColumn) => {
    if (!onSort) return null;
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className={styles.sortIcon} />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className={styles.sortIconActive} />
      : <ChevronDown size={14} className={styles.sortIconActive} />;
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th
      className={onSort ? styles.sortableHeader : undefined}
      onClick={() => onSort?.(column)}
    >
      <span className={styles.headerContent}>
        {children}
        {renderSortIcon(column)}
      </span>
    </th>
  );

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Type</th>
            <SortableHeader column="date">Date</SortableHeader>
            <SortableHeader column="dateEcheance">Échéance</SortableHeader>
            <SortableHeader column="fournisseur">Fournisseur</SortableHeader>
            <th>Référence</th>
            <th className={styles.textCenter}>PJ</th>
            <SortableHeader column="montant">Montant</SortableHeader>
            <th>Poste budgétaire</th>
            <SortableHeader column="statut">Statut</SortableHeader>
            <th className={styles.textCenter}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {factures.map((facture) => {
            const badgeClassName = getStatutBadgeClass(facture.statut);
            const enRetard = isFactureEnRetard(facture);
            const echeanceInfo = formatEcheance(facture);
            const isAvoir = facture.typeDocument === 'AVOIR';
            const montantNet = calculerMontantNet(facture, factures);
            const aDesAvoirs = !isAvoir && hasAvoirsLies(facture.id, factures);
            const factureOrigine = isAvoir ? getFactureOrigine(facture.id) : undefined;

            return (
              <tr
                key={facture.id}
                className={`${enRetard && !isAvoir ? styles.rowEnRetard : ''} ${isAvoir ? styles.rowAvoir : ''} ${styles.rowClickable}`}
                onClick={(e) => handleRowClick(facture, e)}
                style={{ cursor: 'pointer' }}
              >
                {/* Colonne Type */}
                <td>
                  <span className={`${styles.typeBadge} ${isAvoir ? styles.typeBadgeAvoir : styles.typeBadgeFacture}`}>
                    {isAvoir ? (
                      <>
                        <ReceiptText size={12} aria-hidden="true" />
                        Avoir
                      </>
                    ) : (
                      <>
                        <FileText size={12} aria-hidden="true" />
                        Facture
                      </>
                    )}
                  </span>
                </td>
                <td>{formatDate(facture.date)}</td>
                <td className={echeanceInfo.className}>
                  <div className={styles.echeanceCell}>
                    {echeanceInfo.showBadge && !isAvoir && (
                      <AlertTriangle size={14} className={styles.echeanceIcon} aria-hidden="true" />
                    )}
                    <span>{echeanceInfo.text}</span>
                  </div>
                </td>
                <td className={styles.fournisseurCell}>
                  <Building2 size={16} aria-hidden="true" />
                  <div>
                    <TruncatedText text={facture.fournisseur} maxWidth={150} tooltipPosition="bottom" />
                    {isAvoir && factureOrigine && (
                      <span className={styles.avoirLienFacture}>
                        <Link2 size={10} aria-hidden="true" />
                        Réf. {factureOrigine.reference}
                      </span>
                    )}
                    {isAvoir && facture.motifAvoir && (
                      <span className={styles.avoirMotif}>
                        {MOTIFS_AVOIR[facture.motifAvoir]}
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.referenceCell}>
                  <TruncatedText text={facture.reference} maxWidth={120} tooltipPosition="bottom" />
                </td>
                <td className={styles.textCenter}>
                  {(() => {
                    const hasPJ = hasPieceJointe(facture);
                    const nbPJ = countPiecesJointes(facture);
                    const alerte = isPJManquanteAlerte(facture);
                    const joursManquante = !hasPJ ? getJoursDepuisCreation(facture.date) : 0;

                    if (hasPJ) {
                      return (
                        <button
                          className={`${styles.pjButton} ${styles.pjButtonPresent}`}
                          onClick={() => onViewPJ?.(facture)}
                          title={`${nbPJ} pièce(s) jointe(s) - Cliquer pour prévisualiser`}
                          aria-label={`Voir les ${nbPJ} pièce(s) jointe(s)`}
                        >
                          <Paperclip size={16} aria-hidden="true" />
                          {nbPJ > 1 && <span className={styles.pjCount}>{nbPJ}</span>}
                        </button>
                      );
                    } else if (alerte) {
                      return (
                        <div
                          className={`${styles.pjButton} ${styles.pjButtonAlerte}`}
                          title={`PJ manquante depuis ${joursManquante} jours`}
                          aria-label={`Attention: pièce jointe manquante depuis ${joursManquante} jours`}
                        >
                          <AlertOctagon size={16} aria-hidden="true" />
                        </div>
                      );
                    } else {
                      return (
                        <div
                          className={`${styles.pjButton} ${styles.pjButtonAbsent}`}
                          title="Aucune pièce jointe"
                          aria-label="Aucune pièce jointe"
                        >
                          <Paperclip size={16} aria-hidden="true" />
                        </div>
                      );
                    }
                  })()}
                </td>
                <td className={styles.textRight}>
                  <div className={styles.montantCell}>
                    <span className={`${styles.montant} ${isAvoir ? styles.montantAvoir : ''}`}>
                      {isAvoir ? '-' : ''}{formatCurrency(facture.montant)}
                    </span>
                    {aDesAvoirs && (
                      <span className={styles.montantNet}>
                        Net: {formatCurrency(montantNet)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {facture.posteBudgetaire ? (
                    (() => {
                      const reste = getResteDisponible(facture.posteBudgetaire, postesBudget);
                      const pourcentage = getPourcentageConsommation(facture.posteBudgetaire, postesBudget);
                      const statusClass = pourcentage !== null
                        ? pourcentage > 100 ? styles.posteBadgeDanger
                        : pourcentage > 80 ? styles.posteBadgeWarning
                        : styles.posteBadgeOk
                        : '';

                      return (
                        <div className={styles.posteBudgetCell}>
                          <span className={`${styles.posteBadge} ${statusClass}`}>
                            <Wallet size={12} aria-hidden="true" />
                            {POSTE_BUDGET_LABELS[facture.posteBudgetaire]}
                          </span>
                          {reste !== null && (
                            <span className={styles.posteReste}>
                              {formatCurrency(reste)} restants
                            </span>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <span className={styles.posteNonDefini}>Non défini</span>
                  )}
                </td>
                <td>
                  <button
                    className={`${styles.statutBadge} ${styles[badgeClassName]} ${
                      isStatutClickable(facture.statut) ? styles.statutClickable : ''
                    }`}
                    onClick={() => {
                      if (facture.statut === 'A_PAYER') {
                        onStatutClick(facture);
                      }
                    }}
                    disabled={!isStatutClickable(facture.statut)}
                  >
                    {getStatutIcon(facture.statut)}
                    {getStatutLabel(facture.statut)}
                  </button>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      title={isAvoir ? "Voir l'avoir" : "Voir la facture"}
                      onClick={() => onView(facture)}
                      aria-label={isAvoir ? "Voir l'avoir" : "Voir la facture"}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    {/* Bouton créer avoir - uniquement pour les factures non payées */}
                    {!isAvoir && facture.statut !== 'PAYEE' && onCreateAvoir && (
                      <button
                        className={`${styles.actionButton} ${styles.actionButtonAvoir}`}
                        title="Créer un avoir"
                        onClick={() => onCreateAvoir(facture)}
                        aria-label="Créer un avoir pour cette facture"
                      >
                        <ReceiptText size={16} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      className={styles.actionButton}
                      title="Modifier"
                      onClick={() => onEdit(facture)}
                      aria-label={isAvoir ? "Modifier l'avoir" : "Modifier la facture"}
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={styles.actionButton}
                      title="Supprimer"
                      onClick={() => onDelete(facture)}
                      aria-label={isAvoir ? "Supprimer l'avoir" : "Supprimer la facture"}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
