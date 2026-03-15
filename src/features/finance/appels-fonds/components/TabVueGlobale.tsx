'use client';

import { useState } from 'react';
import { ChevronRight, FileText, Wrench, Calendar, Zap } from 'lucide-react';
import clsx from 'clsx';
import type { CallCategory, CallGroup } from '../types';
import type { CallForFundsOverview } from '@/lib/finance/api';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import type { BadgeVariant } from './StatusBadge';
import styles from './TabVueGlobale.module.css';

interface TabVueGlobaleProps {
  groupedCalls: CallCategory[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émis',
  partially_paid: 'Partiel',
  paid: 'Payé',
  cancelled: 'Annulé',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: 'neutral',
  issued: 'amber',
  partially_paid: 'purple',
  paid: 'green',
  cancelled: 'red',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  courant: <FileText size={16} />,
  travaux: <Wrench size={16} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  courant: styles.categoryBlue,
  travaux: styles.categoryPurple,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function CallTable({ calls }: { calls: CallForFundsOverview[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Libellé</th>
          <th>Clé</th>
          <th>Échéance</th>
          <th className={styles.thRight}>Appelé</th>
          <th className={styles.thRight}>Payé</th>
          <th className={styles.thRight}>Restant</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id}>
            <td className={styles.labelCell}>
              <Calendar size={13} className={styles.labelIcon} />
              {call.label}
            </td>
            <td className={styles.metaCell}>{call.repartition_key_name}</td>
            <td className={styles.metaCell}>{formatDate(call.due_date)}</td>
            <td className={styles.amountCell}>{formatEuros(call.total_amount)}</td>
            <td className={styles.amountCellGreen}>{formatEuros(call.total_paid)}</td>
            <td className={styles.amountCellRed}>{formatEuros(call.total_unpaid)}</td>
            <td>
              <StatusBadge
                label={STATUS_LABELS[call.status] ?? call.status}
                variant={STATUS_VARIANTS[call.status] ?? 'neutral'}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupAccordion({ group, defaultOpen }: { group: CallGroup; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const isPonctuel = group.label === 'Appels ponctuels';

  return (
    <div className={styles.group}>
      <button className={styles.groupHeader} onClick={() => setOpen(!open)}>
        <ChevronRight size={14} className={clsx(styles.chevron, open && styles.chevronOpen)} />
        <span className={styles.groupIcon}>
          {isPonctuel ? <Zap size={14} /> : <FileText size={14} />}
        </span>
        <span className={styles.groupLabel}>{group.label}</span>
        <span className={styles.groupCount}>{group.calls.length} appel{group.calls.length > 1 ? 's' : ''}</span>
        <span className={styles.groupAmount}>{formatEuros(group.stats.totalCalled)}</span>
        <StatusBadge
          label={`${group.stats.recoveryRate} %`}
          variant={group.stats.recoveryRate >= 60 ? 'green' : 'amber'}
        />
      </button>
      {open && (
        <div className={styles.groupBody}>
          <CallTable calls={group.calls} />
        </div>
      )}
    </div>
  );
}

export function TabVueGlobale({ groupedCalls }: TabVueGlobaleProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (groupedCalls.length === 0) {
    return (
      <div className={styles.empty}>
        <FileText size={32} />
        <p>Aucun appel de fonds pour cet exercice.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {groupedCalls.map((category) => {
        const isOpen = openCategories.has(category.id);

        return (
          <div key={category.id} className={styles.category}>
            <button
              className={clsx(styles.categoryHeader, CATEGORY_COLORS[category.id])}
              onClick={() => toggleCategory(category.id)}
            >
              <ChevronRight size={16} className={clsx(styles.chevron, isOpen && styles.chevronOpen)} />
              <span className={clsx(styles.categoryIcon, CATEGORY_COLORS[category.id])}>
                {CATEGORY_ICONS[category.id]}
              </span>
              <span className={styles.categoryLabel}>{category.label}</span>
              <span className={styles.categoryAmount}>{formatEuros(category.stats.totalCalled)}</span>
              <StatusBadge
                label={`${category.stats.recoveryRate} %`}
                variant={category.stats.recoveryRate >= 60 ? 'green' : 'amber'}
              />
            </button>
            {isOpen && (
              <div className={styles.categoryBody}>
                {category.groups.map((group) => (
                  <GroupAccordion key={group.label} group={group} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
