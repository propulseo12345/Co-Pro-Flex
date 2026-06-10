# Atlas front — Zone 06 : Copros, copropriétaires, dashboard

> 2026-06-04 — Inventaire front (lecture seule). Zone = accueil dashboard, copropriétaires, lots & répartition, portefeuille.
> Chaîne suivie : page → hook (`src/hooks/modules`, `src/features`) → couche API (`src/lib/*/api.ts`) → vue/RPC/table Supabase.

## Périmètre réel des routes

La demande citait `(dashboard)/{dashboard,coproprietaires,copros,portefeuille,lots}`. Les chemins réels :

- **Pas de dossier `copros/` ni `lots/` à la racine.** Les lots vivent sous `(dashboard)/coproprietaires/lots`.
- **`portefeuille` est dans l'espace `(gestionnaire)`**, pas `(dashboard)` : `src/app/(gestionnaire)/portefeuille/page.tsx`.
- La notion « copros » (liste des copropriétés) = la page **Portefeuille** (`.from('copros')`). Il n'existe pas d'écran CRUD `copros` dédié dans le dashboard ; on choisit une copro via le portefeuille → `setActiveCopro` → `/dashboard`.

## Tableau des écrans

| Écran | Rôle | Hooks | Données touchées (RPC/table/edge/api) | Statut |
|---|---|---|---|---|
| `(dashboard)/dashboard/page.tsx` | Accueil copro : bento KPIs (trésorerie, AG, budget, ODS), priorités, activité | `useDashboardMainPage` → `useDashboardData` → `lib/dashboard/api` ; `useCopro` | **vues** `v_dashboard_kpis`, `v_dashboard_recent_activity`, `v_dashboard_todos` ; **RPC** `fn_dashboard_kpis` (complément travaux, best-effort) + `getActiveAccountingPeriod` | **actif** |
| `(dashboard)/coproprietaires/page.tsx` | Annuaire copropriétaires + KPI strip (solde global, impayés), onglets COPRO/LOCATAIRE/ANCIEN, CRUD via modal | `useCoproprietairesPage` → `useCoproData`/`useCoproprietaires` → `lib/owners/api` | **vue** `v_coproprietaires_overview` (read) ; **tables** `coproprietaires` (insert/update), `lot_owners` (archive = set `end_date`) | **actif** — onglet LOCATAIRE toujours vide (non supporté DB, codé en dur) |
| `(dashboard)/coproprietaires/lots/page.tsx` | Grille Lots × clés de répartition (tantièmes), CRUD lots+clés, édition poids, affectation propriétaire | `useLotsRepartitionGrid` → `useLotsData` (`useLots`/`useRepartitionKeys`) + `lib/lots/api` + `lib/owners/api` | **vues** `v_lots_with_owners`, `v_repartition_key_lines_detailed`, `v_repartition_key_totals` ; **tables** `lots`, `repartition_keys`, `repartition_key_lines`, `lot_owners` ; **RPC** `assignOwnerToLot`/`upsertRepartitionKeyLine` (via api) | **actif** |
| `(dashboard)/coproprietaires/lots/[id]/page.tsx` | Fiche lot : sidebar (infos, parts d'emprunt, avances) + répartition par clé | `useLotDetailPage` → `useLot` (`lib/lots/api.getLot`) + requêtes directes | **vues** `v_repartition_key_lines_detailed`, `v_repartition_key_totals`, `v_lots_with_owners` ; **tables** `collective_loan_shares`+`collective_loans`, `treasury_advances` | **à problème** (faux morts, voir anomalies) |
| `(dashboard)/coproprietaires/repartition/page.tsx` | — | aucun | `redirect('/coproprietaires/lots')` | **mort / stub** (redirect legacy, non listé en nav) |
| `(gestionnaire)/portefeuille/page.tsx` | Liste consolidée des copropriétés + KPIs portefeuille + alertes reprise de mandat ; sélection → active la copro | `usePortefeuille` ; `getRepriseResidual` ; `setActiveCopro` | **tables** `copros` (read) ; **vue** `v_dashboard_kpis` ; **RPC** `ensure_dev_membership` (dev bootstrap) + RPC résidu reprise | **à problème** (KPIs en dur, `ensure_dev_membership`) |

## Sources de données clés de la zone

- **Vues lues** : `v_dashboard_kpis`, `v_dashboard_recent_activity`, `v_dashboard_todos`, `v_coproprietaires_overview`, `v_lots_with_owners`, `v_repartition_key_lines_detailed`, `v_repartition_key_totals`.
- **RPC** : `fn_dashboard_kpis` (GARDÉ — INVENTAIRE-FONCTIONS §54), `ensure_dev_membership` (DEV-only, **abandonnée prod** — OBJETS-ABANDONNES §1.2).
- **Tables en écriture** : `coproprietaires`, `lots`, `repartition_keys`, `repartition_key_lines`, `lot_owners`.

## Anomalies de la zone

1. **`coproprietaires/repartition` = route morte.** Simple `redirect` vers `/coproprietaires/lots`, absente de la nav (`navigation.ts`). Vestige d'un ancien découpage → à supprimer (la cible n'a qu'un écran « Lots & Répartition »).

2. **Portefeuille — KPIs câblés mais majoritairement en dur.** `usePortefeuille` mappe `copros` + `v_dashboard_kpis`, mais force `nombreLots: 0`, `tauxRecouvrement: 100`, `facturesEnRetard: 0`, `budgetTotal: 0`, `mouvementsNonRapproches: 0`. Tout le moteur `calculateCriticalityScore`/`calculateKPIs` tourne donc sur des zéros → score de criticité, taux de recouvrement et alertes du portefeuille sont **factices**. Le « nombre de lots » affiché en header est faux.

3. **`ensure_dev_membership` appelé en prod-path.** Dans `usePortefeuille` (l.125) et `activeCopro.ts` (l.94). Fonction explicitement **abandonnée prod** (OBJETS-ABANDONNES §1.2, artefact DEV-only). À retirer avant cible.

4. **Onglet LOCATAIRE mort.** `coproprietaires/page.tsx` affiche un onglet Locataires qui renvoie toujours `[]` (commentaire « n'existe pas dans Supabase »). UI présente, feature inexistante.

5. **Fiche lot — dépendances sur des faux morts 0-ligne.** `useLotDetailPage` lit `collective_loan_shares`/`collective_loans` (emprunt collectif, branchement GL `post_collective_loan` non câblé) et `treasury_advances` (avances, `treasury_advances.owner_id` 12/12 NULL → dénormalisation morte). Sections « parts d'emprunt » et « avances » s'afficheront systématiquement vides tant que la feature emprunt/avances n'est pas branchée.

6. **`v_coproprietaires_overview` renvoie des doublons.** L'API (`lib/owners/api.ts`) déduplique manuellement par `id` (Map) en `listCoproprietaires` et force `.limit(1).single()` en `getCoproprietaire` — symptôme d'un défaut de la vue (probable jointure lots/lot_owners non agrégée). Drift de vue à corriger côté DB cible.

7. **`archiveCoproprietaire` ≠ archivage réel.** « Archiver » pose seulement `end_date` sur `lot_owners`. Un copropriétaire **sans lot** ne sera pas archivable (aucune ligne à dater) ; le bouton restera silencieusement sans effet. Le statut ANCIEN est dérivé de `lot_owners.end_date` via la vue.

8. **Doublon partiel de source KPI.** Le dashboard combine `v_dashboard_kpis` (vue) **et** `fn_dashboard_kpis` (RPC) pour des champs travaux, avec logique « ne pas écraser ». Deux chemins pour les mêmes KPIs → risque de divergence ; à consolider en une source unique côté cible.
