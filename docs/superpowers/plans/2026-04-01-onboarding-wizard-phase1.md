# Onboarding Wizard — Phase 1 (Étapes 1-4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un wizard d'onboarding permettant à un syndic de saisir pas-à-pas une copropriété complète : copro → copropriétaires → lots+clés → comptes bancaires.

**Architecture:** Wizard multi-étapes basé sur le pattern du Stepper AG existant (`src/components/features/ag/Stepper/Stepper.tsx`). Chaque étape est un composant isolé avec son propre état. Les données sont persistées dans Supabase à chaque étape (pas de formulaire géant soumis à la fin). Le `CoproContext` est alimenté dès l'étape 1.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, CSS Modules, Supabase SSR, Lucide React. Pas de librairie de formulaire — useState natif (pattern existant). Pas de Tailwind — CSS Modules uniquement.

**Spec de référence:** `docs/superpowers/specs/2026-04-01-onboarding-migration-db-design.md`

**Patterns existants à réutiliser:**
- Stepper AG : `src/components/features/ag/Stepper/Stepper.tsx` (447 lignes)
- API Supabase : `src/lib/lots/api.ts` (pattern `{ data, error }`, untyped client)
- Modal forms : `src/components/features/lots/CreateLotModal.tsx` (useState par champ)
- Grille lots×clés : `src/components/features/lots/LotsRepartitionGrid.tsx` + `src/hooks/modules/useLotsRepartitionGrid.ts`
- CoproContext : `src/providers/CoproContext.tsx`

---

## File Structure

### Nouveaux fichiers

```
src/
├── app/(dashboard)/onboarding/
│   ├── page.tsx                          # Page principale du wizard
│   ├── onboarding.module.css             # Styles du wizard
│   └── layout.tsx                        # Layout sans sidebar (plein écran)
│
├── components/features/onboarding/
│   ├── OnboardingStepper/
│   │   ├── OnboardingStepper.tsx          # Stepper adapté du Stepper AG
│   │   └── OnboardingStepper.module.css
│   ├── steps/
│   │   ├── Step1Copropriete.tsx           # Formulaire création copro
│   │   ├── Step1Copropriete.module.css
│   │   ├── Step2Coproprietaires.tsx       # Ajout copropriétaires (tableau)
│   │   ├── Step2Coproprietaires.module.css
│   │   ├── Step3LotsKeys.tsx              # Grille lots + clés (réutilise composants existants)
│   │   ├── Step3LotsKeys.module.css
│   │   ├── Step4Comptes.tsx               # Comptes bancaires
│   │   └── Step4Comptes.module.css
│   └── shared/
│       ├── StepHeader.tsx                 # En-tête commun par étape (titre, description, compteur)
│       └── StepHeader.module.css
│
├── hooks/modules/
│   └── useOnboarding.ts                  # Hook principal — état du wizard, navigation, persistence
│
└── lib/onboarding/
    └── api.ts                            # API Supabase pour l'onboarding (création copro, comptes)
```

### Fichiers modifiés

```
src/
├── lib/config/navigation.ts              # Ajouter route onboarding
├── providers/CoproContext.tsx             # Permettre de set le currentCoproId après création
├── lib/owners/api.ts                     # Ajouter createCoproprietaire() (n'existe pas encore)
└── app/(dashboard)/layout.tsx            # Rediriger vers onboarding si pas de copro
```

---

## Task 1: Route et layout onboarding

**Files:**
- Create: `src/app/(dashboard)/onboarding/layout.tsx`
- Create: `src/app/(dashboard)/onboarding/page.tsx`
- Create: `src/app/(dashboard)/onboarding/onboarding.module.css`

- [ ] **Step 1: Créer le layout onboarding (plein écran, sans sidebar)**

```tsx
// src/app/(dashboard)/onboarding/layout.tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Créer les styles de la page onboarding**

```css
/* src/app/(dashboard)/onboarding/onboarding.module.css */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-main, #e2e8f0);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary, #94a3b8);
}

.stepContent {
  margin-top: 32px;
}
```

- [ ] **Step 3: Créer la page onboarding (shell)**

```tsx
// src/app/(dashboard)/onboarding/page.tsx
'use client';

import styles from './onboarding.module.css';

export default function OnboardingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriété</h1>
        <p className={styles.subtitle}>Configurez votre copropriété étape par étape</p>
      </div>
      <div className={styles.stepContent}>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          Wizard en cours de construction...
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier que la page s'affiche**

Run: `open http://localhost:3000/onboarding` (le dev server doit tourner)
Expected: page blanche avec le titre "Nouvelle copropriété" centré.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/onboarding/
git commit -m "feat(onboarding): scaffold wizard route and layout"
```

---

## Task 2: OnboardingStepper (adapté du Stepper AG)

**Files:**
- Create: `src/components/features/onboarding/OnboardingStepper/OnboardingStepper.tsx`
- Create: `src/components/features/onboarding/OnboardingStepper/OnboardingStepper.module.css`
- Reference: `src/components/features/ag/Stepper/Stepper.tsx`

- [ ] **Step 1: Créer les styles du stepper**

```css
/* src/components/features/onboarding/OnboardingStepper/OnboardingStepper.module.css */
.stepper {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.06);
  cursor: default;
  transition: all 0.2s;
  position: relative;
}

.step.clickable {
  cursor: pointer;
}

.step.clickable:hover {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.12);
}

.step.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.step.completed {
  background: rgba(34, 197, 94, 0.06);
  border-color: rgba(34, 197, 94, 0.2);
}

.stepNumber {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-tertiary, #64748b);
  flex-shrink: 0;
}

.step.active .stepNumber {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.step.completed .stepNumber {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.stepLabel {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
}

.step.active .stepLabel {
  color: #60a5fa;
}

.step.completed .stepLabel {
  color: #4ade80;
}

.connector {
  width: 32px;
  height: 2px;
  background: rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
  align-self: center;
}

.connector.completed {
  background: rgba(34, 197, 94, 0.3);
}

/* Mobile */
@media (max-width: 768px) {
  .stepper {
    gap: 4px;
  }
  .stepLabel {
    display: none;
  }
  .step {
    padding: 8px 12px;
  }
  .connector {
    width: 16px;
  }
}
```

- [ ] **Step 2: Créer le composant OnboardingStepper**

```tsx
// src/components/features/onboarding/OnboardingStepper/OnboardingStepper.tsx
'use client';

import { Check } from 'lucide-react';
import styles from './OnboardingStepper.module.css';

export interface OnboardingStep {
  id: number;
  label: string;
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  currentStep: number;
  maxStepReached: number;
  onStepClick: (step: number) => void;
}

export function OnboardingStepper({
  steps,
  currentStep,
  maxStepReached,
  onStepClick,
}: OnboardingStepperProps) {
  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isClickable = step.id <= maxStepReached;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {index > 0 && (
              <div className={`${styles.connector} ${isCompleted ? styles.completed : ''}`} />
            )}
            <div
              className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isClickable ? styles.clickable : ''}`}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div className={styles.stepNumber}>
                {isCompleted ? <Check size={14} /> : step.id}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/OnboardingStepper/
git commit -m "feat(onboarding): create OnboardingStepper component"
```

---

## Task 3: Hook useOnboarding (état du wizard)

**Files:**
- Create: `src/hooks/modules/useOnboarding.ts`

- [ ] **Step 1: Créer le hook useOnboarding**

```tsx
// src/hooks/modules/useOnboarding.ts
'use client';

import { useState, useCallback } from 'react';
import type { OnboardingStep } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';

const STEPS: OnboardingStep[] = [
  { id: 1, label: 'Copropriété' },
  { id: 2, label: 'Copropriétaires' },
  { id: 3, label: 'Lots & Clés' },
  { id: 4, label: 'Comptes bancaires' },
];

export interface OnboardingState {
  coproId: string | null;
  coproName: string | null;
}

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [state, setState] = useState<OnboardingState>({
    coproId: null,
    coproName: null,
  });

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEPS.length && step <= maxStepReached) {
      setCurrentStep(step);
    }
  }, [maxStepReached]);

  const completeStep = useCallback((step: number) => {
    const nextStep = step + 1;
    if (nextStep <= STEPS.length) {
      setCurrentStep(nextStep);
      setMaxStepReached(prev => Math.max(prev, nextStep));
    }
  }, []);

  const setCoproCreated = useCallback((coproId: string, coproName: string) => {
    setState(prev => ({ ...prev, coproId, coproName }));
  }, []);

  const isLastStep = currentStep === STEPS.length;
  const isFirstStep = currentStep === 1;

  return {
    steps: STEPS,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
    isLastStep,
    isFirstStep,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/modules/useOnboarding.ts
git commit -m "feat(onboarding): create useOnboarding hook for wizard state"
```

---

## Task 4: Brancher le stepper dans la page

**Files:**
- Modify: `src/app/(dashboard)/onboarding/page.tsx`

- [ ] **Step 1: Intégrer le stepper et le hook dans la page**

```tsx
// src/app/(dashboard)/onboarding/page.tsx
'use client';

import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const {
    steps,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
  } = useOnboarding();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriété</h1>
        <p className={styles.subtitle}>
          {state.coproName
            ? `Configuration de « ${state.coproName} »`
            : 'Configurez votre copropriété étape par étape'}
        </p>
      </div>

      <OnboardingStepper
        steps={steps}
        currentStep={currentStep}
        maxStepReached={maxStepReached}
        onStepClick={goToStep}
      />

      <div className={styles.stepContent}>
        {currentStep === 1 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 1 — Création de la copropriété (à implémenter)
          </p>
        )}
        {currentStep === 2 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 2 — Copropriétaires (à implémenter)
          </p>
        )}
        {currentStep === 3 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 3 — Lots & Clés de répartition (à implémenter)
          </p>
        )}
        {currentStep === 4 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 4 — Comptes bancaires (à implémenter)
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier visuellement**

Run: `open http://localhost:3000/onboarding`
Expected: stepper avec 4 étapes, seule l'étape 1 est active, les autres sont grisées. Le texte placeholder de l'étape 1 s'affiche.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/onboarding/page.tsx
git commit -m "feat(onboarding): integrate stepper with wizard state"
```

---

## Task 5: API onboarding Supabase

**Files:**
- Create: `src/lib/onboarding/api.ts`
- Reference: `src/lib/lots/api.ts` (pattern à suivre)
- Reference: `src/lib/supabase/client.ts`

- [ ] **Step 1: Créer l'API layer onboarding**

```tsx
// src/lib/onboarding/api.ts
import { createClient } from '@/lib/supabase/client';

const createUntypedClient = () => createClient() as any;

// ═══ COPROPRIÉTÉ ═══

export interface CoproCreate {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  nombre_batiments?: number;
  annee_construction?: number;
  siret_syndic?: string;
  exercice_debut?: string; // format 'MM-DD' (ex: '01-01')
}

export async function createCopropriete(payload: CoproCreate) {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('copros')
    .insert({
      name: payload.name.trim(),
      address: payload.address.trim(),
      city: payload.city.trim(),
      postal_code: payload.postal_code.trim(),
      nombre_batiments: payload.nombre_batiments || 1,
      annee_construction: payload.annee_construction || null,
      siret_syndic: payload.siret_syndic?.trim() || null,
      exercice_debut: payload.exercice_debut || '01-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; name: string }, error: null };
}

// ═══ COPROPRIÉTAIRES ═══

export interface CoproprietaireCreate {
  copro_id: string;
  last_name: string;
  first_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_resident?: boolean;
  communication_preference?: 'email' | 'courrier' | 'les_deux';
}

export async function createCoproprietaire(payload: CoproprietaireCreate) {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('coproprietaires')
    .insert({
      copro_id: payload.copro_id,
      last_name: payload.last_name.trim(),
      first_name: payload.first_name?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      is_resident: payload.is_resident ?? true,
      communication_preference: payload.communication_preference || 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, last_name, first_name')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; last_name: string; first_name: string | null }, error: null };
}

export async function listCoproprietaires(coproId: string) {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('coproprietaires')
    .select('id, last_name, first_name, email, phone, is_resident')
    .eq('copro_id', coproId)
    .order('last_name', { ascending: true });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; last_name: string; first_name: string | null; email: string | null; phone: string | null; is_resident: boolean }>, error: null };
}

export async function deleteCoproprietaire(id: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase.from('coproprietaires').delete().eq('id', id);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

// ═══ COMPTES BANCAIRES ═══

export interface CompteCreate {
  copro_id: string;
  label: string;
  type: 'courant' | 'fonds_travaux';
  banque?: string;
  iban?: string;
  bic?: string;
  solde_initial?: number;
}

export async function createCompteBancaire(payload: CompteCreate) {
  const supabase = createUntypedClient();

  // Les comptes bancaires sont des comptes de classe 5 dans le plan comptable
  const accountNumber = payload.type === 'courant' ? '512000' : '512100';
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      copro_id: payload.copro_id,
      account_number: accountNumber,
      label: payload.label.trim(),
      account_type: 'bank',
      banque: payload.banque?.trim() || null,
      iban: payload.iban?.trim().replace(/\s/g, '') || null,
      bic: payload.bic?.trim() || null,
      initial_balance: payload.solde_initial || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, label')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; label: string }, error: null };
}

export async function listComptesBancaires(coproId: string) {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('id, label, account_number, banque, iban, bic, initial_balance')
    .eq('copro_id', coproId)
    .eq('account_type', 'bank')
    .order('account_number', { ascending: true });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; label: string; account_number: string; banque: string | null; iban: string | null; bic: string | null; initial_balance: number }>, error: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): create Supabase API layer for onboarding"
```

---

## Task 6: StepHeader (composant partagé)

**Files:**
- Create: `src/components/features/onboarding/shared/StepHeader.tsx`
- Create: `src/components/features/onboarding/shared/StepHeader.module.css`

- [ ] **Step 1: Créer les styles du StepHeader**

```css
/* src/components/features/onboarding/shared/StepHeader.module.css */
.header {
  margin-bottom: 24px;
}

.topLine {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main, #e2e8f0);
}

.count {
  font-size: 13px;
  color: var(--text-secondary, #94a3b8);
  font-weight: 500;
}

.description {
  font-size: 13px;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.5;
}
```

- [ ] **Step 2: Créer le composant StepHeader**

```tsx
// src/components/features/onboarding/shared/StepHeader.tsx
import styles from './StepHeader.module.css';

interface StepHeaderProps {
  title: string;
  description: string;
  count?: string;
}

export function StepHeader({ title, description, count }: StepHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.topLine}>
        <h2 className={styles.title}>{title}</h2>
        {count && <span className={styles.count}>{count}</span>}
      </div>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/shared/
git commit -m "feat(onboarding): create StepHeader shared component"
```

---

## Task 7: Step 1 — Création copropriété

**Files:**
- Create: `src/components/features/onboarding/steps/Step1Copropriete.tsx`
- Create: `src/components/features/onboarding/steps/Step1Copropriete.module.css`

- [ ] **Step 1: Créer les styles de l'étape 1**

```css
/* src/components/features/onboarding/steps/Step1Copropriete.module.css */
.form {
  max-width: 600px;
  margin: 0 auto;
}

.row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.row > * {
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.required {
  color: #ef4444;
}

.input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-main, #e2e8f0);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: rgba(59, 130, 246, 0.4);
}

.input::placeholder {
  color: var(--text-muted, #475569);
}

.error {
  font-size: 11px;
  color: #ef4444;
  margin-top: 2px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.btnPrimary {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnPrimary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btnPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 2: Créer le composant Step1Copropriete**

```tsx
// src/components/features/onboarding/steps/Step1Copropriete.tsx
'use client';

import { useState, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createCopropriete } from '@/lib/onboarding/api';
import styles from './Step1Copropriete.module.css';

interface Step1Props {
  onComplete: (coproId: string, coproName: string) => void;
  existingCoproId: string | null;
}

export function Step1Copropriete({ onComplete, existingCoproId }: Step1Props) {
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [ville, setVille] = useState('');
  const [nombreBatiments, setNombreBatiments] = useState('1');
  const [anneeConstruction, setAnneeConstruction] = useState('');
  const [siretSyndic, setSiretSyndic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!nom.trim()) errs.nom = 'Le nom est obligatoire';
    if (!adresse.trim()) errs.adresse = "L'adresse est obligatoire";
    if (!codePostal.trim()) errs.codePostal = 'Le code postal est obligatoire';
    if (!ville.trim()) errs.ville = 'La ville est obligatoire';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [nom, adresse, codePostal, ville]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (existingCoproId) {
      onComplete(existingCoproId, nom.trim());
      return;
    }

    setIsSaving(true);
    const { data, error } = await createCopropriete({
      name: nom.trim(),
      address: adresse.trim(),
      city: ville.trim(),
      postal_code: codePostal.trim(),
      nombre_batiments: parseInt(nombreBatiments, 10) || 1,
      annee_construction: anneeConstruction ? parseInt(anneeConstruction, 10) : undefined,
      siret_syndic: siretSyndic || undefined,
    });
    setIsSaving(false);

    if (error) {
      setErrors({ nom: error.message });
      return;
    }
    if (data) {
      onComplete(data.id, data.name);
    }
  }, [validate, existingCoproId, nom, adresse, ville, codePostal, nombreBatiments, anneeConstruction, siretSyndic, onComplete]);

  return (
    <div>
      <StepHeader
        title="Créer la copropriété"
        description="Renseignez les informations de base de la copropriété. Vous pourrez les modifier plus tard."
      />

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Nom de la copropriété <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Résidence Les Lilas"
          />
          {errors.nom && <span className={styles.error}>{errors.nom}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Adresse <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={adresse}
            onChange={e => setAdresse(e.target.value)}
            placeholder="12 rue des Fleurs"
          />
          {errors.adresse && <span className={styles.error}>{errors.adresse}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Code postal <span className={styles.required}>*</span></label>
            <input
              className={styles.input}
              value={codePostal}
              onChange={e => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="75001"
            />
            {errors.codePostal && <span className={styles.error}>{errors.codePostal}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ville <span className={styles.required}>*</span></label>
            <input
              className={styles.input}
              value={ville}
              onChange={e => setVille(e.target.value)}
              placeholder="Paris"
            />
            {errors.ville && <span className={styles.error}>{errors.ville}</span>}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre de bâtiments</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              value={nombreBatiments}
              onChange={e => setNombreBatiments(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Année de construction</label>
            <input
              className={styles.input}
              type="number"
              min="1800"
              max="2026"
              value={anneeConstruction}
              onChange={e => setAnneeConstruction(e.target.value)}
              placeholder="1985"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>SIRET du syndic</label>
          <input
            className={styles.input}
            value={siretSyndic}
            onChange={e => setSiretSyndic(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="123 456 789 00012"
          />
        </div>

        <div className={styles.footer}>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Création...' : 'Créer et continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/steps/Step1Copropriete.*
git commit -m "feat(onboarding): implement Step 1 — copropriété creation form"
```

---

## Task 8: Step 2 — Ajout copropriétaires

**Files:**
- Create: `src/components/features/onboarding/steps/Step2Coproprietaires.tsx`
- Create: `src/components/features/onboarding/steps/Step2Coproprietaires.module.css`

- [ ] **Step 1: Créer les styles de l'étape 2**

```css
/* src/components/features/onboarding/steps/Step2Coproprietaires.module.css */
.container {
  max-width: 800px;
  margin: 0 auto;
}

.addRow {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.06);
}

.addRow input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-main, #e2e8f0);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.addRow input:focus {
  border-color: rgba(59, 130, 246, 0.4);
}

.addRow input::placeholder {
  color: var(--text-muted, #475569);
}

.btnAdd {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btnAdd:hover {
  background: #2563eb;
}

.btnAdd:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table th {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #64748b);
  padding: 8px 12px;
  text-align: left;
  background: rgba(148, 163, 184, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
}

.table td {
  font-size: 13px;
  padding: 10px 12px;
  color: var(--text-main, #e2e8f0);
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.table tr:hover td {
  background: rgba(148, 163, 184, 0.03);
}

.btnDelete {
  background: none;
  border: none;
  color: var(--text-muted, #475569);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.btnDelete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.emptyState {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary, #94a3b8);
  font-size: 13px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.btnBack {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-secondary, #94a3b8);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnBack:hover {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-main, #e2e8f0);
}

.btnNext {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnNext:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btnNext:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 2: Créer le composant Step2Coproprietaires**

```tsx
// src/components/features/onboarding/steps/Step2Coproprietaires.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import {
  createCoproprietaire,
  listCoproprietaires,
  deleteCoproprietaire,
} from '@/lib/onboarding/api';
import styles from './Step2Coproprietaires.module.css';

interface Step2Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface CoproRow {
  id: string;
  last_name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  is_resident: boolean;
}

export function Step2Coproprietaires({ coproId, onComplete, onBack }: Step2Props) {
  const [rows, setRows] = useState<CoproRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Champs du formulaire d'ajout rapide
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Charger les copropriétaires existants
  useEffect(() => {
    async function load() {
      const { data } = await listCoproprietaires(coproId);
      if (data) setRows(data);
      setIsLoading(false);
    }
    load();
  }, [coproId]);

  const handleAdd = useCallback(async () => {
    if (!nom.trim()) return;
    setIsAdding(true);

    const { data, error } = await createCoproprietaire({
      copro_id: coproId,
      last_name: nom.trim(),
      first_name: prenom.trim() || undefined,
      email: email.trim() || undefined,
      phone: telephone.trim() || undefined,
    });

    if (data) {
      setRows(prev => [...prev, {
        id: data.id,
        last_name: data.last_name,
        first_name: data.first_name,
        email: email.trim() || null,
        phone: telephone.trim() || null,
        is_resident: true,
      }]);
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
    }
    setIsAdding(false);
  }, [coproId, nom, prenom, email, telephone]);

  const handleDelete = useCallback(async (id: string) => {
    const { success } = await deleteCoproprietaire(id);
    if (success) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  }, [handleAdd]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Copropriétaires"
        description="Ajoutez les copropriétaires. Vous pourrez compléter leurs informations plus tard."
        count={`${rows.length} copropriétaire${rows.length > 1 ? 's' : ''}`}
      />

      {/* Formulaire d'ajout rapide */}
      <div className={styles.addRow}>
        <input
          value={nom}
          onChange={e => setNom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom *"
        />
        <input
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Prénom"
        />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Email"
        />
        <input
          value={telephone}
          onChange={e => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onKeyDown={handleKeyDown}
          placeholder="Téléphone"
        />
        <button
          className={styles.btnAdd}
          onClick={handleAdd}
          disabled={!nom.trim() || isAdding}
        >
          <UserPlus size={14} />
        </button>
      </div>

      {/* Tableau */}
      {rows.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.last_name}</td>
                <td>{row.first_name || '—'}</td>
                <td>{row.email || '—'}</td>
                <td>{row.phone || '—'}</td>
                <td>
                  <button className={styles.btnDelete} onClick={() => handleDelete(row.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.emptyState}>
          {isLoading ? 'Chargement...' : 'Aucun copropriétaire ajouté. Remplissez le formulaire ci-dessus.'}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={onComplete}
          disabled={rows.length === 0}
        >
          Continuer ({rows.length} copropriétaire{rows.length > 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/steps/Step2Coproprietaires.*
git commit -m "feat(onboarding): implement Step 2 — copropriétaires quick-add table"
```

---

## Task 9: Step 3 — Lots & Clés de répartition

**Files:**
- Create: `src/components/features/onboarding/steps/Step3LotsKeys.tsx`
- Create: `src/components/features/onboarding/steps/Step3LotsKeys.module.css`
- Reference: `src/components/features/lots/LotsRepartitionGrid.tsx`
- Reference: `src/hooks/modules/useLotsRepartitionGrid.ts`

- [ ] **Step 1: Créer les styles**

```css
/* src/components/features/onboarding/steps/Step3LotsKeys.module.css */
.container {
  max-width: 1000px;
  margin: 0 auto;
}

.info {
  padding: 12px 20px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-size: 12px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.gridWrapper {
  min-height: 300px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.btnBack {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-secondary, #94a3b8);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnBack:hover {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-main, #e2e8f0);
}

.btnNext {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnNext:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btnNext:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

- [ ] **Step 2: Créer le composant Step3LotsKeys**

Ce composant réutilise la grille existante `LotsRepartitionGrid` et le hook `useLotsRepartitionGrid`. La grille gère déjà la création de lots, clés, édition de tantièmes et association propriétaire.

```tsx
// src/components/features/onboarding/steps/Step3LotsKeys.tsx
'use client';

import { StepHeader } from '../shared/StepHeader';
import { LotsRepartitionGrid } from '@/components/features/lots/LotsRepartitionGrid';
import { useLotsRepartitionGrid } from '@/hooks/modules/useLotsRepartitionGrid';
import styles from './Step3LotsKeys.module.css';

interface Step3Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step3LotsKeys({ coproId, onComplete, onBack }: Step3Props) {
  const gridProps = useLotsRepartitionGrid(coproId);
  const lotCount = gridProps.rows?.length ?? 0;
  const hasLots = lotCount > 0;

  return (
    <div className={styles.container}>
      <StepHeader
        title="Lots & Clés de répartition"
        description="Créez les lots et définissez leurs tantièmes par clé de répartition. Associez chaque lot à son propriétaire."
        count={hasLots ? `${lotCount} lot${lotCount > 1 ? 's' : ''}` : undefined}
      />

      <div className={styles.info}>
        Utilisez le bouton « + Lot » pour ajouter des lots et « + Clé » pour ajouter des clés de répartition.
        Cliquez sur une cellule de tantièmes pour la modifier. La clé « Tantièmes généraux » est créée automatiquement.
      </div>

      <div className={styles.gridWrapper}>
        <LotsRepartitionGrid {...gridProps} />
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={onComplete}
          disabled={!hasLots}
        >
          Continuer ({lotCount} lot{lotCount > 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/steps/Step3LotsKeys.*
git commit -m "feat(onboarding): implement Step 3 — lots & repartition keys grid"
```

---

## Task 10: Step 4 — Comptes bancaires

**Files:**
- Create: `src/components/features/onboarding/steps/Step4Comptes.tsx`
- Create: `src/components/features/onboarding/steps/Step4Comptes.module.css`

- [ ] **Step 1: Créer les styles**

```css
/* src/components/features/onboarding/steps/Step4Comptes.module.css */
.container {
  max-width: 700px;
  margin: 0 auto;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  padding: 20px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.cardTitle {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #e2e8f0);
  margin-bottom: 4px;
}

.cardDesc {
  font-size: 11px;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 16px;
}

.cardRequired {
  font-size: 10px;
  color: #f59e0b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.fields .full {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-main, #e2e8f0);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: rgba(59, 130, 246, 0.4);
}

.input::placeholder {
  color: var(--text-muted, #475569);
}

.inputMoney {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.btnBack {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(148, 163, 184, 0.04);
  color: var(--text-secondary, #94a3b8);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnBack:hover {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-main, #e2e8f0);
}

.btnFinish {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: #22c55e;
  color: white;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btnFinish:hover {
  background: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btnFinish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

- [ ] **Step 2: Créer le composant Step4Comptes**

```tsx
// src/components/features/onboarding/steps/Step4Comptes.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Landmark } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createCompteBancaire, listComptesBancaires } from '@/lib/onboarding/api';
import styles from './Step4Comptes.module.css';

interface Step4Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step4Comptes({ coproId, onComplete, onBack }: Step4Props) {
  // Compte courant
  const [ccBanque, setCcBanque] = useState('');
  const [ccIban, setCcIban] = useState('');
  const [ccBic, setCcBic] = useState('');
  const [ccSolde, setCcSolde] = useState('');

  // Fonds travaux ALUR
  const [ftBanque, setFtBanque] = useState('');
  const [ftIban, setFtIban] = useState('');
  const [ftBic, setFtBic] = useState('');
  const [ftSolde, setFtSolde] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [existingComptes, setExistingComptes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await listComptesBancaires(coproId);
      if (data) setExistingComptes(data.map(c => c.account_number));
    }
    load();
  }, [coproId]);

  const formatIban = useCallback((val: string) => {
    const clean = val.replace(/\s/g, '').toUpperCase().slice(0, 34);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }, []);

  const handleFinish = useCallback(async () => {
    setIsSaving(true);

    // Créer compte courant s'il n'existe pas
    if (!existingComptes.includes('512000')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Compte courant',
        type: 'courant',
        banque: ccBanque || undefined,
        iban: ccIban || undefined,
        bic: ccBic || undefined,
        solde_initial: ccSolde ? parseFloat(ccSolde) : undefined,
      });
    }

    // Créer fonds travaux s'il n'existe pas
    if (!existingComptes.includes('512100')) {
      await createCompteBancaire({
        copro_id: coproId,
        label: 'Fonds travaux ALUR',
        type: 'fonds_travaux',
        banque: ftBanque || undefined,
        iban: ftIban || undefined,
        bic: ftBic || undefined,
        solde_initial: ftSolde ? parseFloat(ftSolde) : undefined,
      });
    }

    setIsSaving(false);
    onComplete();
  }, [coproId, ccBanque, ccIban, ccBic, ccSolde, ftBanque, ftIban, ftBic, ftSolde, existingComptes, onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Comptes bancaires"
        description="Renseignez les coordonnées bancaires de la copropriété. Le fonds travaux ALUR est obligatoire depuis la loi ALUR 2014."
      />

      <div className={styles.cards}>
        {/* Compte courant */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Compte courant</div>
          <div className={styles.cardDesc}>Compte principal de la copropriété pour les opérations courantes</div>
          <span className={styles.cardRequired}>Obligatoire</span>
          <div className={styles.fields} style={{ marginTop: '12px' }}>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>Banque</label>
              <input className={styles.input} value={ccBanque} onChange={e => setCcBanque(e.target.value)} placeholder="Crédit Mutuel" />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>IBAN</label>
              <input className={styles.input} value={ccIban} onChange={e => setCcIban(formatIban(e.target.value))} placeholder="FR76 1234 5678 9012 3456 7890 123" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BIC</label>
              <input className={styles.input} value={ccBic} onChange={e => setCcBic(e.target.value.toUpperCase().slice(0, 11))} placeholder="CMCIFR2A" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Solde initial</label>
              <input className={`${styles.input} ${styles.inputMoney}`} type="number" step="0.01" value={ccSolde} onChange={e => setCcSolde(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Fonds travaux ALUR */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Fonds travaux ALUR</div>
          <div className={styles.cardDesc}>Compte séparé obligatoire pour le fonds de travaux (loi ALUR). Suit les tantièmes généraux.</div>
          <span className={styles.cardRequired}>Obligatoire (loi ALUR)</span>
          <div className={styles.fields} style={{ marginTop: '12px' }}>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>Banque</label>
              <input className={styles.input} value={ftBanque} onChange={e => setFtBanque(e.target.value)} placeholder="Crédit Mutuel" />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label className={styles.label}>IBAN</label>
              <input className={styles.input} value={ftIban} onChange={e => setFtIban(formatIban(e.target.value))} placeholder="FR76 1234 5678 9012 3456 7890 456" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BIC</label>
              <input className={styles.input} value={ftBic} onChange={e => setFtBic(e.target.value.toUpperCase().slice(0, 11))} placeholder="CMCIFR2A" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Solde initial</label>
              <input className={`${styles.input} ${styles.inputMoney}`} type="number" step="0.01" value={ftSolde} onChange={e => setFtSolde(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnFinish}
          onClick={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? 'Enregistrement...' : 'Terminer la configuration'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/onboarding/steps/Step4Comptes.*
git commit -m "feat(onboarding): implement Step 4 — bank accounts (courant + ALUR)"
```

---

## Task 11: Assembler toutes les étapes dans la page

**Files:**
- Modify: `src/app/(dashboard)/onboarding/page.tsx`

- [ ] **Step 1: Intégrer les 4 étapes dans la page**

Remplacer entièrement le contenu de `src/app/(dashboard)/onboarding/page.tsx` :

```tsx
// src/app/(dashboard)/onboarding/page.tsx
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import { Step1Copropriete } from '@/components/features/onboarding/steps/Step1Copropriete';
import { Step2Coproprietaires } from '@/components/features/onboarding/steps/Step2Coproprietaires';
import { Step3LotsKeys } from '@/components/features/onboarding/steps/Step3LotsKeys';
import { Step4Comptes } from '@/components/features/onboarding/steps/Step4Comptes';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const {
    steps,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
  } = useOnboarding();

  const handleStep1Complete = useCallback((coproId: string, coproName: string) => {
    setCoproCreated(coproId, coproName);
    completeStep(1);
  }, [setCoproCreated, completeStep]);

  const handleStep2Complete = useCallback(() => {
    completeStep(2);
  }, [completeStep]);

  const handleStep3Complete = useCallback(() => {
    completeStep(3);
  }, [completeStep]);

  const handleStep4Complete = useCallback(() => {
    // Wizard terminé — rediriger vers le dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriété</h1>
        <p className={styles.subtitle}>
          {state.coproName
            ? `Configuration de « ${state.coproName} »`
            : 'Configurez votre copropriété étape par étape'}
        </p>
      </div>

      <OnboardingStepper
        steps={steps}
        currentStep={currentStep}
        maxStepReached={maxStepReached}
        onStepClick={goToStep}
      />

      <div className={styles.stepContent}>
        {currentStep === 1 && (
          <Step1Copropriete
            onComplete={handleStep1Complete}
            existingCoproId={state.coproId}
          />
        )}
        {currentStep === 2 && state.coproId && (
          <Step2Coproprietaires
            coproId={state.coproId}
            onComplete={handleStep2Complete}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && state.coproId && (
          <Step3LotsKeys
            coproId={state.coproId}
            onComplete={handleStep3Complete}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && state.coproId && (
          <Step4Comptes
            coproId={state.coproId}
            onComplete={handleStep4Complete}
            onBack={() => goToStep(3)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier visuellement**

Run: `open http://localhost:3000/onboarding`
Expected:
- Étape 1 : formulaire de création copropriété avec tous les champs
- Après création → étape 2 avec le tableau d'ajout rapide copropriétaires
- Après ajout → étape 3 avec la grille lots×clés existante
- Après lots → étape 4 avec les comptes bancaires
- Après comptes → redirection vers /dashboard

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/onboarding/page.tsx
git commit -m "feat(onboarding): assemble all 4 steps into wizard page"
```

---

## Task 12: Redirection onboarding si pas de copro

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Lire le layout actuel**

Lire `src/app/(dashboard)/layout.tsx` pour comprendre la structure actuelle avant modification.

- [ ] **Step 2: Ajouter la logique de redirection**

Dans le layout dashboard, après le chargement du CoproContext, si aucune copropriété n'existe et que l'utilisateur n'est pas déjà sur `/onboarding`, rediriger vers `/onboarding`.

La modification exacte dépend du contenu actuel du fichier. Le pattern à ajouter :

```tsx
// Dans le composant enfant qui a accès à useCopro()
const { currentCopro, isLoading } = useCopro();
const pathname = usePathname();

useEffect(() => {
  if (!isLoading && !currentCopro && !pathname.startsWith('/onboarding')) {
    router.push('/onboarding');
  }
}, [isLoading, currentCopro, pathname, router]);
```

- [ ] **Step 3: Vérifier**

Tester en supprimant la copro de test (ou avec un user sans copro) : l'app doit rediriger vers `/onboarding`.
Tester avec une copro existante : l'app reste sur le dashboard normalement.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat(onboarding): redirect to wizard when no copropriété exists"
```

---

## Résumé des tâches

| # | Tâche | Fichiers | Résultat |
|---|-------|----------|----------|
| 1 | Route et layout | `onboarding/page.tsx`, `layout.tsx`, `*.module.css` | Page wizard accessible |
| 2 | OnboardingStepper | `OnboardingStepper.tsx` + CSS | Stepper 4 étapes réutilisable |
| 3 | useOnboarding hook | `useOnboarding.ts` | État wizard + navigation |
| 4 | Brancher stepper | `onboarding/page.tsx` | Stepper interactif dans la page |
| 5 | API Supabase | `lib/onboarding/api.ts` | CRUD copro, copros, comptes |
| 6 | StepHeader | `shared/StepHeader.tsx` + CSS | En-tête commun par étape |
| 7 | Step 1 | `Step1Copropriete.tsx` + CSS | Formulaire création copro |
| 8 | Step 2 | `Step2Coproprietaires.tsx` + CSS | Tableau ajout rapide copros |
| 9 | Step 3 | `Step3LotsKeys.tsx` + CSS | Grille lots×clés (réutilisée) |
| 10 | Step 4 | `Step4Comptes.tsx` + CSS | Comptes bancaires |
| 11 | Assemblage | `onboarding/page.tsx` | 4 étapes branchées |
| 12 | Redirection | `layout.tsx` | Auto-redirect si pas de copro |
