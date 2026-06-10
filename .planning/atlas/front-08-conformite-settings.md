# Atlas front — Zone 08 : Conformité, Settings, Auth/Onboarding

Périmètre : `src/app/(dashboard)/{conformite,settings}/**`, `src/app/auth/**`, `src/app/(gestionnaire)/onboarding/**`.
Méthode : page → hook → `*.api.ts` / service / lib → base. Source de vérité DB croisée avec `.planning/db-cible/INVENTAIRE-FONCTIONS.md` et `OBJETS-ABANDONNES.md`.

## Tableau des écrans

| Écran | Rôle métier | Hooks | Données touchées (RPC / table / edge / api) | Statut |
|---|---|---|---|---|
| `conformite/facturx` | Liste factures + génération Factur-X (PDF/A-3 + XML) | `useFacturX` | **MOCK pur** (`MOCK_FACTURES_FACTURX`) ; génération = `setTimeout`, téléchargement = toast simulé | **à problème** (mock, aucun backend, label « après intégration backend ») |
| `conformite/ppt` | PPT portefeuille + vue copro (kanban travaux) | `usePPT`, `useCopro`, `useToast` | **MOCK pur** (`MOCK_PPT_COPROPRIETES`) ; CRUD en state React local, non persisté | **à problème** (mock, perte au refresh) |
| `conformite/ppt/[coproprieteId]` | Détail PPT d'une copro (lecture seule, édition désactivée) | `usePPT` | **MOCK** (même source) ; `onEdit`/`onDelete` = no-op | **doublon partiel** de la vue copro de `ppt/page.tsx` (CoproContext) + édition morte |
| `conformite/dpe` | Suivi DPE collectif portefeuille + fiche copro | `useDPE`, `useCopro`, `useToast` | **MOCK pur** (`MOCK_DPE_LIST`) ; update/renew en state local | **à problème** (mock, non persisté) |
| `conformite/dpe/[coproprieteId]` | (route présente via `DPEGestionnaireTable` → `router.push`) | — | cible `/conformite/dpe/{id}` mais **aucun fichier `[coproprieteId]/page.tsx`** pour DPE | **mort/cassé** (lien vers route inexistante → 404) |
| `settings` (index) | Hub paramètres (cartes Info copro / Tantièmes) | aucun | `informationsCopro` **codé en dur vide** ; `// TODO: Fetch from Supabase` | **à problème** (placeholder, cartes masquées par TODO go-live) |
| `settings/info` | Édition lots, clés de répartition, copropriétaires | `useInfoCoproPage` | **MOCK pur** (`MOCK_COPROPRIETAIRES`, lots/clés en `useState`) ; aucune écriture DB | **à problème** (mock — alors qu'onboarding écrit ces mêmes données en réel → drift) |
| `settings/templates` | Liste templates de PV (CRUD, import/export, défaut) | `useTemplatesPage` → `usePVTemplates` → `pvTemplateService` | table **`pv_templates`** (`.from`), RPC **`increment_template_usage`** | **à problème** (service réel mais `duplicate`/`setDefault`/`export`/`import`/`updateSection`/`getValidationStatus` = **stubs `return null/false`/TODO**) |
| `settings/templates/[id]` | Éditeur de template (sections, settings, formulations, export HTML/PDF/DOCX) | `useTemplateEditor` | `pvTemplateService` (`pv_templates`) + `pvExportService` | **actif partiel** (édition OK ; lien `…/preview` mort, cf. anomalies) |
| `settings/reminders` | Config relances impayés (pause, règles J+, templates email, test) | `useRemindersSettingsPage` → `useFinanceData` → `@/lib/finance/api` | tables **`reminder_settings`** (upsert), **`payment_reminder_rules`**, **`email_templates`** ; edge **`run_payment_reminders`** (dry_run) | **actif** (chaîne DB/edge réelle) |
| `auth/login` | Connexion email/mot de passe + comptes démo | inline `createClient` | `supabase.auth.signInWithPassword` ; redirige `/portefeuille` | **actif** |
| `auth/callback` (route.ts) | Échange code OAuth → session | — | `supabase.auth.exchangeCodeForSession` ; redirige `next ?? /dashboard` | **à problème mineur** (défaut `/dashboard`, login pointe `/portefeuille` — incohérence de cible) |
| `onboarding` (liste) | Copros en cours de config + reprise/suppression | inline + `listOnboardingCopros`/`deleteOnboardingCopro` | table **`copros`** (`onboarding_step not null`) | **actif** |
| `onboarding/new` | — | — | `redirect('/onboarding/create')` | **doublon déprécié** (redirect assumé) |
| `onboarding/create` | Step 1 création copro | `Step1Copropriete` + `setActiveCopro` | `createCopropriete` → `.from('copros')` + `.from('memberships')` + RPC **`provision_copro_chart`** (sentinelle 450-1) | **actif** |
| `onboarding/[id]` | Wizard 8 étapes (copros, lots/clés, comptes, budget, AG/appels, reprise soldes, finalisation) | `useOnboarding`, `getOrCreateOnboardingPeriod` | tables `copros`, `coproprietaires`, `accounts`, `accounting_periods`, `budgets`, `budget_lines`, `call_for_funds`, `ledger_transactions/entries`, `repartition_keys`, vue `v_lots_with_owners` ; RPC **`set_opening_balance`/`get_opening_balance`**, **`resolve_lot_tiers_account`**, **`repartition_key_is_complete`**, **`post_budget_call_for_funds`**, **`create_ledger_transaction`**, **`audit_finance_integrity`** | **actif** (cœur métier réel, le plus mature de la zone) |

## Anomalies de la zone

1. **Toute la Conformité est en MOCK** (Factur-X, PPT, DPE) : trois hooks ne touchent jamais Supabase, CRUD volatil (perte au refresh). Aucune table cible identifiée dans la db-cible pour ces 3 features → soit à brancher, soit hors-scope finance-first.
2. **DPE détail cassé** : `DPEGestionnaireTable` fait `router.push('/conformite/dpe/{id}')` mais il n'existe **aucune** route `dpe/[coproprieteId]` (contrairement à PPT) → clic = 404.
3. **Drift `settings/info` ↔ onboarding** : la même donnée (lots, clés, copropriétaires) est **mockée** dans `settings/info` alors que `onboarding/[id]` l'écrit réellement en base (`coproprietaires`, `repartition_keys`, lots). Deux modèles coexistent → risque de copier le mauvais exemple. À réconcilier sur le chemin onboarding réel.
4. **PPT : doublon + édition morte** : `ppt/page.tsx` (vue copro via CoproContext) et `ppt/[coproprieteId]/page.tsx` rendent quasi la même chose ; la version `[coproprieteId]` a `onEdit`/`onDelete` = no-op explicites.
5. **Templates PV à moitié implémentés** : `usePVTemplates` expose `duplicateTemplate`, `setAsDefault`, `exportTemplate`, `importTemplate`, `updateSection`, `toggleSection`, `reorderSections`, `updateTemplateSpec` qui **retournent tous `null`/`false` (TODO)** — pourtant la page `templates` câble des boutons Importer/Dupliquer/Exporter/Défaut dessus → actions silencieusement sans effet. `getValidationStatus` renvoie toujours « valide » en dur.
6. **Lien preview template mort** : `useTemplatesPage.handlePreview` route vers `/settings/templates/{id}/preview`, **route inexistante** (pas de dossier `preview`) → 404.
7. **IDs templates en dur** : `useTemplatesPage` utilise `MOCK_ORG_ID='org-001'` / `MOCK_USER_ID='user-001'` → multi-tenant non réel, `pv_templates` filtré sur une org factice.
8. **Redirect cible login vs callback** : `auth/login` envoie sur `/portefeuille`, `auth/callback` par défaut sur `/dashboard` → incohérence de destination post-auth.
9. **`maintenance/ppt`** redirige vers `/conformite/ppt` (doublon historique assumé, OK mais à noter pour le nettoyage de routes).
10. **`settings` index = placeholder** : `informationsCopro` vide en dur + deux cartes masquées par `TODO go-live` (visibilité, factures cabinet) → écran à finir.

## Objets DB réels touchés par la zone (synthèse)

- **Tables** : `copros`, `memberships`, `coproprietaires`, `accounts`, `accounting_periods`, `budgets`, `budget_lines`, `call_for_funds`, `ledger_transactions`, `ledger_entries`, `repartition_keys`, `repartition_key_lines`, `pv_templates`, `reminder_settings`, `payment_reminder_rules`, `email_templates`, `ag_meetings`, `ag_pending_actions` ; vue `v_lots_with_owners`.
- **RPC** : `provision_copro_chart`, `set_opening_balance`, `get_opening_balance`, `resolve_lot_tiers_account`, `repartition_key_is_complete`, `post_budget_call_for_funds`, `create_ledger_transaction`, `audit_finance_integrity`, `increment_template_usage`.
- **Edge** : `run_payment_reminders`.
- **Mock (aucune base)** : Factur-X, PPT, DPE, `settings/info`.
