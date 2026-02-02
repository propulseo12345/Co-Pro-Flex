'use client';

import { AppelsFondsHeader } from '@/components/features/finance/AppelsFonds/AppelsFondsHeader';
import { AppelsFondsStats } from '@/components/features/finance/AppelsFonds/AppelsFondsStats';
import { AppelsFondsFilters } from '@/components/features/finance/AppelsFonds/AppelsFondsFilters';
import { AppelsFondsTable } from '@/components/features/finance/AppelsFonds/AppelsFondsTable';
import { RecouvrementAlert } from '@/components/features/finance/AppelsFonds/RecouvrementAlert';
import { AppelsFondsAlerts } from '@/components/features/finance/AppelsFonds/AppelsFondsAlerts';
import type { AppelFonds, AppelsFondsStats as StatsType, StatutAppel, TypeAppel, AlerteDelai } from '@/components/features/finance/AppelsFonds/types';

interface AppelsFondsMainContentProps {
  appels: AppelFonds[];
  filteredAppels: AppelFonds[];
  stats: StatsType;
  searchTerm: string;
  statutFilter: 'TOUS' | StatutAppel;
  typeFilter: 'TOUS' | TypeAppel;
  onSearchChange: (value: string) => void;
  onStatutChange: (value: 'TOUS' | StatutAppel) => void;
  onTypeChange: (value: 'TOUS' | TypeAppel) => void;
  onNewAppel: () => void;
  onGestionClick: (appel: AppelFonds) => void;
  onMontantClick: (appel: AppelFonds) => void;
  onViewAppel: (appel: AppelFonds) => void;
  onEditAppel: (appel: AppelFonds) => void;
  onDeleteAppel: (appel: AppelFonds) => void;
  onEmettreAppel: (appel: AppelFonds) => void;
  onVoirRelances: (appel: AppelFonds) => void;
  onExportAvis: (appel: AppelFonds) => void;
  onAlerteAction: (alerte: AlerteDelai) => void;
}

export function AppelsFondsMainContent({
  appels,
  filteredAppels,
  stats,
  searchTerm,
  statutFilter,
  typeFilter,
  onSearchChange,
  onStatutChange,
  onTypeChange,
  onNewAppel,
  onGestionClick,
  onMontantClick,
  onViewAppel,
  onEditAppel,
  onDeleteAppel,
  onEmettreAppel,
  onVoirRelances,
  onExportAvis,
  onAlerteAction,
}: AppelsFondsMainContentProps) {
  return (
    <>
      <AppelsFondsHeader onNewAppel={onNewAppel} />

      <AppelsFondsStats stats={stats} />

      <RecouvrementAlert
        tauxRecouvrement={stats.tauxRecouvrement}
        montantRestant={stats.montantTotal - stats.montantEncaisse}
      />

      <AppelsFondsAlerts
        appels={appels}
        onActionClick={onAlerteAction}
        maxAlertes={3}
      />

      <AppelsFondsFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        statutFilter={statutFilter}
        onStatutChange={onStatutChange}
        typeFilter={typeFilter}
        onTypeChange={onTypeChange}
      />

      <AppelsFondsTable
        appels={filteredAppels}
        onGestionClick={onGestionClick}
        onMontantClick={onMontantClick}
        onViewAppel={onViewAppel}
        onEditAppel={onEditAppel}
        onDeleteAppel={onDeleteAppel}
        onEmettreAppel={onEmettreAppel}
        onVoirRelances={onVoirRelances}
        onExportAvis={onExportAvis}
      />
    </>
  );
}
