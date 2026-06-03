# Plan D — Écran reprise + wizard + alerte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer la couche UI + intégration de la reprise de soldes : un composant `RepriseSoldes` réutilisable (wizard ET autonome post-finalisation), branché sur le moteur DB des Plans A/B/C (`set_opening_balance` / `get_opening_balance`), avec post-as-you-go dans le wizard (appels postés à l'étape 6, reprise enregistrée à l'étape 7), une alerte persistante « Reprise à terminer » sur le tableau de bord (Portefeuille) tant que le net 471/472 ≠ 0, le filtre `onboarding_step IS NULL` sur les impayés (I5, avec suppression de la définition morte de `v_unpaid_by_lot`), l'upsert/verrou budget (I6/I7), et la mise à jour de l'E2E `onboarding-clean-path`.

**Architecture :** React 19 / Next.js 16 App Router, TypeScript strict (jamais `any`), CSS Modules, imports alias `@/`. Le composant conteneur `RepriseSoldes` orchestre 3 sous-composants (`BalanceEntreeForm`, `SoldesParLotTable`, `EquilibreIndicator`), chacun < 200 lignes. La couche données passe par `src/lib/onboarding/api.ts` (`getOnboardingOpeningBalance`, `setOnboardingOpeningBalance` — livrés par le **Plan B**, voir « Contrat Plan B » ci-dessous). L'écran est **non bloquant** : « Enregistrer » fonctionne même avec un reste 471/472 ≠ 0. Une migration DB (I5) finit la migration `v_unpaid_by_lot` (JOIN copros + filtre onboarding, suppression de la def morte).

**Tech Stack :** Next.js 16, React 19, TypeScript 5, CSS Modules, Lucide React, Supabase JS client (`@/lib/supabase/client`), PostgreSQL (Supabase cloud `iyfesbjnkpynmwlsmxnp`), Playwright (E2E).

**Référence :** spec `docs/superpowers/specs/2026-06-03-reprise-soldes-onboarding-design.md` (§3.3, §3.4, §4, §5 Pivot 2, §6, §7, §8 I5/I6/I7/I13). Plan A (socle DB) : `docs/superpowers/plans/2026-06-03-reprise-A-socle-db.md`.

---

## Conventions d'exécution (lire avant de commencer)

- **DÉPENDANCES inter-plans.** Plan D s'exécute **après** Plans A, B et C. Il consomme leurs contrats sans les redéfinir :
  - **Contrat Plan B** (couche TS `src/lib/onboarding/api.ts`, voir spec §3.3) — DOIT exister avant Plan D :
    ```ts
    export type SoldeLineNature = 'current' | 'works' | 'alur';
    export interface OpeningBalanceLine {
      accountCode: string;        // ex. '450-1', '103', '105', '401', '110', '120', code asset 512x/502x
      lotId: string | null;       // non-null pour 450-x et 103 ; null sinon
      amount: number;             // signé (convention débit > 0)
      nature?: SoldeLineNature;   // pour 450-x : current=450-1, works=450-2, alur=450-5
    }
    export interface OpeningBalanceState {
      lines: OpeningBalanceLine[];
      residual: number;           // net 471/472 courant
      asOfDate: string | null;    // YYYY-MM-DD
    }
    export async function getOnboardingOpeningBalance(
      coproId: string, periodId: string
    ): Promise<{ data: OpeningBalanceState | null; error: Error | null }>;
    export async function setOnboardingOpeningBalance(
      coproId: string, periodId: string, asOfDate: string, lines: OpeningBalanceLine[]
    ): Promise<{ data: { residual: number; linesCount: number } | null; error: Error | null }>;
    export async function listComptesBancaires(coproId: string): Promise<{
      data: Array<{ id: string; name: string; code: string; account_type: string;
                    initial_balance: number }> | null; error: Error | null }>;   // B5 : filtré asset + 512x/502x
    export async function listPlanAccounts(coproId: string): Promise<{
      data: Array<{ id: string; code: string; name: string }> | null; error: Error | null }>; // classes 1-5 postables
    ```
    Si une de ces fonctions n'existe pas au démarrage de Plan D, **STOP** et terminer Plan B d'abord.
  - **Contrat Plan C** (verrou) — `auditOnboardingBooks(coproId)` retourne désormais `{ data: { clean, issues, waitingBalance }, error }` où `clean` est calculé via la **liste blanche** d'`issue_type` bloquants (spec §6), et `waitingBalance` (net 471/472) est **séparé** et **non bloquant**. Plan D consomme `clean` et `waitingBalance` sans les recalculer.
- **GO explicite OBLIGATOIRE** avant tout `apply_migration` sur `iyfesbjnkpynmwlsmxnp` (règle projet). Demander, attendre le « go ».
- **Lancer un test SQL** = coller le bloc `DO $$ … $$;` dans le MCP `execute_sql` (projet `iyfesbjnkpynmwlsmxnp`). Succès = exception `ROLLBACK_TEST_OK` ; échec = `ASSERT FAIL …`. Les tests SQL d'archive vont dans `supabase/tests/`, **jamais** dans `migrations/` (sinon rejoués à chaque deploy, cf. spec I11).
- **Type check après chaque modif TS** : `cd Co-Pro-Flex && npx tsc --noEmit` → attendu exit 0.
- **Lint/build** en fin de tâche TS : `cd Co-Pro-Flex && npm run build` → attendu exit 0.
- **E2E** : `cd Co-Pro-Flex && npx playwright test e2e/onboarding-clean-path.spec.ts` (serveur dev + env Supabase requis).
- Tous les chemins sont **absolus** sous `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\`.

---

## État des lieux vérifié en base (ne pas re-vérifier, c'est fait)

- **`v_unpaid_by_lot` VIVANTE** = shape `20260125` : colonnes `copro_id, lot_id, lot_ref, owner_name, owner_email, total_unpaid, unpaid_lines_count, oldest_due_date, days_overdue`. **Aucun** JOIN `copros`, **aucun** filtre `onboarding_step`.
- **Def MORTE** = celle de `Co-Pro-Flex/supabase/migrations/20260401_create_sales_tables.sql` (l.628-685, shape `total_due/total_paid/unpaid_amount/severity/owner_phone/lot_type`) : **jamais appliquée en live** (colonnes absentes de la vue réelle). À supprimer du fichier (finir la migration).
- **Dépendants** de `v_unpaid_by_lot` en live : `v_dashboard_kpis`, `v_unpaid_with_reminders`. Tous deux lisent `total_unpaid` ou `u.*` → ne **pas** changer/supprimer de colonne existante (règle « cannot drop columns »). On ajoute seulement un JOIN + un filtre dans le `WHERE`, colonnes inchangées → `CREATE OR REPLACE VIEW` sûr.
- **Chart provisionné** (codes pertinents) : `512` Banque, `502` Livret A (fonds travaux), `105` Fonds travaux ALUR, `401` Fournisseurs, `110`/`120` reports, `103` Avances (+ `1031/1032/1033`), `450-1/2/5`, `471`/`472`. **Mais** Step4 crée les comptes bancaires avec les codes `512000` (courant) et `512100` (fonds travaux) → la résolution banque DOIT passer par `account_id` (B5), pas par le code `512`/`502` nu.
- **`copros`** possède bien `onboarding_step`, `onboarding_max_step`, `exercice_debut`.
- **`audit_finance_integrity`** retourne `TABLE(entity_type, entity_id, copro_id, issue_type, description, expected_amount, actual_amount, difference)`.
- **Landing tableau de bord gestionnaire** = `src/app/(gestionnaire)/portefeuille/page.tsx` (c'est là que va la carte d'alerte, par copro de la liste).

---

## Task 1 : I5 — `v_unpaid_by_lot` exclut les copros en onboarding + suppression de la def morte

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\20260603110000_v1_6_unpaid_exclude_onboarding.sql`
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\20260401_create_sales_tables.sql` (supprimer le bloc `v_unpaid_by_lot` mort, l.627-685)
- Test: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\tests\20260603110000_unpaid_exclude_onboarding_test.sql`

**Pourquoi :** une copro encore en onboarding (`onboarding_step IS NOT NULL`) peut avoir des appels postés (post-as-you-go étape 6) mais une reprise pas finie : la faire remonter dans les impayés/relances est faux. On ajoute `JOIN copros c ON c.id = cfl.copro_id` + `AND c.onboarding_step IS NULL`. Colonnes inchangées (sûr pour `v_dashboard_kpis` et `v_unpaid_with_reminders`). On supprime aussi la définition concurrente morte du fichier `20260401` (finir la migration, ne pas laisser 2 patterns coexister).

- [ ] **Step 1 — Écrire le test (la copro en onboarding ne remonte pas dans les impayés)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\tests\20260603110000_unpaid_exclude_onboarding_test.sql` :

```sql
DO $$
DECLARE
  v jsonb; v_copro uuid; v_lot uuid; v_period uuid; v_budget uuid;
  v_rows_before int; v_rows_after int;
BEGIN
  -- Copro propre seedée (a au moins 1 lot + plan comptable + clé générale)
  v := create_clean_test_copro_seeded('i5-unpaid', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;

  -- Émettre un appel échu impayé pour générer une ligne d'impayé
  SELECT id INTO v_budget FROM budgets WHERE copro_id = v_copro ORDER BY created_at DESC LIMIT 1;
  PERFORM post_budget_call_for_funds(
    v_copro, v_period, v_budget, 'Appel echu TEST', 1,
    (CURRENT_DATE - 90)::text, (CURRENT_DATE - 60)::text, 1.0, 1, 1
  );

  -- Cas A : copro NON onboarding -> la ligne doit apparaître dans v_unpaid_by_lot
  UPDATE copros SET onboarding_step = NULL WHERE id = v_copro;
  SELECT count(*) INTO v_rows_before FROM v_unpaid_by_lot WHERE copro_id = v_copro;
  IF v_rows_before < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : impaye non visible alors que la copro est live (rows=%)', v_rows_before;
  END IF;

  -- Cas B : copro EN onboarding -> la ligne doit DISPARAITRE de v_unpaid_by_lot
  UPDATE copros SET onboarding_step = 7 WHERE id = v_copro;
  SELECT count(*) INTO v_rows_after FROM v_unpaid_by_lot WHERE copro_id = v_copro;
  IF v_rows_after <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : copro en onboarding remonte dans les impayes (rows=%)', v_rows_after;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier qu'il échoue**

`execute_sql` (projet `iyfesbjnkpynmwlsmxnp`) du bloc.
Attendu : `ASSERT FAIL : copro en onboarding remonte dans les impayes (rows=1)` — la vue actuelle ne filtre pas l'onboarding.

- [ ] **Step 3 — Écrire la migration**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\20260603110000_v1_6_unpaid_exclude_onboarding.sql` :

```sql
-- V1.6 — I5 : v_unpaid_by_lot exclut les copros encore en onboarding.
-- Une copro en cours d'onboarding (onboarding_step IS NOT NULL) peut avoir des appels
-- postés (post-as-you-go étape 6) sans reprise terminée -> ne doit PAS remonter dans
-- les impayés/relances. On AJOUTE un JOIN copros + un filtre ; les colonnes restent
-- identiques (sûr pour v_dashboard_kpis et v_unpaid_with_reminders qui en dépendent).
-- Reprend EXACTEMENT la def vivante (shape 20260125) + JOIN + filtre.

CREATE OR REPLACE VIEW public.v_unpaid_by_lot
WITH (security_invoker = true) AS
SELECT
  cfl.copro_id,
  cfl.lot_id,
  l.ref AS lot_ref,
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) AS owner_name,
  (
    SELECT cp.email
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) AS owner_email,
  SUM(cfl.amount_due - cfl.amount_paid) AS total_unpaid,
  COUNT(cfl.id) AS unpaid_lines_count,
  MIN(cf.due_date) AS oldest_due_date,
  CURRENT_DATE - MIN(cf.due_date) AS days_overdue
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
JOIN copros c ON c.id = cfl.copro_id            -- I5 : rattacher la copro
WHERE cfl.status <> 'paid'
  AND cf.status NOT IN ('draft', 'cancelled')
  AND cf.due_date < CURRENT_DATE
  AND c.onboarding_step IS NULL                  -- I5 : exclure les copros en onboarding
GROUP BY cfl.copro_id, cfl.lot_id, l.ref
HAVING SUM(cfl.amount_due - cfl.amount_paid) > 0
ORDER BY total_unpaid DESC;

COMMENT ON VIEW public.v_unpaid_by_lot IS
  'Impayés agrégés par lot (échu non réglé). Exclut les copros encore en onboarding (onboarding_step IS NOT NULL).';
```

- [ ] **Step 4 — Supprimer la définition morte concurrente (finir la migration)**

Dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\20260401_create_sales_tables.sql`, supprimer le bloc mort (l.627-685) qui crée la version `total_due/severity` jamais appliquée. Remplacer :

```sql
-- ============================================================================
-- VIEW: v_unpaid_by_lot
-- Vue des impayés par lot pour le module impayés/relances
-- Requise par v_unpaid_with_reminders
-- ============================================================================

CREATE OR REPLACE VIEW v_unpaid_by_lot AS
SELECT
  cfl.copro_id,
  cfl.lot_id,
  l.ref AS lot_ref,
  l.type AS lot_type,
  lo.coproprietaire_id AS owner_id,
  COALESCE(
    CASE WHEN cp.is_company THEN cp.company_name
    ELSE CONCAT(cp.first_name, ' ', cp.last_name)
    END,
    'Inconnu'
  ) AS owner_name,
  cp.email AS owner_email,
  cp.phone AS owner_phone,

  -- Montants agrégés
  SUM(cfl.amount_due) AS total_due,
  SUM(cfl.amount_paid) AS total_paid,
  SUM(cfl.amount_due - cfl.amount_paid) AS unpaid_amount,

  -- Nombre de lignes impayées
  COUNT(*) AS unpaid_lines_count,

  -- Date d'échéance la plus ancienne
  MIN(cf.due_date) AS oldest_due_date,

  -- Jours de retard
  GREATEST(CURRENT_DATE - MIN(cf.due_date), 0) AS days_overdue,

  -- Sévérité
  CASE
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 100 THEN 'MINOR'
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 500 THEN 'MEDIUM'
    WHEN SUM(cfl.amount_due - cfl.amount_paid) <= 2000 THEN 'HIGH'
    ELSE 'CRITICAL'
  END AS severity

FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
LEFT JOIN lot_owners lo ON lo.lot_id = cfl.lot_id
  AND lo.end_date IS NULL
  AND lo.is_primary = true
LEFT JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
WHERE cfl.amount_paid < cfl.amount_due
  AND cf.due_date < CURRENT_DATE
  AND cf.status IN ('issued', 'partially_paid')
GROUP BY cfl.copro_id, cfl.lot_id, l.ref, l.type,
         lo.coproprietaire_id, cp.is_company, cp.company_name,
         cp.first_name, cp.last_name, cp.email, cp.phone;

COMMENT ON VIEW v_unpaid_by_lot IS 'Impayés agrégés par lot à partir des lignes d''appels de fonds en retard';
```

par :

```sql
-- ============================================================================
-- VIEW: v_unpaid_by_lot — def MORTE retirée (jamais appliquée en live, shape divergent).
-- La définition vivante/canonique vit dans 20260125_niveau2e_finance_metier.sql,
-- durcie ensuite par 20260603110000 (exclusion onboarding, I5).
-- v_unpaid_with_reminders (recréée ci-dessous) consomme `SELECT u.*` -> aucune
-- colonne nommée n'est requise ici.
-- ============================================================================
```

> ⚠️ Ne PAS toucher au bloc `CREATE OR REPLACE VIEW v_unpaid_with_reminders AS SELECT u.* …` (l.687-719) : il fait `SELECT u.*` et reste valide quelle que soit la def de `v_unpaid_by_lot`.

- [ ] **Step 5 — Appliquer la migration (GO requis)**

Demander le GO. Puis `apply_migration` (project_id `iyfesbjnkpynmwlsmxnp`, name `v1_6_unpaid_exclude_onboarding`, query = contenu du fichier de Step 3).
Attendu : succès.

- [ ] **Step 6 — Rejouer le test**

`execute_sql` du bloc de Step 1.
Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 7 — Non-régression dépendants**

`execute_sql` :
```sql
SELECT
  (SELECT count(*) FROM v_unpaid_with_reminders) AS reminders_ok,
  (SELECT count(*) FROM v_dashboard_kpis)        AS kpis_ok;
```
Attendu : deux entiers, aucune erreur (les vues dépendantes compilent toujours).

- [ ] **Step 8 — Commit**

```bash
cd Co-Pro-Flex && git add supabase/migrations/20260603110000_v1_6_unpaid_exclude_onboarding.sql supabase/migrations/20260401_create_sales_tables.sql supabase/tests/20260603110000_unpaid_exclude_onboarding_test.sql && git commit -m "fix(db): v_unpaid_by_lot exclut les copros en onboarding + suppr def morte (I5)"
```

---

## Task 2 : Sous-composant `EquilibreIndicator` (reste 471/472 + nudge)

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.tsx`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.module.css`
- Create (test): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.test.tsx`

**Pourquoi :** afficher en clair « Reste à imputer (471/472) : X € » avec un nudge « cherchez la cause » quand ≠ 0, et un état vert « équilibré » quand 0. Composant pur (pas d'I/O), facile à tester. C'est la brique réutilisée par `RepriseSoldes` et indirectement la source de l'alerte dashboard.

- [ ] **Step 1 — Écrire le test (échoue : le composant n'existe pas)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EquilibreIndicator } from '@/features/onboarding/reprise/EquilibreIndicator';

describe('EquilibreIndicator', () => {
  it('affiche le reste à imputer et le nudge quand residual != 0', () => {
    render(<EquilibreIndicator residual={423.5} />);
    expect(screen.getByText(/Reste à imputer/i)).toBeInTheDocument();
    expect(screen.getByText(/cherchez la cause/i)).toBeInTheDocument();
  });

  it('affiche l\'état équilibré quand residual == 0', () => {
    render(<EquilibreIndicator residual={0} />);
    expect(screen.getByText(/équilibré/i)).toBeInTheDocument();
    expect(screen.queryByText(/cherchez la cause/i)).not.toBeInTheDocument();
  });

  it('considère un micro-résidu (< 0.01) comme équilibré', () => {
    render(<EquilibreIndicator residual={0.004} />);
    expect(screen.getByText(/équilibré/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 — Lancer le test, vérifier qu'il échoue**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/EquilibreIndicator.test.tsx
```
Attendu : échec `Failed to resolve import "@/features/onboarding/reprise/EquilibreIndicator"` (fichier absent).

> Note : si le repo n'a pas Vitest configuré, exécuter à la place `npx tsc --noEmit` (le test échouera sur l'import manquant) et valider visuellement via l'E2E en Task 9. Vérifier la présence de `vitest` dans `package.json` avant de choisir.

- [ ] **Step 3 — Écrire le composant + le CSS**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.tsx` :

```tsx
'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import styles from './EquilibreIndicator.module.css';

interface EquilibreIndicatorProps {
  /** Net 471/472 courant (signé). Considéré équilibré si |residual| < 0,01. */
  residual: number;
}

const EPSILON = 0.01;

export function EquilibreIndicator({ residual }: EquilibreIndicatorProps) {
  const isBalanced = Math.abs(residual) < EPSILON;

  if (isBalanced) {
    return (
      <div className={`${styles.indicator} ${styles.balanced}`}>
        <CheckCircle2 size={16} className={styles.icon} />
        <span className={styles.label}>Reprise équilibrée — rien en attente (471/472)</span>
      </div>
    );
  }

  return (
    <div className={`${styles.indicator} ${styles.warning}`}>
      <AlertTriangle size={16} className={styles.icon} />
      <div className={styles.body}>
        <span className={styles.label}>
          Reste à imputer (471/472) :{' '}
          <strong className={styles.amount}>
            {residual.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </strong>
        </span>
        <span className={styles.nudge}>
          Ce n&apos;est pas bloquant, mais cherchez la cause : banque, réserves ou report manquant.
        </span>
      </div>
    </div>
  );
}
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\EquilibreIndicator.module.css` :

```css
.indicator {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin: 16px 0;
}

.balanced {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-weight: 600;
}

.amount {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.nudge {
  font-size: 12px;
  opacity: 0.85;
  font-weight: 400;
}
```

- [ ] **Step 4 — Lancer le test, vérifier qu'il passe**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/EquilibreIndicator.test.tsx && npx tsc --noEmit
```
Attendu : tests verts + `tsc` exit 0.

- [ ] **Step 5 — Commit**

```bash
cd Co-Pro-Flex && git add src/components/features/onboarding/reprise/EquilibreIndicator.tsx src/components/features/onboarding/reprise/EquilibreIndicator.module.css src/components/features/onboarding/reprise/EquilibreIndicator.test.tsx && git commit -m "feat(onboarding): composant EquilibreIndicator (reste 471/472 + nudge)"
```

---

## Task 3 : Sous-composant `SoldesParLotTable` (450-1/2/5 + 103 par lot)

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.tsx`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.module.css`
- Create (test): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.test.tsx`

**Pourquoi :** la saisie lot-centric des créances 450 (current/works/alur) **et** de l'avance 103, une ligne par lot. Composant **contrôlé** (la valeur vient du parent, qui détient l'état global de toutes les lignes du formulaire). Réutilise le pattern visuel de l'ancien Step7.

- [ ] **Step 1 — Écrire le test (échoue : composant absent)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.test.tsx` :

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SoldesParLotTable, type LotRow, type LotCol } from '@/features/onboarding/reprise/SoldesParLotTable';

const lots: LotRow[] = [
  { id: 'lot-1', ref: 'A-101', ownerName: 'Alice Martin' },
  { id: 'lot-2', ref: 'A-102', ownerName: 'Bob Durand' },
];

describe('SoldesParLotTable', () => {
  it('rend une ligne par lot avec les 4 colonnes (current/works/alur/avance)', () => {
    render(<SoldesParLotTable lots={lots} values={{}} onChange={() => {}} />);
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('A-102')).toBeInTheDocument();
    // 2 lots x 4 colonnes = 8 inputs
    expect(screen.getAllByRole('spinbutton')).toHaveLength(8);
  });

  it('remonte (lotId, col, valeur) à la saisie', () => {
    const onChange = vi.fn();
    render(<SoldesParLotTable lots={lots} values={{}} onChange={onChange} />);
    const firstInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(firstInput, { target: { value: '500' } });
    const cols: LotCol[] = ['current', 'works', 'alur', 'avance'];
    expect(onChange).toHaveBeenCalledWith('lot-1', cols[0], '500');
  });
});
```

- [ ] **Step 2 — Lancer le test, vérifier qu'il échoue**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/SoldesParLotTable.test.tsx
```
Attendu : échec import manquant.

- [ ] **Step 3 — Écrire le composant + le CSS**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.tsx` :

```tsx
'use client';

import { useCallback } from 'react';
import styles from './SoldesParLotTable.module.css';

export type LotCol = 'current' | 'works' | 'alur' | 'avance';

export interface LotRow {
  id: string;
  ref: string;
  ownerName: string | null;
}

interface SoldesParLotTableProps {
  lots: LotRow[];
  /** clé = `${lotId}:${col}` -> valeur texte saisie */
  values: Record<string, string>;
  onChange: (lotId: string, col: LotCol, value: string) => void;
}

const COLS: { key: LotCol; label: string; sub: string }[] = [
  { key: 'current', label: 'Courant', sub: '450-1' },
  { key: 'works', label: 'Travaux', sub: '450-2' },
  { key: 'alur', label: 'Fonds ALUR', sub: '450-5' },
  { key: 'avance', label: 'Avance', sub: '103' },
];

export function SoldesParLotTable({ lots, values, onChange }: SoldesParLotTableProps) {
  const cellClass = useCallback((raw: string) => {
    const v = parseFloat(raw) || 0;
    return v > 0 ? styles.positive : v < 0 ? styles.negative : '';
  }, []);

  if (lots.length === 0) {
    return <div className={styles.empty}>Aucun lot trouvé pour cette copropriété.</div>;
  }

  return (
    <table className={styles.table}>
      <thead className={styles.head}>
        <tr>
          <th className={styles.th}>Lot</th>
          <th className={styles.th}>Propriétaire</th>
          {COLS.map(c => (
            <th key={c.key} className={styles.thRight}>
              {c.label} <span className={styles.thSub}>({c.sub})</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lots.map(lot => (
          <tr key={lot.id} className={styles.tr}>
            <td className={styles.tdRef}>{lot.ref}</td>
            <td className={styles.tdOwner}>{lot.ownerName || '—'}</td>
            {COLS.map(c => {
              const k = `${lot.id}:${c.key}`;
              const raw = values[k] || '';
              return (
                <td key={c.key} className={styles.tdInput}>
                  <input
                    className={`${styles.input} ${cellClass(raw)}`}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={raw}
                    onChange={e => onChange(lot.id, c.key, e.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\SoldesParLotTable.module.css` :

```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.head {
  background: var(--border-light);
}

.th {
  padding: 10px 14px;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.thRight {
  composes: th;
  text-align: right;
}

.thSub {
  font-weight: 400;
  text-transform: none;
  opacity: 0.7;
}

.tr {
  border-bottom: 1px solid var(--border-light);
}

.tr:last-child { border-bottom: none; }
.tr:hover { background: var(--border-light); }

.tdRef {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
}

.tdOwner {
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tdInput { padding: 6px 14px; }

.input {
  width: 120px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  background: var(--border-light);
  color: var(--text-main);
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus { border-color: rgba(59, 130, 246, 0.4); }
.input::placeholder { color: var(--text-tertiary); }

/* dû = débiteur = rouge ; avoir = créditeur = vert (convention copro) */
.positive { color: #ef4444; }
.negative { color: #22c55e; }

.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}
```

- [ ] **Step 4 — Lancer le test, vérifier qu'il passe**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/SoldesParLotTable.test.tsx && npx tsc --noEmit
```
Attendu : tests verts + `tsc` exit 0.

- [ ] **Step 5 — Commit**

```bash
cd Co-Pro-Flex && git add src/components/features/onboarding/reprise/SoldesParLotTable.tsx src/components/features/onboarding/reprise/SoldesParLotTable.module.css src/components/features/onboarding/reprise/SoldesParLotTable.test.tsx && git commit -m "feat(onboarding): composant SoldesParLotTable (450-1/2/5 + 103/lot)"
```

---

## Task 4 : Sous-composant `BalanceEntreeForm` (Essentiel + Autres comptes + reprise en cours d'année)

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.tsx`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.module.css`
- Create (test): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.test.tsx`

**Pourquoi :** la partie « comptes globaux » de la reprise : 512/502 **pré-remplis par `account_id`** (B5, comptes créés à l'étape 4), 105 global, 401 global, 110/120 (report), section « Autres comptes » repliable (classes 1-5), et la bascule « reprise en cours d'année » qui révèle une date de reprise et la saisie des 6/7. Composant **contrôlé** (état détenu par `RepriseSoldes`). Pas d'I/O ici : les listes de comptes (banque, plan) sont passées en props par le conteneur.

- [ ] **Step 1 — Écrire le test (échoue : composant absent)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.test.tsx` :

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BalanceEntreeForm, type BalanceFormState } from '@/features/onboarding/reprise/BalanceEntreeForm';

const baseState: BalanceFormState = {
  bankBalances: {},            // accountId -> texte
  fondsAlur: '',
  fournisseurs: '',
  report110: '',
  report120: '',
  autres: {},                  // accountId -> texte
  midYear: false,
  asOfDate: '',
  produits: {},                // accountId(7xx) -> texte
  charges: {},                 // accountId(6xx) -> texte
};

const bankAccounts = [
  { id: 'acc-512', name: 'Compte courant', code: '512000' },
  { id: 'acc-502', name: 'Fonds travaux', code: '512100' },
];
const planAccounts = [
  { id: 'acc-601', code: '601', name: 'Eau' },
  { id: 'acc-701', code: '701', name: 'Provisions courantes' },
];

describe('BalanceEntreeForm', () => {
  it('pré-remplit un champ par compte bancaire de l\'étape 4', () => {
    render(
      <BalanceEntreeForm
        state={baseState}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/Compte courant/)).toBeInTheDocument();
    expect(screen.getByText(/Fonds travaux/)).toBeInTheDocument();
  });

  it('révèle la date et la saisie 6/7 quand "reprise en cours d\'année" est activée', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BalanceEntreeForm
        state={baseState}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={onChange}
      />
    );
    // pas de date visible tant que midYear=false
    expect(screen.queryByLabelText(/Date de reprise/i)).not.toBeInTheDocument();

    // activer la bascule
    fireEvent.click(screen.getByRole('checkbox', { name: /reprise en cours d.année/i }));
    expect(onChange).toHaveBeenCalled();

    // rerender avec midYear=true -> date + bloc 6/7 visibles
    rerender(
      <BalanceEntreeForm
        state={{ ...baseState, midYear: true }}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText(/Date de reprise/i)).toBeInTheDocument();
    expect(screen.getByText(/Charges et produits de l.exercice/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 — Lancer le test, vérifier qu'il échoue**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/BalanceEntreeForm.test.tsx
```
Attendu : échec import manquant.

- [ ] **Step 3 — Écrire le composant + le CSS**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.tsx` :

```tsx
'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './BalanceEntreeForm.module.css';

export interface PlanAccount {
  id: string;
  code: string;
  name: string;
}
export interface BankAccount {
  id: string;
  name: string;
  code: string;
}

/** État complet de la partie « comptes globaux » de la reprise (détenu par le conteneur). */
export interface BalanceFormState {
  bankBalances: Record<string, string>; // accountId (512x/502x) -> texte signé
  fondsAlur: string;                     // 105 global
  fournisseurs: string;                  // 401 global (créditeur)
  report110: string;                     // report travaux/exceptionnel
  report120: string;                     // report courant
  autres: Record<string, string>;        // accountId (classes 1-5) -> texte
  midYear: boolean;                       // reprise en cours d'année
  asOfDate: string;                       // YYYY-MM-DD
  produits: Record<string, string>;       // accountId 7xx -> texte
  charges: Record<string, string>;        // accountId 6xx -> texte
}

type ScalarField = 'fondsAlur' | 'fournisseurs' | 'report110' | 'report120' | 'asOfDate';
type MapField = 'bankBalances' | 'autres' | 'produits' | 'charges';

interface BalanceEntreeFormProps {
  state: BalanceFormState;
  bankAccounts: BankAccount[];
  planAccounts: PlanAccount[];
  onChange: (next: BalanceFormState) => void;
}

export function BalanceEntreeForm({ state, bankAccounts, planAccounts, onChange }: BalanceEntreeFormProps) {
  const [showAutres, setShowAutres] = useState(false);

  const setScalar = useCallback((field: ScalarField, value: string) => {
    onChange({ ...state, [field]: value });
  }, [state, onChange]);

  const setBool = useCallback((field: 'midYear', value: boolean) => {
    onChange({ ...state, [field]: value });
  }, [state, onChange]);

  const setMap = useCallback((field: MapField, accountId: string, value: string) => {
    onChange({ ...state, [field]: { ...state[field], [accountId]: value } });
  }, [state, onChange]);

  // Classes 1-5 hors comptes déjà couverts par « Essentiel » (105, 110, 120, 401, banques)
  const essentialCodes = new Set(['105', '110', '120', '401']);
  const bankIds = new Set(bankAccounts.map(b => b.id));
  const autresAccounts = planAccounts.filter(a =>
    /^[1-5]/.test(a.code) && !essentialCodes.has(a.code) && !bankIds.has(a.id)
  );
  const charges6 = planAccounts.filter(a => /^6/.test(a.code));
  const produits7 = planAccounts.filter(a => /^7/.test(a.code));

  return (
    <div className={styles.form}>
      <p className={styles.intro}>
        Préparez le dernier relevé bancaire et la dernière balance du syndic sortant.
        Saisissez les soldes globaux à la date de reprise (positif = solde débiteur).
      </p>

      {/* ── Essentiel ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Comptes essentiels</h3>

        {bankAccounts.map(acc => (
          <Field
            key={acc.id}
            label={`${acc.name}`}
            sub={`Banque ${acc.code}`}
            value={state.bankBalances[acc.id] || ''}
            onChange={v => setMap('bankBalances', acc.id, v)}
          />
        ))}

        <Field label="Fonds travaux ALUR (réserve)" sub="105"
          value={state.fondsAlur} onChange={v => setScalar('fondsAlur', v)} />
        <Field label="Dettes fournisseurs" sub="401"
          value={state.fournisseurs} onChange={v => setScalar('fournisseurs', v)} />
        <Field label="Report à nouveau — courant" sub="120"
          value={state.report120} onChange={v => setScalar('report120', v)} />
        <Field label="Report à nouveau — travaux / exceptionnel" sub="110"
          value={state.report110} onChange={v => setScalar('report110', v)} />
      </section>

      {/* ── Autres comptes (repliable) ── */}
      <section className={styles.section}>
        <button type="button" className={styles.collapseHeader} onClick={() => setShowAutres(s => !s)}>
          {showAutres ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Autres comptes (classes 1 à 5)
        </button>
        {showAutres && (
          <div className={styles.collapseBody}>
            {autresAccounts.length === 0 && (
              <p className={styles.muted}>Aucun autre compte de bilan à reprendre.</p>
            )}
            {autresAccounts.map(acc => (
              <Field key={acc.id} label={acc.name} sub={acc.code}
                value={state.autres[acc.id] || ''}
                onChange={v => setMap('autres', acc.id, v)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Reprise en cours d'année ── */}
      <section className={styles.section}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={state.midYear}
            onChange={e => setBool('midYear', e.target.checked)}
            aria-label="Reprise en cours d'année"
          />
          <span>Reprise en cours d&apos;année (des charges/produits ont déjà couru)</span>
        </label>

        {state.midYear && (
          <div className={styles.midYearBody}>
            <div className={styles.dateRow}>
              <label className={styles.dateLabel} htmlFor="asOfDate">Date de reprise</label>
              <input
                id="asOfDate"
                className={styles.dateInput}
                type="date"
                value={state.asOfDate}
                onChange={e => setScalar('asOfDate', e.target.value)}
              />
            </div>

            <h4 className={styles.subTitle}>Charges et produits de l&apos;exercice (déjà courus)</h4>
            <div className={styles.twoCols}>
              <div>
                <span className={styles.colLabel}>Charges (6xx)</span>
                {charges6.map(acc => (
                  <Field key={acc.id} label={acc.name} sub={acc.code}
                    value={state.charges[acc.id] || ''}
                    onChange={v => setMap('charges', acc.id, v)} />
                ))}
              </div>
              <div>
                <span className={styles.colLabel}>Produits (7xx)</span>
                {produits7.map(acc => (
                  <Field key={acc.id} label={acc.name} sub={acc.code}
                    value={state.produits[acc.id] || ''}
                    onChange={v => setMap('produits', acc.id, v)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface FieldProps {
  label: string; sub: string; value: string; onChange: (v: string) => void;
}
function Field({ label, sub, value, onChange }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabels}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldSub}>{sub}</span>
      </div>
      <input
        className={styles.fieldInput}
        type="number"
        step="0.01"
        placeholder="0.00"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
```

> ⚠️ Taille : ce fichier fait ~190 lignes — sous la limite de 200. Si l'implémentation le dépasse, extraire `Field` dans `reprise/Field.tsx`.

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\BalanceEntreeForm.module.css` :

```css
.form { display: flex; flex-direction: column; gap: 8px; }

.intro {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.section {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 12px;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
}
.field:last-child { border-bottom: none; }

.fieldLabels { display: flex; flex-direction: column; }
.fieldLabel { font-size: 13px; color: var(--text-main); }
.fieldSub {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.fieldInput {
  width: 140px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  background: var(--border-light);
  color: var(--text-main);
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
}
.fieldInput:focus { border-color: rgba(59, 130, 246, 0.4); }

.collapseHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.collapseBody { margin-top: 12px; }
.muted { font-size: 12px; color: var(--text-tertiary); }

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
}

.midYearBody { margin-top: 12px; }

.dateRow { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.dateLabel { font-size: 13px; color: var(--text-secondary); }
.dateInput {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  background: var(--border-light);
  color: var(--text-main);
  font-size: 13px;
  outline: none;
}

.subTitle { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px; }
.twoCols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.colLabel {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
```

- [ ] **Step 4 — Lancer le test, vérifier qu'il passe**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/BalanceEntreeForm.test.tsx && npx tsc --noEmit
```
Attendu : tests verts + `tsc` exit 0.

- [ ] **Step 5 — Commit**

```bash
cd Co-Pro-Flex && git add src/components/features/onboarding/reprise/BalanceEntreeForm.tsx src/components/features/onboarding/reprise/BalanceEntreeForm.module.css src/components/features/onboarding/reprise/BalanceEntreeForm.test.tsx && git commit -m "feat(onboarding): composant BalanceEntreeForm (essentiel + autres + 6/7 mid-year)"
```

---

## Task 5 : Conteneur `RepriseSoldes` (charge `get`, agrège les lignes, enregistre via `set`)

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\useRepriseSoldes.ts` (hook état + I/O, garde le conteneur < 200 lignes)
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseSoldes.tsx`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseSoldes.module.css`
- Create (test): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\useRepriseSoldes.test.ts`

**Pourquoi :** `RepriseSoldes` est le composant réutilisable wizard ET autonome. Il charge la reprise existante via `getOnboardingOpeningBalance`, agrège l'état des 3 sous-composants en `OpeningBalanceLine[]`, et enregistre via `setOnboardingOpeningBalance` (non bloquant). La logique d'agrégation (mapping des champs vers les `accountCode`/`lotId`/`nature` du contrat Plan B) est isolée dans un hook **testable sans DOM**.

- [ ] **Step 1 — Écrire le test du mapping (échoue : hook absent)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\useRepriseSoldes.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { buildOpeningLines, type RepriseInputs } from '@/features/onboarding/reprise/useRepriseSoldes';

const lots = [
  { id: 'lot-1', ref: 'A-101', ownerName: 'Alice' },
  { id: 'lot-2', ref: 'A-102', ownerName: 'Bob' },
];

const emptyForm = {
  bankBalances: {}, fondsAlur: '', fournisseurs: '', report110: '', report120: '',
  autres: {}, midYear: false, asOfDate: '', produits: {}, charges: {},
};

describe('buildOpeningLines', () => {
  it('produit une ligne 450-1/lot pour un solde courant (lot-centric, nature=current)', () => {
    const inputs: RepriseInputs = {
      form: emptyForm,
      lotValues: { 'lot-1:current': '500' },
      bankCodeById: { 'acc-512': '512000' },
      autresCodeById: {},
      chargeCodeById: {},
      produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '450-1', lotId: 'lot-1', amount: 500, nature: 'current' });
  });

  it('mappe 103/lot pour une avance', () => {
    const inputs: RepriseInputs = {
      form: emptyForm,
      lotValues: { 'lot-2:avance': '300' },
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '103', lotId: 'lot-2', amount: 300 });
  });

  it('mappe les comptes globaux essentiels (105/401/110/120) sans lotId', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, fondsAlur: '1000', fournisseurs: '200', report110: '50', report120: '80' },
      lotValues: {},
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '105', lotId: null, amount: 1000 });
    expect(lines).toContainEqual({ accountCode: '401', lotId: null, amount: 200 });
    expect(lines).toContainEqual({ accountCode: '110', lotId: null, amount: 50 });
    expect(lines).toContainEqual({ accountCode: '120', lotId: null, amount: 80 });
  });

  it('mappe la banque par CODE résolu via account_id (B5), pas par 512 nu', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, bankBalances: { 'acc-512': '4200' } },
      lotValues: {},
      bankCodeById: { 'acc-512': '512000' },
      autresCodeById: {}, chargeCodeById: {}, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '512000', lotId: null, amount: 4200 });
  });

  it('ignore les champs vides / 0 et n\'inclut les 6/7 que si midYear', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, midYear: false, charges: { 'acc-601': '100' } },
      lotValues: { 'lot-1:current': '0', 'lot-1:works': '' },
      bankCodeById: {}, autresCodeById: {}, chargeCodeById: { 'acc-601': '601' }, produitCodeById: {},
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines.find(l => l.accountCode === '601')).toBeUndefined(); // midYear off
    expect(lines.find(l => l.accountCode === '450-1' && l.lotId === 'lot-1')).toBeUndefined(); // 0/vide
  });

  it('inclut les charges 6xx (débit) et produits 7xx (crédit, signé négatif) quand midYear', () => {
    const inputs: RepriseInputs = {
      form: { ...emptyForm, midYear: true, asOfDate: '2026-06-01',
              charges: { 'acc-601': '100' }, produits: { 'acc-701': '900' } },
      lotValues: {},
      bankCodeById: {}, autresCodeById: {},
      chargeCodeById: { 'acc-601': '601' }, produitCodeById: { 'acc-701': '701' },
    };
    const lines = buildOpeningLines(inputs, lots);
    expect(lines).toContainEqual({ accountCode: '601', lotId: null, amount: 100 });
    expect(lines).toContainEqual({ accountCode: '701', lotId: null, amount: -900 });
  });
});
```

> Convention de signe (alignée sur le moteur `set_opening_balance`, contrat débit > 0) : actifs/charges/créances 450/103 et reports débiteurs = **montant tel quel** (débit positif) ; passifs (105 réserve, 401 dette, produits 7xx) = **montant négatif** (crédit). Le moteur calcule le résidu = −Σ et le pose en 471/472. Côté UI on saisit des **valeurs positives** dans des champs étiquetés par nature ; `buildOpeningLines` applique le signe selon la classe.

- [ ] **Step 2 — Lancer le test, vérifier qu'il échoue**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/useRepriseSoldes.test.ts
```
Attendu : échec import manquant.

- [ ] **Step 3 — Écrire le hook (état + mapping + I/O)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\useRepriseSoldes.ts` :

```ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getOnboardingOpeningBalance,
  setOnboardingOpeningBalance,
  listComptesBancaires,
  listPlanAccounts,
  type OpeningBalanceLine,
} from '@/lib/onboarding/api';
import { listLots } from '@/lib/onboarding/api';
import type { BalanceFormState, BankAccount, PlanAccount } from './BalanceEntreeForm';
import type { LotRow, LotCol } from './SoldesParLotTable';

const EMPTY_FORM: BalanceFormState = {
  bankBalances: {}, fondsAlur: '', fournisseurs: '', report110: '', report120: '',
  autres: {}, midYear: false, asOfDate: '', produits: {}, charges: {},
};

/** Entrées brutes -> lignes du moteur. Pur, testable sans DOM. */
export interface RepriseInputs {
  form: BalanceFormState;
  lotValues: Record<string, string>;     // `${lotId}:${col}` -> texte
  bankCodeById: Record<string, string>;  // accountId -> code (ex. 512000)
  autresCodeById: Record<string, string>;
  chargeCodeById: Record<string, string>;
  produitCodeById: Record<string, string>;
}

const NATURE_BY_COL: Record<Exclude<LotCol, 'avance'>, { code: string; nature: 'current' | 'works' | 'alur' }> = {
  current: { code: '450-1', nature: 'current' },
  works: { code: '450-2', nature: 'works' },
  alur: { code: '450-5', nature: 'alur' },
};

function num(raw: string | undefined): number {
  const v = parseFloat(raw ?? '');
  return Number.isFinite(v) ? v : 0;
}

export function buildOpeningLines(inputs: RepriseInputs, lots: LotRow[]): OpeningBalanceLine[] {
  const lines: OpeningBalanceLine[] = [];
  const { form, lotValues } = inputs;

  // 1) Par lot : 450-x (current/works/alur) + 103 (avance)
  for (const lot of lots) {
    (['current', 'works', 'alur'] as const).forEach(col => {
      const amount = num(lotValues[`${lot.id}:${col}`]);
      if (amount !== 0) {
        const { code, nature } = NATURE_BY_COL[col];
        lines.push({ accountCode: code, lotId: lot.id, amount, nature });
      }
    });
    const avance = num(lotValues[`${lot.id}:avance`]);
    if (avance !== 0) lines.push({ accountCode: '103', lotId: lot.id, amount: avance });
  }

  // 2) Banques (résolues par account_id -> code) ; débit positif
  for (const [accId, code] of Object.entries(inputs.bankCodeById)) {
    const amount = num(form.bankBalances[accId]);
    if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount });
  }

  // 3) Globaux essentiels. Passifs en crédit -> on n'inverse PAS le signe ici :
  //    la valeur saisie est positive et représente un solde ; le moteur équilibre.
  //    Convention : 105/401 = passif (crédit) -> montant négatif ; 110/120 reports débiteurs -> positif.
  const alur = num(form.fondsAlur);     if (alur !== 0) lines.push({ accountCode: '105', lotId: null, amount: -alur });
  const four = num(form.fournisseurs);  if (four !== 0) lines.push({ accountCode: '401', lotId: null, amount: -four });
  const r110 = num(form.report110);     if (r110 !== 0) lines.push({ accountCode: '110', lotId: null, amount: r110 });
  const r120 = num(form.report120);     if (r120 !== 0) lines.push({ accountCode: '120', lotId: null, amount: r120 });

  // 4) Autres comptes (classes 1-5), saisis tels quels (débit positif)
  for (const [accId, code] of Object.entries(inputs.autresCodeById)) {
    const amount = num(form.autres[accId]);
    if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount });
  }

  // 5) Charges/produits SEULEMENT si reprise en cours d'année
  if (form.midYear) {
    for (const [accId, code] of Object.entries(inputs.chargeCodeById)) {
      const amount = num(form.charges[accId]);
      if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount }); // charge = débit positif
    }
    for (const [accId, code] of Object.entries(inputs.produitCodeById)) {
      const amount = num(form.produits[accId]);
      if (amount !== 0) lines.push({ accountCode: code, lotId: null, amount: -amount }); // produit = crédit
    }
  }

  return lines;
}

interface UseRepriseSoldesResult {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  residual: number;
  lots: LotRow[];
  bankAccounts: BankAccount[];
  planAccounts: PlanAccount[];
  form: BalanceFormState;
  setForm: (next: BalanceFormState) => void;
  lotValues: Record<string, string>;
  setLotValue: (lotId: string, col: LotCol, value: string) => void;
  save: () => Promise<{ ok: boolean; residual: number }>;
}

export function useRepriseSoldes(coproId: string, periodId: string): UseRepriseSoldesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [residual, setResidual] = useState(0);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [planAccounts, setPlanAccounts] = useState<PlanAccount[]>([]);
  const [form, setForm] = useState<BalanceFormState>(EMPTY_FORM);
  const [lotValues, setLotValues] = useState<Record<string, string>>({});

  // Index code par account_id pour le mapping inverse
  const bankCodeById = Object.fromEntries(bankAccounts.map(a => [a.id, a.code]));
  const essentialCodes = new Set(['105', '110', '120', '401']);
  const bankIds = new Set(bankAccounts.map(b => b.id));
  const autresCodeById = Object.fromEntries(
    planAccounts.filter(a => /^[1-5]/.test(a.code) && !essentialCodes.has(a.code) && !bankIds.has(a.id))
      .map(a => [a.id, a.code]));
  const chargeCodeById = Object.fromEntries(planAccounts.filter(a => /^6/.test(a.code)).map(a => [a.id, a.code]));
  const produitCodeById = Object.fromEntries(planAccounts.filter(a => /^7/.test(a.code)).map(a => [a.id, a.code]));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [lotsRes, banksRes, planRes, openRes] = await Promise.all([
        listLots(coproId),
        listComptesBancaires(coproId),
        listPlanAccounts(coproId),
        getOnboardingOpeningBalance(coproId, periodId),
      ]);
      if (cancelled) return;
      if (lotsRes.data) setLots(lotsRes.data.map(l => ({ id: l.id, ref: l.ref, ownerName: l.ownerName })));
      if (banksRes.data) setBankAccounts(banksRes.data.map(b => ({ id: b.id, name: b.name, code: b.code })));
      if (planRes.data) setPlanAccounts(planRes.data);
      if (openRes.data) {
        setResidual(openRes.data.residual);
        hydrateFromLines(openRes.data.lines, openRes.data.asOfDate);
      }
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coproId, periodId]);

  // Pré-remplit le formulaire depuis une reprise existante (ré-édition).
  const hydrateFromLines = useCallback((lines: OpeningBalanceLine[], asOfDate: string | null) => {
    const nextForm: BalanceFormState = { ...EMPTY_FORM, midYear: !!asOfDate, asOfDate: asOfDate || '' };
    const nextLotValues: Record<string, string> = {};
    for (const ln of lines) {
      if (ln.lotId && ln.accountCode.startsWith('450-')) {
        const col = ln.accountCode === '450-1' ? 'current' : ln.accountCode === '450-2' ? 'works' : 'alur';
        nextLotValues[`${ln.lotId}:${col}`] = String(ln.amount);
      } else if (ln.lotId && ln.accountCode === '103') {
        nextLotValues[`${ln.lotId}:avance`] = String(ln.amount);
      } else if (ln.accountCode === '105') nextForm.fondsAlur = String(Math.abs(ln.amount));
      else if (ln.accountCode === '401') nextForm.fournisseurs = String(Math.abs(ln.amount));
      else if (ln.accountCode === '110') nextForm.report110 = String(ln.amount);
      else if (ln.accountCode === '120') nextForm.report120 = String(ln.amount);
    }
    setForm(nextForm);
    setLotValues(nextLotValues);
  }, []);

  const setLotValue = useCallback((lotId: string, col: LotCol, value: string) => {
    setLotValues(prev => ({ ...prev, [`${lotId}:${col}`]: value }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    const lines = buildOpeningLines(
      { form, lotValues, bankCodeById, autresCodeById, chargeCodeById, produitCodeById },
      lots
    );
    const asOf = form.midYear && form.asOfDate ? form.asOfDate : new Date().toISOString().split('T')[0];
    const res = await setOnboardingOpeningBalance(coproId, periodId, asOf, lines);
    setIsSaving(false);
    if (res.error) { setError(res.error.message); return { ok: false, residual }; }
    const newResidual = res.data?.residual ?? 0;
    setResidual(newResidual);
    return { ok: true, residual: newResidual };
  }, [form, lotValues, lots, coproId, periodId, residual,
      bankCodeById, autresCodeById, chargeCodeById, produitCodeById]);

  return {
    isLoading, isSaving, error, residual, lots, bankAccounts, planAccounts,
    form, setForm, lotValues, setLotValue, save,
  };
}
```

- [ ] **Step 4 — Écrire le conteneur + le CSS**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseSoldes.tsx` :

```tsx
'use client';

import { useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { BalanceEntreeForm } from './BalanceEntreeForm';
import { SoldesParLotTable } from './SoldesParLotTable';
import { EquilibreIndicator } from './EquilibreIndicator';
import { useRepriseSoldes } from './useRepriseSoldes';
import styles from './RepriseSoldes.module.css';

interface RepriseSoldesProps {
  coproId: string;
  periodId: string;
  /** Wizard : avance à l'étape suivante après save. Autonome : ferme le panneau. */
  onSaved?: (residual: number) => void;
  /** Wizard : retour. Absent en mode autonome. */
  onBack?: () => void;
  /** Libellé du bouton principal (défaut « Enregistrer la reprise »). */
  saveLabel?: string;
  /** Affiche un bouton « Passer » (wizard uniquement). */
  onSkip?: () => void;
}

export function RepriseSoldes({ coproId, periodId, onSaved, onBack, saveLabel, onSkip }: RepriseSoldesProps) {
  const r = useRepriseSoldes(coproId, periodId);

  const handleSave = useCallback(async () => {
    const { ok, residual } = await r.save();
    if (ok) onSaved?.(residual);
  }, [r, onSaved]);

  if (r.isLoading) {
    return <div className={styles.loading}>Chargement de la reprise…</div>;
  }

  return (
    <div className={styles.container}>
      <StepHeader
        title="Reprise de soldes"
        description="Saisissez les soldes à la date de reprise (banque, réserves, créances par lot). C'est ré-éditable : enregistrez même si tout n'est pas connu."
      />

      {r.error && <div className={styles.error}>{r.error}</div>}

      <BalanceEntreeForm
        state={r.form}
        bankAccounts={r.bankAccounts}
        planAccounts={r.planAccounts}
        onChange={r.setForm}
      />

      <h3 className={styles.lotTitle}>Soldes par lot</h3>
      <p className={styles.lotHint}>
        Positif = le copropriétaire doit de l&apos;argent. Négatif = il a un avoir.
        L&apos;avance (103) est tracée à part et n&apos;entre pas dans le solde affiché.
      </p>
      <SoldesParLotTable lots={r.lots} values={r.lotValues} onChange={r.setLotValue} />

      <EquilibreIndicator residual={r.residual} />

      <div className={styles.footer}>
        {onBack ? <button className={styles.btnBack} onClick={onBack} disabled={r.isSaving}>Retour</button> : <span />}
        <div className={styles.footerRight}>
          {onSkip && (
            <button className={styles.btnSkip} onClick={onSkip} disabled={r.isSaving}>Passer</button>
          )}
          <button className={styles.btnSave} onClick={handleSave} disabled={r.isSaving}>
            {r.isSaving ? 'Enregistrement…' : (saveLabel ?? 'Enregistrer la reprise')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseSoldes.module.css` :

```css
.container { max-width: 760px; margin: 0 auto; }
.loading { text-align: center; padding: 48px; color: var(--text-tertiary); font-size: 13px; }

.error {
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  font-size: 12px;
  margin-bottom: 16px;
}

.lotTitle { font-size: 13px; font-weight: 700; color: var(--text-main); margin: 24px 0 4px; }
.lotHint { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 12px; }

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}
.footerRight { display: flex; align-items: center; gap: 12px; }

.btnBack {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--border-light);
  color: var(--text-secondary);
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.btnBack:hover { color: var(--text-main); }

.btnSkip {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer;
}
.btnSkip:hover { color: var(--text-main); }

.btnSave {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.btnSave:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.btnSave:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
```

- [ ] **Step 5 — Lancer les tests + type check**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/useRepriseSoldes.test.ts && npx tsc --noEmit
```
Attendu : tests verts (les 6 cas de `buildOpeningLines`) + `tsc` exit 0.

- [ ] **Step 6 — Commit**

```bash
cd Co-Pro-Flex && git add src/components/features/onboarding/reprise/useRepriseSoldes.ts src/components/features/onboarding/reprise/useRepriseSoldes.test.ts src/components/features/onboarding/reprise/RepriseSoldes.tsx src/components/features/onboarding/reprise/RepriseSoldes.module.css && git commit -m "feat(onboarding): conteneur RepriseSoldes reutilisable (charge get, enregistre set)"
```

---

## Task 6 : I6/I7 — upsert/verrou budget après émission d'appels (`createOnboardingBudget`)

**Files:**
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\lib\onboarding\api.ts` (fonction `createOnboardingBudget`, l.328-404)
- Create (test SQL): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\tests\20260603111000_budget_upsert_guard_test.sql`

**Pourquoi (I6) :** aujourd'hui `createOnboardingBudget` fait un INSERT sec. Un aller-retour Step5↔Step6 (re-validation du budget) crée un **second** budget `draft` → doublon, et les appels postés pointent sur l'ancien. Parade : si un budget existe déjà pour `(copro_id, period_id, budget_type='current')` avec des appels émis (`call_for_funds` non annulés) → **verrouiller** (réutiliser ce budget, ne pas recréer). Sinon, **upsert** : réutiliser/écraser le budget draft existant. (I7 — « budget validé & 0 appel » — est traité dans le verrou étape 8 du Plan C, hors périmètre code ici ; on garantit juste qu'il n'y a qu'un budget par période.)

- [ ] **Step 1 — Écrire le test SQL (échoue : 2 budgets après 2 saisies)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\tests\20260603111000_budget_upsert_guard_test.sql` :

```sql
-- Vérifie l'invariant DB que le code TS doit garantir : au plus 1 budget 'current'
-- par (copro, période) une fois des appels émis. Ce test pose l'invariant ; le code
-- TS (createOnboardingBudget) le respecte en réutilisant le budget verrouillé.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_budget uuid; v_count int;
BEGIN
  v := create_clean_test_copro_seeded('i6-budget', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_budget FROM budgets WHERE copro_id = v_copro AND budget_type='current' ORDER BY created_at DESC LIMIT 1;

  -- Émettre un appel -> le budget est désormais "verrouillé" (référencé par des appels)
  PERFORM post_budget_call_for_funds(
    v_copro, v_period, v_budget, 'Appel T1', 1,
    CURRENT_DATE::text, (CURRENT_DATE + 30)::text, 1.0, 1, 4
  );

  -- Invariant : 1 seul budget current pour cette période
  SELECT count(*) INTO v_count FROM budgets WHERE copro_id = v_copro AND period_id = v_period AND budget_type='current';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : % budgets current pour la periode (attendu 1)', v_count;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test (référence : invariant DB tient pour 1 saisie)**

`execute_sql` du bloc. Attendu : `ROLLBACK_TEST_OK` (1 budget). Ce test fige l'invariant ; la régression viendrait du code TS qui INSERT un 2ᵉ budget. On le protège côté TS aux steps suivants.

- [ ] **Step 3 — Modifier `createOnboardingBudget` (réutiliser le budget existant)**

Dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\lib\onboarding\api.ts`, remplacer le bloc de création du budget (l.361-374) :

```ts
  // Create budget
  const { data: budget, error: budgetErr } = await supabase
    .from('budgets')
    .insert({
      copro_id: coproId,
      period_id: periodId,
      budget_type: 'current',
      name,
      status: 'draft',
      version: 1,
    })
    .select('id')
    .single();
  if (budgetErr) return { data: null, error: new Error(budgetErr.message) };
```

par :

```ts
  // I6 — Au plus UN budget 'current' par (copro, période). Si un budget existe déjà :
  //   - s'il est référencé par des appels émis (verrouillé) -> on le RÉUTILISE tel quel
  //     (et on ne recrée pas de lignes : retour anticipé pour éviter les doublons) ;
  //   - sinon (draft sans appel) -> on le réutilise et on remplace ses lignes.
  const { data: existingBudget, error: existBudgetErr } = await supabase
    .from('budgets')
    .select('id, status')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .eq('budget_type', 'current')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existBudgetErr) return { data: null, error: new Error(existBudgetErr.message) };

  let budget: { id: string };
  if (existingBudget) {
    // Le budget est-il verrouillé (des appels non annulés le référencent) ?
    const { count: callCount, error: callErr } = await supabase
      .from('call_for_funds')
      .select('id', { count: 'exact', head: true })
      .eq('budget_id', (existingBudget as { id: string }).id)
      .neq('status', 'cancelled');
    if (callErr) return { data: null, error: new Error(callErr.message) };
    budget = { id: (existingBudget as { id: string }).id };
    if ((callCount ?? 0) > 0) {
      // Verrouillé : on ne touche plus aux lignes -> retour idempotent.
      return { data: { budgetId: budget.id, unmappedCategories: [] }, error: null };
    }
    // Draft non verrouillé : on purge les anciennes lignes avant de réinsérer.
    const { error: delErr } = await supabase.from('budget_lines').delete().eq('budget_id', budget.id);
    if (delErr) return { data: null, error: new Error(delErr.message) };
  } else {
    const { data: created, error: budgetErr } = await supabase
      .from('budgets')
      .insert({
        copro_id: coproId,
        period_id: periodId,
        budget_type: 'current',
        name,
        status: 'draft',
        version: 1,
      })
      .select('id')
      .single();
    if (budgetErr) return { data: null, error: new Error(budgetErr.message) };
    budget = { id: (created as { id: string }).id };
  }
```

> Le reste de la fonction (résolution des comptes de charge, INSERT `budget_lines`, retour `unmappedCategories`) reste inchangé et utilise `budget.id`.

- [ ] **Step 4 — Type check**

```bash
cd Co-Pro-Flex && npx tsc --noEmit
```
Attendu : exit 0.

- [ ] **Step 5 — Rejouer le test SQL d'invariant**

`execute_sql` du bloc de Step 1. Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 6 — Commit**

```bash
cd Co-Pro-Flex && git add src/lib/onboarding/api.ts supabase/tests/20260603111000_budget_upsert_guard_test.sql && git commit -m "fix(onboarding): un seul budget current par periode, verrou si appels emis (I6)"
```

---

## Task 7 : Intégration wizard — post-as-you-go (Step6 poste les appels, Step7 = RepriseSoldes, Step8 lit la DB)

**Files:**
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\steps\Step6AgAppels.tsx` (poster les appels à la validation)
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\app\(gestionnaire)\onboarding\[id]\page.tsx` (brancher `RepriseSoldes` en Step7, alléger Step8)
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\steps\Step8Finalisation.tsx` (ne plus dépendre de la mémoire React)
- Delete: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\steps\Step7RepriseSoldes.tsx` + `.module.css` (remplacé par `RepriseSoldes`)

**Pourquoi :** post-as-you-go = chaque étape enregistre à la validation (spec §6) : Step6 poste les appels (route idempotente `postOnboardingCalls`), Step7 enregistre la reprise via `RepriseSoldes` (`setOnboardingOpeningBalance`). Step8 ne re-poste plus rien depuis la mémoire React : il **lit l'état réel** via `auditOnboardingBooks` (verrou Plan C, liste blanche). Cela rend le verrou non contournable et débloque la reprise (471/472 non bloquant).

- [ ] **Step 1 — Step6 : poster les appels à la validation**

Dans `Step6AgAppels.tsx`, ajouter l'import du poster et un état d'erreur de postage, puis remplacer `handleConfirm` (l.113-126). Remplacer l'import (l.6) :

```tsx
import { createClient } from '@/lib/supabase/client';
```

par :

```tsx
import { createClient } from '@/lib/supabase/client';
import { postOnboardingCalls } from '@/lib/onboarding/api';
```

Ajouter un état après `const [error, setError] = useState<string | null>(null);` (l.40) :

```tsx
  const [isPosting, setIsPosting] = useState(false);
```

Remplacer `handleConfirm` (l.113-126) :

```tsx
  // Capture seule : on remonte le plan, le postage se fait à la finalisation.
  const handleConfirm = useCallback(() => {
    if (!budgetId) { onComplete(null); return; }
    const plan: OnboardingCallPlan = {
      schedule,
      alreadyDone,
      installments: callPreviews.map(p => ({
        index: p.trimester,
        label: p.label,
        issueDate: p.issueDate,
        dueDate: p.dueDate,
      })),
    };
    onComplete(plan);
  }, [budgetId, schedule, alreadyDone, callPreviews, onComplete]);
```

par :

```tsx
  // Post-as-you-go : on POSTE les appels ici (route idempotente), puis on remonte le plan.
  const handleConfirm = useCallback(async () => {
    if (!budgetId) { onComplete(null); return; }
    const plan: OnboardingCallPlan = {
      schedule,
      alreadyDone,
      installments: callPreviews.map(p => ({
        index: p.trimester,
        label: p.label,
        issueDate: p.issueDate,
        dueDate: p.dueDate,
      })),
    };
    if (plan.installments.length > 0) {
      setIsPosting(true);
      setError(null);
      const r = await postOnboardingCalls(coproId, periodId, budgetId, plan);
      setIsPosting(false);
      if (r.error) { setError(r.error.message); return; }
    }
    onComplete(plan);
  }, [budgetId, coproId, periodId, schedule, alreadyDone, callPreviews, onComplete]);
```

Dans le footer (l.271-275), refléter l'état de postage :

```tsx
        {budgetId && phase === 'preview' && (
          <button className={styles.btnNext} onClick={handleConfirm}>
            Valider ces {callPreviews.length} appel{callPreviews.length > 1 ? 's' : ''}
          </button>
        )}
```

par :

```tsx
        {budgetId && phase === 'preview' && (
          <button className={styles.btnNext} onClick={handleConfirm} disabled={isPosting}>
            {isPosting
              ? 'Émission…'
              : `Valider ces ${callPreviews.length} appel${callPreviews.length > 1 ? 's' : ''}`}
          </button>
        )}
```

- [ ] **Step 2 — Step8 : lire la DB, ne plus poster depuis la mémoire**

Remplacer intégralement `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\steps\Step8Finalisation.tsx` :

```tsx
'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { auditOnboardingBooks, type OnboardingAuditIssue } from '@/lib/onboarding/api';
import styles from './Step8Finalisation.module.css';

interface Step8Props {
  coproId: string;
  onFinalized: () => void;
  onBack: () => void;
  /** Rouvre l'étape 7 (reprise) pour compléter le résidu 471/472. */
  onEditReprise: () => void;
}

export function Step8Finalisation({ coproId, onFinalized, onBack, onEditReprise }: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);

  // Post-as-you-go : les appels (Step6) et la reprise (Step7) sont DÉJÀ en base.
  // Step8 ne fait que LIRE l'état réel : audit = liste blanche (Plan C), 471/472 séparé.
  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setIssues(null);

    const audit = await auditOnboardingBooks(coproId);
    setIsRunning(false);
    if (audit.error) { setError(audit.error.message); return; }

    setIssues(audit.data!.issues);
    setWaitingBalance(audit.data!.waitingBalance);

    // clean = aucune issue BLOQUANTE (liste blanche). Le résidu 471/472 n'est PAS bloquant.
    if (audit.data!.clean) {
      onFinalized();
    }
  }, [coproId, onFinalized]);

  const hasResidual = waitingBalance !== null && Math.abs(waitingBalance) >= 0.01;

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On vérifie que le grand livre est cohérent. Une reprise incomplète (compte d'attente ≠ 0) n'empêche pas de terminer : vous pourrez la compléter depuis le tableau de bord."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {issues && issues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{issues.length} écart(s) bloquant(s) — corrigez avant de terminer :</strong>
          <ul>
            {issues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {hasResidual && (
        <div className={styles.warningMsg}>
          Compte d&apos;attente (471/472) non soldé :{' '}
          {waitingBalance!.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.
          Ce n&apos;est pas bloquant — vous pourrez compléter la reprise plus tard.
          <button className={styles.linkBtn} onClick={onEditReprise}>Compléter maintenant</button>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack} disabled={isRunning}>Retour</button>
        <button className={styles.btnFinish} onClick={handleFinalize} disabled={isRunning}>
          {isRunning ? 'Vérification…' : 'Vérifier et terminer'}
        </button>
      </div>
    </div>
  );
}
```

Ajouter les 2 classes CSS manquantes dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\steps\Step8Finalisation.module.css` (créer le fichier s'il n'existe pas ; sinon ajouter à la fin) :

> ℹ️ Avant : Step8 importait `./Step7RepriseSoldes.module.css`. Comme on supprime Step7, Step8 a besoin de son propre module. Créer `Step8Finalisation.module.css` avec les styles repris de l'ancien Step7 (`container`, `errorMsg`, `footer`, `btnBack`, `btnFinish`) + les nouveaux `warningMsg`, `linkBtn` :

```css
.container { max-width: 720px; margin: 0 auto; }

.errorMsg {
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  font-size: 12px;
  margin-bottom: 16px;
}

.warningMsg {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.linkBtn {
  display: inline-block;
  margin-left: 8px;
  background: none;
  border: none;
  color: #60a5fa;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  text-decoration: underline;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.btnBack {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--border-light);
  color: var(--text-secondary);
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.btnBack:hover { color: var(--text-main); }

.btnFinish {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: #22c55e;
  color: white;
  font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.btnFinish:hover { background: #16a34a; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
.btnFinish:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
```

- [ ] **Step 3 — Wizard page.tsx : brancher `RepriseSoldes` en Step7 + alléger Step8**

Dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\app\(gestionnaire)\onboarding\[id]\page.tsx`, remplacer l'import Step7 (l.16) :

```tsx
import { Step7RepriseSoldes } from '@/components/features/onboarding/steps/Step7RepriseSoldes';
```

par :

```tsx
import { RepriseSoldes } from '@/components/features/onboarding/reprise/RepriseSoldes';
```

Supprimer l'import `SoldeOpeningEntry` devenu inutile (l.8) et l'état `openingEntries` (l.39) — le post-as-you-go rend la mémoire inutile :

```tsx
import type { OnboardingCallPlan, SoldeOpeningEntry } from '@/lib/onboarding/api';
```

devient :

```tsx
import type { OnboardingCallPlan } from '@/lib/onboarding/api';
```

et supprimer la ligne :

```tsx
  const [openingEntries, setOpeningEntries] = useState<SoldeOpeningEntry[]>([]);
```

Remplacer le bloc Step7 (l.166-175) :

```tsx
        {periodId && maxStepReached >= 7 && (
          <div style={{ display: currentStep === 7 ? undefined : 'none' }}>
            <Step7RepriseSoldes
              coproId={coproId}
              periodId={periodId}
              onComplete={(entries) => { setOpeningEntries(entries); completeStep(7); }}
              onBack={() => goToStep(6)}
            />
          </div>
        )}
```

par :

```tsx
        {periodId && maxStepReached >= 7 && (
          <div style={{ display: currentStep === 7 ? undefined : 'none' }}>
            <RepriseSoldes
              coproId={coproId}
              periodId={periodId}
              onSaved={() => completeStep(7)}
              onSkip={() => completeStep(7)}
              onBack={() => goToStep(6)}
              saveLabel="Enregistrer et continuer"
            />
          </div>
        )}
```

Remplacer le bloc Step8 (l.176-188) :

```tsx
        {periodId && maxStepReached >= 8 && (
          <div style={{ display: currentStep === 8 ? undefined : 'none' }}>
            <Step8Finalisation
              coproId={coproId}
              periodId={periodId}
              budgetId={budgetId}
              callPlan={callPlan}
              openingEntries={openingEntries}
              onFinalized={handleFinalize}
              onBack={() => goToStep(7)}
            />
          </div>
        )}
```

par :

```tsx
        {periodId && maxStepReached >= 8 && (
          <div style={{ display: currentStep === 8 ? undefined : 'none' }}>
            <Step8Finalisation
              coproId={coproId}
              onFinalized={handleFinalize}
              onBack={() => goToStep(7)}
              onEditReprise={() => goToStep(7)}
            />
          </div>
        )}
```

> `callPlan`/`setCallPlan` restent utilisés par Step6 (`onComplete={(plan) => { setCallPlan(plan); completeStep(6); }}`) ; ne pas les supprimer. `budgetId`/`periodId` restent nécessaires à Step5/6.

- [ ] **Step 4 — Supprimer l'ancien Step7 (finir la migration, pas de doublon)**

```bash
cd Co-Pro-Flex && git rm src/components/features/onboarding/steps/Step7RepriseSoldes.tsx src/components/features/onboarding/steps/Step7RepriseSoldes.module.css
```

> ⚠️ Vérifier d'abord qu'aucun autre fichier n'importe `Step7RepriseSoldes` ni `./Step7RepriseSoldes.module.css` : `rg "Step7RepriseSoldes" Co-Pro-Flex/src`. Attendu après les edits : 0 résultat. Le seul consommateur du `.module.css` était l'ancien Step8 (corrigé en Step 2).

- [ ] **Step 5 — Type check + build**

```bash
cd Co-Pro-Flex && npx tsc --noEmit && npm run build
```
Attendu : exit 0 pour les deux. (Le build doit confirmer qu'il ne reste aucune référence aux props supprimées de Step8 ni à `SoldeOpeningEntry` dans la page.)

- [ ] **Step 6 — Commit**

```bash
cd Co-Pro-Flex && git add -A src/components/features/onboarding src/app/\(gestionnaire\)/onboarding && git commit -m "feat(onboarding): post-as-you-go wizard (Step6 poste, Step7 RepriseSoldes, Step8 lit la DB)"
```

---

## Task 8 : Alerte tableau de bord — carte « Reprise à terminer » (point d'entrée autonome)

**Files:**
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\lib\onboarding\reprise-alert.ts` (lecture du net 471/472 par copro)
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.tsx`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.module.css`
- Create: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertModal.tsx`
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\app\(gestionnaire)\portefeuille\page.tsx` (afficher la carte + ouvrir le modal)
- Create (test): `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.test.tsx`

**Pourquoi :** spec §7 — carte fixe « Reprise à terminer : X € à imputer » tant que le net 471/472 ≠ 0, cliquable → rouvre `RepriseSoldes` (modal). Source = net 471/472. Sur Portefeuille, on calcule par copro et on affiche une carte par copro concernée.

- [ ] **Step 1 — Écrire le test (échoue : composant absent)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.test.tsx` :

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RepriseAlertCard } from '@/features/onboarding/reprise/RepriseAlertCard';

describe('RepriseAlertCard', () => {
  it('affiche le montant à imputer et le nom de la copro', () => {
    render(<RepriseAlertCard coproName="Le Clos" residual={423.5} onOpen={() => {}} />);
    expect(screen.getByText(/Reprise à terminer/i)).toBeInTheDocument();
    expect(screen.getByText(/Le Clos/)).toBeInTheDocument();
  });

  it('appelle onOpen au clic', () => {
    const onOpen = vi.fn();
    render(<RepriseAlertCard coproName="Le Clos" residual={423.5} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 — Lancer le test, vérifier qu'il échoue**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/RepriseAlertCard.test.tsx
```
Attendu : échec import manquant.

- [ ] **Step 3 — Écrire le lecteur de résidu (API)**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\lib\onboarding\reprise-alert.ts` :

```ts
import { createClient } from '@/lib/supabase/client';

const untyped = () => createClient() as unknown as {
  from: (t: string) => {
    select: (q: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, v: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

export interface RepriseAlert {
  coproId: string;
  residual: number; // net 471/472 (signé)
}

/**
 * Net 471/472 d'une copro (débit - crédit). |net| >= 0,01 => reprise incomplète.
 * Source de vérité = grand livre (pas de table brouillon).
 */
export async function getRepriseResidual(coproId: string): Promise<{ data: number | null; error: Error | null }> {
  const supabase = untyped();
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id)')
    .eq('accounts.copro_id', coproId)
    .in('accounts.code', ['471', '472']);
  if (error) return { data: null, error: new Error(error.message) };

  let net = 0;
  for (const row of (data ?? []) as Array<{ amount: number; direction: string }>) {
    net += row.direction === 'debit' ? Number(row.amount) : -Number(row.amount);
  }
  return { data: net, error: null };
}
```

- [ ] **Step 4 — Écrire la carte + le CSS + le modal**

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.tsx` :

```tsx
'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './RepriseAlertCard.module.css';

interface RepriseAlertCardProps {
  coproName: string;
  residual: number;
  onOpen: () => void;
}

export function RepriseAlertCard({ coproName, residual, onOpen }: RepriseAlertCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <AlertTriangle size={18} className={styles.icon} />
      <div className={styles.body}>
        <span className={styles.title}>Reprise à terminer — {coproName}</span>
        <span className={styles.detail}>
          {Math.abs(residual).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à imputer (471/472)
        </span>
      </div>
      <ChevronRight size={18} className={styles.chevron} />
    </button>
  );
}
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertCard.module.css` :

```css
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  margin-bottom: 12px;
}
.card:hover { background: rgba(245, 158, 11, 0.16); transform: translateY(-1px); }

.icon { flex-shrink: 0; }
.body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.title { font-size: 13px; font-weight: 700; }
.detail {
  font-size: 12px;
  opacity: 0.9;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}
.chevron { flex-shrink: 0; opacity: 0.7; }
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertModal.tsx` :

```tsx
'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ensureAccountingPeriod } from '@/lib/onboarding/api';
import { RepriseSoldes } from './RepriseSoldes';
import styles from './RepriseAlertModal.module.css';

interface RepriseAlertModalProps {
  coproId: string;
  onClose: () => void;
}

export function RepriseAlertModal({ coproId, onClose }: RepriseAlertModalProps) {
  const [periodId, setPeriodId] = useState<string | null>(null);

  useEffect(() => {
    // Reprise autonome : on cible la période d'ouverture courante de la copro.
    const year = new Date().getFullYear();
    ensureAccountingPeriod(coproId, year).then(res => {
      if (res.data) setPeriodId(res.data.id);
    });
  }, [coproId]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        {periodId ? (
          <RepriseSoldes
            coproId={coproId}
            periodId={periodId}
            onSaved={() => onClose()}
            saveLabel="Enregistrer"
          />
        ) : (
          <div className={styles.loading}>Chargement…</div>
        )}
      </div>
    </div>
  );
}
```

Create `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\components\features\onboarding\reprise\RepriseAlertModal.module.css` :

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  z-index: 1000;
  overflow-y: auto;
}
.modal {
  position: relative;
  background: var(--surface, #1a1d2e);
  border-radius: 12px;
  max-width: 820px;
  width: 100%;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}
.close {
  position: absolute;
  top: 16px; right: 16px;
  background: none; border: none;
  color: var(--text-secondary);
  cursor: pointer;
}
.close:hover { color: var(--text-main); }
.loading { text-align: center; padding: 48px; color: var(--text-tertiary); }
```

- [ ] **Step 5 — Brancher l'alerte sur Portefeuille**

Dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\app\(gestionnaire)\portefeuille\page.tsx`, ajouter un sous-bloc d'alertes. Remplacer les imports (l.1-10) :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleSummary } from '@/components/features/portefeuille/PortefeuilleSummary';
import { PortefeuilleList } from '@/components/features/portefeuille/PortefeuilleList';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';
```

par :

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleSummary } from '@/components/features/portefeuille/PortefeuilleSummary';
import { PortefeuilleList } from '@/components/features/portefeuille/PortefeuilleList';
import { RepriseAlertCard } from '@/components/features/onboarding/reprise/RepriseAlertCard';
import { RepriseAlertModal } from '@/components/features/onboarding/reprise/RepriseAlertModal';
import { getRepriseResidual, type RepriseAlert } from '@/lib/onboarding/reprise-alert';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';
```

Dans le composant, après `const totalLots = …` (l.16), ajouter le calcul des alertes :

```tsx
  const [alerts, setAlerts] = useState<Array<RepriseAlert & { name: string }>>([]);
  const [openCoproId, setOpenCoproId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAlerts() {
      const results = await Promise.all(
        coproprietes.map(async c => {
          const { data } = await getRepriseResidual(c.id as string);
          return { coproId: c.id as string, name: c.nom, residual: data ?? 0 };
        })
      );
      if (!cancelled) setAlerts(results.filter(a => Math.abs(a.residual) >= 0.01));
    }
    if (coproprietes.length > 0) loadAlerts();
    return () => { cancelled = true; };
  }, [coproprietes]);
```

Dans le JSX, après `<PortefeuilleSummary … />` (l.44), insérer le bloc d'alertes + le modal :

```tsx
      {/* Alertes reprise à terminer (net 471/472 != 0) */}
      {alerts.length > 0 && (
        <div className={styles.repriseAlerts}>
          {alerts.map(a => (
            <RepriseAlertCard
              key={a.coproId}
              coproName={a.name}
              residual={a.residual}
              onOpen={() => setOpenCoproId(a.coproId)}
            />
          ))}
        </div>
      )}

      {openCoproId && (
        <RepriseAlertModal coproId={openCoproId} onClose={() => setOpenCoproId(null)} />
      )}
```

Ajouter la classe dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\src\app\(gestionnaire)\portefeuille\portefeuille.module.css` (à la fin) :

```css
.repriseAlerts {
  display: flex;
  flex-direction: column;
  margin: 16px 0;
}
```

- [ ] **Step 6 — Lancer le test + type check + build**

```bash
cd Co-Pro-Flex && npx vitest run src/components/features/onboarding/reprise/RepriseAlertCard.test.tsx && npx tsc --noEmit && npm run build
```
Attendu : tests verts, `tsc` exit 0, build exit 0.

- [ ] **Step 7 — Commit**

```bash
cd Co-Pro-Flex && git add src/lib/onboarding/reprise-alert.ts src/components/features/onboarding/reprise/RepriseAlertCard.tsx src/components/features/onboarding/reprise/RepriseAlertCard.module.css src/components/features/onboarding/reprise/RepriseAlertModal.tsx src/components/features/onboarding/reprise/RepriseAlertModal.module.css src/components/features/onboarding/reprise/RepriseAlertCard.test.tsx src/app/\(gestionnaire\)/portefeuille && git commit -m "feat(onboarding): alerte persistante 'Reprise a terminer' sur le portefeuille"
```

---

## Task 9 : E2E — MAJ `onboarding-clean-path` (post-as-you-go + reprise simple + alerte)

**Files:**
- Modify: `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\e2e\onboarding-clean-path.spec.ts`

**Pourquoi (I13) :** le skip de l'étape 7 n'a plus lieu d'être (la reprise est désormais non bloquante et la finalisation lit la DB). On met à jour : (a) l'en-tête de fichier ; (b) après Step6, assertions DB **CFF issued + budget validated** (post-as-you-go) ; (c) Step7 saisit une reprise **simple équilibrée** (banque = contrepartie d'un report 120, net 471/472 = 0 → la finalisation passe). On garde le chemin propre (audit=0). Un test d'alerte est couvert par les Tasks 2/8 (unitaire) ; l'E2E reste focalisé sur le chemin propre de bout en bout.

- [ ] **Step 1 — Réécrire l'en-tête + le bloc Step6→Step8**

Dans `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\e2e\onboarding-clean-path.spec.ts`, remplacer le commentaire d'en-tête (l.20-24) :

```ts
 * NOTE robustesse : Step 7 (reprise de soldes) est volontairement SKIPPÉ ("Passer").
 * Saisir un solde d'un seul côté pose la contrepartie sur le compte d'attente 472,
 * qui resterait non soldé -> l'audit de finalisation BLOQUE (waitingBalance != 0)
 * et la redirection /portefeuille n'aurait jamais lieu. Skip = chemin propre garanti.
 */
```

par :

```ts
 * NOTE : post-as-you-go. Les appels sont POSTÉS à la validation de Step 6 (route
 * idempotente postOnboardingCalls) ; la reprise est ENREGISTRÉE à la validation de
 * Step 7 (setOnboardingOpeningBalance, non bloquante). Step 8 ne re-poste rien : il
 * LIT l'état réel (auditOnboardingBooks = liste blanche, 471/472 non bloquant).
 * Ici on saisit une reprise ÉQUILIBRÉE (un report 120 contrebalancé par un solde
 * banque) -> net 471/472 = 0 -> audit propre -> redirection /portefeuille.
 */
```

Remplacer le bloc Step6 (l.204-219, de `// ── 7) Step 6` jusqu'à la fin du skip Step7 inclus) :

```ts
    // ── 7) Step 6 : fréquence Annuel, 0 déjà émis, date AG, valider 1 appel ────
    const s6 = stepBlock(page, 'Appels de fonds');
    // Fréquence "Annuel (1)".
    await s6.getByRole('button', { name: /^Annuel/ }).click();
    // "Aucun" appel déjà émis.
    await s6.getByRole('button', { name: 'Aucun' }).click();
    // Date de l'AG (input type=date).
    await s6.locator('input[type="date"]').fill('2026-01-15');
    // "Voir les appels (1)".
    await s6.getByRole('button', { name: /^Voir les appels/ }).click();
    // "Valider ces 1 appel".
    await s6.getByRole('button', { name: /^Valider ces/ }).click();

    // ── 8) Step 7 : reprise des soldes -> "Passer" (chemin propre, cf. en-tête) ─
    const s7 = stepBlock(page, 'Reprise de soldes');
    await s7.getByRole('button', { name: 'Passer' }).click();
```

par :

```ts
    // ── 7) Step 6 : fréquence Annuel, 0 déjà émis, date AG, valider 1 appel ────
    const s6 = stepBlock(page, 'Appels de fonds');
    await s6.getByRole('button', { name: /^Annuel/ }).click();
    await s6.getByRole('button', { name: 'Aucun' }).click();
    await s6.locator('input[type="date"]').fill('2026-01-15');
    await s6.getByRole('button', { name: /^Voir les appels/ }).click();
    // Post-as-you-go : ce clic POSTE l'appel (idempotent) AVANT d'avancer.
    await s6.getByRole('button', { name: /^Valider ces/ }).click();

    // 7bis) Assertions DB immédiates (I13) : l'appel est issued ET le budget validé.
    {
      const { data: calls, error: callErr } = await admin
        .from('call_for_funds')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('status', 'issued');
      expect(callErr).toBeNull();
      expect((calls ?? []).length).toBeGreaterThanOrEqual(1);

      const { data: budgets, error: budErr } = await admin
        .from('budgets')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('budget_type', 'current');
      expect(budErr).toBeNull();
      expect((budgets ?? []).some(b => b.status === 'validated')).toBe(true);
    }

    // ── 8) Step 7 : reprise ÉQUILIBRÉE (report 120 = solde banque) -> 471/472 = 0 ─
    const s7 = stepBlock(page, 'Reprise de soldes');
    // "Report à nouveau — courant" (120) et le 1er compte bancaire reçoivent le MÊME
    // montant : le débit (banque, actif) équilibre le crédit (report 120) -> net 0.
    // Les champs sont des <input type=number> ; on cible par leur libellé proche.
    const reportField = s7.locator('input[type="number"]').first(); // 1er champ banque
    await reportField.fill('1000');
    // Champ "Report à nouveau — courant" : on le repère via le label "120".
    const report120 = s7
      .locator('div')
      .filter({ hasText: /Report à nouveau — courant/ })
      .locator('input[type="number"]')
      .last();
    await report120.fill('1000');
    // Enregistrer (non bloquant). Le bouton wizard est "Enregistrer et continuer".
    await s7.getByRole('button', { name: /Enregistrer et continuer/ }).click();
```

> Le report 120 est un passif (crédit, signé négatif dans `buildOpeningLines`) et la banque un actif (débit positif) : 1000 / −1000 → Σ = 0 → résidu 471/472 = 0. La finalisation passe.

- [ ] **Step 2 — Mettre à jour le bouton de finalisation Step8**

Remplacer (dans le bloc Step 8, anciennement l.221-223) :

```ts
    // ── 9) Step 8 : finalisation ──────────────────────────────────────────────
    const s8 = stepBlock(page, 'Finalisation');
    await s8.getByRole('button', { name: 'Enregistrer et vérifier' }).click();
```

par :

```ts
    // ── 9) Step 8 : finalisation (lit la DB, ne re-poste rien) ─────────────────
    const s8 = stepBlock(page, 'Finalisation');
    await s8.getByRole('button', { name: 'Vérifier et terminer' }).click();
```

- [ ] **Step 3 — Lancer l'E2E**

```bash
cd Co-Pro-Flex && npx playwright test e2e/onboarding-clean-path.spec.ts
```
Attendu : 1 passed. (Le test redirige vers `/portefeuille`, `audit_finance_integrity` = 0 ligne, ≥ 1 CFF `issued`.)

> Si l'env Playwright (serveur dev + clés Supabase/Maps) n'est pas disponible, exécuter au moins `npx playwright test --list e2e/onboarding-clean-path.spec.ts` pour valider la compilation TS du spec, et noter dans le commit que l'exécution complète reste à jouer en CI.

- [ ] **Step 4 — Commit**

```bash
cd Co-Pro-Flex && git add e2e/onboarding-clean-path.spec.ts && git commit -m "test(e2e): onboarding-clean-path post-as-you-go + reprise equilibree (I13)"
```

---

## Task 10 : Acceptation de bout en bout (preuve manuelle MCP + non-régression)

**Files:**
- Aucun fichier de code. Vérifications via `execute_sql` + lancement app.

**Pourquoi :** prouver le comportement réel (au-delà du type-check), conformément aux bonnes pratiques : reprise déséquilibrée → 471/472 ≠ 0 → alerte → soldée → 0 → alerte disparaît ; non-régression boucle d'or.

- [ ] **Step 1 — Acceptation : reprise déséquilibrée puis soldée (via le moteur Plan B)**

`execute_sql` (projet `iyfesbjnkpynmwlsmxnp`) — simule ce que `setOnboardingOpeningBalance` appelle, et vérifie le résidu :

```sql
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid; v_res jsonb; v_net numeric;
BEGIN
  v := create_clean_test_copro_seeded('accept-d', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id=v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- 1) Reprise DÉSÉQUILIBRÉE : un solde 450-1/lot sans contrepartie -> résidu 471/472
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE,
    jsonb_build_array(jsonb_build_object('account_code','450-1','lot_id',v_lot,'amount',500,'nature','current')));
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_net
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_net) < 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : residu attendu != 0 (=%)', v_net; END IF;

  -- 2) Reprise SOLDÉE (remplacement) : 450-1 + report 120 en contrepartie -> net 0
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE,
    jsonb_build_array(
      jsonb_build_object('account_code','450-1','lot_id',v_lot,'amount',500,'nature','current'),
      jsonb_build_object('account_code','120','lot_id',NULL,'amount',-500)));
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_net
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_net) >= 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : residu non solde apres remplacement (=%)', v_net; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```
Attendu : `ROLLBACK_TEST_OK`.

> Si `set_opening_balance` n'existe pas encore → Plan B non exécuté ; STOP et finir Plan B.

- [ ] **Step 2 — Preuve UI réelle (navigateur)**

Lancer l'app (`cd Co-Pro-Flex && npm run dev`, en tâche de fond), se connecter, créer une copro via le wizard jusqu'à Step7, saisir un solde 450 d'un seul côté (déséquilibré), finaliser → vérifier que l'app **termine quand même** (non bloquant) et que la carte « Reprise à terminer » apparaît sur `/portefeuille`. Cliquer la carte → le modal `RepriseSoldes` s'ouvre pré-rempli ; compléter le report → enregistrer → la carte disparaît au rechargement. Capturer 2 screenshots (alerte présente / alerte absente) via le MCP Playwright (`mcp__playwright__browser_take_screenshot`).

- [ ] **Step 3 — Non-régression boucle d'or**

`execute_sql` :
```sql
SELECT count(*) AS ecarts FROM audit_finance_integrity(
  (SELECT id FROM copros WHERE name ILIKE '%Clos Saint-Michel%' LIMIT 1));
```
Attendu : le **même** nombre d'écarts qu'avant Plan D (cadre G3 connu) — aucune nouvelle anomalie introduite par les vues/écrans.

- [ ] **Step 4 — Build final**

```bash
cd Co-Pro-Flex && npx tsc --noEmit && npm run build
```
Attendu : exit 0 pour les deux.

---

## Self-Review (rempli)

**1. Couverture du périmètre Plan D :**
- (1) Composant réutilisable `RepriseSoldes` + sous-composants < 200 lignes : `EquilibreIndicator` (Task 2), `SoldesParLotTable` (Task 3, 450-1/2/5 + 103/lot), `BalanceEntreeForm` (Task 4, 512/502 par `account_id`, 105 global, 401 global, 110/120, « Autres comptes » repliable classes 1-5, bascule mid-year → 6/7), conteneur `RepriseSoldes` + hook (Task 5, charge `getOnboardingOpeningBalance`, enregistre `setOnboardingOpeningBalance` non bloquant). ✓
- (2) Intégration wizard post-as-you-go : Step6 poste les appels à la validation (Task 7 Step 1), Step7 = `RepriseSoldes` enregistre via `set` (Task 7 Step 3), Step8 ne dépend plus de la mémoire et lit la DB (Task 7 Step 2). ✓
- (3) Point d'entrée autonome + alerte dashboard : carte fixe « Reprise à terminer : X € » tant que net 471/472 ≠ 0, cliquable → modal `RepriseSoldes` (Task 8). ✓
- (4) I5 (filtre `onboarding_step IS NULL`, JOIN copros, suppression def morte) : Task 1. I6/I7 (verrou/upsert budget) : Task 6. ✓
- (5) E2E mis à jour (skip Step7 retiré, assertions DB post-Step6 = CFF issued + budget validated, Step7 saisit une reprise et la finalisation passe) : Task 9. ✓

**2. Placeholders :** aucun « TBD/TODO » dans le code livré ; chaque step qui change du code montre le code complet. Les `TODO` présents dans l'E2E existant sont laissés tels quels (hors périmètre, non introduits par ce plan).

**3. Conventions projet :** TS strict, aucun `any` introduit (le seul cast est un `unknown`-narrowing typé dans `reprise-alert.ts`, sans `any`) ; imports alias `@/` partout ; aucun style inline (tout en CSS Modules) ; fichiers < 200-300 lignes (le conteneur est scindé en hook `useRepriseSoldes.ts` + `RepriseSoldes.tsx` ; `BalanceEntreeForm` ~190 lignes avec note d'extraction si dépassement) ; nommage FR métier (`RepriseSoldes`, `BalanceEntreeForm`, `SoldesParLotTable`, `EquilibreIndicator`, `RepriseAlertCard`).

**4. Contrats inter-plans :** Plan D consomme `getOnboardingOpeningBalance` / `setOnboardingOpeningBalance` / `listComptesBancaires` (corrigé B5) / `listPlanAccounts` du **Plan B**, et le `clean`/`waitingBalance` (liste blanche) du **Plan C**. Si l'un manque au démarrage → STOP (documenté en tête). `listLots`, `ensureAccountingPeriod`, `postOnboardingCalls`, `auditOnboardingBooks`, `createOnboardingBudget` existent déjà (vérifiés dans `api.ts`).

**5. Exactitude DB vérifiée en base :** `v_unpaid_by_lot` vivante = shape `20260125` (`total_unpaid`), dépendants `v_dashboard_kpis` + `v_unpaid_with_reminders`, def morte dans `20260401` jamais appliquée (supprimée) ; `copros.onboarding_step/exercice_debut` présents ; chart provisionné confirme `512/502/105/401/110/120/103/450-1/2/5/471/472` ; Step4 crée les banques en `512000/512100` → résolution banque par `account_id` (B5) confirmée nécessaire ; `audit_finance_integrity` signature confirmée.

**6. Risque résiduel signalé :** le sélecteur E2E du champ « Report à nouveau — courant » (Task 9 Step 1) dépend du libellé rendu par `BalanceEntreeForm` — si l'implémentation modifie le texte, ajuster le `filter({ hasText })`. Si Vitest n'est pas configuré dans le repo, les tests unitaires des Tasks 2-5/8 se replient sur `tsc --noEmit` + preuve E2E/manuelle (noté dans chaque Task).

**Dépendances d'ordre :** Task 1 (DB, indépendante) en premier. Tasks 2→3→4→5 (composants, du plus simple au conteneur). Task 6 (budget) indépendante des composants. Task 7 (intégration wizard) après Task 5. Task 8 (alerte) après Task 5. Task 9 (E2E) après Tasks 6+7+8. Task 10 (acceptation) en dernier.