'use client';

import { Clock } from 'lucide-react';
import type { PaymentReminderRule, EmailTemplate } from '@/hooks/modules/useFinanceData';
import styles from '@/app/(dashboard)/settings/reminders/reminders-settings.module.css';

interface RulesTableProps {
  rules: PaymentReminderRule[] | null | undefined;
  reminderTemplates: EmailTemplate[];
  isManager: boolean;
  savingRule: boolean;
  onRuleToggle: (rule: PaymentReminderRule) => void;
  onDelayChange: (rule: PaymentReminderRule, newDelay: number) => void;
  onTemplateChange: (rule: PaymentReminderRule, templateId: string | null) => void;
  onViewTemplate: (rule: PaymentReminderRule) => void;
}

export function RulesTable({
  rules,
  reminderTemplates,
  isManager,
  savingRule,
  onRuleToggle,
  onDelayChange,
  onTemplateChange,
  onViewTemplate,
}: RulesTableProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Clock size={20} />
          Regles de relance
        </h2>
      </div>

      {rules && rules.length > 0 ? (
        <table className={styles.rulesTable}>
          <thead>
            <tr>
              <th>Active</th>
              <th>Delai</th>
              <th>Label</th>
              <th>Template</th>
              {isManager && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  {isManager ? (
                    <div
                      className={`${styles.ruleToggle} ${rule.is_active ? styles.ruleToggleActive : ''}`}
                      onClick={() => onRuleToggle(rule)}
                    />
                  ) : (
                    <span>{rule.is_active ? 'Oui' : 'Non'}</span>
                  )}
                </td>
                <td>
                  {isManager ? (
                    <>
                      <input
                        type="number"
                        className={styles.delayInput}
                        value={rule.delay_days}
                        onChange={(e) => {
                          const newVal = parseInt(e.target.value);
                          if (!isNaN(newVal)) {
                            onDelayChange(rule, newVal);
                          }
                        }}
                        min={1}
                        max={365}
                        disabled={savingRule}
                      />
                      <span className={styles.delayLabel}>jours</span>
                    </>
                  ) : (
                    <span>J+{rule.delay_days}</span>
                  )}
                </td>
                <td>{rule.label}</td>
                <td>
                  {isManager ? (
                    <select
                      className={styles.templateSelect}
                      value={rule.template_id || ''}
                      onChange={(e) => onTemplateChange(rule, e.target.value || null)}
                      disabled={savingRule}
                    >
                      <option value="">Template par defaut</option>
                      {reminderTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{reminderTemplates.find(t => t.id === rule.template_id)?.name || 'Par defaut'}</span>
                  )}
                </td>
                {isManager && (
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewTemplate(rule)}
                    >
                      Voir template
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>Aucune regle configuree</p>
      )}
    </div>
  );
}
