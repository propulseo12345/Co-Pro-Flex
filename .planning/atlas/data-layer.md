# Atlas — Couche d'accès données (le pont hook → base)

> Vue de la couche data uniquement. L'inventaire écran par écran est fait par les agents zone.
> Repère du panorama 2026-06-04.

## 1. Le client Supabase (point d'entrée unique)

Toute la couche passe par `src/lib/supabase/` :

```
src/lib/supabase/
  client.ts      → createClient()        (createBrowserClient @supabase/ssr) — front
  server.ts      → createClient()        (server components / route handlers)
  middleware.ts  → session refresh (middleware Next)
  index.ts       → ré-exporte createClient + createServerClient
```

- Le front consomme **`createClient` (browser)** ; pas de singleton, on l'instancie à la volée dans chaque api.ts / hook.
- Anti-pattern récurrent : `const createUntypedClient = () => createClient() as any;` (vu dans council, lots, finance, mail…). Cast `any` pour contourner les types générés incomplets → trou de typage à l'échelle de la couche, à corriger lors du re-baseline DB.

## 2. Topologie : où vit la logique d'accès

L'accès base est **éclaté sur 4 strates** (c'est le principal problème structurel) :

| Strate | Localisation | Rôle | Volume |
|--------|-------------|------|--------|
| **api.ts de domaine** | `src/lib/<domaine>/api.ts` | fonctions CRUD/RPC par domaine | **14 fichiers** |
| **api.ts AG éclatés** | `src/lib/ag/api/*.api.ts` | sous-découpage du domaine AG | **8 fichiers** + `src/lib/ag/api.ts` (façade) |
| **services** | `src/lib/services/*.service.ts` | logique métier + accès (PV, contrats, GED, signature…) | **23 fichiers** |
| **hooks** | `src/hooks/` (12) + `src/hooks/modules/` (~78) + `src/features/**/hooks/` | React Query/state, appellent api.ts OU tapent la base en direct | **~90 hooks** |
| **services/recommande** | `src/services/` | seul dossier sous `src/services` : `mock.ts`/`types.ts`/`index.ts` (lettre recommandée) | 3 fichiers, isolé |

### Liste des 14 api.ts de domaine
`council, sales, mail, lots, dashboard, ag, maintenance, impayes, documents, communication, budget, owners, onboarding, finance` (+ `budget/payment-schedules.api.ts`).
`features/ventes/api/mutationsApi.ts` est le seul `api` côté `features/`.

## 3. Mode d'accès dominant : **table directe, pas RPC**

Compté sur `src/` :

- **`.from(<table>)` : ~568 occurrences / 131 fichiers** → accès table directe **massivement dominant**.
- **`.rpc(<fn>)` : ~86 occurrences / 33 fichiers** → minoritaire, concentré sur la finance/AG.
- **`functions.invoke()` : 5 occurrences / 4 fichiers** seulement (edges quasi pas appelées depuis le front : `finance/api.ts`, `convocation-dispatch.service`, `ag/api/utils`, `useAgNotifications`).
- **`fetch('/api/...')` : 4 occurrences / 2 fichiers** (`useBankConnect`, `useMailbox`) → les routes API Next sont très peu utilisées comme pont.

**Conclusion d'accès** : le front parle **directement aux tables via le client browser** (RLS = seule garde, or RLS off sur 72/87 tables en dev). La finance est l'exception : elle passe par RPC (`create_ledger_transaction`, `post_budget_call_for_funds`, périodes…), cohérent avec « GL = source unique / chaque opération = une écriture ». **Cible re-baseline : étendre le modèle RPC de la finance aux autres domaines mutants.**

Gros tapeurs de tables directes : `finance/api.ts` (42 `.from`), `mail/api.ts` (31), `documents/api.ts` (27), `lots/api.ts` (22), `maintenance/api.ts` (19), `budget/api.ts` (17), `communication/api.ts` (14), `sales/api.ts` (13), `useMaintenanceData` (20).
Gros tapeurs RPC : `onboarding/api.ts` (8), `ag/api/finalisation.api.ts` (6+9), `useAgEnvoiPage` (7), `usePouvoirs` (5), `ag/api/session.api.ts` (11 `.from` mais aussi rpc).

## 4. DOUBLONS (deux portes pour la même chose)

C'est le défaut majeur de la couche — cohérent avec la dette « doublons » du MEMORY.

1. **Domaine AG dédoublé** : `src/lib/ag/api.ts` (façade monolithique) **coexiste** avec `src/lib/ag/api/*.api.ts` (8 fichiers : votes, session, meetings, resolutions, convocation, documents, finalisation, syndic-contract) **+** une 3ᵉ couche `src/features/ag/**/hooks/` qui retape parfois `.from`/`.rpc` en direct (ex. `useConvocationAccountingData` 5 rpc, `useAgEnvoiPage` 7 rpc). Trois patterns d'accès AG cohabitent.
2. **Ventes** : `src/lib/sales/api.ts` (13 `.from`) **vs** `src/features/ventes/api/mutationsApi.ts` (2 `.from`) **vs** hooks `useSales*`/`useVentes*` (`useSalesData`, `useSalesMutations`, `useVentes`, `useVentesListPage`, `useVenteDetail`…). Même domaine, 3 entrées.
3. **Mock vs réel** : `src/lib/mock-data/` (≈35 fichiers d'entités) toujours présent et importé par `useDevMockData`, `useDPE`, `useFacturX`, `usePPT`, `budget-maintenance.service`, `VentesProvider`. **Pattern double vivant** (mock ↔ Supabase) alors que l'archi cible est « Supabase, pas mock ». À éteindre.
4. **Finance/budget recouvrants** : `lib/finance/api.ts`, `lib/finance/accounting-period.ts`, `lib/budget/api.ts`, `lib/budget/payment-schedules.api.ts` + hooks `useFinanceData`/`useBudgetData`/`useBudget`/`useBudgetMutations`/`useLedger`/`useALURData` se partagent le même périmètre comptable sans frontière nette.

## 5. Fichiers MORTS / quasi-morts (à vérifier avant suppression)

- **`src/hooks/index.ts` n'exporte que 12 hooks** sur ~90. Les `hooks/modules/*` sont donc importés **par chemin direct**, pas via le barrel → le barrel est trompeur et sous-utilisé.
- Hooks racine **seulement auto-référencés** (définis, jamais importés ailleurs que leur propre fichier dans le grep usage) → **candidats morts** : `useDocumentVariables`, `useGlobalVariables`, `useRolesExclusion`, `usePieceJustificative`, `useDevMockData`, `useKeyboardNavigation`. (les autres — `usePPT`, `useDPE`, `useFacturX`, `useFacturePJ`, `useSyndicContract` — sont bien consommés par les écrans conformité/finance.)
- `src/services/recommande/` : isolé, vérifier s'il est branché à un écran d'envoi postal réel ou résiduel.

> NB : « mort » = aucun import détecté hors self ; à confirmer fichier par fichier avant drop (cf. règle « finir les migrations, ne pas laisser 2 patterns »).

## 6. Schéma ASCII du pont

```
  Écran (page/feature component)
        │
        ▼
  Hook  ──────────────┐ (~90 : src/hooks + hooks/modules + features/**/hooks)
   │                  │
   │ idéal            │ raccourci fréquent
   ▼                  ▼
  api.ts / service ─► createClient() (browser)
   (14 + 8 AG + 23)        │
                           ├─► .from(table)      ← DOMINANT (~568)
                           ├─► .rpc(fn)          ← finance/AG (~86)
                           ├─► functions.invoke  ← rare (5)
                           └─► fetch('/api/..')  ← rare (4) ─► route handler ─► .from/.rpc
```

Le « raccourci » (hook → client en direct, en sautant api.ts) est la principale source d'érosion : il disperse l'accès et empêche d'imposer le passage par RPC.
