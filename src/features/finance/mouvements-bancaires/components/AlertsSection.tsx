'use client';

import {
  AlertTriangle,
  Clock,
  Lock,
  Info,
  Lightbulb,
} from 'lucide-react';
import type {
  ErreurCoherence,
  AlerteMouvementNonCategorise,
  StatutClotureMensuelle,
  MouvementBancaire,
} from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface AlertsSectionProps {
  erreurs: ErreurCoherence[];
  alertesNonCategorises: AlerteMouvementNonCategorise[];
  statutCloture: StatutClotureMensuelle;
  mouvements: MouvementBancaire[];
  onCategoriserClick: (mouvement: MouvementBancaire) => void;
}

export function AlertsSection({
  erreurs,
  alertesNonCategorises,
  statutCloture,
  mouvements,
  onCategoriserClick,
}: AlertsSectionProps) {
  return (
    <>
      {erreurs.length > 0 && (
        <div className={styles.alerteCoherence}>
          <div className={styles.alerteCoherenceIcon}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.alerteCoherenceContent}>
            <h3 className={styles.alerteCoherenceTitle}>Incohérence détectée dans les soldes</h3>
            <p className={styles.alerteCoherenceMessage}>
              {erreurs.length} erreur(s) de calcul détectée(s). Les soldes affichés peuvent ne pas correspondre aux soldes réels.
            </p>
          </div>
        </div>
      )}

      {alertesNonCategorises.length > 0 && (
        <div className={styles.alerteNonCategorise}>
          <div className={styles.alerteNonCategoriseHeader}>
            <div className={styles.alerteNonCategoriseIcon}>
              <Clock size={24} />
            </div>
            <div className={styles.alerteNonCategoriseContent}>
              <h3 className={styles.alerteNonCategoriseTitle}>
                {alertesNonCategorises.length} mouvement(s) non catégorisé(s) depuis plus de 7 jours
              </h3>
              <p className={styles.alerteNonCategoriseMessage}>
                Ces mouvements doivent être catégorisés pour permettre le rapprochement bancaire et la clôture comptable.
              </p>
            </div>
          </div>
          <div className={styles.alerteNonCategoriseListe}>
            {alertesNonCategorises.slice(0, 3).map(alerte => (
              <div
                key={alerte.mouvementId}
                className={`${styles.alerteItem} ${styles[`alerteItem${alerte.urgence.charAt(0).toUpperCase() + alerte.urgence.slice(1)}`]}`}
              >
                <div className={styles.alerteItemInfo}>
                  <span className={`${styles.alerteBadge} ${styles[`alerteBadge${alerte.urgence.charAt(0).toUpperCase() + alerte.urgence.slice(1)}`]}`}>
                    {alerte.urgence === 'critique' ? 'CRITIQUE' : alerte.urgence === 'haute' ? 'URGENT' : 'À TRAITER'}
                  </span>
                  <span className={styles.alerteDelai}>{alerte.joursNonCategorise} jours</span>
                </div>
                <div className={styles.alerteItemDetail}>
                  <span className={styles.alerteLibelle}>{alerte.libelle}</span>
                  <span className={alerte.montant > 0 ? styles.montantEntree : styles.montantSortie}>
                    {alerte.montant > 0 ? '+' : ''}{alerte.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <button
                  className={styles.alerteCategoriserBtn}
                  onClick={() => {
                    const mvt = mouvements.find(m => m.id === alerte.mouvementId);
                    if (mvt) onCategoriserClick(mvt);
                  }}
                >
                  <Lightbulb size={14} />
                  Catégoriser
                </button>
              </div>
            ))}
            {alertesNonCategorises.length > 3 && (
              <div className={styles.alerteVoirPlus}>
                + {alertesNonCategorises.length - 3} autre(s) mouvement(s) en attente
              </div>
            )}
          </div>
        </div>
      )}

      {!statutCloture.peutCloturer && (
        <div className={styles.blocageCloture}>
          <div className={styles.blocageClotureIcon}>
            <Lock size={20} />
          </div>
          <div className={styles.blocageClotureContent}>
            <span className={styles.blocageClotureTitle}>Clôture {statutCloture.mois} {statutCloture.annee} bloquée</span>
            <span className={styles.blocageClotureMessage}>{statutCloture.messageBlockage}</span>
          </div>
        </div>
      )}

      <div className={styles.infoCalcul}>
        <Info size={16} />
        <span>Les soldes sont calculés automatiquement : Solde = Solde précédent + Montant du mouvement</span>
      </div>
    </>
  );
}
