# Plan de remédiation — findings code-review onboarding (2026-06-03)

> Suite au `/code-review` high de la tranche `327bd17..c14d81b`. 10 findings → triés. Ce plan répare **tout ce qui est réel**. Les faux positifs sont documentés pour mémoire, pas re-traités.
> Mémoire liée : [[onboarding-clean-path]], [[vue-coproprietaire-pending]].

## Triage de référence
- ❌ **Faux positifs (ne rien faire)** : #2 surcharge 8/10 params (TESTÉ : l'appel 10-params résout et poste — calls=1, 450×4, 701×1, success=true) · #3 `supabase as any` (pattern projet préexistant) · #7 contamination externe 471/472 (couvert par P3-b) · #8 quasi (createCopropriete garantit le provision).
- ✅ **Réels à réparer** : #1, #4, #6, #9, #10, #5, #7(durcissement), + nettoyage double surcharge.

---

## P1 — Robustesse rapide (faible risque, ~30 min)

### P1-a (#1) Renommer `handleStep7Complete` → `handleFinalize`
**Fichier** : `src/app/(gestionnaire)/onboarding/[id]/page.tsx`
La fonction (~ligne 83) gère la finalisation Step8, pas Step7. Renommer la déclaration + son usage `onFinalized={...}` (~ligne 184). Pur renommage, zéro changement de comportement.

### P1-b (#9) Gérer l'erreur des reads d'idempotence
**Fichier** : `src/lib/onboarding/api.ts`
Les deux gardes d'idempotence lisent sans traiter `error` → un timeout silencieux rend le garde inopérant (postage qui reprend / partiel). Corriger les DEUX :

`postOnboardingCalls` (read `call_for_funds`) :
```ts
const { data: existing, error: existErr } = await supabase
  .from('call_for_funds').select('id').eq('budget_id', budgetId).neq('status', 'cancelled').limit(1);
if (existErr) return { data: null, error: new Error(`Vérification idempotence appels : ${existErr.message}`) };
if (existing && existing.length > 0) return { data: { posted: 0, skipped: true }, error: null };
```
`postOnboardingOpeningBalances` (read `ledger_transactions` opening_balance) : même patron, retourner l'erreur si le read échoue au lieu de poursuivre.

### P1-c (#4) Vérifier que le plan comptable est complet après provision
**Fichier** : `src/lib/onboarding/api.ts` (`createCopropriete`, après `provision_copro_chart`)
`provision_copro_chart` est idempotent → son entier retourné (0 au re-run) n'est pas un bon indicateur de santé. À la place, vérifier un **compte sentinelle** juste après :
```ts
const { count, error: chkErr } = await supabase
  .from('accounts').select('id', { count: 'exact', head: true })
  .eq('copro_id', coproId).eq('code', '450-1');
if (chkErr || !count) return { data: null, error: new Error('Plan comptable incomplet après provisionnement (450-1 absent).') };
```
*Critère P1* : tsc + build verts ; comportement nominal inchangé (smoke C1 toujours OK).

---

## P2 — Cohérence du postage partiel (risque moyen)

### P2-a (#6) Pré-valider les clés AVANT le postage (éviter l'état incohérent)
**Problème** : Step6 génère l'aperçu en local sans vérifier la complétude des clés. Si une clé `all_lots` a perdu une ligne, `post_budget_call_for_funds` RAISE au Step8 → certaines échéances déjà postées, d'autres non.
**Fix** : avant de poster, `postOnboardingCalls` vérifie d'abord toutes les clés du budget via la RPC `repartition_key_is_complete` (ou un nouvel RPC `precheck_budget_calls(budget_id)` qui renvoie les clés incomplètes). Si une clé est incomplète → erreur explicite AVANT tout postage (rien de posté). Idéalement aussi remonter l'info dès Step6 (badge « clé X incomplète »).

### P2-b (#10) Rendre `postOnboardingCalls` récupérable (postage tout-ou-rien par échéance)
**Problème** : la boucle poste N échéances en N appels non transactionnels ; un échec à la 2e laisse la 1re postée, et le re-clic skip globalement (garde par budget) → échéances manquantes définitivement, audit bloque sans issue.
**Fix (au choix)** :
- (simple) idempotence **par échéance** : skip une échéance déjà émise (clé `(budget_id, trimester)` / label), reposter seulement les manquantes au re-clic → récupérable.
- (robuste) un RPC `post_budget_calls_all(budget_id, schedule, dates[])` qui poste toutes les échéances dans **une seule transaction** (tout ou rien).
Recommandé : l'idempotence par échéance (moins invasif, suffit à la récupérabilité).

*Critère P2* : test SQL — poster, simuler échec sur 1 échéance, re-poster → état complet sans doublon.

---

## P3 — Durcissement base (risque DB, GO migration requis)

### P3-a Nettoyer la double surcharge de `post_budget_call_for_funds`
Deux surcharges coexistent (8 params `…_cr8`/`…_wp6` et 10 params). La 10-params est la canonique (installments). Vérifier que **plus aucun appelant** n'utilise la 8-params (grep SQL + TS), puis `DROP` la 8-params pour lever toute ambiguïté future de résolution. Migration dédiée + GO.

### P3-b (#7, = item 1.4 du PROGRESS_V1) Enforcement `is_postable`
CONSTRAINT TRIGGER `BEFORE INSERT ON ledger_entries` qui RAISE si le compte cible a `is_postable=false` (chapeau 450 nu, etc.). Empêche structurellement toute contamination/postage sur compte non imputable. Backfill `is_postable=false` sur les chapeaux 450 dotés de 450-x. **À faire après reclassement des soldes chapeau (G5)** — déjà séquencé dans PROGRESS_V1 (1.4). Migration + GO.

*Critère P3* : un INSERT direct sur chapeau 450 / 471 nu est rejeté ; la boucle d'or et les fixtures restent vertes.

---

## P4 — Feature : mapping poste→compte modulable (#5)

**Objectif** : sortir `DEFAULT_POSTE_CHARGE_ACCOUNT` du code vers une **config en base éditable dans les Paramètres**.
- Table `copro_poste_account_map (copro_id, poste_id, account_code, PRIMARY KEY(copro_id, poste_id))` + seed par défaut (la table actuelle) à la création de copro.
- `createOnboardingBudget` lit l'override DB si présent, sinon le défaut codé (fallback).
- UI : page `/settings/comptabilite` (ou onglet) pour éditer le mapping par copro.
- Garde l'angle mort connu en tête : l'audit ne détecte pas un mauvais compte de charge → le warning UI reste le filet.
Feature à part entière (DB + API + UI) — **après** la stabilisation P1/P2. Estimation : 1 tranche dédiée.

---

## P5 — Déjà planifié / hors scope (pour mémoire)
- **Track C smoke Playwright** : à lancer en local + ajuster les `// TODO vérifier` (sélecteurs, clé Google Maps). Non bloquant (preuve SQL faite).
- **Déprécier `create_test_copro` (clone 22222222)** au profit de `create_clean_test_copro`. Migration de suppression quand plus aucun test n'en dépend.
- **TVA** : positionnement produit (syndic pro) — chantier structurel séparé, hors de cette remédiation.
- **#8 Step7 pré-check 450-x** : couvert de fait par P1-c (createCopropriete garantit le provision) ; pas d'action propre nécessaire.

---

## Séquencement recommandé
1. **P1** (robustesse rapide, sans migration) → commit, tsc/build.
2. **P2** (cohérence postage, 1 migration légère pour le precheck éventuel + TS).
3. **P3** (durcissement DB, migrations + GO ; P3-b dépend de G5).
4. **P4** (feature mapping modulable, tranche dédiée).
P5 = backlog continu.

> Chaque palier : type check + test SQL d'acceptation (`create_clean_test_copro_seeded` = 0 écart) doivent rester verts.
