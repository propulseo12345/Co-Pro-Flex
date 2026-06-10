# 00 — ATLAS CoProFlex (index maître)

> Cartographie lecture seule de l'application, 2026-06-04. Point d'entrée de tout l'atlas.
> CoProFlex = logiciel de syndic de copropriété (Next.js 16 + Supabase). Deux espaces gestionnaire/dashboard, un site marketing public, des edges Deno et un grand livre comptable comme source légale unique.

---

## 1. Vision d'ensemble — les grandes zones fonctionnelles

| # | Zone fonctionnelle | Périmètre route | Fichier atlas |
|---|---|---|---|
| 01 | **AG & gouvernance** | `(dashboard)/ag/**`, `conseil-syndical/**` | [front-01-ag.md](front-01-ag.md) |
| 02 | **Finance — compta & trésorerie** | `finance/{comptabilite,mouvements-bancaires,fonds-alur,tantiemes,cles-repartition,etats-dates,releves-individuels…}` | [front-02-finance-compta.md](front-02-finance-compta.md) |
| 03 | **Finance — budgets, appels, factures** | `finance/{budgets,appels-fonds,factures,invoices,unpaid}` | [front-03-finance-budgets.md](front-03-finance-budgets.md) |
| 04 | **Maintenance & tiers** | `maintenance/**` (carnet, contrats, prestataires, OS) | [front-04-maintenance.md](front-04-maintenance.md) |
| 05 | **GED & communication** | `documents/ged`, `communication/{mail,messagerie,mur}` | [front-05-docs-comm.md](front-05-docs-comm.md) |
| 06 | **Copros, copropriétaires, dashboard** | `dashboard`, `coproprietaires/**`, `(gestionnaire)/portefeuille` | [front-06-copros-dashboard.md](front-06-copros-dashboard.md) |
| 07 | **Ventes, impayés, contentieux** | `ventes-impayes/**`, `sales`, `contentieux/**`, `dossiers` | [front-07-ventes-contentieux.md](front-07-ventes-contentieux.md) |
| 08 | **Conformité, settings, auth/onboarding** | `conformite/**`, `settings/**`, `auth/**`, `onboarding/**` | [front-08-conformite-settings.md](front-08-conformite-settings.md) |
| 09 | **Site marketing public** | `(marketing)/**` (landing, blog, tarifs, légal) | [front-09-marketing.md](front-09-marketing.md) |

**Couches transverses (non-front)** : [edge-functions.md](edge-functions.md) · [api-routes.md](api-routes.md) · [data-layer.md](data-layer.md).
**Outils de navigation** : [MATRICE-LIAISON.md](MATRICE-LIAISON.md) (base → consommateurs) · [REGISTRE-RISQUES.md](REGISTRE-RISQUES.md) (42 risques priorisés).

---

## 2. Comptages clés (la surface de l'outil)

| Objet | Volume | Source |
|---|---|---|
| **Écrans (routes/pages)** | **~115** (dont ~28 morts/doublons, ~13 marketing sans I/O) | tableaux front-01→09 |
| **Hooks** | **~90** (`src/hooks` 12 + `hooks/modules` ~78 + `features/**/hooks`) | data-layer §2 |
| **api.ts de domaine** | **14** + **8** AG éclatés + **23** services | data-layer §2 |
| **Edges Deno** | **25** fonctions (`supabase/functions/`) | edge-functions |
| **Routes API Next** | **6** (mail ×2, banking ×4) + middleware | api-routes |
| **Accès base** | **~568 `.from`** / 131 fichiers · **~86 `.rpc`** / 33 fichiers · 5 `functions.invoke` · 4 `fetch('/api')` | data-layer §3 |
| **Tables/vues** | ~87 tables (RLS off sur 72) ; vues `v_*` largement utilisées | MATRICE §5 |

---

## 3. Les 3 couches et comment elles se relient

```
  ÉCRAN (page/feature)
     │
     ▼
  HOOK (~90)  ──── raccourci fréquent ────┐
     │ (idéal)                            │
     ▼                                    ▼
  api.ts / service ───►  createClient() (browser)
  (14 + 8 AG + 23)            │
                             ├─► .from(table)  ← DOMINANT (~568, RLS = seule garde)
                             ├─► .rpc(fn)      ← finance/AG (~86, GL = source unique)
                             ├─► functions.invoke ──► EDGE Deno (25)
                             └─► fetch('/api') ──► ROUTE API Next (6)
```

- **Couche 1 (front)** : 9 zones d'écrans → hooks → api.ts/services. Le « raccourci » hook→client direct est la principale érosion (disperse l'accès, contourne le passage par RPC).
- **Couche 2 (edges/API)** : 25 edges Deno (AG, finance, maintenance, comm, documents) + 6 routes API Next (mail/banking). Très peu appelées depuis le front (9 invoke/fetch au total).
- **Couche 3 (base)** : tables + vues `v_*` + RPC. La **finance** est l'exception saine (tout passe par RPC qui écrit le grand livre). Ailleurs : accès table directe.

➡️ **Pour « si je touche X, qu'est-ce qui casse ? », voir [MATRICE-LIAISON.md](MATRICE-LIAISON.md)** : matrice inverse base → écrans/hooks/edges/routes consommateurs, par domaine, avec disposition cible (GARDER / RÉÉCRIRE / ABANDONNER) et séquençage des DROP.

---

## 4. Résumé du registre des risques (top)

**42 risques** : 6 BLOQUANT, 22 MAJEUR, 14 MINEUR ([REGISTRE-RISQUES.md](REGISTRE-RISQUES.md)).

**Top 5 (à traiter en premier) :**
1. **R2 + R3 — fuite inter-cabinet edges** : `maintenance-workflow` (service_role sans re-check) + `register_correspondence_form_votes` (SECURITY DEFINER sans `auth.uid()`).
2. **R1 — `/api/**` entièrement public** : aucune gate session/cabinet (le middleware ne protège que les pages).
3. **R5 — chaîne AG « bespoke » câblée hors GL** : les décisions votées n'écrivent jamais le grand livre ; rebrancher sur la chaîne canonique AVANT drop.
4. **R6 — factures hors compta d'engagement** : UPDATE direct du statut, edges contournés, zéro écriture GL.
5. **R4 — `/api/mail/inbound` non signé + copro gelée `11111111`** : injection de mails sur la copro immuable.

Familles MAJEUR récurrentes : **doublons de features** EN/FR livrés (factures/invoices, providers copro/syndic, budget-works/current, ventes/sales, impayés ×2), **mocks présentés comme réels** (conformité entière, etats-dates, settings/info, portefeuille KPIs), **double source de vérité** (contrats store mémoire ↔ DB), **identité hardcodée** (`DEFAULT_OWNER_ID`), **accès direct hors RPC** + **cast `any` généralisé**.

---

## 5. Comment lire l'atlas

1. **Vue produit** : ce fichier (00-ATLAS).
2. **Une zone fonctionnelle** : `front-01`→`front-09` (tableau écran→hook→données→statut + anomalies).
3. **Couches techniques** : `edge-functions`, `api-routes`, `data-layer`.
4. **Impact d'un changement base** : `MATRICE-LIAISON` (inverse).
5. **Quoi corriger et dans quel ordre** : `REGISTRE-RISQUES` (priorisé + séquençage DROP).

---

## 6. VERDICT de complétude

**Couverture estimée : ~95 % de la surface applicative.**
- Les **9 zones front**, les **25 edges**, les **6 routes API** et la **couche data** sont cartographiés ; les risques sont consolidés en un registre unique et la matrice de liaison relie base ↔ consommateurs.
- **Zones non explorées / à confirmer** :
  - Détail interne des **composants `components/features/**`** (au-delà des hooks ; non inventorié exhaustivement).
  - **Confirmation live** des candidats morts (hooks racine, vues sans consommateur, tables 0-ligne) — listés mais à valider fichier par fichier avant tout DROP.
  - **Couche RLS/policies réelle** en base (RLS off en dev → posture cible non vérifiée objet par objet).
  - **`src/lib/services` (23 fichiers)** : recensés en volume, pas détaillés un par un.
- Aucune zone fonctionnelle majeure n'est manquante. L'atlas est exploitable comme socle de la refonte ; les angles morts résiduels sont des vérifications de détail, pas des pans entiers.
