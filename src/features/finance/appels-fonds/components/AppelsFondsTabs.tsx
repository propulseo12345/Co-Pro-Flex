'use client';

import React from 'react';
import clsx from 'clsx';
import { BarChart3, FileText, Wrench } from 'lucide-react';
import type { AppelTab } from '../types';
import { StatusBadge } from './StatusBadge';
import styles from '../styles/AppelsFondsPage.module.css';

interface AppelsFondsTabsProps {
  activeTab: AppelTab;
  onTabChange: (tab: AppelTab) => void;
  globalAmount: string;
  globalRate: number;
  courantAmount: string;
  courantRate: number;
  travauxAmount: string;
  travauxRate: number;
}

interface TabDef {
  id: AppelTab;
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  amount: string;
  rate: number;
  activeClass: string;
}

export function AppelsFondsTabs({
  activeTab,
  onTabChange,
  globalAmount,
  globalRate,
  courantAmount,
  courantRate,
  travauxAmount,
  travauxRate,
}: AppelsFondsTabsProps) {
  const tabs: TabDef[] = [
    {
      id: 'all',
      icon: <BarChart3 size={14} />,
      iconClass: styles.tabIconNeutral,
      label: 'Vue globale',
      amount: globalAmount,
      rate: globalRate,
      activeClass: styles.tabActiveAll,
    },
    {
      id: 'courant',
      icon: <FileText size={14} />,
      iconClass: styles.tabIconBlue,
      label: 'Budget Courant',
      amount: courantAmount,
      rate: courantRate,
      activeClass: styles.tabActiveBlue,
    },
    {
      id: 'travaux',
      icon: <Wrench size={14} />,
      iconClass: styles.tabIconPurple,
      label: 'Budget Travaux',
      amount: travauxAmount,
      rate: travauxRate,
      activeClass: styles.tabActivePurple,
    },
  ];

  return (
    <div className={styles.tabsBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={clsx(
            styles.tab,
            activeTab === tab.id && styles.tabActive,
            activeTab === tab.id && tab.activeClass,
          )}
          onClick={() => onTabChange(tab.id)}
        >
          <div className={clsx(styles.tabIcon, tab.iconClass)}>{tab.icon}</div>
          <div>
            <div className={styles.tabLabel}>{tab.label}</div>
            <div className={styles.tabAmount}>{tab.amount}</div>
          </div>
          <StatusBadge
            label={`${tab.rate} %`}
            variant={tab.rate >= 60 ? 'green' : 'amber'}
          />
        </button>
      ))}
    </div>
  );
}
