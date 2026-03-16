'use client';

import { CreditCard } from 'lucide-react';
import clsx from 'clsx';
import { TruncatedText } from '@/components/ui';
import type { MouvementBancaire } from '../domain/types';
import styles from './UnifiedMovementsTable.module.css';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

interface UnifiedMovementsTableProps {
  mouvements: MouvementBancaire[];
  selectedMouvementId: string | null;
  showPanel: boolean;
  isMouvementRapproche: (id: string) => boolean;
  getEcritureRapprochee: (id: string) => { piece: string } | undefined;
  onCategoriserClick: (mouvement: MouvementBancaire) => void;
  onRapprocherClick: (mouvement: MouvementBancaire) => void;
  onOpenEntityDetail: (mouvement: MouvementBancaire) => void;
  children?: React.ReactNode;
}

export function UnifiedMovementsTable({
  mouvements,
  selectedMouvementId,
  showPanel,
  isMouvementRapproche,
  getEcritureRapprochee,
  onCategoriserClick,
  onRapprocherClick,
  onOpenEntityDetail,
  children,
}: UnifiedMovementsTableProps) {
  return (
    <div className={clsx(styles.tableWrapper, showPanel && styles.tableWrapperWithPanel)}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Libellé</th>
              <th>Entité</th>
              <th className={styles.textRight}>Montant</th>
              <th className={styles.textRight}>Solde</th>
              <th>Catégorie</th>
              <th>Rapproch.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((mvt) => {
              const rapproche = isMouvementRapproche(mvt.id);
              const ecriture = getEcritureRapprochee(mvt.id);

              return (
                <tr
                  key={mvt.id}
                  className={clsx(
                    !mvt.categorise && styles.rowNonCategorise,
                    !rapproche && mvt.categorise && styles.rowNonRapproche,
                    selectedMouvementId === mvt.id && styles.rowSelected
                  )}
                >
                  <td>
                    <span className={clsx(styles.statusDot, rapproche ? styles.statusRapproche : styles.statusNonRapproche)}>
                      {rapproche ? '●' : '○'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(mvt.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td>
                    {mvt.entiteLiee ? (
                      <button
                        className={styles.libelleBtn}
                        onClick={() => onOpenEntityDetail(mvt)}
                        type="button"
                      >
                        <TruncatedText text={mvt.libelle} maxWidth={220} tooltipPosition="bottom" />
                      </button>
                    ) : (
                      <TruncatedText text={mvt.libelle} maxWidth={220} tooltipPosition="bottom" />
                    )}
                  </td>
                  <td>
                    {mvt.entiteLiee && (
                      <span className={clsx(
                        styles.entityBadge,
                        mvt.entiteLiee.type === 'appel_fonds' && styles.entityAppel,
                        mvt.entiteLiee.type === 'fournisseur' && styles.entityFournisseur,
                        mvt.entiteLiee.type === 'facture' && styles.entityFacture,
                        mvt.entiteLiee.type === 'coproprietaire' && styles.entityCopro,
                      )}>
                        {mvt.entiteLiee.type === 'appel_fonds' && '📄'}
                        {mvt.entiteLiee.type === 'fournisseur' && '🏢'}
                        {mvt.entiteLiee.type === 'coproprietaire' && '👤'}
                        {mvt.entiteLiee.type === 'facture' && '📄'}
                        {' '}{mvt.entiteLiee.reference || mvt.entiteLiee.nom}
                      </span>
                    )}
                  </td>
                  <td className={styles.textRight}>
                    <span className={mvt.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}>
                      {mvt.type === 'ENTREE' ? '+' : ''}{formatCurrency(mvt.montant)}
                    </span>
                  </td>
                  <td className={clsx(styles.textRight, styles.soldeCell)}>
                    {formatCurrency(mvt.solde)}
                  </td>
                  <td>
                    <span className={clsx(styles.categorieBadge, mvt.categorise ? styles.categoriseOk : styles.categoriseNo)}>
                      {mvt.categorise
                        ? `✓ ${mvt.compteComptable?.split(' - ')[0] || ''}`
                        : '⚠ Non cat.'
                      }
                    </span>
                  </td>
                  <td>
                    {ecriture ? (
                      <span className={styles.rapprochementBadge}>{ecriture.piece}</span>
                    ) : (
                      <span className={styles.rapprochementEmpty}>—</span>
                    )}
                  </td>
                  <td>
                    {!mvt.categorise && (
                      <button className={styles.actionBtn} onClick={() => onCategoriserClick(mvt)} type="button">
                        Catégoriser
                      </button>
                    )}
                    {mvt.categorise && !rapproche && (
                      <button className={styles.actionBtn} onClick={() => onRapprocherClick(mvt)} type="button">
                        Rapprocher
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {mouvements.length === 0 && (
          <div className={styles.emptyState}>
            <CreditCard size={48} />
            <p>Aucun mouvement trouvé</p>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
