'use client';

import { useState, useCallback, useEffect } from 'react';
import { Settings, PauseCircle, PlayCircle, Clock, Mail, Save, X, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import styles from './reminders-settings.module.css';
import { useCopro } from '@/providers/CoproContext';
import {
    useReminderSettings,
    useUpdateReminderSettings,
    usePaymentReminderRules,
    useUpdateReminderRule,
    useEmailTemplates,
    useUpdateEmailTemplate,
    useRunPaymentReminders,
    type ReminderSettings,
    type PaymentReminderRule,
    type EmailTemplate,
} from '@/hooks/modules/useFinanceData';
import { LoadingState, ErrorState, NoCoproSelected } from '@/components/ui/DataState';

interface TemplateEditModalProps {
    template: EmailTemplate;
    onClose: () => void;
    onSave: (updates: { subject: string; body_html: string; body_text: string | null }) => Promise<void>;
    isSaving: boolean;
}

function TemplateEditModal({ template, onClose, onSave, isSaving }: TemplateEditModalProps) {
    const [subject, setSubject] = useState(template.subject);
    const [bodyHtml, setBodyHtml] = useState(template.body_html);
    const [bodyText, setBodyText] = useState(template.body_text || '');
    const [showPreview, setShowPreview] = useState(false);

    const availableVars = template.available_variables || {
        destinataire_nom: 'Nom du proprietaire',
        montant: 'Montant impaye',
        lot_ref: 'Reference du lot',
        copropriete_nom: 'Nom de la copropriete',
        date_echeance: 'Date d\'echeance',
        jours_retard: 'Jours de retard',
    };

    const handleSave = async () => {
        await onSave({
            subject,
            body_html: bodyHtml,
            body_text: bodyText || null,
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Modifier le template: {template.name}</h3>
                    <button className={styles.modalCloseBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.formGroup}>
                        <label>Sujet de l&apos;email</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Sujet de l'email"
                        />
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>Corps HTML</label>
                        <textarea
                            value={bodyHtml}
                            onChange={(e) => setBodyHtml(e.target.value)}
                            rows={10}
                            placeholder="Contenu HTML de l'email..."
                            style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                        />
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>Corps texte (optionnel)</label>
                        <textarea
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                            rows={5}
                            placeholder="Version texte de l'email (fallback)..."
                        />
                    </div>

                    <div className={styles.variablesInfo}>
                        <div className={styles.variablesTitle}>Variables disponibles</div>
                        <div className={styles.variablesList}>
                            {Object.entries(availableVars).map(([key, desc]) => (
                                <span key={key} className={styles.variableTag} title={desc}>
                                    {'{{' + key + '}}'}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary"
                        style={{ marginTop: '1rem' }}
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        <Eye size={16} style={{ marginRight: 6 }} />
                        {showPreview ? 'Masquer' : 'Apercu'}
                    </button>

                    {showPreview && (
                        <div className={styles.preview}>
                            <div className={styles.previewTitle}>Apercu</div>
                            <div
                                className={styles.previewContent}
                                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                        Annuler
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReminderSettingsPage() {
    const { currentCoproId, isManager, currentCopro } = useCopro();
    const { data: settings, isLoading: loadingSettings, error: settingsError, refresh: refreshSettings } = useReminderSettings();
    const { data: rules, isLoading: loadingRules, error: rulesError, refresh: refreshRules } = usePaymentReminderRules();
    const { data: templates, isLoading: loadingTemplates, refresh: refreshTemplates } = useEmailTemplates();
    const { isLoading: savingSettings, mutate: updateSettings } = useUpdateReminderSettings();
    const { isLoading: savingRule, mutate: updateRule } = useUpdateReminderRule();
    const { isLoading: savingTemplate, mutate: updateTemplate } = useUpdateEmailTemplate();
    const { isLoading: runningTest, mutate: runReminders } = useRunPaymentReminders();

    // Local form state for pause settings
    const [isPaused, setIsPaused] = useState(false);
    const [pausedUntil, setPausedUntil] = useState('');
    const [pauseReason, setPauseReason] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    // Template edit modal
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

    // Test result
    const [testResult, setTestResult] = useState<{ paused?: boolean; sent?: number; error?: string } | null>(null);

    // Sync local state with fetched settings
    useEffect(() => {
        if (settings) {
            setIsPaused(settings.is_paused);
            setPausedUntil(settings.paused_until || '');
            setPauseReason(settings.pause_reason || '');
            setHasChanges(false);
        }
    }, [settings]);

    const handlePauseToggle = () => {
        setIsPaused(!isPaused);
        setHasChanges(true);
    };

    const handleSaveSettings = async () => {
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
    };

    const handleRuleToggle = async (rule: PaymentReminderRule) => {
        const result = await updateRule(rule.id, { is_active: !rule.is_active });
        if (!result.error) {
            refreshRules();
        } else {
            alert('Erreur: ' + result.error);
        }
    };

    const handleDelayChange = async (rule: PaymentReminderRule, newDelay: number) => {
        if (newDelay < 1 || newDelay > 365) {
            alert('Le delai doit etre entre 1 et 365 jours');
            return;
        }

        // Check for duplicates
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
    };

    const handleTemplateChange = async (rule: PaymentReminderRule, templateId: string | null) => {
        const result = await updateRule(rule.id, { template_id: templateId });
        if (!result.error) {
            refreshRules();
        } else {
            alert('Erreur: ' + result.error);
        }
    };

    const handleSaveTemplate = async (updates: { subject: string; body_html: string; body_text: string | null }) => {
        if (!editingTemplate) return;

        const result = await updateTemplate(editingTemplate.id, updates);
        if (!result.error) {
            setEditingTemplate(null);
            refreshTemplates();
        } else {
            alert('Erreur: ' + result.error);
        }
    };

    const handleTestRun = async () => {
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
    };

    // Loading states
    if (!currentCoproId) {
        return <NoCoproSelected />;
    }

    if (loadingSettings || loadingRules || loadingTemplates) {
        return <LoadingState message="Chargement de la configuration..." />;
    }

    if (settingsError || rulesError) {
        return <ErrorState message={settingsError || rulesError || 'Erreur'} onRetry={() => { refreshSettings(); refreshRules(); }} />;
    }

    const reminderTemplates = templates?.filter(t => t.code.startsWith('payment_reminder')) || [];

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

            {/* Section: Pause Status */}
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
                            <div className={styles.toggleSwitch} onClick={handlePauseToggle} />
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
                                onChange={(e) => { setPausedUntil(e.target.value); setHasChanges(true); }}
                                disabled={!isPaused}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Raison de la pause (optionnel)</label>
                            <input
                                type="text"
                                value={pauseReason}
                                onChange={(e) => { setPauseReason(e.target.value); setHasChanges(true); }}
                                placeholder="Ex: Periode de vacances, negociation en cours..."
                                disabled={!isPaused}
                            />
                        </div>
                        <div className={styles.formGroupFull} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleTestRun}
                                disabled={runningTest}
                            >
                                {runningTest ? 'Test...' : 'Tester en simulation'}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveSettings}
                                disabled={!hasChanges || savingSettings}
                            >
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

            {/* Section: Rules */}
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
                                                onClick={() => handleRuleToggle(rule)}
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
                                                            handleDelayChange(rule, newVal);
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
                                                onChange={(e) => handleTemplateChange(rule, e.target.value || null)}
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
                                                onClick={() => {
                                                    const tpl = reminderTemplates.find(t => t.id === rule.template_id) ||
                                                        reminderTemplates.find(t => t.code === `payment_reminder_${rule.delay_days}`);
                                                    if (tpl) setEditingTemplate(tpl);
                                                }}
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

            {/* Section: Templates */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Mail size={20} />
                        Templates d&apos;email
                    </h2>
                </div>

                <div className={styles.templatesGrid}>
                    {reminderTemplates.map((template) => (
                        <div key={template.id} className={styles.templateCard}>
                            <div className={styles.templateCardHeader}>
                                <span className={styles.templateName}>{template.name}</span>
                                <span className={styles.templateCode}>{template.code}</span>
                            </div>
                            <p className={styles.templateDescription}>
                                {template.description || 'Aucune description'}
                            </p>
                            <p className={styles.templateSubject}>
                                <strong>Sujet:</strong> {template.subject}
                            </p>
                            {isManager && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ marginTop: '0.75rem' }}
                                    onClick={() => setEditingTemplate(template)}
                                >
                                    Modifier
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {reminderTemplates.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)' }}>Aucun template de relance configure</p>
                )}
            </div>

            {/* Template Edit Modal */}
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
