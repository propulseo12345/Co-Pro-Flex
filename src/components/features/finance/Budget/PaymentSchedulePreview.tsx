'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import {
  getTemplateById,
  applyRetention,
  computeAmounts,
  RETENTION_PERCENTAGE,
} from '@/lib/constants/payment-schedule-templates';
import type { PaymentScheduleTemplate } from '@/lib/constants/payment-schedule-templates';
import styles from './PaymentSchedulePreview.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Phase {
  label: string;
  percentage: number;
  dueDate?: string;
  isRetention?: boolean;
}

interface PaymentSchedulePreviewProps {
  totalAmount: number;
  templateId: string;
  withRetention: boolean;
  onPhasesChange: (phases: { label: string; percentage: number; dueDate?: string }[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC';
}

function buildPhases(templateId: string, withRetention: boolean): Phase[] {
  const tpl = getTemplateById(templateId);
  if (!tpl) return [];

  let base = tpl.phases.map((p) => ({ ...p }));

  if (withRetention && base.length > 0) {
    base = applyRetention(base);
  }

  return base.map((p, i, arr) => ({
    label: p.label,
    percentage: p.percentage,
    isRetention: withRetention && i === arr.length - 1 && p.label === 'Retenue de garantie',
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentSchedulePreview({
  totalAmount,
  templateId,
  withRetention,
  onPhasesChange,
}: PaymentSchedulePreviewProps) {
  const [phases, setPhases] = useState<Phase[]>(() => buildPhases(templateId, withRetention));

  // Rebuild phases when template or retention toggle changes
  useEffect(() => {
    const next = buildPhases(templateId, withRetention);
    setPhases(next);
  }, [templateId, withRetention]);

  // Notify parent whenever phases change
  useEffect(() => {
    onPhasesChange(
      phases.map((p) => ({
        label: p.label,
        percentage: p.percentage,
        ...(p.dueDate ? { dueDate: p.dueDate } : {}),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);

  const isCustom = templateId === ('custom' as PaymentScheduleTemplate);
  const amounts = computeAmounts(
    phases.map((p) => ({ label: p.label, percentage: p.percentage })),
    totalAmount,
  );
  const totalPct = phases.reduce((s, p) => s + p.percentage, 0);
  const isValid = Math.abs(totalPct - 100) < 0.01;

  // ── Handlers ──────────────────────────────────────────────────────────

  const updatePhase = useCallback((index: number, patch: Partial<Phase>) => {
    setPhases((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }, []);

  const removePhase = useCallback((index: number) => {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addPhase = useCallback(() => {
    setPhases((prev) => [...prev, { label: `Phase ${prev.length + 1}`, percentage: 0 }]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerCell}>#</span>
        <span className={styles.headerCell}>Label</span>
        <span className={styles.headerCell}>%</span>
        <span className={styles.headerCell}>Montant</span>
        <span className={styles.headerCell}>Date pr&eacute;vue</span>
      </div>

      {/* Rows */}
      {phases.map((phase, idx) => {
        const rowClass = phase.isRetention
          ? `${styles.row} ${styles.retentionRow}`
          : styles.row;

        return (
          <div key={idx} className={rowClass}>
            {/* # */}
            <span className={`${styles.cell} ${styles.cellIndex}`}>{idx + 1}</span>

            {/* Label */}
            <span className={styles.cell}>
              {phase.isRetention && <Lock size={12} className={styles.lockIcon} />}
              {phase.isRetention ? (
                <span className={styles.retentionLabel}>{phase.label}</span>
              ) : (
                <input
                  type="text"
                  className={styles.inlineInput}
                  value={phase.label}
                  onChange={(e) => updatePhase(idx, { label: e.target.value })}
                  placeholder="Label de la phase"
                />
              )}
            </span>

            {/* % */}
            <span className={styles.cell}>
              {isCustom && !phase.isRetention ? (
                <input
                  type="number"
                  className={styles.percentInput}
                  value={phase.percentage}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e) =>
                    updatePhase(idx, { percentage: Math.max(0, Number(e.target.value)) })
                  }
                />
              ) : (
                <span className={styles.readonlyPercent}>{phase.percentage} %</span>
              )}
            </span>

            {/* Montant */}
            <span className={`${styles.cell} ${styles.cellAmount}`}>
              {formatEur(amounts[idx] ?? 0)}
            </span>

            {/* Date */}
            <span className={styles.cell}>
              {phase.isRetention ? (
                <span className={styles.readonlyPercent}>&mdash;</span>
              ) : (
                <input
                  type="date"
                  className={styles.dateInput}
                  value={phase.dueDate ?? ''}
                  onChange={(e) => updatePhase(idx, { dueDate: e.target.value || undefined })}
                />
              )}
              {isCustom && !phase.isRetention && phases.length > 1 && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => removePhase(idx)}
                  title="Supprimer cette phase"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </span>
          </div>
        );
      })}

      {/* Add phase (custom only) */}
      {isCustom && (
        <button type="button" className={styles.addBtn} onClick={addPhase}>
          <Plus size={14} />
          Ajouter une phase
        </button>
      )}

      {/* Summary bar */}
      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <span className={styles.summaryLabel}>Total des phases</span>
          <span className={styles.summaryAmount}>{formatEur(totalAmount)}</span>
        </div>
        <div className={styles.summaryRight}>
          <span className={isValid ? styles.validBadge : styles.invalidBadge}>
            {isValid ? '100 %' : `${Math.round(totalPct)} %`}
          </span>
        </div>
      </div>
    </div>
  );
}
