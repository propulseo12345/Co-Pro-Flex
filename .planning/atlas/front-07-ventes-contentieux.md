# Atlas front — 07 · Ventes, impayés, contentieux

Zone cartographiée : `src/app/(dashboard)/{ventes-impayes, sales, contentieux, dossiers}/**`
Date : 2026-06-04 · Lecture seule (repo + crois. db-cible)

## Vue d'ensemble routage

La navigation sidebar (`src/lib/config/navigation.ts`) n'expose QUE `Contentieux > Impayés` (`/contentieux/impayes`) et `Contentieux > Litiges` (`/contentieux/litiges`).
Les routes `/ventes-impayes/**`, `/sales`, `/dossiers` ne sont **dans aucun menu** ; seules des liaisons internes (quick-links du dashboard `ventes-impayes`, liens `Link` entre écrans ventes) y mènent. Le middleware (`lib/supabase/middleware.ts`) protège `/ventes-impayes` (donc route prévue), mais l'entrée utilisateur est absente du nav principal.

## Tableau des écrans

| Écran | Rôle métier | Hooks | Données touchées (RPC/table/edge/api) | Statut |
|---|---|---|---|---|
| `/ventes-impayes` (`page.tsx`) | Dashboard de la zone : stats ventes + impayés critiques, relances groupées | `useVentesImpayesDashboard` → `useVentesContext`, `useCopro`, `lib/impayes/api` | **Lecture** vue `v_unpaid_with_reminders` (impayés) + `v_mutations_overview` (via VentesProvider→`lib/sales/api`). Impayés critiques **fallback constantes `IMPAYES_CRITIQUES`** si vide | Actif mais **non routé dans le nav** ; data partiellement réelle |
| `/ventes-impayes/ventes` (`page.tsx`) | Liste des mutations (ventes de lots), filtres, création | `useMutations` (feature `ventes`) | **Lecture** `v_mutations_overview` ; **création** insert `mutations` (`mutationsApi.createMutation`) | Actif (chaîne Supabase réelle) |
| `/ventes-impayes/ventes/nouvelle` (`page.tsx`) | Formulaire riche nouvelle vente (acquéreur/notaire/docs/OS) | `useNouvelleVenteForm` → `useVentes`→`useVentesContext` | Écrit via `createVente` (VentesProvider → `lib/sales/api` insert `mutations`). **MAIS** `MOCK_COPROPRIETAIRES`/`MOCK_LOTS` = **tableaux vides** (TODO Supabase) → lot/vendeur jamais résolus | **À problème** (mocks vides codés en dur, listes lot/vendeur non câblées) |
| `/ventes-impayes/ventes/[id]` (`page.tsx`) | Détail mutation : timeline, génération état daté, signature, validation | `useMutationDetail` (feature `ventes`) | **Lecture** `v_mutations_overview`, `v_etat_date_latest` ; **edges** `generate_etat_date`, `validate_mutation`, `get_document_signed_url` | Actif (chaîne réelle + edges) |
| `/ventes-impayes/impayes` (`page.tsx`) | Suivi impayés : workflow relances, mise en demeure, contentieux, export PDF/CSV, relances groupées | `useImpayesPage` (`components/features/ventes-impayes/impayes`) | **Lecture** `v_unpaid_with_reminders`, `v_payment_reminders_overview` ; **fallback `MOCK_IMPAYES`** si vide/erreur. **Écritures relances = simulées** (`setTimeout`+`setState`, AUCUN insert `payment_reminders`). PDF→`autoFileToGED` | **À problème** : lecture réelle mais relances/règlement **non persistés** (in-memory) |
| `/contentieux/impayes` (`page.tsx`) | Idem `/ventes-impayes/impayes` | `useImpayesPage` (même hook) | Identique ci-dessus | **DOUBLON byte-à-byte** de `/ventes-impayes/impayes` (seul ce chemin est dans le nav) |
| `/contentieux/litiges` (`page.tsx`) | Liste/gestion des litiges (voisinage, travaux, charges) | aucun (composant statique) | `MOCK_LITIGES = []` codé en dur. **Boutons « Nouveau litige » / « Voir détails » sans handler**. TODO « table litiges à créer » | **À problème** : 100 % mock, aucune table, aucune action câblée |
| `/sales` (`page.tsx`) | Workflow ventes (liste + détail + génération docs + envoi notaire) | `useSalesPage` → `useVentesContext` | Lecture via VentesProvider (`v_mutations_overview`). **Toutes les mutations locales** (create/generateDocument/sign/sendToNotaire) = `setState` **non persisté** ; `MOCK_LOTS` codés en dur | **DOUBLON / quasi-mort** : recoupe `/ventes-impayes/ventes`, hors nav, écritures fictives |
| `/dossiers` (`page.tsx`) | Mini-kanban tâches/dossiers de la copro (CRUD) | `useDossiers` → `useCopro` | Table `dossiers` (select/upsert/delete, cast `any`, tolère 42P01) | **MORT à supprimer** : table `dossiers` = **DROP décidé (db-cible A5)**, module tâches hors périmètre, hors nav |

## Anomalies de la zone

1. **Doublon impayés (byte-à-byte).** `/contentieux/impayes` et `/ventes-impayes/impayes` importent le même `useImpayesPage` et les mêmes composants — deux routes pour un seul écran. Seul `/contentieux/impayes` est dans le nav. À fusionner (garder un chemin, rediriger l'autre).

2. **Deux implémentations de « ventes » concurrentes.**
   - Moderne : feature `src/features/ventes` (`useMutations`/`useMutationDetail` → `mutationsApi` → `v_mutations_overview`, edges) montée sous `/ventes-impayes/ventes/**`.
   - Legacy : page `/sales` + `useSalesPage` + `VentesProvider` (→ `lib/sales/api`, mêmes tables `mutations`/`mutation_steps` mais écritures locales fictives, `MOCK_LOTS`).
   Les deux tapent la même table `mutations` mais via deux couches. `/sales` est hors nav, ses actions ne persistent pas → **migration inachevée, à clore (garder la feature `ventes`, retirer `/sales`).**

3. **Relances impayés non persistées.** `useImpayesPage.handleSendRelance` / `handleSendRelancesGroupees` / `handleMarkAsRegle` simulent (`setTimeout` + `setState`) sans jamais appeler `impayesApi.createPaymentReminder` / `markReminderSent` (qui existent pourtant). Le workflow de recouvrement est purement visuel ; rien n'arrive dans `payment_reminders`. Idem « marquer réglé » : aucun encaissement comptable (cf. règles d'imputation, hors scope ici mais à relier).

4. **Litiges = coquille vide.** `/contentieux/litiges` : `MOCK_LITIGES = []`, aucune table, boutons sans `onClick`. Module non implémenté.

5. **`/dossiers` à supprimer (objet abandonné).** La table `dossiers` est explicitement **DROPPÉE** dans le blueprint cible (06 §9 / 05 §1, décision USER A5). L'écran et `useDossiers` doivent être retirés (le hook tolère déjà l'absence de table via code 42P01). 0 doc GED ne pointe dessus.

6. **Formulaire « nouvelle vente » à demi-câblé.** `MOCK_COPROPRIETAIRES`/`MOCK_LOTS` sont des tableaux vides (TODO Supabase) → les sélecteurs lot/vendeur/acquéreur ne se peuplent jamais ; `createVente` part avec `vendeur`/`lotType` vides. Sélecteurs à brancher sur `fetchAvailableLots` (déjà présent dans `mutationsApi`) et la liste copropriétaires.

7. **Fallback mock masquant l'état réel.** Dashboard zone + impayés retombent sur des constantes (`IMPAYES_CRITIQUES`, `IMPAYES_BREAKDOWN`, `MOCK_IMPAYES`, chiffres `12450/65`) quand la copro n'a pas de données — risque d'afficher des montants fictifs comme s'ils étaient réels.

## Objets DB confirmés (croisement db-cible)

- **Gardés/vivants** : `v_mutations_overview`, `v_mutation_detail`, `v_etat_date_latest`, `mutations`, `mutation_steps` (INVENTAIRE-FONCTIONS / T3-objets-abandonnes : « faux mort câblé `lib/sales/api.ts` → GARDER »), `etat_date_snapshots`, vues `v_unpaid_by_lot` / `v_unpaid_with_reminders` / `v_payment_reminders_overview`, `payment_reminders` / `payment_reminder_rules`, `call_for_funds_lines`.
- **Edges vivantes** : `generate_etat_date`, `validate_mutation` (à réécrire côté DB — loi A3, ne solde pas le 450), `get_document_signed_url`. RPC `upsert_mutation_step` (via `lib/sales/api`).
- **À DROP / mort** : table `dossiers` (A5) → écran `/dossiers` + `useDossiers` à retirer.
