# Cartographie domaine 07 — Maintenance / Contrats / Tiers (fournisseurs+prestataires) / Ordres de service / Factures fournisseur / Assurances

> Lecture seule sur le live `iyfesbjnkpynmwlsmxnp` (date 2026-06-04). Périmètre : 11 tables-graines, toutes confirmées du domaine, aucune table manquante détectée (recherche large `intervention|sinistre|claim|warranty|equipment|asset|ticket|work_order` → rien hors graines).

## Panorama volumétrie & RLS

| Table | Lignes | Cols | RLS | Données portées (copro) |
|---|---|---|---|---|
| `providers` | 13 | 35 | **OFF** | 11111111 seul |
| `suppliers` | 8 | 8 | **OFF** | 1/copro × 8 copros (11111111, 22222222 + 6 test) |
| `contracts` | 12 | 26 | **OFF** | 11111111 seul |
| `service_orders` | 2 | 35 | **OFF** | 11111111 seul |
| `service_order_events` | 7 | 10 | **OFF** | 11111111 seul |
| `logbook_entries` | 4 | 24 | **OFF** | 11111111 seul |
| `supplier_invoices` | 13 | 19 | **OFF** | 11111111 (7), 22222222 (1), 6 test (1 ch.) |
| `supplier_invoice_lines` | 9 | 11 | **OFF** | idem invoices |
| `supplier_payments` | 8 | 12 | **OFF** | 11111111 (2), 22222222 (1), 6 test |
| `insurance_policies` | 0 | 14 | **ON** | — (vide) |
| `planned_works` | 0 | 22 | **ON** | — (vide) |

**Constat RLS majeur** : seules les 2 tables VIDES (`insurance_policies`, `planned_works`) ont RLS activé. Les 9 tables porteuses de données ont RLS **désactivé** alors que les policies existent et sont écrites (voir §RLS). C'est le pattern « RLS off en dev » connu, mais ici **les policies sont prêtes** → réactivation triviale en prod. Incohérence du modèle bicéphale : aucune policy ne distingue `service_role` (toutes en role `public` + helpers `user_is_copro_manager` / `user_has_copro_access`).

---

## 1. STRUCTURE LIVE par table

### `providers` (prestataire — annuaire riche maintenance)
PK `id`. UNIQUE `uq_provider_name (copro_id, name, category)`. FK : `copro_id → copros ON DELETE CASCADE`. CHECK `rating_avg ∈ [0,5]`.
Index : copro, (copro,category), (copro,is_active), GIN `domains`.
Trigger : aucun direct (mais `update_provider_stats` écrit dedans depuis `logbook_entries`).
Colonnes (35) : `id, copro_id, name, category(provider_category: syndic/copropriete/coproflex), domains(provider_domain[]), contact_name, contact_role, email, phone, phone_emergency, address, postal_code, city, siret, iban, bic, rating_avg, rating_count, interventions_count, last_intervention_at, intervention_radius_km, indicative_rate(text), description, availability, coproflex_label(bool), avg_response_time(text), year_founded, employees_count, website, certifications(text[]), internal_notes, is_active, conformity_docs(jsonb), created_at, updated_at`.
**Remplissage réel (13 lignes)** : iban=0, bic=0, conformity_docs=0, year_founded=0, certifications=1, radius=1, coproflex_label=1, rating=5, `category='coproflex'`=2. → forte proportion de colonnes mortes/annuaire-marketing.

### `suppliers` (fournisseur — entité COMPTABLE minimaliste)
PK `id`. UNIQUE `uq_supplier_name (copro_id, name)`. FK `copro_id → copros CASCADE`. RLS off, policies SELECT/INSERT/UPDATE/DELETE = `user_is_copro_manager` (manager-only, pas de lecture copropriétaire).
Colonnes (8) : `id, copro_id, name, siret, contact(jsonb), is_active, created_at, updated_at`.
C'est `suppliers` (pas `providers`) qui est référencé par `supplier_invoices.supplier_id`.

### `contracts`
PK `id`. FK : `copro_id → copros CASCADE`, `provider_id → providers` (**pas suppliers**), `created_by → profiles`. CHECK `end_date ≥ start_date`, `planned_day_of_month ∈ [1,31]`. Index copro, (copro,end_date), provider, (copro,status). Trigger `trg_contract_status_auto` (BEFORE INS/UPD of end_date,notice_months → `update_contract_status_auto`).
26 cols : identité + `contract_type`(enum 17 valeurs), dates (start/end/renewal), `tacit_renewal, notice_months, annual_amount, billing_frequency, planned_frequency, planned_day_of_month, auto_generate_orders, next_planned_intervention, is_regulatory, status, terminated_at, termination_reason`.

### `service_orders` (ordre de service)
PK `id`. UNIQUE `(copro_id, order_number)`. FK : copro CASCADE, `provider_id → providers` (NOT NULL), `contract_id → contracts`, `building_id → buildings`, `lot_id → lots`, `supplier_invoice_id` (colonne présente mais **PAS de FK déclarée** — cf. §Verdict), `logbook_entry_id → logbook_entries`. Index copro, (copro,created_at)×2 (doublon), provider, (copro,status).
35 cols : workflow horodaté complet (`sent_at…cancelled_at`, 10 timestamps), `order_type, origin, urgency, is_art18_emergency, emergency_ceiling, estimated/quoted/actual_amount, status(12 valeurs), refusal_reason`.

### `service_order_events` (journal d'événements OS — append-only)
PK `id`. FK : copro CASCADE, `service_order_id → service_orders CASCADE`, `created_by → profiles`. Index sur service_order_id.
10 cols : `event_type(8 valeurs), from_status, to_status, payload(jsonb), comment, created_by, created_at`. **Pas de policy UPDATE/DELETE** (insert+select seulement) → bien pensé comme audit immuable.

### `logbook_entries` (carnet d'entretien)
PK `id`. FK : copro CASCADE, building, `provider_id → providers`, `contract_id → contracts`, `service_order_id → service_orders`, `document_id → documents`, created_by. CHECK `status ∈ {planifiee,en_cours,terminee}` (TEXT, **redondant** avec un enum potentiel). Trigger `trg_update_provider_stats` (AFTER INS/UPD of provider_id → recalcule `providers.interventions_count` + `last_intervention_at`).
24 cols : `entry_type(enum), category(intervention_category), title, description, equipment_concerned, provider_name_snapshot, domain, budget_category, happened_at, completed_at, next_due_at, cost, status(TEXT libre), document_id, comments`.

### `supplier_invoices` (facture fournisseur)
PK `id`. FK : copro CASCADE, `period_id → accounting_periods` (NOT NULL), `supplier_id → suppliers` (NOT NULL), `related_service_order_id` (**colonne, pas de FK**), `document_id → documents`, `ledger_tx_id → ledger_transactions`, created_by. CHECK `total_amount > 0`. Index (copro,period), (copro,status)×2 (doublon), supplier.
19 cols : `invoice_number, invoice_date, due_date, label, total_amount, status(draft/approved/posted/paid/cancelled), montant_ht, montant_tva, taux_tva` + liens GL.
**Pas de FK `related_service_order_id → service_orders`** alors que `service_orders.supplier_invoice_id` existe aussi → relation 1-1 dédoublée et non contrainte des deux côtés.

### `supplier_invoice_lines`
PK `id`. FK : copro CASCADE, `invoice_id → supplier_invoices CASCADE`, `account_id → accounts` (NOT NULL, compte de charge 6xx), `repartition_key_id → repartition_keys`, `budget_line_id → budget_lines`. CHECK `amount > 0`. Index invoice (×2 doublon : `idx_..._invoice` + `idx_..._invoice_id`).
CONSTRAINT TRIGGER DEFERRED `trg_validate_invoice_total` → la somme des lignes doit = `total_amount` (tolérance 0,01).
11 cols : `account_id, label, amount, repartition_key_id, budget_line_id, amount_ht, amount_tva, taux_pct`.

### `supplier_payments`
PK `id`. FK : copro CASCADE, period, `supplier_invoice_id → supplier_invoices CASCADE`, ledger_tx, created_by. CHECK `amount > 0`. UNIQUE partiel `ux_supplier_payments_idempotency (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
Triggers : `trg_validate_supplier_payment` (BEFORE — interdit paiement sur draft/cancelled, anti-surpaiement, auto-remplit copro_id), `trg_update_invoice_status_after_payment` (AFTER → passe la facture en `paid`).
12 cols : `payment_date, amount, method(payment_method), reference, ledger_tx_id, idempotency_key`.

### `insurance_policies` (VIDE, RLS ON)
PK `id`. FK : `contract_id → contracts CASCADE` (NOT NULL), copro CASCADE. Index copro, contract, (copro,sub_type). Trigger updated_at.
14 cols : `sub_type(mri/rc_syndicat/do/pj/rc_mandataires/pno/autre), policy_number, insurer_name, annual_premium, deductible, guarantees(text[]), related_works, works_reception_date, observations`.
Modèle = extension 1-N d'un `contract` de type assurance. Cohérent mais jamais utilisé.

### `planned_works` (VIDE, RLS ON) — travaux planifiés / PPT
PK `id`. FK : copro CASCADE, `budget_line_id → budget_lines`, created_by. `ag_id, resolution_id` = colonnes **sans FK**. Index copro, (copro,status), (copro,from_ppt) partiel.
22 cols : `work_type(enum 14), planned/vote/completion_date, estimated/voted/actual_amount, status(identified→completed/cancelled), priority, from_ppt, ppt_year, ag_id, resolution_id, budget_line_id, observations`.
**Chevauchement métier** avec le domaine AG/travaux et avec `service_orders` (travaux) → à arbitrer (cf. §Verdict).

---

## 2. CONTRAT FONCTIONNEL (fonctions à honorer par le schéma cible)

Chaîne canonique compta fournisseur (toutes SECURITY DEFINER, search_path=public) :

- **`post_supplier_invoice(copro, period, supplier_id, num, date, due, label, lines jsonb, doc, related_so, post_immediately, ht, tva, taux)` → jsonb**. Écrit `supplier_invoices` + N `supplier_invoice_lines`. Si `post_immediately` : lit `accounts` (cherche code **'401'**), construit écriture D 6xx (account_id par ligne) / C 401 (total) et appelle `create_ledger_transaction(...,'supplier_invoice', invoice_id,...)` (route GL canonique), puis stocke `ledger_tx_id`. → respecte « chaque opération génère une écriture » et la facture en 2 temps (draft sans posting / posted avec GL).
- **`post_supplier_payment(copro, period, invoice_id, amount, date, method, reference, idempotency_key)` → jsonb** (+ surcharge sans idempotency_key — DOUBLON, voir §4). Refuse si facture pas `posted/paid`. Lit `accounts` 401 & **512**. INSERT `supplier_payments` avec `ON CONFLICT (copro_id, idempotency_key) DO NOTHING` (replay idempotent). Écriture D 401 / C 512 via `create_ledger_transaction(...'supplier_payment'...)`. Passe la facture en `paid` si soldée.
- **`update_service_order_status(order_id, new_status, comment, user_id)` → service_orders** (DEFINER). Valide via `is_valid_service_order_transition` (machine à états 12 statuts IMMUTABLE), horodate le bon `*_at`, INSERT `service_order_events('status_changed', from, to)`. **N'écrit PAS le GL** (normal : l'OS n'est pas une opération comptable, c'est la facture qui poste).
- **`create_logbook_from_service_order(order_id)` → uuid** (INVOKER). À la complétion d'un OS, crée 1 `logbook_entries` (mappe urgency→category, art18→incident) et lie `service_orders.logbook_entry_id`. Idempotent (retourne l'existant).
- **`delete_service_order(order_id)`** (DEFINER) : purge events, détache logbook + `budget_payment_schedules`, supprime l'OS.
- **`generate_service_order_number(copro)` → text** : `OS-YYYY-NNNN` (compteur par copro+année — **race possible**, non transactionnel).
- Triggers garde-fous : `validate_supplier_invoice_total` (somme lignes = total, DEFERRED), `validate_supplier_payment` (anti-surpaiement + statut + copro), `update_supplier_invoice_status_after_payment` (recalcul paid), `update_contract_status_auto` (active→to_renew→expired selon end_date/notice), `update_provider_stats` (compteurs prestataire).
- Helpers lecture : `check_invoice_total_integrity`, `get_supplier_invoice_paid_amount`.
- Hors chaîne mais touchent le domaine : `seed_golden_loop`, `create_test_copro`, `create_clean_test_copro` (harnais de test — réinsèrent suppliers/invoices), `prepare_ag_decisions`/`activate_ag_decisions` (citent `planned_works`/`service_orders` côté AG — appartiennent au domaine AG, à arbitrer avec l'agent AG).

**Vues à reproduire** : `v_providers_overview`, `v_contracts_overview`, `v_service_orders_overview`, `v_logbook_overview`, `v_maintenance_stats`, `v_supplier_invoices_overview`, `v_supplier_payment_issues`, `v_invoice_total_mismatch`, `v_finance_integrity_issues`, `v_dashboard_recent_activity`.

---

## 3. VERDICT QUALITÉ — **À REPENSER** (socle correct, mais 2 défauts structurants)

Raison principale : **double référentiel tiers (`providers` ≠ `suppliers`) non réconcilié** + **RLS désactivé sur toutes les tables vivantes** alors que la fusion tiers est déjà décidée.

Preuves concrètes :

1. **Scission tiers artificielle (FUSION décidée — confirmée nécessaire).** `contracts`/`service_orders`/`logbook_entries` pointent `providers` ; `supplier_invoices` pointe `suppliers`. Recouvrement de noms = **0** → un même tiers réel devrait être saisi 2× (une fois comme prestataire, une fois comme fournisseur) pour boucler OS→facture. `providers` = 35 cols (riche/marketing), `suppliers` = 8 cols (compta+IBAN absent !). **IBAN/BIC sont sur `providers` (toujours NULL) mais le paiement se fait via `suppliers` qui n'a PAS d'IBAN** → incohérence fonctionnelle directe. Cible : 1 entité `tiers` portant identité+RIB+rôles (multi-domaines), référencée par contrats, OS, factures.

2. **Colonnes mortes / dénormalisation sur `providers`** : iban=0, bic=0, conformity_docs=0, year_founded=0, employees_count, avg_response_time, indicative_rate (text libres), `category='coproflex'`+`coproflex_label` = annuaire marketing CoProFlex mélangé aux tiers réels de la copro. À sortir (table d'annuaire séparée ou flag) — ne pas migrer ce bruit.

3. **Relation OS↔facture dédoublée et non contrainte** : `service_orders.supplier_invoice_id` ET `supplier_invoices.related_service_order_id` coexistent, **aucune des deux n'a de FK** (l'une absente, l'autre juste colonne). Choisir 1 sens + 1 FK.

4. **Doublons d'index** : `idx_service_orders_created` == `idx_service_orders_copro_created` ; `idx_supplier_invoices_status` == `idx_supplier_invoices_copro_status` ; `idx_supplier_invoice_lines_invoice` == `idx_supplier_invoice_lines_invoice_id`. À dédupliquer.

5. **`logbook_entries.status` = TEXT + CHECK** au lieu d'un enum (les autres statuts du domaine sont des enums) → drift de typage. `provider_name_snapshot` + `provider_id` = dénormalisation snapshot acceptable mais à documenter.

6. **`planned_works` chevauche AG/travaux ET service_orders** (`ag_id`/`resolution_id` sans FK, `work_type` ≈ `contract_type`/`service_order` travaux). Vide. À arbitrer avec le domaine AG/finance travaux : risque de 3e représentation des « travaux ».

7. **`generate_service_order_number`** : `COUNT(*)+1` non sérialisé → collision sous concurrence (l'UNIQUE rattrape mais lève une erreur). Préférer une séquence par copro.

Ce qui est **BIEN FAIT** (à conserver tel quel) : la chaîne compta fournisseur (`post_supplier_invoice`/`post_supplier_payment`) honore partie double + GL via `create_ledger_transaction` + droits constatés (D6xx/C401 à la facture, D401/C512 au paiement) ; idempotence paiement ; trigger DEFERRED somme-lignes=total ; anti-surpaiement ; machine à états OS rigoureuse + journal `service_order_events` immuable (insert/select only) ; multi-poste par compte de charge avec `repartition_key_id`/`budget_line_id` (cohérent lot-centric en aval). Les policies existent partout et utilisent les helpers manager/access → réactivation RLS = travail mécanique.

> Note conformité principes : ni `supplier_invoices` ni les lignes ne portent `lot_id` — **correct** (la charge fournisseur est ventilée par `repartition_key_id`/compte, le lot-centric se dérive via la clé de répartition, pas par stockage direct). Pas d'anomalie ici.

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer agent transverse)

- **`post_supplier_payment` surcharge SANS `idempotency_key`** (src 2510) = ancienne version, doublonne celle AVEC idempotency_key (src 3018). → DROP l'ancienne.
- **Index dupliqués** (3 paires listées §3.4).
- **Colonnes mortes `providers`** : iban, bic, conformity_docs, year_founded, employees_count, avg_response_time, indicative_rate (0 ou quasi-0 usage).
- **`insurance_policies` & `planned_works`** : 0 ligne. Structure à GARDER (assurances = besoin métier réel ; planned_works = à fusionner/arbitrer avec AG). Pas « mortes » au sens schéma, mais aucune donnée à migrer.
- Annuaire CoProFlex (`category='coproflex'`, `coproflex_label`) : 2-3 lignes = données produit, pas données copro → ne pas migrer dans le référentiel tiers d'une copro.

---

## 5. MIGRATION (vers schéma cible)

**À migrer (réel)** :
- **22222222 (boucle d'or)** : `suppliers` 1, `supplier_invoices` 1, `supplier_invoice_lines` 1, `supplier_payments` 1. → reprendre tel quel (rattachés aux écritures GL immuables de la boucle d'or, `ledger_tx_id` à conserver). PAS de contrats/providers/OS/logbook sur 22222222.
- **11111111 (immutable)** : `providers` 13, `contracts` 12, `service_orders` 2, `service_order_events` 7, `logbook_entries` 4, `suppliers` 1, `supplier_invoices` 7, `supplier_invoice_lines` 3, `supplier_payments` 2. → à reprendre intégralement (immutabilité GL).

**Transformation tiers (fusion)** : à la reprise, fusionner `providers`+`suppliers` en `tiers`. Sur 11111111 : 13 providers + 1 supplier, recouvrement nom = 0 → 14 tiers distincts. Re-câbler `contracts.provider_id`, `service_orders.provider_id`, `logbook_entries.provider_id`, `supplier_invoices.supplier_id` vers le nouvel `tiers_id`. Exclure les 2-3 lignes `category='coproflex'` (annuaire produit).

**À ne PAS migrer** : 6 copros de test (`a71786d2, b87f2500, e00b8146, e1fc700e, fe96e927, 1feca864`) — 1 supplier/invoice/payment chacune = artefacts harnais jetables.
