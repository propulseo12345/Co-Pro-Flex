# ENTITIES_MAP / 04 — Appels de fonds, paiements, pont lot↔compte, fournisseurs, impayés

**Statut : BROUILLON** — Date : 2026-05-30 — Rang d'audit : 4
**Périmètre financier :** appels de provisions (art. 14-1), droits constatés (art. 14-3), paiements coproprietaires + lettrage, comptes tiers lot (450), factures/paiements fournisseurs, TVA TTC, impayés et relances (art. 19-2).
**Source de vérité financière (rappel fondateur) :** le GRAND LIVRE (`ledger_transactions` en-têtes + `ledger_entries` lignes débit/crédit), écritures `status='posted'`. Décret 2005-240 + arrêté 14/03/2005, art. 14-3 loi 65-557. Une écriture `draft` n'est PAS du réalisé.

---

## 1. Identité (périmètre du rang 4)

Ce rang couvre la chaîne « appel → créance → encaissement → lettrage → impayé » côté coproprietaires, et la chaîne « engagement → facture → paiement » côté fournisseurs, jusqu'à leur projection dans le grand livre.

Entités couvertes :
- **Appels de fonds** : `call_for_funds` (en-tête, niveau copropriété) + `call_for_funds_lines` (ventilation par lot).
- **Paiements coproprietaires** : `payments` + `payment_allocations` (lettrage FIFO).
- **Pont lot↔compte** : `lot_accounts` (compte tiers par lot) + `accounts` (plan comptable) + colonne `ledger_entries.lot_id`.
- **Fournisseurs** : `suppliers`, `supplier_invoices` (+ `_lines`), `supplier_payments` ; engagements via `providers` / `service_orders` / `budget_payment_schedules`.
- **Impayés / relances** : vues `v_unpaid_by_lot`, `v_unpaid_lots`, `v_lot_balance`, `v_owner_financial_summary` ; `payment_reminders` + `payment_reminder_rules`.
- **Grand livre** : `ledger_transactions`, `ledger_entries`, fonctions `create_ledger_transaction()` / `post_ledger_transaction()`.

Décisions métier déjà actées et opposables à cette fiche : (a) `lot_id` obligatoire sur compte 450 + sous-comptes 4501-4504 ; (b) appels auto-générés en brouillon au vote, émis par le gestionnaire, écriture de provision à l'émission ; (c) impayé = appels échus non lettrés ; (d) TVA TTC, briques HT/TVA/taux + flag assujetti seulement ; (e) trésorerie = 2 KPI (ledger 5xx postés + solde bancaire relevés).

---

## 2. Modèle de données + source de vérité

### 2.1 Appels de fonds
- **`call_for_funds`** : `id, copro_id, period_id, budget_id, repartition_key_id, label, trimester, issue_date, due_date, total_amount, status (enum draft|issued|partially_paid|paid|cancelled), ledger_tx_id, created_by, created_at, issued_at, description`. Contrainte d'idempotence `uq_call_for_funds_idempotent`. **Pas de `lot_id`** (appel = niveau copropriété, conforme : ventilation portée par les lignes — vérifié A11).
- **`call_for_funds_lines`** : `id, copro_id, call_id, lot_id (OBLIGATOIRE), amount_due, amount_paid (défaut 0), status (enum unpaid|partial|paid)`. Contrainte `uq_call_line_lot` (1 ligne par lot par appel). Trigger `trg_call_line_status` (statut selon `amount_paid`), trigger `trg_validate_call_total` (SUM `amount_due` = `total_amount`).
- **Source de vérité :** le montant appelé et sa ventilation par lot vivent dans `call_for_funds(_lines)` (logique métier de l'appel). La créance comptable correspondante (Débit 450 / Crédit 70) doit être matérialisée dans le grand livre à l'émission.

### 2.2 Paiements coproprietaires
- **`payments`** : `lot_id NOT NULL`, `ledger_tx_id` (FK). **`payment_allocations`** : `payment_id, call_line_id, amount_allocated` — relie 1 paiement à N lignes d'appel. Fonction `allocate_payment()` FIFO ; contrainte `validate_payment_allocation` interdit la sur-allocation. Lettrage et paiements partiels fonctionnels (vérifié C1).
- **Source de vérité :** l'allocation appel↔paiement vit dans `payment_allocations` ; l'encaissement comptable (Débit 512 / Crédit 450 avec `lot_id`) dans le grand livre.

### 2.3 Pont lot↔compte
- **`lot_accounts`** : `(lot_id, account_id, copro_id)`, contrainte UNIQUE `lot_accounts_lot_unique` sur `lot_id` (mapping 1:1, vérifié L10). **À ce jour pointe vers des comptes code 411-xxx, jamais 450** (dette, voir §5).
- **`accounts`** : comptes système par copro, famille 450 (450, 450-1…450-5) et 411-xxx ; `account_type='asset'` pour les deux préfixes.
- **`ledger_entries.lot_id`** : nullable, FK vers `lots` existe. Aucune contrainte CHECK n'impose `lot_id NOT NULL` pour la classe 45x.
- **Source de vérité :** le compte tiers réglementaire du copropriétaire = 450 + sous-comptes ; `lot_accounts` doit en être le reflet.

### 2.4 Fournisseurs
- **`suppliers`** : `id, copro_id, name, siret, contact, is_active` (table comptable, simple).
- **`supplier_invoices`** : `id, copro_id, period_id, supplier_id, invoice_number, invoice_date, due_date, label, total_amount, status (enum supplier_invoice_status: draft|approved|posted|paid|cancelled), related_service_order_id, document_id, ledger_tx_id, created_by`. FK `supplier_invoices_supplier_id_fkey → suppliers(id)` EXISTE.
- **`supplier_invoice_lines`** : `id, copro_id, invoice_id, account_id, label, amount, repartition_key_id, budget_line_id`.
- **`supplier_payments`** : `id, copro_id, period_id, supplier_invoice_id, payment_date, amount, method (enum payment_method: bank_transfer|card|check|cash|other), reference, ledger_tx_id`.
- **`providers`** : table riche (~35 colonnes : category, domains, rating, interventions_count, iban/bic, conformity_docs…) pour la maintenance/prestataires. **Aucune FK vers `suppliers`** (vérifié F7/D1/C1).
- **`budget_payment_schedules`** : échéancier de paiement pour MARCHÉS TRAVAUX uniquement (`phase_number, percentage, is_retention, retention_release_date, service_order_id`) — séparé des appels courants (conforme, vérifié A10).
- **Source de vérité :** la dette fournisseur (Crédit 401) et la charge (Débit 6xx) vivent dans le grand livre via `supplier_invoices` ; `service_orders.supplier_invoice_id` (FK) trace l'engagement→facture (vérifié L8).

### 2.5 Grand livre (référentiel)
- **`ledger_transactions`** : `id, copro_id, period_id, tx_date (date, défaut CURRENT_DATE), source_type (text), source_id (uuid, nullable), label, status (text draft|posted), created_by, posted_by, posted_at, metadata (jsonb)`. `source_type` observés : `call_for_funds, payment, supplier_invoice, supplier_payment, opening, manual`. **`source_id` = NULL sur 38/38** (dette P0).
- **`ledger_entries`** : `id, tx_id (FK), copro_id, period_id, account_id (FK), lot_id (nullable, FK), direction (text debit|credit), amount (numeric), entry_label`. CHECK `direction IN ('debit','credit')`, `amount > 0`.
- **Fonctions DB cibles :** `create_ledger_transaction()` (crée en-tête + lignes avec `direction`+`amount`), `post_ledger_transaction()` (draft→posted, vérifie équilibre + période ouverte). Ce sont les routes canoniques à imposer.

---

## 3. Règles métier + loi

- **Art. 14-1 loi 65-557 — appels de provisions :** le budget prévisionnel est appelé par provisions trimestrielles (défaut 4 × 25 %), exigibles le 1er jour de chaque trimestre. La ventilation se fait par clé de répartition (tantièmes) par lot. → Couvert par `repartition_keys` + `repartition_key_lines (lot_id, weight)` ; ventilation `amount_due = ROUND(total_amount × weight / totalWeight, 2)` avec absorption de l'arrondi par le dernier lot (vérifié A8). Conforme.
- **Art. 14-3 — comptabilité d'engagement / droits constatés :** chaque opération doit donner lieu à une écriture en partie double ; le réalisé = classe 6 du grand livre. L'appel émis génère un **droit constaté** : Débit 450 (coproprietaire) / Crédit 70 (provisions sur opérations courantes — observé 701). Une écriture `draft` ne vaut pas droit constaté.
- **Décret 2005-240 + arrêté 14/03/2005 — plan comptable copro :** compte tiers copropriétaire = **450** (+ sous-comptes 4501 budget courant / 4502 travaux / 4503 avances / 4504 emprunts). Le **411** (clients, plan général) n'est PAS conforme. Fournisseurs = 401, charges = classe 6, banque = 512.
- **Règle (a) — `lot_id` obligatoire sur 450 :** toute écriture touchant un compte 450 doit porter le `lot_id` (créance/encaissement individualisé). Les comptes de produits financiers/divers (768/758) en sont exemptés.
- **Art. 19-2 — recouvrement :** après mise en demeure restée infructueuse (30 j), les provisions non encore échues du budget deviennent exigibles. La relance doit historiser le palier (simple relance → mise en demeure → contentieux).
- **TVA (décision d) :** compta TTC, hors champ pour le syndicat résidentiel ; on conserve seulement HT/TVA/taux sur facture fournisseur + flag assujetti (briques irréversibles), sans classe 44 ni attestation au go-live.

---

## 4. État réel en base

### 4.1 Ce qui fonctionne (confirmé par la vérif)
- **Ventilation des appels par clé** : `generate_call_for_funds` (edge function v4) calcule correctement la quote-part par lot via `repartition_key_lines.weight`, crée `call_for_funds` + `call_for_funds_lines`, absorbe l'arrondi sur le dernier lot. Idempotence en base (`uq_call_for_funds_idempotent`).
- **Lettrage & paiements partiels** : `allocate_payment()` (FIFO sur lignes échues), `payment_allocations` avec garde anti-sur-allocation, triggers de mise à jour de statut de ligne. Robuste.
- **`lot_id` présent** sur `payments` (NOT NULL) et `call_for_funds_lines` (NOT NULL) et `ledger_entries` (colonne existe, nullable).
- **FK engagement→facture** : `service_orders.supplier_invoice_id` et `supplier_invoices.related_service_order_id` existent (double lien).
- **Fonctions ledger canoniques** : `create_ledger_transaction()` + `post_ledger_transaction()` existent et gèrent direction/amount/équilibre/période.

### 4.2 Ce qui est cassé ou absent (preuves)
- **3 edge functions cassées — CONFIRMÉ avec colonnes exactes :**
  - `record_payment` : INSERT dans `ledger_entries` avec les colonnes `entry_date`, `debit_account_id`, `credit_account_id`, `amount` → **n'existent pas**. Le schéma réel est en *lignes* (`direction` + `amount` + un `account_id` par ligne), pas en colonnes débit/crédit. La fonction échoue à la 1ère écriture. **De plus elle n'écrit pas `lot_id`.**
  - `create_supplier_invoice` : même erreur (modèle `debit_account_id`/`credit_account_id`/`entry_date`) + écrit `ledger_transactions.description` (colonne réelle = `label`) et `tx_type` (inexistant).
  - `pay_supplier_invoice` : idem (`entry_date`, paire débit/crédit) + ne renseigne pas `source_id`.
  - Les trois **contournent** `create_ledger_transaction()`/`post_ledger_transaction()` au lieu de les appeler → d'où la dérive de schéma.
- **`source_id` jamais renseigné** : 38/38 `ledger_transactions` ont `source_id = NULL` (back-référence pièce↔écriture impossible ; rapprochement et extourne fragilisés).
- **`lot_accounts` non conforme** : les comptes liés sont des `411-xxx`, alors que le plan comptable copro impose `450` (+ 4501-4504). Amalgame 411/450 dans `accounts`.
- **Pas de contrainte `lot_id`** sur les écritures 450 : aucune CHECK/trigger n'empêche une écriture 450 sans `lot_id` (risque silencieux sur la créance individualisée).
- **`providers` ⊥ `suppliers`** : deux référentiels tiers sans FK ni vue de réconciliation — un prestataire de maintenance n'est pas relié à son tiers comptable.
- **Appel émis ≠ écriture comptable** : `generate_call_for_funds` ne crée AUCUNE écriture (ni provision Débit 450/Crédit 701, ni à l'émission). `call_for_funds.ledger_tx_id` reste NULL. Donc créances et « appelé » sont invisibles au grand livre → impayés/trésorerie faux.
- **Briques TVA absentes** : `supplier_invoices`/`_lines` n'ont ni `amount_ht`, ni `vat_amount`, ni `vat_rate` ; aucun flag `assujetti` sur `lots`/`coproprietaires`/`lot_owners`.
- **Casse `critical` vs `CRITICAL`** : confirmé dans la chaîne relances/todos (sévérité écrite en minuscule, comparée en majuscule → alerte muette).

---

## 5. Mal implémenté / dette (P0-P3)

**P0 — bloquant go-live (le grand livre reste faux tant que ce n'est pas réglé)**
- **P0-1** Réécrire `record_payment`, `create_supplier_invoice`, `pay_supplier_invoice` pour qu'elles appellent `create_ledger_transaction()` + `post_ledger_transaction()` (colonnes `direction`/`amount`/`account_id`/`lot_id`), au lieu du modèle fantôme `debit_account_id`/`credit_account_id`/`entry_date`. Preuve : code des 3 edge functions vs `information_schema` de `ledger_entries`/`ledger_transactions`.
- **P0-2** `generate_call_for_funds` (ou l'action « émettre ») doit générer l'écriture de provision à l'émission : Débit 450 (par lot, avec `lot_id`) / Crédit 701, et renseigner `call_for_funds.ledger_tx_id`. Sans ça, créances/appelé absents du grand livre.
- **P0-3** Renseigner `source_id` (+ `source_type`) sur toutes les écritures générées (back-réf pièce↔écriture).

**P1 — conformité comptable & cohérence**
- **P1-1** Migrer `lot_accounts` de 411-xxx vers 450 + sous-comptes 4501-4504 ; normaliser `accounts`.
- **P1-2** Contrainte (trigger) `lot_id NOT NULL` sur toute écriture dont le compte est de classe 450 ; exempter 768/758.
- **P1-3** Brique TVA : ajouter `amount_ht`, `vat_amount`, `vat_rate` sur `supplier_invoice_lines` (et totaux sur `supplier_invoices`) + flag `assujetti` sur `lot_owners`. (Irréversible si non capté dès la saisie.)
- **P1-4** FK `providers ↔ suppliers` (ou table de jonction) + vue de réconciliation.
- **P1-5** Corriger la casse `critical`→`CRITICAL` (alerte impayés).

**P2/P3**
- **P2-1** Unifier les générateurs d'appels (courant via `generate_call_for_funds` vs travaux via `budget_payment_schedules`) sous une interface commune d'émission + écriture.
- **P2-2** Paliers de relance art. 19-2 (relance → mise en demeure → contentieux) historisés ; exigibilité anticipée des provisions après mise en demeure.
- **P3-1** Vue de contrôle « appelé (701) vs réalisé (classe 6) » pour éviter toute addition des deux.

---

## 6. Sources divergentes → source unique

| Donnée | Sources actuelles divergentes | Source unique cible |
|---|---|---|
| **Impayé / créance par lot** | `call_for_funds_lines.amount_paid` (métier) vs vues `v_unpaid_by_lot`/`v_lot_balance` (recalcul) vs solde 450 ledger (absent car appels non comptabilisés) | Grand livre : solde 450 par lot = appels échus comptabilisés − encaissements lettrés ; les vues doivent en dériver |
| **Montant appelé** | `call_for_funds.total_amount` (métier) ; rien au ledger | Écriture de provision Débit 450/Crédit 701 (grand livre) ; `call_for_funds` = pièce justificative |
| **Tiers (prestataire/fournisseur)** | `providers` (maintenance) vs `suppliers` (compta) | Référentiel tiers unifié (FK providers→suppliers) |
| **Compte copropriétaire** | `lot_accounts`→411 vs plan 450 | `450` + sous-comptes 4501-4504 |
| **Réalisé vs Appelé** | classe 6 (charges) et 701 (provisions) parfois confondus en « consommé » | Deux indicateurs distincts, jamais additionnés |

---

## 7. Questions expert

1. **Provision à l'émission** : on acte Débit 450 / Crédit 701 (provisions sur opérations courantes) au moment où le gestionnaire ÉMET l'appel (pas au vote, pas à l'échéance) ? Et pour les appels travaux, Crédit 702 (provisions travaux) ?
2. **Ventilation de l'encaissement** : un paiement reçu sans appel ciblé doit-il être lettré FIFO sur les lignes échues les plus anciennes (comportement actuel d'`allocate_payment`) ou affecté par le copropriétaire/gestionnaire ?
3. **`lot_accounts` 411→450** : migration des comptes existants — un seul compte 450 par lot, ou un sous-compte par nature (4501 courant / 4502 travaux / 4503 avances) par lot ?
4. **Impayé = appels échus non lettrés** : on confirme que l'indicateur d'impayé exclut les appels non encore échus (due_date future), même si l'écriture de créance existe ?
5. **TVA cas C (bailleur)** : à exclure totalement du go-live, ou prévoir au moins le stockage du loyer de parties communes comme produit réparti aux copropriétaires ?
6. **Mise en demeure (art. 19-2)** : seuil/délai déclencheur paramétrable par copro, et exigibilité anticipée des provisions automatique ou sur action gestionnaire ?
