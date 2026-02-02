'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { StatCard } from '../domain/types';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface StatsGridProps {
  stats: StatCard[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className={styles.statsGrid}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link
            key={stat.id}
            href={stat.link}
            className={styles.statCard}
            aria-hidden="true"
          >
            <div
              className={styles.statIcon}
              style={{ background: `${stat.color}20` }}
            >
              <Icon size={24} style={{ color: stat.color }} aria-hidden="true" />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stat.value}</h3>
              <p className={styles.statLabel}>{stat.label}</p>
              {stat.subInfo && (
                <span className={styles.statSubInfo}>{stat.subInfo}</span>
              )}
            </div>
            <ArrowRight size={18} className={styles.statArrow} aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
