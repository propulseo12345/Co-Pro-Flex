'use client';

import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Link as LinkIcon,
  Receipt,
  FileText,
  User,
  Building2,
} from 'lucide-react';
import { TruncatedText } from '@/components/ui';
import type { MouvementBancaire, TypeMouvement } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface MovementsTabProps {
  searchTerm: string;
  typeFilter: 'TOUS' | TypeMouvement;
  categorieFilter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE';
  filteredMouvements: MouvementBancaire[];
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (filter: 'TOUS' | TypeMouvement) => void;
  onCategorieFilterChange: (filter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE') => void;
  onCategoriserClick: (mouvement: MouvementBancaire) => void;
  onOpenEntityDetail: (mouvement: MouvementBancaire) => void;
}

export function MovementsTab({
  searchTerm,
  typeFilter,
  categorieFilter,
  filteredMouvements,
  onSearchChange,
  onTypeFilterChange,
  onCategorieFilterChange,
  onCategoriserClick,
  onOpenEntityDetail,
}: MovementsTabProps) {
  return (
    <>
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={20} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par libellé, montant ou fournisseur..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${typeFilter === 'TOUS' ? styles.filterButtonActive : ''}`}
            onClick={() => onTypeFilterChange('TOUS')}
          >
            Tous
          </button>
          <button
            className={`${styles.filterButton} ${typeFilter === 'ENTREE' ? styles.filterButtonActive : ''}`}
            onClick={() => onTypeFilterChange('ENTREE')}
          >
            <ArrowDownLeft size={16} aria-hidden="true" />
            Entrées
          </button>
          <button
            className={`${styles.filterButton} ${typeFilter === 'SORTIE' ? styles.filterButtonActive : ''}`}
            onClick={() => onTypeFilterChange('SORTIE')}
          >
            <ArrowUpRight size={16} aria-hidden="true" />
            Sorties
          </button>
        </div>

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${categorieFilter === 'TOUS' ? styles.filterButtonActive : ''}`}
            onClick={() => onCategorieFilterChange('TOUS')}
          >
            Tous
          </button>
          <button
            className={`${styles.filterButton} ${categorieFilter === 'CATEGORISE' ? styles.filterButtonActive : ''}`}
            onClick={() => onCategorieFilterChange('CATEGORISE')}
          >
            Catégorisés
          </button>
          <button
            className={`${styles.filterButton} ${categorieFilter === 'NON_CATEGORISE' ? styles.filterButtonActive : ''}`}
            onClick={() => onCategorieFilterChange('NON_CATEGORISE')}
          >
            Non catégorisés
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th className={styles.textRight}>Montant</th>
              <th className={styles.textRight}>Solde</th>
              <th>Catégorie comptable</th>
              <th className={styles.textCenter}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMouvements.map((mouvement) => (
              <tr key={mouvement.id}>
                <td className={styles.dateCell}>
                  <Calendar size={14} aria-hidden="true" />
                  {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                </td>
                <td className={styles.libelleCell}>
                  {mouvement.entiteLiee ? (
                    <button
                      className={styles.libelleLinkButton}
                      onClick={() => onOpenEntityDetail(mouvement)}
                      title={`Voir ${mouvement.entiteLiee.type === 'facture' ? 'la facture' : mouvement.entiteLiee.type === 'appel_fonds' ? "l'appel de fonds" : 'les détails'}`}
                    >
                      <span className={styles.libelleText}>
                        <TruncatedText text={mouvement.libelle} maxWidth={250} tooltipPosition="bottom" />
                      </span>
                      <span className={styles.libelleLinkIcon}>
                        {mouvement.entiteLiee.type === 'facture' && <Receipt size={14} />}
                        {mouvement.entiteLiee.type === 'appel_fonds' && <FileText size={14} />}
                        {mouvement.entiteLiee.type === 'coproprietaire' && <User size={14} />}
                        {mouvement.entiteLiee.type === 'fournisseur' && <Building2 size={14} />}
                      </span>
                    </button>
                  ) : (
                    <TruncatedText text={mouvement.libelle} maxWidth={250} tooltipPosition="bottom" />
                  )}
                </td>
                <td className={styles.textRight}>
                  <span className={mouvement.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}>
                    {mouvement.type === 'ENTREE' ? '+' : ''}
                    {mouvement.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </td>
                <td className={styles.textRight}>
                  <span className={styles.solde}>
                    {mouvement.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </td>
                <td>
                  {mouvement.categorise ? (
                    <div className={styles.categoriseContainer}>
                      <span className={styles.categoriseBadge}>
                        <CheckCircle size={14} aria-hidden="true" />
                        <TruncatedText text={mouvement.compteComptable || ''} maxWidth={150} tooltipPosition="left" />
                      </span>
                      {mouvement.entiteLiee && (
                        <span
                          className={styles.linkedEntityBadge}
                          title={`Lié à : ${mouvement.entiteLiee.nom}${mouvement.entiteLiee.reference ? ` (${mouvement.entiteLiee.reference})` : ''}`}
                        >
                          <LinkIcon size={12} />
                          {mouvement.entiteLiee.type === 'facture' && 'Facture'}
                          {mouvement.entiteLiee.type === 'appel_fonds' && 'Appel'}
                          {mouvement.entiteLiee.type === 'coproprietaire' && 'Copro'}
                          {mouvement.entiteLiee.type === 'fournisseur' && 'Fourn.'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.nonCategoriseBadge}>
                      <AlertCircle size={14} aria-hidden="true" />
                      Non catégorisé
                    </span>
                  )}
                </td>
                <td className={styles.textCenter}>
                  {!mouvement.categorise && (
                    <button
                      className={styles.categoriserButton}
                      onClick={() => onCategoriserClick(mouvement)}
                    >
                      <LinkIcon size={14} />
                      Catégoriser
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMouvements.length === 0 && (
          <div className={styles.emptyState}>
            <CreditCard size={48} aria-hidden="true" />
            <p>Aucun mouvement trouvé</p>
          </div>
        )}
      </div>
    </>
  );
}
