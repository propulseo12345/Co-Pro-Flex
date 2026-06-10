# Atlas Front — 02 · Finance : compta & trésorerie

> Zone : `src/app/(dashboard)/finance/{comptabilite,transactions,etats-dates,releves-individuels,bank-movements,mouvements-bancaires,transfer,fonds-alur,tantiemes,cles-repartition}`
> Lecture seule du code (2026-06-04). Chaîne suivie : page → hook feature → `@/hooks/modules/*` → `@/lib/*/api.ts` → DB.
> Routage de référence : `src/lib/config/navigation.ts` (sidebar) + `src/lib/config/search.ts` (recherche).
> Croisé avec `.planning/db-cible/INVENTAIRE-FONCTIONS.md` et `OBJETS-ABANDONNES.md`.

## Tableau des écrans

| Écran | Rôle métier | Hooks | Données touchées (RPC / table / edge / api) | Statut |
|---|---|---|---|---|
| `comptabilite/page.tsx` | Comptabilité légale : grand livre, balance, compte de gestion, 5 annexes, clôture d'exercice, historique | `useComptabilitePage` → `useGeneralLedger`, `useTrialBalance`, `useActivePeriod`, `useAccountingPeriods`, `useAccounts` + `lib/finance/api` ; `FinanceAnnexeStats` via `AnnexeContext` | **Vues** `v_general_ledger`, `v_trial_balance`, **tables** `accounting_periods`, `accounts` ; **RPC** `close_period` (clôture) | **Actif** (routé sidebar + search). Source = GL dérivé, conforme. |
| `transactions/page.tsx` | Suivi simple du compte bancaire (liste, solde actuel/comptable, recherche) | `useBankMovements()` | **Vue** `v_bank_movements_overview` | **Doublon partiel / quasi-mort** : non routé (absent navigation + search), aucun lien interne. Lecture seule = sous-ensemble de `mouvements-bancaires`. |
| `etats-dates/page.tsx` | Génération pré-état daté / état daté pour vente de lot (aperçu, impression, export HTML) | `useEtatsDatePage` → `useEtatsDate` | **AUCUNE** — `useEtatsDate.ts` = `MOCK_LOTS` / `MOCK_COPROPRIETAIRES` / `generateMockEtatDate` | **À problème** : routé sidebar (« État daté ») mais **100 % mock**, zéro accès DB. Écran vitrine non branché. |
| `releves-individuels/page.tsx` | Relevés de charges par copropriétaire (stats, filtres, export HTML/ZIP, modale détail) | `useRelevesIndividuels` → `useLotsWithOwners`, `useUnpaid`, `useCalls`, `usePayments` | Dérivé client des vues `v_unpaid_by_lot`, `v_calls_overview`, `v_payments_overview` (via `lib/finance/api`) | **Actif mais non routé** : aucun lien sidebar/search/interne → orphelin de navigation. Données réelles OK. |
| `bank-movements/page.tsx` | Catégorisation des mouvements non rapprochés (affectation à un compte 6/7) | `useBankMovements('unmatched')`, `useAccounts`, `useOpenPeriod`, `useReconcileBankMovement` | **Vue** `v_bank_movements_overview` ; **edge** `reconcile_bank_movement` | **Doublon / mort** : non routé, recouvert par l'onglet « catégorisation » de `mouvements-bancaires`. Bandeau « Source: Supabase » en dur. |
| `mouvements-bancaires/page.tsx` | Hub trésorerie complet : table unifiée, catégorisation + rapprochement (modale & batch), import, clôture, slide-overs | `useMouvementsBancairesPage` (gros hook) + `lib/finance/api` (`BankAccountWithBalance`) ; moteur `matching-engine` | **Vue** `v_bank_movements_overview`, **table** `bank_movements`, **edge** `reconcile_bank_movement` ; onglet Import non persisté (`handleImport` ferme la modale sans écrire) | **Actif** (routé sidebar + search). Écran canonique trésorerie. Import = TODO. |
| `transfer/page.tsx` | Formulaire de virement sortant (bénéficiaire, IBAN, montant, libellé) | aucun (4× `useState` local) | **AUCUNE** — bouton « Effectuer le virement » sans `onClick` | **Mort** : non routé, aucun handler, zéro persistance. Maquette pure. |
| `fonds-alur/page.tsx` | Suivi fonds travaux ALUR : synthèse, contributions par lot, transferts, modale transfert | `useFondsALURPage` → `useALURData` | **Vues** `v_alur_fund_summary`, `v_alur_lot_contributions`, `v_alur_transfers_history`, `v_budgets_overview` ; **table** `alur_transfers` (lecture + insert transfert) | **Actif mais non routé** : pas de lien sidebar/search ; navigation interne seulement. Objets = faux-morts GARDÉS (cf. OBJETS-ABANDONNES §2). |
| `tantiemes/page.tsx` | Tantièmes par lot / par copropriétaire, édition inline (ref + tantièmes), exemple de vote | `useTantiemesPage` → `useLots()` (`updateLot`) | **Table** `lots` (read via `v_lots_with_owners`, write via `lots`) | **Actif** (routé sidebar + search + lien depuis Réglages). |
| `cles-repartition/page.tsx` | Liste des clés de répartition (cartes, stats, validation, simulation, suppression) | `useClesRepartitionPage` → `useRepartitionKeys` + `lib/lots/api` | **Vue** `v_repartition_key_totals`, **table** `repartition_keys` | **Actif mais non routé** : pas de lien sidebar/search ; atteint via navigation interne. |
| `cles-repartition/new/page.tsx` | Création d'une clé + saisie des poids par lot | `useNewClePage` → `lib/lots/api` | **Tables** `repartition_keys`, `repartition_key_lines`, `lots` | **Actif** (enfant de cles-repartition). |
| `cles-repartition/[id]/page.tsx` | Détail/édition d'une clé : infos, poids par lot, validation, simulation | `useCleDetailPage` → `lib/lots/api` | **Vues** `v_repartition_key_lines_detailed`, `v_repartition_key_totals` ; **tables** `repartition_key_lines`, `repartition_keys` | **Actif** (enfant de cles-repartition). |

## Anomalies de la zone

1. **`etats-dates` = mock pur alors qu'il est routé dans la sidebar.** `useEtatsDate.ts` ne touche aucune table : `MOCK_LOTS`, `MOCK_COPROPRIETAIRES`, `generateMockEtatDate`, copropriété « Résidence Les Lilas » en dur. C'est l'écran le plus trompeur de la zone (légalement sensible : art. 10-1 décret 67-223). Doit être rebranché sur lots/owners/GL réels.

2. **`transfer` = maquette morte.** Aucun hook, aucun `onClick` sur le bouton de virement, non routé. Soit implémenter (initiation virement = feature trésorerie majeure), soit supprimer.

3. **Triple chevauchement trésorerie : `transactions` vs `bank-movements` vs `mouvements-bancaires`.** Les deux premiers (non routés) sont des sous-ensembles du hub `mouvements-bancaires` (seul routé). `transactions` = lecture seule ; `bank-movements` = catégorisation simple recouverte par l'onglet « catégorisation » du hub. Migration à finir : garder `mouvements-bancaires`, retirer les deux autres (dette de doublons à clore).

4. **Drift DB — objets abandonnés encore câblés dans `lib/finance/api`.**
   - `post_call_for_funds` (mono-clé) ligne 342 → **ABANDONNÉE** (supplantée par l'agrégé `post_budget_call_for_funds`, cf. INVENTAIRE §214). N'impacte pas directement les écrans de CETTE zone (appels de fonds = autre zone) mais c'est le même fichier api.
   - `v_account_balances` ligne 1471 → **vue DROP** (chemin parallèle au GL). À débrancher.

5. **Écrans réels mais non navigables (orphelins de routage) :** `releves-individuels`, `fonds-alur`, `cles-repartition` (+ enfants) fonctionnent sur données réelles mais n'ont aucun point d'entrée dans `navigation.ts`/`search.ts`. Atteignables seulement par URL directe ou navigation interne (cles via ses propres boutons). À ajouter à la sidebar ou statuer sur leur abandon.

6. **Bandeau « Source: Supabase (v_bank_movements_overview) » codé en dur** dans `bank-movements/page.tsx` (style inline + chaîne figée) — artefact de debug à retirer si l'écran est conservé.

7. **`mouvements-bancaires` onglet Import non persistant :** `handleImportMouvements` ferme la modale (`setShowImportModal(false)`) sans écrire en base (commentaire « Will be replaced by Supabase import »). Feature inachevée.
