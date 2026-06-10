# Atlas Front — Zone 01 : AG & Gouvernance

Périmètre : `src/app/(dashboard)/ag/**` + `src/app/(dashboard)/conseil-syndical/**`
Cartographie : page → hook → `lib/ag/api/*.api.ts` / `features/ag/**` / `lib/services` → source DB.
Croisé avec `.planning/db-cible/INVENTAIRE-FONCTIONS.md` et `OBJETS-ABANDONNES.md`.

## Tableau des écrans

| Écran (route) | Rôle métier | Hooks principaux | Données touchées (RPC / table / edge / api) | Statut |
|---|---|---|---|---|
| `ag/` (page.tsx) | Accueil AG « legacy » (prochaine AG, brouillons, historique, stats) | `useAgMeetings`, `useAgDrafts` | table `v_ag_overview`, `ag_meetings`, `ag_session_drafts` | **DOUBLON / MORT** — non routé (nav pointe `/ag/dashboard`) ; duplique `ag/dashboard` |
| `ag/dashboard/` | Tableau de bord AG canonique (onglets en cours / archives) | `useAgDashboardPage` | `v_ag_overview`, `ag_meetings` (+ closed AGs) | actif (cible nav) |
| `ag/new/` | Étape 1 — planifier l'AG (type, date, lieu, budget) | `useAgNewPage`, `useBudgetImport` | RPC `createAg` (meetings.api), `v_budgets_overview`, Google Maps | actif |
| `ag/[id]/edit/` | Étape 1 (édition d'une AG existante) | `useAgEditPage` | table `ag_meetings`, `ag_resolutions` | actif |
| `ag/[id]/agenda/` | Étape 2 — ordre du jour (résolutions, variables, réordonnancement) | `useAgAgendaPage`, `useSyndicContract` | `ag_resolutions`, `v_ag_resolutions_results`, `ag_meetings`, `contracts` | actif |
| `ag/[id]/resolutions/new/` | Ajouter une résolution custom à l'OJ (+ échéancier appel de fonds) | `useNewResolutionPage` | via `addResolution` → `ag_resolutions` | actif |
| `ag/[id]/convocation/` | Étape 3 — preview + annexes + génération convocation | `useConvocationPage` (`useConvocationAccountingData`, `…Coproprietaires`, `…Documents`, `…Resolutions`) | RPC `fn_annexe_1..5`, `rpc_get_ag_coproprietaires`, `updateAgCurrentStep`, table `ag_meetings`, `document_links`, edge `ag_generate_document` | actif (à problème : voir anomalies) |
| `ag/[id]/envoi/` | Étape 4 — choix des modes d'envoi + expédition convocations | `useAgEnvoiPage`, `useAgNotifications` | RPC `rpc_get_ag_coproprietaires`, `get/save_ag_envoi_choices`, `rpc_get_ag_convocation_bundle`, `save_ag_wizard_state`, `get_ag_recipients` ; edge `ag_send_convocations` / `ag_send_relance` ; table `ag_notifications` | **à problème** — île `ag_notifications` + RPC notifications abandonnées |
| `ag/[id]/votes-correspondance/` | Étape 5 — saisie votes correspondance (papier) + suivi | `useCorrespondenceVotes` | `ag_meetings`, `ag_votes`, RPC correspondance (`lib/ag/correspondence.ts`) | actif |
| `ag/[id]/votes-correspondance/[coproId]/` | Saisie votes correspondance pour 1 copro | `useVotesCorrespondanceCoproPage` | `v_coproprietaires_overview`, `ag_resolutions`, `ag_votes`, RPC `save_votes_correspondance` | **MORT** — aucune route entrante (parent utilise un `<select>` inline) |
| `ag/[id]/feuille-presence/` | Étape 6 — émargement + quorum temps réel | `useFeuillePresencePage` | `rpc_get_ag_coproprietaires`, `v_ag_attendance_summary`, `compute_ag_quorum`, table `ag_attendance` | actif |
| `ag/[id]/designation-roles/` | Désignation président/secrétaire/scrutateur/CS pendant l'AG | `useDesignationRolesPage` | `ag_meetings`, `ag_attendance`, `v_coproprietaires_overview`, `memberships`, RPC `get/save_ag_session_draft` | **MORT** — aucun lien entrant (doublonne la désignation faite en session) |
| `ag/[id]/session/` | Étape 7 — tenue de l'AG, votes live, modales budget/ALUR | `useAgSessionPage`, `useAGStepGuard` | table `ag_votes`, `ag_meetings`, draft RPC `save/get_ag_session_draft`, `cast_vote` (via votes.api) | actif (à problème : `cast_vote` à réécrire) |
| `ag/[id]/projector/` | Affichage projecteur (token) synchronisé à la session | `useAgProjectorPage` | lecture session (realtime/draft) via token | actif |
| `ag/[id]/pv/` | Étape 8 — procès-verbal, signatures, génération PDF, activation | `usePVPage`, `useSignaturePad`, `useAGStepGuard` | RPC `rpc_get_ag_pv_bundle`, `get_ag_session_draft`, `activate_ag_decisions` ; edge `ag_generate_document` ; table `ag_meetings`, `coproprietaires` | actif |
| `ag/[id]/finalisation/` | Création auto des décisions votées (budget, ALUR, appels, CS) | `useFinalisationPage`, `useFinalisationData` | RPC `get_ag_pending_actions`, `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `generate_combined_calls_from_ag`, `mark_ag_action_activated`, `finish_ag_session` ; table `ag_meetings`, `budgets`, `budget_lines`, `accounting_periods`, `providers`, `contracts` | **à problème** — couche AG « bespoke » entièrement ABANDONNÉE (n'écrit pas le GL) |
| `ag/[id]/minutes/` | Ancien PV (lecture) | aucun (localStorage) | `localStorage` `ag-draft-*` / `ag-resolutions-*` | **MORT** — 100% localStorage, `any`, doublonne `pv/` |
| `ag/[id]/checklist/` | Checklist préparation + bouton clôture | `useAgDetail` + `ClosureRecap` | `ag_meetings` (via `getAg`) ; tâches = state local en dur | **à problème** — tâches mockées (state local), seul `ClosureRecap` est réel ; non routé |
| `ag/resolutions/` | Bibliothèque de modèles de résolutions | `useAgResolutionsPage`, `useResolutionLibrary` | constantes locales `lib/constants/resolutions` + `useAgDrafts` (ajout à une AG) | actif (cible nav) |
| `ag/resolutions/select-ag/` | Choisir l'AG cible avant de créer une résolution | `useAgDrafts` | `v_ag_overview` (drafts) | actif (utilitaire) |
| `ag/resolutions-preview/` | Démo visuelle V1/V2 du composant liste | aucun | données **en dur** (`INITIAL_RESOLUTIONS`) | **MORT** — artefact dev, aucune donnée réelle |
| `conseil-syndical/` | Liste membres CS + rapports d'activité | `useConseilSyndicalPage` | table `council_members`, `council_documents` | **à problème** — `council_documents` table ABANDONNÉE (inventaire) |
| `conseil-syndical/rapport/[id]/` | Éditeur de rapport d'activité CS | `useRapportCS` → `rapport-cs.service` | tables `rapports_activite_cs`, `sections_rapport_cs`, `annexes_rapport_cs` | actif |

## Anomalies de la zone

1. **Doublon de tableau de bord** : `ag/page.tsx` (legacy, hooks `useAgMeetings`/`useAgDrafts`, composants `AgOverview/*`) et `ag/dashboard/page.tsx` (canonique, `useAgDashboardPage`) font la même chose. La nav (`lib/config/navigation.ts`) pointe **uniquement** `/ag/dashboard`. → `ag/page.tsx` est orphelin à supprimer (et migrer ce qui sert encore).

2. **Couche AG « bespoke » abandonnée encore câblée (finalisation)** : `finalisation/` consomme `create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated` — toutes marquées ABANDONNÉES (OBJETS-ABANDONNES §1.2). Elles **n'écrivent jamais le grand livre** et doublent la chaîne canonique `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds`. À rebrancher AVANT drop (Phase 4). `finish_ag_session` a en plus des `target_table` inexistants (→ `finalize_and_activate_ag`).

3. **Île `ag_notifications` (envoi)** : `useAgNotifications` (utilisé par `envoi/`) lit `ag_notifications`, `v_ag_notification_stats` et appelle `get_ag_recipients` + edges `ag_send_convocations`/`ag_send_relance` — toute cette île est ABANDONNÉE au profit du canal légal `ag_envoi_tracking`. Drop conditionné au rebranchement des 3 edges.

4. **3 pages mortes (jamais montées, aucun lien entrant)** :
   - `ag/[id]/minutes/` — PV 100% localStorage, `any`, doublonne `pv/`.
   - `ag/[id]/designation-roles/` — doublonne la désignation déjà faite dans `session/` (modale `AjoutDesignationModal`).
   - `ag/[id]/votes-correspondance/[coproId]/` — la page parente saisit via un `<select>` inline, ne navigue jamais vers cette sous-route.
   - `ag/resolutions-preview/` — démo dev avec données en dur.

5. **Pages à données mockées** : `checklist/` affiche une liste de tâches en `useState` codée en dur (seul `ClosureRecap` est réel et branché DB). `resolutions-preview/` idem (mock). À assainir ou supprimer.

6. **`cast_vote` buggé** : le vote de session passe par `cast_vote` (votes.api), marqué **RÉÉCRIRE** dans INVENTAIRE-FONCTIONS (bug connu : garde attendance + UNIQUE). Concerne `session/` et la saisie correspondance.

7. **`council_documents` table abandonnée** : `conseil-syndical/` (`useConseilSyndicalPage` l.57) lit `council_documents` (0 ligne, table ABANDONNÉE — porte les enums conservés `council_doc_link_type`/`content_visibility`). À rebrancher sur le modèle documentaire canonique.

8. **Persistance hétérogène (drift)** : le wizard mêle DB (`ag_meetings`, RPC bundles, `save_ag_wizard_state`), brouillons RPC (`save/get_ag_session_draft`) ET localStorage (`minutes/`, restes legacy). Plusieurs pages écrivent `updateAgCurrentStep` directement — pas de source unique de l'étape.
