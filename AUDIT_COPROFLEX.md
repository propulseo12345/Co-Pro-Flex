# 🗺️ AUDIT & CARTOGRAPHIE — CoProFlex

> **Date** : 2026-06-01 · **Méthode** : exploration lecture seule + 12 agents d'audit parallèles + vérification live de la base Supabase (`iyfesbjnkpynmwlsmxnp`) et des advisors sécurité.
> **Périmètre** : `Co-Pro-Flex/` (1 585 fichiers TS/TSX, 132 pages, 25 edge functions, 105 migrations, 84 tables).
> **Nature** : photographie de l'état réel du code au 2026-06-01, pas un jugement sur les intentions. Là où deux sources se contredisent, l'arbitrage est explicité.

---

## 1. Résumé exécutif (pour product owner)

CoProFlex est un **SaaS de gestion de copropriété (marché français) déjà très avancé** : Next.js 16 / React 19 / TypeScript strict, **100 % branché sur Supabase** (et non « mock / Supabase prévu » comme l'affirment encore `CLAUDE.md` et `AGENTS.md` — doc obsolète). L'application couvre 3 espaces (cabinet syndic, gestion d'une copro, site marketing) et **~11 modules métier**, dont la plupart sont fonctionnels et conformes au droit français (loi 65-557, décrets 67-223 / 2005-240, ALUR). Le module **Assemblées Générales est complet et impressionnant** (wizard de bout en bout, votes temps réel, votes par correspondance, pouvoirs, PV, finalisation auto). La **comptabilité a été refondue** autour du grand livre comme source unique de vérité (sprint WP1→WP6 fin mai/juin) ; le ledger est désormais réellement alimenté. **Trois chantiers bloquent un vrai go-live** : (1) **l'authentification réelle n'est pas branchée** — un `owner_id` est codé en dur (`f76855bb-…`) et la RLS est désactivée sur 71 tables ; (2) des **poches de mock** subsistent (conformité 2026 DPE/PPT/Factur-X, contentieux/litiges, marketplace prestataires, création de facture) ; (3) **aucun paiement en ligne ni portail copropriétaire** n'existe. La dette est surtout de l'**accumulation** (doublons de routes EN/FR, `console.log`, `any`, fonctions `@deprecated`), pas des bugs actifs. **Pour une démo crédible**, le travail tient en ~2 semaines ; pour une **mise en production multi-clients**, l'auth + RLS sont incontournables.

---

## 2. Stack technique réelle

### 2.1 Socle

| Tech | Version | Usage |
|------|---------|-------|
| **Next.js** | 16.0.7 | App Router (3 route groups), SSR, middleware |
| **React** | 19.2.1 | UI |
| **TypeScript** | 5.9.3 | `strict: true`, 14 path aliases (`@/…`) |
| **CSS Modules** | natif | styles scopés (pas de Tailwind, pas d'inline) |
| **@supabase/ssr** | 0.8.0 | auth SSR + refresh session via middleware |
| **@supabase/supabase-js** | 2.91.1 | client DB (browser + server) |
| **Supabase** | Postgres 17 | DB, Auth, Edge Functions (Deno 2), Storage (50 Mio) |
| **Resend** | 6.10.0 | emails transactionnels (convocations, relances, mail) |
| **GoCardless** (ex-Nordigen) | — | agrégation bancaire DSP2 (onboarding step 4) |
| **jsPDF** + jspdf-autotable | 3.0 / 5.0 | génération PDF (PV, convocations, annexes, états datés) |
| **pdfjs-dist** | 5.5 | prévisualisation PDF (GED) |
| **recharts** | 3.6 | graphiques KPI |
| **@dnd-kit** | 6.3 | drag & drop (ordre du jour, kanban) |
| **lucide-react** | 0.555 | icônes |
| **date-fns** (+ -tz) | 4.1 | dates / fuseaux |
| **jszip** | 3.10 | export ZIP documents |
| **@playwright/test** | 1.58 | tests E2E (Chromium) |
| **ESLint** | 9 + eslint-config-next | lint (no-console: warn, no-explicit-any: warn) |

> ⚠️ **Non utilisés malgré la doc** : React Hook Form et Zod sont annoncés « prévus » mais **absents** du `package.json` → **aucune validation de formulaire systématique** (cf. dette §5).

### 2.2 Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (strict, mais **pas en CI**) |
| `npm run test:e2e` / `test:e2e:ui` | Playwright |
| `npm run audit:pages` | `scripts/audit-pages-loc.mjs` — audit LOC (page ≤250 ok / ≤400 warn) |
| `npm run css:ag:check` | `scripts/check-ag-css.js` — taille des CSS modules AG |

`scripts/` contient aussi 5 codemods `fix-*-a11y.js` (ponctuels, hors npm) et `audit-storage.ts` (non exécuté).

### 2.3 Variables d'environnement (noms uniquement — `.env.local` **non versionné** ✅)

| Variable | Exposée navigateur | Usage |
|----------|:---:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | client Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | JWT rôle `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | edge functions (bypass RLS) — **jamais exposé côté client** ✅ |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | ❌ | config CLI |
| `RESEND_API_KEY` / `FROM_EMAIL` (alias `MAIL_FROM_ADDRESS`) | ❌ | emails |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ | autocomplétion adresse AG (optionnel) |
| `NEXT_PUBLIC_DEFAULT_COPRO_ID` | ✅ | override copro active en dev |
| `GOCARDLESS_SECRET_ID` / `GOCARDLESS_SECRET_KEY` | ❌ | banking (référencées en code, **non configurées** en local) |

### 2.4 Déploiement & config

- **Vercel** (front) — `next.config.ts` minimaliste : seulement `redirects()` (12 redirections 307 EN→FR), pas d'optimisation images, pas de headers CSP/CORS, pas de Turbopack config.
- **Supabase** hébergé (projet `iyfesbjnkpynmwlsmxnp`), `config.toml` : Postgres 17, Storage 50 Mio, `minimum_password_length: 6` (faible, dev).
- **`.gitignore`** correct : `.env*`, `.next`, `.vercel`, `.backup/`, assets binaires métier exclus.

---

## 3. Cartographie des features (feature map)

**Légende statut** : ✅ Terminé · 🚧 En cours · ❌ Cassé · 💡 Squelette (UI ou schéma sans l'autre)

### 3.1 Vue d'ensemble par espace

| Espace (route group) | Rôle | Pages | État global |
|---|---|---|---|
| **`(marketing)`** | Site public | 13 | ✅ 100 % réel (accueil, à-propos, blog SSG, tarifs, contact, CGU, confidentialité, mentions, sécurité, FAQ, comparaison, comment-ça-marche) |
| **`(gestionnaire)`** | Niveau cabinet syndic | ~11 | 🚧 Portefeuille + Onboarding 7 étapes réels ; **6 placeholders** |
| **`(dashboard)`** | Gestion d'UNE copro | ~107 | 🚧 majorité fonctionnelle ; poches de mock + doublons |
| `auth/` + `api/` | Login + APIs | 2 + 7 | ✅ login Supabase, callback, banking ×4, mail ×2 |

**Espace gestionnaire — détail** : `portefeuille` ✅ (sélection copro active → `sessionStorage`), `onboarding` ✅ (wizard 7 étapes : copro → copropriétaires → lots/clés → comptes bancaires GoCardless → budget → AG/appels → reprise soldes). **Placeholders « arrive prochainement »** (composant `PlaceholderPage`) : `agenda`, `facturation`, `parametres-cabinet`, `modeles`, `reporting`, `prestataires`. `onboarding/new` = redirect déprécié.

### 3.2 Modules métier (espace dashboard)

#### ✅ Assemblées Générales (AG) — le module le plus abouti
- **Routes** : `ag/`, `ag/new`, `ag/[id]/{preparation, agenda, convocation, envoi, designation-roles, feuille-presence, session, projector, minutes, pv, votes-correspondance[/[coproId]], resolutions[/new], edit, finalisation, checklist}`.
- **Tables** : `ag_meetings, ag_resolutions, ag_attendance, ag_votes, ag_correspondence_votes(_details), ag_pouvoirs, ag_notifications(_events), ag_envoi_tracking, ag_session_drafts, ag_pending_actions, ag_milestones`.
- **Edge functions / RPC** : `ag_create, ag_add_resolution, ag_cast_vote, ag_close, ag_register_attendance, ag_send_convocations, ag_send_relance, ag_start_session, ag_generate_document` + RPC `finish_ag_session, get_ag_live_results, register_correspondence_vote, create_budget_from_ag, create_alur_fund_from_ag, elect_council_from_ag, mark_ag_action_activated, rpc_get_ag_pv_bundle`.
- **Couverture** : création, 195+ modèles de résolutions (banque + custom, variables typées), convocation (Resend, délai légal 21 j), feuille de présence + quorum, désignation bureau, **session live + votes temps réel**, **calcul des majorités art. 24/25/25-1/26/26-1/unanimité avec passerelles**, **votes par correspondance** (art. 17-1 A), **pouvoirs/mandats** (max 3, art. 20-1/21), PV + signature, **finalisation auto** (`ag_pending_actions` → budget/ALUR/conseil).
- **Réserves** : génération PDF (`ag_generate_document`) = **rendu pdf-lib incomplet** (squelette) ; double persistance brouillon (Supabase `ag_session_drafts` + sessionStorage) = risque de course ; la propagation auto AG→copro existe mais doit être fiabilisée (chantier WP2, cf. §6).

#### 🚧 Finance / Comptabilité — refondue autour du grand livre
- **Architecture** : **grand livre = source unique de vérité**, 4 RPC canoniques `post_call_for_funds`, `post_owner_payment`, `post_supplier_invoice`, `post_supplier_payment` ; ledger immuable après *posting* (triggers), partie double équilibrée, `lot_id` obligatoire sur comptes 45x.
- **Sous-modules** : Budgets (courant/travaux/ALUR) ✅, Appels de fonds (mono-clé + **agrégé multi-clés** `post_budget_call_for_funds`, allocation FIFO) ✅, Paiements copro (FIFO, idempotence) ✅, Factures fournisseurs 🚧, Paiements fournisseurs ✅, Grand livre / balance / annexes ✅, Clés de répartition (garde-fou `repartition_key_is_complete`) ✅, Impayés + relances (auto + manuelles) ✅, Clôture & périodes (WP5 : `open_next_period`, `approve_period`, `reopen_period`) ✅.
- **État live** : 68 écritures / 203 lignes au grand livre, 11 appels de fonds (361 lignes), 12 paiements → le ledger **est réellement alimenté** (le problème historique « grand livre vide » du 30/05 a été traité par le sprint WP1-WP6).
- **❌/💡 Résiduels** :
  - **Création de facture (`finance/factures/new`) encore simulée** — `useNewFacturePage.ts:69` appelle `setTimeout()` au lieu de `create_supplier_invoice` → **vérifié, toujours présent** (risque de perte de donnée).
  - **Fonds ALUR** : appel crée bien `C 105`, mais **affectation travaux `105→705` non implémentée** (💡).
  - **Rapprochement bancaire** : pas d'auto-match / lettrage.
  - **États datés / tantièmes / annexes 2-5** : exports PDF formels non finalisés (💡).

#### 🚧 Maintenance
`logbook` (carnet) ✅, `contracts` (alertes renouvellement, persistance réelle) ✅, `service-orders` (workflow ramené à 6 étapes + post-intervention ; ⚠️ archivage GED **simulé** `simulateGedArchive`, et `handleSaveEdit` édite en local) 🚧, `providers` (hub 3 vues syndic/copro/CoproFlex ; **marketplace CoproFlex = mock**) 🚧.

#### 🚧 Documents / GED
Arborescence dossiers N-niveaux, upload multi-fichiers, 18 catégories, versionning, prévisualisation, recherche, niveaux de confidentialité (public/conseil/manager/restreint via `document_access`) ✅. Génération auto des documents comptables (grand livre, balance, annexes) en PDF ✅. ⚠️ **Stockage Supabase Storage `ged` présent mais peu utilisé en prod** (docs de contrats encore en localStorage).

#### 💡 Conformité 2026 — **100 % mock**
`conformite/dpe`, `conformite/ppt`, `conformite/facturx` : UI complète mais **aucune table, données en `useState`/localStorage volatiles**. Obligations légales (DPE collectif 01/2026, PPT, Factur-X 09/2026) ⇒ **valeur nulle tant que non migré en base**.

#### 🚧/💡 Copropriétaires, Lots, Ventes, Communication, Conseil, Contentieux
| Domaine | Statut | Détail |
|---|---|---|
| **Lots & clés de répartition** | ✅ | CRUD complet, validation `total_weight` vs tantièmes, soft-delete |
| **Copropriétaires** | ❌ | **`createCoproprietaire` absent de `lib/owners/api.ts`** → création impossible (le formulaire existe, l'API non) — *retour #13* |
| **Rôles conseil syndical** | 💡 | enum `council_role` en base + affichage OK, mais **non assignable** (pas d'API `setRole`) + **2 schémas parallèles** (ancien VARCHAR FR / nouveau ENUM EN) — *retour #14* |
| **Ventes / Mutations** | ✅ | workflow 6 étapes, snapshots état daté JSON, ledger ALUR auto, PDF (doublon route `ventes-impayes/ventes` vs `sales`) |
| **Clé ALUR** | ❌ | indifférenciée des clés générales — à isoler (compte ledger vs clé) — *retour #15* |
| **Communication (mail/messagerie/mur)** | 🚧 | CRUD opérationnel via Resend + Supabase, **mais `owner_id` hardcodé** → toutes les boîtes partagées (cf. §5) |
| **Conseil syndical — votes/décisions** | 💡 | schéma `council_decisions/votes` prêt, **zéro UI** |
| **Conseil syndical — rapports** | 💡 | lecture OK, **édition/création manquante** |
| **Contentieux / Litiges** | ❌ | **100 % mock** : `MOCK_LITIGES = []`, table `legal_proceedings` jamais créée. Doublon `legal/disputes` ≡ `contentieux/litiges` |
| **Dossiers** | ✅ | CRUD + filtres + stats, sur Supabase |
| **Settings** (info/reminders/templates) | 🚧 | présumé opérationnel (info copro, règles de relance, modèles email) |

### 3.3 Doublons de routes EN/FR (dette historique)
6 paires (12 routes), gérées par **redirections 307** dans `next.config.ts` plutôt que supprimées (suppression bloquée par imports croisés CSS/composants) :
`invoices`→`factures`, `bank-movements`/`transactions`→`mouvements-bancaires`, `budget-current`/`budget-works`→`budgets`, `unpaid`+`ventes-impayes/impayes`→`contentieux/impayes`, `legal/disputes`→`contentieux/litiges`, `maintenance/directory`→`providers`, `social/*`→`communication`.

---

## 4. Schéma de base de données (synthétique)

- **84 tables** (schéma `public`, live), **105 migrations** (nommage `AAAAMMJJ_niveau/action/wpN_*`), **~157 fonctions PL/pgSQL**, **~60 vues `v_*`**, plus **edge functions Deno**.
- **Migrations « disabled »** : `supabase/migrations_disabled/` (7 fichiers de tests pgTAP) + `supabase/tests/` (smoke tests `p0_*`).
- **1 migration écrite mais non appliquée** : `20260601102000_wp5_2_reopen_period_hardening.sql` (cf. `.planning/SESSION.md`).
- **Seeds** : nombreux `*_seed.sql` + **boucle d'or de test `22222222` « Le Clos Saint-Michel »** (exercice 2026 ouvert) ; copro `11111111` laissée intacte pour immutabilité du GL.

### Tables par domaine

| Domaine | Tables principales |
|---|---|
| **Cœur / multi-tenant** | `profiles`, `copros`, `memberships`, `buildings`, `lots`, `coproprietaires`, `lot_owners` |
| **Comptabilité / finance** | `accounting_periods`, `accounts`, `lot_accounts`, `repartition_keys`(+`_lines`), `budgets`, `budget_lines`, `budget_expenses`, `budget_payment_schedules`, `ledger_transactions`(68), `ledger_entries`(203), `call_for_funds`(11)(+`_lines` 361), `payments`(12), `payment_allocations`(36), `bank_movements`, `bank_matches`, `suppliers`, `supplier_invoices`(+`_lines`), `supplier_payments`, `alur_transfers`, `collective_loans`(+`_shares`), `treasury_advances` |
| **Mutations / ventes** | `mutations`, `mutation_steps`, `etat_date_snapshots` |
| **AG** | `ag_meetings`(7), `ag_resolutions`(20), `ag_attendance`, `ag_votes`, `ag_correspondence_votes`(+`_details`), `ag_pouvoirs`, `ag_notifications`(+`_events`), `ag_envoi_tracking`, `ag_session_drafts`, `ag_pending_actions`, `ag_milestones`, `email_templates` |
| **Relances** | `payment_reminder_rules`, `payment_reminders`, `reminder_settings` |
| **Maintenance** | `providers`, `contracts`, `logbook_entries`, `service_orders`(+`_events`), `insurance_policies`, `technical_documents`, `planned_works` |
| **Conseil syndical** | `council_members`, `council_decisions`, `council_votes`, `council_documents` |
| **Communication** | `wall_posts`(+`_comments`/`_likes`), `events`, `conversations`(+`_members`), `messages`, `mails`, `mail_labels_v2`, `mail_templates`, `mail_folders`, `mail_campaigns`, `mail_recipients`, `mail_inbox` |
| **GED** | `documents`, `document_folders`, `document_access`, `document_links`, `document_versions` |
| **Divers** | `dossiers`, `legal_proceedings` (table existe mais module front mock), `_rls_state_snapshot` |

> ⚠️ Les tables fondamentales `copros`/`profiles`/`lots` ne sont pas créées par une migration trouvée → probable création initiale via UI/CLI Supabase (à documenter pour reproductibilité).
> ⚠️ Doublons de tables à rationaliser : `mails`/`mail_inbox`/`mail_campaigns` (v2) vs anciens, `wall_*`.

### RLS (Row Level Security) — état & nuance importante
- **71 tables RLS désactivée** (volontaire en phase dev — décision assumée, cf. mémoire projet).
- **MAIS 68 « policy exists, RLS disabled »** : les **politiques sont déjà écrites** (migrations `action5_rls_finance`, `action6_rls_documents`, etc.) et n'attendent que la réactivation. ⇒ **réactiver la RLS = surtout une bascule + un test**, pas un chantier from-scratch.
- ~13 tables récentes ont déjà RLS activée (`dossiers`, `ag_milestones`, `alur_transfers`, `ag_pouvoirs`, `planned_works`, `insurance_policies`, `collective_loans`, `legal_proceedings`…).

---

## 5. Dette technique & points d'attention (priorisée)

### 🔴 Critique (bloque la prod multi-clients)
1. **Auth réelle non branchée** : `owner_id` codé en dur `f76855bb-62c3-4040-8fc6-7586080be9fb` en **6 endroits** (`communication/page.tsx`, `api/mail/{send,inbound}`, `useMailbox`, `useMessagerie`, `useMur`) → toutes les boîtes mail/messages/mur **partagées entre utilisateurs**.
2. **RLS désactivée sur 71 tables** → sans le middleware, l'`anon key` lit/écrit tout. (Atténuation : policies déjà écrites, cf. §4.)
3. **`ensure_dev_membership()` appelée 9× dans le front mais ABSENTE des migrations** → erreur runtime `function does not exist` (casse le portefeuille en local). *Vérifié.*
4. **Identifiants de démo en dur dans le code source** : `admin@coproflex.fr` / `gestionnaire@coproflex.fr` / `password123` → à sortir vers seed/.env.
5. **Advisors sécurité Supabase** (live) : 71 `rls_disabled`, 68 `policy_exists_rls_disabled`, **109 + 109** fonctions `SECURITY DEFINER` exécutables par `anon`/`authenticated`, **35** `function_search_path_mutable`, **14** `security_definer_view`, **3** policies `USING (true)`, **2** colonnes sensibles exposées, **1** « leaked password protection disabled ». → durcir `search_path`, revoir les droits d'exécution avant prod.

### 🟠 Important (qualité / cohérence)
6. **Validation de formulaires quasi inexistante** (Zod/RHF jamais branchés) : SIRET, IBAN, montants, emails non validés.
7. **Sauvegardes silencieuses** : `factures/new` en `setTimeout` simulé ; `service-orders handleSaveEdit` n'écrit pas ; fallbacks localStorage qui masquent des échecs Supabase.
8. **Mocks résiduels** : ~22 fichiers `mock-data` consommés par ~8 écrans → Conformité (DPE/PPT/Factur-X), Litiges, Marketplace prestataires, et quelques constantes finance.
9. **`createCoproprietaire` manquant** (#13) et **rôles CS non assignables** (#14) → flux métier cassés.
10. **2 schémas conseil syndical parallèles** (ancien FR / nouveau EN) à converger.

### 🟡 Accumulation (faible risque, gros volume)
- **130** marqueurs `TODO/FIXME` dans ~50 fichiers · **92** fonctions `@deprecated` encore utilisées · **104** `: any` (viole la convention « jamais d'any ») · **259** `console.log` résiduels · **122** `eslint-disable`.
- **Doublons EN/FR** non supprimés (redirigés) + dossiers `features/*-new` vs `features/*`.
- `next.config.ts` sans **headers de sécurité** (CSP, HSTS).
- ESLint **pas exécuté en CI**.

> **Nuance « edge functions orphelines »** : l'agent services a signalé 6 fonctions sans `functions.invoke` côté front (`ag-correspondence-eligible`, `ag-get-live-results`, `ag-register-correspondence-vote`, `generate_call_for_funds`, `generate_owner_statement`, `get_document_url`). Mais les agents AG/finance décrivent ces capacités comme **actives via appels RPC directs** (`supabase.rpc`) plutôt que via l'edge function. ⇒ **Ne pas supprimer sans vérifier** : forte probabilité de faux positifs (edge function doublonnée par une RPC).

---

## 6. Gap analysis (ce qui manque pour un SaaS syndic)

### Features métier attendues — absentes ou seulement ébauchées

| Feature attendue (SaaS syndic FR) | Présent ? | État | Priorité |
|---|:---:|---|:---:|
| **Paiement en ligne (CB / prélèvement SEPA)** | ❌ | aucun processeur (Stripe/GoCardless paiement) → les appels ne peuvent pas être réglés en ligne | 🔴 |
| **Portail / extranet copropriétaire** | ❌ | l'app est 100 % côté syndic ; les copropriétaires n'ont **pas de compte ni d'accès** à leurs documents/soldes/votes | 🔴 |
| **Authentification multi-utilisateurs + invitations** | ❌ | pas de table `invitations`, pas de tokens, onboarding = création manuelle de `memberships` | 🔴 |
| **Conformité 2026 réelle** (DPE / PPT / Factur-X) | 💡 | UI mock, sans persistance — obligations légales | 🟠 |
| **Recommandé électronique réel** (AR24/Maileva) | 💡 | service en mock | 🟠 |
| **Export comptable FEC** | ❌ | non trouvé | 🟠 |
| **Rapprochement bancaire automatique** | 🚧 | flux GoCardless OK mais pas d'auto-match/lettrage | 🟠 |
| **Annexes comptables 1-5 (décret 2005-240) PDF** | 🚧 | partiellement (annexe 1) — approbation AG impossible sans 2-5 | 🟠 |
| **Signature électronique des convocations** | 💡 | signatures PV oui, convocations non | 🟡 |
| **Contentieux / litiges** | ❌ | module mock, table absente | 🟡 |
| **Application mobile** | ❌ | web responsive uniquement | 🟡 |
| **Facturation honoraires syndic** | 💡 | placeholder cabinet | 🟡 |

### Flux utilisateurs incomplets (d'après le code + `.planning`)
- **Onboarding step 4** : comptes bancaires insérés en `account_type:'asset'` mais relus en `'bank'` → step toujours vide.
- **Onboarding step 2** : ajout copropriétaire échoue silencieusement (#8).
- **Propagation AG → état copro** : `close_ag` ne déclenche pas toujours `prepare`+`activate` (chantier WP2) → budget voté pas activé automatiquement.
- **Cabinet** : 6 modules placeholders (`agenda`, `facturation`, `parametres-cabinet`, `modeles`, `reporting`, `prestataires`).

### Ce qui est déjà solide ✅
AG de bout en bout · socle comptable en partie double (ledger source unique) · GED · maintenance · clés de répartition avec garde-fous · onboarding 7 étapes · site marketing complet · clôture/à-nouveau d'exercice (WP5).

---

## 7. Recommandations — 2 prochaines semaines

> Hypothèse : objectif **démo crédible de bout en bout** d'abord, prod multi-clients ensuite. Les estimations sont indicatives.

### Semaine 1 — débloquer les flux cassés + cohérence (démo-able)
1. **Brancher `factures/new`** sur `create_supplier_invoice` (retirer le `setTimeout`) — *~0,5 j, fort impact (boucle facture→paiement→compta complète)*.
2. **Ajouter `createCoproprietaire`** dans `lib/owners/api.ts` (#13) — *~0,5 j, débloque la création copro*.
3. **Recréer `ensure_dev_membership()` en migration** (#T3) — *~0,5 j, débloque le portefeuille en local*.
4. **Finir l'orchestrateur AG (WP2)** : `close_ag → prepare → activate` → budget voté actif, appels générés — *~3-4 j, rend la « boucle d'or » testable*.
5. **Fixer onboarding step 4** (`asset`/`bank`) + remontée d'erreur step 2 — *~0,5 j*.
6. **Migrer Litiges en base** (`legal_proceedings`) en réutilisant le template `dossiers` (#17-19) — *~1 j*.

### Semaine 2 — sécurité, conformité, finitions
7. **Brancher l'auth réelle** : remplacer les 6 `owner_id` hardcodés par `auth.uid()` / `useUser()`, sortir les comptes démo du code — *~2-3 j*.
8. **Réactiver la RLS progressivement** (1 domaine/jour : finance → AG → GED → communication) — les policies existent déjà — *~3-4 j, faible risque*.
9. **Migrer DPE/PPT vers Supabase** (Factur-X peut attendre 09/2026) — *~2 j*.
10. **Assigner les rôles conseil syndical** (#14) + converger les 2 schémas — *~1 j*.
11. **Durcir les advisors sécurité** : `SET search_path` sur les fonctions, revoir l'exécution `SECURITY DEFINER` par `anon`, activer la protection mots de passe fuités — *~1 j*.

### Hors fenêtre mais à planifier (prérequis prod réelle)
- **Paiement en ligne** (Stripe/GoCardless paiement) — *P0 post-démo*.
- **Portail copropriétaire** + **invitations multi-utilisateurs** — chantier structurant.
- Nettoyage dette : suppression réelle des doublons EN/FR, `console.log`→logger, résorption des `any`, ESLint en CI, headers de sécurité.

---

### Annexe — divergences entre sources (arbitrage)
- **Cohérence financière** : l'agent finance la dit « résolue (WP4) », l'agent gap-analysis (docs plus anciennes) parle encore de « 45 % mock / dashboard cassé ». **Arbitrage** : le sprint WP1-WP6 a bien corrigé le socle (ledger live à 68 écritures), il reste des résidus ciblés (factures/new, ALUR, annexes) — pas un dashboard « cassé ».
- **Taux de mock** : « 45 % » (docs) vs « ~0 hors litiges » (routes dashboard). **Arbitrage** : le mock est **concentré** (conformité 2026, litiges, marketplace prestataires, qq constantes finance), pas diffus.
- **Comptage tables** : 84 (live, autoritaire) vs 85/67 (agents). Retenir **84**.

*Fin de l'audit — document généré en lecture seule, aucun fichier du code source modifié.*
