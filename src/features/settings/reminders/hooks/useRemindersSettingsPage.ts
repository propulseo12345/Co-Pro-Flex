'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReminderSettings,
  useUpdateReminderSettings,
  usePaymentReminderRules,
  useUpdateReminderRule,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useRunPaymentReminders,
  type PaymentReminderRule,
  type EmailTemplate,
} from '@/hooks/modules/useFinanceData';

export function useRemindersSettingsPage() {
  const { data: settings, isLoading: loadingSettings, error: settingsError, refresh: refreshSettings } = useReminderSettings();
  const { data: rules, isLoading: loadingRules, error: rulesError, refresh: refreshRules } = usePaymentReminderRules();
  const { data: templates, isLoading: loadingTemplates, refresh: refreshTemplates } = useEmailTemplates();
  const { isLoading: savingSettings, mutate: updateSettings } = useUpdateReminderSettings();
  const { isLoading: savingRule, mutate: updateRule } = useUpdateReminderRule();
  const { isLoading: savingTemplate, mutate: updateTemplate } = useUpdateEmailTemplate();
  const { isLoading: runningTest, mutate: runReminders } = useRunPaymentReminders();

  const [isPaused, setIsPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [testResult, setTestResult] = useState<{ paused?: boolean; sent?: number; error?: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setIsPaused(settings.is_paused);
      setPausedUntil(settings.paused_until || '');
      setPauseReason(settings.pause_reason || '');
      setHasChanges(false);
    }
  }, [settings]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => !prev);
    setHasChanges(true);
  }, []);

  const handlePausedUntilChange = useCallback((value: string) => {
    setPausedUntil(value);
    setHasChanges(true);
  }, []);

  const handlePauseReasonChange = useCallback((value: string) => {
    setPauseReason(value);
    setHasChanges(true);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    const result = await updateSettings({
      is_paused: isPaused,
      paused_until: pausedUntil || null,
      pause_reason: pauseReason || null,
    });

    if (!result.error) {
      setHasChanges(false);
      refreshSettings();
    } else {
      alert('Erreur: ' + result.error);
    }
  }, [isPaused, pausedUntil, pauseReason, updateSettings, refreshSettings]);

  const handleRuleToggle = useCallback(async (rule: PaymentReminderRule) => {
    const result = await updateRule(rule.id, { is_active: !rule.is_active });
    if (!result.error) {
      refreshRules();
    } else {
      alert('Erreur: ' + result.error);
    }
  }, [updateRule, refreshRules]);

  const handleDelayChange = useCallback(async (rule: PaymentReminderRule, newDelay: number) => {
    if (newDelay < 1 || newDelay > 365) {
      alert('Le delai doit etre entre 1 et 365 jours');
      return;
    }

    const existingRule = rules?.find(r => r.id !== rule.id && r.delay_days === newDelay && r.is_active);
    if (existingRule) {
      alert(`Une regle active existe deja pour J+${newDelay}`);
      return;
    }

    const result = await updateRule(rule.id, { delay_days: newDelay });
    if (!result.error) {
      refreshRules();
    } else {
      alert('Erreur: ' + result.error);
    }
  }, [rules, updateRule, refreshRules]);

  const handleTemplateChange = useCallback(async (rule: PaymentReminderRule, templateId: string | null) => {
    const result = await updateRule(rule.id, { template_id: templateId });
    if (!result.error) {
      refreshRules();
    } else {
      alert('Erreur: ' + result.error);
    }
  }, [updateRule, refreshRules]);

  const handleSaveTemplate = useCallback(async (updates: { subject: string; body_html: string; body_text: string | null }) => {
    if (!editingTemplate) return;

    const result = await updateTemplate(editingTemplate.id, updates);
    if (!result.error) {
      setEditingTemplate(null);
      refreshTemplates();
    } else {
      alert('Erreur: ' + result.error);
    }
  }, [editingTemplate, updateTemplate, refreshTemplates]);

  const handleTestRun = useCallback(async () => {
    setTestResult(null);
    const result = await runReminders({ dry_run: true });

    if (result.data) {
      setTestResult({
        paused: result.data.paused,
        sent: result.data.summary?.sent || 0,
        error: result.data.error,
      });
    } else {
      setTestResult({ error: result.error || 'Erreur inconnue' });
    }
  }, [runReminders]);

  const reminderTemplates = templates?.filter(t => t.code.startsWith('payment_reminder')) || [];

  const isLoading = loadingSettings || loadingRules || loadingTemplates;
  const error = settingsError || rulesError;

  return {
    // Data
    settings,
    rules,
    reminderTemplates,

    // Local state
    isPaused,
    pausedUntil,
    pauseReason,
    hasChanges,
    editingTemplate,
    testResult,

    // Loading states
    isLoading,
    error,
    savingSettings,
    savingRule,
    savingTemplate,
    runningTest,

    // Actions
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
  };
}
