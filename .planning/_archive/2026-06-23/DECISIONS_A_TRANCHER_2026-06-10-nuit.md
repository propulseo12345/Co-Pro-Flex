# Décisions à trancher + travail livré — session autonome nuit du 2026-06-10

> Écrit pendant que tu dormais, en parallèle de la session finance. **Aucun push, aucune
> migration cloud.** Tout est local et prouvé. Ce fichier est fait pour être lu en 5 minutes
> au réveil : tu **tranches les 4 décisions**, et le code suit derrière.

---

## TL;DR

**Ce que j'ai livré et prouvé cette nuit (lanes 2 + 3) :**
1. ✅ **Rebranch fournisseurs `suppliers → tiers` terminé** dans `src/lib/finance/api.ts`. La cartographie a montré **plus de sites cassés que les 2 annoncés** (4 sites réels). Tout corrigé. `tsc`=0, `vitest`=97/97, `eslint`=0.
2. ✅ **Infra Phase 2 posée** : CI GitHub Actions (`tsc`+`vitest` bloquants, lint + db:test non-bloquants), en-têtes de sécurité dans `next.config.ts` (**prouvés présents sur une vraie réponse HTTP**), `vercel.json`.

**Ce qui a besoin de TON arbitrage (zéro code de ma part dessus) :** les 4 décisions ci-dessous + 3 drifts métier découverts en chemin.

---

## PARTIE 1 — Les 4 décisions à trancher

### Décision 1 — Périmètre de la bêta : « gestionnaire-only » d'abord ?

**Le contexte en clair.** Aujourd'hui l'app est à ~60 % en mode démo gestionnaire mono-utilisateur,
mais ~35 % en vrai SaaS multi-clients sécurisé. L'écart n'est pas fonctionnel, c'est de la
**sécurité/isolation** (RLS, cloisonnement des utilisateurs). Le portail copropriétaire et le
paiement en ligne, eux, sont des chantiers entiers encore devant.

**Ma reco : OUI, bêta gestionnaire-only d'abord.** Un syndic gère ses copros dans l'outil, sans
portail copro ni paiement en ligne. C'est atteignable bien plus vite, ça valide le cœur métier
auprès de vrais utilisateurs, et le portail + paiement deviennent une **bêta 2**.

- **Si tu valides :** on se concentre sur Phase 1 (RLS + isolation) puis Phase 2/3. Pas de portail copro pour l'instant.
- **Si tu préfères attendre le portail copro :** le délai jusqu'à la bêta s'allonge nettement (UI + RLS + `coproprietaires.user_id` + invitations à construire).

---

### Décision 2 — `createCall` (wizard d'appels de fonds) : que fait-on du bouton cassé ?

**Le contexte en clair.** Le bouton « **+ Nouvel appel** » de la page Appels de fonds ouvre un
wizard dont la soumission appelle une fonction base de données **qui n'existe pas**
(`post_call_for_funds`). Donc **le bouton plante** si on va au bout.
Chaîne exacte : `appels-fonds/page.tsx:105` (bouton) → wizard → `useAppelsFondsActions.generateCalls`
→ `useCreateCall` → `createCall` (`src/lib/finance/api.ts`) → `post_call_for_funds` ❌.

À noter : la **création d'appels pilotée par l'AG** (vote budget → activation des décisions) passe,
elle, par une fonction **qui marche** (`post_budget_call_for_funds`). C'est seulement la **création
manuelle** via ce wizard qui est cassée.

**Trois options :**
- **(A) Masquer/désactiver le wizard pour la bêta** *(ma reco si la création manuelle n'est pas indispensable au pilote)*. Un bouton désactivé proprement vaut mieux qu'un bouton qui plante. 5 min de code (désactiver `appels-fonds/page.tsx:105` + message « bientôt disponible »). Réversible.
- **(B) Rebrancher le wizard sur `post_budget_call_for_funds`** (la route qui marche déjà). Plus de valeur, mais les signatures diffèrent (mono-clé vs agrégé multi-clés) → vrai petit chantier, à faire ensemble.
- **(C) Implémenter `post_exceptional_call_for_funds`** (appel exceptionnel/hors-budget). C'est **différé par ta propre décision** (appels hors-budget après le palier 1, design validé le 2026-06-08, écritures `702`/avance art.35 `1031` à figer **avec toi**). À ne pas coder de nuit sans ton aval métier.

**Ma reco :** **(A) pour débloquer la bêta tout de suite**, puis **(C)** quand on attaque les appels hors-budget ensemble. Dis-moi et je masque le wizard proprement (je ne l'ai pas fait : c'est un changement de comportement visible = ta décision).

---

### Décision 3 — Feu vert rebranch fournisseurs → **DÉJÀ FAIT cette nuit** ✅

Tu n'as plus à donner le feu vert : **c'est livré et prouvé** (voir Partie 2). Il reste juste à
valider, au réveil, **3 drifts adjacents** que j'ai découverts mais **pas** corrigés (décisions
métier — voir Partie 3).

---

### Décision 4 — Cible cloud de la bêta : projet Supabase neuf ?

**Le contexte en clair.** Le schéma propre (migrations `0001 → 0043`) vit en local. Le projet
Supabase **cloud actuel porte encore l'ANCIEN schéma**. Mélanger les deux est risqué.

**Ma reco : OUI, redéployer le schéma propre sur un projet Supabase NEUF** dédié à la bêta. On
garde le cloud actuel intact (pas de migration destructrice), et la bêta démarre sur une base
saine et reproductible.

- **Prérequis (important) :** la **re-baseline** des migrations (les rendre 100 % reproductibles) — c'est ce qui débloque AUSSI le job CI `db:test` que j'ai laissé non-bloquant exprès. Donc « projet neuf » et « re-baseline » vont ensemble.
- **Toute migration cloud attend ton GO explicite.** Je n'ai rien touché côté cloud.

---

## PARTIE 2 — Ce qui a été livré cette nuit (prouvé, pas déclaré)

### Lane 2 — Rebranch fournisseurs `suppliers → tiers` (`src/lib/finance/api.ts`)

La cartographie (5 agents) a établi la **vérité terrain du schéma** et trouvé **4 sites réellement
cassés** (le doc résultats en annonçait 2). Corrigés :

| # | Fonction / type | Avant (cassé) | Après |
|---|-----------------|---------------|-------|
| 1 | `interface Supplier` | colonne `contact` (jsonb) **inexistante** sur `tiers` | colonnes à plat réelles (`is_supplier`, `email`, `phone`, `iban`, `vat_number`, `category`…) |
| 2 | `SupplierInvoiceOverview.supplier_id` | la vue expose `tiers_id`, pas `supplier_id` | renommé `tiers_id` (aucun consommateur ne lisait ce champ) |
| 3 | `listSuppliers` | `.from('suppliers')` (table inexistante) | `.from('tiers').eq('is_supplier', true).eq('is_active', true)` |
| 4 | `createSupplierInvoiceDirect` | insert colonne `supplier_id` | insert colonne `tiers_id` (champ payload conservé `supplier_id` = alias sémantique) |
| 5 | `listPendingInvoices` | `select supplier_id … suppliers(name)` | `select tiers_id … tiers(name)` + mapping explicite |

**Choix d'ingénierie :** blast radius **minimal** — j'ai gardé les noms internes (`supplier_id`)
comme alias sémantique pour **ne pas rippler** dans le moteur de matching bancaire et les autres
consommateurs. Résultat : **aucun fichier consommateur modifié**, tout reste cohérent.

**Preuves :** `npx tsc --noEmit` = **0** · `npx vitest run` = **97/97** · `eslint api.ts` = **0**.

### Lane 3 — Infra Phase 2

- **`.github/workflows/ci.yml`** :
  - Job `quality` : `tsc --noEmit` (**bloquant**) + `lint` (**non-bloquant**, dette pré-existante : 13 erreurs + ~825 warnings) + `vitest` (**bloquant**).
  - Job `db-tests` : lève Supabase + `db:test`, en **`continue-on-error`** tant que la base n'est pas re-baselinée (migrations non garanties reproductibles). À passer en bloquant après la re-baseline (cf. Décision 4).
- **`next.config.ts`** : `async headers()` ajouté (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control, **CSP en Report-Only**). Les `redirects()` existants sont conservés. **CSP volontairement en mode observation** (ne bloque rien) → zéro risque de casser l'app ; à passer en `Content-Security-Policy` enforcé après vérification des écrans.
  - **Prouvé :** les 7 en-têtes sont **présents sur une vraie réponse HTTP 200** (serveur `next dev` lancé + `curl`, puis arrêté proprement).
- **`vercel.json`** : minimal (`$schema` + `framework: nextjs`). **Décision assumée : les en-têtes sécu restent dans `next.config.ts`** (source unique, parité dev/prod) plutôt que dupliqués ici. Si tu préfères les en-têtes au niveau Vercel, dis-le, je déplace.

---

## PARTIE 3 — Drifts adjacents découverts (NON corrigés — décisions métier)

Trouvés en route, **hors de mon mandat** (rebranch fournisseurs). Je ne les ai pas devinés car ils
touchent à la logique comptable (ta zone d'expertise) :

1. **Edge Function `create_supplier_invoice` cassée.** Elle appelle la RPC `post_supplier_invoice`
   avec l'argument `p_supplier_id`, alors que la RPC attend `p_tiers_id` (renommé). → l'appel échoue.
   Fix = **1 ligne** côté `supabase/functions/create_supplier_invoice/index.ts` (`p_supplier_id` → `p_tiers_id`).
   **C'est le territoire `supabase/` de la session finance** — je n'y ai pas touché pour respecter le partage des lanes.

2. **Statuts de facture fournisseur — drift d'enum (lecture corrigée, écriture à trancher).**
   Le front utilise des valeurs (`'pending'`, `'validated'`, `'approved'`) **qui n'existent plus** dans
   l'enum cible (`'draft','posted','paid','cancelled'`).
   - **Côté lecture** (`listPendingInvoices`) : c'était un **crash runtime** (erreur Postgres 22P02) qui
     cassait le rapprochement bancaire. **Je l'ai corrigé** en `.in('status', ['draft','posted'])`
     (= « non soldé » = tout sauf `paid`/`cancelled`) car exclure les statuts terminaux n'est pas une
     règle métier contestable. La requête **ne plante plus** et est alignée sur le schéma réel
     (vérifié par lecture des migrations + double revue adversariale) ; reste à confirmer sur
     données réelles (je n'exécute pas contre la base — c'est ta lane finance).
   - **Côté écriture** (`useFactureDetailPage.ts` `mapStatusToSupabase`) : écrit encore `'approved'`
     → valider une facture lèvera la **même erreur**. **Je n'y ai PAS touché** car ça pose une vraie
     **question produit : veux-tu un statut « validé/approuvé » distinct** dans le cycle de vie d'une
     facture (auquel cas il faut l'**ajouter à l'enum** par migration), **ou** « validée » se mappe sur
     `'posted'` ? Décision pour toi, puis 1 petit lot pour aligner front + (éventuelle) migration.

3. **Avoirs (notes de crédit) impossibles.** La création d'avoir passe un `total_amount` **négatif**,
   or la table a un `CHECK total_amount > 0`. → l'insert sera rejeté. **Question pour toi :** comment
   modélise-t-on un avoir fournisseur (montant négatif interdit) ?

---

## PARTIE 4 — Entrées proposées pour `DECISIONS.md` (à copier après ta validation)

> Format du journal : `🟡 PROPOSÉ` tant que tu n'as pas tranché.

```
### F? — Périmètre bêta : gestionnaire-only d'abord 🟡 PROPOSÉ
Bêta 1 = syndic gère ses copros, sans portail copro ni paiement en ligne.
Portail copro + paiement = bêta 2. Débloque le focus Phase 1 (RLS/isolation).

### F? — Wizard createCall : masquer pour la bêta 🟡 PROPOSÉ
post_call_for_funds n'existe pas → wizard manuel cassé. Décision : masquer le bouton
(appels-fonds/page.tsx:105) pour la bêta ; création d'appels via le flux AG (post_budget_call_for_funds,
qui marche). Appel exceptionnel = post_exceptional_call_for_funds plus tard (écritures à valider).

### F? — Cible cloud bêta : projet Supabase neuf 🟡 PROPOSÉ
Redéploiement du schéma 0001→0043 sur un projet Supabase NEUF (le cloud actuel = ancien schéma).
Prérequis : re-baseline reproductible (débloque aussi le job CI db:test). Migration cloud = sur GO explicite.
```
