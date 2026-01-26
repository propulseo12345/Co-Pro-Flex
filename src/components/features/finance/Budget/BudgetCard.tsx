'use client';

import { FileText, Hammer, Calendar, Euro, MoreVertical, Edit, Link2, ArrowRight, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BudgetStatut } from '@/types/enums/statuts';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import styles from './Budget.module.css';

export interface BudgetCardData {
  id: string;
  nom?: string;
  type: 'fonctionnement' | 'travaux';
  annee: number;
  montantTotal: number;
  statut: BudgetStatut;
  resolutionId?: string;
}

interface BudgetCardProps {
  budget: BudgetCardData;
  onEdit?: (budget: BudgetCardData) => void;
  onLinkToAG?: (budget: BudgetCardData) => void;
  onTransform?: (budget: BudgetCardData) => void;
  onDelete?: (budget: BudgetCardData) => void;
  onSelect?: (budget: BudgetCardData) => void;
}

export function BudgetCard({
  budget,
  onEdit,
  onLinkToAG,
  onTransform,
  onDelete,
  onSelect,
}: BudgetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBrouillon = budget.statut === BudgetStatut.BROUILLON;
  const isApprouve = budget.statut === BudgetStatut.APPROUVE;
  const canEdit = isBrouillon;
  const canLinkToAG = isBrouillon;
  const canTransform = isApprouve;
  const canDelete = isBrouillon;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(budget);
    } else if (onEdit && canEdit) {
      onEdit(budget);
    }
  };

  const budgetLabel = budget.nom || `Budget ${budget.type} ${budget.annee}`;

  return (
    <div
      className={styles.budgetCard}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className={styles.budgetCardHeader}>
        <div className={styles.budgetCardIcon}>
          {budget.type === 'fonctionnement' ? (
            <FileText size={20} aria-hidden="true" />
          ) : (
            <Hammer size={20} aria-hidden="true" />
          )}
        </div>
        <div className={styles.budgetCardInfo}>
          <h3 className={styles.budgetCardTitle}>{budgetLabel}</h3>
          <div className={styles.budgetCardMeta}>
            <span className={styles.budgetCardMetaItem}>
              <Calendar size={14} aria-hidden="true" />
              {budget.annee}
            </span>
            <span className={styles.budgetCardMetaItem}>
              <Euro size={14} aria-hidden="true" />
              {budget.montantTotal.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>
        <div className={styles.budgetCardActions} ref={menuRef}>
          <BudgetStatusBadge statut={budget.statut} size="sm" />
          <button
            type="button"
            className={styles.budgetCardMenuBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Menu actions"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
          {showMenu && (
            <div className={styles.budgetCardMenu}>
              {canEdit && onEdit && (
                <button
                  type="button"
                  className={styles.budgetCardMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(budget);
                    setShowMenu(false);
                  }}
                >
                  <Edit size={16} aria-hidden="true" />
                  Modifier
                </button>
              )}
              {canLinkToAG && onLinkToAG && (
                <button
                  type="button"
                  className={styles.budgetCardMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkToAG(budget);
                    setShowMenu(false);
                  }}
                >
                  <Link2 size={16} aria-hidden="true" />
                  Lier a une AG
                </button>
              )}
              {canTransform && onTransform && (
                <button
                  type="button"
                  className={styles.budgetCardMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTransform(budget);
                    setShowMenu(false);
                  }}
                >
                  <ArrowRight size={16} aria-hidden="true" />
                  Generer appels de fonds
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  className={`${styles.budgetCardMenuItem} ${styles.budgetCardMenuItemDanger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(budget);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {budget.resolutionId && (
        <div className={styles.budgetCardFooter}>
          <Link2 size={12} aria-hidden="true" />
          <span>Lie a la resolution AG</span>
        </div>
      )}
    </div>
  );
}
