'use client';

import { Mail } from 'lucide-react';
import {
  DeliveryModeSelector,
  DeliveryByOwnerTable,
  PostalLabelsGeneratorButton,
  EmailSendTrackingPanel,
} from '@/components/features/ag/Delivery';
import type { DeliveryMode, PostalSendType } from '@/types/enums';
import type { DeliveryStats, OwnerDeliveryStatus } from '@/hooks/modules/useDeliveryConfig';
import type { SyndicInfo, ActiveTab } from '../hooks/useConvocationPage';
import styles from '@/app/(dashboard)/ag/[id]/convocation/convocation.module.css';

interface ConvocationSendingColumnProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  // Delivery config
  globalMode: DeliveryMode | 'PAR_COPROPRIETAIRE';
  isRegistered: boolean;
  sendType: PostalSendType;
  stats: DeliveryStats;
  ownerStatuses: OwnerDeliveryStatus[];
  // Syndic info for postal labels
  syndicInfo: SyndicInfo;
  agTitle?: string;
  // Actions
  onModeChange: (mode: DeliveryMode | 'PAR_COPROPRIETAIRE') => void;
  onRegisteredChange: (isRegistered: boolean) => void;
  onOwnerModeChange: (ownerId: string, mode: DeliveryMode) => void;
  onSavePreferences: () => void;
  onResetPreferences: () => void;
  onSendEmail: (ownerId: string) => void;
  onSendAllEmails: () => void;
  getOwnersForPostal: () => OwnerDeliveryStatus[];
  getOwnersForEmail: () => OwnerDeliveryStatus[];
}

export function ConvocationSendingColumn({
  activeTab,
  setActiveTab,
  globalMode,
  isRegistered,
  sendType,
  stats,
  ownerStatuses,
  syndicInfo,
  agTitle,
  onModeChange,
  onRegisteredChange,
  onOwnerModeChange,
  onSavePreferences,
  onResetPreferences,
  onSendEmail,
  onSendAllEmails,
  getOwnersForPostal,
  getOwnersForEmail,
}: ConvocationSendingColumnProps) {
  return (
    <div className={styles.sendingColumn}>
      {/* Section title */}
      <h2 className={styles.sendingColumnTitle}>
        <Mail size={24} aria-hidden="true" />
        Gestion des envois
      </h2>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('config')}
          className={`${styles.tab} ${activeTab === 'config' ? styles.tabActive : ''}`}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`${styles.tab} ${activeTab === 'tracking' ? styles.tabActive : ''}`}
        >
          Suivi d&apos;envoi
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'config' ? (
          <>
            <DeliveryModeSelector
              selectedMode={globalMode}
              isRegistered={isRegistered}
              stats={stats}
              onModeChange={onModeChange}
              onRegisteredChange={onRegisteredChange}
            />

            <DeliveryByOwnerTable
              owners={ownerStatuses}
              globalMode={globalMode}
              onOwnerModeChange={onOwnerModeChange}
              onSavePreferences={onSavePreferences}
              onResetPreferences={onResetPreferences}
            />

            {/* Actions */}
            <div className={styles.actionsSection}>
              <PostalLabelsGeneratorButton
                postalRecipients={getOwnersForPostal()}
                sendType={sendType}
                sender={syndicInfo}
                agTitle={agTitle}
              />
            </div>
          </>
        ) : (
          <EmailSendTrackingPanel
            emailRecipients={getOwnersForEmail()}
            stats={stats}
            onSendEmail={onSendEmail}
            onSendAllEmails={onSendAllEmails}
          />
        )}
      </div>
    </div>
  );
}
