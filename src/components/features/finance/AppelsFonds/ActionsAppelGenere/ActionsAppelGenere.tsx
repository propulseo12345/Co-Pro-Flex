'use client';

import React from 'react';
import { Send, Bell, FileText, XCircle } from 'lucide-react';
import styles from './ActionsAppelGenere.module.css';

interface ActionsAppelGenereProps {
  /** ID de l'appel de fonds */
  appelId: string;
  /** Peut-on suivre les envois ? */
  peutSuivre?: boolean;
  /** Peut-on envoyer des relances ? */
  peutRelancer?: boolean;
  /** Callback pour ouvrir le suivi des envois */
  onSuivreEnvois?: () => void;
  /** Callback pour gérer les relances */
  onGererRelances?: () => void;
  /** Callback pour voir les documents */
  onVoirDocuments?: () => void;
  /** Callback pour demander une annulation */
  onDemanderAnnulation?: () => void;
}

/**
 * Actions disponibles pour un appel de fonds déjà généré/émis
 *
 * Puisque la modification est interdite sur un appel généré,
 * ce composant propose des actions alternatives.
 */
export function ActionsAppelGenere({
  peutSuivre = true,
  peutRelancer = true,
  onSuivreEnvois,
  onGererRelances,
  onVoirDocuments,
  onDemanderAnnulation,
}: ActionsAppelGenereProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.titre}>Actions disponibles</h3>
      <p className={styles.description}>
        Cet appel étant généré, vous pouvez uniquement effectuer les actions suivantes :
      </p>

      <div className={styles.actions}>
        {peutSuivre && onSuivreEnvois && (
          <button
            type="button"
            onClick={onSuivreEnvois}
            className={styles.action}
          >
            <Send size={20} aria-hidden="true" />
            <div className={styles.actionTextes}>
              <span className={styles.actionTitre}>Suivre les envois</span>
              <span className={styles.actionDesc}>
                Voir l&apos;état des envois et paiements
              </span>
            </div>
          </button>
        )}

        {peutRelancer && onGererRelances && (
          <button
            type="button"
            onClick={onGererRelances}
            className={styles.action}
          >
            <Bell size={20} aria-hidden="true" />
            <div className={styles.actionTextes}>
              <span className={styles.actionTitre}>Gérer les relances</span>
              <span className={styles.actionDesc}>
                Envoyer des rappels aux impayés
              </span>
            </div>
          </button>
        )}

        {onVoirDocuments && (
          <button
            type="button"
            onClick={onVoirDocuments}
            className={styles.action}
          >
            <FileText size={20} aria-hidden="true" />
            <div className={styles.actionTextes}>
              <span className={styles.actionTitre}>Voir les documents</span>
              <span className={styles.actionDesc}>
                PDF générés, bordereaux d&apos;envoi
              </span>
            </div>
          </button>
        )}

        {onDemanderAnnulation && (
          <button
            type="button"
            onClick={onDemanderAnnulation}
            className={`${styles.action} ${styles.actionDanger}`}
          >
            <XCircle size={20} aria-hidden="true" />
            <div className={styles.actionTextes}>
              <span className={styles.actionTitre}>Annuler l&apos;appel</span>
              <span className={styles.actionDesc}>
                Créer un contre-appel correctif
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export default ActionsAppelGenere;
