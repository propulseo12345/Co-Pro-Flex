# Plan d'implémentation — Réparation du cycle clôture/finalisation d'AG (chantier #2)

> **Pour les workers agentiques :** SOUS-SKILL REQUISE — utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Goal :** Réparer le cycle de clôture/finalisation d'AG (4 boutons cassés, 1 doublon mort, état « finalisée » inatteignable) en un seul chemin canonique propre, sans bug en cascade.

**Architecture :** `session_active → close_ag → [PV: activate_ag_decisions] → finalize_ag → archive_ag`. Clôture par RPC `close_ag` (fin de l'UPDATE direct), activation inchangée (étape PV), page Finalisation reconstruite en revue lecture seule, 2 RPC créées (`get_ag_pending_actions`, `finalize_ag`), doublon et fonctions fantômes supprimés. Enum `ag_status` conservé + documenté.

**Tech Stack :** Supabase/PostgreSQL (migrations `supabase/migrations/`), Next.js 16 + React 19 + TypeScript (front `src/`). Base locale via `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres`. Copro harness de test : `5d3ed408` (« Le Clos Saint-Michel démo »).

**Spec de référence :** `docs/superpowers/specs/2026-06-09-cloture-finalisation-ag-design.md`

---

## Structure des fichiers

**Migrations créées :**
- `supabase/migrations/0038_drop_rpc_finalize_ag_session.sql` — supprime le doublon mort.
- `supabase/migrations/0039_get_ag_pending_actions.sql` — RPC lecture des décisions.
- `supabase/migrations/0040_finalize_ag.sql` — RPC finalisation (pv_signed/pv_sent → finalized).

**Front modifié :**
- `src/components/features/ag/Closure/ClosureRecap.tsx` — clôture via `close_ag` (fin UPDATE direct).
- `src/lib/ag/api/meetings.api.ts` — `finishAgSession` recâblée (prepare + close_ag).
- `src/lib/ag/api/finalisation.api.ts` — `loadPendingActions`→`get_ag_pending_actions`, `markAgFinalized`→`finalize_ag` ; suppression `markActionActivated` + `generateCombinedCallsFromAg`.
- `src/features/ag/finalisation/hooks/useFinalisationPage.ts` + page + `Bloc*` — revue lecture seule.
- `src/lib/ag/types.ts` — ajouter `archived` au type `AgStatus`.
- `src/types/supabase.ts` — retirer les types fantômes (regénéré).

**Convention de test :** SQL testé en `BEGIN; … ROLLBACK;` sur la copro harness (avec bypass rôle `select set_config('request.jwt.claims','{"role":"service_role"}',true);`). Front : `npx tsc --noEmit` + `grep` d'absence + vérif écran (faite par l'utilisateur).

---

## Task 0 : Supprimer le doublon mort `rpc_finalize_ag_session`

**Files:**
- Create: `supabase/migrations/0038_drop_rpc_finalize_ag_session.sql`

- [ ] **Step 1 : Prouver qu'il n'a aucun appelant (doit être vide)**

Run :
```bash
cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && grep -rn "rpc_finalize_ag_session" src/ supabase/functions/ || echo "AUCUN APPELANT"
```
Expected : `AUCUN APPELANT` (la seule occurrence acceptable est sa définition dans `supabase/migrations/0030_rpc_ag_conseil.sql`).

- [ ] **Step 2 : Écrire la migration de suppression**

Créer `supabase/migrations/0038_drop_rpc_finalize_ag_session.sql` :
```sql
-- 0038 — Suppression du doublon mort rpc_finalize_ag_session
-- Corps quasi identique à close_ag, zéro appelant (front + edge). close_ag reste la fonction canonique.
drop function if exists public.rpc_finalize_ag_session(uuid, text);
```

- [ ] **Step 3 : Appliquer et vérifier la disparition**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/0038_drop_rpc_finalize_ag_session.sql"
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -c "select proname from pg_proc where proname='rpc_finalize_ag_session';"
```
Expected : `DROP FUNCTION` puis `(0 rows)`.

- [ ] **Step 4 : Non-régression (close_ag intact, boucle d'or intacte)**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -c "select proname from pg_proc where proname in ('close_ag','prepare_ag_decisions','activate_ag_decisions');"
```
Expected : 3 lignes (`close_ag`, `prepare_ag_decisions`, `activate_ag_decisions` toujours présentes).

- [ ] **Step 5 : Commit**
```bash
git add supabase/migrations/0038_drop_rpc_finalize_ag_session.sql
git commit -m "chore(ag): drop doublon mort rpc_finalize_ag_session"
```

---

## Task 1 : Clôture canonique via `close_ag` (fin de l'UPDATE direct)

**Files:**
- Modify: `src/components/features/ag/Closure/ClosureRecap.tsx:146-152` (handleClose)
- Modify: `src/lib/ag/api/meetings.api.ts:151-165` (finishAgSession)

- [ ] **Step 1 : Remplacer l'UPDATE direct de ClosureRecap par close_ag**

Dans `src/components/features/ag/Closure/ClosureRecap.tsx`, fonction `handleClose`, remplacer le bloc « Close the AG » (l'appel `supabase.from('ag_meetings').update({ status: 'closed', ... })`) par un appel RPC `close_ag` (cohérent avec le `prepare_ag_decisions` déjà appelé juste au-dessus via `(supabase.rpc as CallableFunction)`). `prepare_ag_decisions` reste AVANT (matérialise les décisions), `close_ag` ensuite (fige les votes + passe `closed`) :

```typescript
            // Close the AG via RPC canonique close_ag (fige les votes + statut closed).
            // close_ag dérive copro_id et applique la garde gestionnaire en interne.
            const { data: closeResult, error: closeError } = await (supabase.rpc as CallableFunction)(
                'close_ag', { p_ag_id: agId, p_closing_notes: null }
            );

            if (closeError) throw closeError;

            const closeData = closeResult as Record<string, unknown> | null;
            if (closeData && closeData.success === false) {
                setError((closeData.message as string) || 'Erreur lors de la clôture');
                setIsClosing(false);
                return;
            }

            onClose();
```

- [ ] **Step 2 : Recâbler `finishAgSession` (bouton « Terminer ») vers prepare + close_ag**

Dans `src/lib/ag/api/meetings.api.ts`, remplacer le corps de `finishAgSession` (qui appelle la fonction fantôme `finish_ag_session`) par l'enchaînement canonique `prepare_ag_decisions` puis `close_ag` (garantit l'ordre prepare→close pour que les décisions ne soient pas vides) :

```typescript
/**
 * Terminer une AG (lever la séance) → statut 'closed'.
 * Canonique : prepare_ag_decisions (matérialise les décisions votées) PUIS close_ag (fige + clôt).
 */
export async function finishAgSession(agId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error: prepError } = await supabase.rpc('prepare_ag_decisions', { p_ag_id: agId });
  if (prepError) return { success: false, error: prepError.message };

  const { data, error } = await supabase.rpc('close_ag', { p_ag_id: agId, p_closing_notes: null });
  if (error) return { success: false, error: error.message };

  const result = data as { success: boolean; error?: string };
  return result;
}
```

- [ ] **Step 3 : Vérifier la compilation TypeScript**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 4 : Prouver qu'il n'y a plus d'UPDATE direct de statut `closed` ni d'appel `finish_ag_session`**

Run :
```bash
cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && grep -rn "finish_ag_session" src/ || echo "OK pas de finish_ag_session"
grep -n "status: 'closed'" src/components/features/ag/Closure/ClosureRecap.tsx || echo "OK pas d'UPDATE direct closed"
```
Expected : `OK pas de finish_ag_session` et `OK pas d'UPDATE direct closed`.

- [ ] **Step 5 : Test empirique sur la base (simulation clôture en ROLLBACK)**

Vérifie que `prepare_ag_decisions` puis `close_ag` enchaînent sans erreur sur une AG `session_active`. On crée une copro jetable, on simule, on ROLLBACK :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
-- AG#2 du harness est session_active : on simule la clôture canonique puis on annule
select public.prepare_ag_decisions(m.id), public.close_ag(m.id, '[TEST] cloture')
from public.ag_meetings m
where m.copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and m.title='[E2E] AG extraordinaire (à tenir)';
select status from public.ag_meetings
where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG extraordinaire (à tenir)';
rollback;
SQL
```
Expected : la dernière requête montre `status = closed`, puis `ROLLBACK` (rien persisté ; AG#2 reste `session_active` dans le décor).

- [ ] **Step 6 : Vérif écran (utilisateur)** — sur une AG `session_active`, le bouton « Terminer / Clôturer » passe l'AG en « clôturée » sans erreur console (plus de 42883).

- [ ] **Step 7 : Commit**
```bash
git add src/components/features/ag/Closure/ClosureRecap.tsx src/lib/ag/api/meetings.api.ts
git commit -m "fix(ag): cloture canonique via close_ag (fin UPDATE direct + bouton Terminer repare)"
```

---

## Task 2 : Créer la RPC lecture `get_ag_pending_actions`

**Files:**
- Create: `supabase/migrations/0039_get_ag_pending_actions.sql`
- Modify: `src/lib/ag/api/finalisation.api.ts:28-33` (loadPendingActions)

- [ ] **Step 1 : Écrire la migration**

Créer `supabase/migrations/0039_get_ag_pending_actions.sql` :
```sql
-- 0039 — RPC lecture des décisions d'une AG (page Finalisation = revue lecture seule)
create or replace function public.get_ag_pending_actions(p_ag_id uuid)
returns table (
  id uuid,
  ag_id uuid,
  resolution_id uuid,
  resolution_title text,
  resolution_variables jsonb,
  action_type public.ag_action_type,
  target_table text,
  target_id uuid,
  payload jsonb,
  status text,
  error_message text,
  activated_at timestamptz,
  result_data jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'get_ag_pending_actions: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_has_copro_access(v_copro) then
    raise exception 'forbidden: accès copropriété requis' using errcode = '42501';
  end if;

  return query
    select pa.id, pa.ag_id, pa.resolution_id,
           r.title       as resolution_title,
           r.variables   as resolution_variables,
           pa.action_type, pa.target_table, pa.target_id, pa.payload,
           pa.status, pa.error_message, pa.activated_at, pa.result_data, pa.created_at
    from public.ag_pending_actions pa
    left join public.ag_resolutions r on r.id = pa.resolution_id
    where pa.ag_id = p_ag_id
    order by pa.created_at;
end;
$$;

grant execute on function public.get_ag_pending_actions(uuid) to authenticated, service_role;
```

- [ ] **Step 2 : Appliquer la migration**

Run : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/0039_get_ag_pending_actions.sql"`
Expected : `CREATE FUNCTION` puis `GRANT`.

- [ ] **Step 3 : Test — lecture des décisions de l'AG#1 (closed, 3 décisions activées)**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres <<'SQL'
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select action_type, status, resolution_title
from public.get_ag_pending_actions(
  (select id from public.ag_meetings
   where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026')
);
SQL
```
Expected : 3 lignes (`CREATE_ALUR_FUND`, `CREATE_WORK_BUDGET`, `ELECT_COUNCIL`) toutes en `status = activated`, avec leur titre de résolution.

- [ ] **Step 4 : Test garde — appel anonyme refusé**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres <<'SQL'
select set_config('request.jwt.claims','{"role":"anon"}',true);
select * from public.get_ag_pending_actions('00000000-0000-0000-0000-000000000000');
SQL
```
Expected : erreur `AG … introuvable` (23503) ou `accès copropriété requis` (42501) — pas de fuite de données.

- [ ] **Step 5 : Recâbler `loadPendingActions` côté front**

Dans `src/lib/ag/api/finalisation.api.ts`, `loadPendingActions` appelle déjà `supabase.rpc('get_ag_pending_actions', { p_ag_id: agId })` (la fonction existe désormais). Vérifier que l'interface `PendingAction` (lignes 18-26) correspond au retour : ajouter les champs renvoyés utilisés par l'UI (`resolution_title`, `resolution_variables`) si l'affichage les consomme. Aligner le mapping :

```typescript
export interface PendingAction {
  id: string;
  action_type: string;
  status: 'pending' | 'activated' | 'failed';
  error_message: string | null;
  result_data: Record<string, unknown> | null;
  resolution_id: string | null;
  resolution_title: string | null;
  resolution_variables: Record<string, unknown> | null;
}
```

- [ ] **Step 6 : Compilation**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 7 : Commit**
```bash
git add supabase/migrations/0039_get_ag_pending_actions.sql src/lib/ag/api/finalisation.api.ts
git commit -m "feat(ag): get_ag_pending_actions (lecture decisions) + recablage loadPendingActions"
```

---

## Task 3 : Créer la RPC `finalize_ag` (pv_signed/pv_sent → finalized)

**Files:**
- Create: `supabase/migrations/0040_finalize_ag.sql`
- Modify: `src/lib/ag/api/finalisation.api.ts:279-292` (markAgFinalized → finalize_ag)

- [ ] **Step 1 : Écrire la migration**

Créer `supabase/migrations/0040_finalize_ag.sql` :
```sql
-- 0040 — RPC finalize_ag : classe définitivement une AG (statut 'finalized')
-- Préconditions : statut pv_signed/pv_sent ET toutes les décisions activées. Ne relance JAMAIS l'activation.
create or replace function public.finalize_ag(p_ag_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro         uuid;
  v_status        public.ag_status;
  v_not_activated int;
begin
  select m.copro_id, m.status into v_copro, v_status
  from public.ag_meetings m where m.id = p_ag_id;

  if v_copro is null then
    raise exception 'finalize_ag: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour finaliser l''AG %', p_ag_id using errcode = '42501';
  end if;

  -- idempotent : déjà finalisée
  if v_status = 'finalized' then
    return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'finalized', 'message', 'AG déjà finalisée');
  end if;

  if v_status not in ('pv_signed', 'pv_sent') then
    raise exception 'finalize_ag: statut % invalide (attendu pv_signed ou pv_sent)', v_status using errcode = '23514';
  end if;

  select count(*) into v_not_activated
  from public.ag_pending_actions pa
  where pa.ag_id = p_ag_id and pa.status <> 'activated';

  if v_not_activated > 0 then
    raise exception 'finalize_ag: % décision(s) non activée(s) — finalisation impossible', v_not_activated using errcode = '23514';
  end if;

  update public.ag_meetings
  set status = 'finalized', updated_at = now()
  where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'status', 'finalized');
end;
$$;

grant execute on function public.finalize_ag(uuid) to authenticated, service_role;
```

- [ ] **Step 2 : Appliquer la migration**

Run : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/0040_finalize_ag.sql"`
Expected : `CREATE FUNCTION` puis `GRANT`.

- [ ] **Step 3 : Test cas nominal (pv_signed + tout activé → finalized) en ROLLBACK**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
-- AG#1 du harness a ses 3 décisions activées ; on la place en pv_signed pour le test
update public.ag_meetings set status='pv_signed'
where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026';
select public.finalize_ag(
  (select id from public.ag_meetings
   where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026')) as resultat;
select status from public.ag_meetings
where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026';
rollback;
SQL
```
Expected : `resultat = {"success": true, ... "status": "finalized"}`, puis `status = finalized`, puis `ROLLBACK`.

- [ ] **Step 4 : Test gardes (statut invalide + non-activée + non-gestionnaire)**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres <<'SQL'
select set_config('request.jwt.claims','{"role":"service_role"}',true);
-- AG#1 est 'closed' (pas pv_signed) -> doit refuser
select public.finalize_ag(
  (select id from public.ag_meetings
   where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026'));
SQL
```
Expected : erreur `statut closed invalide (attendu pv_signed ou pv_sent)` (23514).

- [ ] **Step 5 : Remplacer `markAgFinalized` (UPDATE direct) par l'appel `finalize_ag`**

Dans `src/lib/ag/api/finalisation.api.ts`, remplacer le corps de `markAgFinalized` (UPDATE direct `status='finalized'`) par l'appel RPC :
```typescript
export async function markAgFinalized(agId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('finalize_ag', { p_ag_id: agId });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  return result;
}
```

- [ ] **Step 6 : Compilation**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 7 : Commit**
```bash
git add supabase/migrations/0040_finalize_ag.sql src/lib/ag/api/finalisation.api.ts
git commit -m "feat(ag): finalize_ag (pv_signed/pv_sent -> finalized, gardes + idempotence)"
```

---

## Task 4 : Page Finalisation en revue lecture seule

**Files:**
- Modify: `src/features/ag/finalisation/hooks/useFinalisationPage.ts`
- Modify: `src/features/ag/finalisation/components/BlocSimple.tsx`, `BlocAppelsFonds.tsx` (lecture seule)
- Modify: `src/app/(dashboard)/ag/[id]/finalisation/page.tsx` (si besoin d'adapter le rendu)

- [ ] **Step 1 : Simplifier `useFinalisationPage` — lecture + bouton Finaliser uniquement**

Le hook charge déjà les décisions (`loadPendingActions` → `get_ag_pending_actions`) et expose `handleFinalize` (→ `markAgFinalized` → `finalize_ag`). Il n'y a plus d'activation manuelle. Garder la garde `allActivated` (toutes les décisions doivent être `activated` pour autoriser la finalisation), elle reflète exactement la garde SQL de `finalize_ag` :

```typescript
  const allActivated = actions.length > 0 && actions.every(a => a.status === 'activated');
```
(aucune modification de logique nécessaire ici — confirmer que `refreshAction` n'appelle plus de RPC d'activation.)

- [ ] **Step 2 : Rendre les `Bloc*` en lecture seule (retirer les appels aux RPC fantômes)**

Dans `src/features/ag/finalisation/components/BlocSimple.tsx` : retirer les handlers qui appellent `markActionActivated` (lignes ~79, 96, 143) et `appointSyndicFromAg`. Le composant n'AFFICHE plus que l'état de la décision (titre, `status` badge activée/échouée, `result_data` résumé). Supprimer les boutons « Activer ».

Dans `src/features/ag/finalisation/components/BlocAppelsFonds.tsx` : retirer l'appel `generateCombinedCallsFromAg` (ligne ~61) et le bouton associé — les appels sont déjà générés par `activate_ag_decisions` à l'étape PV. Le bloc affiche le récap des appels créés (lecture).

- [ ] **Step 3 : Vérifier que la page ne référence plus aucune RPC fantôme**

Run :
```bash
cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && grep -rn "mark_ag_action_activated\|generate_combined_calls_from_ag\|markActionActivated\|generateCombinedCallsFromAg" src/features/ag/finalisation/
```
Expected : aucune occurrence (ou seulement dans des fichiers à supprimer en Task 7).

- [ ] **Step 4 : Compilation**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 5 : Vérif écran (utilisateur)** — la page Finalisation d'une AG charge en lecture seule (liste des décisions activées), le bouton « Finaliser » fonctionne quand tout est activé, plus aucun 42883 dans la console.

- [ ] **Step 6 : Commit**
```bash
git add src/features/ag/finalisation/
git commit -m "refactor(ag): page Finalisation en revue lecture seule (fin activation manuelle)"
```

---

## Task 5 : Brancher `archive_ag` + corriger l'asymétrie TS

**Files:**
- Modify: `src/lib/ag/types.ts:11` (ajouter `archived`)
- Modify: `src/lib/ag/api/meetings.api.ts` (ajouter `archiveAg`)
- Modify: composant d'action sur une AG finalisée (bouton « Archiver »)

- [ ] **Step 1 : Ajouter `archived` au type front `AgStatus`**

Dans `src/lib/ag/types.ts`, ligne 11, ajouter `'archived'` (la base a 10 valeurs, le type front en avait 9) :
```typescript
export type AgStatus = 'draft' | 'convoked' | 'in_progress' | 'session_active' | 'closed' | 'pv_generated' | 'pv_signed' | 'pv_sent' | 'finalized' | 'archived';
```

- [ ] **Step 2 : Ajouter le wrapper `archiveAg` dans l'API**

Dans `src/lib/ag/api/meetings.api.ts`, ajouter :
```typescript
/**
 * Archiver une AG finalisée → statut 'archived' (RPC archive_ag existante).
 */
export async function archiveAg(agId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('archive_ag', { p_ag_id: agId });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}
```

- [ ] **Step 3 : Brancher un bouton « Archiver » sur une AG finalisée**

Dans le composant d'actions d'une AG (liste/détail — suivre le pattern des autres actions), afficher un bouton « Archiver » quand `status === 'finalized'`, appelant `archiveAg(agId)` puis rafraîchir. (Lieu exact : composant de la fiche AG ; suivre le pattern de `useCloseAg`/`startAg`.)

- [ ] **Step 4 : Test archive_ag en ROLLBACK**

Run :
```bash
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.ag_meetings set status='finalized'
where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026';
select public.archive_ag(
  (select id from public.ag_meetings
   where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026'));
select status from public.ag_meetings
where copro_id='5d3ed408-d20a-4304-8976-47798c1f85a4' and title='[E2E] AG ordinaire 2026';
rollback;
SQL
```
Expected : statut final `archived`, puis `ROLLBACK`.

- [ ] **Step 5 : Compilation + commit**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx tsc --noEmit`
```bash
git add src/lib/ag/types.ts src/lib/ag/api/meetings.api.ts src/
git commit -m "feat(ag): cablage archive_ag + ajout 'archived' au type AgStatus"
```

---

## Task 6 : Nettoyage final + documentation

**Files:**
- Modify: `src/lib/ag/api/finalisation.api.ts` (retirer wrappers morts)
- Modify: `src/lib/ag/api/index.ts` (retirer exports morts)
- Create: `supabase/migrations/0041_comment_ag_status.sql`
- Modify: `CLAUDE.md` ou `docs/claude/business-rules.md` (cycle AG canonique)

- [ ] **Step 1 : Supprimer les wrappers morts**

Dans `src/lib/ag/api/finalisation.api.ts`, supprimer `generateCombinedCallsFromAg` (~164-175) et `markActionActivated` (~264-277) — plus aucun appelant après Task 4. Retirer les exports correspondants dans `src/lib/ag/api/index.ts`.

- [ ] **Step 2 : Documenter l'enum `ag_status`**

Créer `supabase/migrations/0041_comment_ag_status.sql` :
```sql
-- 0041 — Documentation de l'enum ag_status (cycle canonique)
comment on type public.ag_status is
  'Cycle AG : draft -> convoked -> session_active -> closed (close_ag) -> pv_generated -> pv_signed -> finalized (finalize_ag) -> archived (archive_ag). '
  'in_progress = repli annulation de séance. Aucune valeur retirée (retrait jugé risqué/inutile). pv_* posés par UPDATE front (transitions de gestion).';
```
Run : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/0041_comment_ag_status.sql"`
Expected : `COMMENT`.

- [ ] **Step 3 : Régénérer les types Supabase (retire les types fantômes)**

Run : `cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx supabase gen types typescript --local > src/types/supabase.ts`
Expected : `src/types/supabase.ts` ne contient plus `finish_ag_session`, `mark_ag_action_activated`, `generate_combined_calls_from_ag`, `rpc_finalize_ag_session` ; contient `get_ag_pending_actions`, `finalize_ag`.

- [ ] **Step 4 : Documenter le cycle dans les règles métier**

Dans `docs/claude/business-rules.md`, ajouter une section « Cycle de vie d'une AG » décrivant la chaîne canonique et les fonctions (`start_ag`, `close_ag`, `activate_ag_decisions`, `finalize_ag`, `archive_ag`).

- [ ] **Step 5 : Vérification finale globale**

Run :
```bash
cd "C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex"
grep -rn "finish_ag_session\|mark_ag_action_activated\|generate_combined_calls_from_ag\|rpc_finalize_ag_session" src/ && echo "RESTE DES FANTOMES" || echo "OK 0 fantome"
npx tsc --noEmit && echo "OK tsc"
npx vitest run 2>&1 | tail -5
```
Expected : `OK 0 fantome`, `OK tsc`, et la suite vitest verte.

- [ ] **Step 6 : Commit**
```bash
git add -A
git commit -m "chore(ag): nettoyage wrappers morts + doc cycle AG + regen types"
```

---

## Auto-revue (faite par l'auteur du plan)

- **Couverture spec** : §4 cycle canonique → T1/T2/T3/T5 ; §5 fonctions → T2/T3 ; §6 dépollution → T0/T1/T4/T6 ; §7 cascade (ordre prepare→close) → T1 step 2 ; §3 décision finaliser pv_signed → T3 ; étiquettes garder+documenter+archive → T5/T6. ✅ couvert.
- **Placeholders** : numéros de migration fixés (0038-0041, vérifiés : dernier = 0037). Code SQL complet. Front : cibles fichier:ligne + code exact. Seul point « à localiser » = le composant du bouton Archiver (T5 step 3) : pattern indiqué, à placer par l'implémenteur. ⚠️ acceptable (UI).
- **Cohérence des noms** : `get_ag_pending_actions`, `finalize_ag`, `archive_ag`, `close_ag`, `prepare_ag_decisions` cohérents entre tâches. Le wrapper front conserve le nom `markAgFinalized` (corps repointé) → pas de renommage cassant.

## Risques de cascade (rappel — neutralisés dans l'ordre)

- Ordre `prepare` → `close` : imposé en T1 (ClosureRecap et `finishAgSession`).
- Immuabilité GL : `finalize_ag` ne rappelle jamais `activate_ag_decisions` (T3).
- Garde `archive_ag` (exige pv_*/finalized) : enum conservé intact (aucun retrait).
- Chaque tâche touchant la base est testée en `ROLLBACK` sur le harness avant commit.
