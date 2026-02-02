'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { AgMeeting } from '@/lib/ag/types';
import type { AccountingPeriodInfo } from '@/lib/finance/accounting-period';
import styles from '@/app/(dashboard)/ag/[id]/agenda/agenda.module.css';

interface AgendaMessagesProps {
  agId: string;
  meeting: AgMeeting | null;
  agFormData: { budgetExercice?: string } | null;
  saveStateError: string | null;
  dbError: string | null;
  isLoading: boolean;
  resolutionsCount: number;
  accountingPeriod: AccountingPeriodInfo | null;
  showSuccessMessage: boolean;
  successMessageCount: number;
  prefillWarning: { added: number; skipped: number; total: number } | null;
  isManager: boolean;
}

export function AgendaMessages({
  agId,
  meeting,
  agFormData,
  saveStateError,
  dbError,
  isLoading,
  resolutionsCount,
  accountingPeriod,
  showSuccessMessage,
  successMessageCount,
  prefillWarning,
  isManager,
}: AgendaMessagesProps) {
  return (
    <>
      {/* Error messages */}
      {(saveStateError || dbError) && (
        <div className={styles.warningMessage}>
          <AlertTriangle size={20} />
          <span><strong>Erreur:</strong> {saveStateError || dbError}</span>
        </div>
      )}

      {/* Debug info if no resolution and no meeting */}
      {!isLoading && resolutionsCount === 0 && !meeting && (
        <div className={styles.warningMessage}>
          <AlertTriangle size={20} />
          <span><strong>AG non trouvee</strong> - Verifiez que l&apos;AG existe dans Supabase (ID: {agId})</span>
        </div>
      )}

      {/* Debug panel */}
      <details className={styles.infoMessage} style={{ cursor: 'pointer' }} open>
        <summary>
          <Info size={16} style={{ display: 'inline', marginRight: '8px' }} />
          <strong>Debug Info</strong> (cliquer pour fermer)
        </summary>
        <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.6' }}>
          <p>AG ID: <code>{agId}</code></p>
          <p>Meeting trouve: {meeting ? 'Oui' : 'Non'}</p>
          <p>Meeting type: {meeting?.meeting_type || 'N/A'}</p>
          <p>isManager: {isManager ? 'Oui' : 'Non'}</p>
          <p>Resolutions en DB: {resolutionsCount}</p>
          <p>Loading: {isLoading ? 'Oui' : 'Non'}</p>
          <p>DB Error: <span style={{ color: dbError ? 'red' : 'inherit' }}>{dbError || 'Aucune'}</span></p>
          <p>Save Error: <span style={{ color: saveStateError ? 'red' : 'inherit' }}>{saveStateError || 'Aucune'}</span></p>
        </div>
      </details>

      {/* Accounting period warning */}
      {!accountingPeriod && (
        <div className={styles.infoMessage}>
          <Info size={20} />
          <span>
            <strong>Exercice comptable non configure</strong> pour l&apos;annee {agFormData?.budgetExercice || new Date().getFullYear() + 1}.
            Les dates de l&apos;exercice ne seront pas pre-remplies automatiquement.{' '}
            <Link href="/finance/budgets">Configurer l&apos;exercice dans Finance</Link>
          </span>
        </div>
      )}

      {/* Success message */}
      {showSuccessMessage && successMessageCount > 0 && (
        <div className={styles.successMessage}>
          <CheckCircle size={20} />
          <span><strong>{successMessageCount} resolutions</strong> ont ete ajoutees automatiquement.</span>
        </div>
      )}

      {/* Prefill warning */}
      {prefillWarning && (
        <div className={prefillWarning.added > 0 ? styles.successMessage : styles.warningMessage}>
          {prefillWarning.added > 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>
            {prefillWarning.added > 0 ? (
              <>
                <strong>{prefillWarning.added} resolution{prefillWarning.added > 1 ? 's' : ''}</strong> ajoutee{prefillWarning.added > 1 ? 's' : ''}.
                {prefillWarning.skipped > 0 && (
                  <> {prefillWarning.skipped} resolution{prefillWarning.skipped > 1 ? 's etaient' : ' etait'} deja presente{prefillWarning.skipped > 1 ? 's' : ''}.</>
                )}
              </>
            ) : (
              <>Toutes les <strong>{prefillWarning.total} resolutions obligatoires</strong> sont deja presentes.</>
            )}
          </span>
        </div>
      )}
    </>
  );
}
