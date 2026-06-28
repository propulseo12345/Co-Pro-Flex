# Point ensemble — prépa finance baseline (BL) — 2026-06-28

> Sortie de la consolidation multi-agents (blueprints `db-cible` finance × réalité `qqfq` extraite × décisions `BL`).
> But : confirmer la prépa finance AVANT d'écrire le SQL (demande USER, BL-08). Source : workflow `consolidation-prepa-finance`.
> Statut : **en cours de validation avec Lyes** (PE-1→PE-7).

## ✅ Ce qui est SOLIDE (confirmé blueprint ↔ qqfq)
- **Noyau comptable** : GL en-tête+lignes (`ledger_transactions`/`ledger_entries`), partie double, lot-centric par `lot_id` + sous-comptes `450-x` par nature (6 natures). On garde la forme.
- **Immutabilité GL déjà câblée** des deux côtés (triggers `tr_ledger_*` + équilibre déféré `tr_check_transaction_balance`). À copier de qqfq.
- **Socle copro déjà lot-centric** dans le live (lots sans `tantiemes_*`/`owner_id`, quotes-parts = `repartition_key_lines.weight`, indivision `lot_owners`). **Notice 0002 quasi prête.**
- **Appels de fonds sains** : `post_budget_call_for_funds` (10-arg trimestriel natif) = seule route ; mono-clé déjà supprimée.
- **Fusion tiers faite et propre** (`tiers` + `work_domain`) ; reste 1 résidu (`supplier_advances.supplier_id`).
- **Ménage déjà acquis** dans qqfq (squash+clean) : `lot_accounts`, `mail_*`, `document_access`, fonctions bespoke AG… tous absents.
- **RPC corpus éprouvé** (0/134 déséquilibre) → BL-03 (forme=blueprint, corps=qqfq) tient.

## 🔧 SUPERSEDES — le blueprint dit X, la baseline fait Y (déjà aligné sur nos décisions)
1. **Super-admin** : blueprint = rôle dans `memberships` → baseline = **table `platform_admins` hors-tenant**, bypass LECTURE seule (C16-4).
2. **RLS toggle prod/dev** (`apply_rls_environment`) → **PÉRIMÉ** : FORCE 100% natif dès chaque table ; garder `assert_public_tables_have_rls` comme gate durci (FORCE).
3. **Argent `numeric(14,2)`** (blueprint ET qqfq) → **`bigint` centimes** pour l'argent uniquement (surfaces/%/poids restent `numeric`).
4. **110/120** → **12/478** (logique d'affectation confirmée, seuls les codes changent).
5. **Banque sur `accounts.iban/bic`** → **table `copro_bank_accounts` (deux poches 512/502)** ; DROP iban/bic/bank_name + `accounts.initial_balance`.
6. **`validate_budget_expense` poste le réalisé** → **couper le double-posting** : réalisé = classe 6 via `validate_supplier_invoice` seule.
7. **`create_ledger_transaction` swallow d'erreur** → réécrire (liste : + `regularize_period`, `get_pending_reminders_to_send`) ; le reste copié quasi-littéral.
8. **Vues fantômes** `v_lot_balance`/`v_owner_balance`/`v_unpaid_lots`/`v_*_mismatch` → **n'existent pas** : solde = fonction `get_lot_balance_45x`, intégrité = fonction `audit_finance_integrity`, + vues réelles `v_lot_vs_gl_mismatch`/`v_result_allocation_split`.
9. **Mécanique de migration enums** (ALTER/mapping legacy) → **sans objet** (base neuve, `CREATE TYPE` direct au set cible ; qqfq déjà aux sets cibles).
10. **Faux-morts « câblés front v1 »** → l'argument tombe (front v2 from-scratch) : `alur_transfers`/`bank_movements`/`bank_matches`/`budget_payment_schedules` partent **hors baseline** avec leurs vues (BL-06).

## 🕳️ GAPS — objets à concevoir (ni blueprint ni qqfq) ou oubliés
- **`commitments`** (l'engagé non facturé) : à concevoir from-scratch en 0003 — **frontière avec `budget_expenses` = PE-1**.
- **`platform_admins`** : à graver en 0004 + RLS propre.
- **`copro_bank_accounts`** (deux poches) : à créer en 0003.
- **Numérotation de pièces sans trou** (séquences serveur par copro×type, reset par exercice, G24-AM2) : objet à concevoir en 0003.
- **Triggers anti-cumul** admin/gestionnaire : à écrire en 0004.
- **Enums finance oubliés du blueprint** mais réels qqfq : `supplier_doc_kind`, valeurs `ledger_source_type` (avoir, works_settlement…) → **PE-4**.
- **Colonnes oubliées** : `accounts.charge_nature`, `ledger_entries.operation_id`, `supplier_invoice_lines.operation_id` → à ajouter (copier qqfq).
- **Plan de comptes complet** : 471/472, 502, 105, 12/478, 705, 408/486 + ajouter 718, corriger 677 → vérifier `provision_copro_chart`.
- **`supplier_advances.supplier_id`** → repointer `tiers`.
- **`email_templates`** : conflit de FK finance (relances) → **PE-2**.

## ❓ POINT ENSEMBLE — à trancher avec Lyes (PE-1→PE-7)
- **PE-1** : frontière `budget_expenses` (engagé) vs `commitments` (engagé) — la plus structurante (+ suppression éventuelle de table = accord amont). Reco : (A) `commitments`=engagé amont, `budget_expenses` supprimée au profit de `supplier_invoices` en brouillon — **à trancher ensemble**.
- **PE-2** : `email_templates` IN/OUT de 0003. Reco : (C) table + 3 modèles de relance seulement.
- **PE-3** : périmètre 0004 minimal vs complet. Reco : minimal (break-glass/audit = lot V1).
- **PE-4** : `ledger_source_type` = 20 valeurs qqfq d'un coup. Reco : (A) tout reprendre.
- **PE-5** : garde invariant 12/478 (assertion in-function vs constraint déféré) + réconcilier avec G24-C7-2 « non bloquant ». Reco : (A) + clarifier 2 gardes distinctes.
- **PE-6** : reprise de mandat (chaîne residual) dans 0003 ou différée. Reco : (B) garder `set_opening_balance` + 471/472, différer `opening_balance_residual_items`.
- **PE-7** : FK copros→call_for_funds CASCADE vs RESTRICT. Reco : (C) en-tête RESTRICT, lignes CASCADE.

## 📋 État de préparation des notices
- **0001 (types/refs)** : ⏳ bloqué par PE-4 (enums) — sinon prêt.
- **0002 (socle copro)** : ✅ **quasi prêt** (structure confirmée 1:1).
- **0003 (finance)** : ⏳ bloqué par PE-1, PE-2, PE-6, PE-7 + objets à concevoir.
- **0004 (sécurité)** : ⏳ bloqué par PE-3 + création `platform_admins`/anti-cumul.
