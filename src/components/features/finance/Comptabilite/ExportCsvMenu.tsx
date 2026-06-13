'use client';

import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { ExportCsvKind } from '@/lib/export/accounting-csv';
import styles from './ExportCsvMenu.module.css';

interface ExportCsvMenuProps {
  onExport: (kind: ExportCsvKind) => void;
  disabled?: boolean;
}

const ITEMS: { kind: ExportCsvKind; label: string }[] = [
  { kind: 'grand-livre', label: 'Grand livre (CSV)' },
  { kind: 'balance', label: 'Balance (CSV)' },
  { kind: 'journaux', label: 'Journaux (CSV)' },
];

/**
 * Bouton d'export comptable : ouvre un menu proposant les 3 exports CSV
 * (grand livre, balance, journaux). Fermeture par clic en dehors (overlay).
 */
export function ExportCsvMenu({ onExport, disabled }: ExportCsvMenuProps) {
  const [open, setOpen] = useState(false);

  const pick = (kind: ExportCsvKind) => {
    onExport(kind);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Exporter la comptabilité en CSV"
      >
        <Download size={16} aria-hidden="true" />
        <span className={styles.label}>Exporter</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={styles.menu} role="menu">
            {ITEMS.map((item) => (
              <button
                key={item.kind}
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => pick(item.kind)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
