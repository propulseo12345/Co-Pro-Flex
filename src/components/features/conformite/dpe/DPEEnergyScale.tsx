'use client';

import clsx from 'clsx';
import type { ClasseDPE } from '@/types';
import styles from './DPEEnergyScale.module.css';

const CLASSES: { classe: ClasseDPE; label: string; range: string; rowClass: string; barClass: string }[] = [
  { classe: 'A', label: 'A', range: '< 70',   rowClass: styles.rowA, barClass: styles.barA },
  { classe: 'B', label: 'B', range: '70–110',  rowClass: styles.rowB, barClass: styles.barB },
  { classe: 'C', label: 'C', range: '110–180', rowClass: styles.rowC, barClass: styles.barC },
  { classe: 'D', label: 'D', range: '180–250', rowClass: styles.rowD, barClass: styles.barD },
  { classe: 'E', label: 'E', range: '250–330', rowClass: styles.rowE, barClass: styles.barE },
  { classe: 'F', label: 'F', range: '330–420', rowClass: styles.rowF, barClass: styles.barF },
  { classe: 'G', label: 'G', range: '> 420',   rowClass: styles.rowG, barClass: styles.barG },
];

interface DPEEnergyScaleProps {
  classeActive: ClasseDPE;
}

export function DPEEnergyScale({ classeActive }: DPEEnergyScaleProps) {
  return (
    <div className={styles.scale}>
      {CLASSES.map((c, i) => {
        const isActive = c.classe === classeActive;
        const barWidth = 40 + i * 12;
        return (
          <div key={c.classe} className={clsx(styles.row, isActive && styles.rowActive)}>
            <div className={clsx(styles.bar, c.barClass)} style={{ width: barWidth }}>
              {c.label}
            </div>
            <span className={styles.range}>{c.range} kWh/m²/an</span>
            {isActive && <span className={styles.arrow}>◄ votre bien</span>}
          </div>
        );
      })}
    </div>
  );
}
