'use client';

import {
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import type { MouvementBancaire, EcritureComptable, EcartSoldes } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface RapprochementTabProps {
  mouvements: MouvementBancaire[];
  ecrituresComptables: EcritureComptable[];
  ecartSoldes: EcartSoldes;
  soldeActuel: number;
  isMouvementRapproche: (mouvementId: string) => boolean;
  getEcritureRapprochee: (mouvementId: string) => EcritureComptable | undefined;
  onOpenRapprochement: (mouvement: MouvementBancaire) => void;
  onAnnulerRapprochement: (ecritureId: string) => void;
}

export function RapprochementTab({
  mouvements,
  ecrituresComptables,
  ecartSoldes,
  soldeActuel,
  isMouvementRapproche,
  getEcritureRapprochee,
  onOpenRapprochement,
  onAnnulerRapprochement,
}: RapprochementTabProps) {
  return (
    <>
      {Math.abs(ecartSoldes.ecart) > 0.01 && (
        <div className={styles.alerteEcartSolde}>
          <div className={styles.alerteEcartIcon}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.alerteEcartContent}>
            <h3 className={styles.alerteEcartTitle}>Écart détecté entre solde bancaire et solde comptable</h3>
            <div className={styles.alerteEcartDetails}>
              <div className={styles.alerteEcartItem}>
                <span>Solde bancaire</span>
                <strong>{soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
              </div>
              <div className={styles.alerteEcartItem}>
                <span>Solde comptable</span>
                <strong>{ecartSoldes.soldeComptable.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
              </div>
              <div className={`${styles.alerteEcartItem} ${styles.alerteEcartItemEcart}`}>
                <span>Écart</span>
                <strong className={ecartSoldes.ecart > 0 ? styles.montantEntree : styles.montantSortie}>
                  {ecartSoldes.ecart > 0 ? '+' : ''}{ecartSoldes.ecart.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </strong>
              </div>
            </div>
            <p className={styles.alerteEcartMessage}>
              {ecartSoldes.mouvementsNonRapproches} mouvement(s) non rapproché(s) et {ecartSoldes.ecrituresNonRapprochees} écriture(s) en attente de rapprochement.
            </p>
          </div>
        </div>
      )}

      <div className={styles.rapprochementContainer}>
        <div className={styles.rapprochementGrid}>
          <div className={styles.rapprochementColonne}>
            <h3 className={styles.rapprochementColonneTitle}>
              <CreditCard size={20} />
              Mouvements bancaires
              <span className={styles.rapprochementCount}>
                {mouvements.filter(m => !isMouvementRapproche(m.id)).length} non rapproché(s)
              </span>
            </h3>
            <div className={styles.rapprochementListe}>
              {mouvements.map(mvt => {
                const estRapproche = isMouvementRapproche(mvt.id);
                const ecritureAssociee = getEcritureRapprochee(mvt.id);
                return (
                  <div
                    key={mvt.id}
                    className={`${styles.rapprochementItem} ${estRapproche ? styles.rapprochementItemRapproche : styles.rapprochementItemNonRapproche}`}
                  >
                    <div className={styles.rapprochementItemHeader}>
                      <span className={styles.rapprochementDate}>
                        {new Date(mvt.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={`${styles.rapprochementBadge} ${estRapproche ? styles.rapprochementBadgeRapproche : styles.rapprochementBadgeNonRapproche}`}>
                        {estRapproche ? (
                          <><CheckCircle size={12} /> Rapproché</>
                        ) : (
                          <><AlertCircle size={12} /> Non rapproché</>
                        )}
                      </span>
                    </div>
                    <div className={styles.rapprochementItemLibelle}>
                      {mvt.libelle}
                    </div>
                    <div className={styles.rapprochementItemFooter}>
                      <span className={mvt.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}>
                        {mvt.type === 'ENTREE' ? '+' : ''}{mvt.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                      {estRapproche && ecritureAssociee && (
                        <span className={styles.rapprochementLien}>
                          <LinkIcon size={12} />
                          {ecritureAssociee.piece}
                        </span>
                      )}
                      {!estRapproche && (
                        <button
                          className={styles.rapprochementBtn}
                          onClick={() => onOpenRapprochement(mvt)}
                        >
                          <LinkIcon size={14} />
                          Rapprocher
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.rapprochementColonne}>
            <h3 className={styles.rapprochementColonneTitle}>
              <FileText size={20} />
              Écritures comptables
              <span className={styles.rapprochementCount}>
                {ecrituresComptables.filter(e => !e.rapproche).length} non rapprochée(s)
              </span>
            </h3>
            <div className={styles.rapprochementListe}>
              {ecrituresComptables.map(ec => (
                <div
                  key={ec.id}
                  className={`${styles.rapprochementItem} ${ec.rapproche ? styles.rapprochementItemRapproche : styles.rapprochementItemNonRapproche}`}
                >
                  <div className={styles.rapprochementItemHeader}>
                    <span className={styles.rapprochementDate}>
                      {new Date(ec.date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className={`${styles.rapprochementBadge} ${ec.rapproche ? styles.rapprochementBadgeRapproche : styles.rapprochementBadgeNonRapproche}`}>
                      {ec.rapproche ? (
                        <><CheckCircle size={12} /> Rapproché</>
                      ) : (
                        <><AlertCircle size={12} /> Non rapproché</>
                      )}
                    </span>
                  </div>
                  <div className={styles.rapprochementItemLibelle}>
                    {ec.libelle}
                  </div>
                  <div className={styles.rapprochementItemMeta}>
                    <span className={styles.rapprochementPiece}>{ec.piece}</span>
                    <span className={styles.rapprochementCompte}>{ec.compte}</span>
                    <span className={styles.rapprochementJournal}>{ec.journal}</span>
                  </div>
                  <div className={styles.rapprochementItemFooter}>
                    <span className={ec.credit > 0 ? styles.montantEntree : styles.montantSortie}>
                      {ec.credit > 0 ? '+' : '-'}{(ec.credit > 0 ? ec.credit : ec.debit).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                    {ec.rapproche && (
                      <button
                        className={styles.rapprochementBtnAnnuler}
                        onClick={() => onAnnulerRapprochement(ec.id)}
                        title="Annuler le rapprochement"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
