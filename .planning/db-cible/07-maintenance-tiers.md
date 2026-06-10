# Blueprint cible — Domaine 07 : Maintenance / Contrats / Tiers / Ordres de service / Factures fournisseur / Assurances / Travaux planifiés

> Schéma cible PROPRE (forme idéale, pas une photo du live). Corrige les dettes du verdict « À REPENSER », préserve le bien-fait (chaîne compta fournisseur, machine à états OS, audit immuable). Lecture seule live `iyfesbjnkpynmwlsmxnp` (2026-06-04). IDs réels copros : boucle d'or `22222222-aaaa-bbbb-cccc-222222222222`, immuable `11111111-aaaa-bbbb-cccc-111111111111`.

## 0. Décision fondatrice du domaine : entité `tiers` unique

Le live a **deux référentiels** : `providers` (35 cols, riche/marketing, IBAN toujours NULL) et `suppliers` (8 cols, comptable, **sans IBAN**). Recouvrement de noms = **0** ; IBAN/BIC = **NULL partout** sur les copros à migrer. La fusion (décision USER verrouillée) supprime la double saisie OS→facture et corrige l'incohérence « on paie via `suppliers` qui n'a pas de RIB ».

```
                        ┌──────────────┐
                        │    tiers     │  (= providers ⊕ suppliers ⊕ notaires fusionnés)
                        │ identité+RIB │  rôles: is_provider / is_supplier / is_notary
                        └──────┬───────┘
        ┌──────────────┬───────┼───────────────┬──────────────┬───────────────┐
        ▼              ▼       ▼               ▼              ▼               ▼
   contracts     service_orders  logbook_entries  supplier_invoices  (insurance)  mutations.notaire_id
        │              │                              │                            (domaine 05, rôle is_notary)
        ▼              ▼                              ▼
 insurance_policies  service_order_events      supplier_invoice_lines → supplier_payments
   (1-N d'un                                          │
    contract assurance)                               ▼  (chaîne canonique GL)
                                              create_ledger_transaction
```

---

## 1. TABLES

### 1.1 `tiers` (NOUVELLE — fusion `providers` + `suppliers`)

Entité unique « tiers de la copro » : prestataire d'intervention ET/OU fournisseur comptable ET/OU notaire. Porte l'identité, le **RIB (corrige le bug : RIB indispensable au paiement)**, et un jeu de **flags de rôle** (un tiers peut cumuler les rôles). Les colonnes mortes/marketing de `providers` sont supprimées. **Le notaire est un rôle de tiers** (`is_notary`), pas un référentiel séparé — voir §1.11 (arbitrage 05-A2 tranché).

| Colonne | Type PG | Null | Défaut | Note |
|---|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NN | — | FK copros, dimension de cloisonnement |
| `name` | text | NN | — | raison sociale |
| `is_supplier` | boolean | NN | `false` | facturable (référencé par `supplier_invoices`) |
| `is_provider` | boolean | NN | `false` | intervenant (référencé par contrats/OS/logbook) |
| `is_notary` | boolean | NN | `false` | **notaire** (référencé par `mutations.notaire_id`, domaine 05) |
| `category` | `tiers_category` | NN | `'externe'` | voir §2 (remplace `provider_category`, **`coproflex` retiré**) |
| `domain_ids` | `uuid[]` | NN | `'{}'` | domaines d'intervention → FK logique `work_domain` (ex-`domains provider_domain[]`, **enum supprimé** ENUMS.md §2.1) ; index GIN |
| `siret` | text | YES | — | CHECK format si non NULL |
| `vat_number` | text | YES | — | TVA intracom (nouveau, utile compta) |
| `iban` | text | YES | — | **porté sur le tiers** (corrige l'incohérence) |
| `bic` | text | YES | — | idem |
| `office_name` | text | YES | — | étude notariale (rôle notaire, ex-`notaires.office_name`) |
| `notary_reference` | text | YES | — | réf. dossier côté notaire (rôle notaire, ex-`notaires.reference`) |
| `contact_name` | text | YES | — | |
| `contact_role` | text | YES | — | |
| `email` | text | YES | — | CHECK format basique |
| `phone` | text | YES | — | |
| `phone_emergency` | text | YES | — | astreinte (utile art.18 urgence) |
| `address` | text | YES | — | |
| `postal_code` | text | YES | — | |
| `city` | text | YES | — | |
| `rating_avg` | numeric(2,1) | YES | — | CHECK ∈ [0,5] |
| `rating_count` | integer | NN | `0` | |
| `interventions_count` | integer | NN | `0` | maintenu par trigger |
| `last_intervention_at` | timestamptz | YES | — | maintenu par trigger |
| `intervention_radius_km` | integer | YES | — | |
| `certifications` | text[] | NN | `'{}'` | |
| `description` | text | YES | — | |
| `availability` | text | YES | — | |
| `internal_notes` | text | YES | — | |
| `is_active` | boolean | NN | `true` | |
| `created_at` | timestamptz | NN | `now()` | |
| `updated_at` | timestamptz | NN | `now()` | trigger `set_updated_at` consolidé |

**PK** `id`. **FK** `copro_id → copros(id) ON DELETE CASCADE`.
**UNIQUE** `uq_tiers_name (copro_id, name)` (la dimension `category` de l'ancien `uq_provider_name` est retirée : un même nom = un même tiers).
**CHECK** `ck_tiers_rating rating_avg IS NULL OR rating_avg BETWEEN 0 AND 5` ; `ck_tiers_role (is_supplier OR is_provider OR is_notary)` (un tiers sert à au moins une chose) ; `ck_tiers_siret siret IS NULL OR siret ~ '^[0-9]{14}$'`.
**Index** : `(copro_id)`, `(copro_id, is_active)`, `(copro_id, category)`, GIN `(domain_ids)`, partiel `(copro_id) WHERE is_supplier`, partiel `(copro_id) WHERE is_provider`, partiel `(copro_id) WHERE is_notary`.
> `domain_ids` est un `uuid[]` (pas une vraie FK array, non supportée par PG) ; l'intégrité référentielle vers `work_domain` est garantie par un trigger `check_tiers_domain_ids` (chaque élément doit exister dans `work_domain`). Le GIN reste pertinent pour filtrer les tiers par corps de métier.

**Colonnes du live `providers` SUPPRIMÉES (mortes, prouvé) :** `iban`/`bic` (déplacées, étaient NULL), `conformity_docs` (= `[]` partout → remplacé par GED via `documents`), `year_founded` (0), `employees_count` (0), `avg_response_time` (texte libre), `indicative_rate` (texte libre), `website`, `coproflex_label`, et la valeur `coproflex` de la catégorie (label marketing produit, hors référentiel copro). `provider_name_snapshot` reste côté `logbook_entries` (dénormalisation snapshot assumée).

---

### 1.2 `contracts`

Repris quasi tel quel (bien structuré). Re-câblage `provider_id → tiers`.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` |
| `copro_id` | uuid | NN | — |
| `tiers_id` | uuid | NN | — (ex-`provider_id`) |
| `domain_id` | uuid | NN | — FK `work_domain` (ex-`contract_type` enum, **supprimé** ENUMS.md §2.1 ; `nettoyage`/`menage` dédup en `menage`) |
| `label` | text | NN | — |
| `reference` | text | YES | — |
| `start_date` | date | NN | — |
| `end_date` | date | YES | — |
| `renewal_date` | date | YES | — |
| `tacit_renewal` | boolean | NN | `true` |
| `notice_months` | integer | NN | `3` |
| `annual_amount` | numeric(14,2) | YES | — |
| `billing_frequency` | `intervention_frequency` | YES | — |
| `planned_frequency` | `intervention_frequency` | YES | — |
| `planned_day_of_month` | integer | YES | — CHECK ∈ [1,31] |
| `auto_generate_orders` | boolean | NN | `false` |
| `next_planned_intervention` | date | YES | — |
| `is_regulatory` | boolean | NN | `false` |
| `status` | `contract_status` | NN | `'draft'` |
| `terminated_at` | timestamptz | YES | — |
| `termination_reason` | text | YES | — |
| `observations` | text | YES | — |
| `created_by` | uuid | YES | — FK profiles |
| `created_at` / `updated_at` | timestamptz | NN | `now()` |

**FK** `copro_id → copros CASCADE`, `tiers_id → tiers(id) ON DELETE RESTRICT` (un tiers sous contrat ne se supprime pas silencieusement), `domain_id → work_domain(id) ON DELETE RESTRICT`, `created_by → profiles ON DELETE SET NULL`.
**CHECK** `end_date IS NULL OR end_date >= start_date` ; `planned_day_of_month BETWEEN 1 AND 31`.
> **Sémantique « contrat d'assurance »** : auparavant dérivée de `contract_type = 'assurance'`. Désormais `domain_id` pointe le slug `work_domain.slug = 'assurance'`. Le trigger d'intégrité `insurance_policies` (§1.9) teste ce slug au lieu de l'ancienne valeur d'enum.
**NOUVEAU CHECK d'intégrité copro** (manquant au live) : trigger `check_contract_tiers_copro` — `tiers.copro_id = contracts.copro_id` (interdit de lier un contrat au tiers d'une autre copro).
**Index** `(copro_id)`, `(copro_id, end_date)`, `(tiers_id)`, `(copro_id, status)`.

---

### 1.3 `service_orders`

Machine à états rigoureuse conservée. **Décision OS↔facture** : on garde **UN seul sens** = `supplier_invoices.service_order_id → service_orders` (FK réelle, côté facture). La colonne `service_orders.supplier_invoice_id` est **SUPPRIMÉE** (jamais peuplée : 0/2 au live ; relation 1-N facture→OS plus naturelle qu'1-1).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` |
| `copro_id` | uuid | NN | — |
| `order_number` | text | NN | — (séquence, voir §4) |
| `tiers_id` | uuid | NN | — (ex-`provider_id`) |
| `contract_id` | uuid | YES | — |
| `building_id` | uuid | YES | — |
| `lot_id` | uuid | YES | — |
| `logbook_entry_id` | uuid | YES | — |
| `order_type` | `service_order_type` | NN | `'classique'` |
| `origin` | `service_order_origin` | NN | `'syndic'` |
| `urgency` | `priority_level` | NN | `'normal'` | (ex-`urgency_level`, fusionné — ENUMS.md §1.5) |
| `is_art18_emergency` | boolean | NN | `false` |
| `emergency_ceiling` | numeric(14,2) | YES | — |
| `title` | text | NN | — |
| `description` | text | YES | — |
| `estimated_amount` / `quoted_amount` / `actual_amount` | numeric(14,2) | YES | — |
| `status` | `service_order_status` | NN | `'draft'` |
| `refusal_reason` | text | YES | — |
| `sent_at … cancelled_at` | timestamptz | YES | — (10 jalons horodatés) |
| `created_by` | uuid | YES | — |
| `created_at` / `updated_at` | timestamptz | NN | `now()` |

**FK** `copro_id → copros CASCADE`, `tiers_id → tiers RESTRICT`, `contract_id → contracts ON DELETE SET NULL`, `building_id → buildings SET NULL`, `lot_id → lots SET NULL`, `logbook_entry_id → logbook_entries SET NULL`, `created_by → profiles SET NULL`.
**UNIQUE** `(copro_id, order_number)`.
**Trigger intégrité copro** : `tiers.copro_id = copro_id` ET (si `contract_id`) `contracts.copro_id = copro_id` ET (si `lot_id`) `lots.copro_id = copro_id`.
**Index** : `(copro_id)`, `(copro_id, created_at)` (**doublon `idx_service_orders_created` supprimé**), `(tiers_id)`, `(copro_id, status)`.

---

### 1.4 `service_order_events` (audit append-only — conservé tel quel)

PK `id`. FK `copro_id → copros CASCADE`, `service_order_id → service_orders CASCADE`, `created_by → profiles SET NULL`.
Colonnes : `event_type service_order_event_type`, `from_status service_order_status`, `to_status service_order_status`, `payload jsonb`, `comment text`, `created_by uuid`, `created_at timestamptz NN now()`.
**Pas de policy UPDATE/DELETE** (immuable). Index `(service_order_id, created_at)`.

---

### 1.5 `logbook_entries` (carnet d'entretien)

Dette corrigée : **`status` TEXT+CHECK → enum** (cohérence de typage avec le reste du domaine).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` |
| `copro_id` | uuid | NN | — |
| `building_id` | uuid | YES | — |
| `tiers_id` | uuid | YES | — (ex-`provider_id`) |
| `contract_id` | uuid | YES | — |
| `service_order_id` | uuid | YES | — |
| `document_id` | uuid | YES | — |
| `entry_type` | `logbook_entry_type` | NN | — |
| `category` | `intervention_category` | NN | `'courante'` |
| `title` | text | NN | — |
| `description` | text | YES | — |
| `equipment_concerned` | text | YES | — |
| `provider_name_snapshot` | text | YES | — (dénormalisation assumée, doc) |
| `domain_id` | uuid | YES | — FK `work_domain` (ex-`domain provider_domain`, enum **supprimé** ENUMS.md §2.1) |
| `budget_category` | text | YES | — |
| `happened_at` | date | NN | — |
| `completed_at` | date | YES | — |
| `next_due_at` | date | YES | — |
| `cost` | numeric(14,2) | YES | — |
| `status` | `logbook_status` (**NOUVEL enum** planifiee/en_cours/terminee) | NN | `'planifiee'` |
| `comments` | text | YES | — |
| `created_by` | uuid | YES | — |
| `created_at` / `updated_at` | timestamptz | NN | `now()` |

**FK** copro CASCADE ; `tiers_id → tiers SET NULL` ; `contract_id → contracts SET NULL` ; `service_order_id → service_orders SET NULL` ; `document_id → documents SET NULL` ; `building_id → buildings SET NULL` ; `created_by → profiles SET NULL`.
**Trigger** `trg_update_provider_stats` (réécrit → met à jour `tiers.interventions_count`/`last_intervention_at`). Index `(copro_id)`, `(copro_id, happened_at)`, `(tiers_id)`, `(service_order_id)`.

---

### 1.6 `supplier_invoices` (facture fournisseur — chaîne canonique GL préservée)

Re-câblage `supplier_id → tiers`. Ajout de la **vraie FK OS** (`service_order_id`, sens unique retenu).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` |
| `copro_id` | uuid | NN | — |
| `period_id` | uuid | NN | — |
| `tiers_id` | uuid | NN | — (ex-`supplier_id`) |
| `service_order_id` | uuid | YES | — (ex-`related_service_order_id`, **désormais vraie FK**) |
| `invoice_number` | text | NN | — |
| `invoice_date` | date | NN | — |
| `due_date` | date | YES | — |
| `label` | text | NN | — |
| `total_amount` | numeric(14,2) | NN | — CHECK > 0 |
| `montant_ht` | numeric(14,2) | YES | — |
| `montant_tva` | numeric(14,2) | YES | — |
| `taux_tva` | numeric(5,2) | YES | — |
| `status` | `supplier_invoice_status` | NN | `'draft'` |
| `document_id` | uuid | YES | — |
| `ledger_tx_id` | uuid | YES | — (lien GL, immuable une fois posé) |
| `created_by` | uuid | YES | — |
| `created_at` / `updated_at` | timestamptz | NN | `now()` |

**FK** `copro_id → copros CASCADE`, `period_id → accounting_periods RESTRICT`, `tiers_id → tiers RESTRICT`, `service_order_id → service_orders ON DELETE SET NULL`, `document_id → documents SET NULL`, `ledger_tx_id → ledger_transactions ON DELETE RESTRICT`, `created_by → profiles SET NULL`.
**CHECK** `total_amount > 0`. **UNIQUE** `uq_supplier_invoice_num (copro_id, tiers_id, invoice_number)` (anti double-saisie d'une même facture — manquant au live).
**Triggers** : `validate_supplier_invoice_total` (DEFERRED, somme lignes = total ±0,01) ; intégrité copro (`tiers.copro_id = copro_id`, `period.copro_id = copro_id`).
**Index** : `(copro_id, period_id)`, `(copro_id, status)` (**doublon supprimé**), `(tiers_id)`, `(service_order_id)`.

> Conformité : ni la facture ni les lignes ne portent `lot_id` — **correct**. La charge se ventile par `repartition_key_id`/compte 6xx ; le lot-centric se dérive via la clé, jamais stocké en dur.

---

### 1.7 `supplier_invoice_lines`

PK `id`. FK `copro_id → copros CASCADE`, `invoice_id → supplier_invoices CASCADE`, `account_id → accounts RESTRICT` (compte de charge 6xx, NN), `repartition_key_id → repartition_keys RESTRICT`, `budget_line_id → budget_lines SET NULL`.
Colonnes : `account_id`, `label text NN`, `amount numeric(14,2) NN CHECK>0`, `repartition_key_id uuid`, `budget_line_id uuid`, `amount_ht numeric(14,2)`, `amount_tva numeric(14,2)`, `taux_pct numeric(5,2)`.
**Trigger** CONSTRAINT DEFERRED `trg_validate_invoice_total`. Index **unique** `(invoice_id)` côté requête (**doublon `..._invoice` vs `..._invoice_id` fusionné en un seul**).

---

### 1.8 `supplier_payments`

PK `id`. FK `copro_id → copros CASCADE`, `period_id → accounting_periods RESTRICT`, `supplier_invoice_id → supplier_invoices CASCADE`, `ledger_tx_id → ledger_transactions RESTRICT`, `created_by → profiles SET NULL`.
Colonnes : `payment_date date NN`, `amount numeric(14,2) NN CHECK>0`, `method payment_method NN`, `reference text`, `ledger_tx_id uuid`, `idempotency_key text`.
**UNIQUE partiel** `ux_supplier_payments_idempotency (copro_id, idempotency_key) WHERE idempotency_key IS NOT NULL` (replay idempotent — conservé).
**Triggers** `validate_supplier_payment` (anti-surpaiement + statut posted/paid + auto-copro), `update_supplier_invoice_status_after_payment` (→ `paid` si soldée).

---

### 1.9 `insurance_policies` (extension 1-N d'un contrat assurance — structure conservée, vide)

PK `id`. FK `contract_id → contracts CASCADE` (NN), `copro_id → copros CASCADE`.
Colonnes : `sub_type insurance_sub_type NN`, `policy_number text`, `insurer_name text`, `annual_premium numeric(14,2)`, `deductible numeric(14,2)`, `guarantees text[] NN '{}'`, `related_works text`, `works_reception_date date`, `observations text`, `created_at`/`updated_at`.
**Trigger intégrité** : `contract.copro_id = copro_id` ET `contract.domain_id = (SELECT id FROM work_domain WHERE slug = 'assurance')` (l'assurance n'étend qu'un contrat dont le domaine est `assurance` ; ex-test `contract_type = 'assurance'` sur l'enum supprimé). Index `(copro_id)`, `(contract_id)`, `(copro_id, sub_type)`.

---

### 1.10 `planned_works` (travaux planifiés / PPT) — **conservée, FK posées, lien AG nettoyé**

Le verdict signalait un chevauchement AG/travaux/service_orders. Décision : **`planned_works` reste la table de PLANIFICATION pluriannuelle (PPT)** ; elle est distincte de `service_orders` (exécution opérationnelle) et de `budget_lines` (vote/engagement). Les colonnes `ag_id`/`resolution_id` **sans FK** sont corrigées (vraies FK, propriété du domaine AG → liaison, pas duplication). Confirmée câblée front (`useLogbook.ts` l.170).

PK `id`. FK `copro_id → copros CASCADE`, `domain_id → work_domain ON DELETE RESTRICT` (ex-`work_type`), `budget_line_id → budget_lines SET NULL`, **`ag_id → ag_meetings ON DELETE SET NULL`** (nouveau), **`resolution_id → ag_resolutions ON DELETE SET NULL`** (nouveau), `created_by → profiles SET NULL`.
Colonnes : `domain_id uuid NN` (FK `work_domain`, ex-`work_type planned_work_type` enum **supprimé** ENUMS.md §2.1), `label text NN`, `description text`, `planned_date`/`vote_date`/`completion_date date`, `estimated_amount`/`voted_amount`/`actual_amount numeric(14,2)`, `status planned_work_status NN 'identified'`, `priority priority_level` (ex-`work_priority`, fusionné — ENUMS.md §1.5 ; remap `urgent`→`critical`), `from_ppt boolean NN false`, `ppt_year integer`, `observations text`, `created_at`/`updated_at`.
Index `(copro_id)`, `(copro_id, status)`, partiel `(copro_id) WHERE from_ppt`.

---

### 1.11 Notaire = rôle de `tiers` (arbitrage 05-A2 TRANCHÉ — pas de table `notaires` séparée)

**Contradiction inter-domaines résolue.** Le blueprint 05 §1.5 crée une table `notaires` distincte et laisse l'arbitrage 05-A2 ouvert (« table dédiée OU sous-type de `tiers` ? »). Or la décision USER verrouillée est **« FUSIONNER en UNE entité tiers »**. Un notaire est un tiers de la copro : maintenir `tiers` (07) **et** `notaires` (05) ferait coexister **deux référentiels de tiers** — exactement l'anti-pattern que la fusion veut supprimer (cf. mémoire `app_architecture` : « ne pas laisser deux patterns coexister »).

**Décision : le notaire devient un RÔLE de `tiers`.**
- Flag `is_notary boolean NN false` sur `tiers` (cf. §1.1).
- Colonnes de rôle notaire portées par `tiers` : `office_name` (étude) et `notary_reference` (réf. dossier notaire). L'identité (`name`, `email`, `phone`) est déjà mutualisée.
- **La table `notaires` du blueprint 05 est ABANDONNÉE.** La FK `mutations.notaire_id` (domaine 05) pointe désormais **`tiers(id)`** au lieu de `notaires(id)` (`ON DELETE SET NULL` conservé).
- Le `tiers_id` nullable « de transition » proposé en 05-A2 (reco) **n'a plus lieu d'être** : le notaire EST le tiers, pas un objet qui le référence.

**Migration** : les 3 ex-colonnes `mutations.notary_name/notary_email/notary_reference` créent une ligne `tiers` (`is_notary=true`, `name`=notary_name, `email`=notary_email, `notary_reference`=notary_reference) puis `mutations.notaire_id` pointe ce tiers. Sur 11111111 : « Maître NOTAIRE » (réf. `DOSSIER-2026-001`) → 1 tiers notaire de plus (porté à 16 tiers distincts si non recouvrant avec un tiers existant).

**RLS notaire** : un tiers `is_notary` reste sous la policy `tiers` du §3. **Exception de visibilité** : le copropriétaire ne doit PAS voir les notaires (donnée de mutation, sensible). Le SELECT copropriétaire sur `tiers` est donc filtré `is_notary = false` (annuaire prestataires uniquement) — voir §3.

**Cohérence cross-domaine** : ce blueprint 07 **possède** l'entité `tiers` ; le domaine 05 la **consomme** via `notaire_id`. Synchroniser le blueprint 05 (retirer la table `notaires`, repointer la FK) lors de la passe d'alignement inter-domaines.

---

### 1.13 `tiers_directory` (VUE — annuaire prestataires lisible côté copropriétaire, A22)

**Lecture copropriétaire de l'annuaire via une VUE, jamais SELECT direct sur la table.** La table `tiers` porte des données sensibles (`iban`/`bic`/`internal_notes`/RIB) qu'un copropriétaire ne doit pas voir. La vue `tiers_directory` **masque ces colonnes** et n'expose que l'identité publique et le métier :

```sql
CREATE VIEW tiers_directory WITH (security_invoker = true) AS
SELECT id, copro_id, name, category, domain_ids, vat_number,
       contact_name, contact_role, email, phone, address, postal_code, city,
       rating_avg, rating_count, certifications, description, is_active
FROM tiers
WHERE is_notary = false;          -- annuaire prestataires uniquement, notaires exclus
-- COLONNES MASQUÉES : iban, bic, siret(*), internal_notes, phone_emergency, interventions_count
```

- `security_invoker = true` → la vue **hérite des policies RLS de `tiers`** (cloisonnement copro ET cabinet déjà portés par les helpers via la table sous-jacente). Pas de RLS à redéfinir sur la vue.
- Filtre `is_notary = false` **dans la vue** (double verrou avec la policy §3) → les notaires n'apparaissent jamais à l'annuaire.
- (*) `siret` masqué par défaut (donnée identitaire) ; si la transparence l'exige, le ré-ajouter — arbitrage mineur.
- Le **gestionnaire** continue de lire la table `tiers` en direct (ALL via helper) ; la vue sert au **copropriétaire** (et à tout écran « annuaire public copro »).

---

### 1.12 `work_domain` (NOUVELLE table de référence — possédée par 07, partagée en lecture)

Référentiel des **corps de métier / domaines d'intervention**, extensible **sans migration d'enum** (cf. mémoire projet). Remplace le socle commun des 3 enums legacy `contract_type` / `provider_domain` / `planned_work_type` (tous **SUPPRIMÉS** — ENUMS.md §2.1). Possédée par le domaine 07 (ses plus gros consommateurs : tiers, contrats, OS, travaux) ; consommée en lecture par les autres domaines via FK, à l'image du plan comptable `accounts` côté finance.

| Colonne | Type PG | Null | Défaut | Note |
|---|---|---|---|---|
| `id` | uuid | NN | `gen_random_uuid()` | PK |
| `slug` | text | NN | — | identifiant stable (ex. `plomberie`, `ascenseur`, `assurance`) |
| `label` | text | NN | — | libellé affichable FR |
| `is_active` | boolean | NN | `true` | masquage sans suppression |
| `sort_order` | integer | NN | `0` | ordre d'affichage annuaire |
| `created_at` | timestamptz | NN | `now()` | |

**PK** `id`. **UNIQUE** `uq_work_domain_slug (slug)` (référentiel global, non cloisonné par copro : un corps de métier est universel). **Index** `(is_active, sort_order)`.

**Seed (migration 07)** : les 28 slugs du socle unifié (ENUMS.md §2.1) — `plomberie`, `electricite`, `chauffage`, `climatisation`, `ascenseur`, `menage`, `espaces_verts`, `serrurerie`, `peinture`, `toiture`, `facade`, `etancheite`, `isolation`, `menuiserie`, `interphone`, `portail`, `securite`, `securite_incendie`, `accessibilite`, `parking`, `assurance`, `juridique`, `architecture`, `eau`, `electricite_commune`, `syndic`, `maintenance`, `autre`.

**RLS** : `service_role` bypass ; **SELECT pour tout rôle authentifié** (`auth.role() = 'authenticated'`) car c'est un référentiel partagé lisible par tous (gestionnaire ET copropriétaire, pour afficher le métier d'un prestataire) ; **INSERT/UPDATE/DELETE réservés `service_role`** (étendre le référentiel = acte d'administration, pas une action gestionnaire courante). RLS ON + FORCE en prod.

**Trigger consommateur** : `check_tiers_domain_ids` (BEFORE I/U sur `tiers`) — chaque élément de `tiers.domain_ids` doit exister dans `work_domain.id` (intégrité d'un `uuid[]`, PG ne supportant pas la FK array).

---

## 2. ENUMS (catalogue rationalisé — référence, pas redéfinition)

Réutilisés tels quels : `contract_status`, `service_order_type`, `service_order_origin`, `service_order_status`, `service_order_event_type`, `intervention_category`, `intervention_frequency`, `logbook_entry_type`, `insurance_sub_type`, `supplier_invoice_status`, `payment_method`, `planned_work_status`.

**❌ NE sont PLUS des enums (remplacés par la table de réf `work_domain` — ENUMS.md §2.1) :** `contract_type`, `provider_domain`, `planned_work_type`. Leurs colonnes deviennent des FK `work_domain` : `contracts.domain_id` (§1.2), `tiers.domain_ids uuid[]` (§1.1), `logbook_entries.domain_id` (§1.5), `planned_works.domain_id` (§1.10). La table `work_domain` est créée et possédée par ce domaine (§1.12).

**Changements ciblés du domaine (à acter au catalogue enums global T2) :**
- **`tiers_category`** (NOUVEAU, remplace `provider_category`) : `{syndic, copropriete, externe}` — **valeur `coproflex` retirée** (label marketing produit, pas un type de tiers copro).
- **`logbook_status`** (NOUVEAU) : `{planifiee, en_cours, terminee}` — remplace le `status TEXT + CHECK` de `logbook_entries` (corrige le drift de typage).
- **`priority_level`** (catalogue global — ENUMS.md §1.5, **DÉJÀ TRANCHÉ**, plus un arbitrage ouvert) : `{low, normal, medium, high, critical}`. **Fusionne `urgency_level` + `work_priority`, tous deux SUPPRIMÉS.** Le domaine 07 s'y aligne : `service_orders.urgency` et `planned_works.priority` sont de type `priority_level`. **Remap appliqué** : `work_priority.urgent → priority_level.critical` (les valeurs `low/medium/high` sont identiques ; `normal` ne vient que de `urgency_level`). Aucune colonne de 07 ne référence plus `urgency_level`/`work_priority`.

---

## 3. RLS — 3 rôles + bypass service_role

**Constat live** : 9 tables porteuses de données ont **RLS OFF** alors que les policies existent (helpers `user_is_copro_manager` / `user_has_copro_access`). Les 2 vides (`insurance_policies`, `planned_works`) ont RLS ON. Cible prod : **RLS ON + FORCE sur les 10 tables**, branche `service_role` explicite (bicéphale ON prod / OFF dev via `_rls_state_snapshot` tooling).

**Plan de câblage `user_id`** : `coproprietaires.user_id` est NULL aujourd'hui → l'accès copropriétaire passe par `memberships` (helper `user_has_copro_access`) et, pour le périmètre lot, par `get_user_lot_ids`. Tant que le câblage `user_id` n'est pas fait, le rôle copropriétaire voit la copro mais pas le filtrage fin par lot (acceptable : ce domaine n'expose pas de données lot-sensibles côté copro).

| Table | service_role | gestionnaire (G-MGR) | copropriétaire (G-OWNER/access) | anon |
|---|---|---|---|---|
| `work_domain` (référentiel global) | ALL bypass | **SELECT** (lecture du référentiel ; écriture = service_role only) | **SELECT** (tout authentifié, pour afficher le métier d'un prestataire) | ✗ |
| `tiers` | ALL bypass | ALL `user_is_copro_manager(copro_id)` | **PAS de SELECT direct** → lecture via la VUE `tiers_directory` (§1.13, RIB/IBAN/notes masqués, `is_notary=false`) ; policy table = SELECT `user_has_copro_access(copro_id) AND is_notary = false` minimale pour faire vivre `security_invoker` | ✗ |
| `tiers_directory` (VUE, §1.13) | hérite `tiers` | (vue gestionnaire facultative) | lecture annuaire (RIB masqué) — RLS héritée de `tiers` via `security_invoker` | ✗ |
| `contracts` | ALL bypass | ALL manager | SELECT access (info contrats copro) | ✗ |
| `service_orders` | ALL bypass | ALL manager | SELECT access | ✗ |
| `service_order_events` | INSERT/SELECT bypass | INSERT+SELECT manager (**pas UPDATE/DELETE**) | SELECT access | ✗ |
| `logbook_entries` | ALL bypass | ALL manager | SELECT access (carnet consultable) | ✗ |
| `supplier_invoices` | ALL bypass | ALL manager | **✗ SELECT** (donnée comptable sensible, gestionnaire only) | ✗ |
| `supplier_invoice_lines` | ALL bypass | ALL manager (via invoice) | ✗ | ✗ |
| `supplier_payments` | ALL bypass | ALL manager | ✗ | ✗ |
| `insurance_policies` | ALL bypass | ALL manager | SELECT access (attestation assurance = droit copro) | ✗ |
| `planned_works` | ALL bypass | ALL manager | SELECT access (PPT communicable) | ✗ |

**Garde service_role** : chaque policy ajoute `OR (auth.jwt()->>'role') = 'service_role'` (ou `current_setting('request.jwt.claims',true)::jsonb->>'role'`), désactivable en dev. Helper : `user_is_copro_manager(copro_id)` (pivot gestionnaire), `user_has_copro_access(copro_id)` (accès copro).
**Cloisonnement cabinet (multi-cabinet)** : le périmètre cabinet est **intégré dans ces deux helpers** (`user_is_copro_manager`/`user_has_copro_access` vérifient déjà `copros.cabinet_id` ↔ cabinet de l'utilisateur). Les policies de CE domaine n'ont **rien de spécifique cabinet** à écrire : elles appellent les helpers et héritent du cloisonnement. Aucune colonne `cabinet_id` sur les tables 07 (la tenance est portée par `copros`).
**Anon = aucun accès** sur tout le domaine (aucune surface publique maintenance/compta).

---

## 4. TRIGGERS conservés / ajoutés

**Conservés (réécrits pour `tiers`)** :
- `trg_update_provider_stats` → **réécrit** : `logbook_entries` AFTER I/U → recalcule `tiers.interventions_count` + `last_intervention_at` (cible `tiers`, plus `providers`).
- `update_contract_status_auto` (BEFORE I/U `contracts` : draft→active→to_renew→expired selon `end_date`/`notice_months`).
- `validate_supplier_invoice_total` (CONSTRAINT DEFERRED : Σ lignes = `total_amount` ±0,01).
- `validate_supplier_payment` (BEFORE : interdit paiement sur draft/cancelled, anti-surpaiement, auto `copro_id`).
- `update_supplier_invoice_status_after_payment` (AFTER : facture → `paid` si soldée).
- `set_updated_at` **consolidé** (1 seule fonction au lieu des ~8 variantes) sur les tables `updated_at` du domaine.

**Ajoutés (intégrité copro manquante au live)** :
- `check_contract_tiers_copro`, `check_so_copro_consistency`, `check_invoice_copro_consistency`, `check_insurance_contract_copro` — garantissent que toutes les FK pointent un objet de la MÊME copro (verrou anti-fuite inter-copro).

**Hérités du socle finance (NE PAS toucher, posés par la chaîne GL)** : immutabilité `ledger_transactions`/`ledger_entries`, `enforce_lot_id_on_45x`, `trg_enforce_is_postable`, `check_single_open_period`. Le domaine 07 les **respecte** via `create_ledger_transaction` (route canonique), il ne les redéfinit pas.

---

## 5. FONCTIONS du domaine — GARDER / RÉÉCRIRE / ABANDONNER

| Fonction | Disposition | Garde proposée |
|---|---|---|
| `post_supplier_invoice(... lines, post_immediately, ht, tva, taux)` | **GARDER** (B en 2 temps : draft sans posting / posted D6xx/C401 via `create_ledger_transaction`). Adapter signature `supplier_id → tiers_id` | **G-MGR** (`REVOKE anon`, garde `user_is_copro_manager`) |
| `post_supplier_payment(... idempotency_key)` (8-arg) | **GARDER** (idempotent, D401/C512) | **G-MGR** |
| `post_supplier_payment` 7-arg (sans idempotency) | **ABANDONNER** (risque double paiement, edge utilise déjà la 8-arg) | — DROP |
| `update_service_order_status(order_id, new_status, comment, user_id)` | **GARDER** (machine à états + `service_order_events`, ne poste PAS le GL = correct) | **G-MGR** |
| `is_valid_service_order_transition(from, to)` | **GARDER** (IMMUTABLE pur) | G-INTERNAL (REVOKE anon) |
| `create_logbook_from_service_order(order_id)` | **GARDER** (idempotent) | **G-MGR** |
| `delete_service_order(order_id)` | **GARDER** + **RÉÉCRIRE avant DROP de `budget_payment_schedules`** : retirer le bloc `UPDATE budget_payment_schedules SET service_order_id = NULL` (table DROP en 03 §1.9, sinon `relation does not exist`). Reste = purge `service_order_events` + détache `logbook_entries`. Séquence : réécrire CETTE fonction PUIS DROP la table | **G-MGR** |
| `generate_service_order_number(copro)` | **RÉÉCRIRE** : `COUNT(*)+1` non sérialisé → **séquence par copro** (ou `INSERT ... RETURNING` advisory-lock). Corrige la race | G-INTERNAL |
| `update_provider_stats` (trigger) | **RÉÉCRIRE** → cible `tiers` | G-TRIG (REVOKE PUBLIC) |
| `update_contract_status_auto` (trigger) | **GARDER** | G-TRIG |
| `get_supplier_invoice_paid_amount(invoice_id)` | **GARDER** | G-INTERNAL |
| `check_invoice_total_integrity` | **GARDER** (assertion audit) | G-INTERNAL |
| triggers `validate_supplier_invoice_total` / `validate_supplier_payment` / `update_supplier_invoice_status_after_payment` | **GARDER** | G-TRIG |

**Transverse domaine** : toutes les DEFINER d'écriture passent en `REVOKE EXECUTE FROM anon` + garde in-function (le live expose 189/190 fonctions à anon — défaut critique).

---

## 6. CARTE DE MIGRATION (ancien → nouveau) — UNIQUEMENT 22222222 + 11111111

### 6.1 Tiers (fusion `providers` ⊕ `suppliers` ⊕ `notaires` → `tiers`)
**Volume réel confirmé** : 13 `providers` (11111111) + 1 `supplier` (11111111 « ENTRETIEN PLUS SARL ») + 1 `supplier` (22222222 « Allianz Assurances ») + 1 notaire éclaté sur `mutations` (11111111 « Maître NOTAIRE »). Recouvrement de noms = **0** → **16 tiers distincts**.

| Source | Mapping | Transformation |
|---|---|---|
| `providers.*` | → `tiers.*` | `is_provider=true` ; `is_supplier=false` ; `is_notary=false` ; `iban/bic` portés (NULL ici) ; **DROP** conformity_docs (`[]`), year_founded (0), employees_count (0), avg_response_time, indicative_rate, website, coproflex_label |
| `providers.category='coproflex'` (2 lignes : ChauffagePro Rhône, VertJardin) | → `tiers.category` reclassé | **PRESERVÉ comme tiers réels** (portent contrats+OS sur 11111111, vérifié) ; `coproflex`→`copropriete` ou `externe`, label marketing supprimé. **NE PAS exclure** (la cartographie se trompait) |
| `suppliers.*` (2 lignes) | → `tiers.*` | `is_supplier=true` ; `is_provider=false` ; `suppliers.contact.jsonb` éclaté → colonnes `email/phone/iban/bic` |
| `mutations.notary_name/notary_email/notary_reference` (1 notaire sur 11111111) | → `tiers.*` (`is_notary=true`) | **ex-table `notaires` (05) DISSOUTE dans `tiers`** : `name`=notary_name, `email`=notary_email, `notary_reference`=notary_reference ; puis `mutations.notaire_id → tiers.id` (FK domaine 05 repointée). Voir §1.11 |
| `contracts.provider_id` (12 sur 11111111) | → `contracts.tiers_id` | re-câblage vers nouvel `id` tiers |
| `service_orders.provider_id` (2 sur 11111111) | → `service_orders.tiers_id` | idem |
| `logbook_entries.provider_id` (4 sur 11111111) | → `logbook_entries.tiers_id` | idem |
| `supplier_invoices.supplier_id` (7 sur 11111111 + 1 sur 22222222) | → `supplier_invoices.tiers_id` | re-câblage |

### 6.2 Reste du domaine
- **Remap enums → `work_domain` (préalable)** : seed des 28 slugs (§1.12), puis `contracts.contract_type → contracts.domain_id` (jointure slug ; `nettoyage`→`menage`), `tiers.domains[] → tiers.domain_ids[]`, `logbook_entries.domain → logbook_entries.domain_id`, `planned_works.work_type → planned_works.domain_id` (0 ligne). Toute valeur legacy doit matcher un slug seedé ; sinon → slug `autre`.
- `contracts` 12, `service_orders` 2, `service_order_events` 7, `logbook_entries` 4 (tous 11111111) → repris ; `logbook.status TEXT → logbook_status` ; **DROP** `service_orders.supplier_invoice_id` (toujours NULL).
- `supplier_invoices` : 22222222 = **1 facture** ; 11111111 = **7 factures**. `related_service_order_id → service_order_id` (FK ; tous NULL au live, aucune perte). **Conserver `ledger_tx_id`** (lien GL immuable).
- `supplier_invoice_lines` (~1 sur 22222222, 3 sur 11111111) → repris (`amount`, `account_id`, `repartition_key_id`).
- `supplier_payments` : 22222222 = **1 paiement avec `ledger_tx_id` non NULL** (immuable, à conserver à l'identique) ; 11111111 = **2** → repris.
- `insurance_policies`, `planned_works` : **0 ligne** → structure cible créée, rien à migrer.

### 6.3 Ce qu'on NE reprend PAS (dette legacy)
- Colonnes mortes `providers` (§1.1) — bruit annuaire/marketing.
- 6 copros de test (`a71786d2, b87f2500, e00b8146, e1fc700e, fe96e927, 1feca864`) — 1 supplier/invoice/payment chacune, artefacts harnais jetables.
- Doublons d'index (3 paires), `service_orders.supplier_invoice_id`, surcharge `post_supplier_payment` 7-arg.
- Référentiel `providers` séparé (dissous dans `tiers`).

---

## 7. ARBITRAGES — TRANCHÉS (verrous USER appliqués)

1. **1 facture `posted/paid` sans `ledger_tx_id`** (9/10 liées au live). Sur les copros à migrer, vérifier laquelle : si c'est sur 11111111 (immuable), on **migre l'état tel quel** (immutabilité GL prime, on ne « répare » pas une copro immuable). Si artefact, signaler. **Recommandation : migrer à l'identique, ne pas reposter.**
2. **`tiers_category` pour les 2 ex-`coproflex`** (ChauffagePro Rhône, VertJardin, copro 11111111) : reclasser en `copropriete` ou `externe` ? Ce sont des prestataires d'intervention standard. **Recommandation : `externe`** (prestataire tiers de la copro), label marketing supprimé.
3. **Sens unique OS↔facture** : retenu = `supplier_invoices.service_order_id → service_orders` (1 OS peut générer N factures ; FK côté facture). La colonne inverse `service_orders.supplier_invoice_id` est supprimée. **Recommandation : valider ce sens** (jamais peuplé au live, aucun risque de perte).
4. **`planned_works` vs `service_orders` (travaux)** : garde-t-on `planned_works` comme couche PPT/planification distincte (recommandé, câblée front + FK AG propres), ou fusionne-t-on dans le domaine AG/finance-travaux ? **Recommandation : GARDER distincte** (planification ≠ exécution ≠ engagement budgétaire) — à co-valider avec l'agent domaine AG/finance qui « possède » `ag_id`/`resolution_id`. **→ CO-VALIDATION OBTENUE (cf. 04 §0.1)** : propriété confirmée au domaine 07 ; le domaine 04 expose seulement `ag_meetings(id)`/`ag_resolutions(id)` comme cibles de FK et accorde les FK `ag_id`/`resolution_id` posées ici (liaison 07 → 04, `ON DELETE SET NULL`). Arbitrage de propriété clos.
5. **Lecture copropriétaire de l'annuaire `tiers`** — **TRANCHÉ (A22)** : exposition au copropriétaire via la **VUE `tiers_directory`** (§1.13, `security_invoker`) qui masque `iban/bic/siret/internal_notes/phone_emergency` et filtre `is_notary=false`. **Pas de SELECT direct** sur la table `tiers` côté copro.
6. **`vat_number` ajouté sur `tiers`** — **TRANCHÉ (A22)** : champ TVA intracom **ajouté** (utile compta, exposé aussi dans la vue annuaire). Le schéma fait foi (A1), pas besoin d'iso-données live.
7. **Notaire = rôle de `tiers` (arbitrage 05-A2)** — **TRANCHÉ** (plus ouvert). Cohérence avec la décision USER « FUSIONNER en UNE entité tiers » : le notaire est un `tiers` avec `is_notary=true` (+ `office_name`/`notary_reference`), **la table `notaires` du blueprint 05 est abandonnée**, `mutations.notaire_id → tiers(id)`. Élimine le double référentiel de tiers. Le copropriétaire ne voit pas les notaires (filtre RLS `is_notary=false`). **Action inter-domaine** : aligner le blueprint 05 (supprimer §1.5 `notaires`, repointer la FK). Voir §1.11.
8. **Échelle priorité/urgence `priority_level` (ex-`urgency_level` + `work_priority`)** — **TRANCHÉ** par ENUMS.md §1.5 (n'est plus un arbitrage ouvert du domaine). 07 s'aligne : `service_orders.urgency` et `planned_works.priority` en `priority_level {low,normal,medium,high,critical}` ; remap `work_priority.urgent → critical` appliqué à la migration des lignes `planned_works` (0 ligne au live → aucun remap effectif, mais règle posée pour la suite). Plus aucune référence à `urgency_level`/`work_priority` dans 07.
