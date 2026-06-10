# PLAN MAÎTRE — CoProFlex · Vue Copropriétaire (ancré dans le réel)

> Réécriture du brouillon initial **après l'audit du 2026-06-01** (`AUDIT_COPROFLEX.md` + interrogation live de la base `iyfesbjnkpynmwlsmxnp`). Tous les `⚠️ À CONFIRMER` du brouillon ont été remplacés par des faits vérifiés : ✅ réel · 🔁 diverge du brouillon · ❌ n'existe pas (gap).
> **Conclusion d'entrée** : ~90 % du socle de données nécessaire au portail copropriétaire **existe déjà**. Le portail est surtout (a) une **nouvelle UI** (route group `(coproprietaire)`), (b) la **réactivation de la RLS** (policies déjà écrites), (c) le **rattachement des copropriétaires à un compte de connexion** + invitation.

---

## ⚠️ Les corrections majeures par rapport au brouillon

| Le brouillon supposait… | Réalité CoProFlex |
|---|---|
| Next.js 16 **ou** TanStack Start | ✅ **Next.js 16.0.7** (App Router) — pas de TanStack |
| **Tailwind v4** | 🔁 **CSS Modules** (pas de Tailwind) |
| Vite + Nitro | 🔁 **Turbopack + Vercel** |
| Supabase self-hosted via **Coolify** | 🔁 **Supabase hébergé (cloud)**, Postgres 17 — backups gérés par Supabase |
| Auth **BetterAuth** | 🔁 **Supabase Auth** (`@supabase/ssr`) → RLS via `auth.uid()` **nativement** |
| Email **Brevo** | 🔁 **Resend** |
| PDF react-pdf/puppeteer | 🔁 **jsPDF + jspdf-autotable** (client), + jszip, pdfjs-dist |
| Table **`organizations`** (cabinet) | ❌ **N'existe pas** — pas de niveau « cabinet » en base (gap connu) |
| Créer table **`espace_acces`** | ❌ Inutile — `coproprietaires.user_id` **existe déjà** |
| Créer enum **`doc_visibilite`** | ❌ Inutile — `documents.confidentiality` **existe** (public/council/manager/restricted) |
| Créer `mes_coproprietaires()` / `mes_coproprietes()` | ❌ Inutile — helpers RLS **déjà écrits** (voir §4.5) |
| **Décision n°1 = auth Supabase vs BetterAuth** | ❌ **Faux problème** — l'auth EST Supabase. Le vrai blocant = RLS désactivée + `coproprietaires.user_id` non peuplé |
| décret comptable **n°2005-479** | 🔁 **n°2005-240 du 14 mars 2005** (numéro corrigé) |

---

# PARTIE 1 — INFRASTRUCTURE RÉELLE

## 1.1 Stack technique (vérifiée)

| Couche | Techno réelle |
|---|---|
| Framework | **Next.js 16.0.7** (App Router, 3 route groups : `(dashboard)`, `(gestionnaire)`, `(marketing)`) |
| UI | **React 19.2** + **CSS Modules** (Lucide icons, recharts) |
| Build / hébergement | Turbopack (dev) + **Vercel** (prod) |
| DB | **Supabase hébergé** (projet `iyfesbjnkpynmwlsmxnp`, Postgres 17) |
| Auth | **Supabase Auth** via `@supabase/ssr` 0.8 — middleware `updateSession()` |
| Email | **Resend** 6.10 (`RESEND_API_KEY` / `FROM_EMAIL`) |
| Stockage GED | **Supabase Storage** (bucket `ged` — présent mais peu utilisé en prod) |
| PDF | **jsPDF 3 + jspdf-autotable** (génération client) |
| Banque | **GoCardless** (DSP2, branché dans l'onboarding step 4) |
| Tests | **Playwright** (E2E Chromium) |
| CMS | ❌ aucun (SaaS métier) |

**Point sécurité (réécrit)** : l'auth étant **Supabase Auth**, les policies RLS s'appuient sur `auth.uid()` **sans bricolage de JWT**. Le vrai sujet n'est donc PAS « quelle source d'identité », mais : **la RLS est aujourd'hui désactivée sur 71 tables** (volontaire en dev) alors que **68 policies + ~12 fonctions helper sont déjà écrites**. Ouvrir le portail copropriétaire = réactiver/compléter ces policies (cf. §4.5) + peupler `coproprietaires.user_id`.

## 1.2 Modèle de tenancy réel

```
(pas de table « cabinet/organisation »)            ❌ gap : niveau cabinet absent en base
copros  (le syndicat des copropriétaires)           ✅ table `copros`
  └── memberships (user ↔ copro ↔ rôle)             ✅ enum membership_role
        rôles = admin · gestionnaire · membre_cs · coproprietaire · prestataire
  └── buildings (bâtiments/cages)                    ✅
  └── lots                                            ✅ (enum lot_type: appartement/cave/parking/…)
        └── repartition_key_lines (poids par clé)    ✅
  └── coproprietaires (personnes phys./morales)      ✅ (a une colonne user_id)
        └── lot_owners (M:N + indivision + historique)✅
  └── council_members (conseil syndical)             ✅ (enum council_role)
  └── accounting_periods (exercices)                 ✅
  └── ag_meetings (assemblées)                        ✅
  └── suppliers / contracts (prestataires)            ✅
```

- **Tenancy = `copros` + `memberships`.** Pas de niveau cabinet → un cabinet multi-copros n'a pas d'entité propre (gap pour le futur ; sans impact sur le portail copro).
- **Espaces = route groups Next.js**, pas une hiérarchie DB. Copro active stockée en `sessionStorage` (`coproflex_active_copro_id`).

## 1.3 Mapping « nom proposé → nom RÉEL »

| Brouillon | Réel CoProFlex | Note |
|---|---|---|
| `organizations` | ❌ inexistant | pas de cabinet en base |
| `coproprietes` | **`copros`** | |
| `memberships` | **`memberships`** ✅ | (user_id, copro_id, role) |
| `batiments` | **`buildings`** | |
| `lots` | **`lots`** ✅ | + colonnes `tantiemes_generaux/escalier/ascenseur` |
| `cles_repartition` | **`repartition_keys`** | |
| `lot_tantiemes` | **`repartition_key_lines`** | (key_id, lot_id, **weight**) |
| `coproprietaires` | **`coproprietaires`** ✅ | + `user_id`, `is_resident`, `is_company` |
| `lot_coproprietaires` | **`lot_owners`** | `share_percent`, `is_primary`, `start_date`, `end_date` |
| `exercices` | **`accounting_periods`** | statut open/locked/closed/approved |
| `budgets` | **`budgets`** | + `budget_lines`, `budget_expenses` |
| `appels_de_fonds` | **`call_for_funds`** | + `call_for_funds_lines` |
| `paiements` | **`payments`** | + `payment_allocations` (FIFO) |
| `comptes / écritures` | **`accounts`** + **`ledger_transactions`** + **`ledger_entries`** | grand livre immuable |
| `assemblees` | **`ag_meetings`** | |
| `resolutions` | **`ag_resolutions`** | |
| `votes` | **`ag_votes`** | + `ag_correspondence_votes` / `_details` |
| `pouvoirs` | **`ag_pouvoirs`** | |
| `documents` | **`documents`** ✅ | enum `confidentiality` + FK lot_id/coproprietaire_id/ag_id… |
| `prestataires / contrats` | **`suppliers`** + **`contracts`** | |
| `notifications` | **`ag_notifications`** (+`_events`) + **`payment_reminders`** | ❌ pas de table notif in-app générique |

## 1.4 Connexion Supabase — état vérifié

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` : publics ✅.
- `SUPABASE_SERVICE_ROLE_KEY` : **côté serveur uniquement, jamais exposé client** ✅ (vérifié — utilisé dans les edge functions / `lib/supabase/server`).
- **RLS** : 🔁 **71 tables désactivées (dev volontaire)** ; **68 policies + ~12 helpers déjà écrits** ; ~13 tables récentes déjà activées. → la sécurité du portail = **réactivation**, pas écriture from scratch.
- **Backups** : gérés par Supabase (hébergé), pas de Coolify → le risque P9 du brouillon disparaît (juste vérifier le plan de rétention Supabase).

---

# PARTIE 2 — PAGES & FEATURES RÉELLES (espace gestionnaire)

## 2.1 Routes réelles `(dashboard)` (gestion d'UNE copro)

| Domaine | Routes réelles | Statut |
|---|---|---|
| Dashboard | `/dashboard` | ✅ |
| Copropriétaires | `/coproprietaires`, `/coproprietaires/lots[/[id]]`, `/coproprietaires/repartition` | ✅ (création copro ajoutée 2026-06-01) |
| AG | `/ag`, `/ag/dashboard`, `/ag/[id]/{preparation,agenda,convocation,envoi,designation-roles,feuille-presence,session,projector,minutes,pv,votes-correspondance,finalisation}` | ✅ très complet |
| Finance | `/finance/{comptabilite,budgets,appels-fonds,factures,mouvements-bancaires,cles-repartition,fonds-alur,etats-dates,tantiemes,releves-individuels}` | ✅/🚧 |
| Maintenance | `/maintenance/{logbook,contracts,providers,service-orders}` | ✅/🚧 |
| Documents (GED) | `/documents/{ged,ledger,balance,expenses,annexes,closing}` | ✅ |
| Communication | `/communication/{mail,messagerie,mur}` | 🚧 (owner_id hardcodé) |
| Contentieux | `/contentieux/{impayes,litiges}` | 🚧 / ❌ litiges mock |
| Conformité | `/conformite/{dpe,ppt,facturx}` | 💡 mock |
| Conseil syndical | `/conseil-syndical` | 🚧 lecture, votes ❌ |
| Ventes/Mutations | `/ventes-impayes/ventes[/...]` | ✅ |
| Settings | `/settings/{info,reminders,templates}` | 🚧 |

## 2.2 Espace `(gestionnaire)` (niveau cabinet)

- `/portefeuille` ✅, `/onboarding` (wizard 7 étapes) ✅.
- ❌ **6 placeholders** : `/facturation`, `/reporting`, `/agenda`, `/modeles`, `/parametres-cabinet`, `/prestataires`.

## 2.3 Features transverses (vérifiées)

- PDF (jsPDF) ✅ · Email (Resend) ✅ · Import (onboarding partiel) 🚧 · Rôles (`membership_role`) ✅ · Multi-tenant strict ❌ (RLS off aujourd'hui) · Notifications in-app ❌ (seulement AG + relances).

---

# PARTIE 3 — RÉFÉRENTIEL DE CONFORMITÉ (annoté « déjà fait » / « à faire »)

Sources : loi n°65-557 (10/07/1965), décret n°67-223 (17/03/1967), **décret comptable n°2005-240 (14/03/2005)**, ALUR/ELAN, décret du 23/05/2019 (dématérialisation).

## 3.1 Acteurs et droits (fondement du portail) — inchangé sur le fond
Syndic = tout sur ses copros · Conseil syndical = tout sur SA copro · Copropriétaire = le **collectif** (PV, budget voté, RC, contrats) + **son individuel** (compte, appels, lots, votes), **jamais** l'individuel d'un autre · Occupant/locataire = rien (hors charges récupérables).
→ **Déjà encodé** par l'enum `documents.confidentiality` + les helpers RLS (§4.5).

## 3.2 Lot / copropriétaire / tantièmes — ✅ DÉJÀ BIEN MODÉLISÉ
- Tantièmes **multi-clés** : `repartition_keys` + `repartition_key_lines(weight)` ✅. (⚠️ redondance connue : `lots.tantiemes_generaux/escalier/ascenseur` doublonnent partiellement — retour #16 de l'audit.)
- Multi-lots par copropriétaire : `lot_owners` (M:N) ✅.
- **Indivision** : `lot_owners.share_percent` + `is_primary` ✅. 🔁 **Gap mineur** : pas de colonne `type_droit` (usufruit / nue-propriété) — à ajouter si tu veux gérer le démembrement finement.
- **Mutation** : `lot_owners.start_date/end_date` (jamais de DELETE) + tables `mutations`, `mutation_steps`, `etat_date_snapshots` ✅.

## 3.3 Comptabilité copropriété — socle réel
- Compta d'**engagement** : en cours de fiabilisation (sprint WP1-WP6) ; grand livre = `ledger_transactions`/`ledger_entries`, immuable après posting.
- **Compte du copropriétaire = comptes 450-x par nature** (450-1 courant, -2 travaux, -5 ALUR…) + dimension `lot_id` (cf. mémoire projet `ledger_account_model`), **pas** un compte par lot. Lu via `v_owner_statement_*` / `v_lot_balance`.
- **5 annexes** (décret 2005-240) : partiellement générées (`/documents/annexes`, `/finance/comptabilite`) 🚧.
- Budget voté → appels (`call_for_funds`) ✅. Fonds travaux ALUR art 14-2 : **D 450-5 / C 105** (cf. mémoire `alur_fonds_travaux_accounting`) ✅ modèle défini.

## 3.4 AG — majorités — ✅ DÉJÀ IMPLÉMENTÉ
art. 24 / 25 / **25-1 (passerelle)** / 26 / 26-1 / unanimité : moteur de calcul présent (`Session/utils.ts`, vues `v_ag_resolutions_results`). Le portail n'a qu'à **afficher** : majorité requise, résultat, et le vote du copropriétaire.

## 3.5 Dématérialisation (décret 23/05/2019) — cahier des charges du portail
Niveau **tous copropriétaires** (RC, EDD, carnet d'entretien, contrats, PV 3 ans, assurance, budget voté) → `documents.confidentiality = 'public'`. Niveau **individuel** (compte, relevé, décompte du lot) → filtré par `coproprietaires.user_id` / `get_user_lot_ids`. Niveau **conseil syndical** → `'council'`. → mappage direct §4.

---

# PARTIE 4 — IMPLÉMENTATION DE LA VUE COPROPRIÉTAIRE

## 4.1 Objectif — inchangé
Un espace copropriétaire conforme au décret 2019 : ses infos + lots, son compte individuel, les documents collectifs de SA copro, les AG le concernant, les notifications.

## 4.2 Les 3 cercles → **mappés sur l'existant** (`documents.confidentiality`)

| Cercle | Contenu | Mécanisme RÉEL |
|---|---|---|
| **1 — Collectif** | RC, EDD, carnet, contrats, PV (3 ans), budget voté, assurance | `documents.confidentiality = 'public'` + scoping copro |
| **2 — Individuel** | son compte, ses appels, ses lots, ses tantièmes, ses votes | filtre par `coproprietaires.user_id` + `get_user_lot_ids(copro)` |
| **3 — Restreint** | compta complète, factures fournisseurs, autres comptes | `confidentiality IN ('council','manager','restricted')` |

→ **Aucun nouvel enum à créer** : `document_confidentiality = {public, council, manager, restricted}` couvre déjà les 3 cercles.

## 4.3 Pages du portail (route group `(coproprietaire)` — Architecture A décidée)

| Route | Contenu | Source de données réelle | Cercle |
|---|---|---|---|
| `/espace/dashboard` | solde, prochaine échéance, prochaine AG, alertes | `v_coproprietaires_overview`, `v_calls_overview`, `v_ag_overview` | 1+2 |
| `/espace/mon-compte` | extrait de compte (appels, paiements, solde, ventilation) | **`v_owner_statement_lines` / `_summary`** + `generate_owner_statement` | 2 |
| `/espace/mes-lots` | lots, tantièmes par clé, quote-part indivision | `v_lots_with_owners`, `repartition_key_lines`, `lot_owners` | 2 |
| `/espace/appels` | appels reçus + PDF | `v_call_lines_detailed` (filtré sur ses lots) | 2 |
| `/espace/assemblees[/[id]]` | AG, ordre du jour, résultats, **mes votes** | `v_ag_overview`, `v_ag_resolutions_results`, `ag_votes` (filtré) | 1+2 |
| `/espace/documents` | GED collective filtrée | `documents` WHERE `confidentiality='public'` AND copro | 1 |
| `/espace/ma-copropriete` | infos copro, conseil syndical, coordonnées syndic | `copros`, `council_members` | 1 |
| `/espace/profil` | coordonnées, préférences, **consentement démat** | `coproprietaires` (+ champ `consent_demat` à ajouter) | 2 |

## 4.4 Modèle de données additionnel — **réduit au strict nécessaire**

❌ **PAS de table `espace_acces`** : le lien user↔copropriétaire existe via **`coproprietaires.user_id`** + une ligne **`memberships`** (`role='coproprietaire'`). Ce qui MANQUE réellement :

1. **Consentement dématérialisation** (décret 2019 : convocation électronique valable seulement si consentement) → ajouter sur `coproprietaires` :
```sql
ALTER TABLE coproprietaires
  ADD COLUMN consent_demat boolean NOT NULL DEFAULT false,
  ADD COLUMN consent_demat_at timestamptz;
```
2. **Flux d'invitation** (❌ inexistant) : permettre au syndic d'inviter un copropriétaire → email → l'utilisateur crée son compte Supabase Auth → on **rattache** : `coproprietaires.user_id = auth.uid()` + `INSERT memberships(user_id, copro_id, role='coproprietaire')`. (table `invitations` à créer, ou flux via Supabase Auth invite + token.)
3. (Optionnel) `lot_owners.type_droit` si gestion usufruit/nue-propriété souhaitée.

## 4.5 Politiques RLS — **réécrites avec les vrais helpers** (déjà déployés)

> Rappel : ces helpers EXISTENT déjà sur la base. On les réutilise, on n'en crée pas.
> `user_has_copro_access(p_copro_id)` · `user_owns_any_lot_in_copro(p_copro_id)` · `user_is_lot_owner(p_lot_id)` · `get_user_lot_ids(p_copro_id)` · `user_is_council_member(p_copro_id)` · `can_access_document(p_document_id, p_user_id)`.

```sql
-- Pré-requis : coproprietaires.user_id = auth.uid() pour le copropriétaire connecté.

-- CERCLE 2 — ses lignes d'appel (via ses lots)
-- call_for_funds_lines porte lot_id -> on filtre sur les lots de l'utilisateur
CREATE POLICY copro_voit_ses_lignes_appel ON call_for_funds_lines
FOR SELECT USING (
  lot_id IN (SELECT get_user_lot_ids(copro_id))
);

-- CERCLE 2 — ses lots / rattachements
CREATE POLICY copro_voit_ses_lots ON lot_owners
FOR SELECT USING (
  user_is_lot_owner(lot_id) OR user_is_copro_manager(copro_id)
);

-- CERCLE 1 — documents collectifs de SA copro
CREATE POLICY copro_voit_docs_collectifs ON documents
FOR SELECT USING (
  user_has_copro_access(copro_id) AND confidentiality = 'public'
);
-- (ou, plus fin et déjà prévu : USING (can_access_document(id, auth.uid())) )

-- CERCLE 1 — résolutions/PV de SA copro
CREATE POLICY copro_voit_resolutions ON ag_resolutions
FOR SELECT USING (
  ag_id IN (SELECT id FROM ag_meetings WHERE user_has_copro_access(copro_id))
);

-- CERCLE 2 — ses propres votes uniquement
CREATE POLICY copro_voit_ses_votes ON ag_votes
FOR SELECT USING (
  coproprietaire_id IN (
    SELECT id FROM coproprietaires WHERE user_id = auth.uid()
  )
);
```
**Règle d'or RLS (inchangée)** : DENY par défaut ; n'ouvrir que l'explicite ; aucune table sensible (`payments`, `ledger_entries`, `supplier_invoices`) ouverte au rôle `authenticated` sans filtre. **Test de non-régression** : connecté en copro A, lire les données de B → 0 ligne.

## 4.6 Visibilité documentaire — ❌ rien à créer
`documents.confidentiality` existe (enum `document_confidentiality`). Workflow syndic à l'upload : choisir la confidentialité ; défaut conseillé = `manager` (cercle 3). Les helpers `can_access_document` / `can_view_document` sont déjà écrits.

---

# PARTIE 5 — PROBLÈMES → SOLUTIONS (recalées sur le réel)

| # | Problème | État réel & solution |
|---|---|---|
| P1 | Copro voit le compte d'un autre | Helpers + policies **existent** → **réactiver la RLS** + test non-régression. |
| P2 | Indivision / usufruit | `lot_owners.share_percent`/`is_primary` ✅. **Manque** `type_droit` (usufruit/NP) — à ajouter si besoin. |
| P3 | Tantièmes mono-clé | ✅ `repartition_keys` + `repartition_key_lines` (multi-clés). (nettoyer la redondance `lots.tantiemes_*`.) |
| P4 | Compte = simple « total dû » | ✅ **déjà** : `v_owner_statement_lines/_summary` + `generate_owner_statement`. Le portail les affiche. |
| P5 | Docs tous visibles/cachés | ✅ `documents.confidentiality` + `can_access_document`. |
| P6 | Traçabilité diffusion | `ag_notifications` + `ag_notification_events` (webhooks Resend) ✅ pour l'AG ; **ajouter `consent_demat`** (§4.4). |
| P7 | Mutation écrase l'historique | ✅ `lot_owners.start_date/end_date` + `mutations`/`etat_date_snapshots`. |
| ~~P8~~ | ~~Auth ≠ Supabase~~ | ❌ **Sans objet** : l'auth EST Supabase Auth. Le vrai sujet : RLS off + `coproprietaires.user_id` à peupler + `owner_id` hardcodé à retirer (LOT 2 du plan d'audit). |
| ~~P9~~ | ~~Backup self-host~~ | ❌ **Sans objet** : Supabase hébergé gère les backups (vérifier rétention dans le dashboard). |
| P10 | Votes/majorités illisibles | Moteur AG ✅ déjà ; le portail affiche majorité + résultat + vote perso. |

---

# PARTIE 6 — CHECKLIST POUR L'IMPLÉMENTATION (recalée)

L'audit est fait → plus besoin de « mapper les tables ⚠️ ». Les vrais points :

- [ ] **Décision n°1 RECADRÉE** : ce n'est PAS « quelle auth » (c'est Supabase). C'est : **réactiver la RLS** (policies prêtes) + **peupler `coproprietaires.user_id`** + **flux d'invitation**. → c'est exactement le **LOT 2 (Phase 0)** du plan d'audit.
- [ ] Ajouter `consent_demat` (+ `_at`) sur `coproprietaires`.
- [ ] Créer le flux d'invitation copropriétaire (table `invitations` ou Supabase Auth invite + rattachement `user_id`/`memberships`).
- [ ] Décider `lot_owners.type_droit` (usufruit/NP) : oui/non pour le MVP.
- [ ] Créer le route group `(coproprietaire)` + layout dédié (nav copro, pas la sidebar syndic) + garde middleware (un `coproprietaire` ne peut pas atteindre `(dashboard)`/`(gestionnaire)`).
- [ ] Brancher les pages `/espace/*` sur les vues existantes (`v_owner_statement_*`, `v_call_lines_detailed`, `v_ag_overview`, `documents` filtré).
- [ ] Écrire/activer les policies RLS copropriétaire (§4.5) + **test de non-régression** (copro A ≠ copro B).
- [ ] Préciser la sémantique exacte de `confidentiality='public'` (= diffusable aux copropriétaires, pas internet-public) et l'appliquer à la GED.
- [ ] Phase 1 du portail = **consultation** (séquencement validé : 0→1→2→4→3).

> Tout est désormais ancré dans le réel : ce document peut servir de base directe au prompt d'implémentation de la Phase 1 (consultation). Rappel séquencement portail : **0 Fondations (auth/RLS/invitation) → 1 Consultation → 2 AG → 4 Communication → 3 Paiement**.

---

# PARTIE 7 — AUDIT LOGIQUE MÉTIER (spécification — à exécuter sur une SESSION NEUVE dédiée)

> ⚠️ Ceci est la **spécification** de l'audit, pas son résultat. À lancer dans une session propre (contexte vierge) pour un audit fiable.

**But** : avant le portail, vérifier que la logique métier **calcule juste et est conforme** au droit copro — pas seulement que les bonnes briques existent (les Parties 1-6 confirment l'existence ; la Partie 7 vérifie le **comportement**).

**Cadrage validé avec Lyes :**
- **Profondeur** : statique **+** active. Pour chaque règle : (a) lire la RPC / vue / edge function qui l'implémente vs la loi ; (b) **recalculer en lecture seule sur la boucle d'or « Le Clos Saint-Michel » (id `22222222…`, exercice 2026)** et comparer au résultat stocké.
- **Périmètre** : tout le métier syndic (9 domaines ci-dessous).
- **Livrable** : verdict **règle par règle** — ✅ conforme / ⚠️ écart / ❌ faux-manquant — + sévérité + **article de loi précis** + emplacement code + correctif proposé. → fichier `AUDIT_LOGIQUE_METIER.md`.
- **Portée** : **audit pur (lecture seule)** + **plan d'action holistique**. ⚠️ **Règle de Lyes : NE PAS corriger au fil de l'eau** — attendre la vue complète de l'infrastructure pour concevoir des correctifs qui ne cassent pas le reste.

**9 domaines audités :**
1. **AG — majorités & calcul des votes** (art. 24 / 25 / 25-1 passerelle / 26 / 26-1 / unanimité ; voix = tantièmes généraux)
2. **AG — pouvoirs** (art. 22, ≤ 3 mandats) **+ vote par correspondance** (art. 17-1 A) **+ opposants** + (non-)quorum
3. **Charges & répartition** (clés générales/spéciales art. 10 ; ventilation montant × poids / total ; somme = total / largest remainder)
4. **Compta d'engagement — grand livre** (partie double équilibrée ; classes 1/4/6/7 ; comptes 450-x par nature ; immutabilité posting ; lot_id sur 45x)
5. **Appels / paiements / imputation FIFO / cut-off / surallocation**
6. **Fonds travaux ALUR** (art. 14-2 ; D 450-5 / C 105 ; cotisation ≥ 5 % ; affectation 105 → 705)
7. **Mutations / état daté** (art. 20 ; répartition vendeur-acquéreur ; historique `lot_owners` ; accès coupé à `date_fin`)
8. **Clôture / à-nouveau / affectation du résultat** (120/110 → 450) **+ les 5 annexes comptables** (décret 2005-240)
9. **Propagation AG → budget → appels** (`close_ag → prepare → activate` ; `ag_pending_actions`)

**Méthode d'exécution (sur la session neuve)** : fan-out de 9 agents en lecture seule (statique + tests SQL read-only sur la boucle d'or), puis synthèse holistique → `AUDIT_LOGIQUE_METIER.md`. **Aucune correction au fil de l'eau** : le plan d'action issu de l'audit sera séquencé pour que les correctifs ne se cassent pas entre eux.

> **Prêt à lancer** : cette spécification (profondeur statique+actif, 9 domaines, verdicts sourcés + correctifs, lecture seule) suffit à démarrer l'audit en session neuve. Le script de fan-out existe déjà (`.../workflows/scripts/audit-logique-metier-*.js`) et est ré-exécutable tel quel.
