'use client';

import { useState, useMemo } from 'react';
import { Calendar, ChevronRight, ChevronDown, FileText, Archive } from 'lucide-react';
import { StatutAppelBadge } from './StatutAppelBadge';
import { formatCurrency } from './utils';
import type { CallCampaign } from '@/lib/finance/api';
import type { StatutAppel } from './types';
import styles from './CampaignsList.module.css';

function mapCampaignStatus(status: string): StatutAppel {
  switch (status) {
    case 'draft': return 'A_GENERER';
    case 'issued': return 'ENVOYE';
    case 'partially_paid': return 'ENVOYE';
    case 'paid': return 'SOLDE';
    case 'cancelled': return 'ANNULE';
    default: return 'A_GENERER';
  }
}

function formatAgDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getCampaignLabel(c: CallCampaign): string {
  if (c.ag_meeting_date) {
    return `Appels de fonds budget — AG du ${formatAgDate(c.ag_meeting_date)}`;
  }
  return `Appels de fonds — ${c.period_name}`;
}

function isArchived(c: CallCampaign): boolean {
  return c.global_status === 'paid';
}

interface CampaignsListProps {
  campaigns: CallCampaign[];
  onSelect: (periodId: string) => void;
}

function getProgressLabel(campaign: CallCampaign): string {
  const total = Number(campaign.total_trimesters) || 1;
  const issued = Number(campaign.trimesters_issued) || 0;
  if (issued === 0) return 'À générer';
  if (issued >= total) return 'Tous envoyés';
  return `${issued}/${total} envoyé${issued > 1 ? 's' : ''}`;
}

function getProgressStatut(campaign: CallCampaign): StatutAppel {
  const total = Number(campaign.total_trimesters) || 1;
  const issued = Number(campaign.trimesters_issued) || 0;
  if (issued === 0) return 'A_GENERER';
  if (issued >= total) return 'ENVOYE';
  return 'ENVOYE';
}

function CampaignCard({ campaign, onSelect }: { campaign: CallCampaign; onSelect: (periodId: string) => void }) {
  const tauxRecouvrement = Number(campaign.total_amount) > 0
    ? Math.round((Number(campaign.total_paid) / Number(campaign.total_amount)) * 100)
    : 0;

  const totalTrimestres = Number(campaign.total_trimesters) || 1;

  return (
    <button
      key={campaign.period_id}
      className={styles.card}
      onClick={() => onSelect(campaign.period_id)}
      type="button"
    >
      <div className={styles.cardLeft}>
        <div className={styles.icon}>
          <Calendar size={20} />
        </div>
        <div className={styles.cardInfo}>
          <span className={styles.cardLabel}>{getCampaignLabel(campaign)}</span>
          <span className={styles.cardPeriode}>{campaign.period_name}</span>
        </div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardMeta}>
          <span className={styles.cardCalls}>
            {campaign.total_keys} {Number(campaign.total_keys) > 1 ? 'clés' : 'clé'} · {totalTrimestres} appel{totalTrimestres > 1 ? 's' : ''}
          </span>
          <StatutAppelBadge statut={getProgressStatut(campaign)} size="sm" label={getProgressLabel(campaign)} />
        </div>
        <div className={styles.cardAmounts}>
          <span className={styles.cardTotal}>{formatCurrency(Number(campaign.total_amount))}</span>
          {tauxRecouvrement > 0 && (
            <span className={styles.cardRecouvrement}>{tauxRecouvrement}% encaissé</span>
          )}
        </div>
        <ChevronRight size={18} className={styles.cardArrow} />
      </div>
    </button>
  );
}

export function CampaignsList({ campaigns, onSelect }: CampaignsListProps) {
  const [showArchived, setShowArchived] = useState(false);

  const { active, archived } = useMemo(() => {
    const a: CallCampaign[] = [];
    const b: CallCampaign[] = [];
    for (const c of campaigns) {
      if (isArchived(c)) {
        b.push(c);
      } else {
        a.push(c);
      }
    }
    return { active: a, archived: b };
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FileText size={48} />
        <p>Aucun appel de fonds</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {active.map(c => (
        <CampaignCard key={c.period_id} campaign={c} onSelect={onSelect} />
      ))}

      {archived.length > 0 && (
        <>
          <button
            type="button"
            className={styles.archivedToggle}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive size={16} />
            <span>Exercices clos ({archived.length})</span>
            <ChevronDown
              size={16}
              className={`${styles.archivedChevron} ${showArchived ? styles.archivedChevronOpen : ''}`}
            />
          </button>

          {showArchived && (
            <div className={styles.archivedList}>
              {archived.map(c => (
                <CampaignCard key={c.period_id} campaign={c} onSelect={onSelect} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
