'use client';

import Link from 'next/link';
import { useCopro } from '@/providers/CoproContext';
import { LoadingState, ErrorState } from '@/components/ui/DataState';
import {
  useRemindersSettingsPage,
  PauseStatusSection,
  RulesTable,
  TemplatesGrid,
  TemplateEditModal,
} from '@/features/settings/reminders';
import styles from './reminders-settings.module.css';

export default function ReminderSettingsPage() {
  const { currentCoproId, isManager, currentCopro } = useCopro();

  const {
    rules,
    reminderTemplates,
    isPaused,
    pausedUntil,
    pauseReason,
    hasChanges,
    editingTemplate,
    testResult,
    isLoading,
    error,
    savingSettings,
    savingRule,
    savingTemplate,
    runningTest,
    handlePauseToggle,
    handlePausedUntilChange,
    handlePauseReasonChange,
    handleSaveSettings,
    handleRuleToggle,
    handleDelayChange,
    handleTemplateChange,
    handleSaveTemplate,
    handleTestRun,
    setEditingTemplate,
    refreshSettings,
    refreshRules,
  } = useRemindersSettingsPage();

  if (!currentCoproId || isLoading) {
    return <LoadingState message="Chargement de la configuration..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { refreshSettings(); refreshRules(); }} />;
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configuration des relances</h1>
          <p className={styles.subtitle}>
            Gerez les regles de relance automatiques pour {currentCopro?.name || 'la copropriete'}
          </p>
        </div>
        <Link href="/finance/unpaid/reminders" className="btn btn-secondary">
          Retour aux relances
        </Link>
      </div>

      <PauseStatusSection
        isPaused={isPaused}
        pausedUntil={pausedUntil}
        pauseReason={pauseReason}
        hasChanges={hasChanges}
        isManager={isManager}
        savingSettings={savingSettings}
        runningTest={runningTest}
        testResult={testResult}
        onPauseToggle={handlePauseToggle}
        onPausedUntilChange={handlePausedUntilChange}
        onPauseReasonChange={handlePauseReasonChange}
        onSave={handleSaveSettings}
        onTestRun={handleTestRun}
      />

      <RulesTable
        rules={rules}
        reminderTemplates={reminderTemplates}
        isManager={isManager}
        savingRule={savingRule}
        onRuleToggle={handleRuleToggle}
        onDelayChange={handleDelayChange}
        onTemplateChange={handleTemplateChange}
        onViewTemplate={(rule) => {
          const tpl = reminderTemplates.find(t => t.id === rule.template_id) ||
            reminderTemplates.find(t => t.code === `payment_reminder_${rule.delay_days}`);
          if (tpl) setEditingTemplate(tpl);
        }}
      />

      <TemplatesGrid
        templates={reminderTemplates}
        isManager={isManager}
        onEdit={setEditingTemplate}
      />

      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={handleSaveTemplate}
          isSaving={savingTemplate}
        />
      )}
    </div>
  );
}
