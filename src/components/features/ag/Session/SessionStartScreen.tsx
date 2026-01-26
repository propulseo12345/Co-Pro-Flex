'use client';

import { Play, CheckSquare, Mail, UserCheck, AlertCircle, Undo } from 'lucide-react';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import { SyntheseTantiemes } from './SyntheseTantiemes';
import type { PresenceData } from '@/lib/utils/ag-session';
import styles from './Session.module.css';

interface SessionStartScreenProps {
  presences: Record<string, boolean>;
  presencesEnrichies?: Record<string, PresenceData>;
  votesCorrespondanceCount?: number;
  onPresenceToggle: (coproId: string) => void;
  onSelectAll: () => void;
  onBasculerPresent?: (coproId: string) => void;
  onAnnulerBascule?: (coproId: string) => void;
  onStart: () => void;
}

export function SessionStartScreen({
  presences,
  presencesEnrichies,
  votesCorrespondanceCount = 0,
  onPresenceToggle,
  onSelectAll,
  onBasculerPresent,
  onAnnulerBascule,
  onStart
}: SessionStartScreenProps) {
  // Calculer le total des tantièmes
  const totalTantiemes = MOCK_COPROPRIETAIRES.reduce((sum, c) => sum + c.tantiemes, 0);

  // Calculer tantièmes présents et correspondance
  let tantièmesPresents = 0;
  let tantièmesCorrespondance = 0;

  if (presencesEnrichies) {
    for (const copro of MOCK_COPROPRIETAIRES) {
      const presence = presencesEnrichies[copro.id];
      if (presence?.mode === 'present' || presence?.mode === 'represente') {
        tantièmesPresents += copro.tantiemes;
      } else if (presence?.mode === 'correspondance' && !presence.voteCorrespondanceNeutralise) {
        tantièmesCorrespondance += copro.tantiemes;
      }
    }
  } else {
    tantièmesPresents = MOCK_COPROPRIETAIRES
      .filter(c => presences[c.id])
      .reduce((sum, c) => sum + c.tantiemes, 0);
  }

  const tantièmesTotalParticipants = tantièmesPresents + tantièmesCorrespondance;
  const pourcentageParticipants = totalTantiemes > 0 ? (tantièmesTotalParticipants / totalTantiemes) * 100 : 0;

  return (
    <div className={styles.startScreen}>
      <div className="card">
        <h2 className={styles.sectionTitle}>Avant de commencer</h2>
        <p className={styles.sectionDescription}>
          Prenez quelques instants pour préparer la session. Cochez les copropriétaires présents ou représentés pour calculer la représentativité de l&apos;assemblée.
        </p>

        {/* Bannière votes par correspondance */}
        {votesCorrespondanceCount > 0 && (
          <div className={styles.correspondanceBanner}>
            <Mail size={20} aria-hidden="true" />
            <div>
              <strong>{votesCorrespondanceCount} vote{votesCorrespondanceCount > 1 ? 's' : ''} par correspondance</strong>
              <p>
                Ces copropriétaires sont automatiquement intégrés comme participants.
                Leurs tantièmes sont comptabilisés dans le quorum et les majorités.
              </p>
              <p className={styles.correspondanceHint}>
                Si un copropriétaire se présente physiquement, cliquez sur &quot;Marquer présent&quot; pour neutraliser son vote par correspondance.
              </p>
            </div>
          </div>
        )}

        {/* Synthèse des tantièmes - mise à jour en temps réel */}
        <SyntheseTantiemes
          coproprietaires={MOCK_COPROPRIETAIRES}
          presences={presences}
          presencesEnrichies={presencesEnrichies}
          totalTantiemes={totalTantiemes}
        />

        <div className={styles.checklist}>
          <div className={styles.checklistHeader}>
            <h3>Présences</h3>
            <button
              type="button"
              onClick={onSelectAll}
              className={styles.selectAllPresencesButton}
            >
              <CheckSquare size={16} aria-hidden="true" />
              Tout cocher / décocher
            </button>
          </div>
          <p className={styles.checklistDescription}>
            Cochez les copropriétaires présents ou représentés
          </p>
          <div className={styles.presenceList}>
            {MOCK_COPROPRIETAIRES.map(copro => {
              const isPresent = presences[copro.id] || false;
              const presenceData = presencesEnrichies?.[copro.id];
              const isCorrespondance = presenceData?.mode === 'correspondance';
              const isNeutralise = presenceData?.voteCorrespondanceNeutralise;
              const isPresentFromCorrespondance = presenceData?.mode === 'present' && isNeutralise;

              return (
                <div
                  key={copro.id}
                  className={`${styles.presenceItem} ${isPresent ? styles.presenceItemChecked : ''} ${isCorrespondance ? styles.presenceItemCorrespondance : ''}`}
                >
                  {/* Case à cocher pour les non-correspondance */}
                  {!isCorrespondance && !isPresentFromCorrespondance && (
                    <label className={styles.presenceLabel}>
                      <input
                        type="checkbox"
                        checked={isPresent}
                        onChange={() => onPresenceToggle(copro.id)}
                      />
                      <div className={styles.presenceInfo}>
                        <span className={styles.presenceName}>{copro.nom}</span>
                        <span className={styles.presenceDetails}>
                          Lot {copro.lot} • <strong>{copro.tantiemes}</strong> tantièmes
                        </span>
                      </div>
                    </label>
                  )}

                  {/* Affichage pour correspondance */}
                  {isCorrespondance && !isNeutralise && (
                    <div className={styles.presenceCorrespondanceRow}>
                      <div className={styles.presenceInfo}>
                        <span className={styles.presenceName}>
                          {copro.nom}
                          <span className={styles.correspondanceBadge}>
                            <Mail size={12} aria-hidden="true" />
                            Correspondance
                          </span>
                        </span>
                        <span className={styles.presenceDetails}>
                          Lot {copro.lot} • <strong>{copro.tantiemes}</strong> tantièmes
                        </span>
                      </div>
                      {onBasculerPresent && (
                        <button
                          type="button"
                          onClick={() => onBasculerPresent(copro.id)}
                          className={styles.basculerPresentBtn}
                          title="Le copropriétaire est finalement présent physiquement"
                        >
                          <UserCheck size={14} aria-hidden="true" />
                          Marquer présent
                        </button>
                      )}
                    </div>
                  )}

                  {/* Affichage pour présent avec vote neutralisé */}
                  {isPresentFromCorrespondance && (
                    <div className={styles.presenceCorrespondanceRow}>
                      <div className={styles.presenceInfo}>
                        <span className={styles.presenceName}>
                          {copro.nom}
                          <span className={styles.presentBadge}>
                            <UserCheck size={12} aria-hidden="true" />
                            Présent
                          </span>
                          <span className={styles.neutraliseBadge}>
                            <AlertCircle size={12} aria-hidden="true" />
                            Vote neutralisé
                          </span>
                        </span>
                        <span className={styles.presenceDetails}>
                          Lot {copro.lot} • <strong>{copro.tantiemes}</strong> tantièmes
                        </span>
                      </div>
                      {onAnnulerBascule && (
                        <button
                          type="button"
                          onClick={() => onAnnulerBascule(copro.id)}
                          className={styles.annulerBasculeBtn}
                          title="Annuler et revenir au vote par correspondance"
                        >
                          <Undo size={14} aria-hidden="true" />
                          Annuler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bouton de démarrage avec avertissement si quorum insuffisant */}
        <div className={styles.startButtonContainer}>
          {pourcentageParticipants < 50 && (
            <p className={styles.quorumWarning}>
              ⚠️ Attention : moins de 50% des tantièmes sont représentés. Certaines décisions pourraient ne pas pouvoir être votées.
            </p>
          )}
          <button onClick={onStart} className="btn btn-primary btn-lg">
            <Play size={20} aria-hidden="true" />
            Démarrer la session
          </button>
        </div>
      </div>
    </div>
  );
}
