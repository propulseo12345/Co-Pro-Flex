'use client';

import { useMemo } from 'react';
import { UserCheck, Users, Mail, UserX } from 'lucide-react';
import {
  type PresenceData,
  type ModeParticipation,
  calculerStatsParticipation
} from '@/lib/utils/ag-session';
import styles from './Session.module.css';

interface Coproprietaire {
  id: string;
  nom: string;
  tantiemes: number;
}

interface SessionSidebarProps {
  coproprietaires: Coproprietaire[];
  currentResolutionIndex: number;
  totalResolutions: number;
  presences: Record<string, boolean>;
  presencesEnrichies?: Record<string, PresenceData>;
}

export function SessionSidebar({
  coproprietaires,
  currentResolutionIndex,
  totalResolutions,
  presences,
  presencesEnrichies
}: SessionSidebarProps) {
  // Calculer les statistiques de participation
  const stats = useMemo(() => {
    if (!presencesEnrichies) {
      // Fallback sans présences enrichies
      const presents = coproprietaires.filter(c => presences[c.id]);
      const tantiemes = presents.reduce((sum, c) => sum + c.tantiemes, 0);
      return {
        total: tantiemes,
        presents: tantiemes,
        representes: 0,
        correspondance: 0,
        absents: 0,
        detail: {
          presentsCount: presents.length,
          representesCount: 0,
          correspondanceCount: 0,
          absentsCount: coproprietaires.length - presents.length
        }
      };
    }

    return calculerStatsParticipation(
      presencesEnrichies,
      coproprietaires.map(c => ({ id: c.id, tantiemes: c.tantiemes }))
    );
  }, [presences, presencesEnrichies, coproprietaires]);

  const totalTantiemes = coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0);
  const pourcentage = ((stats.total / totalTantiemes) * 100).toFixed(1);

  // Grouper les participants par type
  const participantsParType = useMemo(() => {
    const result: Record<ModeParticipation, Coproprietaire[]> = {
      present: [],
      represente: [],
      correspondance: [],
      absent: []
    };

    coproprietaires.forEach(copro => {
      if (presencesEnrichies) {
        const presence = presencesEnrichies[copro.id];
        if (presence) {
          // Ne pas inclure les correspondance neutralisés dans la catégorie correspondance
          if (presence.mode === 'correspondance' && presence.voteCorrespondanceNeutralise) {
            result.present.push(copro);
          } else {
            result[presence.mode].push(copro);
          }
        } else {
          result.absent.push(copro);
        }
      } else {
        // Fallback
        if (presences[copro.id]) {
          result.present.push(copro);
        } else {
          result.absent.push(copro);
        }
      }
    });

    return result;
  }, [presences, presencesEnrichies, coproprietaires]);

  return (
    <div className={styles.sidebar}>
      {/* Progression */}
      <div className="card">
        <h3 className={styles.sidebarTitle}>Progression</h3>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((currentResolutionIndex + 1) / totalResolutions) * 100}%` }}
          />
        </div>
        <p className={styles.progressText}>
          {currentResolutionIndex + 1} / {totalResolutions} résolutions
        </p>
      </div>

      {/* Synthèse des participants */}
      <div className="card">
        <h3 className={styles.sidebarTitle}>Participants</h3>

        {/* Total */}
        <div className={styles.participantsSynthese}>
          <div className={styles.syntheseTotal}>
            <span className={styles.syntheseTotalValue}>{stats.total}</span>
            <span className={styles.syntheseTotalLabel}>
              / {totalTantiemes} tantièmes ({pourcentage}%)
            </span>
          </div>
        </div>

        {/* Ventilation par type */}
        <div className={styles.syntheseByType}>
          {/* Présents */}
          <div className={`${styles.syntheseTypeItem} ${styles.syntheseTypePresent}`}>
            <div className={styles.syntheseTypeIcon}>
              <UserCheck size={16} aria-hidden="true" />
            </div>
            <div className={styles.syntheseTypeInfo}>
              <span className={styles.syntheseTypeLabel}>Présents</span>
              <span className={styles.syntheseTypeValue}>
                {stats.presents} t. ({stats.detail.presentsCount})
              </span>
            </div>
          </div>

          {/* Représentés */}
          {stats.detail.representesCount > 0 && (
            <div className={`${styles.syntheseTypeItem} ${styles.syntheseTypeRepresente}`}>
              <div className={styles.syntheseTypeIcon}>
                <Users size={16} aria-hidden="true" />
              </div>
              <div className={styles.syntheseTypeInfo}>
                <span className={styles.syntheseTypeLabel}>Représentés</span>
                <span className={styles.syntheseTypeValue}>
                  {stats.representes} t. ({stats.detail.representesCount})
                </span>
              </div>
            </div>
          )}

          {/* Correspondance */}
          {stats.detail.correspondanceCount > 0 && (
            <div className={`${styles.syntheseTypeItem} ${styles.syntheseTypeCorrespondance}`}>
              <div className={styles.syntheseTypeIcon}>
                <Mail size={16} aria-hidden="true" />
              </div>
              <div className={styles.syntheseTypeInfo}>
                <span className={styles.syntheseTypeLabel}>Correspondance</span>
                <span className={styles.syntheseTypeValue}>
                  {stats.correspondance} t. ({stats.detail.correspondanceCount})
                </span>
              </div>
            </div>
          )}

          {/* Absents */}
          <div className={`${styles.syntheseTypeItem} ${styles.syntheseTypeAbsent}`}>
            <div className={styles.syntheseTypeIcon}>
              <UserX size={16} aria-hidden="true" />
            </div>
            <div className={styles.syntheseTypeInfo}>
              <span className={styles.syntheseTypeLabel}>Absents</span>
              <span className={styles.syntheseTypeValue}>
                {stats.absents} t. ({stats.detail.absentsCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste détaillée des participants */}
      <div className="card">
        <h3 className={styles.sidebarTitle}>Détail des présences</h3>
        <div className={styles.participantsList}>
          {/* Présents */}
          {participantsParType.present.length > 0 && (
            <div className={styles.participantsGroup}>
              <div className={`${styles.participantsGroupHeader} ${styles.headerPresent}`}>
                <UserCheck size={14} aria-hidden="true" />
                <span>Présents ({participantsParType.present.length})</span>
              </div>
              <div className={styles.participantsGroupList}>
                {participantsParType.present.map(copro => {
                  const presence = presencesEnrichies?.[copro.id];
                  const wasCorrespondance = presence?.voteCorrespondanceNeutralise;

                  return (
                    <div key={copro.id} className={styles.participantItem}>
                      <span className={styles.participantName}>
                        {copro.nom}
                        {wasCorrespondance && (
                          <span className={styles.neutraliseBadgeSmall} title="Vote par correspondance neutralisé">
                            ex-corresp.
                          </span>
                        )}
                      </span>
                      <span className={styles.participantTantiemes}>{copro.tantiemes}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Représentés */}
          {participantsParType.represente.length > 0 && (
            <div className={styles.participantsGroup}>
              <div className={`${styles.participantsGroupHeader} ${styles.headerRepresente}`}>
                <Users size={14} aria-hidden="true" />
                <span>Représentés ({participantsParType.represente.length})</span>
              </div>
              <div className={styles.participantsGroupList}>
                {participantsParType.represente.map(copro => (
                  <div key={copro.id} className={styles.participantItem}>
                    <span className={styles.participantName}>{copro.nom}</span>
                    <span className={styles.participantTantiemes}>{copro.tantiemes}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correspondance */}
          {participantsParType.correspondance.length > 0 && (
            <div className={styles.participantsGroup}>
              <div className={`${styles.participantsGroupHeader} ${styles.headerCorrespondance}`}>
                <Mail size={14} aria-hidden="true" />
                <span>Correspondance ({participantsParType.correspondance.length})</span>
              </div>
              <div className={styles.participantsGroupList}>
                {participantsParType.correspondance.map(copro => (
                  <div key={copro.id} className={styles.participantItem}>
                    <span className={styles.participantName}>{copro.nom}</span>
                    <span className={styles.participantTantiemes}>{copro.tantiemes}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
