'use client';

import { Calendar, ChevronRight, FileText } from 'lucide-react';
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

interface CampaignsListProps {
  campaigns: CallCampaign[];
  onSelect: (periodId: string) => void;
}

export function CampaignsList({ campaigns, onSelect }: CampaignsListProps) {
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
      {campaigns.map(c => {
        const tauxRecouvrement = Number(c.total_amount) > 0
          ? Math.round((Number(c.total_paid) / Number(c.total_amount)) * 100)
          : 0;

        return (
          <button
            key={c.period_id}
            className={styles.card}
            onClick={() => onSelect(c.period_id)}
            type="button"
          >
            <div className={styles.cardLeft}>
              <div className={styles.icon}>
                <Calendar size={20} />
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardLabel}>{getCampaignLabel(c)}</span>
                <span className={styles.cardPeriode}>{c.period_name}</span>
              </div>
            </div>
            <div className={styles.cardRight}>
              <div className={styles.cardMeta}>
                <span className={styles.cardCalls}>
                  {c.total_keys} {Number(c.total_keys) > 1 ? 'clés' : 'clé'} · {c.total_calls} appels
                </span>
                <StatutAppelBadge statut={mapCampaignStatus(c.global_status)} size="sm" />
              </div>
              <div className={styles.cardAmounts}>
                <span className={styles.cardTotal}>{formatCurrency(Number(c.total_amount))}</span>
                {tauxRecouvrement > 0 && (
                  <span className={styles.cardRecouvrement}>{tauxRecouvrement}% encaissé</span>
                )}
              </div>
              <ChevronRight size={18} className={styles.cardArrow} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
