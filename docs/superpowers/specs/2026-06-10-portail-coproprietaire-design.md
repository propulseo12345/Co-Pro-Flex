# Spec — Portail copropriétaire (espace `(coproprietaire)`) · CoProFlex

> Design validé en brainstorming le 2026-06-10. **Implémentation prévue sur une session dédiée.**
> Ancré dans le schéma RÉEL (migrations 0001→0044, vérifié par fan-out — PAS le plan daté du 01/06).
> Lecture préalable : `.planning/PLAN_MAITRE_VUE_COPROPRIETAIRE.md` (corrigé ci-dessous sur 6 points).

## 1. Objectif & périmètre

Espace copropriétaire **de consultation** (décret 2019), conforme aux 3 cercles de visibilité :
collectif (PV, budget voté, contrats…) · individuel (son compte, ses lots, ses appels, ses votes) ·
jamais l'individuel d'un autre.

- **Périmètre bêta = consultation complète (8 pages)** — voir §4.
- **V1 = pur UI + câblage sur vues existantes. ZÉRO migration** (100 % parallèle aux autres tracks).
- **Hors V1 (différé)** : flux d'invitation (UI), édition de profil, consentement démat, vote AG en ligne, paiement en ligne.

## 2. Décisions de cadrage (validées)

| Décision | Choix |
|---|---|
| Périmètre | 8 pages de consultation |
| Sécurité (RLS) | RLS **différée** ; câblage immédiat + **filtrage applicatif** ; RLS = **gate de lancement** (jamais big-bang ; incrémental + test d'étanchéité copro A≠B AVANT tout vrai utilisateur) |
| Architecture data | **Server-first (RSC)** — résolution identité + scope **côté serveur uniquement** (sécurité structurelle, sens de Next 16, perf consultation). Dévie volontairement du pattern hooks-clients gestionnaire (justifié : enjeu fuite). Bouts interactifs = composants clients nourris par données déjà scopées. |
| Migrations V1 | **Aucune** — gaps contournés (voir §5) ou batchés au lot pré-lancement |
| Invitation | Différée ; build contre un **copropriétaire de test** (`coproprietaires.user_id` posé à la main sur un compte dev) |

## 3. Identité & sécurité (clé de voûte)

Chaîne vérifiée : `auth.uid()` = `profiles.id` → `coproprietaires.user_id` → `lot_owners` (actifs : `end_date IS NULL`) → `lot_id`.
Rattachement existant : RPC `link_coproprietaire_account(p_invite_token)` (0023, DEFINER) + table `copro_invitations`.

**`src/lib/portal/context.ts` → `getPortalContext()` (SERVEUR uniquement)** :
`getUser()` (jamais `getSession`) → résout `{ coproId, coproprietaireId, lotIds, role }` (lotIds via `get_user_lot_ids` côté serveur).
**Toute** fonction `lib/portal/api.ts` part de ce contexte et scope ses requêtes.

> ⚠️ **Règle non négociable (RLS différée)** : les vues `security_invoker` renvoient TOUT sans RLS.
> Donc `.eq('copro_id', ctx.coproId).in('lot_id', ctx.lotIds)` sur CHAQUE requête, `lotIds` résolu
> SERVEUR, jamais depuis un input client. Un seul filtre oublié = fuite de données.

## 4. Les 8 pages → sources de données VÉRIFIÉES

| Route `/espace/…` | Sources réelles (existantes) | Filtre copro |
|---|---|---|
| `dashboard` | `v_owner_statement_by_person.balance` (solde perso, **PAS** `fn_dashboard_kpis` qui est copro-wide) · `v_unpaid_by_lot` · `v_call_lines_detailed` (prochaine échéance) · `ag_meetings` (prochaine AG) | `owner_id`=moi · `.in('lot_id', lotIds)` |
| `mon-compte` | RPC **`get_owner_statement(p_copro_id, p_owner_id, p_period_id?, p_lot_id?)`** (0028, DEFINER auto-gardée → sûre RLS off) · `v_owner_statement_by_lot_detail` (relevé ligne à ligne, `running_balance`) | `p_owner_id`=mon `coproprietaires.id` |
| `mes-lots` | `v_lots_with_owners` · `lot_owners` (share_percent/is_primary) · `v_repartition_key_lines_detailed` · `v_repartition_key_totals` | `.in('lot_id', lotIds)` |
| `appels` | `v_call_lines_detailed` (due_date, amount_remaining, status) · `v_calls_overview` · `call_for_funds` | `.in('lot_id', lotIds)` |
| `assemblees` (+`/[id]`) | `ag_meetings` · `ag_resolutions` · `v_ag_resolutions_results` · `v_ag_vote_stats_by_resolution` · `ag_votes` (mes votes) | AG bornée à ma copro · votes `.in('coproprietaire_id', mesIds)` |
| `documents` | table `documents` (colonne **`visibility`**, enum `document_visibility`) · `document_folders` · `v_document_versions` · bucket `ged` (URL signée) | `.eq('copro_id')` + `visibility IN ('conseil'?, 'tous_coproprietaires')` |
| `ma-copropriete` | `copros` · **`cabinets`** (syndic = `copros.cabinet_id`) · `council_members` (rôles via `v_owner_directory`) | copro du user |
| `profil` (**read-only V1**) | `coproprietaires` (`.eq('user_id', auth.uid())`) · `v_coproprietaires_overview` · `profiles` | self |

## 5. Les 6 écarts vs le plan (corrections + stratégie V1)

| Écart vérifié | V1 (zéro migration) | Lot pré-lancement |
|---|---|---|
| `v_ag_overview` **n'existe pas** (drift) | fallback : `ag_meetings` + jointures | créer la vue d'aperçu AG |
| docs : colonne = **`visibility`** (`tous_coproprietaires`), PAS `confidentiality`/`public` | utiliser le bon enum | — |
| `consent_demat` absente + pas d'écriture self profil | **profil read-only** | `ALTER coproprietaires ADD consent_demat` + RPC/policy self-update |
| ventilation 450-x absente | agréger SERVEUR depuis `v_owner_statement_by_lot_detail` (group by `account_code`) | (option) vue d'agrégat par (lot, compte) |
| bucket `ged` + policies storage | lister + URL signée | policies storage.objects |
| `council_members` colonnes driftées (`last_name`…) | passer par `v_owner_directory` (0035) | aligner le schéma |

**Drift types connu** : `src/types/supabase.ts` est périmé (ex. signature `get_owner_statement`). → appeler la VRAIE signature 0028 ou client untyped (pattern `owners/api.ts`). Régénération des types = différée (Phase 3).

## 6. Architecture & fichiers

```
src/app/(coproprietaire)/
  layout.tsx              ← calque (gestionnaire)/layout.tsx MINIMAL (ThemeProvider + SidebarProvider
                            + CoproprietaireSidebar + AppBody) — PAS les 7 providers métier de (dashboard)
  espace/
    dashboard/ · mon-compte/ · mes-lots/ · appels/
    assemblees/page.tsx + assemblees/[id]/page.tsx · documents/ · ma-copropriete/ · profil/
src/components/layout/CoproprietaireSidebar.tsx
src/components/features/coproprietaire/**     ← composants par page (clients SI interactifs)
src/lib/portal/
  context.ts   ← getPortalContext() : clé de voûte sécurité (serveur)
  api.ts       ← fonctions ApiResult<T> par page (getMyDashboard, getMyStatement, getMyLots, getMyCalls,
                 getMyAGs, getMyDocuments, getMaCopro, getMyProfile) — toutes scopées via le contexte
```

**Conventions à respecter** (vérifiées) : client `@/lib/supabase/server` (async, `await cookies()`) pour le serveur · `ApiResult<T> = { data, error }` redéclaré par domaine, jamais de `throw` · CSS Modules · `getUser()` pour toute décision de sécurité.

**Multi-copro** (point manqué par le plan) : un copropriétaire peut détenir des lots dans **plusieurs copros**. `getPortalContext()` résout SES copros + un **sélecteur de copro active** (1 → auto ; N → switcher). V1 gère le cas courant (1 copro) + switcher basique.

**Garde middleware** : étendre `updateSession` (lib/supabase/middleware) avec le rôle (`memberships`) → un `coproprietaire` ne peut pas atteindre les routes gestionnaire (préfixes en dur) et inversement ; les routes `/espace/*` sont réservées au rôle copro.

## 7. Ordre de build (tranches verticales)

Chaque page de bout en bout (vue existante → fonction `api.ts` scopée → composant → test), dans l'ordre de valeur :

1. **Fondations** : route group + `layout` + `CoproprietaireSidebar` + `getPortalContext()` + garde middleware + seed d'un copropriétaire de test.
2. `dashboard` → 3. `mon-compte` → 4. `mes-lots` → 5. `appels` → 6. `documents` → 7. `assemblees` → 8. `ma-copropriete` → 9. `profil` (read-only).

## 8. Gate de lancement (avant tout vrai copropriétaire)

- Activer la RLS (policies copro déjà écrites, plan §4.5) **en chantier dédié, incrémental, revue adversariale**.
- **Test d'étanchéité** : connecté copro A → 0 ligne de B.
- Lot migration batché : `v_ag_overview`, `consent_demat` (+ self-update), policies storage `ged`, fix `council_members`.
- Flux d'invitation (UI) + régénération `src/types/supabase.ts`.

## 9. Hors scope (bêta 2 / backlog)

Vote AG en ligne · paiement en ligne (Stripe) · édition de profil riche · notifications in-app génériques · `lot_owners.type_droit` (usufruit/NP).
