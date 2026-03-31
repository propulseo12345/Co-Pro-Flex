'use client';

import Link from 'next/link';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface OdsGroup {
  count: number;
  label: string;
  names: string;
  dotClass: string;
  linkClass: string;
  linkLabel: string;
  href: string;
}

interface BentoODSProps {
  urgents: number;
  enCours: number;
  programmes: number;
  urgentNames?: string;
  enCoursNames?: string;
  programmesNames?: string;
}

export function BentoODS({
  urgents,
  enCours,
  programmes,
  urgentNames = '',
  enCoursNames = '',
  programmesNames = '',
}: BentoODSProps) {
  const total = urgents + enCours + programmes;

  const groups: OdsGroup[] = [
    {
      count: urgents,
      label: `${urgents} urgent${urgents > 1 ? 's' : ''}`,
      names: urgentNames,
      dotClass: styles.dotRed,
      linkClass: styles.actionLinkRed,
      linkLabel: 'Traiter →',
      href: '/maintenance/service-orders?status=urgent',
    },
    {
      count: enCours,
      label: `${enCours} en cours`,
      names: enCoursNames,
      dotClass: styles.dotBlue,
      linkClass: styles.actionLinkBlue,
      linkLabel: 'Suivre →',
      href: '/maintenance/service-orders?status=en_cours',
    },
    {
      count: programmes,
      label: `${programmes} programmé${programmes > 1 ? 's' : ''}`,
      names: programmesNames,
      dotClass: styles.dotGray,
      linkClass: styles.actionLinkGray,
      linkLabel: 'Planifier →',
      href: '/maintenance/service-orders?status=programme',
    },
  ];

  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.odsHeader}>
        <div className={styles.label} style={{ marginBottom: 0 }}>Ordres de service</div>
        <span className={`${styles.badge} ${styles.badgeBlue}`}>{total} ouverts</span>
      </div>
      <div className={styles.odsRows}>
        {groups.filter(g => g.count > 0).map((group) => (
          <div key={group.label} className={`${styles.miniCard} ${styles.odsRow}`}>
            <span className={`${styles.dot} ${group.dotClass}`} />
            <div className={styles.odsRowText}>
              <div className={styles.odsRowTitle}>{group.label}</div>
              {group.names && <div className={styles.odsRowSub}>{group.names}</div>}
            </div>
            <Link href={group.href} className={`${styles.actionLink} ${group.linkClass}`}>
              {group.linkLabel}
            </Link>
          </div>
        ))}
      </div>
      <Link
        href="/maintenance/service-orders/new"
        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
      >
        Créer un ordre de service
      </Link>
    </div>
  );
}
