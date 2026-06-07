# Catalogue Finance — Référence de la refonte (vues, renommages, enums, RPC)

> Document de référence durable. Confronte le code app (encore sur l'ancien schéma) au schéma réel (migrations 0001→0035). À consulter AVANT toute modif de la logique financière. Issu de l'audit `.planning/AUDIT_DRIFT_FINANCE.md` (workflow multi-agents, SQL proposé vérifié contre les migrations réelles).

## Comment lire ce document

La **section 1** est le cœur : une fiche par vue finance, avec son rôle, sa règle de calcul, ses tables sources, ses colonnes, ses écrans consommateurs et — pour les vues à (re)créer — le SQL exact de la migration 0036. Les **sections 2 à 5** recensent les écarts entre l'ancien schéma (contre lequel le code app a été écrit) et le schéma cible : colonnes/tables renommées, valeurs d'enum disparues, signatures de RPC changées, objets supprimés. La **section 6** est le plan d'action de la migration 0036.

Pour changer une règle financière : ouvrir la fiche de la vue concernée en section 1, lire sa **règle de calcul** (ce que la vue calcule et pourquoi), puis son **SQL proposé** (la définition exacte), et enfin ses **consommateurs** (les écrans qui se casseront si on touche aux colonnes). Avant de modifier un appel de table/colonne/RPC côté code, vérifier d'abord dans les sections 2 à 5 que le nom visé existe encore dans le schéma cible.

## 1. Vues finance — fiches détaillées

### v_general_ledger — RECREATE

- **Rôle** : Grand livre dénormalisé : aplatit chaque ligne d'écriture comptable (débit/crédit) avec son en-tête de transaction, son compte du plan comptable et le lot concerné, pour afficher le journal des opérations et en dériver la balance côté front.
- **Règle de calcul** : Une ligne de la vue = une ligne d'écriture (ledger_entries) à laquelle on rattache son en-tête (ledger_transactions : date, libellé, source, statut), le compte impacté (accounts : code, nom, type) et, si l'écriture porte sur un compte de tiers (45x), le lot via lot_id (lots.ref). Le montant reste toujours positif ; c'est la colonne direction (debit/credit) qui donne le sens. On expose TOUTES les écritures (draft + posted) et on laisse l'appelant filtrer sur status='posted' (c'est ce que fait useLedger). Pas d'agrégation : la balance par compte est recalculée en aval en sommant debit - credit. Convention de solde : Σ(debit − credit) (un compte 45x positif = lot débiteur).
- **Tables sources** : ledger_entries, ledger_transactions, accounts, lots
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| entry_id | id de la ligne d'écriture (ledger_entries.id) ; clé unique d'une ligne du journal |
| tx_id | id de la transaction parente (ledger_transactions.id) |
| copro_id | copropriété (filtre principal, via la transaction) |
| period_id | exercice comptable (filtre optionnel) |
| tx_date | date de l'opération (sert au tri, ledger_transactions n'a pas de created_at) |
| tx_label | libellé de la transaction (ledger_transactions.label) |
| source_type | origine de l'écriture (call_for_funds, payment, supplier_invoice...) ; nullable |
| source_id | id du document source ; le front en tire un numéro de pièce (8 1ers caractères) |
| status | draft ou posted ; le front filtre sur posted |
| posted_at | horodatage de validation comptable ; null si draft |
| account_id | compte du plan comptable impacté |
| account_code | code du compte (ex 450-1, 701) ; sa 1re lettre donne la classe comptable |
| account_name | intitulé du compte |
| account_type | type du compte : asset/liability/income/expense/equity (enum account_type) |
| lot_id | lot rattaché si compte de tiers (45x) ; nullable |
| lot_ref | référence lisible du lot (lots.ref) ; null si pas de lot |
| direction | debit ou credit ; donne le sens du montant |
| amount | montant toujours positif (numeric 14,2) |
| entry_label | libellé spécifique à la ligne ; nullable, concaténé au libellé de la tx côté front |

- **Consommateurs** :
  - src/lib/finance/api.ts:957 getGeneralLedger() + interface GeneralLedgerEntry:935
  - src/hooks/modules/useFinanceData.ts:187 useGeneralLedger()
  - src/hooks/modules/useLedger.ts:27 transformToOperations / useLedger() (balance + écritures)
  - src/components/features/finance/Comptabilite/dataAdapter.ts:32 transformLedgerToOperations()
  - src/features/finance/comptabilite/hooks/useComptabilitePage.ts
  - src/components/features/finance/Ledger/EcrituresModal.tsx
  - src/app/(dashboard)/documents/ledger/page.tsx (écran Grand livre / Comptabilité)
  - src/components/features/finance/Comptabilite/ComptaInfoBanner.tsx:33 (mention textuelle)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260125_niveau2d_ledger.sql lignes 537-581 (CREATE OR REPLACE VIEW v_general_ledger, security_invoker=true). NB : aussi référencée en migrations_legacy/20260531150000_wp4_views_ledger_posted.sql (v_general_ledger_by_account_class, vue dérivée distincte) et 20260401_create_sales_tables.sql.
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- 0036 : recréation du grand livre dénormalisé (atlas GARDER)
-- Aplatit ledger_entries + en-tête tx + compte + lot. Aucune agrégation :
-- l'appelant filtre status='posted' et dérive la balance en sommant debit - credit.
CREATE OR REPLACE VIEW public.v_general_ledger
WITH (security_invoker = true) AS
SELECT
    e.id                                                   AS entry_id,
    e.tx_id                                                AS tx_id,
    t.copro_id                                             AS copro_id,
    t.period_id                                            AS period_id,
    t.tx_date                                              AS tx_date,
    t.label                                                AS tx_label,
    t.source_type                                          AS source_type,
    t.source_id                                            AS source_id,
    t.status                                               AS status,
    t.posted_at                                            AS posted_at,
    a.id                                                   AS account_id,
    a.code                                                 AS account_code,
    a.name                                                 AS account_name,
    a.account_type                                         AS account_type,
    e.lot_id                                               AS lot_id,
    l.ref                                                  AS lot_ref,
    e.direction                                            AS direction,
    e.amount                                               AS amount,
    e.entry_label                                          AS entry_label,
    -- colonnes débit/crédit séparées (confort de calcul aval)
    CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END AS debit,
    CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END AS credit
FROM public.ledger_entries e
JOIN public.ledger_transactions t ON t.id = e.tx_id
JOIN public.accounts a            ON a.id = e.account_id
LEFT JOIN public.lots l           ON l.id = e.lot_id;

COMMENT ON VIEW public.v_general_ledger IS
'Grand livre denormalise : 1 ligne par ecriture (ledger_entries) + en-tete tx + compte + lot. Filtrer status=posted en aval.';
```

- **Notes** : Voir businessRule et exposedColumns. Classification RECREATE : la jointure legacy est reconductible telle quelle sur le nouveau schéma, toutes les colonnes sources existent (aucune droppée ne la concerne). Seuls retraits : created_at + jointures profiles (inexistantes/non lues).

### v_calls_overview — RECREATE

- **Rôle** : Liste-synthèse des appels de fonds d'une copropriété : une ligne par appel, avec les totaux appelé / payé / restant dû et le décompte des lots à jour ou en retard.
- **Règle de calcul** : Une ligne par appel de fonds (call_for_funds). Pour chaque appel : total_paid = somme des amount_paid de ses lignes ; total_unpaid = total_amount de l'appel − total_paid ; lines_count / lines_paid_count / lines_unpaid_count se comptent PAR LOT distinct (pas par ligne brute, car en multi-clés un même lot a plusieurs lignes) — un lot est compté "payé" si toutes ses lignes ont le statut paid. repartition_key_name = liste (séparée par virgules) des noms distincts des clés de répartition réellement utilisées par les lignes de l'appel, reconstruite côté SQL puisque l'appel agrégé n'a plus de clé unique (call_for_funds.repartition_key_id reste NULL en multi-clés). On n'utilise jamais cf.repartition_key_id pour le nom : on le dérive des lignes via repartition_keys.
- **Tables sources** : call_for_funds, call_for_funds_lines, repartition_keys
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | id de l'appel (call_for_funds.id) |
| copro_id | copropriété de l'appel |
| period_id | exercice comptable de l'appel |
| budget_id | budget voté à l'origine de l'appel (nullable) |
| repartition_key_id | clé unique de l'appel — toujours NULL en multi-clés, conservée pour compat de l'interface TS |
| repartition_key_name | liste des noms de clés utilisées par les lignes, séparés par virgules (ex 'Charges générales, Ascenseur') |
| label | libellé de l'appel |
| trimester | trimestre 1-4 (nullable), sert au filtre getCallsForTrimester |
| issue_date | date d'émission, tri par défaut décroissant |
| due_date | date d'échéance |
| total_amount | montant total appelé |
| status | statut de l'appel (draft/issued/partially_paid/paid/cancelled) |
| ledger_tx_id | écriture du grand livre liée à l'émission (nullable) |
| created_at | date de création de l'appel |
| issued_at | horodatage d'émission (nullable) |
| total_paid | somme des montants déjà payés sur les lignes |
| total_unpaid | reste dû = total_amount − total_paid |
| lines_count | nombre de lots distincts concernés par l'appel |
| lines_paid_count | nombre de lots dont toutes les lignes sont soldées |
| lines_unpaid_count | nombre de lots ayant au moins une ligne non soldée |

- **Consommateurs** :
  - src/lib/finance/api.ts:237 listCalls()
  - src/lib/finance/api.ts:253 getCallById()
  - src/lib/finance/api.ts:274 getCallsForTrimester()
  - src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts (hub /finance/appels-fonds, chemin canonique, routé sidebar)
  - src/features/finance/appels-fonds/hooks/useAppelsFondsDetail.ts (page /finance/appels-fonds/[callId])
  - src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts
  - src/features/finance/appels-fonds/hooks/useAppelsFondsActions.ts
  - src/hooks/modules/useBudget.ts:242
  - src/hooks/modules/useFinanceData.ts:61
  - src/hooks/modules/useRelevesIndividuels.ts (page /finance/releves-individuels, actif non routé)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260531190000_wp6_appel_budget_agrege.sql:310 (version multi-clés WP6, autoritative) ; version antérieure mono-clé dans Co-Pro-Flex/supabase/migrations_legacy/20260125_niveau2e_finance_metier.sql:744
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
CREATE OR REPLACE VIEW public.v_calls_overview
WITH (security_invoker = true) AS
SELECT
  cf.id,
  cf.copro_id,
  cf.period_id,
  cf.budget_id,
  cf.repartition_key_id,
  (
    SELECT string_agg(DISTINCT rk.name, ', ' ORDER BY rk.name)
    FROM public.call_for_funds_lines cfl2
    JOIN public.repartition_keys rk ON rk.id = cfl2.repartition_key_id
    WHERE cfl2.call_id = cf.id
  ) AS repartition_key_name,
  cf.label,
  cf.trimester,
  cf.issue_date,
  cf.due_date,
  cf.total_amount,
  cf.status,
  cf.ledger_tx_id,
  cf.created_at,
  cf.issued_at,
  COALESCE(SUM(cfl.amount_paid), 0)::numeric(14,2) AS total_paid,
  (cf.total_amount - COALESCE(SUM(cfl.amount_paid), 0))::numeric(14,2) AS total_unpaid,
  COUNT(DISTINCT cfl.lot_id) AS lines_count,
  (
    COUNT(DISTINCT cfl.lot_id)
    - COUNT(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status)
  ) AS lines_paid_count,
  COUNT(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status) AS lines_unpaid_count
FROM public.call_for_funds cf
LEFT JOIN public.call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id;

COMMENT ON VIEW public.v_calls_overview IS 'Synthèse des appels de fonds (1 ligne/appel) : totaux appelé/payé/impayé + décompte des lots payés/impayés (multi-clés, comptage par lot).';
```

- **Notes** : Deux définitions legacy coexistent. La RECREATE doit suivre la WP6 (20260531) qui a remplacé la version 0125 : (a) repartition_key_name dérivé par string_agg des clés DES LIGNES (l'appel agrégé n'a plus de clé unique : call_for_funds.repartition_key_id est toujours NULL), PAS le simple LEFT JOIN sur cf.repartition_key_id de la version 0125 qui renverrait NULL ; (b) comptages PAR LOT (COUNT DISTINCT cfl.lot_id) et non par ligne, sinon un lot multi-clés est compté plusieurs fois — divergence réelle entre les deux legacy à trancher en faveur de WP6. Toutes les colonnes lues existent dans le schéma cible : cf.created_at est bien présent sur call_for_funds (contrairement à ledger_transactions/payments/bank_movements qui n'en ont pas). L'interface TS CallForFundsOverview (src/lib/finance/api.ts:17-38) liste exactement ces 21 colonnes — aucune dérive de colonne, aucun champ droppé (pas de tantiemes/supplier/account_code), donc RECREATE pur (pas RESHAPE). repartition_key_id conservée dans la projection uniquement pour la compat de l'interface, même si elle vaut NULL. Le filtre getCallsForTrimester s'appuie sur trimester (CHECK 1-4) : OK. Aucun écran consommateur n'est listé MORT : le hub /finance/appels-fonds est routé sidebar et marqué « chemin canonique » dans l'atlas front-03 ; la page [callId] et releves-individuels sont actives (cette dernière non routée mais fonctionnelle). À cabler dans une migration 0036 (lot de recréation des ~12 vues d'agrégat, chantier pivot AUDIT_DRIFT_FINANCE.md §Chantiers profonds #1). NB cohérence avec v_call_lines_detailed (autre vue à recréer, consommée par getCallLines) qui porte le détail par ligne/lot.

### v_supplier_invoices_overview — RECREATE

- **Rôle** : Tableau de bord des factures fournisseurs d'une copropriété : pour chaque facture, son montant total, ce qui a déjà été payé, ce qui reste à payer, et le nom du fournisseur.
- **Règle de calcul** : Une ligne par facture fournisseur. On part de la facture (montant total = total_amount), on additionne tous ses règlements (supplier_payments.amount) pour obtenir total_paid, et reste_a_payer = total_amount - total_paid. Le nom du fournisseur vient désormais de la table tiers (jointure sur tiers_id), plus de la table suppliers qui n'existe plus. payments_count = nombre de règlements rattachés. Aucun filtre de statut : la facture remonte dès l'état 'draft' (le filtre par copro et le tri par date se font côté appelant).
- **Tables sources** : supplier_invoices, supplier_payments, tiers
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | PK de la facture |
| copro_id | Copropriété (filtre RLS + .eq côté front) |
| period_id | Exercice comptable de la facture |
| tiers_id | Fournisseur (remplace l'ancien supplier_id ; FK tiers.id) |
| supplier_name | Nom du fournisseur, dérivé de tiers.name (alias conservé pour le front existant) |
| invoice_number | Numéro de facture fournisseur (peut être NULL) |
| invoice_date | Date de la facture (clé de tri du listing) |
| due_date | Date d'échéance de paiement (peut être NULL) |
| label | Libellé / objet de la facture |
| total_amount | Montant TTC de la facture |
| status | Statut: draft \| posted \| paid \| cancelled (enum supplier_invoice_status — plus de 'approved') |
| ledger_tx_id | Écriture comptable de comptabilisation (D6xx/C401), NULL tant que non postée |
| document_id | Pièce jointe (scan de la facture) dans la GED, peut être NULL |
| created_at | Date de création de la facture |
| total_paid | Somme des règlements rattachés (Σ supplier_payments.amount) |
| remaining_to_pay | Reste à payer = total_amount - total_paid |
| payments_count | Nombre de règlements enregistrés sur la facture |

- **Consommateurs** :
  - src/lib/finance/api.ts:463 (listSupplierInvoices) + interface SupplierInvoiceOverview:94
  - src/hooks/modules/useFinanceData.ts:121 (useSupplierInvoices)
  - src/features/finance/invoices/useFacturesPage.ts (mapping listing: supplier_name, invoice_date, due_date, invoice_number, total_amount, status, created_at)
  - src/features/finance/invoices/useFactureDetailPage.ts (supplier_name, invoice_number)
  - src/app/(dashboard)/finance/invoices/page.tsx
  - src/app/(dashboard)/finance/invoices/[id]/page.tsx
  - src/app/(dashboard)/finance/invoices/payment/page.tsx
  - src/app/(dashboard)/finance/invoices/payment/[id]/page.tsx
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260125_niveau2e_finance_metier.sql:845-870
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
CREATE VIEW v_supplier_invoices_overview
WITH (security_invoker = true) AS
SELECT
  si.id,
  si.copro_id,
  si.period_id,
  si.tiers_id,
  t.name                                        AS supplier_name,
  si.invoice_number,
  si.invoice_date,
  si.due_date,
  si.label,
  si.total_amount,
  si.status,
  si.ledger_tx_id,
  si.document_id,
  si.created_at,
  COALESCE(SUM(sp.amount), 0)                    AS total_paid,
  si.total_amount - COALESCE(SUM(sp.amount), 0)  AS remaining_to_pay,
  COUNT(sp.id)                                   AS payments_count
FROM supplier_invoices si
JOIN tiers t ON t.id = si.tiers_id
LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
GROUP BY si.id, t.name;

COMMENT ON VIEW v_supplier_invoices_overview IS 'Factures fournisseurs avec montants payes (nom fournisseur derive de tiers).';
```

- **Notes** : PIEGES DE MIGRATION (legacy -> cible), tous repris dans le SQL :
1. suppliers DROPPEE -> fusionnee dans tiers (flag is_supplier). La jointure passe de `JOIN suppliers s ON s.id = si.supplier_id` a `JOIN tiers t ON t.id = si.tiers_id`. On garde l'ALIAS `supplier_name` (= t.name) car le front lit `inv.supplier_name` dans useFacturesPage.ts:76 et useFactureDetailPage.ts:34 — ne PAS renommer en tiers_name sans toucher le front.
2. supplier_id RENOMMEE en tiers_id sur supplier_invoices (0021). La vue expose `tiers_id` (et non plus `supplier_id`). L'interface TS SupplierInvoiceOverview (api.ts:98) declare encore `supplier_id` : a corriger en `tiers_id` (le listing ne lit pas ce champ, donc pas de regression UI immediate, mais le type ment).
3. ENUM status divergent : la vue legacy laisse passer la valeur, mais le type TS api.ts:105 declare `'draft'|'approved'|'posted'|'paid'|'cancelled'`. Le nouvel enum supplier_invoice_status n'a PAS 'approved' (valeurs reelles : draft, posted, paid, cancelled). Aligner le type TS et mapSupabaseStatus.
4. JOIN inner sur tiers : si une facture pointe un tiers supprime, elle disparait du listing. Tiers etant en FK restrict sur supplier_invoices, la suppression est de toute facon bloquee — risque theorique uniquement.
5. created_at existe bien sur supplier_invoices (0021) -> conserve. Attention : supplier_payments n'a PAS d'updated_at mais a created_at ; on n'en a pas besoin ici.
6. supplier_payments.amount est CHECK > 0 et le lien est supplier_invoice_id (et non invoice_id) -> respecte dans le SQL.
7. Pas de filtre de statut volontairement (parite legacy) : les brouillons remontent ; le tri/.eq copro_id se fait cote api.ts.
ECRAN : module factures fournisseurs VIVANT (4 pages sous finance/invoices, citees comme BLOCKER ligne 24 de AUDIT_DRIFT_FINANCE.md) -> RECREATE confirme, ne pas DROP. Chantier rattache : audit ligne 95 (recreation des vues d'agregat, migration 0036+) et ligne 85 (edge create_supplier_invoice : p_supplier_id->p_tiers_id) — la creation de facture doit etre rebranchee en parallele, sinon la vue listera mais l'insert echouera (api.ts:499 envoie encore supplier_id).

### v_budgets_overview — RECREATE

- **Rôle** : Donne, pour chaque budget d'une copropriété, une ligne de synthèse qui dit combien on a prévu, combien on a déjà dépensé (et combien de ces dépenses sont validées), et ce qu'il reste à consommer, avec les infos de l'exercice (année, dates) en plus.
- **Règle de calcul** : Pour chaque budget : total_planned = somme des montants des lignes budgétaires (budget_lines.amount) ; total_spent = somme de TOUTES les dépenses du budget (budget_expenses.amount, quel que soit leur statut) ; validated_spent = somme des seules dépenses validées (status='validated') ; reste à consommer (remaining) = total_planned − validated_spent (on ne décompte que le validé, comme dans la version d'origine). period_year est dérivé de l'année de la date de début de l'exercice. Convention : aucune dépense ni ligne ne produit NULL (COALESCE à 0). NB métier : ces dépenses budgétaires (budget_expenses) sont un suivi extra-comptable « engagé/réalisé » du budget, distinct du grand livre (classe 6) — la vue n'interroge donc PAS le ledger.
- **Tables sources** : budgets, budget_lines, budget_expenses, accounting_periods
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | uuid du budget |
| copro_id | copropriété (filtre côté front) |
| period_id | exercice comptable rattaché |
| budget_type | current \| works \| alur |
| status | draft \| submitted \| validated \| rejected \| closed |
| version | numéro de version du budget (ajouté pour coller à l'interface TS BudgetOverview ; absent de la vue legacy) |
| name | libellé du budget |
| notes | notes libres |
| created_at | date de création du budget |
| validated_at | date de validation (null si non validé) |
| period_name | nom de l'exercice |
| period_start | date de début d'exercice |
| period_end | date de fin d'exercice |
| period_year | année (EXTRACT YEAR de period_start) — clé de tri/filtre du front |
| lines_count | nombre de lignes budgétaires |
| total_planned | montant total prévu (Σ budget_lines.amount) |
| total_spent | total dépensé tous statuts (Σ budget_expenses.amount) |
| validated_spent | total des dépenses validées seulement |
| remaining | reste = total_planned − validated_spent |

- **Consommateurs** :
  - src/lib/budget/api.ts:164 (listBudgets, SELECT *)
  - src/lib/budget/api.ts:193 (getBudget, SELECT *)
  - src/hooks/modules/useBudget.ts (via listBudgets/BudgetOverview)
  - src/hooks/modules/useBudgetData.ts:27 (type BudgetOverview)
  - src/hooks/modules/useALURData.ts:246 (SELECT id, name, remaining ; budget_type='works')
  - src/features/ag/new/hooks/useBudgetImport.ts:190 & 213 (fetchBudgetsByYear / fetchBudgetsCatalog, SELECT *)
  - src/components/features/finance/Budget/BudgetOverviewHero.tsx
  - src/features/finance/budgets/list/components/FonctionnementTab.tsx
  - src/features/finance/budgets/useBudgetDetailPage.ts
  - src/features/finance/appels-fonds/utils.ts
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260128_budget_expenses_and_views.sql (CREATE VIEW v_budgets_overview, lignes 127-165)
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 — recréation de v_budgets_overview (synthèse budget : prévu / dépensé / reste)
-- Source autoritaire : schéma 0001→0035. Toutes colonnes utilisées existent telles quelles.
-- Différence vs legacy : ajout de b.version pour coller à l'interface TS BudgetOverview.
DROP VIEW IF EXISTS public.v_budgets_overview;

CREATE VIEW public.v_budgets_overview
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.copro_id,
  b.period_id,
  b.budget_type,
  b.status,
  b.version,
  b.name,
  b.notes,
  b.created_at,
  b.validated_at,
  ap.name                                   AS period_name,
  ap.start_date                             AS period_start,
  ap.end_date                               AS period_end,
  EXTRACT(YEAR FROM ap.start_date)::int     AS period_year,
  COALESCE(lines.lines_count, 0)::int       AS lines_count,
  COALESCE(lines.total_planned, 0)          AS total_planned,
  COALESCE(exp.total_spent, 0)              AS total_spent,
  COALESCE(exp.validated_spent, 0)          AS validated_spent,
  COALESCE(lines.total_planned, 0) - COALESCE(exp.validated_spent, 0) AS remaining
FROM public.budgets b
LEFT JOIN public.accounting_periods ap
  ON ap.id = b.period_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS lines_count,
    SUM(bl.amount) AS total_planned
  FROM public.budget_lines bl
  WHERE bl.budget_id = b.id
) lines ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(be.amount) AS total_spent,
    SUM(be.amount) FILTER (WHERE be.status = 'validated') AS validated_spent
  FROM public.budget_expenses be
  WHERE be.budget_id = b.id
) exp ON true;

COMMENT ON VIEW public.v_budgets_overview IS 'Synthèse par budget : montant prévu (Σ budget_lines), dépensé tous statuts et validé (Σ budget_expenses), reste = prévu − validé. Suivi extra-comptable, ne touche pas le grand livre.';
```

- **Notes** : RECREATE quasi à l'identique : toutes les colonnes sources existent dans le schéma 0001→0035 (budgets.version/notes/created_at/validated_at, budget_lines.amount, budget_expenses.amount + status enum draft/pending_validation/validated/rejected, accounting_periods.name/start_date/end_date). Aucun piège tantiemes/suppliers ici. AJOUT vs legacy : la colonne b.version (le legacy ne l'exposait pas, mais l'interface TS BudgetOverview de src/lib/budget/api.ts:38 la déclare — sans elle, .select('*') renverrait version=undefined). PIÈGE 1 — enum budget_status : le code (mapBudgetStatusToDb) référence encore 'pending_approval' (legacy), purgé de l'enum cible → la valeur réelle est 'submitted' (drift §3 de l'audit, à corriger côté code, pas dans la vue). PIÈGE 2 — sémantique de 'remaining' : ne décompte QUE le validé (validated_spent), pas le total_spent ; conservé tel quel pour ne pas casser useALURData (qui lit remaining d'un budget 'works' comme solde disponible au transfert ALUR) ni BudgetOverviewHero. PIÈGE 3 — vue d'agrégat budgétaire EXTRA-COMPTABLE : ne pas confondre avec le réalisé du grand livre (classe 6) ; budget_expenses est le suivi engagé/réalisé hors GL (cf. mémoire compta_engage_realise), donc la vue ne joint NI ledger_entries NI accounts. PIÈGE 4 — security_invoker=true obligatoire (RLS 0034 collectif/back-office s'appuie dessus). PIÈGE 5 — la migration cible doit créer cette vue APRÈS budget_expenses (table créée en 0016), donc 0036+ OK. Le type généré src/types/supabase.ts:11808 référence déjà la vue : régénérer les types après application.

### v_budget_lines_overview — RECREATE

- **Rôle** : Affiche chaque poste (ligne) d'un budget avec son montant voté, ce qui a déjà été dépensé dessus et le reste disponible, pour piloter la consommation budgétaire.
- **Règle de calcul** : Pour chaque ligne de budget : planned_amount = montant voté (budget_lines.amount). On agrège les dépenses rattachées (budget_expenses où budget_line_id = ligne) : total_spent = Σ de toutes les dépenses, validated_spent = Σ des seules dépenses status='validated', expenses_count = nombre total de dépenses, pending_count = nombre de dépenses status='pending_validation'. remaining = voté − validated_spent (le reste ne décompte QUE le validé, pas les brouillons). consumption_pct = validated_spent / voté × 100, arrondi à 1 décimale, 0 si voté = 0. Conserver la convention legacy « reste = voté − réalisé validé » ; ne pas basculer sur total_spent sans décision métier.
- **Tables sources** : budget_lines, budget_expenses
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | id de la ligne de budget (budget_lines.id) |
| copro_id | copropriété (filtre RLS + requêtes) |
| budget_id | budget parent (filtré par le code .eq('budget_id')) |
| account_id | compte de charge associé (lu par useBudgetDetailPage pour l'édition) |
| repartition_key_id | clé de répartition de la ligne (lu pour l'édition) |
| label | libellé du poste |
| code | code poste optionnel (mappé vers PosteBudget côté front) |
| planned_amount | montant voté (budget_lines.amount) ; lu comme budgetVote/montant |
| sort_order | ordre d'affichage (le code .order('sort_order')) |
| created_at | date de création de la ligne |
| expenses_count | nombre total de dépenses sur la ligne |
| total_spent | somme de toutes les dépenses (tous statuts) |
| validated_spent | somme des dépenses validées ; lu comme 'consomme' |
| pending_count | nombre de dépenses en attente de validation |
| remaining | reste disponible = voté − validé |
| consumption_pct | taux de consommation en % (validé / voté) |

- **Consommateurs** :
  - src/lib/budget/api.ts:217 (listBudgetLines → interface BudgetLineOverview)
  - src/hooks/modules/useBudgetData.ts:116 (loadLines, state 'lines')
  - src/hooks/modules/useBudget.ts:89-95 (mapLineToPosteData → planned_amount, validated_spent)
  - src/features/finance/budgets/useBudgetDetailPage.ts:82,98 (rawLinesRef + planned_amount)
  - src/features/ag/new/hooks/useBudgetImport.ts:124,130 (import postes AG → planned_amount)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260128_budget_expenses_and_views.sql:167-201
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036+ : recreation de v_budget_lines_overview
-- Lignes de budget enrichies du suivi de consommation (depenses agregees).
DROP VIEW IF EXISTS public.v_budget_lines_overview;

CREATE VIEW public.v_budget_lines_overview
WITH (security_invoker = true) AS
SELECT
  bl.id,
  bl.copro_id,
  bl.budget_id,
  bl.account_id,
  bl.repartition_key_id,
  bl.label,
  bl.code,
  bl.amount                                   AS planned_amount,
  bl.sort_order,
  bl.created_at,
  COALESCE(exp.expenses_count, 0)::int        AS expenses_count,
  COALESCE(exp.total_spent, 0)                AS total_spent,
  COALESCE(exp.validated_spent, 0)            AS validated_spent,
  COALESCE(exp.pending_count, 0)::int         AS pending_count,
  bl.amount - COALESCE(exp.validated_spent, 0) AS remaining,
  CASE
    WHEN bl.amount > 0
      THEN ROUND((COALESCE(exp.validated_spent, 0) / bl.amount * 100)::numeric, 1)
    ELSE 0
  END                                         AS consumption_pct
FROM public.budget_lines bl
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                                            AS expenses_count,
    SUM(be.amount)                                           AS total_spent,
    SUM(be.amount) FILTER (WHERE be.status = 'validated')    AS validated_spent,
    COUNT(*) FILTER (WHERE be.status = 'pending_validation')::int AS pending_count
  FROM public.budget_expenses be
  WHERE be.budget_line_id = bl.id
) exp ON true;

COMMENT ON VIEW public.v_budget_lines_overview IS 'Lignes budgetaires avec suivi de consommation (depenses agregees par ligne).';
```

- **Notes** : RECREATE quasi a l'identique : les tables sources budget_lines et budget_expenses gardent exactement la forme attendue (budget_lines.amount = voté, budget_expenses.amount NN>0, budget_expenses.budget_line_id NN FK, status = enum expense_status). Aucune colonne droppée n'est touchée ici. PIÈGES : (1) ne PAS embarquer budget_expenses.fournisseur — cette colonne n'existe plus (le fournisseur est désormais tiers_id) ; mais cette vue n'en a jamais eu besoin, c'est la vue voisine v_budget_expenses_detail qui doit migrer fournisseur→tiers_id. (2) Les valeurs d'enum status restent 'validated' et 'pending_validation' (inchangées en 0002). (3) L'interface TS BudgetLineOverview et src/types/supabase.ts attendent exactement ces 16 colonnes, dont pending_count (présent dans la vue mais absent du Row généré supabase.ts l.11682 — le régénérer après la migration). (4) Convention métier load-bearing : remaining et consumption_pct se basent sur validated_spent (réalisé validé), pas sur total_spent ; useBudget.ts lit validated_spent comme 'consomme'. (5) Le filtre security_invoker=true respecte la RLS 0034. Atlas/audit : ligne 3 de AUDIT_DRIFT_FINANCE.md classe explicitement cette vue à recréer (migration 0036+) — écran budgets GARDÉ, pas mort.

### v_lots_with_owners — RECREATE

- **Rôle** : Liste chaque lot d'une copropriété avec, accolés, son propriétaire principal actuel (nom, e-mail) et sa quote-part de tantièmes généraux, pour alimenter les écrans Copropriétaires/Lots, Tantièmes et l'onboarding.
- **Règle de calcul** : Une ligne par lot. Le propriétaire est le copropriétaire rattaché via lot_owners qui est encore en cours (end_date IS NULL) et marqué principal (is_primary = true) — un lot a au plus un propriétaire principal actif (contrainte unique partielle). Le nom affiché = raison sociale si c'est une société, sinon prénom + nom. La quote-part « tantièmes généraux » n'existe plus en colonne sur lots : on la dérive en sommant les poids (repartition_key_lines.weight) de la clé de répartition de catégorie 'general' active du lot. Les anciens sous-tantièmes (escalier/ascenseur/chauffage) n'ont pas d'équivalent sémantique dans le nouveau schéma et sont exposés à NULL. Le nom du bâtiment est ramené par jointure sur buildings. Une jointure LEFT garantit que les lots sans propriétaire ou sans poids apparaissent quand même.
- **Tables sources** : lots, lot_owners, coproprietaires, buildings, repartition_keys, repartition_key_lines
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | id du lot (PK lots) |
| copro_id | copropriété du lot (filtre obligatoire côté front) |
| ref | référence/numéro du lot, sert au tri |
| type | type de lot (enum lot_type) |
| floor | étage |
| surface | surface en m2 |
| description | libellé libre du lot |
| building_id | bâtiment de rattachement (nullable) |
| building_name | nom du bâtiment, ramené par jointure (nullable) |
| tantiemes_generaux | quote-part générale dérivée = Σ weight de la clé 'general' active du lot (0 si aucune) |
| tantiemes_escalier | toujours NULL — plus de mapping sémantique dans le nouveau schéma |
| tantiemes_ascenseur | toujours NULL — idem |
| tantiemes_chauffage | toujours NULL — idem |
| coproprietaire_id | id du copropriétaire principal actif (NULL si lot sans propriétaire) |
| owner_display_name | nom affiché : company_name si société, sinon first_name + last_name |
| owner_first_name | prénom du propriétaire principal |
| owner_last_name | nom du propriétaire principal |
| owner_email | e-mail du propriétaire principal |
| share_percent | quote-part de propriété du propriétaire principal sur le lot (lot_owners.share_percent) |
| created_at | création du lot |
| updated_at | dernière modif du lot |

- **Consommateurs** :
  - src/lib/lots/api.ts:177 (listLotsWithOwners)
  - src/lib/lots/api.ts:198 (getLot)
  - src/lib/owners/api.ts:274 (listLotsWithOwners)
  - src/lib/onboarding/api.ts:707 (listLots, lit id/ref/type/owner_display_name)
  - Écrans GARDER: coproprietaires, coproprietaires/lots, coproprietaires/lots/[id], tantiemes, onboarding/[id]
- **Ancienne définition** : Définition CREATE VIEW absente de supabase/migrations_legacy/ (migration d'origine perdue lors du rebaseline), mais la définition exacte est archivée dans docs/audit/db/VIEWS_DETAIL.md:303-315 — elle lisait lots.tantiemes_generaux/escalier/ascenseur/chauffage (colonnes aujourd'hui droppées), LEFT JOIN lot_owners ON end_date IS NULL (sans filtre is_primary), LEFT JOIN coproprietaires, owner_name = first_name||' '||last_name.
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
CREATE OR REPLACE VIEW public.v_lots_with_owners
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.copro_id,
  l.ref,
  l.type,
  l.floor,
  l.surface,
  l.description,
  l.building_id,
  b.name                                   AS building_name,
  COALESCE(g.tantiemes_generaux, 0)        AS tantiemes_generaux,
  NULL::numeric                            AS tantiemes_escalier,
  NULL::numeric                            AS tantiemes_ascenseur,
  NULL::numeric                            AS tantiemes_chauffage,
  cp.id                                     AS coproprietaire_id,
  CASE
    WHEN cp.is_company THEN cp.company_name
    ELSE NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')
  END                                       AS owner_display_name,
  cp.first_name                             AS owner_first_name,
  cp.last_name                              AS owner_last_name,
  cp.email                                  AS owner_email,
  lo.share_percent,
  l.created_at,
  l.updated_at
FROM public.lots l
LEFT JOIN public.buildings b
  ON b.id = l.building_id
LEFT JOIN public.lot_owners lo
  ON lo.lot_id = l.id
 AND lo.end_date IS NULL
 AND lo.is_primary = true
LEFT JOIN public.coproprietaires cp
  ON cp.id = lo.coproprietaire_id
LEFT JOIN LATERAL (
  SELECT SUM(rkl.weight) AS tantiemes_generaux
  FROM public.repartition_key_lines rkl
  JOIN public.repartition_keys rk
    ON rk.id = rkl.key_id
  WHERE rkl.lot_id = l.id
    AND rk.category = 'general'
    AND rk.is_active = true
) g ON true;
```

- **Notes** : Pièges et divergences legacy->cible : (1) Le legacy joignait lot_owners sur end_date IS NULL SANS filtrer is_primary, ce qui pouvait dupliquer un lot s'il avait plusieurs co-indivisaires actifs ; la cible ajoute is_primary = true pour garantir 1 ligne/lot (cohérent avec la contrainte unique partielle (lot_id) where end_date is null and is_primary). (2) lots.tantiemes_generaux/escalier/ascenseur/chauffage sont DROPPÉS : seul 'généraux' est reconstituable (Σ weight de la clé 'general' active) ; les trois autres restent NULL — le front les type déjà nullable (LotWithOwner). À terme, mieux vaut exposer les poids par clé plutôt que ces 3 colonnes mortes. (3) copros.total_tantiemes est aussi droppé : un éventuel total se calcule en sommant tantiemes_generaux de la vue. (4) Si une copro a plusieurs clés 'general' actives qui se chevauchent sur un même lot, la somme serait gonflée — en pratique il ne doit y avoir qu'une clé générale active ; à surveiller côté seed. (5) v_coproprietaires_overview (0035) expose déjà total_tantiemes par personne via la même logique de clé générale active : garder les deux cohérentes. (6) Aucun écran consommateur n'est listé MORT dans l'atlas — tous GARDER, donc la vue est bien à recréer, pas à supprimer.

### v_repartition_key_totals — RECREATE

- **Rôle** : Pour chaque clé de répartition, donne en une ligne le total des tantièmes/poids et l'état d'avancement de la saisie (combien de lots concernés, combien ont déjà un poids, est-ce complet), afin d'alimenter les cartes de clés et la validation côté gestionnaire.
- **Règle de calcul** : Une ligne par clé de répartition active de la copro. total_weight = somme des weight de ses lignes (repartition_key_lines). L'avancement dépend du périmètre de la clé (coverage_mode) : si la clé couvre TOUS les lots (all_lots), lots_count = nombre total de lots de la copro et lots_with_weight_count = nombre de ces lots ayant une ligne de poids > 0 ; si la clé ne couvre qu'un SOUS-ENSEMBLE (subset), lots_count = nombre de lignes rattachées à la clé et lots_with_weight_count = celles dont le poids est > 0. is_complete = vrai quand tous les lots du périmètre ont un poids (lots_with_weight_count = lots_count et lots_count > 0). Aucune dépendance aux colonnes droppées : les tantièmes se dérivent de repartition_key_lines.weight, jamais de lots.tantiemes_* ni de copros.total_tantiemes.
- **Tables sources** : repartition_keys, repartition_key_lines, lots
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| key_id | ID de la clé (alias de repartition_keys.id ; le code filtre dessus avec .eq('key_id', ...)) |
| copro_id | ID de la copropriété (filtre RLS et requêtes front) |
| name | Nom de la clé |
| description | Description libre de la clé (nullable) |
| basis | Base de calcul (tantiemes \| surface \| custom) |
| coverage_mode | Périmètre de la clé (all_lots \| subset) |
| is_active | Clé active ou non (le front filtre is_active = true) |
| total_weight | Somme des poids/tantièmes de toutes les lignes de la clé |
| lots_count | Nombre de lots du périmètre de la clé (tous les lots si all_lots, sinon les lots rattachés) ; dénominateur de la barre d'avancement |
| lots_with_weight_count | Nombre de lots du périmètre ayant un poids défini (> 0) |
| is_complete | Vrai si tous les lots du périmètre ont un poids (saisie terminée) |

- **Consommateurs** :
  - src/lib/lots/api.ts:324 (listRepartitionKeys)
  - src/lib/lots/api.ts:347 (getRepartitionKey)
  - src/lib/lots/api.ts:665 (validateRepartitionKey)
  - src/hooks/modules/useLotDetailPage.ts:71-82 (map key_id->total_weight)
  - src/features/finance/chargeKeys/useClesRepartitionPage.ts:38,95-96 (liste + KPIs valides/alertes)
  - src/features/finance/chargeKeys/useCleDetailPage.ts:215 (totalTantiemes = total_weight)
  - src/components/features/lots/RepartitionKeyCard.tsx:24-54 (barre d'avancement lots_with_weight_count/lots_count, total_weight, is_complete)
  - src/components/features/lots/EditKeyModal.tsx
  - src/app/(dashboard)/coproprietaires/lots/page.tsx
  - src/components/features/onboarding/steps/Step3LotsKeys.tsx
- **Ancienne définition** : Aucune définition CREATE VIEW retrouvée dans supabase/migrations_legacy/ ni migrations_disabled/ (grep négatif). La vue provenait d'une migration P0 « P0#2 Lots et clés » absente du dépôt legacy actuel ; seul son contrat de colonnes subsiste, prouvé par supabase/tests/p0_lots_repartition_smoke.sql (TEST 5 : key_id, copro_id, name, basis, total_weight, lots_count, lots_with_weight_count, is_complete) et par l'interface RepartitionKeyWithTotals dans src/lib/lots/api.ts:100-112. Le drift est documenté dans .planning/AUDIT_DRIFT_FINANCE.md (lignes 21, 39, 95).
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
create or replace view public.v_repartition_key_totals
with (security_invoker = true) as
with key_lots as (
  -- Lots du périmètre de chaque clé + poids éventuel
  -- all_lots : produit tous les lots de la copro (poids depuis la ligne si elle existe)
  -- subset   : uniquement les lots ayant une ligne rattachée à la clé
  select
    rk.id                              as key_id,
    rk.copro_id                        as copro_id,
    l.id                               as lot_id,
    coalesce(rkl.weight, 0)            as weight
  from public.repartition_keys rk
  join public.lots l
    on l.copro_id = rk.copro_id
  left join public.repartition_key_lines rkl
    on rkl.key_id = rk.id
   and rkl.lot_id = l.id
  where rk.coverage_mode = 'all_lots'

  union all

  select
    rk.id                              as key_id,
    rk.copro_id                        as copro_id,
    rkl.lot_id                         as lot_id,
    rkl.weight                         as weight
  from public.repartition_keys rk
  join public.repartition_key_lines rkl
    on rkl.key_id = rk.id
  where rk.coverage_mode = 'subset'
)
select
  rk.id                                                  as key_id,
  rk.copro_id                                            as copro_id,
  rk.name                                                as name,
  rk.description                                         as description,
  rk.basis                                               as basis,
  rk.coverage_mode                                       as coverage_mode,
  rk.is_active                                           as is_active,
  coalesce(sum(kl.weight), 0)::numeric(14,4)            as total_weight,
  count(kl.lot_id)::int                                  as lots_count,
  count(kl.lot_id) filter (where kl.weight > 0)::int     as lots_with_weight_count,
  (count(kl.lot_id) > 0
    and count(kl.lot_id) filter (where kl.weight > 0) = count(kl.lot_id)) as is_complete
from public.repartition_keys rk
left join key_lots kl
  on kl.key_id = rk.id
group by
  rk.id, rk.copro_id, rk.name, rk.description,
  rk.basis, rk.coverage_mode, rk.is_active;
```

- **Notes** : Le corps de la vue est un RECREATE pur : ses deux sources (repartition_keys, repartition_key_lines.weight) existent intactes dans le nouveau schéma, donc aucune colonne de la vue ne change. Le piège n'est PAS dans la vue mais chez un consommateur : validateRepartitionKey (src/lib/lots/api.ts:676-688) lit copros.total_tantiemes, colonne DROPPÉE (confirmé AUDIT_DRIFT_FINANCE.md l.19) ; à corriger en dérivant le total attendu de la clé générale active (Σ weight) plutôt que d'un compteur disparu, sinon l'écran « Clés de répartition » plantera même une fois la vue recréée. Subtilité métier load-bearing : lots_count est le DÉNOMINATEUR de la barre d'avancement de RepartitionKeyCard.tsx (lots_with_weight_count/lots_count) ; il doit refléter le périmètre réel de la clé, d'où la distinction coverage_mode all_lots (tous les lots de la copro) vs subset (lignes rattachées). Une définition naïve « SUM/COUNT sur repartition_key_lines seul » casserait l'avancement des clés all_lots dont tous les lots n'ont pas encore de ligne. is_complete protège la division par zéro (lots_count > 0). RepartitionKeyLineDetailed (vue sœur v_repartition_key_lines_detailed, même chantier, lot 4 de l'audit) expose tantiemes_generaux/surface : à recréer séparément en dérivant tantiemes_generaux de la clé générale via repartition_key_lines.weight, jamais de lots.tantiemes_*. Aucun écran consommateur n'est marqué mort dans l'atlas : les clés de répartition restent une feature vivante (finance + onboarding Step3). total_weight typé numeric(14,4) pour rester homogène avec repartition_key_lines.weight numeric(12,4) tout en absorbant la somme.

### v_payment_reminders_overview — RECREATE

- **Rôle** : Liste enrichie des relances d'impayés émises (historique des courriers/mails de rappel), avec la référence du lot et le libellé de la règle de relance appliquée, pour alimenter le suivi des relances à l'écran Impayés.
- **Règle de calcul** : Une ligne = une relance enregistrée dans `payment_reminders`. La vue ne calcule rien d'agrégé : elle aplatit la relance (montant impayé figé au moment de l'émission, jours de retard, palier J+N, statut d'envoi, suivi de livraison, dates planifiée/envoyée/annulée) en y greffant la référence du lot (`lots.ref`) et, via la règle appliquée, son libellé et son canal. Le nom du destinataire vient du champ figé `recipient_name` (snapshot historique au moment de la relance, pas une jointure live sur le copropriétaire courant), conforme à la vocation d'archive de la table (conservation 10 ans, art. 19 loi 65-557). Tri d'affichage : `created_at` décroissant (relance la plus récente en haut), filtres optionnels par `copro_id`, `lot_id`, `status`.
- **Tables sources** : payment_reminders, lots, payment_reminder_rules
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | PK de la relance (payment_reminders.id) |
| copro_id | Copropriété (filtre principal côté front) |
| lot_id | Lot concerné par l'impayé (filtre optionnel) |
| lot_ref | Référence lisible du lot (lots.ref) |
| owner_id | Copropriétaire ciblé (payment_reminders.owner_id, nullable) |
| owner_name | Nom du destinataire figé au moment de la relance (recipient_name) |
| recipient_email | Email destinataire figé au moment de la relance |
| unpaid_amount | Montant impayé figé lors de l'émission de la relance |
| oldest_due_date | Date d'échéance la plus ancienne de l'impayé relancé |
| days_overdue | Nombre de jours de retard au moment de la relance |
| delay_level | Palier de relance en jours (ex. 7, 30, 60, 90) — sert au mapping de statut métier côté front |
| status | Statut de la relance (pending/sent/failed/stale/skipped) |
| delivery_status | Suivi de remise du message (pending/queued/sent/delivered/.../bounced/failed, nullable) |
| scheduled_at | Date de planification de l'envoi |
| sent_at | Date d'envoi effectif (nullable) |
| cancelled_at | Date d'annulation (nullable, ex. paiement reçu entre-temps) |
| cancelled_reason | Motif d'annulation (nullable) |
| created_at | Date de création de la relance (clé de tri d'affichage) |
| rule_label | Libellé de la règle de relance appliquée (payment_reminder_rules.label, nullable) |
| channel | Canal de la règle de relance (notification_channel: email/postal/..., nullable) |

- **Consommateurs** :
  - src/lib/impayes/api.ts:168 (listPaymentReminders → interface PaymentReminderOverview, api.ts:48-69)
  - src/lib/finance/api.ts:1103 (listPaymentReminders → interface PaymentReminder)
  - src/hooks/modules/useImpayesData.ts (useImpayesData → reminders: PaymentReminderOverview[])
  - src/components/features/ventes-impayes/impayes/hooks/useImpayesPage.ts (mapping relances → historique, statut métier via delay_level)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260126_niveau5b_payment_reminders.sql (CREATE OR REPLACE VIEW v_payment_reminders_overview, lignes 121-146)
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 — recréation de v_payment_reminders_overview (atlas : GARDER cible)
-- Vue d'archive : aplatit chaque relance avec la ref du lot et le libellé de sa règle.
-- Aucune jointure live sur le copropriétaire : owner_name = snapshot recipient_name.
create or replace view public.v_payment_reminders_overview
with (security_invoker = true) as
select
  pr.id,
  pr.copro_id,
  pr.lot_id,
  l.ref                as lot_ref,
  pr.owner_id,
  pr.recipient_name    as owner_name,
  pr.recipient_email,
  pr.unpaid_amount,
  pr.oldest_due_date,
  pr.days_overdue,
  pr.delay_level,
  pr.status,
  pr.delivery_status,
  pr.scheduled_at,
  pr.sent_at,
  pr.cancelled_at,
  pr.cancelled_reason,
  pr.created_at,
  prr.label            as rule_label,
  prr.channel
from public.payment_reminders pr
join public.lots l
  on l.id = pr.lot_id
left join public.payment_reminder_rules prr
  on prr.id = pr.reminder_rule_id;
```

- **Notes** : RECREATE quasi à l'identique : les deux tables sources (payment_reminders, payment_reminder_rules) existent telles quelles dans le nouveau schéma (0016, lignes 232-266) et exposent les mêmes colonnes ; aucune colonne droppée/déménagée n'est touchée par cette vue. Les deux consommateurs (impayes/api.ts:168 et finance/api.ts:1103) lisent un jeu de colonnes STRICTEMENT identique à l'interface PaymentReminderOverview (impayes/api.ts:48-69) — la vue doit exposer exactement ces 20 colonnes. Pièges : (1) owner_name = pr.recipient_name (snapshot figé), PAS une jointure sur coproprietaires — c'est volontaire (table d'archive, lots n'a de toute façon pas d'owner_id) ; ne pas « améliorer » en dérivant via lot_owners. (2) Légère divergence legacy↔cible : unpaid_amount était NUMERIC(15,2) en legacy, numeric(14,2) en cible (sans incidence sur la vue) ; oldest_due_date/days_overdue/delay_level sont nullable en cible alors qu'ils étaient NOT NULL en legacy → l'interface PaymentReminderOverview type oldest_due_date/days_overdue/delay_level comme non-null : tolérable car en pratique toujours renseignés, mais à garder en tête si on durcit le typage. (3) Ajouter security_invoker = true (toutes les vues finance le portent ; absent du CREATE legacy). (4) Vue sœur v_unpaid_with_reminders (même migration legacy, lignes 153-179) est aussi droppée et lue par impayes/api.ts:123 et finance/api.ts:1084 — à recréer en parallèle dans la même migration 0036 (elle s'appuie sur v_unpaid_by_lot + LATERAL sur payment_reminders) ; hors périmètre de cette fiche mais à traiter ensemble (ligne 48 et chantier 1 de AUDIT_DRIFT_FINANCE.md). (5) Atlas (MATRICE-LIAISON / front-07) : écran Impayés à CONSERVER (cible), donc on recrée, on ne supprime pas. (6) Ne PAS référencer la RPC get_pending_reminders_to_send legacy : elle utilisait lots.owner_id (colonne droppée) — sujet distinct, à corriger côté lot_owners lors de la refonte des relances, hors scope de cette vue.

### v_call_lines_detailed — RESHAPE

- **Rôle** : Vue de lecture du détail d'un appel de fonds (1 ligne par lot×clé).
- **Règle de calcul** : amount_remaining = amount_due − amount_paid ; lot_weight = COALESCE(weight_snapshot, repartition_key_lines.weight de (clé,lot), 0) ; key_total_weight = Σ weight de tous les lots de la clé ; owner_name = propriétaire principal actif du lot (lot_owners is_primary + end_date NULL/future → coproprietaires) ; lot_tantiemes = poids du lot dans la clé de répartition générale active de la copro (remplace lots.tantiemes_generaux qui est droppée).
- **Tables sources** : call_for_funds_lines, call_for_funds, lots, repartition_keys, repartition_key_lines, lot_owners, coproprietaires
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | PK de la ligne d'appel (call_for_funds_lines.id) |
| copro_id | Copropriété |
| call_id | Appel de fonds parent |
| call_label | Libellé de l'appel (cf.label) |
| issue_date | Date d'émission de l'appel |
| due_date | Date d'échéance de l'appel |
| call_status | Statut de l'appel (call_for_funds_status) |
| repartition_key_id | Clé de répartition de la ligne (nullable) |
| repartition_key_name | Nom de la clé de répartition (nullable) |
| lot_id | Lot concerné |
| lot_ref | Référence du lot (lots.ref) |
| lot_type | Type du lot (lot_type) |
| amount_due | Montant dû pour cette (lot×clé) |
| amount_paid | Montant déjà payé sur cette ligne |
| amount_remaining | Reste à payer = amount_due − amount_paid |
| status | Statut de la ligne (unpaid\|partial\|paid) |
| owner_name | Nom du copropriétaire principal actif du lot (nullable) |
| lot_weight | Poids du lot dans la clé : weight_snapshot sinon weight courant sinon 0 |
| key_total_weight | Somme des poids de tous les lots de la clé |
| lot_tantiemes | Quote-part générale du lot, dérivée de repartition_key_lines.weight de la clé générale active |

- **Consommateurs** :
  - src/lib/finance/api.ts:288 getCombinedCallLines() (select v_call_lines_detailed, order lot_ref)
  - src/lib/finance/api.ts:304 getCallLines() (select v_call_lines_detailed, order lot_ref)
  - src/lib/finance/api.ts:40 interface CallLineDetailed (contrat de colonnes)
  - src/hooks/modules/useFinanceData.ts:68 useCallLines()
  - src/features/finance/appels-fonds/hooks/useAppelsFondsDetail.ts (regroupement par lot + ventilation par clé, breakdown, relanceLine)
  - src/features/finance/appels-fonds/hooks/useRelance.ts
  - src/features/finance/appels-fonds/components/CoproTable.tsx (table dépliable lot→clés)
  - src/features/finance/appels-fonds/components/RelanceModal.tsx
  - src/features/finance/appels-fonds/services/avis-appel-export.service.ts (génération PDF avis d'appel)
  - src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx (écran détail appel)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260531230000_wp3_call_lines_lot_tantiemes.sql (dernière révision, ajoute lot_tantiemes). Versions antérieures : 20260531190000_wp6_appel_budget_agrege.sql, 20260314_call_lines_add_weight.sql (ajoute lot_weight/key_total_weight), 20260125_niveau2e_finance_metier.sql (création initiale).
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
CREATE VIEW public.v_call_lines_detailed
WITH (security_invoker = true) AS
SELECT
    cfl.id,
    cfl.copro_id,
    cfl.call_id,
    cf.label                                   AS call_label,
    cf.issue_date,
    cf.due_date,
    cf.status                                  AS call_status,
    cfl.repartition_key_id,
    cfl.lot_id,
    l.ref                                       AS lot_ref,
    l.type                                      AS lot_type,
    cfl.amount_due,
    cfl.amount_paid,
    cfl.amount_due - cfl.amount_paid            AS amount_remaining,
    cfl.status,
    COALESCE(cfl.weight_snapshot, rkl.weight, 0::numeric) AS lot_weight,
    COALESCE(rk_total.total_weight, 0::numeric)          AS key_total_weight,
    (
        SELECT
            CASE
                WHEN cp.is_company THEN COALESCE(cp.company_name, '')
                ELSE btrim(COALESCE(cp.first_name, '') || ' ' || COALESCE(cp.last_name, ''))
            END
        FROM public.lot_owners lo
        JOIN public.coproprietaires cp ON cp.id = lo.coproprietaire_id
        WHERE lo.lot_id = cfl.lot_id
          AND lo.is_primary = true
          AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
        ORDER BY lo.start_date DESC
        LIMIT 1
    )                                           AS owner_name,
    rk.name                                     AS repartition_key_name,
    COALESCE(gen.weight, 0::numeric)            AS lot_tantiemes
FROM public.call_for_funds_lines cfl
JOIN public.call_for_funds cf  ON cf.id = cfl.call_id
JOIN public.lots l             ON l.id  = cfl.lot_id
LEFT JOIN public.repartition_keys rk
       ON rk.id = cfl.repartition_key_id
LEFT JOIN public.repartition_key_lines rkl
       ON rkl.key_id = cfl.repartition_key_id
      AND rkl.lot_id = cfl.lot_id
LEFT JOIN (
    SELECT key_id, SUM(weight) AS total_weight
    FROM public.repartition_key_lines
    GROUP BY key_id
) rk_total ON rk_total.key_id = cfl.repartition_key_id
LEFT JOIN LATERAL (
    SELECT rkl_g.weight
    FROM public.repartition_key_lines rkl_g
    JOIN public.repartition_keys rk_g ON rk_g.id = rkl_g.key_id
    WHERE rkl_g.lot_id = cfl.lot_id
      AND rk_g.copro_id = cfl.copro_id
      AND rk_g.category = 'general'
      AND rk_g.is_active = true
    ORDER BY rk_g.valid_from DESC
    LIMIT 1
) gen ON true;
```

- **Notes** : RESHAPE et non RECREATE : seule la source de lot_tantiemes change. La colonne lots.tantiemes_generaux a été droppée — la quote-part générale se dérive maintenant du poids du lot dans la clé de répartition GÉNÉRALE active (repartition_keys.category='general' AND is_active=true → repartition_key_lines.weight), cohérent avec la définition de total_tantiemes donnée dans la référence et avec l'audit (ligne 4 : « tout passe par repartition_key_lines.weight »). PIÈGES : (1) une copro peut avoir plusieurs clés générales actives sur des périodes valid_from/valid_to différentes — j'ai retenu la plus récente par valid_from ; à arbitrer avec l'expert si le filtrage doit aussi tenir compte de valid_to/CURRENT_DATE. (2) owner_name : le legacy concaténait first_name||last_name sans gérer les personnes morales (is_company/company_name) ni les NULL — j'ai durci pour éviter un nom « null null » et couvrir les sociétés ; le front lit owner_name brut (string|null), aucune casse de contrat. (3) Le contrat TS CallLineDetailed (src/lib/finance/api.ts:40) liste 20 champs et tous sont produits ; ne pas renommer (les consommateurs lisent ces noms exacts). (4) Vue exposée en security_invoker comme toutes les vues finance 0028+ (le legacy ne l'était pas). (5) lot_weight conserve la priorité weight_snapshot pour figer la quote-part à l'émission de l'appel — comportement métier voulu (le legacy le faisait déjà). Aucun écran consommateur n'est mort dans l'atlas : l'écran détail appel /finance/appels-fonds/[callId] et l'export PDF avis d'appel sont actifs.

### v_call_campaigns — RESHAPE

- **Rôle** : Donne une ligne de synthese par exercice comptable qui regroupe TOUS les appels de fonds de cet exercice (la "campagne d'appels"), avec les totaux appeles/payes, le nombre de trimestres et de cles utilisees, le statut global, et le lien vers l'AG d'origine.
- **Règle de calcul** : Un "call campaign" = l'ensemble des appels de fonds (table call_for_funds) d'une meme copropriete sur un meme exercice (period_id). On agrege ces appels en une seule ligne : total_amount = somme des montants appeles ; total_paid = somme des amount_paid des lignes d'appel (call_for_funds_lines) ; total_calls = nombre d'appels ; total_trimesters = nombre de trimestres distincts couverts ; trimesters_issued = nombre de trimestres effectivement emis (statut hors draft/cancelled) ; total_keys = nombre de cles de repartition distinctes utilisees, lues sur les LIGNES d'appel (cfl.repartition_key_id) car dans le nouveau schema call_for_funds.repartition_key_id est toujours NULL (un appel est multi-cles). global_status est derive des statuts des appels : 'cancelled' si tout est annule, sinon 'paid' si tout est paye, 'draft' si tout est en brouillon, 'partially_paid' si au moins un euro a ete encaisse, sinon 'issued'. Le lien AG passe par le budget rattache aux appels : call_for_funds.budget_id -> budgets.source_ag_id -> ag_meetings (titre + date de reunion). Une seule AG est exposee (la plus recente des budgets references par les appels de la periode).
- **Tables sources** : call_for_funds, call_for_funds_lines, accounting_periods, budgets, ag_meetings
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| copro_id | Copropriete (cle de filtrage front .eq('copro_id')) |
| period_id | Exercice comptable ; cle de regroupement, le front matche c.period_id === selectedPeriod.id |
| period_name | Libelle de l'exercice (accounting_periods.name) |
| period_start | Debut de l'exercice ; sert au tri .order('period_start', desc) du front |
| period_end | Fin de l'exercice |
| ag_id | AG d'origine des appels (via budget.source_ag_id), NULL si appels hors AG |
| ag_meeting_date | Date de la reunion d'AG liee, NULL si pas d'AG |
| ag_title | Titre de l'AG liee, NULL si pas d'AG |
| total_calls | Nombre d'appels de fonds dans la campagne |
| total_keys | Nombre de cles de repartition distinctes utilisees (lues sur les lignes, car appel multi-cles) |
| total_trimesters | Nombre de trimestres distincts couverts par les appels |
| trimesters_issued | Nombre de trimestres effectivement emis (statut hors draft/cancelled) |
| total_amount | Montant total appele sur l'exercice (somme cf.total_amount) |
| total_paid | Montant total encaisse (somme des amount_paid des lignes d'appel) |
| global_status | Statut global de la campagne (draft\|issued\|partially_paid\|paid\|cancelled) derive des statuts des appels |

- **Consommateurs** :
  - src/lib/finance/api.ts:222 (listCallCampaigns) + interface CallCampaign ligne 204
  - src/hooks/modules/useFinanceData.ts:64 (useCallCampaigns)
  - src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts:57,104-107 (selectionne la campagne de la periode affichee, expose 'campaign')
  - ecran Finance > Appels de fonds (src/app/(dashboard)/finance/appels-fonds)
- **Ancienne définition** : Aucun CREATE VIEW v_call_campaigns trouve dans supabase/migrations_legacy/ (grep negatif sur tout le dossier). La vue est seulement NOMMEE dans .planning/AUDIT_DRIFT_FINANCE.md (ligne 95, liste des vues d'agregat a recreer en 0036+) et consommee par le front (src/lib/finance/api.ts:222 listCallCampaigns, interface CallCampaign:204). C'est donc une vue attendue/jamais materialisee en legacy (orpheline) : son contrat est defini par l'interface TypeScript CallCampaign, pas par un SQL existant. La vue voisine v_calls_overview (sa source d'inspiration, agregat par appel) existe, elle, dans migrations_legacy/20260125_niveau2e_finance_metier.sql:744.
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
create or replace view public.v_call_campaigns
with (security_invoker = true) as
with calls_agg as (
  select
    cf.copro_id,
    cf.period_id,
    count(*)                                                          as total_calls,
    count(distinct cf.trimester) filter (where cf.trimester is not null)            as total_trimesters,
    count(distinct cf.trimester) filter (
      where cf.trimester is not null and cf.status not in ('draft','cancelled')
    )                                                                as trimesters_issued,
    sum(cf.total_amount)                                             as total_amount,
    count(*) filter (where cf.status = 'cancelled')                  as cancelled_count,
    count(*) filter (where cf.status = 'draft')                      as draft_count
  from public.call_for_funds cf
  group by cf.copro_id, cf.period_id
),
lines_agg as (
  select
    cfl.copro_id,
    cf.period_id,
    coalesce(sum(cfl.amount_paid), 0)                                as total_paid,
    count(distinct cfl.repartition_key_id) filter (where cfl.repartition_key_id is not null) as total_keys
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  group by cfl.copro_id, cf.period_id
),
ag_link as (
  -- AG la plus recente parmi les budgets rattaches aux appels de la periode
  select distinct on (cf.copro_id, cf.period_id)
    cf.copro_id,
    cf.period_id,
    am.id            as ag_id,
    am.meeting_date  as ag_meeting_date,
    am.title         as ag_title
  from public.call_for_funds cf
  join public.budgets b      on b.id = cf.budget_id
  join public.ag_meetings am on am.id = b.source_ag_id
  order by cf.copro_id, cf.period_id, am.meeting_date desc
)
select
  ca.copro_id,
  ca.period_id,
  ap.name                                                           as period_name,
  ap.start_date                                                     as period_start,
  ap.end_date                                                       as period_end,
  al.ag_id,
  al.ag_meeting_date,
  al.ag_title,
  ca.total_calls,
  coalesce(la.total_keys, 0)                                        as total_keys,
  ca.total_trimesters,
  ca.trimesters_issued,
  ca.total_amount,
  coalesce(la.total_paid, 0)                                        as total_paid,
  case
    when ca.cancelled_count = ca.total_calls                                  then 'cancelled'
    when ca.draft_count = ca.total_calls                                      then 'draft'
    when coalesce(la.total_paid, 0) >= ca.total_amount and ca.total_amount > 0 then 'paid'
    when coalesce(la.total_paid, 0) > 0                                       then 'partially_paid'
    else 'issued'
  end::call_for_funds_status                                        as global_status
from calls_agg ca
join public.accounting_periods ap on ap.id = ca.period_id
left join lines_agg la on la.copro_id = ca.copro_id and la.period_id = ca.period_id
left join ag_link  al on al.copro_id = ca.copro_id and al.period_id = ca.period_id;

comment on view public.v_call_campaigns is 'Synthese par exercice de toutes les campagnes d''appels de fonds (totaux appeles/payes, trimestres, cles, statut global, AG d''origine).';
```

- **Notes** : PIEGES / DIVERGENCES : (1) Vue ORPHELINE — aucun SQL legacy ne la cree, son seul contrat est l'interface TS CallCampaign (api.ts:204). Classee RESHAPE et non RECREATE car il n'y a rien a copier ; je l'ai reconstruite a partir de l'interface + du pattern de v_calls_overview (qui agrege par appel) en remontant d'un cran a l'exercice. (2) total_keys : dans le NOUVEAU schema cf.repartition_key_id est TOUJOURS NULL (commentaire reference : appel multi-cles), donc les cles se comptent sur call_for_funds_lines.repartition_key_id (lui aussi nullable). Si toutes les lignes sont NULL, total_keys = 0 — c'est attendu tant que la ventilation par cle n'est pas tracee sur les lignes. (3) Lien AG : passe par budget.source_ag_id (FK ag_meetings ajoutee en 0017). Comme une periode peut porter plusieurs budgets/AG, j'expose UNE seule AG (distinct on + meeting_date desc) ; si la copro fait plusieurs AG dans l'exercice, seul le plus recent ressort — a valider avec l'expert metier si on veut plutot l'AG de la convocation initiale. (4) global_status est CAST en call_for_funds_status, exactement l'union du type TS ('draft'|'issued'|'partially_paid'|'paid'|'cancelled'). (5) Le front ne lit AUCUN champ individuel de campaign (pas de campaign.x trouve) : il selectionne juste l'objet entier par period_id et le passe plus bas ; le contrat de colonnes est donc dirige par l'interface TS, pas par un usage UI granulaire — surtout ne pas renommer de colonne. (6) Tri : le front fait .order('period_start') cote PostgREST, donc period_start DOIT exister (fourni). (7) Aucune colonne droppee utilisee (pas de tantiemes_*, pas de account_code, pas de fournisseur). security_invoker=true conforme aux autres vues finance. A integrer en migration 0036 ; reste a verifier au moment de l'ecriture que les budgets travaux n'ayant pas de source_ag_id ne cassent pas le lien (gere par les LEFT JOIN / inner join dans ag_link qui exclut simplement les budgets sans AG).

### v_budget_expenses_detail — RESHAPE

- **Rôle** : Liste à plat des dépenses imputées sur un budget, enrichie du libellé du poste budgétaire, du nom du budget et du nom du fournisseur, pour l'écran de suivi des dépenses d'un budget.
- **Règle de calcul** : Une ligne par dépense (budget_expenses). On rattache chaque dépense à son poste budgétaire (budget_lines) pour récupérer son libellé et son code de poste, puis au budget parent (budgets) pour le nom et le type de budget. Nouveauté du schéma cible : la dépense ne stocke plus le fournisseur en texte libre mais une référence tiers_id (uuid) ; on joint donc la table tiers pour ré-exposer le nom du fournisseur sous la colonne `fournisseur` attendue par le front (chaîne de caractères, NULL si aucun tiers rattaché). Aucun calcul comptable : c'est une vue de présentation/contexte, pas une vue d'agrégat.
- **Tables sources** : budget_expenses, budget_lines, budgets, tiers
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| id | id de la dépense (budget_expenses.id) |
| copro_id | copropriété de rattachement (filtre RLS / requête front) |
| budget_id | budget parent |
| budget_line_id | poste budgétaire imputé |
| label | libellé de la dépense |
| amount | montant TTC de la dépense |
| montant_ht | montant HT (nullable) |
| taux_tva | taux de TVA appliqué (nullable) |
| tx_date | date de la dépense (tri par défaut DESC) |
| status | statut de la dépense (expense_status: draft/pending_validation/validated/rejected) |
| fournisseur | RESHAPE — nom du fournisseur dérivé de tiers.name via tiers_id (texte, NULL si pas de tiers) ; remplace l'ancienne colonne texte libre |
| tiers_id | référence uuid du fournisseur (nouveau schéma, exposée en plus pour permettre l'édition future) |
| piece_jointe | uuid du document justificatif rattaché (FK documents, nullable) |
| validated_at | horodatage de validation (nullable) |
| validated_by | profil ayant validé (nullable) |
| rejection_comment | motif de rejet (nullable) |
| created_at | date de création de la dépense |
| updated_at | date de dernière modification |
| line_label | libellé du poste budgétaire (budget_lines.label) |
| line_code | code du poste budgétaire (budget_lines.code, nullable) |
| budget_name | nom du budget parent (budgets.name, nullable) |
| budget_type | type de budget (current/works/alur) |

- **Consommateurs** :
  - src/lib/budget/api.ts:233 listBudgetExpenses() → interface ExpenseDetail (api.ts:75-97)
  - src/hooks/modules/useBudgetData.ts:128 loadBudgetExpenses() / state expenses
  - src/components/features/finance/Budget/BudgetDepensesTable.tsx (tri/groupement par fournisseur, colonnes date/libellé/poste/montant/statut)
  - src/components/features/finance/Budget/modals/DepenseDetailModal.tsx:120 (affiche fournisseur)
  - src/components/features/finance/Budget/modals/DepenseEditorModal.tsx
  - src/components/features/finance/Budget/modals/PosteDetailModal.tsx
  - src/components/features/finance/Budget/DepenseValidationPanel/DepenseValidationPanel.tsx
  - src/components/features/finance/Budget/BudgetPostesList.tsx
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260128_budget_expenses_and_views.sql (lignes 203-232, CREATE VIEW v_budget_expenses_detail). Joignait budget_expenses → budget_lines → budgets et exposait e.fournisseur (TEXT libre), montant_ht/taux_tva en NUMERIC(12,2)/(4,2), piece_jointe en TEXT.
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 — vue de détail des dépenses budgétaires (RESHAPE legacy)
-- Changement clé vs legacy : fournisseur (texte libre) -> dérivé de tiers.name via budget_expenses.tiers_id
create or replace view public.v_budget_expenses_detail
with (security_invoker = true) as
select
  e.id,
  e.copro_id,
  e.budget_id,
  e.budget_line_id,
  e.label,
  e.amount,
  e.montant_ht,
  e.taux_tva,
  e.tx_date,
  e.status,
  t.name            as fournisseur,   -- RESHAPE : nom dérivé du tiers (NULL si tiers_id NULL)
  e.tiers_id,
  e.piece_jointe,
  e.validated_at,
  e.validated_by,
  e.rejection_comment,
  e.created_at,
  e.updated_at,
  bl.label          as line_label,
  bl.code           as line_code,
  b.name            as budget_name,
  b.budget_type
from public.budget_expenses e
join public.budget_lines bl on bl.id = e.budget_line_id
join public.budgets b       on b.id = e.budget_id
left join public.tiers t    on t.id = e.tiers_id;

comment on view public.v_budget_expenses_detail is
  'Detail des depenses budgetaires avec contexte (poste, budget) ; fournisseur derive de tiers.name via tiers_id.';
```

- **Notes** : RESHAPE confirmé. Voir le champ businessRule/proposedSql ci-dessus.

### v_alur_lot_contributions — RESHAPE

- **Rôle** : Donne, pour chaque lot, sa contribution **RÉELLE** au fonds de travaux ALUR (art. 14-2 II) : ce qui lui a été appelé, ce qu'il a versé, et son solde restant dû (compte **450-5** du grand livre) — avec ses tantièmes en information et le propriétaire actuel. **Lot-centric, dérivé du grand livre — PAS un redécoupage théorique par tantièmes.**
- **Règle de calcul** : Les montants viennent des VRAIES écritures par lot. Pour l'exercice ALUR courant (dernier budget `budget_type='alur'`) : `lot_cotisation_appelee` = Σ `amount_due` des lignes d'appel ALUR du lot ; `lot_cotisation_versee` = Σ `amount_paid` de ces mêmes lignes. `lot_solde_alur` = solde du sous-compte ALUR du lot dans le grand livre = Σ(débit − crédit) des écritures **postées** sur les comptes de nature `alur`, par `lot_id` (= ce que le lot doit ENCORE au fonds ; vérité légale, cumulative). Les tantièmes (`tantiemes_generaux` + `share_percent`) sont dérivés de `repartition_key_lines.weight` sur la clé générale active et fournis en **INFORMATION** seulement (lots n'a plus de colonne tantièmes). Propriétaire = principal courant (lot_owners is_primary, end_date NULL).
- **Tables sources** : lots, repartition_key_lines, repartition_keys, lot_owners, coproprietaires, budgets, accounting_periods, call_for_funds, call_for_funds_lines, ledger_entries, ledger_transactions, accounts (nature='alur'). **Ne dépend plus de v_alur_fund_summary.**
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| lot_id | uuid du lot (clé de ligne) |
| copro_id | uuid de la copropriété (filtre des consommateurs) |
| lot_ref | référence affichée du lot (tri ascendant côté front) |
| tantiemes_generaux | poids du lot sur la clé générale active (**INFORMATION** ; ex-lots.tantiemes_generaux, dérivé de repartition_key_lines.weight) |
| share_percent | quote-part du lot en % (tantièmes lot / total tantièmes × 100), arrondie à 2 décimales — **info** |
| owner_id | uuid du copropriétaire principal courant, NULL si lot sans propriétaire |
| owner_name | nom affiché du propriétaire (raison sociale si société, sinon prénom + nom), 'Non assigné' si absent |
| period_year | année de l'exercice du dernier budget ALUR |
| lot_cotisation_appelee | cotisation ALUR appelée au lot sur l'exercice courant = Σ amount_due des lignes d'appel ALUR du lot |
| lot_cotisation_versee | cotisation ALUR déjà versée par le lot = Σ amount_paid de ces mêmes lignes |
| lot_solde_alur | solde ALUR du lot = Σ(débit − crédit) sur son compte 450-5 (nature alur), écritures postées ; > 0 = reste dû |

- **Consommateurs** :
  - src/hooks/modules/useALURData.ts:170 (loadLotContributions → ALURLotContribution[], onglet Fonds ALUR)
  - src/hooks/modules/useBudget.ts:172 (loadCoproprietairesALUR → CoproprietaireALUR[], onglet ALUR du module Budgets)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260129_alur_transfers.sql (CREATE VIEW v_alur_lot_contributions, lignes 110-162)
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 (proposée) — recréer v_alur_lot_contributions sur le schéma cible.
-- LOT-CENTRIC : montants dérivés des VRAIES écritures par lot (lignes d'appel ALUR + grand livre 450-5),
-- PAS d'un redécoupage du total par tantièmes. tantiemes = INFO (repartition_key_lines.weight).
drop view if exists public.v_alur_lot_contributions;

create view public.v_alur_lot_contributions
with (security_invoker = true) as
with general_key as (
  -- clé générale active canonique par copro (déterministe ; 1 attendue, dette si >1)
  select distinct on (rk.copro_id) rk.copro_id, rk.id as key_id
  from public.repartition_keys rk
  where rk.category = 'general' and rk.is_active
  order by rk.copro_id, rk.id
),
lot_weights as (
  select
    l.id          as lot_id,
    l.copro_id,
    l.ref         as lot_ref,
    coalesce(rkl.weight, 0) as weight
  from public.lots l
  join general_key gk on gk.copro_id = l.copro_id
  left join public.repartition_key_lines rkl
    on rkl.lot_id = l.id and rkl.key_id = gk.key_id
),
copro_totals as (
  select copro_id, sum(weight) as total_weight
  from lot_weights
  group by copro_id
),
latest_alur as (
  -- dernier budget ALUR par copro (exercice ALUR courant)
  select distinct on (b.copro_id)
    b.copro_id,
    b.id                                  as budget_id,
    extract(year from ap.start_date)::int as period_year
  from public.budgets b
  join public.accounting_periods ap on ap.id = b.period_id
  where b.budget_type = 'alur'
  order by b.copro_id, ap.start_date desc
),
alur_lines as (
  -- VRAIES sommes par lot sur l'exercice ALUR courant (lignes d'appel ALUR émises)
  select
    cfl.lot_id,
    sum(cfl.amount_due)  as cotisation_appelee,
    sum(cfl.amount_paid) as cotisation_versee
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  join latest_alur la           on la.budget_id = cf.budget_id
  where cf.status not in ('draft', 'cancelled')
  group by cfl.lot_id
),
alur_ledger as (
  -- solde du sous-compte ALUR (450-5, nature='alur') par lot = vérité légale (cumulatif, écritures postées)
  select
    e.lot_id,
    sum(case when e.direction = 'debit' then e.amount else -e.amount end) as solde_alur
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id
  join public.accounts a            on a.id = e.account_id
  where a.nature = 'alur'
    and t.status = 'posted'
    and e.lot_id is not null
  group by e.lot_id
)
select
  lw.lot_id,
  lw.copro_id,
  lw.lot_ref,
  lw.weight as tantiemes_generaux,
  round((lw.weight / nullif(ct.total_weight, 0) * 100)::numeric, 2) as share_percent,
  lo.coproprietaire_id as owner_id,
  coalesce(
    case when c.is_company then c.company_name
         else nullif(trim(concat_ws(' ', c.first_name, c.last_name)), '')
    end,
    'Non assigné'
  ) as owner_name,
  la.period_year,
  coalesce(al.cotisation_appelee, 0) as lot_cotisation_appelee,
  coalesce(al.cotisation_versee, 0)  as lot_cotisation_versee,
  coalesce(led.solde_alur, 0)        as lot_solde_alur
from lot_weights lw
join copro_totals ct on ct.copro_id = lw.copro_id
left join latest_alur la  on la.copro_id = lw.copro_id
left join alur_lines al   on al.lot_id = lw.lot_id
left join alur_ledger led on led.lot_id = lw.lot_id
left join public.lot_owners lo
  on lo.lot_id = lw.lot_id and lo.end_date is null and lo.is_primary = true
left join public.coproprietaires c on c.id = lo.coproprietaire_id
where lw.weight > 0;

comment on view public.v_alur_lot_contributions is
  'Contributions ALUR par lot, LOT-CENTRIC : appelee/versee = lignes d''appel ALUR du dernier budget ALUR ; solde = compte 450-5 (nature alur) du grand livre par lot. tantiemes = info. Ne depend plus de v_alur_fund_summary.';
```

- **Notes** :
1) **CORRIGÉ (décision USER 2026-06-07)** : la version initiale redécoupait le total du fonds par tantièmes (part théorique) — faux car le fonds est collectif et tous les lots ne paient pas à l'identique. Remplacée par un calcul **lot-centric** : `appelee`/`versee` = vraies lignes d'appel ALUR du lot, `solde` = compte 450-5 du grand livre par lot. Cohérent avec [[ledger_account_model]] (créance par nature + lot_id) et la compta d'engagement (GL = source unique).
2) **SCOPE** : `appelee`/`versee` portent sur l'exercice ALUR courant (dernier budget `alur`) ; `solde_alur` = solde CUMULATIF du 450-5 (toutes périodes). En système propre, solde ≈ (appelé − versé) cumulé ; un écart est légitime (exercices antérieurs / à-nouveaux) et repérable via `v_lot_vs_gl_mismatch`.
3) **FRONT À REMAPPER** : les consommateurs lisent aujourd'hui `lot_cotisation_annuelle` et `lot_solde_alur` ; mapper `lot_cotisation_annuelle` → `lot_cotisation_appelee` et exposer en plus `lot_cotisation_versee` (useALURData.ts:170, useBudget.ts:172).
4) **CAVEAT 0035** : le header de 0035 déclare cette vue MORTE « JAMAIS recreee » ; on la ressuscite (adaptée) — acté par l'USER. Retirer `v_alur_lot_contributions` de la liste des vues mortes du `gate_0035.sql` avant 0036.
5) Le fonds ALUR est **collectif et non-remboursable** (art.14-2 II) : `solde_alur` = ce que le lot doit ENCORE au fonds (créance 450-5), pas une part de propriété récupérable au vendeur (cf. [[etat_date_art5_structure]]).

### v_repartition_key_lines_detailed — RESHAPE

- **Rôle** : Détaille, lot par lot, la composition d'une clé de répartition : pour chaque lot rattaché à la clé, son poids (tantièmes) et la part en pourcentage qu'il représente dans cette clé.
- **Règle de calcul** : Une clé de répartition (ex. « charges générales », « ascenseur ») répartit une dépense entre les lots au prorata de poids. La vue liste une ligne par lot présent dans la clé et calcule, pour chaque ligne, share_pct = weight / (somme des weight de la même clé) × 100. PIÈGE CENTRAL : la colonne tantiemes_generaux ne peut plus venir de lots.tantiemes_generaux (colonne supprimée du nouveau schéma) ; on la dérive désormais du poids du lot dans la clé générale active de la copro (repartition_keys.category='general' AND is_active=true). Un lot sans poids dans la clé générale ressort à 0. Si la somme des poids de la clé est nulle, share_pct vaut 0 (protection division par zéro).
- **Tables sources** : repartition_key_lines, repartition_keys, lots
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| line_id | id de la ligne repartition_key_lines (alias de id) |
| copro_id | copropriété (pour filtre RLS et requête front) |
| key_id | id de la clé de répartition |
| key_name | nom de la clé (repartition_keys.name) |
| basis | base de répartition enum repartition_basis (tantiemes/surface/custom) |
| coverage_mode | couverture enum coverage_mode (all_lots/subset) |
| lot_id | id du lot concerné |
| lot_ref | référence du lot (sert au tri .order('lot_ref')) |
| lot_type | type du lot enum lot_type (appartement, parking…), nullable |
| tantiemes_generaux | tantièmes du lot dans la clé GÉNÉRALE active (dérivé du weight, remplace lots.tantiemes_generaux droppé) ; 0 si le lot n'est pas dans la clé générale |
| surface | surface du lot (lots.surface), nullable |
| weight | poids du lot dans CETTE clé (repartition_key_lines.weight) |
| share_pct | part en % du lot dans la clé = weight / Σweight de la clé × 100 |

- **Consommateurs** :
  - src/lib/lots/api.ts:447 — listRepartitionKeyLines() (route d'accès canonique, .select('*') filtré copro_id + key_id, tri lot_ref)
  - src/hooks/modules/useLotsData.ts — useRepartitionKeyDetail() (état lines: RepartitionKeyLineDetailed[])
  - src/hooks/modules/useLotsRepartitionGrid.ts — grille d'édition tantièmes (allLines)
  - src/features/finance/chargeKeys/useCleDetailPage.ts — page détail d'une clé de charge (lit tantiemes_generaux → tantiemesGeneraux, weight → édition)
  - src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts — wizard appel de fonds (keyLines pour prévisualiser la ventilation)
- **Ancienne définition** : Aucun CREATE VIEW retrouvé dans supabase/migrations_legacy/ (la définition d'origine précède le dossier legacy actuel). La forme exacte de la vue legacy est reconstituée à partir de : (1) src/types/supabase.ts:15282 (Row générée : line_id, copro_id, key_id, key_name, basis, coverage_mode, lot_id, lot_ref, lot_type, tantiemes_generaux, surface, weight, share_pct) ; (2) le smoke test supabase/tests/p0_lots_repartition_smoke.sql:65-77 (TEST 6) ; (3) la spec .planning/spec/ENTITIES_MAP/05-tantiemes-cles.md:40 (« ajoute share_pct », compute_repartition_shares protège la division par zéro) ; (4) le type consommateur src/lib/lots/api.ts:140 (interface RepartitionKeyLineDetailed).
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 : recréation de la vue détail des lignes d'une clé de répartition.
-- RESHAPE vs legacy : tantiemes_generaux n'est plus une colonne de lots (droppée) ;
-- il est dérivé du poids du lot dans la clé GÉNÉRALE active de la copro.
create view public.v_repartition_key_lines_detailed
with (security_invoker = true)
as
with general_weights as (
  -- Poids de chaque lot dans la clé générale active de sa copropriété.
  -- Si plusieurs clés générales actives existaient, on agrège (SUM) par sécurité.
  select
    rkl_g.lot_id,
    sum(rkl_g.weight) as tantiemes_generaux
  from public.repartition_key_lines rkl_g
  join public.repartition_keys rk_g
    on rk_g.id = rkl_g.key_id
  where rk_g.category = 'general'
    and rk_g.is_active = true
  group by rkl_g.lot_id
),
key_totals as (
  -- Somme des poids par clé, pour le calcul de la part en pourcentage.
  select
    rkl_t.key_id,
    sum(rkl_t.weight) as total_weight
  from public.repartition_key_lines rkl_t
  group by rkl_t.key_id
)
select
  rkl.id                                   as line_id,
  rkl.copro_id                             as copro_id,
  rkl.key_id                               as key_id,
  rk.name                                  as key_name,
  rk.basis                                 as basis,
  rk.coverage_mode                         as coverage_mode,
  rkl.lot_id                               as lot_id,
  l.ref                                    as lot_ref,
  l.type                                   as lot_type,
  coalesce(gw.tantiemes_generaux, 0)       as tantiemes_generaux,
  l.surface                                as surface,
  rkl.weight                               as weight,
  case
    when coalesce(kt.total_weight, 0) = 0 then 0
    else round(rkl.weight / kt.total_weight * 100, 4)
  end                                      as share_pct
from public.repartition_key_lines rkl
join public.repartition_keys rk
  on rk.id = rkl.key_id
join public.lots l
  on l.id = rkl.lot_id
left join general_weights gw
  on gw.lot_id = rkl.lot_id
left join key_totals kt
  on kt.key_id = rkl.key_id;
```

- **Notes** : PIÈGES ET DÉCISIONS : (1) tantiemes_generaux — le type front RepartitionKeyLineDetailed le déclare encore obligatoire (src/lib/lots/api.ts:150), donc la vue DOIT exposer cette colonne pour ne pas casser le contrat typé, mais elle ne vient plus de lots.tantiemes_generaux (DROPPÉ). On la dérive du poids dans la clé générale active (category='general'). NB : dans l'écran useCleDetailPage.ts le tantiemesGeneraux affiché est en fait lu depuis v_lots_with_owners (lot.tantiemes_generaux), PAS depuis cette vue — la colonne ici est surtout là pour respecter le type ; elle reste cohérente avec v_lots_with_owners si les deux vues dérivent du même weight de la clé générale (à recréer dans le même lot, chantier #4 de l'audit). (2) share_pct — le legacy utilisait une protection division par zéro (compute_repartition_shares) ; le CASE proposé la reproduit. round(...,4) car les poids sont numeric(12,4) et les parts peuvent être fines (subset). (3) Ordre/tri assuré côté front par .order('lot_ref'), pas besoin d'ORDER BY dans la vue. (4) security_invoker=true conforme à toutes les vues finance (les RLS de repartition_key_lines/lots filtrent l'accès). (5) AUCUN écran mort : la vue est consommée par 4 hooks vivants (détail clé, grille tantièmes, wizard appel de fonds) — RESHAPE justifié, pas DROP. (6) Hypothèse multi-cabinet : aucune ; la jointure reste intra-copro via les FK copro_id. (7) Divergence legacy↔cible : le schéma legacy portait aussi tantiemes_escalier/ascenseur/chauffage dénormalisés sur lots (spec 05 §2.1) — tous abandonnés, plus aucune trace ici, ce qui est correct (la vraie source des poids est repartition_key_lines).

### v_unpaid_with_reminders — RESHAPE

- **Rôle** : Liste, par lot, les charges échues non réglées d'une copropriété, enrichies de la dernière relance envoyée et du nombre total de relances — c'est l'écran "impayés / recouvrement" du gestionnaire.
- **Règle de calcul** : Pour chaque lot ayant un solde dû > 0 sur ses lignes d'appel de fonds échues (due_date passée, appel ni brouillon ni annulé, ligne pas soldée), on calcule : total_due = Σ amount_due, total_paid = Σ amount_paid, unpaid_amount = Σ(amount_due − amount_paid), la plus vieille échéance (oldest_due_date) et le retard en jours (days_overdue = aujourd'hui − oldest_due_date). On déduit une gravité (severity) du retard, alignée sur les 4 paliers de relance **J+15 / J+30 / J+60 / J+90** (cf. business-rules) : NONE < 15 j (échu, 1re relance pas encore due), MINOR 15–29 j (1re relance), MEDIUM 30–59 j (2e), HIGH 60–89 j (3e), CRITICAL ≥ 90 j (contentieux). On rattache le propriétaire principal actif (owner_id/name/email/phone via lot_owners) et le type de lot. Enfin, par jointure latérale sur payment_reminders, on ajoute la dernière relance active (delay_level le plus haut, la plus récente) et le compte des relances déjà envoyées (status='sent'). Les copropriétés encore en onboarding (onboarding_step non NULL) sont exclues — hérité de v_unpaid_by_lot.
- **Tables sources** : call_for_funds_lines, call_for_funds, lots, copros, lot_owners, coproprietaires, payment_reminders
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| copro_id | Copropriété du lot impayé |
| lot_id | Lot concerné (unité de gestion, lot-centric) |
| lot_ref | Référence affichée du lot |
| lot_type | Type de lot (appartement, parking…), enum lot_type |
| owner_id | Copropriétaire principal actif (résolu via lot_owners, lots n'a pas d'owner_id) |
| owner_name | Nom affiché du propriétaire (raison sociale si société, sinon prénom+nom, 'Inconnu' à défaut) |
| owner_email | Email du propriétaire principal (destinataire des relances) |
| owner_phone | Téléphone du propriétaire principal |
| total_due | Total appelé sur les lignes échues du lot (Σ amount_due) |
| total_paid | Total déjà encaissé sur ces lignes (Σ amount_paid) |
| unpaid_amount | Reste à payer = total_due − total_paid (alias métier de total_unpaid) |
| unpaid_lines_count | Nombre de lignes d'appel échues non soldées |
| oldest_due_date | Échéance la plus ancienne impayée |
| days_overdue | Nombre de jours de retard depuis la plus vieille échéance |
| severity | Gravité (paliers relance J+15/30/60/90) : NONE/MINOR/MEDIUM/HIGH/CRITICAL |
| last_reminder_id | Id de la dernière relance active (sent/pending) du lot, NULL si aucune |
| last_reminder_level | Niveau de délai (delay_level) de cette dernière relance |
| last_reminder_status | Statut de cette dernière relance |
| last_reminder_sent_at | Date d'envoi de cette dernière relance |
| total_reminders_sent | Nombre de relances effectivement envoyées (status='sent') pour ce lot |

- **Consommateurs** :
  - src/lib/impayes/api.ts:117 listUnpaidWithReminders() (interface UnpaidWithReminders extends UnpaidByLot)
  - src/lib/finance/api.ts:1080 listUnpaidWithReminders() (interface UnpaidWithReminder)
  - src/hooks/modules/useImpayesData.ts useImpayesList() (filtre par severity, search owner_name/lot_ref, days_overdue)
  - src/features/ventes-impayes/dashboard/hooks/useVentesImpayesDashboard.ts (lit owner_name, lot_ref, unpaid_amount, days_overdue, severity)
  - Écran /ventes-impayes (dashboard zone) + /ventes-impayes/impayes + /contentieux/impayes (doublon byte-à-byte)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260126_niveau5b_payment_reminders.sql (lignes 153-179, CREATE VIEW v_unpaid_with_reminders = v_unpaid_by_lot u + 2 LEFT JOIN LATERAL sur payment_reminders) ; base v_unpaid_by_lot mise à jour dans 20260603110000_v1_6_unpaid_exclude_onboarding.sql
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
-- Migration 0036 — v_unpaid_with_reminders : impayés par lot enrichis des relances.
-- RESHAPE de la vue legacy : on conserve sa logique (v_unpaid_* + LATERAL payment_reminders)
-- mais on ÉLARGIT la shape pour matcher ce que les hooks vivants lisent réellement
-- (unpaid_amount, severity, lot_type, owner_phone, total_due, total_paid).
-- Base = v_unpaid_lot_owner (0028) qui résout déjà owner_id/name/email + agrégats par lot.
create or replace view public.v_unpaid_with_reminders
with (security_invoker = true) as
with base as (
  select
    cfl.copro_id,
    cfl.lot_id,
    l.ref                                    as lot_ref,
    l.type                                   as lot_type,
    sum(cfl.amount_due)                       as total_due,
    sum(cfl.amount_paid)                      as total_paid,
    sum(cfl.amount_due - cfl.amount_paid)     as unpaid_amount,
    count(cfl.id)                             as unpaid_lines_count,
    min(cf.due_date)                          as oldest_due_date,
    (current_date - min(cf.due_date))         as days_overdue
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  join public.lots l            on l.id = cfl.lot_id
  join public.copros c          on c.id = cfl.copro_id
  where cfl.status <> 'paid'
    and cf.status not in ('draft', 'cancelled')
    and cf.due_date < current_date
    and c.onboarding_step is null
  group by cfl.copro_id, cfl.lot_id, l.ref, l.type
  having sum(cfl.amount_due - cfl.amount_paid) > 0
),
owned as (
  select
    b.*,
    op.coproprietaire_id                      as owner_id,
    case when op.is_company then op.company_name
         else coalesce(op.first_name || ' ' || op.last_name, 'Inconnu') end as owner_name,
    op.email                                  as owner_email,
    op.phone                                  as owner_phone
  from base b
  left join lateral (
    select cp.id as coproprietaire_id, cp.is_company, cp.company_name,
           cp.first_name, cp.last_name, cp.email, cp.phone
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = b.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  ) op on true
)
select
  o.copro_id,
  o.lot_id,
  o.lot_ref,
  o.lot_type,
  o.owner_id,
  o.owner_name,
  o.owner_email,
  o.owner_phone,
  o.total_due,
  o.total_paid,
  o.unpaid_amount,
  o.unpaid_amount                              as total_unpaid,  -- alias compat legacy/finance/api.ts
  o.unpaid_lines_count,
  o.oldest_due_date,
  o.days_overdue,
  case
    when o.days_overdue >= 90 then 'CRITICAL'   -- 4e palier / contentieux
    when o.days_overdue >= 60 then 'HIGH'       -- 3e relance (J+60)
    when o.days_overdue >= 30 then 'MEDIUM'     -- 2e relance (J+30)
    when o.days_overdue >= 15 then 'MINOR'      -- 1re relance (J+15)
    else 'NONE'                                 -- echu < 15 j, 1re relance pas encore due
  end                                          as severity,
  last_reminder.id          as last_reminder_id,
  last_reminder.delay_level as last_reminder_level,
  last_reminder.status      as last_reminder_status,
  last_reminder.sent_at     as last_reminder_sent_at,
  coalesce(reminder_count.total, 0) as total_reminders_sent
from owned o
left join lateral (
  select pr.id, pr.delay_level, pr.status, pr.sent_at
  from public.payment_reminders pr
  where pr.lot_id = o.lot_id
    and pr.copro_id = o.copro_id
    and pr.status in ('sent', 'pending')
  order by pr.delay_level desc, pr.created_at desc
  limit 1
) last_reminder on true
left join lateral (
  select count(*) as total
  from public.payment_reminders pr
  where pr.lot_id = o.lot_id
    and pr.copro_id = o.copro_id
    and pr.status = 'sent'
) reminder_count on true;

comment on view public.v_unpaid_with_reminders is
  'Impayes par lot (echu non regle, copros en onboarding exclues) enrichis de la derniere relance et du compteur de relances envoyees. severity alignee sur les 4 paliers de relance J+15/30/60/90 (NONE<15, MINOR>=15, MEDIUM>=30, HIGH>=60, CRITICAL>=90).';
```

- **Notes** : PIÈGES / divergences :
1) DRIFT DE SHAPE entre les deux consommateurs : src/lib/finance/api.ts attend total_unpaid (shape legacy stricte), tandis que src/lib/impayes/api.ts (la chaîne RÉELLEMENT branchée sur les écrans, via useImpayesData + useVentesImpayesDashboard) attend unpaid_amount + severity + lot_type + owner_phone + total_due + total_paid + owner_id. La vue legacy n'exposait AUCUNE de ces 5 dernières colonnes ni unpaid_amount/severity → l'écran impayés est en réalité partiellement cassé même contre le 0028 actuel. La vue proposée expose les DEUX noms (unpaid_amount + total_unpaid en alias) pour ne casser ni l'un ni l'autre ; à terme, aligner finance/api.ts sur impayes/api.ts (un seul service) et supprimer le doublon.
2) severity : seuils **VALIDÉS par l'expert métier** = paliers de relance **J+15 / J+30 / J+60 / J+90** (CLAUDE.md business-rules). NONE<15, MINOR≥15, MEDIUM≥30, HIGH≥60, CRITICAL≥90. ⚠️ Ces mêmes paliers doivent être semés dans `payment_reminder_rules.delay_days` (15/30/60/90) et pilotent `run_payment_reminders` — cohérence à assurer HORS de cette vue (seed/config). À terme, dériver la severity des `delay_days` réels plutôt que de paliers en dur. NB : ajout de la valeur `NONE` (échu < 15 j) → 5 valeurs ; le front filtre sur MINOR/MEDIUM/HIGH/CRITICAL, les lignes `NONE` apparaissent dans la liste mais hors filtres de gravité.
3) Ne PAS réutiliser lots.owner_id : la colonne n'existe pas (lot-centric), le propriétaire passe par lot_owners (is_primary + end_date is null). La fonction legacy get_pending_reminders_to_send faisait le bug `JOIN coproprietaires c ON c.id = l.owner_id` — à NE PAS reproduire.
4) Filtre onboarding hérité : une copro fraîche a onboarding_step=0 (DEFAULT 0007) donc EXCLUE ; le code applicatif/harnais doit repasser onboarding_step à NULL en fin d'onboarding (contrat documenté en 0028 l.192-196), sinon 0 ligne.
5) payment_reminders n'a PAS de created_at problématique ici (la table en a un, contrairement à ledger_transactions/payments) → l'ORDER BY created_at du LATERAL reste valide.
6) ÉCRAN : l'atlas (front-07) classe v_unpaid_with_reminders dans les vues « Gardés/vivants » → GARDER, recréer. Mais doublon byte-à-byte /contentieux/impayes ↔ /ventes-impayes/impayes (un seul à garder, l'autre en redirect) et fallback mock IMPAYES_CRITIQUES masquant l'état réel — hors scope de cette vue mais à traiter côté front.
7) total_due/total_paid sont calculés sur les SEULES lignes échues impayées du lot (pas tout l'historique du lot) — cohérent avec le périmètre « impayés » ; ne pas confondre avec le solde GL global du lot (v_owner_statement_by_lot).

### v_account_balances — RESHAPE

- **Rôle** : Liste des comptes de trésorerie d'une copropriété (banque, IBAN) avec leur solde bancaire calculé = solde de départ + somme des mouvements bancaires importés.
- **Règle de calcul** : Pour chaque compte de trésorerie d'une copro (comptes dont le code commence par 512, 502 ou 5121 — comptes en banque, livret/fonds travaux), on part du solde initial saisi sur le compte (accounts.initial_balance, qui représente le point de départ avant le premier relevé importé) et on lui ajoute la somme algébrique de tous les mouvements bancaires rattachés à ce compte (bank_movements.amount_signed, positif pour une entrée, négatif pour une sortie). Le résultat computed_balance est donc le solde « relevé bancaire » du compte. ATTENTION : c'est volontairement une trésorerie BANCAIRE (vue du relevé importé), distincte de la trésorerie COMPTABLE qui, elle, se lit dans v_trial_balance (solde du compte 512 dans le grand livre). C'est précisément cette divergence (relevé vide = 0 € alors que le GL dit autre chose) qui a fait abandonner cette vue pour les KPI du dashboard ; elle ne survit que pour l'écran Mouvements bancaires, où afficher l'IBAN et le solde de départ par compte a du sens.
- **Tables sources** : accounts, bank_movements
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| account_id | id du compte (accounts.id) — aliasé account_id car le consommateur le lit sous ce nom (CompteBancaire.id) |
| copro_id | copropriété, sert au filtre .eq('copro_id') du consommateur |
| code | code comptable du compte (ex 512000) ; le front filtre code LIKE '512%' pour distinguer compte courant / travaux |
| name | libellé du compte (accounts.name) — affiché comme nom du compte bancaire |
| banque | nom de la banque (accounts.bank_name) ; le consommateur lit le champ banque |
| iban | IBAN du compte (accounts.iban), affiché tel quel |
| initial_balance | solde de départ saisi sur le compte avant import des relevés (accounts.initial_balance) |
| movements_total | somme algébrique des mouvements bancaires du compte (Σ bank_movements.amount_signed), 0 si aucun import |
| computed_balance | solde bancaire calculé = initial_balance + movements_total |

- **Consommateurs** :
  - src/lib/finance/api.ts:1468 listBankAccounts() (interface BankAccountWithBalance l.1456)
  - src/hooks/modules/useFinanceData.ts:134 useBankAccounts()
  - src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts (compteCourant/compteTravaux, écran Mouvements bancaires)
  - LEGACY (déjà repointés sur le GL, MORTS) : v_dashboard_kpis trésorerie via migrations_legacy/20260403_fix_dashboard_kpis_tresorerie_codes.sql et 20260531210000_wp4_unify_portefeuille_kpis_ledger.sql
- **Ancienne définition** : Aucun CREATE VIEW v_account_balances ne survit dans le dépôt. La vue est antérieure au snapshot supabase/migrations_legacy/ : seuls deux fichiers legacy la CONSOMMENT — migrations_legacy/20260403_fix_dashboard_kpis_tresorerie_codes.sql (l.15/24/32/40 : SUM(vab.computed_balance) filtré par vab.code LIKE '512%'/'502%'/'5121%') et migrations_legacy/20260531210000_wp4_unify_portefeuille_kpis_ledger.sql (l.7/16, qui acte l'abandon pour les KPI au profit du GL). Le contrat de colonnes a donc été reconstitué à partir de ces consommateurs SQL + de l'interface TypeScript BankAccountWithBalance (src/lib/finance/api.ts:1456).
- **Statut SQL** : ✅ SQL validé (aucune colonne fantôme)
- **SQL proposé (migration 0036)** :

```sql
create view public.v_account_balances
with (security_invoker = true) as
select
  a.id              as account_id,
  a.copro_id        as copro_id,
  a.code            as code,
  a.name            as name,
  a.bank_name       as banque,
  a.iban            as iban,
  a.initial_balance as initial_balance,
  coalesce(mv.movements_total, 0::numeric) as movements_total,
  a.initial_balance + coalesce(mv.movements_total, 0::numeric) as computed_balance
from public.accounts a
left join lateral (
  select sum(bm.amount_signed) as movements_total
  from public.bank_movements bm
  where bm.account_id = a.id
) mv on true
where a.account_type = 'asset'
  and a.is_active = true
  and (a.code like '512%' or a.code like '502%' or a.code like '5121%');
```

- **Notes** : CLASSEMENT = RESHAPE (et non USE-EXISTING). v_trial_balance NE PEUT PAS remplacer cette vue : (1) elle ne porte ni iban, ni bank_name, ni initial_balance ; (2) elle est groupée par compte×période (postings du GL), pas une liste d'1 ligne par compte bancaire ; (3) surtout, métier différent — v_trial_balance = trésorerie COMPTABLE (512 posté au grand livre), v_account_balances = trésorerie BANCAIRE (solde de départ + relevés importés). Les fusionner reproduirait exactement le bug qui a fait abandonner la vue côté dashboard (relevé non importé → 0 € ≠ GL).

ABANDON CIBLÉ, PAS GLOBAL. La vue est listée « morte » en 0028 (l.21) et 0035 (l.5) et le gate_0035.sql (l.20) ÉCHOUE si elle existe — mais cet abandon ne visait que les consommateurs KPI/dashboard, qui sont DÉJÀ repointés sur le grand livre (fn_dashboard_kpis / v_trial_balance) et donc morts. Le consommateur RESTANT et VIVANT est l'écran Mouvements bancaires (listBankAccounts → useBankAccounts → useMouvementsBancairesPage), qui a un besoin légitime : afficher l'IBAN et le solde de chaque compte banque. La recréation est donc justifiée MAIS exige deux actions de cohérence avant migration 0036 : retirer 'v_account_balances' de la liste « vues mortes » du gate_0035.sql (sinon le gate cassera), et idéalement déplacer le check de présence vers la nouvelle migration.

PIÈGES SQL. (1) bank_movements.account_id est NN et FK accounts(id) → le LEFT JOIN LATERAL sur sum() renvoie NULL si aucun mouvement, d'où le coalesce(...,0) (un compte fraîchement créé doit afficher movements_total=0 et computed_balance=initial_balance, pas NULL). (2) bank_movements n'a PAS de created_at ni de filtre de période ici : le solde bancaire est cumulatif toutes périodes (un relevé ne se « clôt » pas comme une période comptable) — ne pas joindre accounting_periods. (3) Filtre comptes : la logique legacy distinguait 512x (courant, mais NOT LIKE 5121x) vs 502x/5121x (travaux) ; ici on EXPOSE les trois familles et on laisse le front trier (il fait déjà code.startsWith('512')), donc le WHERE inclut 512%, 502% ET 5121%. Ajouter account_type='asset' et is_active=true pour ne pas remonter de comptes de classe 5 non-trésorerie ou désactivés.

DIVERGENCES legacy↔cible (déjà absorbées). En cible, les métadonnées bancaires (iban/bic/bank_name/initial_balance) vivent DÉSORMAIS sur accounts (0012) — c'est exactement ce qui rend le RESHAPE possible sans table dédiée. Aucune dépendance aux objets droppés : pas de lots.tantiemes_*, pas de suppliers, pas de parent_id. Le consommateur déclare aussi un champ banque (interface l.1461) jamais affiché aujourd'hui par l'écran (il ne lit que name/iban/initial_balance), mais on l'expose quand même via accounts.bank_name pour honorer le contrat TypeScript sans casse de type.

### v_finance_integrity_issues — USE-RPC

- **Rôle** : Tableau de bord des anomalies de cohérence financiere d'une copro : liste, une ligne par probleme, tous les ecarts comptables detectes (grand livre desequilibre, creance sans lot, ecart releve/grand livre, total d'appel incoherent) pour que le gestionnaire les corrige avant cloture.
- **Règle de calcul** : C'est un filet de controle « detection d'abord, jamais d'auto-correction » : il retourne 0 ligne quand la copro est saine, sinon 1 ligne par anomalie. Dans le NOUVEAU schema (RPC 0028) il agrege 4 controles, tous 100 % derives du grand livre : (1) LEDGER_UNBALANCED = une ecriture postee dont la somme des debits differe de la somme des credits de plus de 0,01 (viole la partie double) ; (2) LOT_ID_MISSING_45X = une ligne d'ecriture postee sur un compte 45x (creance copro) qui n'a pas de lot_id (viole la regle lot-centric) ; (3) LOT_GL_MISMATCH = pour un lot, ecart entre son releve d'appels (Somme amount_due - amount_paid) et son solde grand livre restreint aux appels+paiements (via v_lot_vs_gl_mismatch) ; (4) CALL_TOTAL_MISMATCH = un appel de fonds (hors brouillon/annule) dont total_amount differe de la somme des amount_due de ses lignes. L'ANCIENNE vue testait 8 choses centrees sur tables (totaux factures fournisseurs, sur-allocation/sous-allocation de paiements, sur-paiement de factures, source_id manquant, chapeau 450 mouvemente) ; la cible a recentre la detection sur le grand livre comme source unique de verite.
- **Tables sources** : ledger_transactions, ledger_entries, accounts, call_for_funds, call_for_funds_lines, v_lot_vs_gl_mismatch
- **Colonnes exposées** :

| Colonne | Description |
|---|---|
| entity_type | Nature de l'objet en faute : 'ledger_transaction', 'ledger_entry', 'lot' ou 'call_for_funds'. |
| entity_id | Identifiant (uuid) de l'objet en faute. |
| copro_id | Copro concernee (sert au filtre cote front). |
| issue_type | Code de l'anomalie : LEDGER_UNBALANCED, LOT_ID_MISSING_45X, LOT_GL_MISMATCH ou CALL_TOTAL_MISMATCH. |
| description | Phrase lisible decrivant le probleme (libelle de la transaction, code compte, ref du lot, libelle de l'appel). |
| expected_amount | Montant attendu si la coherence etait respectee (ex. Somme debits, solde GL, total appel). |
| actual_amount | Montant reellement constate (ex. Somme credits, solde releve, Somme des lignes). |
| difference | Ecart attendu - constate ; ce qui reste a justifier. |

- **Consommateurs** :
  - src/features/finance/diagnostic/useFinanceDiagnostic.ts:64 (lit .from('v_finance_integrity_issues') — CASSE, vue droppee)
  - src/features/finance/diagnostic/helpers.ts (libelles FR des issue_type/entity_type)
  - src/app/(dashboard)/finance/diagnostic/page.tsx (ecran Diagnostic — Coherence financiere)
  - src/lib/onboarding/api.ts:973 (auditOnboardingBooks — appelle DEJA correctement la RPC audit_finance_integrity)
- **Ancienne définition** : Co-Pro-Flex/supabase/migrations_legacy/20260126_fix_finance_invariants_and_rls.sql (CREATE VIEW initial, 4 branches l.170-243) ; étendue à 8 branches dans 20260602160000_v1_0_finance_integrity_source_id_chapeau450.sql (l.12-122) ; la RPC homonyme audit_finance_integrity a été transformée en simple wrapper lecture-seule de cette vue dans 20260602094000_v0_consolidate_audit_finance_integrity.sql.
- **Statut SQL** : (pas de SQL proposé — objet remplacé par une RPC)
- **Remplacement** : RPC `public.audit_finance_integrity(p_copro_id uuid default null)` — definie dans Co-Pro-Flex/supabase/migrations/0028_derives_vues_annexes.sql l.657-758, RETURNS TABLE(entity_type text, entity_id uuid, copro_id uuid, issue_type text, description text, expected_amount numeric, actual_amount numeric, difference numeric). C'est EXACTEMENT la forme de ligne que lit l'ecran (entity_type, entity_id, issue_type, description, expected_amount, actual_amount, difference) -> aucun remaniement de colonnes cote front, juste le mode d'appel.

  MIGRATION DU CODE : dans useFinanceDiagnostic.ts, remplacer
  `supabase.from('v_finance_integrity_issues').select('*').eq('copro_id', currentCoproId)`
  par
  `supabase.rpc('audit_finance_integrity', { p_copro_id: currentCoproId })`
  (le filtre copro est fait par l'argument p_copro_id, supprimer le .eq ; le typage devient Database['public']['Functions']['audit_finance_integrity']['Returns'][number] au lieu de Views[...]['Row']).

  PRECAUTIONS COTE FRONT (sinon affichage partiel silencieux) :
  1. helpers.ts ISSUE_TYPE_LABELS : les codes ont change. Ajouter LEDGER_UNBALANCED ('Grand livre desequilibre'), LOT_ID_MISSING_45X ('Creance 45x sans lot'), LOT_GL_MISMATCH ('Releve != Grand Livre'), CALL_TOTAL_MISMATCH ('Total appel != lignes'). Les anciens codes (TOTAL_MISMATCH, OVER_ALLOCATED, UNDER_ALLOCATED, OVER_PAID, CALL_VS_BUDGET_MISMATCH, SOURCE_ID_MISSING, CHAPEAU_450_POSTED) ne seront plus jamais emis -> les garder en fallback ne nuit pas mais peut etre nettoye.
  2. helpers.ts ENTITY_TYPE_LABELS : la RPC emet 'ledger_entry' (nouveau) en plus de 'ledger_transaction', 'lot', 'call_for_funds'. Ajouter 'ledger_entry': 'Ligne d'ecriture'. Les valeurs 'supplier_invoice', 'payment', 'budget', 'account' ne sont plus emises.
  3. La RPC est SECURITY DEFINER et applique deja user_has_copro_access(p_copro_id) -> pas besoin de RLS sur la vue ; l'erreur 42501 remonte si la copro n'est pas accessible (a mapper en message FR).

  NB : aucune migration 0036 a creer pour cet objet — la RPC existe deja et le consumer onboarding la branche correctement. Seul reste a corriger le hook diagnostic (.from -> .rpc).

- **Notes** : PIEGE PRINCIPAL — ce n'est PAS une vue : l'objet n'existe plus en base, l'equivalent canonique est la RPC audit_finance_integrity. Ne PAS recreer la vue (cela ferait coexister deux patterns et l'auto-fix de l'ancienne RPC mutait silencieusement total_amount des brouillons, ce qui a justement ete supprime — voir le commentaire de 20260602094000).

  DIVERGENCE LEGACY -> CIBLE (important pour ne pas promettre des controles disparus) : la legacy detectait 8 anomalies dont 4 reposent sur des objets DROPPES ou hors-perimetre (totaux factures fournisseurs via supplier_invoice_lines, sur/sous-allocation de paiements, sur-paiement fournisseur via supplier_payments, source_id manquant, chapeau 450). La RPC cible n'en garde que 4, toutes derivees du grand livre. Concretement : la sur-allocation de paiement, le sur-paiement de facture, le total de facture fournisseur != lignes, le source_id NULL et le chapeau 450 mouvemente NE SONT PLUS surveilles par cet ecran. Si le besoin metier subsiste (notamment l'invariant facture fournisseur total = Somme lignes), il faudra l'ajouter dans la RPC ou un nouveau controle — a trancher avec USER, hors scope de cette fiche.

  LEGACY referencait suppliers/supplier_id/supplier_invoice_lines.amount/created_at et v_call_vs_budget_mismatch (vue elle-meme legacy, absente du nouveau schema) -> ne JAMAIS reintroduire ces dependances.

  Note schema : ledger_transactions n'a PAS de created_at (la legacy l'exposait via lt.created_at pour SOURCE_ID_MISSING) — la RPC cible ne renvoie d'ailleurs aucune date, c'est coherent.

  ETAT ECRAN : l'ecran finance/diagnostic et l'usage onboarding sont VIVANTS (atlas MATRICE-LIAISON l.36 : audit_finance_integrity = GARDER, contexte onboarding/[id]). Ne pas supprimer. Le seul consumer casse est le hook diagnostic (lit la vue fantome) ; auditOnboardingBooks appelle deja la RPC correctement -> reutiliser ce pattern.

  CETTE RPC EST LA CLE DE VALIDATION DE LA BOUCLE D'OR (0029) : 0 ligne = copro conforme. Tout changement de sa signature ou de ses controles impacte les tests d'acceptation finance.

## 2. Renommages de colonnes & tables

> Champs de l'ancien schéma (`migrations_legacy/`, contre lequel le code app a été écrit) renommés ou supprimés dans la base cible `0001→0035` (devenue autoritaire le 2026-06-07). Chaque ligne est confirmée dans le fichier de migration indiqué et grepée dans le code réel. Les références TS dans `src/types/supabase.ts` (types générés contre l'ancien schéma) sont à régénérer en bloc et ne sont pas listées ligne à ligne.

| Ancien (legacy) | Nouveau (cible) | Table / Objet | Fichiers code impactés (file:line) | Note |
|---|---|---|---|---|
| `suppliers` (table) | `tiers` (`is_supplier = true`) | table `suppliers` → `tiers` | `lib/finance/api.ts:483` (`.from('suppliers')`), `:1506` (embed `suppliers(name)`) ; `features/finance/invoices/useFacturesPage.ts:421,497` | **Fusion de table** (0015 `tiers`). Les fournisseurs sont désormais des `tiers` filtrés par le flag `is_supplier`. L'embed `suppliers(name)` devient `tiers(name)`. La table `suppliers` n'existe plus → tout `.from('suppliers')` plante. |
| `supplier_invoices.supplier_id` | `supplier_invoices.tiers_id` | colonne (`tiers_id` **NOT NULL**) | `lib/finance/api.ts:98,499,522,538` (INSERT), `:1492,1506` (type + SELECT) ; `features/finance/invoices/useFacturesPage.ts:434,504` ; `features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts:248` ; `.../domain/types.ts:194`, `.../matching-engine.ts:94` | Renommage simple `supplier_id` → `tiers_id` (0021 l.250). Passe de nullable à **NOT NULL** (FK `on delete restrict`) : un INSERT sans tiers est désormais rejeté. |
| `budget_expenses.fournisseur` | `budget_expenses.tiers_id` | colonne (**texte → uuid**) | `lib/budget/api.ts:84,523,563` (type + INSERT + UPDATE) ; `hooks/modules/useBudget.ts:104,706,715` | **Changement de FORME** (0016 l.93). L'ancienne colonne `fournisseur` était un **texte libre** (nom du fournisseur) ; la cible est `tiers_id uuid` (FK `tiers`, `on delete set null`). Migration de données requise : résoudre le texte en `tiers.id` (création du tiers à la volée si absent), pas un simple find/replace. |
| `accounts.banque` | `accounts.bank_name` | colonne | `lib/onboarding/api.ts:225` (INSERT), `:254` (type SELECT) ; `lib/finance/api.ts:1461` (propriété exposée `BankAccountWithBalance.banque`) | Renommage simple (0012 l.19). Touche l'onboarding (création de compte bancaire) en écriture ET le type de lecture exposé au front. |
| `bank_movements.account_code` + `bank_movements.account_category` | `bank_movements.account_id` | 2 colonnes texte → **1 colonne uuid** | `lib/finance/api.ts:127,128,680,681,690,691` (types + INSERT) ; `features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts:139,140,141,599,600` | **Changement de FORME + dénormalisation supprimée** (0014 l.59,71). Deux champs dénormalisés (`account_code` texte du compte, `account_category` libellé de catégorie) remplacés par une seule FK `account_id uuid` (`on delete restrict`). La catégorisation bancaire (routage compteCourant/Travaux) doit passer par le compte lié, plus par un libellé. |
| `alur_transfers.alur_budget_id` | `alur_transfers.budget_id` | colonne | `hooks/modules/useALURData.ts:289` (INSERT) | Renommage simple (0016 l.345). FK `budgets`, `on delete set null`. |
| `alur_transfers.description` | `alur_transfers.notes` | colonne | `hooks/modules/useALURData.ts:293` (INSERT) ; lecture historique (`v_alur_transfers_history`) | Renommage simple (0016 l.350). Le front lit/écrit `description` ; la cible expose `notes`. |
| `alur_transfers.destination_budget_id` | *(supprimée)* | colonne droppée | `hooks/modules/useALURData.ts:222` (lecture), `:292` (INSERT) | **Colonne supprimée** (absente de 0016) : l'affectation ALUR se modélise désormais par le couple `budget_id` + enum `destination`. L'INSERT de cette colonne plante ; la lecture renvoie toujours `undefined`. À retirer. |
| `lots.tantiemes_generaux` / `tantiemes_ascenseur` / `tantiemes_chauffage` / `tantiemes_escalier` | `repartition_key_lines.weight` | colonnes droppées → table de poids | `lib/lots/api.ts:39-42,62-65,75-78,150,202-207,556,568,573` ; `lib/owners/api.ts:91-93` ; `hooks/modules/useBudget.ts:199` ; `hooks/modules/useALURData.ts:182` | **Changement de modèle** (0008 : les 4 `tantiemes_*` sont DROPPÉES de `lots`). La quote-part vit désormais dans `repartition_key_lines.weight numeric(12,4)`, une ligne par (clé × lot) (0009 l.28). Source unique des quotes-parts. `lib/lots/api.ts` écrit déjà partiellement via `weight` (l.233+, `upsertRepartitionKeyLine`) — migration à finir. Le `tantiemes_generaux` = `weight` de la clé générale active. |
| `copros.total_tantiemes` | *(supprimée)* — Σ `repartition_key_lines.weight` (clé générale active) | colonne droppée | `lib/lots/api.ts:678,688` (SELECT + fallback `10000`) ; `lib/owners/api.ts:43` | **Compteur mort supprimé** (0007 : `total_tantiemes` absente). À dériver en sommant les `weight` de la clé de répartition générale active de la copro. |
| `copros.buildings_count` | *(supprimée)* — `count(buildings)` | colonne droppée | `lib/onboarding/api.ts:13,28` (type + INSERT) ; `components/features/onboarding/steps/Step1Copropriete.tsx:79` ; `hooks/modules/useLogbook.ts:295,489` | **Compteur mort supprimé** (0007). L'onboarding échoue dès le 1er INSERT car il pousse `buildings_count`. À retirer de l'INSERT ; le nombre de bâtiments se compte sur la table `buildings`. |
| `lots.owner_id` | `lot_owners` (relation N×N historisée) | colonne **jamais existée** → table dédiée | `hooks/modules/useALURData.ts:183` (lecture `row.owner_id`) ; `lib/finance/api.ts:1050` ; `lib/impayes/api.ts:25,53,98,276` ; edge relance manuelle | **N'a jamais existé sur `lots`** (ni legacy ni cible). Le propriétaire d'un lot se résout via `lot_owners` (0010) : ligne active `where end_date is null and is_primary`. Modèle lot-centric historisé (un lot peut avoir plusieurs propriétaires dans le temps). Toute référence `lot.owner_id` est cassée par construction. |

### Notes transverses

- **`src/types/supabase.ts`** : ce fichier de types générés porte l'ancien schéma (occurrences de `supplier_id`, `banque`, etc. aux lignes 134, 7966+, 9091+, 13804+, 15541+, 16690…). À **régénérer** contre la base cible une fois les vues recréées, plutôt que patcher à la main.
- **Faux positifs écartés** (hors périmètre schéma finance) : les nombreuses occurrences de `fournisseur` et `tantiemes_*` dans `lib/mock-data/`, `types/legacy.ts`, le domaine **maintenance** (contrats/prestataires — champ TS local, pas une colonne `budget_expenses`), le domaine **AG** (`tantiemes_for/against`, `total_tantiemes` issus de vues AG) et **ventes** (`seller_owner_id`/`buyer_owner_id` = colonnes réelles de `mutations`) ne relèvent **pas** de ces renommages et ne sont pas à toucher dans ce lot.

Fichier audit source : `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\.planning\AUDIT_DRIFT_FINANCE.md`. Migrations confirmant chaque ligne : `0007_copros_buildings.sql`, `0008_lots.sql`, `0009_repartition_keys.sql`, `0010_coproprietaires_lot_owners.sql`, `0012_accounts.sql`, `0014_finance_periph.sql`, `0015_tiers.sql`, `0016_budgets_appels.sql`, `0021_maintenance.sql` (tous sous `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\`).

## 3. Valeurs d'enum purgées (codées en dur dans le front)

> Le code applicatif a été écrit contre l'ancien schéma (`migrations_legacy/`). La base cible `0001→0035` a **rationalisé les enums** : certaines valeurs référencées en dur dans le front **n'existent plus**. Tout `insert`/`update`/filtre `.eq`/`.in` qui les envoie **plante à l'exécution** (Postgres rejette une étiquette d'enum invalide). Enums vérifiés dans `supabase/migrations/0002_enums_finance.sql` et `0003_enums_domaines.sql`.

| Valeur codée (invalide) | Valeur cible valide | Type enum | Valeurs valides de l'enum | Fichiers impactés (file:line) |
|---|---|---|---|---|
| `'bank_transfer'` | `'transfer'` | `payment_method` (0002 l.32) | `cash`, `check`, `transfer`, `card`, `direct_debit`, `other` | `src/features/finance/appels-fonds/components/PaymentModal.tsx:10` (type local), `:13` (libellé map), `:57` (`useState` défaut) — aussi `src/types/supabase.ts:17191,17685` (types générés à régénérer) |
| `'pending_approval'` | `'submitted'` | `budget_status` (0002 l.45) | `draft`, `submitted`, `validated`, `rejected`, `closed` | `src/lib/budget/api.ts:26` (type `DbBudgetStatus`), `:105` (map `BudgetStatut.EN_ATTENTE_APPROBATION → 'pending_approval'`), `:113` (map inverse) — aussi `src/types/supabase.ts:17010,17483` |
| `'locked'` / `'rejected'` | (purger : `open` \| `closed` \| `approved`) | `period_status` (0002 l.29) | `open`, `closed`, `approved` | `src/lib/finance/api.ts:158` (type avec `locked`+`rejected`), `:878` (`rejectPeriod` fait `update status:'rejected'` → **plante**, fonction à supprimer/remodéliser) ; `src/lib/finance/accounting-period.ts:17,279` (type avec `locked`) ; consommateurs : `src/features/finance/comptabilite/hooks/useComptabilitePage.ts:138,143,145`, `src/components/features/finance/Comptabilite/types.ts:74` + `ComptaHeader.tsx:34`, `src/features/ag/finalisation/components/BlocSimple.tsx:134,173` (appelle `rejectPeriod`). **NB : les `'locked'` du workflow AG (`ag-workflow.ts:49`, `useAGWorkflow.ts`, `RelanceStepper`, Stepper) sont des états UI internes, PAS l'enum `period_status` → ne pas toucher.** |
| `'pending'` / `'validated'` / `'approved'` | `draft` \| `posted` \| `paid` \| `cancelled` | `supplier_invoice_status` (0002 l.51) | `draft`, `posted`, `paid`, `cancelled` | `src/lib/finance/api.ts:1508` (filtre `.in('status', ['pending','validated','approved'])` dans `listPendingInvoices` → aucune ligne / erreur ; cible `['draft','posted']`). NB : le type `SupplierInvoiceOverview` l.105/582 contient `'approved'` (invalide) — purger au passage |
| `'validated'` | `'recorded'` | `payment_status` (0002 l.34) | `recorded`, `reconciled`, `reversed` | `src/lib/finance/api.ts:1539` (filtre `.eq('status', 'validated')` dans `listUnmatchedPayments` → renvoie vide en permanence) |
| `'awaiting_invoice'` | `'called'` | `payment_phase_status` (0002 l.56) | `pending`, `called`, `paid`, `overdue` | `src/lib/budget/payment-schedules.api.ts:29` (type) ; `src/components/features/finance/Budget/types.ts:317` (type) ; `src/components/features/finance/Budget/modals/TravauxDetailModal.tsx:55` (libellé), `:63` (couleur), `:305` (rendu) — aussi `src/types/supabase.ts:17197,17692` |
| `'compte_courant'` / `'budget_travaux'` | `'operating'` / `'works'` | `transfer_destination` (0002 l.54) | `works`, `reserve`, `operating`, `other` | `src/hooks/modules/useALURData.ts:45,54,221` (types + cast) ; `src/features/finance/fonds-alur/hooks/useFondsALURPage.ts:60` (signature) ; `src/features/finance/fonds-alur/components/TransferModal.tsx:10,16,35,91,95,96,97,105,109,110,111,122` (état + `value=` des radios + défaut + branchements) — aussi `src/types/supabase.ts:17312,17816` |
| `'admin'` | `'gestionnaire'` | `membership_role` (0003 l.17) | `gestionnaire`, `coproprietaire`, `platform_admin` | `src/lib/onboarding/api.ts:45` (`role: 'admin'` à l'`insert` d'onboarding → **plante dès le 1er INSERT**) |

**Notes transverses :**
- `src/types/supabase.ts` (types générés par Supabase) porte encore plusieurs de ces valeurs mortes (`bank_transfer`, `pending_approval`, `awaiting_invoice`, `compte_courant`/`budget_travaux`) : il doit être **régénéré** après alignement du schéma, ne pas l'éditer à la main.
- Le `'rejected'` de `budget_status`/`expense_status`/`resolution_status`/`council_decision_status` reste **valide** dans leurs enums respectifs (0002 l.45, l.40 ; 0003 l.61, l.76) — seul `period_status` ne connaît pas `rejected`. Idem `'pending'`/`'validated'` qui restent valides ailleurs (`expense_status`, `reminder_status`…) : la purge ne vise que les couples (valeur × type enum) listés ci-dessus.

## 4. RPC / fonctions changées

> Section dérivée de `.planning/AUDIT_DRIFT_FINANCE.md` et des signatures **réellement gravées** dans `supabase/migrations/0026_rpc_appels_paiements.sql`, `0027_periodes_affectation.sql`, `0028_derives_vues_annexes.sql`. Chaque signature ci-dessous est l'ordre exact des arguments tel que défini dans la migration (c'est l'ordre qui fait foi pour un appel positionnel ; en `.rpc()` Supabase on passe un objet nommé, donc seuls les **noms** comptent).

### 1. `post_call_for_funds` → ABANDONNÉE, remplacer par `post_budget_call_for_funds`

| Champ | Détail |
|---|---|
| **Nom cible** | `post_budget_call_for_funds` (la mono-clé `post_call_for_funds` n'existe plus — explicitement listée « OBJET ABANDONNÉ — NE JAMAIS CRÉER » en `0026` l.65-67) |
| **Signature exacte (10 args)** | `(p_copro_id uuid, p_period_id uuid, p_budget_id uuid, p_label text, p_trimester integer, p_issue_date date, p_due_date date, p_fraction numeric default 1.0, p_installment_index integer default null, p_installment_count integer default null)` → `jsonb` (`0026` l.418-429). `p_budget_id` est **obligatoire** (RAISE si NULL, l.464-467). |
| **Ce que le code appelle aujourd'hui (faux)** | `rpc('post_call_for_funds', { p_copro_id, p_period_id, p_budget_id, p_repartition_key_id, p_label, p_trimester, p_issue_date, p_due_date, p_total_amount, p_description })`. Trois args qui n'existent pas dans la cible : `p_repartition_key_id`, `p_total_amount`, `p_description`. Pas de `p_fraction`/`p_installment_*`. La fonction appelée n'existe plus du tout → plantage à l'exécution. |
| **Fichiers (file:line)** | `src/lib/finance/api.ts:342` (appel `rpc`), args l.343-352 ; commentaire trompeur l.337-341. Type fantôme dans `src/types/supabase.ts:16628` (`post_call_for_funds`) à supprimer, le bon type est `src/types/supabase.ts:16599` (`post_budget_call_for_funds`). |
| **Action** | Rebrancher `createCall` sur `post_budget_call_for_funds`. Retirer `p_repartition_key_id`, `p_total_amount`, `p_description`. Rendre `p_budget_id` obligatoire. La ventilation par clé n'est plus passée en argument : la RPC la dérive elle-même des `budget_lines` du budget (l.493-523). Pour un appel partiel, utiliser `p_fraction` ou le couple `p_installment_index`/`p_installment_count` au lieu d'un montant total saisi. Le retour reste `{ success, call_id, ledger_tx_id, total_amount, nb_lines, nature }` (l.604-607), la lecture actuelle de `success/call_id/ledger_tx_id` (l.359-362) reste valable. |

### 2. `post_supplier_invoice` — args renommés `p_supplier_id→p_tiers_id`, `p_related_service_order_id→p_service_order_id`

| Champ | Détail |
|---|---|
| **Nom cible** | `post_supplier_invoice` (nom inchangé) |
| **Signature exacte (14 args)** | `(p_copro_id uuid, p_period_id uuid, p_tiers_id uuid, p_invoice_number text, p_invoice_date date, p_due_date date, p_label text, p_lines jsonb, p_document_id uuid default null, p_service_order_id uuid default null, p_post_immediately boolean default true, p_montant_ht numeric default null, p_montant_tva numeric default null, p_taux_tva numeric default null)` → `jsonb` (`0026` l.751-766). |
| **Ce que le code appelle aujourd'hui (faux)** | L'edge passe `p_supplier_id` (ancien nom) et `p_related_service_order_id` (ancien nom). Ces deux noms d'arguments n'existent pas dans la signature cible → l'appel `rpc` échoue (« function ... does not exist » faute de correspondance d'arguments nommés). |
| **Fichiers (file:line)** | `supabase/functions/create_supplier_invoice/index.ts:70` (appel), `:73` (`p_supplier_id`), `:80` (`p_related_service_order_id`). Type fantôme : `src/types/supabase.ts:16689-16690` (`p_related_service_order_id` / `p_supplier_id`). Edge invoquée depuis `src/lib/finance/api.ts:515`. |
| **Action** | Dans l'edge : `p_supplier_id` → `p_tiers_id`, `p_related_service_order_id` → `p_service_order_id`. La fusion `suppliers→tiers` (flag `is_supplier`) implique que la valeur passée est désormais un `tiers.id`. Régénérer `src/types/supabase.ts`. (Atlas R6 : passer par l'edge — écriture GL D 6xx/C 401 — et non par un UPDATE direct.) |

### 3. `get_owner_statement` — retirer `p_date_from` / `p_date_to`

| Champ | Détail |
|---|---|
| **Nom cible** | `get_owner_statement` (nom inchangé) |
| **Signature exacte (4 args)** | `(p_copro_id uuid, p_owner_id uuid, p_period_id uuid default null, p_lot_id uuid default null)` → `jsonb` (`0028` l.382-387). Le périmètre temporel passe par `p_period_id`, pas par des bornes de dates. |
| **Ce que le code appelle aujourd'hui (faux)** | L'edge passe en plus `p_date_from` et `p_date_to`, qui n'existent plus dans la signature cible → l'appel `rpc` échoue. |
| **Fichiers (file:line)** | `supabase/functions/generate_owner_statement/index.ts:260` (appel), `:264` (`p_date_from`), `:265` (`p_date_to`). Type fantôme : `src/types/supabase.ts:16493-16494`. |
| **Action** | Retirer les deux lignes `p_date_from`/`p_date_to` de l'appel edge. Garder `p_copro_id`, `p_owner_id`, `p_period_id`, `p_lot_id`. Régénérer les types. |

### 4. `fn_annexe_2` / `fn_annexe_3` — retirer `p_next_period_id`

| Champ | Détail |
|---|---|
| **Nom cible** | `fn_annexe_2` et `fn_annexe_3` (noms inchangés) |
| **Signature exacte (2 args chacune)** | `fn_annexe_2(p_copro_id uuid, p_period_id uuid)` → `jsonb` (`0028` l.919) ; `fn_annexe_3(p_copro_id uuid, p_period_id uuid)` → `jsonb` (`0028` l.1004). Aucun troisième argument. |
| **Ce que le code appelle aujourd'hui (faux)** | Les deux appels passent un `p_next_period_id` qui n'existe pas dans la signature cible → l'appel `rpc` échoue. À noter dans `useConvocationAccountingData.ts` : `p_next_period_id` reçoit même la valeur de `periodId` (et non d'une période suivante), donc l'argument est doublement faux (inexistant **et** mal renseigné). |
| **Fichiers (file:line)** | `src/features/ag/convocation/hooks/useConvocationAccountingData.ts:95` (`fn_annexe_2`, `p_next_period_id: periodId`) et `:96` (`fn_annexe_3`, idem). `src/hooks/modules/useAnnexeData.ts:71` (`params.p_next_period_id = nextPeriodId`, ajouté conditionnellement pour les annexes 2 et 3, l.69-72). Types fantômes : `src/types/supabase.ts:16372` et `:16380`. |
| **Action** | Supprimer l'argument `p_next_period_id` des deux appels dans `useConvocationAccountingData.ts`. Dans `useAnnexeData.ts`, retirer le bloc conditionnel l.69-72 (le paramètre `nextPeriodId` devient inutile pour ces annexes). Régénérer les types. |

### 5. `close_period` — retour `jsonb { success }`, tester `data?.success` (et non `data === true`)

| Champ | Détail |
|---|---|
| **Nom cible** | `close_period` (nom inchangé) |
| **Signature exacte (1 arg)** | `(p_period_id uuid)` → **`jsonb`** (`0027` l.77-78). Retour réel : `jsonb_build_object('success', true, 'period_id', ..., 'status', 'closed')` (l.106). Ce n'est pas un booléen. |
| **Ce que le code appelle aujourd'hui (faux)** | L'appel teste `if (data !== true)` et renvoie l'échec si le retour n'est pas le booléen `true`. Comme la RPC renvoie un objet `{ success: true, ... }` (jamais `=== true`), **un succès est systématiquement interprété comme un échec** (dégradation silencieuse). Le type fantôme `close_period: { Args: { p_period_id }; Returns: boolean }` (`src/types/supabase.ts:16188`) entérine la mauvaise hypothèse. |
| **Fichiers (file:line)** | `src/lib/finance/api.ts:809` (appel), test faux `if (data !== true)` l.817. Type fantôme : `src/types/supabase.ts:16188`. |
| **Action** | Remplacer le test par `data?.success === true`. Typer le retour comme `{ success: boolean; period_id?: string; status?: string }` et corriger le type généré. Même schéma de retour `jsonb {success}` pour les fonctions sœurs `approve_period`, `reopen_period`, `regularize_period`, `open_next_period` — vérifier leurs appelants éventuels avec la même logique. |

### 6. `audit_finance_integrity` — RPC à appeler au lieu de lire la vue `v_finance_integrity_issues`

| Champ | Détail |
|---|---|
| **Nom cible** | `audit_finance_integrity` (RPC) ; la vue `v_finance_integrity_issues` n'existe plus dans le schéma cible |
| **Signature exacte (1 arg, optionnel)** | `(p_copro_id uuid default null)` → `returns table (entity_type text, entity_id uuid, copro_id uuid, issue_type text, description text, expected_amount numeric, actual_amount numeric, difference numeric)` (`0028` l.657-667). `p_copro_id` NULL = toutes les copros visibles. |
| **Ce que le code appelle aujourd'hui (faux)** | L'écran diagnostic lit la vue `v_finance_integrity_issues` via `.from('v_finance_integrity_issues').select('*').eq('copro_id', ...)`. Cette vue n'existe pas dans la base cible → la requête échoue. (À l'inverse, l'onboarding appelle DÉJÀ correctement la RPC : `rpc('audit_finance_integrity', { p_copro_id })` — c'est le modèle à reprendre.) |
| **Fichiers (file:line)** | Faux : `src/features/finance/diagnostic/useFinanceDiagnostic.ts:64` (`.from('v_finance_integrity_issues')`), filtre `copro_id` l.66 ; type lié l.13, libellés `src/features/finance/diagnostic/helpers.ts:4`. Type fantôme de la vue : `src/types/supabase.ts:13570`. Modèle correct existant : `src/lib/onboarding/api.ts:973` (`rpc('audit_finance_integrity', { p_copro_id: coproId })`). Type RPC correct : `src/types/supabase.ts:16092`. |
| **Action** | Remplacer dans `useFinanceDiagnostic.ts` le `.from('v_finance_integrity_issues')` par `rpc('audit_finance_integrity', { p_copro_id: currentCoproId })`. Adapter les noms de colonnes du `Row` aux colonnes retournées par la RPC (`entity_type`, `entity_id`, `issue_type`, `description`, `expected_amount`, `actual_amount`, `difference`). Supprimer le type de vue généré. |

### 7. `set_opening_balance` — reprise via cette RPC (`source_type='opening_onboarding'`) au lieu de `create_ledger_transaction` direct

| Champ | Détail |
|---|---|
| **Nom cible** | `set_opening_balance` (route canonique de la reprise de mandat) |
| **Signature exacte (4 args)** | `(p_copro_id uuid, p_period_id uuid, p_as_of_date date, p_lines jsonb)` → `jsonb` (`0027` l.692-697). `p_lines = [{ account_code, nature?, lot_id?, amount (signé : débit +, crédit −) }, …]`. La RPC pose **une** écriture équilibrée `source_type='opening_onboarding'`, gère elle-même le résidu 471/472 non bloquant et l'idempotence par remplacement (l.745-747, l.800-811). |
| **Ce que le code appelle aujourd'hui (faux)** | `postOnboardingOpeningBalances` reconstruit les écritures à la main et appelle `create_ledger_transaction` avec `p_source_type: 'opening_balance'`. Deux divergences : (a) `'opening_balance'` est le `source_type` réservé aux **à-nouveaux d'exercice** (`open_next_period`, `0027` l.653), PAS à la reprise de mandat → la reprise est posée sous le mauvais marqueur ; (b) le contrôle d'idempotence (l.748) et la relecture (`get_opening_balance`, l.866) filtrent sur `'opening_onboarding'` → **la reprise postée en `'opening_balance'` est invisible** pour ces lectures (snapshot/résidu 471/472 jamais retrouvé). |
| **Fichiers (file:line)** | Faux : `src/lib/onboarding/api.ts:811` (`rpc('create_ledger_transaction', …)`), `:816` (`p_source_type: 'opening_balance'`), check idempotence sur le mauvais marqueur `:748`. Marqueur correct attendu côté lectures : `:352`, `:866-867` (`'opening_onboarding'`) et `src/lib/onboarding/reprise-alert.ts:31`. Miroir TS déjà aligné sur `get_opening_balance` : `src/components/features/onboarding/reprise/useRepriseSoldes.ts:95`. |
| **Action** | Remplacer le corps de `postOnboardingOpeningBalances` par un appel `rpc('set_opening_balance', { p_copro_id, p_period_id, p_as_of_date, p_lines })` en passant les lignes au format `{ account_code, nature, lot_id, amount }` (montant signé). Supprimer la construction manuelle des écritures et la résolution 450-x / 471 / 472 (l.757-808) : la RPC s'en charge. Aligner le check d'idempotence l.748 sur `source_type='opening_onboarding'` (ou le retirer, la RPC étant idempotente par remplacement). |

---

**Note transverse** : les sept entrées impliquent une **régénération de `src/types/supabase.ts`** (types `Functions`/`Views` générés depuis l'ancien schéma) — sinon TypeScript continuera de valider les mauvais noms d'arguments. Fichiers de types fantômes recensés : `:13570` (vue intégrité), `:16188` (`close_period` typé `boolean`), `:16369-16380` (annexes avec `p_next_period_id`), `:16490-16494` (`get_owner_statement` avec dates), `:16628` (`post_call_for_funds`), `:16676-16690` (`post_supplier_invoice` avec anciens noms).

## 5. Tables & colonnes supprimées — où va la donnée

> Le code applicatif a été écrit contre l'ancien schéma (`migrations_legacy/`). La base cible `0001→0035` a supprimé, fusionné ou dérivé plusieurs objets finance. Ce tableau dit, pour chaque objet disparu, **où la donnée vit désormais** et **la migration qui fait foi**. Vérifié ligne à ligne dans `supabase/migrations/`.

| Objet legacy | Statut | Remplacement / où vit la donnée désormais | Migration de référence |
|---|---|---|---|
| **Table `suppliers`** | Fusionnée | Disparue (aucun `create table public.suppliers` dans tout le repo). Les fournisseurs sont des lignes de la table **`tiers`** avec le drapeau **`is_supplier = true`**. Le pivot `tiers` réunit fournisseurs, prestataires et notaires (`is_supplier` / `is_provider` / `is_notary`) avec une contrainte garantissant qu'au moins un rôle est coché. Le lien depuis les factures passe par `supplier_invoices.tiers_id` (NOT NULL → `tiers`), plus par un `supplier_id`. | `0015_tiers.sql` (table `tiers`, drapeau `is_supplier`) ; `0021_maintenance.sql` (`supplier_invoices.tiers_id`) |
| **`lots.tantiemes_*`** (les 4 colonnes de quote-part) | Supprimées | La table `lots` ne stocke plus aucun tantième (entête du fichier : « DROP des 4 tantiemes_* — la quote-part vit dans repartition_key_lines »). La quote-part de chaque lot vit dans **`repartition_key_lines.weight`** (poids du lot pour une clé de répartition donnée). Source unique des quotes-parts. | `0008_lots.sql` (suppression) ; `0009_repartition_keys.sql` (`repartition_key_lines.weight`) |
| **`copros.total_tantiemes`** | Supprimée (compteur mort) | Plus de colonne sur `copros`. Le total des tantièmes se **dérive à la volée** en sommant `repartition_key_lines.weight` sur la clé générale active de la copro (`category = 'general'`, `is_active = true`). | `0007_copros_buildings.sql` (entête : « sans compteurs morts ») ; `0009_repartition_keys.sql` (source du calcul) |
| **`copros.buildings_count`** | Supprimée (compteur mort) | Plus de colonne. Se **dérive à la volée** par un `count(*)` sur `buildings` filtré par `copro_id`. | `0007_copros_buildings.sql` |
| **`copros.lots_count`** | Supprimée (compteur mort) | Plus de colonne (citée explicitement dans l'entête aux côtés de `total_tantiemes` / `buildings_count`). Se **dérive à la volée** par un `count(*)` sur `lots` filtré par `copro_id`. | `0007_copros_buildings.sql` |
| **`lots.owner_id`** | N'a jamais existé | La table `lots` n'a jamais porté de propriétaire (la propriété n'est pas une colonne du lot). Le rattachement lot ↔ copropriétaire vit dans la table dédiée **`lot_owners`** (avec `coproprietaire_id`, `share_percent`, `is_primary`, `start_date`/`end_date`), qui modélise l'indivision et l'historique des ventes. Le propriétaire courant = ligne `lot_owners` avec `end_date IS NULL` et `is_primary = true`. | `0008_lots.sql` (lots sans owner_id) ; `0010_coproprietaires_lot_owners.sql` (table `lot_owners`) |
| **`bank_movements.account_code`** | Supprimée (dénormalisation) | Plus de code de compte en texte sur le mouvement. Le mouvement porte désormais une **FK `account_id` (NOT NULL → `accounts`)** ; le rapprochement vers une écriture/cible se fait via la table dédiée **`bank_matches`** (`target_type` / `target_id`). | `0014_finance_periph.sql` (commentaire explicite « account_code et account_category SUPPRIMÉS » ; `account_id` + table `bank_matches`) |
| **`bank_movements.account_category`** | Supprimée (dénormalisation) | Idem ci-dessus : la catégorie dénormalisée disparaît, la nature du compte se lit via la FK **`account_id` → `accounts`** ; l'imputation/rapprochement vit dans **`bank_matches`**. | `0014_finance_periph.sql` |
| **`documents.budget_id`** | Supprimée | La table `documents` n'a plus de FK vers un budget. Le rattachement d'un document (ex. devis) à un budget passe désormais par le tableau **`documents.tags text[]`** (index GIN), et non plus par une colonne dédiée. | `0020_ged.sql` (`tags text[]` ligne 101, index GIN ; aucun `budget_id` sur `documents`) |
| **`budget_payment_schedules.phase_number`** | N'existe pas | Colonne absente de la table cible. L'ordre des phases s'obtient via **`phase_label`** et **`due_date`** (les seules colonnes descriptives présentes). | `0016_budgets_appels.sql` (§10, colonnes réelles : `phase_label`, `due_date`, `amount`, `status`, `service_order_id`) |
| **`budget_payment_schedules.percentage`** | N'existe pas | Colonne absente. Le montant de la phase est porté en valeur absolue par **`amount`** (pas de pourcentage stocké). | `0016_budgets_appels.sql` (§10) |
| **`budget_payment_schedules.is_retention`** | N'existe pas | Colonne absente, aucune notion de retenue de garantie modélisée dans la table cible. | `0016_budgets_appels.sql` (§10) |
| **`budget_payment_schedules.paid_date`** | N'existe pas | Colonne absente. L'état de la phase est porté par l'enum **`status`** (`payment_phase_status`) ; le paiement réel vit dans le grand livre / les paiements, pas sur l'échéancier. | `0016_budgets_appels.sql` (§10) |
| **`budget_payment_schedules.invoice_ref`** | N'existe pas | Colonne absente. Le lien vers une facture passe par les tables facture fournisseur (`supplier_invoices` via `tiers_id`), pas par une référence texte sur l'échéancier. | `0016_budgets_appels.sql` (§10) |
| **`budget_payment_schedules.document_id`** | N'existe pas | Colonne absente. Aucun lien direct document sur l'échéancier ; le rattachement documentaire passe par la GED (`documents.tags[]` / `document_relations`). | `0016_budgets_appels.sql` (§10) |

> ⚠️ **Note de cap sur `budget_payment_schedules`** : la table existe encore (créée en `0016`, marquée « faux-mort câblé — CONSERVÉ » car lue par `usePaymentSchedule.ts` + `TravauxDetailModal.tsx`), mais l'atlas la liste en **DROP séquencé**. Avant tout fix sur cet écran, confirmer le statut dans `atlas/MATRICE-LIAISON.md` §7 : si la table est destinée à disparaître, il faut **supprimer l'écran plutôt que le réparer**, et non recréer les colonnes manquantes.

---

Fichiers de référence (chemins absolus) :
- Audit source : `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\.planning\AUDIT_DRIFT_FINANCE.md`
- Migrations confirmant chaque ligne : `c:\Users\cleme\Desktop\Propulseo\Flex\Co-Pro-Flex\supabase\migrations\` (0007, 0008, 0009, 0010, 0014, 0015, 0016, 0020, 0021)

## 6. Plan de migration 0036

### Vues à (re)créer dans `supabase/migrations/0036_vues_drift_finance.sql`

Les 15 vues classées RECREATE ou RESHAPE forment le contenu de la migration 0036. Toutes portent `with (security_invoker = true)` et toutes ont leur SQL validé contre les migrations 0001→0035 (aucune colonne fantôme).

| # | Vue | Classe | Tables sources clés | Point d'attention migration |
|---|---|---|---|---|
| 1 | `v_general_ledger` | RECREATE | ledger_entries, ledger_transactions, accounts, lots | Aucune dépendance à une autre vue 0036. Base de tout l'affichage GL. |
| 2 | `v_calls_overview` | RECREATE | call_for_funds, call_for_funds_lines, repartition_keys | Comptages PAR LOT (multi-clés). |
| 3 | `v_call_lines_detailed` | RESHAPE | call_for_funds_lines + lots + repartition_key(_lines) + lot_owners + coproprietaires | lot_tantiemes dérivé clé générale active. |
| 4 | `v_call_campaigns` | RESHAPE | call_for_funds, call_for_funds_lines, accounting_periods, budgets, ag_meetings | Vue orpheline (contrat = interface TS). |
| 5 | `v_supplier_invoices_overview` | RECREATE | supplier_invoices, supplier_payments, tiers | supplier_name dérivé de tiers (plus de table suppliers). |
| 6 | `v_budgets_overview` | RECREATE | budgets, budget_lines, budget_expenses, accounting_periods | `DROP VIEW IF EXISTS` + ajout `version`. |
| 7 | `v_budget_lines_overview` | RECREATE | budget_lines, budget_expenses | `DROP VIEW IF EXISTS` ; remaining = voté − validé. |
| 8 | `v_budget_expenses_detail` | RESHAPE | budget_expenses, budget_lines, budgets, tiers | `fournisseur` dérivé de tiers.name via tiers_id. |
| 9 | `v_alur_lot_contributions` | RESHAPE | call_for_funds(_lines), ledger_entries/transactions, accounts(nature=alur), lots, repartition_key(_lines), lot_owners, coproprietaires | **LOT-CENTRIC** : appelé/versé = lignes d'appel ALUR du lot, solde = 450-5 du GL. Ne dépend plus d'aucune vue. ⚠️ vue déclarée morte en 0035 → choix USER (voir actions de cohérence). |
| 10 | `v_lots_with_owners` | RECREATE | lots, lot_owners, coproprietaires, buildings, repartition_key(_lines) | tantiemes_generaux dérivé ; escalier/ascenseur/chauffage = NULL. |
| 11 | `v_repartition_key_totals` | RECREATE | repartition_keys, repartition_key_lines, lots | lots_count selon coverage_mode. |
| 12 | `v_repartition_key_lines_detailed` | RESHAPE | repartition_key_lines, repartition_keys, lots | tantiemes_generaux dérivé clé générale active. |
| 13 | `v_unpaid_with_reminders` | RESHAPE | call_for_funds(_lines), lots, copros, lot_owners, coproprietaires, payment_reminders | severity = 4 paliers J+15/30/60/90 (validé USER) ; aligner `payment_reminder_rules.delay_days`. |
| 14 | `v_payment_reminders_overview` | RECREATE | payment_reminders, lots, payment_reminder_rules | owner_name = snapshot recipient_name. |
| 15 | `v_account_balances` | RESHAPE | accounts, bank_movements | Trésorerie BANCAIRE (≠ v_trial_balance). ⚠️ vue déclarée morte → voir actions de cohérence. |

**Ordre de dépendance** : AUCUNE vue 0036 n'en référence une autre (toutes ne lisent que des tables de base ; `v_alur_lot_contributions` a été refondue lot-centric et ne dépend plus de `v_alur_fund_summary`). La migration 0036 peut créer les 15 vues dans n'importe quel ordre.

### Corrections côté code (PAS dans 0036)

| Objet | Classe | Action |
|---|---|---|
| `v_finance_integrity_issues` | USE-RPC | Remplacer `.from('v_finance_integrity_issues')` par `rpc('audit_finance_integrity', { p_copro_id })` dans `useFinanceDiagnostic.ts` + ajuster les libellés `helpers.ts`. La RPC existe déjà (0028) — rien à créer en base. |

S'ajoutent aux corrections de code : tous les renommages (section 2), valeurs d'enum purgées (section 3), signatures RPC (section 4) et objets supprimés (section 5) — à appliquer dans le code app puis régénérer `src/types/supabase.ts`.

### Actions de cohérence préalables (avant / avec 0036)

1. **`gate_0035.sql`** : ce gate ÉCHOUE si `v_account_balances` ou `v_alur_lot_contributions` existent (elles y sont listées « vues mortes »). Comme la migration 0036 les (re)crée, il faut **retirer ces deux noms de la liste « vues mortes » du `gate_0035.sql`** (ou déplacer leur check de présence), sinon le gate cassera. À confirmer avec l'USER pour `v_alur_lot_contributions` (vue volontairement retirée en 0035 — sa résurrection est un choix de design).
2. **Régénérer les types Supabase** après application de 0036 (`supabase gen types` → `src/types/supabase.ts`) : les vues recréées et les types `Functions`/`Views` doivent refléter le schéma réel, sinon TypeScript continue de valider l'ancien contrat.
3. **`v_unpaid_with_reminders` — severity** : seuils VALIDÉS = J+15/30/60/90 (décision USER). Veiller à semer/aligner `payment_reminder_rules.delay_days` sur 15/30/60/90 pour cohérence avec `run_payment_reminders`.
4. **Créer la migration APRÈS les tables sources** : toutes les tables référencées existent ≤ 0021 ; 0036 est donc le bon rang (aucune dépendance à une vue de 0035).
