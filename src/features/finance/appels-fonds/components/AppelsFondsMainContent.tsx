'use client';

import { ArrowLeft } from 'lucide-react';
import { AppelsFondsHeader } from '@/components/features/finance/AppelsFonds/AppelsFondsHeader';
import { AppelsFondsStats } from '@/components/features/finance/AppelsFonds/AppelsFondsStats';
import { AppelsFondsGroupedTable } from '@/components/features/finance/AppelsFonds/AppelsFondsGroupedTable';
import { CampaignsList } from '@/components/features/finance/AppelsFonds/CampaignsList';
import { RecouvrementAlert } from '@/components/features/finance/AppelsFonds/RecouvrementAlert';
import type { AppelFonds, GroupedAppelFonds, AppelsFondsStats as StatsType } from '@/components/features/finance/AppelsFonds/types';
import type { CallCampaign } from '@/lib/finance/api';
import styles from './AppelsFondsMainContent.module.css';

interface AppelsFondsMainContentProps {
  appels: AppelFonds[];
  groupedAppels: GroupedAppelFonds[];
  campaigns: CallCampaign[];
  selectedCampaignId: string | null;
  onSelectCampaign: (periodId: string | null) => void;
  stats: StatsType;
  onNewAppel: () => void;
  onEmettreAppel: (appel: AppelFonds) => void;
}

export function AppelsFondsMainContent({
  appels,
  groupedAppels,
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  stats,
  onNewAppel,
  onEmettreAppel,
}: AppelsFondsMainContentProps) {
  const selectedCampaign = campaigns.find(c => c.period_id === selectedCampaignId);

  return (
    <>
      <AppelsFondsHeader onNewAppel={onNewAppel} />

      <AppelsFondsStats stats={stats} />

      <RecouvrementAlert
        tauxRecouvrement={stats.tauxRecouvrement}
        montantRestant={stats.montantTotal - stats.montantEncaisse}
      />

      {/* Navigation: campaigns list → grouped table */}
      {!selectedCampaignId ? (
        <CampaignsList
          campaigns={campaigns}
          onSelect={(periodId) => onSelectCampaign(periodId)}
        />
      ) : (
        <>
          <div className={styles.backRow}>
            <button
              className={styles.backButton}
              onClick={() => onSelectCampaign(null)}
              type="button"
            >
              <ArrowLeft size={16} />
              Retour aux appels de fonds
            </button>
            {selectedCampaign && (
              <span className={styles.campaignTitle}>
                {selectedCampaign.ag_meeting_date
                  ? `Budget AG du ${new Date(selectedCampaign.ag_meeting_date).toLocaleDateString('fr-FR')}`
                  : selectedCampaign.period_name
                }
              </span>
            )}
          </div>

          <AppelsFondsGroupedTable
            groups={groupedAppels}
            onEmettreAppel={onEmettreAppel}
          />
        </>
      )}
    </>
  );
}
