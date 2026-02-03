'use client';

import { useMemo } from 'react';
import { UserCheck, Users, Mail, UserX } from 'lucide-react';
import {
  type PresenceData,
  type ModeParticipation,
  calculerStatsParticipation
} from '@/lib/utils/ag-session';
import sidebarStyles from './styles/sidebar.module.css';

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
    <div className={sidebarStyles.sidebar}>
      {/* Progression */}
      <div className="card">
        <h3 className={sidebarStyles.sidebarTitle}>Progression</h3>
        <div className={sidebarStyles.progressBar}>
          <div
            className={sidebarStyles.progressFill}
            style={{ width: `${((currentResolutionIndex + 1) / totalResolutions) * 100}%` }}
          />
        </div>
        <p className={sidebarStyles.progressText}>
          {currentResolutionIndex + 1} / {totalResolutions} résolutions
        </p>
      </div>

      {/* Synthèse des participants */}
      <div className="card">
        <h3 className={sidebarStyles.sidebarTitle}>Participants</h3>

        {/* Total */}
        <div className={sidebarStyles.participantsSynthese}>
          <div className={sidebarStyles.syntheseTotal}>
            <span className={sidebarStyles.syntheseTotalValue}>{stats.total}</span>
            <span className={sidebarStyles.syntheseTotalLabel}>
              / {totalTantiemes} tantièmes ({pourcentage}%)
            </span>
          </div>
        </div>

        {/* Ventilation par type */}
        <div className={sidebarStyles.syntheseByType}>
          {/* Présents */}
          <div className={`${sidebarStyles.syntheseTypeItem} ${sidebarStyles.syntheseTypePresent}`}>
            <div className={sidebarStyles.syntheseTypeIcon}>
              <UserCheck size={16} aria-hidden="true" />
            </div>
            <div className={sidebarStyles.syntheseTypeInfo}>
              <span className={sidebarStyles.syntheseTypeLabel}>Présents</span>
              <span className={sidebarStyles.syntheseTypeValue}>
                {stats.presents} t. ({stats.detail.presentsCount})
              </span>
            </div>
          </div>

          {/* Représentés */}
          {stats.detail.representesCount > 0 && (
            <div className={`${sidebarStyles.syntheseTypeItem} ${sidebarStyles.syntheseTypeRepresente}`}>
              <div className={sidebarStyles.syntheseTypeIcon}>
                <Users size={16} aria-hidden="true" />
              </div>
              <div className={sidebarStyles.syntheseTypeInfo}>
                <span className={sidebarStyles.syntheseTypeLabel}>Représentés</span>
                <span className={sidebarStyles.syntheseTypeValue}>
                  {stats.representes} t. ({stats.detail.representesCount})
                </span>
              </div>
            </div>
          )}

          {/* Correspondance */}
          {stats.detail.correspondanceCount > 0 && (
            <div className={`${sidebarStyles.syntheseTypeItem} ${sidebarStyles.syntheseTypeCorrespondance}`}>
              <div className={sidebarStyles.syntheseTypeIcon}>
                <Mail size={16} aria-hidden="true" />
              </div>
              <div className={sidebarStyles.syntheseTypeInfo}>
                <span className={sidebarStyles.syntheseTypeLabel}>Correspondance</span>
                <span className={sidebarStyles.syntheseTypeValue}>
                  {stats.correspondance} t. ({stats.detail.correspondanceCount})
                </span>
              </div>
            </div>
          )}

          {/* Absents */}
          <div className={`${sidebarStyles.syntheseTypeItem} ${sidebarStyles.syntheseTypeAbsent}`}>
            <div className={sidebarStyles.syntheseTypeIcon}>
              <UserX size={16} aria-hidden="true" />
            </div>
            <div className={sidebarStyles.syntheseTypeInfo}>
              <span className={sidebarStyles.syntheseTypeLabel}>Absents</span>
              <span className={sidebarStyles.syntheseTypeValue}>
                {stats.absents} t. ({stats.detail.absentsCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste détaillée des participants */}
      <div className="card">
        <h3 className={sidebarStyles.sidebarTitle}>Détail des présences</h3>
        <div className={sidebarStyles.participantsList}>
          {/* Présents */}
          {participantsParType.present.length > 0 && (
            <div className={sidebarStyles.participantsGroup}>
              <div className={`${sidebarStyles.participantsGroupHeader} ${sidebarStyles.headerPresent}`}>
                <UserCheck size={14} aria-hidden="true" />
                <span>Présents ({participantsParType.present.length})</span>
              </div>
              <div className={sidebarStyles.participantsGroupList}>
                {participantsParType.present.map(copro => {
                  const presence = presencesEnrichies?.[copro.id];
                  const wasCorrespondance = presence?.voteCorrespondanceNeutralise;

                  return (
                    <div key={copro.id} className={sidebarStyles.participantItem}>
                      <span className={sidebarStyles.participantName}>
                        {copro.nom}
                        {wasCorrespondance && (
                          <span className={sidebarStyles.neutraliseBadgeSmall} title="Vote par correspondance neutralisé">
                            ex-corresp.
                          </span>
                        )}
                      </span>
                      <span className={sidebarStyles.participantTantiemes}>{copro.tantiemes}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Représentés */}
          {participantsParType.represente.length > 0 && (
            <div className={sidebarStyles.participantsGroup}>
              <div className={`${sidebarStyles.participantsGroupHeader} ${sidebarStyles.headerRepresente}`}>
                <Users size={14} aria-hidden="true" />
                <span>Représentés ({participantsParType.represente.length})</span>
              </div>
              <div className={sidebarStyles.participantsGroupList}>
                {participantsParType.represente.map(copro => (
                  <div key={copro.id} className={sidebarStyles.participantItem}>
                    <span className={sidebarStyles.participantName}>{copro.nom}</span>
                    <span className={sidebarStyles.participantTantiemes}>{copro.tantiemes}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correspondance */}
          {participantsParType.correspondance.length > 0 && (
            <div className={sidebarStyles.participantsGroup}>
              <div className={`${sidebarStyles.participantsGroupHeader} ${sidebarStyles.headerCorrespondance}`}>
                <Mail size={14} aria-hidden="true" />
                <span>Correspondance ({participantsParType.correspondance.length})</span>
              </div>
              <div className={sidebarStyles.participantsGroupList}>
                {participantsParType.correspondance.map(copro => (
                  <div key={copro.id} className={sidebarStyles.participantItem}>
                    <span className={sidebarStyles.participantName}>{copro.nom}</span>
                    <span className={sidebarStyles.participantTantiemes}>{copro.tantiemes}</span>
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
