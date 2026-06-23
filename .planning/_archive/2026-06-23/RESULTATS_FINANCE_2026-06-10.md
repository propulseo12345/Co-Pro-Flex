# Résultats session autonome — Finance + Test E2E (2026-06-10, nuit)

> Travail mené en autonomie pendant que tu dormais. **Local uniquement, aucun push, aucune migration cloud, PR #2 non touchée.** Tout est prouvé (pas seulement déclaré).

## TL;DR

- ✅ **Boucle finance prouvée de bout en bout** par un nouveau test E2E chiffré (`gate_finance_loop_e2e.sql`). `db:test` passe **7/7**.
- ✅ **Baseline verte** : `tsc --noEmit` = 0 erreur, `vitest` = 0 échec, `db:test` = 7/7.
- 🔎 **Diagnostic du drift finance front** : 2 vraies références mortes identifiées (createCall, suppliers). **Aucune corrigée cette nuit** — par prudence (voir pourquoi plus bas). Documentées ici, actionnables.
- 📋 Roadmap finalisation → bêta écrite dans `.planning/ROADMAP_FINALISATION_BETA.md`.

## Ce qui a été fait

### 1. Test E2E de la boucle finance (livrable principal)

Nouveau fichier `supabase/tests/gate_finance_loop_e2e.sql`, branché dans le runner `scripts/db-test.mjs`.

Il déroule la chaîne canonique complète sur une copro jetable (`create_clean_test_copro_seeded`) :
budget courant validé → appel agrégé → 3 paiements copro + 1 impayé → facture fournisseur + règlement → dépense réalisée. Puis il **prouve 8 invariants chiffrés**, tous **dérivés des données** (pas de constante magique, donc robuste si le seed évolue) :

1. `audit_finance_integrity` = 0 anomalie.
2. Grand livre équilibré : Σdébit = Σcrédit.
3. Produit d'appel (701) = total de l'appel émis.
4. Σ lignes d'appel = total de l'en-tête (ventilation exacte au centime).
5. **Réconciliation GL ↔ vue métier** : solde 450-1 restant = total des impayés (`v_unpaid_by_lot`).
6. Exactement 1 lot impayé, montant > 0.
7. **Réconciliation cash** : banque (512) = Σ encaissements − Σ décaissements fournisseurs.
8. Facture fournisseur intégralement réglée.

Différence avec les gates existants : ils prouvent surtout l'onboarding/la reprise/le moteur ; celui-ci prouve **la boucle complète, chiffrée et réconciliée** (GL ↔ relevé ↔ cash). Vérité terrain mesurée : audit=0, appel=18 000 €, 701=18 000, 512=11 050, créance restante=4 450=impayé du lot 4.

> Une revue adversariale du gate par un sous-agent a tourné en parallèle (verdict consigné dans SESSION.md / au réveil).

## Ce qui N'A PAS été fait — et pourquoi (à trancher avec toi)

### 2. `createCall` (appel exceptionnel/travaux) — RPC morte, mais correctif **différé par ta propre décision**

- **Constat prouvé** : `src/lib/finance/api.ts:342` appelle `post_call_for_funds`, une RPC qui **n'existe pas** dans la base (objet explicitement *abandonné*, cf. en-tête de `0026`). Le wizard « appel exceptionnel/travaux » (`useCreateCallWizard.ts`) est donc **non fonctionnel**.
- **Pourquoi je n'ai rien implémenté** : le correctif propre = créer `post_exceptional_call_for_funds`. Or `DECISIONS.md` **F4** acte que l'appel hors-budget/exceptionnel est **différé « après le palier 1 »**, et il faut figer des **écritures comptables** (exceptionnel → 702 ? avance art.35 → 1031 ?) qui relèvent de **ton expertise métier** (ta consigne : ne pas deviner les règles). Implémenter ça à 1h du matin sans toi serait imprudent.
- **Reste à faire** : décider (a) implémenter la RPC exceptionnelle avec toi (écritures validées), OU (b) masquer/désactiver proprement le wizard tant que c'est différé (éviter un bouton qui plante).

### 3. Sous-système fournisseurs — drift `suppliers` → `tiers` (mécanique mais multi-points)

- **Constat prouvé** : `src/lib/finance/api.ts:483` lit `.from('suppliers')` — **table inexistante** (le modèle cible est `public.tiers`, `is_supplier=true`). Et `createSupplierInvoiceDirect` (l.534) insère une colonne `supplier_id` qui a été **renommée `tiers_id`**.
- **Pourquoi je n'ai pas corrigé en aveugle** : ça touche plusieurs points (table, colonne ×, type `Supplier`, filtre domaine) et le mapping exact dépend du schéma `tiers`. Mécanique mais à faire d'un bloc et tester, pas à deviner de nuit.
- **Spec concrète prête** (schéma `tiers` vérifié) :
  - `listSuppliers` → `.from('tiers').select('*').eq('copro_id', …).eq('is_supplier', true).eq('is_active', true).order('name')`.
  - `createSupplierInvoiceDirect` / `CreateSupplierInvoicePayload` → remplacer `supplier_id` par `tiers_id`.
  - Adapter le type `Supplier` aux colonnes `tiers` (`name`, `is_supplier`, `is_active`, `category`, `email`, `iban`…).

### 4. Faux problème écarté : enum `payment_method`

L'audit drift suspectait `'bank_transfer'`. Vérifié : la base utilise bien `'transfer'`, et `'bank_transfer'` n'apparaît **que dans `types/supabase.ts`** (types générés périmés). **Aucun bug applicatif** — juste la régénération de types, déjà connue comme dette différée.

## État vérifiable

- Branche `finance-drift-rebranchement` (local). Modifs de cette nuit : `supabase/tests/gate_finance_loop_e2e.sql` (nouveau) + `scripts/db-test.mjs` (ajout du gate à la liste).
- Commande de preuve : `npm run db:test` → **7/7**. `npx tsc --noEmit` → 0. `npm test` → 0.
- `0043_seed_resolution_templates.sql` apparaît « modifié » dans git : c'est **uniquement** une normalisation de fin de ligne (LF↔CRLF), 0 changement de contenu — non committé.
