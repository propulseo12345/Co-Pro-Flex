'use client';

import { Settings, PauseCircle, PlayCircle, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/settings/reminders/reminders-settings.module.css';

interface TestResult {
  paused?: boolean;
  sent?: number;
  error?: string;
}

interface PauseStatusSectionProps {
  isPaused: boolean;
  pausedUntil: string;
  pauseReason: string;
  hasChanges: boolean;
  isManager: boolean;
  savingSettings: boolean;
  runningTest: boolean;
  testResult: TestResult | null;
  onPauseToggle: () => void;
  onPausedUntilChange: (value: string) => void;
  onPauseReasonChange: (value: string) => void;
  onSave: () => void;
  onTestRun: () => void;
}

export function PauseStatusSection({
  isPaused,
  pausedUntil,
  pauseReason,
  hasChanges,
  isManager,
  savingSettings,
  runningTest,
  testResult,
  onPauseToggle,
  onPausedUntilChange,
  onPauseReasonChange,
  onSave,
  onTestRun,
}: PauseStatusSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Settings size={20} />
          Statut des relances
        </h2>
      </div>

      <div className={`${styles.pauseStatus} ${isPaused ? styles.pauseStatusActive : ''}`}>
        <div className={`${styles.pauseIcon} ${isPaused ? styles.pauseIconActive : ''}`}>
          {isPaused ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
        </div>
        <div className={styles.pauseInfo}>
          <h4>{isPaused ? 'Relances en pause' : 'Relances actives'}</h4>
          <p>
            {isPaused
              ? pausedUntil
                ? `Les relances sont suspendues jusqu'au ${new Date(pausedUntil).toLocaleDateString('fr-FR')}`
                : 'Les relances sont suspendues indefiniment'
              : 'Les relances automatiques sont activees et s\'executeront selon les regles configurees'}
          </p>
        </div>
        {isManager && (
          <label className={`${styles.toggle} ${isPaused ? styles.toggleActive : ''}`}>
            <div className={styles.toggleSwitch} onClick={onPauseToggle} />
            <span className={styles.toggleLabel}>Pause</span>
          </label>
        )}
      </div>

      {isManager && (
        <div className={styles.pauseForm}>
          <div className={styles.formGroup}>
            <label>Date de fin de pause (optionnel)</label>
            <input
              type="date"
              value={pausedUntil}
              onChange={(e) => onPausedUntilChange(e.target.value)}
              disabled={!isPaused}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Raison de la pause (optionnel)</label>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => onPauseReasonChange(e.target.value)}
              placeholder="Ex: Periode de vacances, negociation en cours..."
              disabled={!isPaused}
            />
          </div>
          <div className={styles.formGroupFull} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onTestRun} disabled={runningTest}>
              {runningTest ? 'Test...' : 'Tester en simulation'}
            </button>
            <button className="btn btn-primary" onClick={onSave} disabled={!hasChanges || savingSettings}>
              <Save size={16} style={{ marginRight: 6 }} />
              {savingSettings ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {testResult && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: testResult.error ? 'var(--error-light)' : 'var(--success-light)', borderRadius: '8px' }}>
          {testResult.error ? (
            <p style={{ color: 'var(--error)' }}>
              <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {testResult.error}
            </p>
          ) : testResult.paused ? (
            <p style={{ color: 'var(--warning)' }}>
              <PauseCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Les relances sont en pause. Aucun email ne serait envoye.
            </p>
          ) : (
            <p style={{ color: 'var(--success)' }}>
              <CheckCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {testResult.sent} relance(s) serai(en)t envoyee(s).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
