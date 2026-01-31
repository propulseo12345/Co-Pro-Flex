# Plan de Migration Supabase - 30 Janvier 2026

## Objectif

Migrer les derniers usages localStorage/mocks vers Supabase pour avoir une plateforme **utilisable en production** où les données persistent correctement.

---

## MICRO-PASSE 1 : Votes par Correspondance AG (P0)

**Problème** : Les votes par correspondance sont stockés en localStorage, perdus au refresh.

### Fichiers à modifier

1. `src/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/page.tsx`
2. `src/hooks/modules/useVotesCorrespondance.ts`

### Approche

```typescript
// AVANT (localStorage)
const saved = localStorage.getItem(`vote-correspondance-${agId}-${coproId}`);
localStorage.setItem(`vote-correspondance-${agId}-${coproId}`, JSON.stringify(voteCorrespondance));

// APRÈS (Supabase RPC existante)
import { createClient } from '@/lib/supabase/client';

// READ
const { data } = await supabase.rpc('get_correspondence_votes', {
  p_ag_id: agId,
  p_coproprietaire_id: coproId
});

// WRITE
const { data, error } = await supabase.rpc('register_correspondence_form_votes', {
  p_ag_id: agId,
  p_coproprietaire_id: coproId,
  p_votes: votes // JSONB array
});
```

### Critères DONE

```bash
# Aucun match pour cette clé localStorage
rg "vote-correspondance-" --type ts | grep -v ".md" | wc -l
# Résultat attendu: 0

# Build OK
npm run build

# Test E2E: créer vote correspondance, refresh, données présentes
```

### Effort : S (1-2h)

---

## MICRO-PASSE 2 : Rôles de Séance AG (P1)

**Problème** : Les rôles (président, secrétaire, scrutateur) sont en localStorage.

### Fichiers à modifier

1. `src/app/(dashboard)/ag/[id]/designation-roles/page.tsx`
2. `src/lib/services/pv-signature.service.ts` (lecture roles)

### Approche

Les rôles sont déjà dans `ag_session_drafts.draft_data.roles`. Utiliser le RPC existant.

```typescript
// AVANT
const savedRoles = localStorage.getItem(`roles-ag-${agId}`);
localStorage.setItem(`roles-ag-${agId}`, JSON.stringify(roles));

// APRÈS
// Utiliser useAgWizardState qui gère déjà ag_session_drafts
const { updateDraft } = useAgWizardState(agId);
await updateDraft({ roles });

// Lecture
const { data } = await supabase.rpc('get_ag_session_draft', { p_ag_id: agId });
const roles = data?.draft_data?.roles;
```

### Critères DONE

```bash
rg "roles-ag-" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : S (1-2h)

---

## MICRO-PASSE 3 : Feuille de Présence (P1)

**Problème** : Doublonne avec `ag_attendance`, stocke en localStorage.

### Fichiers à modifier

1. `src/app/(dashboard)/ag/[id]/feuille-presence/page.tsx`

### Approche

Cette page doit utiliser `useAgDetail.attendance` qui lit `ag_attendance`.

```typescript
// AVANT
const saved = localStorage.getItem(`feuille-presence-${agId}`);

// APRÈS
const { attendance, refreshAttendance } = useAgDetail(agId);
// Utiliser attendance directement, pas de localStorage
```

### Critères DONE

```bash
rg "feuille-presence-" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : S (1h)

---

## MICRO-PASSE 4 : Pouvoirs/Mandats AG (P1)

**Problème** : Les mandats sont en localStorage, doivent être dans `ag_attendance.proxy_id`.

### Fichiers à modifier

1. `src/hooks/modules/usePouvoirs.ts`

### Approche

```typescript
// AVANT
localStorage.setItem(getStorageKey(agId), JSON.stringify(pouvoirs));

// APRÈS
// Un pouvoir = ag_attendance.attendance_type = 'proxy'
// avec proxy_id = ID du copropriétaire qui donne pouvoir
await supabase.from('ag_attendance').update({
  proxy_id: mandataire.id,
  attendance_type: 'proxy'
}).eq('ag_id', agId).eq('coproprietaire_id', mandant.id);
```

### Critères DONE

```bash
rg "pouvoirs-" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : M (2-3h) - logique à aligner avec attendance

---

## MICRO-PASSE 5 : Session AG - Éliminer Fallback localStorage (P1)

**Problème** : `ag-session-persistence.service` a un fallback localStorage encore actif.

### Fichiers à modifier

1. `src/lib/services/ag-session-persistence.service.ts`
2. `src/features/ag/hooks/useAgSessionPage.ts`
3. `src/lib/ag/draft-persistence.ts`

### Approche

Le service utilise déjà Supabase en primary. Retirer le fallback localStorage progressivement :

1. Logger les cas où fallback est utilisé
2. S'assurer que RPC fonctionne dans tous les cas
3. Supprimer les méthodes localStorage

### Critères DONE

```bash
# Le service ne doit plus avoir de localStorage.setItem/getItem actifs
rg "localStorage\." src/lib/services/ag-session-persistence.service.ts | wc -l
# Résultat: 0 (ou commentés)
```

### Effort : M (3-4h)

---

## MICRO-PASSE 6 : Service Mail (P1)

**Problème** : Le service mail utilise `MOCK_MAILS` et localStorage.

### Fichiers à modifier

1. `src/lib/services/mail.service.ts`
2. `src/hooks/modules/useMailData.ts` (à créer/vérifier)

### Approche

Utiliser les tables existantes de la migration `20260126_niveau6b_mail_module.sql` :
- `mail_campaigns`
- `mail_templates`
- `mail_recipients`

### Critères DONE

```bash
rg "MOCK_MAILS|mail-storage" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : L (4-6h) - Service complet à migrer

---

## MICRO-PASSE 7 : Mouvements Bancaires (P2)

**Problème** : `MOCK_COMPTE_COURANT`, `MOCK_COMPTE_TRAVAUX` utilisés en fallback.

### Fichiers à modifier

1. `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`
2. `src/features/finance/mouvements-bancaires/domain/constants.ts`

### Approche

```typescript
// AVANT
const compteActuel = compteActif === 'courant' ? MOCK_COMPTE_COURANT : MOCK_COMPTE_TRAVAUX;

// APRÈS
const { data: comptes } = await supabase.from('bank_accounts')
  .select('*')
  .eq('copro_id', coproId);
const compteActuel = comptes?.find(c => c.account_type === compteActif);
```

### Critères DONE

```bash
rg "MOCK_COMPTE" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : M (2-3h)

---

## MICRO-PASSE 8 : Mock Copropriétaires dans AG (P2)

**Problème** : Plusieurs pages AG utilisent `MOCK_COPROPRIETAIRES`.

### Fichiers à modifier

1. `src/features/ag/pv/hooks/usePVPage.ts`
2. `src/features/ag/pv/domain/utils.ts`
3. `src/features/ag/hooks/useAgEnvoiPage.ts`
4. `src/features/ag/components/session/SessionVotingContent.tsx`
5. `src/lib/services/pv-signature.service.ts`

### Approche

Utiliser `useCoproData.useCoproprietaires()` ou `useEligibleVoters()` selon le contexte.

```typescript
// AVANT
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
const copro = MOCK_COPROPRIETAIRES.find(c => c.id === id);

// APRÈS
const { data: coproprietaires } = useCoproprietaires();
const copro = coproprietaires?.find(c => c.id === id);
```

### Critères DONE

```bash
rg "MOCK_COPROPRIETAIRES" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : M (3-4h)

---

## MICRO-PASSE 9 : Documents Services Mock (P2)

**Problème** : Services documents avec données mock inline.

### Fichiers à modifier

1. `src/lib/services/document-metadata.service.ts`
2. `src/lib/services/document-versioning.service.ts`
3. `src/lib/services/document-linking.service.ts`

### Approche

Ces services doivent utiliser les tables existantes :
- `documents.metadata` (JSONB)
- `document_versions`
- `document_entity_links`

### Critères DONE

```bash
rg "MOCK_DOCUMENT" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : M (3-4h)

---

## MICRO-PASSE 10 : Bibliothèque Résolutions Custom (P2)

**Problème** : Résolutions custom en localStorage.

### Fichiers à modifier

1. `src/features/ag/hooks/useAgResolutionsPage.ts`

### Approche

Créer une table `resolution_templates` ou utiliser un stockage JSONB dans `user_preferences`.

```sql
-- Option: Table dédiée
CREATE TABLE IF NOT EXISTS resolution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID REFERENCES coproprietes(id),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  resolution_type TEXT,
  majority_type TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Critères DONE

```bash
rg "custom-resolutions-library" --type ts | grep -v ".md" | wc -l
# Résultat: 0
```

### Effort : M (3-4h) - Inclut migration SQL

---

## ORDRE RECOMMANDÉ

| # | Micro-passe | Module | Priorité | Effort | Dépendances |
|---|-------------|--------|----------|--------|-------------|
| 1 | Votes Correspondance | AG | P0 | S | RPC existe |
| 2 | Rôles de Séance | AG | P1 | S | ag_session_drafts |
| 3 | Feuille de Présence | AG | P1 | S | useAgDetail |
| 4 | Pouvoirs/Mandats | AG | P1 | M | ag_attendance |
| 5 | Session fallback | AG | P1 | M | Micro-passes 1-4 |
| 6 | Service Mail | Comm | P1 | L | mail_campaigns |
| 7 | Mouvements Bancaires | Finance | P2 | M | bank_accounts |
| 8 | Mock Copropriétaires | AG | P2 | M | useCoproprietaires |
| 9 | Documents Services | GED | P2 | M | Tables existantes |
| 10 | Bibliothèque Résolutions | AG | P2 | M | Migration SQL |

---

## TESTS E2E MINIMAUX

### AG Workflow

```typescript
// e2e/ag-supabase-migration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AG Supabase Migration', () => {
  test('votes par correspondance persistent', async ({ page }) => {
    // 1. Naviguer vers votes correspondance
    await page.goto('/ag/[test-ag-id]/votes-correspondance/[test-copro-id]');

    // 2. Voter sur une résolution
    await page.click('[data-vote="pour"]');
    await page.click('[data-submit]');

    // 3. Rafraîchir
    await page.reload();

    // 4. Vérifier que le vote est toujours là
    await expect(page.locator('[data-vote="pour"]')).toHaveClass(/selected/);
  });

  test('rôles séance persistent', async ({ page }) => {
    await page.goto('/ag/[test-ag-id]/designation-roles');

    // Sélectionner président
    await page.selectOption('[data-role="president"]', 'copro-1');
    await page.click('[data-save]');

    await page.reload();

    await expect(page.locator('[data-role="president"]')).toHaveValue('copro-1');
  });

  test('brouillon AG repris après refresh', async ({ page }) => {
    // 1. Créer brouillon
    await page.goto('/ag/new');
    await page.fill('[name="title"]', 'AG Test E2E');
    await page.click('[data-next]');

    // 2. Aller à étape 2
    await page.waitForURL(/\/ag\/.*\/agenda/);

    // 3. Fermer et rouvrir
    await page.close();
    // Nouvelle page
    const newPage = await browser.newPage();
    await newPage.goto('/ag/dashboard');

    // 4. Vérifier brouillon présent
    await expect(newPage.locator('text=AG Test E2E')).toBeVisible();
  });
});
```

### Finance

```typescript
test('paiement enregistré persist', async ({ page }) => {
  await page.goto('/finance/appels-fonds');

  // Enregistrer paiement
  await page.click('[data-appel="xxx"] [data-action="paiement"]');
  await page.fill('[name="montant"]', '150');
  await page.click('[data-submit]');

  await page.reload();

  // Vérifier montant payé mis à jour
  await expect(page.locator('[data-appel="xxx"] [data-paid]')).toContainText('150');
});
```

### Communication

```typescript
test('post mur persist avec likes', async ({ page }) => {
  await page.goto('/communication/mur');

  // Créer post
  await page.click('[data-new-post]');
  await page.fill('[name="title"]', 'Test Post');
  await page.fill('[name="content"]', 'Contenu test');
  await page.click('[data-submit]');

  // Like
  await page.click('[data-post="xxx"] [data-like]');

  await page.reload();

  await expect(page.locator('[data-post="xxx"]')).toBeVisible();
  await expect(page.locator('[data-post="xxx"] [data-likes]')).toContainText('1');
});
```

---

## SCRIPT AUDIT CI

```typescript
// scripts/audit-storage.ts
import { execSync } from 'child_process';

interface AuditResult {
  module: string;
  localStorageCount: number;
  mockCount: number;
  files: string[];
}

function countMatches(pattern: string, path: string): { count: number; files: string[] } {
  try {
    const result = execSync(
      `rg "${pattern}" ${path} --type ts -c 2>/dev/null || true`,
      { encoding: 'utf-8' }
    );
    const lines = result.trim().split('\n').filter(Boolean);
    const count = lines.reduce((sum, line) => {
      const match = line.match(/:(\d+)$/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
    return { count, files: lines.map(l => l.split(':')[0]) };
  } catch {
    return { count: 0, files: [] };
  }
}

const modules = [
  { name: 'Finance', paths: ['src/features/finance', 'src/hooks/modules/*finance*', 'src/components/features/finance'] },
  { name: 'AG', paths: ['src/features/ag', 'src/app/(dashboard)/ag', 'src/hooks/modules/*ag*', 'src/hooks/modules/*AG*'] },
  { name: 'Documents', paths: ['src/components/features/documents', 'src/lib/services/document*'] },
  { name: 'Communication', paths: ['src/app/(dashboard)/communication', 'src/lib/services/mail*'] },
];

console.log('=== AUDIT STORAGE USAGE ===\n');

let totalLS = 0;
let totalMock = 0;

for (const mod of modules) {
  const pathArg = mod.paths.join(' ');
  const ls = countMatches('localStorage\\.(getItem|setItem)', pathArg);
  const mock = countMatches('MOCK_', pathArg);

  console.log(`📁 ${mod.name}`);
  console.log(`   localStorage: ${ls.count}`);
  console.log(`   MOCK_: ${mock.count}`);

  totalLS += ls.count;
  totalMock += mock.count;
}

console.log('\n=== TOTAUX ===');
console.log(`localStorage: ${totalLS}`);
console.log(`MOCK_: ${totalMock}`);

// Exit code non-zero si trop d'usages
const threshold = { ls: 20, mock: 30 };
if (totalLS > threshold.ls || totalMock > threshold.mock) {
  console.error(`\n❌ Seuils dépassés (ls:${threshold.ls}, mock:${threshold.mock})`);
  process.exit(1);
}

console.log('\n✅ Seuils respectés');
```

Usage :
```bash
npx ts-node scripts/audit-storage.ts
```

---

## CHECKLIST FINALE

- [ ] Micro-passe 1 : Votes correspondance → Supabase
- [ ] Micro-passe 2 : Rôles séance → ag_session_drafts
- [ ] Micro-passe 3 : Feuille présence → useAgDetail
- [ ] Micro-passe 4 : Pouvoirs → ag_attendance.proxy_id
- [ ] Micro-passe 5 : Éliminer fallback localStorage session
- [ ] Micro-passe 6 : Service mail → mail_campaigns
- [ ] Micro-passe 7 : Comptes bancaires → bank_accounts
- [ ] Micro-passe 8 : MOCK_COPROPRIETAIRES → useCoproprietaires
- [ ] Micro-passe 9 : Documents services → tables existantes
- [ ] Micro-passe 10 : Bibliothèque résolutions → resolution_templates

**Seuils CI :**
- localStorage < 20 occurrences (hors UI prefs)
- MOCK_ < 30 occurrences (hors tests)

---

*Plan créé le 30 janvier 2026*
