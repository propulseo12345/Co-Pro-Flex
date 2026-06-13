'use client';

import { useCallback, useState } from 'react';
import {
  Users,
  Plus,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { useDesignationMultiple } from '@/hooks/modules/useDesignationMultiple';
import { AjoutDesignationModal } from './modals/AjoutDesignationModal';
import { RoleSelect } from './RoleSelect';
import type { PersonneDesignee } from '@/types/models/ag';
import styles from './DesignationMultiplePanel.module.css';

type CategorieDesignation = 'scrutateur' | 'conseil_syndical';

interface Participant {
  id: string;
  coproprietaireId: string;
  coproprietaire: {
    id: string;
    nom: string;
    prenom: string;
    lots: { numero: string }[];
  };
  typeParticipation: string;
}

interface Gestionnaire {
  id: string;
  nom: string;
  prenom: string;
  societe: string;
  fonction: string;
}

interface DesignationMultiplePanelProps {
  categorie: CategorieDesignation;
  resolutionParenteNumero: number;
  participants: Participant[];
  gestionnaire?: Gestionnaire | null;
  excludedIds: string[];
  nombreMaximumOverride?: number;
  onComplete: (designees: PersonneDesignee[]) => void;
  onCancel: () => void;
}

export function DesignationMultiplePanel({
  categorie,
  resolutionParenteNumero,
  participants,
  gestionnaire,
  excludedIds,
  nombreMaximumOverride,
  onComplete,
  onCancel,
}: DesignationMultiplePanelProps) {
  const {
    sousResolutions,
    currentSousResolution,
    currentIndex,
    config,
    nombreMinimum,
    nombreMaximum,
    isMinimumAtteint,
    canAddMore,
    personnesDesignees,
    creerPremiereSousResolution,
    ajouterSousResolution,
    selectionnerPersonne,
    validerVote,
    allerASousResolution,
    showAjoutPopup,
    setShowAjoutPopup,
    confirmerAjout,
    refuserAjout,
  } = useDesignationMultiple({
    categorie,
    resolutionParenteNumero,
    nombreMaximumOverride,
    onDesignationComplete: onComplete,
  });

  // État local pour le vote en cours
  const [voteEnCours, setVoteEnCours] = useState(false);

  // IDs à exclure = déjà désignés + exclus externes + déjà désignés dans cette session
  const allExcludedIds = [
    ...excludedIds,
    ...personnesDesignees.map((p) => p.coproprietaireId || p.id),
  ];

  // Initialiser si pas de sous-résolutions
  const handleStart = useCallback(() => {
    creerPremiereSousResolution();
  }, [creerPremiereSousResolution]);

  // Sélection d'une personne
  const handlePersonneSelect = useCallback(
    (personne: PersonneDesignee | null) => {
      if (personne) {
        selectionnerPersonne(currentIndex, personne);
      }
    },
    [currentIndex, selectionnerPersonne]
  );

  // Simuler un vote (dans la vraie app, ce serait le flux de vote normal)
  const handleVote = useCallback(
    (adopte: boolean) => {
      setVoteEnCours(true);

      // Simuler le résultat du vote
      setTimeout(() => {
        validerVote(currentIndex, {
          pour: adopte ? 100 : 30,
          contre: adopte ? 10 : 70,
          abstention: 5,
          adoptee: adopte,
        });
        setVoteEnCours(false);
      }, 500);
    },
    [currentIndex, validerVote]
  );

  // Terminer la désignation
  const handleTerminer = useCallback(() => {
    onComplete(personnesDesignees);
  }, [personnesDesignees, onComplete]);

  const titre =
    categorie === 'scrutateur'
      ? 'Désignation des scrutateurs'
      : 'Élection du Conseil Syndical';

  return (
    <div className={styles.container}>
      {/* En-tête */}
      <header className={styles.header}>
        <h2>
          <Users size={24} aria-hidden="true" />
          {titre}
        </h2>
        <div className={styles.compteur}>
          <span className={isMinimumAtteint ? styles.ok : styles.warning}>
            {personnesDesignees.length} / {nombreMinimum} minimum
          </span>
          {nombreMaximum && <span className={styles.max}>(max: {nombreMaximum})</span>}
        </div>
      </header>

      {/* Pas encore commencé */}
      {sousResolutions.length === 0 && (
        <div className={styles.startPanel}>
          <p>
            {categorie === 'scrutateur'
              ? `Au moins ${nombreMinimum} scrutateurs doivent être désignés.`
              : `Au moins ${nombreMinimum} membres du Conseil Syndical doivent être élus.`}
          </p>
          <button type="button" className={styles.primaryBtn} onClick={handleStart}>
            <UserPlus size={18} aria-hidden="true" />
            Commencer la désignation
          </button>
        </div>
      )}

      {/* Navigation des sous-résolutions */}
      {sousResolutions.length > 0 && (
        <>
          <nav
            className={styles.sousResolutionNav}
            aria-label="Navigation des désignations"
          >
            {sousResolutions.map((sr, index) => (
              <button
                key={sr.id}
                type="button"
                className={`${styles.navItem} ${
                  index === currentIndex ? styles.active : ''
                } ${styles[sr.statut]}`}
                onClick={() => allerASousResolution(index)}
                aria-current={index === currentIndex ? 'step' : undefined}
              >
                <span className={styles.navNumero}>{sr.numeroComplet}</span>
                {sr.statut === 'votee' && sr.resultat?.adoptee && (
                  <CheckCircle
                    size={14}
                    className={styles.iconOk}
                    aria-hidden="true"
                  />
                )}
                {sr.statut === 'votee' && !sr.resultat?.adoptee && (
                  <X size={14} className={styles.iconKo} aria-hidden="true" />
                )}
                {sr.personneDesignee && (
                  <span className={styles.navNom}>
                    {sr.personneDesignee.prenom} {sr.personneDesignee.nom.charAt(0)}.
                  </span>
                )}
              </button>
            ))}

            {/* Bouton ajouter */}
            {canAddMore && sousResolutions.every((sr) => sr.statut === 'votee') && (
              <button
                type="button"
                className={styles.navItemAdd}
                onClick={ajouterSousResolution}
                aria-label="Ajouter une désignation"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            )}
          </nav>

          {/* Panel de la sous-résolution courante */}
          {currentSousResolution && (
            <div className={styles.currentPanel}>
              <div className={styles.resolutionHeader}>
                <span className={styles.numero}>
                  Résolution {currentSousResolution.numeroComplet}
                </span>
                <h3>{currentSousResolution.titre}</h3>
              </div>

              {/* Statut : À voter */}
              {currentSousResolution.statut === 'a_voter' && (
                <div className={styles.voteSection}>
                  {/* Sélection de la personne */}
                  <div className={styles.selectionSection}>
                    <span className={styles.sectionLabel}>
                      Sélectionner{' '}
                      {categorie === 'scrutateur'
                        ? 'le scrutateur'
                        : 'le membre'}
                    </span>
                    <RoleSelect
                      label=""
                      role="scrutateur"
                      value={currentSousResolution.personneDesignee as Parameters<typeof RoleSelect>[0]['value']}
                      onChange={handlePersonneSelect as Parameters<typeof RoleSelect>[0]['onChange']}
                      participants={participants}
                      gestionnaire={gestionnaire}
                      excludedIds={allExcludedIds}
                      required
                      allowGestionnaire={false}
                    />
                  </div>

                  {/* Boutons de vote */}
                  {currentSousResolution.personneDesignee && (
                    <div className={styles.voteButtons}>
                      <p className={styles.voteQuestion}>
                        Soumettre la candidature de{' '}
                        <strong>
                          {currentSousResolution.personneDesignee.prenom}{' '}
                          {currentSousResolution.personneDesignee.nom}
                        </strong>{' '}
                        au vote ?
                      </p>
                      <div className={styles.buttonGroup}>
                        <button
                          type="button"
                          className={styles.voteAdopte}
                          onClick={() => handleVote(true)}
                          disabled={voteEnCours}
                        >
                          <Check size={18} aria-hidden="true" />
                          Adopté
                        </button>
                        <button
                          type="button"
                          className={styles.voteRejete}
                          onClick={() => handleVote(false)}
                          disabled={voteEnCours}
                        >
                          <X size={18} aria-hidden="true" />
                          Rejeté
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Statut : Votée */}
              {currentSousResolution.statut === 'votee' &&
                currentSousResolution.resultat && (
                  <div className={styles.resultatSection}>
                    <div
                      className={`${styles.resultatBadge} ${
                        currentSousResolution.resultat.adoptee
                          ? styles.adopte
                          : styles.rejete
                      }`}
                    >
                      {currentSousResolution.resultat.adoptee ? (
                        <>
                          <CheckCircle size={20} aria-hidden="true" />
                          <span>Adopté</span>
                        </>
                      ) : (
                        <>
                          <X size={20} aria-hidden="true" />
                          <span>Rejeté</span>
                        </>
                      )}
                    </div>

                    {currentSousResolution.personneDesignee &&
                      currentSousResolution.resultat.adoptee && (
                        <p className={styles.designeInfo}>
                          <strong>
                            {currentSousResolution.personneDesignee.prenom}{' '}
                            {currentSousResolution.personneDesignee.nom}
                          </strong>{' '}
                          est désigné(e) comme{' '}
                          {categorie === 'scrutateur'
                            ? 'scrutateur'
                            : 'membre du Conseil Syndical'}
                          .
                        </p>
                      )}

                    <div className={styles.votesDetail}>
                      <span className={styles.pour}>
                        Pour: {currentSousResolution.resultat.pour}
                      </span>
                      <span className={styles.contre}>
                        Contre: {currentSousResolution.resultat.contre}
                      </span>
                      <span className={styles.abstention}>
                        Abstention: {currentSousResolution.resultat.abstention}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Liste des personnes désignées */}
          {personnesDesignees.length > 0 && (
            <div className={styles.designeesList}>
              <h4>
                {categorie === 'scrutateur'
                  ? 'Scrutateurs désignés'
                  : 'Membres élus'}{' '}
                ({personnesDesignees.length})
              </h4>
              <ul>
                {personnesDesignees.map((p, index) => (
                  <li key={p.id}>
                    <span className={styles.designeeNumero}>{index + 1}.</span>
                    <span className={styles.designeeNom}>
                      {p.prenom} {p.nom}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer avec actions */}
          <footer className={styles.footer}>
            {!isMinimumAtteint && (
              <div className={styles.warningMsg}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>
                  Minimum {nombreMinimum}{' '}
                  {categorie === 'scrutateur' ? 'scrutateurs' : 'membres'} requis
                </span>
              </div>
            )}

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onCancel}
              >
                Annuler
              </button>

              {isMinimumAtteint && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleTerminer}
                >
                  <CheckCircle size={18} aria-hidden="true" />
                  Terminer ({personnesDesignees.length} désigné
                  {personnesDesignees.length > 1 ? 's' : ''})
                </button>
              )}
            </div>
          </footer>
        </>
      )}

      {/* Modal "Ajouter un autre ?" */}
      <AjoutDesignationModal
        isOpen={showAjoutPopup}
        onClose={() => setShowAjoutPopup(false)}
        onConfirm={confirmerAjout}
        onCancel={refuserAjout}
        categorie={categorie}
        question={config.questionAjout}
        nombreActuel={personnesDesignees.length}
        nombreMinimum={nombreMinimum}
        nombreMaximum={nombreMaximum}
      />
    </div>
  );
}

export type { DesignationMultiplePanelProps, Participant, Gestionnaire };
