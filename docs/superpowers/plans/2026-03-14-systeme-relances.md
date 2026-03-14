# Systeme de relances — Plan d'implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une modale de relance avec stepper vertical 3 phases, declenchee depuis le bouton "Relancer" du tableau detail des appels de fonds.

**Architecture:** Modale `RelanceModal` avec stepper vertical, apercu editable du courrier, envoi via API existante. Hook `useRelance` charge l'historique des relances pour un lot et expose l'envoi. Migration DB pour ajouter `call_id` et `call_line_id` a `payment_reminders`.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, Supabase (tables/RPCs existantes)

**Spec:** `docs/superpowers/specs/2026-03-14-systeme-relances-design.md`

---

## File Structure

### New files

```
src/features/finance/appels-fonds/
├── components/
│   ├── RelanceModal.tsx           # Modale principale (header + stepper + preview)
│   ├── RelanceStepper.tsx         # Stepper vertical 3 phases
│   └── RelancePreview.tsx         # Apercu editable + choix canal + envoi
├── hooks/
│   └── useRelance.ts              # Charge historique relances lot, determine phase, envoie
├── services/
│   └── relance-templates.ts       # Templates texte par phase (amiable, formelle, mise en demeure)
└── styles/
    └── RelanceModal.module.css    # Styles modale + stepper + preview
```

### Files to modify

```
src/features/finance/appels-fonds/components/CoproTable.tsx         # Ajouter onClick Relancer → ouvre modale
src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx          # Integrer RelanceModal + state
src/lib/finance/api.ts                                              # Ajouter createManualReminder()
```

### Migration DB

```
supabase/migrations/20260314_payment_reminders_add_call_fields.sql  # Ajouter call_id, call_line_id, content
```

---

## Chunk 1: Migration DB + API + Templates + Hook

### Task 1: Migration DB — ajouter champs call_id, call_line_id, content

**Files:**
- Create: `supabase/migrations/20260314_payment_reminders_add_call_fields.sql`

- [ ] **Step 1: Creer la migration**

```sql
-- Migration: Ajouter call_id, call_line_id et content a payment_reminders
-- Permet de lier les relances aux appels de fonds specifiques

ALTER TABLE payment_reminders
  ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_for_funds(id),
  ADD COLUMN IF NOT EXISTS call_line_id UUID REFERENCES call_for_funds_lines(id),
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Index pour recherche par call_line
CREATE INDEX IF NOT EXISTS idx_payment_reminders_call_line
  ON payment_reminders(call_line_id) WHERE call_line_id IS NOT NULL;

COMMENT ON COLUMN payment_reminders.call_id IS 'Appel de fonds lie a cette relance';
COMMENT ON COLUMN payment_reminders.call_line_id IS 'Ligne d appel specifique (lot + appel)';
COMMENT ON COLUMN payment_reminders.content IS 'Contenu du courrier envoye (texte edite par le syndic)';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260314_payment_reminders_add_call_fields.sql
git commit -m "feat(db): add call_id, call_line_id, content to payment_reminders"
```

---

### Task 2: API — fonction createManualReminder

**Files:**
- Modify: `src/lib/finance/api.ts`

- [ ] **Step 1: Ajouter la fonction et le type**

A la fin du fichier `api.ts`, ajouter :

```typescript
export interface CreateManualReminderPayload {
  copro_id: string;
  lot_id: string;
  call_id: string;
  call_line_id: string;
  delay_level: number;
  unpaid_amount: number;
  oldest_due_date: string;
  days_overdue: number;
  recipient_email: string | null;
  recipient_name: string | null;
  channel: string;
  content: string;
}

export async function createManualReminder(
  payload: CreateManualReminderPayload
): Promise<ApiResult<{ reminder_id: string }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('payment_reminders')
    .insert({
      copro_id: payload.copro_id,
      lot_id: payload.lot_id,
      call_id: payload.call_id,
      call_line_id: payload.call_line_id,
      delay_level: payload.delay_level,
      unpaid_amount: payload.unpaid_amount,
      oldest_due_date: payload.oldest_due_date,
      days_overdue: payload.days_overdue,
      recipient_email: payload.recipient_email,
      recipient_name: payload.recipient_name,
      channel: payload.channel,
      content: payload.content,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: { reminder_id: data.id }, error: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/finance/api.ts
git commit -m "feat(api): add createManualReminder for manual reminder sending"
```

---

### Task 3: Templates de relance

**Files:**
- Create: `src/features/finance/appels-fonds/services/relance-templates.ts`

- [ ] **Step 1: Creer les templates**

```typescript
export interface RelancePhaseConfig {
  phase: number;
  label: string;
  type: 'amiable' | 'formelle' | 'mise_en_demeure';
  delayDays: number;
  defaultChannel: 'email' | 'courrier' | 'both';
}

export const RELANCE_PHASES: RelancePhaseConfig[] = [
  { phase: 1, label: 'Relance amiable', type: 'amiable', delayDays: 15, defaultChannel: 'email' },
  { phase: 2, label: 'Relance formelle', type: 'formelle', delayDays: 30, defaultChannel: 'both' },
  { phase: 3, label: 'Mise en demeure', type: 'mise_en_demeure', delayDays: 60, defaultChannel: 'courrier' },
];

export interface RelanceTemplateVars {
  coproprietaire: string;
  lot: string;
  montant: string;
  echeance: string;
  appel: string;
  copropriete: string;
  syndic: string;
  date: string;
  joursRetard: number;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

export function generateRelanceContent(
  phase: RelancePhaseConfig,
  vars: RelanceTemplateVars
): string {
  switch (phase.type) {
    case 'amiable':
      return `${vars.copropriete}
${vars.syndic}

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Rappel de charges de copropriete

Madame, Monsieur,

Nous vous informons que, sauf erreur de notre part, un montant de ${vars.montant} reste en attente de reglement pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}", dont l'echeance etait fixee au ${vars.echeance}.

Si votre paiement a ete effectue entre-temps, nous vous prions de ne pas tenir compte de ce courrier.

Dans le cas contraire, nous vous serions reconnaissants de bien vouloir proceder a la regularisation dans les meilleurs delais.

Cordialement,
${vars.syndic}`;

    case 'formelle':
      return `${vars.copropriete}
${vars.syndic}

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Deuxieme rappel — Charges impayees

Madame, Monsieur,

Malgre notre precedent courrier, nous constatons que le montant de ${vars.montant} reste impaye pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est echue depuis le ${vars.echeance}, soit ${vars.joursRetard} jours de retard.

Nous vous rappelons que, conformement au reglement de copropriete, des penalites de retard peuvent etre appliquees.

Nous vous prions de bien vouloir regulariser cette situation sous 15 jours.

Cordialement,
${vars.syndic}`;

    case 'mise_en_demeure':
      return `${vars.copropriete}
${vars.syndic}

LETTRE RECOMMANDEE AVEC ACCUSE DE RECEPTION

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Mise en demeure — Article 19 de la loi du 10 juillet 1965

Madame, Monsieur,

Par la presente, nous vous mettons en demeure de regler la somme de ${vars.montant} correspondant aux charges de copropriete impayees pour votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est echue depuis le ${vars.echeance}, soit ${vars.joursRetard} jours.

Conformement a l'article 19 de la loi n° 65-557 du 10 juillet 1965, a defaut de paiement dans un delai de 8 jours a compter de la reception de la presente, nous nous verrons dans l'obligation de transmettre ce dossier au conseil syndical en vue d'engager une procedure de recouvrement judiciaire.

Les frais de procedure seraient alors a votre charge.

Cordialement,
${vars.syndic}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/services/relance-templates.ts
git commit -m "feat(relances): add phase configs and letter templates"
```

---

### Task 4: Hook useRelance

**Files:**
- Create: `src/features/finance/appels-fonds/hooks/useRelance.ts`

- [ ] **Step 1: Creer le hook**

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import * as financeApi from '@/lib/finance/api';
import type { CallLineDetailed, CallForFundsOverview, PaymentReminder } from '@/lib/finance/api';
import { RELANCE_PHASES, generateRelanceContent, type RelancePhaseConfig } from '../services/relance-templates';
import { formatEuros } from '../utils';

export interface PhaseStatus {
  phase: number;
  label: string;
  type: string;
  defaultChannel: 'email' | 'courrier' | 'both';
  delayDays: number;
  status: 'sent' | 'active' | 'locked';
  sentAt?: string;
  sentChannel?: string;
}

export interface UseRelanceReturn {
  phases: PhaseStatus[];
  currentPhase: RelancePhaseConfig | null;
  previewContent: string;
  setPreviewContent: (content: string) => void;
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  sendReminder: () => Promise<void>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  allPhasesSent: boolean;
}

export function useRelance(
  line: CallLineDetailed | null,
  call: CallForFundsOverview | null,
  coproName: string,
  syndicName: string,
): UseRelanceReturn {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('email');

  // Charger l'historique des relances pour ce lot
  useEffect(() => {
    if (!line || !call) return;
    setIsLoading(true);
    financeApi.listPaymentReminders(call.copro_id, { lot_id: line.lot_id })
      .then(result => {
        if (result.data) {
          // Filtrer les relances sent pour ce call
          setReminders(result.data.filter(r => r.status === 'sent'));
        }
        setIsLoading(false);
      });
  }, [line, call]);

  // Construire le statut des phases
  const phases: PhaseStatus[] = useMemo(() => {
    const sentLevels = new Set(reminders.map(r => r.delay_level));

    return RELANCE_PHASES.map((phase, i) => {
      const sentReminder = reminders.find(r => r.delay_level === phase.delayDays);
      if (sentReminder) {
        return {
          phase: phase.phase,
          label: phase.label,
          type: phase.type,
          defaultChannel: phase.defaultChannel,
          delayDays: phase.delayDays,
          status: 'sent' as const,
          sentAt: sentReminder.sent_at ?? undefined,
          sentChannel: sentReminder.channel ?? undefined,
        };
      }
      // Phase active = premiere phase non envoyee dont toutes les precedentes sont envoyees
      const allPreviousSent = RELANCE_PHASES.slice(0, i).every(p => sentLevels.has(p.delayDays));
      return {
        phase: phase.phase,
        label: phase.label,
        type: phase.type,
        defaultChannel: phase.defaultChannel,
        delayDays: phase.delayDays,
        status: allPreviousSent ? 'active' as const : 'locked' as const,
      };
    });
  }, [reminders]);

  const currentPhase = useMemo(() => {
    const activePhase = phases.find(p => p.status === 'active');
    if (!activePhase) return null;
    return RELANCE_PHASES.find(p => p.phase === activePhase.phase) ?? null;
  }, [phases]);

  const allPhasesSent = phases.every(p => p.status === 'sent');

  // Generer le contenu de preview quand la phase change
  useEffect(() => {
    if (!currentPhase || !line || !call) return;
    const content = generateRelanceContent(currentPhase, {
      coproprietaire: line.owner_name ?? 'Coproprietaire',
      lot: line.lot_ref,
      montant: formatEuros(line.amount_due),
      echeance: new Date(call.due_date).toLocaleDateString('fr-FR'),
      appel: call.label,
      copropriete: coproName,
      syndic: syndicName,
      date: new Date().toLocaleDateString('fr-FR'),
      joursRetard: Math.max(0, Math.floor((Date.now() - new Date(call.due_date).getTime()) / 86400000)),
    });
    setPreviewContent(content);
    setSelectedChannel(currentPhase.defaultChannel);
  }, [currentPhase, line, call, coproName, syndicName]);

  // Envoyer la relance
  const sendReminder = useCallback(async () => {
    if (!currentPhase || !line || !call) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await financeApi.createManualReminder({
        copro_id: call.copro_id,
        lot_id: line.lot_id,
        call_id: call.id,
        call_line_id: line.id,
        delay_level: currentPhase.delayDays,
        unpaid_amount: line.amount_due - line.amount_paid,
        oldest_due_date: call.due_date,
        days_overdue: Math.max(0, Math.floor((Date.now() - new Date(call.due_date).getTime()) / 86400000)),
        recipient_email: null, // TODO: charger depuis coproprietaire
        recipient_name: line.owner_name,
        channel: selectedChannel,
        content: previewContent,
      });
      if (result.error) {
        setError(result.error);
      } else {
        // Recharger l'historique
        const refreshed = await financeApi.listPaymentReminders(call.copro_id, { lot_id: line.lot_id });
        if (refreshed.data) setReminders(refreshed.data.filter(r => r.status === 'sent'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsSending(false);
    }
  }, [currentPhase, line, call, selectedChannel, previewContent]);

  return {
    phases, currentPhase, previewContent, setPreviewContent,
    selectedChannel, setSelectedChannel, sendReminder,
    isLoading, isSending, error, allPhasesSent,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useRelance.ts
git commit -m "feat(relances): add useRelance hook (load history, send reminder)"
```

---

## Chunk 2: Composants UI (Stepper, Preview, Modal) + Integration

### Task 5: CSS RelanceModal

**Files:**
- Create: `src/features/finance/appels-fonds/styles/RelanceModal.module.css`

- [ ] **Step 1: Creer le CSS**

```css
/* ── Modal overlay ── */
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 20px;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6);
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 28px;
  border-bottom: 1px solid var(--border);
}

.headerInfo { flex: 1; }

.headerTitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.headerMeta {
  font-size: 13px;
  color: var(--text-secondary);
}

.headerAmount {
  font-size: 20px;
  font-weight: 700;
  color: var(--danger);
  text-align: right;
}

.headerAmountLabel {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.closeBtn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-left: 12px;
}

.closeBtn:hover {
  background: var(--bg-tertiary);
  color: var(--text-main);
}

/* ── Body ── */
.body {
  padding: 24px 28px;
}

/* ── Stepper ── */
.stepper {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step {
  display: flex;
  gap: 16px;
  position: relative;
}

.stepIndicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 32px;
}

.stepDot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  border: 2px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.stepDotSent {
  background: rgba(52, 211, 153, 0.2);
  border-color: var(--success);
  color: var(--success);
}

.stepDotActive {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
}

.stepLine {
  width: 2px;
  flex: 1;
  min-height: 16px;
  margin: 4px 0;
}

.stepLineSolid {
  background: var(--success);
}

.stepLineDashed {
  background: repeating-linear-gradient(
    to bottom,
    var(--border) 0px,
    var(--border) 4px,
    transparent 4px,
    transparent 8px
  );
}

.stepContent {
  flex: 1;
  padding-bottom: 20px;
}

.step:last-child .stepContent {
  padding-bottom: 0;
}

.stepLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 2px;
}

.stepLabelLocked {
  color: var(--text-tertiary);
}

.stepDelay {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.stepSentInfo {
  font-size: 12px;
  color: var(--success);
  font-weight: 500;
}

.stepLockedInfo {
  font-size: 12px;
  color: var(--text-tertiary);
  font-style: italic;
}

.stepActionBtn {
  margin-top: 8px;
  padding: 6px 14px;
  background: var(--primary-light);
  color: var(--primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.stepActionBtn:hover {
  background: var(--primary);
  color: white;
}

/* ── Preview ── */
.preview {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.previewTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
}

.previewTextarea {
  width: 100%;
  min-height: 200px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: border-color var(--transition-fast);
}

.previewTextarea:focus {
  outline: none;
  border-color: var(--primary);
}

.channelRow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.channelLabel {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.channelSelect {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: 13px;
  font-family: inherit;
}

.channelSelect:focus {
  outline: none;
  border-color: var(--primary);
}

.previewActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.sendBtn {
  padding: 8px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: inherit;
}

.sendBtn:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  transform: translateY(-1px);
}

.sendBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.downloadBtn {
  padding: 8px 20px;
  background: var(--bg-tertiary);
  color: var(--text-main);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.downloadBtn:hover {
  border-color: rgba(148,163,184,0.3);
}

/* ── Footer ── */
.footer {
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.footerBtn {
  padding: 8px 20px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.footerBtn:hover {
  color: var(--text-main);
  border-color: rgba(148,163,184,0.3);
}

/* ── All done state ── */
.allDone {
  text-align: center;
  padding: 24px;
  color: var(--success);
  font-size: 14px;
  font-weight: 500;
}

/* ── Error ── */
.error {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(248,113,113,0.15);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 13px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/styles/RelanceModal.module.css
git commit -m "feat(relances): add RelanceModal CSS (stepper, preview, modal)"
```

---

### Task 6: RelanceStepper component

**Files:**
- Create: `src/features/finance/appels-fonds/components/RelanceStepper.tsx`

- [ ] **Step 1: Creer le composant**

```typescript
'use client';

import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { PhaseStatus } from '../hooks/useRelance';
import styles from '../styles/RelanceModal.module.css';

interface RelanceStepperProps {
  phases: PhaseStatus[];
  onPreview: (phase: number) => void;
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'email': return 'email';
    case 'courrier': return 'courrier';
    case 'both': return 'email + courrier';
    default: return channel;
  }
}

export function RelanceStepper({ phases, onPreview }: RelanceStepperProps) {
  return (
    <div className={styles.stepper}>
      {phases.map((phase, i) => {
        const isLast = i === phases.length - 1;
        return (
          <div key={phase.phase} className={styles.step}>
            <div className={styles.stepIndicator}>
              <div className={clsx(
                styles.stepDot,
                phase.status === 'sent' && styles.stepDotSent,
                phase.status === 'active' && styles.stepDotActive,
              )}>
                {phase.status === 'sent' ? <Check size={14} /> : <Circle size={10} />}
              </div>
              {!isLast && (
                <div className={clsx(
                  styles.stepLine,
                  phase.status === 'sent' ? styles.stepLineSolid : styles.stepLineDashed,
                )} />
              )}
            </div>

            <div className={styles.stepContent}>
              <div className={clsx(styles.stepLabel, phase.status === 'locked' && styles.stepLabelLocked)}>
                {phase.label}
              </div>
              <div className={styles.stepDelay}>J+{phase.delayDays} apres echeance</div>

              {phase.status === 'sent' && phase.sentAt && (
                <div className={styles.stepSentInfo}>
                  Envoyee le {new Date(phase.sentAt).toLocaleDateString('fr-FR')}
                  {phase.sentChannel && ` par ${channelLabel(phase.sentChannel)}`}
                </div>
              )}

              {phase.status === 'active' && (
                <button className={styles.stepActionBtn} onClick={() => onPreview(phase.phase)}>
                  Apercu et envoi
                </button>
              )}

              {phase.status === 'locked' && (
                <div className={styles.stepLockedInfo}>
                  Disponible apres la phase precedente
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/RelanceStepper.tsx
git commit -m "feat(relances): add RelanceStepper component (vertical stepper)"
```

---

### Task 7: RelancePreview component

**Files:**
- Create: `src/features/finance/appels-fonds/components/RelancePreview.tsx`

- [ ] **Step 1: Creer le composant**

```typescript
'use client';

import { Send, Download } from 'lucide-react';
import type { RelancePhaseConfig } from '../services/relance-templates';
import styles from '../styles/RelanceModal.module.css';

interface RelancePreviewProps {
  phase: RelancePhaseConfig;
  content: string;
  onContentChange: (content: string) => void;
  channel: string;
  onChannelChange: (channel: string) => void;
  onSend: () => void;
  onDownloadPdf?: () => void;
  isSending: boolean;
}

export function RelancePreview({
  phase, content, onContentChange,
  channel, onChannelChange,
  onSend, onDownloadPdf, isSending,
}: RelancePreviewProps) {
  return (
    <div className={styles.preview}>
      <div className={styles.previewTitle}>
        {phase.label} — Apercu du courrier
      </div>

      <textarea
        className={styles.previewTextarea}
        value={content}
        onChange={e => onContentChange(e.target.value)}
        rows={12}
      />

      <div className={styles.channelRow}>
        <span className={styles.channelLabel}>Canal d'envoi :</span>
        <select
          className={styles.channelSelect}
          value={channel}
          onChange={e => onChannelChange(e.target.value)}
        >
          <option value="email">Email</option>
          <option value="courrier">Courrier</option>
          <option value="both">Email + Courrier</option>
        </select>
      </div>

      <div className={styles.previewActions}>
        {phase.type === 'mise_en_demeure' && onDownloadPdf && (
          <button className={styles.downloadBtn} onClick={onDownloadPdf}>
            <Download size={14} /> Telecharger PDF
          </button>
        )}
        <button
          className={styles.sendBtn}
          onClick={onSend}
          disabled={isSending || !content.trim()}
        >
          <Send size={14} /> {isSending ? 'Envoi...' : 'Envoyer la relance'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/RelancePreview.tsx
git commit -m "feat(relances): add RelancePreview component (editable content + send)"
```

---

### Task 8: RelanceModal component

**Files:**
- Create: `src/features/finance/appels-fonds/components/RelanceModal.tsx`

- [ ] **Step 1: Creer le composant**

```typescript
'use client';

import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { CallLineDetailed, CallForFundsOverview } from '@/lib/finance/api';
import { useRelance } from '../hooks/useRelance';
import { formatEuros } from '../utils';
import { RelanceStepper } from './RelanceStepper';
import { RelancePreview } from './RelancePreview';
import styles from '../styles/RelanceModal.module.css';

interface RelanceModalProps {
  line: CallLineDetailed;
  call: CallForFundsOverview;
  coproName: string;
  syndicName: string;
  onClose: () => void;
}

export function RelanceModal({ line, call, coproName, syndicName, onClose }: RelanceModalProps) {
  const [showPreview, setShowPreview] = useState(false);

  const {
    phases, currentPhase, previewContent, setPreviewContent,
    selectedChannel, setSelectedChannel, sendReminder,
    isLoading, isSending, error, allPhasesSent,
  } = useRelance(line, call, coproName, syndicName);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSend = async () => {
    await sendReminder();
    setShowPreview(false);
  };

  const impaye = line.amount_due - line.amount_paid;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>{line.owner_name ?? 'Coproprietaire'}</div>
            <div className={styles.headerMeta}>
              Lot {line.lot_ref} — {call.label}
            </div>
          </div>
          <div>
            <div className={styles.headerAmountLabel}>Impaye</div>
            <div className={styles.headerAmount}>{formatEuros(impaye)}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isLoading ? (
            <div>Chargement...</div>
          ) : allPhasesSent ? (
            <div className={styles.allDone}>
              <CheckCircle2 size={32} />
              <div style={{ marginTop: 8 }}>Toutes les phases de relance ont ete envoyees.</div>
              <div style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: 12 }}>
                Ce dossier peut etre transmis au contentieux.
              </div>
            </div>
          ) : (
            <>
              <RelanceStepper phases={phases} onPreview={handlePreview} />

              {showPreview && currentPhase && (
                <RelancePreview
                  phase={currentPhase}
                  content={previewContent}
                  onContentChange={setPreviewContent}
                  channel={selectedChannel}
                  onChannelChange={setSelectedChannel}
                  onSend={handleSend}
                  isSending={isSending}
                />
              )}
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.footerBtn} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/RelanceModal.tsx
git commit -m "feat(relances): add RelanceModal component (header + stepper + preview)"
```

---

### Task 9: Integration dans CoproTable + page detail

**Files:**
- Modify: `src/features/finance/appels-fonds/components/CoproTable.tsx`
- Modify: `src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx`

- [ ] **Step 1: Modifier CoproTable**

Ajouter un prop `onRelance: (line: CallLineDetailed) => void` a `CoproTableProps`.
Remplacer le `<span className={...}>Relancer</span>` par un `<button>` qui appelle `onRelance(line)`.

- [ ] **Step 2: Modifier la page detail**

Dans `[callId]/page.tsx` :
1. Ajouter un state `relanceLine: CallLineDetailed | null`
2. Passer `onRelance={line => setRelanceLine(line)}` a CoproTable
3. Rendre `<RelanceModal>` quand `relanceLine` est non-null
4. Pour `coproName` et `syndicName`, utiliser des valeurs par defaut ('Copropriete' et 'Le Syndic') — a connecter au contexte utilisateur plus tard

- [ ] **Step 3: Verifier la compilation**

```bash
npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/appels-fonds/components/CoproTable.tsx \
        src/app/\(dashboard\)/finance/appels-fonds/\[callId\]/page.tsx
git commit -m "feat(relances): integrate RelanceModal in detail page via Relancer button"
```
