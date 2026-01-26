'use client';

import React from 'react';
import { Clock, Tag, CheckCircle, ArrowRight } from 'lucide-react';
import { StatutFacture, StatutWorkflowProps } from '../types';
import { STATUTS_FACTURE, getAllStatutsConfigs } from '../utils';
import styles from './StatutWorkflow.module.css';

/** Map des icones par nom */
const ICONES: Record<string, React.ElementType> = {
  Clock,
  Tag,
  CheckCircle,
};

/**
 * Affiche le workflow complet avec l'etape actuelle mise en evidence
 */
export function StatutWorkflow({
  statutActuel,
  afficherHistorique = false,
  historique = [],
  className = '',
}: StatutWorkflowProps) {
  const allStatuts = getAllStatutsConfigs();
  const configActuel = STATUTS_FACTURE[statutActuel];

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Barre de progression */}
      <div className={styles.workflow} role="group" aria-label="Progression du workflow">
        {allStatuts.map((config, index) => {
          const IconeComponent = ICONES[config.icone];
          const estActuel = config.valeur === statutActuel;
          const estPasse = config.ordre < configActuel.ordre;
          const estFutur = config.ordre > configActuel.ordre;

          return (
            <React.Fragment key={config.valeur}>
              {/* Etape */}
              <div
                className={`
                  ${styles.etape}
                  ${estActuel ? styles.etapeActuelle : ''}
                  ${estPasse ? styles.etapePassee : ''}
                  ${estFutur ? styles.etapeFuture : ''}
                `}
                aria-current={estActuel ? 'step' : undefined}
              >
                <div
                  className={`
                    ${styles.iconeWrapper}
                    ${estActuel ? styles.iconeActuelle : ''}
                    ${estPasse ? styles.iconePassee : ''}
                    ${estFutur ? styles.iconeFuture : ''}
                  `}
                >
                  {IconeComponent && (
                    <IconeComponent
                      size={20}
                      className={`
                        ${estActuel ? styles.iconeActuelleIcon : ''}
                        ${estPasse ? styles.iconePasseeIcon : ''}
                        ${estFutur ? styles.iconeFutureIcon : ''}
                      `}
                    />
                  )}
                </div>
                <span
                  className={`
                    ${styles.libelle}
                    ${estActuel ? styles.libelleActuel : ''}
                    ${estPasse ? styles.libellePasse : ''}
                    ${estFutur ? styles.libelleFutur : ''}
                  `}
                >
                  {config.libelleCourt}
                </span>
              </div>

              {/* Fleche entre les etapes (sauf la derniere) */}
              {index < allStatuts.length - 1 && (
                <ArrowRight
                  size={16}
                  className={`
                    ${styles.fleche}
                    ${estPasse ? styles.flechePassee : styles.flecheFuture}
                  `}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Historique optionnel */}
      {afficherHistorique && historique.length > 0 && (
        <div className={styles.historique}>
          <h4 className={styles.historiqueTitle}>Historique des changements</h4>
          <ul className={styles.historiqueList}>
            {historique.slice(0, 5).map((entry) => (
              <li key={entry.id} className={styles.historiqueItem}>
                <span className={styles.historiqueDate}>
                  {entry.dateChangement.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className={styles.historiqueTexte}>
                  {entry.statutPrecedent && (
                    <>
                      <span className={styles.statutPrecedent}>
                        {STATUTS_FACTURE[entry.statutPrecedent].libelleCourt}
                      </span>
                      <ArrowRight size={12} className={styles.flecheHistorique} />
                    </>
                  )}
                  <span
                    className={
                      entry.estAnnulation
                        ? styles.statutAnnulation
                        : styles.statutNouveau
                    }
                  >
                    {STATUTS_FACTURE[entry.nouveauStatut].libelleCourt}
                  </span>
                </span>
                <span className={styles.historiqueUser}>par {entry.utilisateurNom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StatutWorkflow;
