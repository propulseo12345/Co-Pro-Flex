# VIEWS_DETAIL.md
## Détail des 70 Vues Supabase CoProFlex

**Date audit**: 2026-01-28

---

## VUE D'ENSEMBLE

| Domaine | Count | Préfixe |
|---------|-------|---------|
| AG (Assemblées) | 8 | `v_ag_*` |
| Finance / Budget | 12 | `v_budget_*`, `v_call_*` |
| Comptabilité | 8 | `v_general_ledger_*`, `v_trial_balance` |
| Copropriétaires / Lots | 6 | `v_coproprietaires_*`, `v_lot_*`, `v_owner_*` |
| Impayés / Paiements | 8 | `v_unpaid_*`, `v_payment_*` |
| Documents | 8 | `v_documents_*`, `v_folders_*` |
| Maintenance | 5 | `v_logbook_*`, `v_contracts_*`, `v_service_orders_*` |
| Communication | 3 | `v_wall_*`, `v_conversation_*`, `v_events_*` |
| Mailing | 2 | `v_mail_*` |
| Mutations / Ventes | 3 | `v_mutation_*`, `v_etat_date_*` |
| Fournisseurs | 4 | `v_providers_*`, `v_supplier_*` |
| Autres | 3 | `v_copro_tantiemes`, `v_council_*` |

---

## 1. ASSEMBLÉES GÉNÉRALES (AG)

### v_ag_overview
```sql
-- Vue principale des AG avec infos copro et délais légaux
SELECT
  m.id, m.copro_id, c.name AS copro_name,
  m.title, m.meeting_type, m.meeting_date, m.location, m.status,
  m.convocation_date,
  (m.meeting_date - '21 days') AS convocation_deadline,  -- Délai légal
  -- ... stats résolutions, présence
FROM ag_meetings m
JOIN copros c ON c.id = m.copro_id
```

### v_ag_drafts_progress
```sql
-- Progression des brouillons AG
SELECT
  m.id AS ag_id, m.copro_id, m.title, m.meeting_type, m.meeting_date,
  m.location, m.status, m.created_at, m.updated_at,
  COALESCE(r.resolutions_count, 0) AS resolutions_count,
  -- ... compteurs progression
FROM ag_meetings m
LEFT JOIN (subquery resolutions) r ON r.ag_id = m.id
```

### v_ag_attendance_summary
```sql
-- Résumé présences avec noms et tantièmes
SELECT
  a.id, a.ag_id, m.title AS ag_title, m.meeting_date AS ag_date,
  a.copro_id, a.coproprietaire_id,
  CASE WHEN cp.is_company THEN cp.company_name ELSE concat(first_name, ' ', last_name) END AS owner_name,
  a.attendance_type, a.tantiemes, a.signature_data
FROM ag_attendance a
JOIN ag_meetings m ON m.id = a.ag_id
JOIN coproprietaires cp ON cp.id = a.coproprietaire_id
```

### v_ag_resolutions_results
```sql
-- Résultats détaillés des résolutions
SELECT
  r.id, r.ag_id, m.title AS ag_title, m.meeting_date AS ag_date,
  r.copro_id, r.resolution_number, r.title, r.description,
  r.resolution_type, r.majority_type, r.status,
  r.tantieme_pour, r.tantieme_contre, r.tantieme_abstention,
  r.result_details
FROM ag_resolutions r
JOIN ag_meetings m ON m.id = r.ag_id
```

### v_ag_vote_stats_by_resolution
```sql
-- Statistiques de vote par résolution
SELECT
  r.id AS resolution_id, r.ag_id, r.copro_id,
  r.resolution_number, r.title, r.resolution_type, r.majority_type,
  r.status AS resolution_status,
  COALESCE(r.tantieme_pour, 0) AS tantieme_pour,
  COALESCE(r.tantieme_contre, 0) AS tantieme_contre,
  COALESCE(r.tantieme_abstention, 0) AS tantieme_abstention,
  -- ... calcul seuils majorité
FROM ag_resolutions r
```

### v_ag_votes_detailed
```sql
-- Détail de chaque vote avec infos propriétaire
SELECT
  v.id AS vote_id, v.resolution_id, r.title AS resolution_title,
  r.resolution_number, r.majority_type, v.copro_id,
  m.id AS ag_id, m.title AS ag_title, m.meeting_date AS ag_date,
  v.lot_id, l.ref AS lot_ref, v.coproprietaire_id,
  cp.first_name || ' ' || cp.last_name AS owner_name,
  v.vote_value, v.tantiemes, v.vote_mode, v.recorded_at
FROM ag_votes v
JOIN ag_resolutions r ON r.id = v.resolution_id
JOIN ag_meetings m ON m.id = r.ag_id
-- ... joins
```

---

## 2. FINANCE / BUDGET

### v_budgets_overview
```sql
-- Vue principale budgets avec période
SELECT
  b.id, b.copro_id, b.period_id, b.budget_type, b.status,
  b.name, b.notes, b.created_at, b.validated_at,
  ap.name AS period_name, ap.start_date AS period_start, ap.end_date AS period_end,
  -- ... totaux lignes
FROM budgets b
JOIN accounting_periods ap ON ap.id = b.period_id
```

### v_budgets_summary
```sql
-- Résumé budget avec totaux calculés
SELECT
  b.id AS budget_id, b.copro_id, b.period_id, b.budget_type,
  b.status, b.version, b.name, b.notes,
  b.created_by, b.validated_by, b.created_at, b.validated_at,
  SUM(bl.amount) AS total_amount,
  COUNT(bl.id) AS lines_count
FROM budgets b
LEFT JOIN budget_lines bl ON bl.budget_id = b.id
GROUP BY b.id
```

### v_budget_lines_overview
```sql
-- Lignes budgétaires avec consommation
SELECT
  bl.id, bl.copro_id, bl.budget_id, bl.account_id,
  bl.repartition_key_id, bl.label, bl.code,
  bl.amount AS planned_amount, bl.sort_order, bl.created_at,
  COALESCE(expenses.spent, 0) AS spent_amount,
  bl.amount - COALESCE(expenses.spent, 0) AS remaining
FROM budget_lines bl
LEFT JOIN (subquery expenses) ON ...
```

### v_budget_consumption_by_account
```sql
-- Consommation par compte comptable
SELECT
  bl.copro_id, bl.budget_id, b.period_id,
  ap.name AS period_name, ap.start_date AS period_start, ap.end_date AS period_end,
  bl.account_id, a.code AS account_code, a.name AS account_name,
  SUM(bl.amount) AS budgeted,
  SUM(expenses) AS consumed,
  -- ... taux consommation
FROM budget_lines bl
JOIN ...
```

### v_calls_overview
```sql
-- Appels de fonds avec clé de répartition
SELECT
  cf.id, cf.copro_id, cf.period_id, cf.budget_id, cf.repartition_key_id,
  rk.name AS repartition_key_name,
  cf.label, cf.trimester, cf.issue_date, cf.due_date,
  cf.total_amount, cf.status,
  -- ... stats paiement
FROM call_for_funds cf
LEFT JOIN repartition_keys rk ON rk.id = cf.repartition_key_id
```

### v_call_lines_detailed
```sql
-- Lignes d'appel avec info lot et propriétaire
SELECT
  cfl.id, cfl.copro_id, cf.period_id, cfl.call_id,
  cf.label AS call_label, cf.issue_date, cf.due_date, cf.status AS call_status,
  cfl.lot_id, l.ref AS lot_ref,
  owner.owner_name, owner.owner_email,
  cfl.amount_due, cfl.amount_paid, cfl.status AS line_status
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
-- ... subquery owner
```

### v_calls_collection_stats
```sql
-- Statistiques de recouvrement par appel
SELECT
  cf.id AS call_id, cf.copro_id, cf.period_id, cf.trimester,
  cf.label AS call_label, cf.issue_date, cf.due_date, cf.status AS call_status,
  cf.total_amount AS amount_expected,
  SUM(cfl.amount_paid) AS amount_collected,
  cf.total_amount - SUM(cfl.amount_paid) AS amount_outstanding,
  -- ... taux recouvrement, nombre impayés
FROM call_for_funds cf
JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id
```

---

## 3. COMPTABILITÉ

### v_general_ledger
```sql
-- Grand livre comptable
SELECT
  e.id AS entry_id, e.tx_id, t.copro_id, t.period_id,
  t.tx_date, t.label AS tx_label, t.source_type, t.source_id,
  t.status, t.posted_at,
  a.id AS account_id, a.code AS account_code, a.name AS account_name,
  e.debit, e.credit, e.lot_id
FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id
JOIN accounts a ON a.id = e.account_id
```

### v_account_movements
```sql
-- Mouvements par compte (avec running balance)
SELECT
  entry_id, tx_id, copro_id, period_id,
  tx_date, tx_label, source_type, source_id, status, posted_at,
  account_id, account_code, account_name,
  debit, credit,
  SUM(debit - credit) OVER (PARTITION BY account_id ORDER BY tx_date) AS running_balance
FROM v_general_ledger
```

### v_trial_balance
```sql
-- Balance générale
SELECT
  e.copro_id, e.period_id, ap.name AS period_name,
  e.account_id, a.code AS account_code, a.name AS account_name,
  a.account_type, a.parent_id AS account_parent_id,
  SUM(e.debit) AS total_debit,
  SUM(e.credit) AS total_credit,
  SUM(e.debit) - SUM(e.credit) AS balance
FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
JOIN accounts a ON a.id = e.account_id
JOIN accounting_periods ap ON ap.id = t.period_id
GROUP BY e.copro_id, e.period_id, ap.name, e.account_id, a.code, a.name, a.account_type, a.parent_id
```

### v_general_ledger_by_account_class
```sql
-- Agrégation par classe de compte (1-9)
SELECT
  a.copro_id,
  LEFT(a.code, 1) AS account_class,
  CASE LEFT(a.code, 1)
    WHEN '1' THEN 'Capitaux'
    WHEN '2' THEN 'Immobilisations'
    WHEN '4' THEN 'Tiers'
    WHEN '5' THEN 'Financiers'
    WHEN '6' THEN 'Charges'
    WHEN '7' THEN 'Produits'
  END AS class_name,
  SUM(debit) AS total_debit,
  SUM(credit) AS total_credit
FROM ...
```

### v_accounting_periods
```sql
-- Exercices comptables avec stats
SELECT
  ap.id, ap.copro_id, ap.name, ap.start_date, ap.end_date,
  ap.status, ap.locked_at, ap.locked_by, ap.closed_at, ap.closed_by,
  ap.notes, ap.created_at,
  (SELECT COUNT(*) FROM ledger_transactions WHERE period_id = ap.id) AS tx_count,
  (SELECT SUM(debit) FROM ledger_entries e JOIN ledger_transactions t ON t.id = e.tx_id WHERE t.period_id = ap.id) AS total_movement
FROM accounting_periods ap
```

---

## 4. COPROPRIÉTAIRES / LOTS

### v_coproprietaires_overview
```sql
-- Vue complète copropriétaires
SELECT
  c.id, c.copro_id, c.user_id, c.is_company, c.company_name,
  c.civility, c.first_name, c.last_name, c.email, c.phone, c.mobile,
  c.address_line1, c.address_line2, c.postal_code, c.city, c.country,
  -- ... nombre de lots, tantièmes totaux
FROM coproprietaires c
```

### v_lots_with_owners
```sql
-- Lots avec propriétaire actuel
SELECT
  l.id, l.copro_id, l.building_id, l.ref, l.type, l.floor, l.surface,
  l.tantiemes_generaux, l.tantiemes_escalier, l.tantiemes_ascenseur, l.tantiemes_chauffage,
  lo.coproprietaire_id AS current_owner_id,
  cp.first_name || ' ' || cp.last_name AS owner_name,
  cp.email AS owner_email
FROM lots l
LEFT JOIN lot_owners lo ON lo.lot_id = l.id AND lo.end_date IS NULL
LEFT JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
```

### v_copro_tantiemes
```sql
-- Totaux tantièmes par copro
SELECT
  copro_id,
  SUM(tantiemes_generaux) AS total_tantiemes_generaux,
  SUM(tantiemes_escalier) AS total_tantiemes_escalier,
  SUM(tantiemes_ascenseur) AS total_tantiemes_ascenseur,
  COUNT(*) AS lots_count
FROM lots
GROUP BY copro_id
```

### v_lot_balance
```sql
-- Solde par lot (appels - paiements)
SELECT
  e.copro_id, e.lot_id, l.ref AS lot_ref, l.type AS lot_type,
  l.tantiemes_generaux, lo.coproprietaire_id,
  owner_name, owner_email,
  SUM(e.debit) AS total_debit,
  SUM(e.credit) AS total_credit,
  SUM(e.debit) - SUM(e.credit) AS balance
FROM ledger_entries e
JOIN lots l ON l.id = e.lot_id
-- ... joins
GROUP BY ...
```

### v_owner_balance
```sql
-- Solde par propriétaire (agrégé sur tous ses lots)
SELECT
  copro_id, coproprietaire_id, owner_name, owner_email,
  COUNT(DISTINCT lot_id) AS lots_count,
  SUM(tantiemes_generaux) AS total_tantiemes,
  SUM(total_debit) AS total_debit,
  SUM(total_credit) AS total_credit,
  SUM(total_debit) - SUM(total_credit) AS balance
FROM v_lot_balance
GROUP BY copro_id, coproprietaire_id, owner_name, owner_email
```

### v_owner_financial_summary
```sql
-- Résumé financier propriétaire
SELECT
  lo.copro_id, lo.lot_id, l.ref AS lot_ref,
  cp.id AS coproprietaire_id, owner_name,
  -- appels dus, payés, solde
FROM lot_owners lo
JOIN ...
```

---

## 5. IMPAYÉS / PAIEMENTS

### v_unpaid_lots
```sql
-- Lots en impayé (balance > 0)
SELECT
  copro_id, lot_id, lot_ref, lot_type, tantiemes_generaux,
  coproprietaire_id, owner_name, owner_email,
  total_debit, total_credit, balance,
  entry_count
FROM v_lot_balance
WHERE balance > 0
```

### v_unpaid_by_lot
```sql
-- Détail impayés par lot (lignes d'appel non soldées)
SELECT
  cfl.copro_id, cfl.lot_id, l.ref AS lot_ref,
  owner_name,
  SUM(cfl.amount_due - cfl.amount_paid) AS unpaid_amount,
  MIN(cf.due_date) AS oldest_due_date,
  COUNT(*) AS unpaid_lines_count
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
WHERE cfl.status IN ('pending', 'partial', 'overdue')
GROUP BY cfl.copro_id, cfl.lot_id, l.ref, owner_name
```

### v_unpaid_with_reminders
```sql
-- Impayés avec historique relances
SELECT
  u.copro_id, u.lot_id, u.lot_ref, u.owner_name, u.owner_email,
  u.total_unpaid, u.unpaid_lines_count, u.oldest_due_date, u.days_overdue,
  last_reminder.id AS last_reminder_id,
  last_reminder.reminder_level,
  last_reminder.sent_at AS last_reminder_date
FROM v_unpaid_by_lot u
LEFT JOIN LATERAL (
  SELECT * FROM payment_reminders pr
  WHERE pr.lot_id = u.lot_id
  ORDER BY sent_at DESC LIMIT 1
) last_reminder ON true
```

### v_payments_overview
```sql
-- Vue paiements avec info lot
SELECT
  p.id, p.copro_id, p.period_id, p.lot_id, l.ref AS lot_ref,
  p.amount, p.payment_date, p.method, p.reference, p.status,
  p.ledger_tx_id, p.created_at,
  -- ... allocations
FROM payments p
JOIN lots l ON l.id = p.lot_id
```

### v_payment_reminders_overview
```sql
-- Relances avec infos propriétaire
SELECT
  pr.id, pr.copro_id, pr.lot_id, l.ref AS lot_ref,
  pr.owner_id, pr.recipient_name AS owner_name, pr.recipient_email,
  pr.unpaid_amount, pr.oldest_due_date, pr.reminder_level,
  pr.status, pr.sent_at, pr.created_at
FROM payment_reminders pr
JOIN lots l ON l.id = pr.lot_id
```

---

## 6. DOCUMENTS

### v_accessible_documents
```sql
-- Documents accessibles (filtrés par RLS)
SELECT
  id, copro_id, title, file_name, category, confidentiality,
  lot_id, coproprietaire_id, created_at, created_by
FROM documents d
WHERE status = 'active' AND is_current_version = true
-- RLS applique les filtres de confidentialité
```

### v_documents_with_folder
```sql
-- Documents avec info dossier
SELECT
  d.*, f.name AS folder_name, f.icon AS folder_icon
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
```

### v_documents_by_category
```sql
-- Comptage par catégorie
SELECT
  copro_id, category,
  COUNT(*) AS count,
  SUM(file_size) AS total_size,
  MAX(created_at) AS last_added
FROM documents d
WHERE status = 'active' AND is_current_version = true
GROUP BY copro_id, category
```

### v_documents_expiring
```sql
-- Documents arrivant à expiration
SELECT d.*
FROM documents d
WHERE d.expiry_date IS NOT NULL
  AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND d.status = 'active'
```

### v_recent_documents
```sql
-- Documents récents (30 jours)
SELECT
  d.id, d.copro_id, d.file_name, d.title, d.category,
  d.file_size, d.mime_type, d.confidentiality,
  d.folder_id, f.name AS folder_name,
  d.created_at, d.created_by
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
WHERE d.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY d.created_at DESC
```

### v_folders_with_counts
```sql
-- Dossiers avec comptage documents
SELECT
  f.id, f.copro_id, f.parent_id, f.name, f.description,
  f.icon, f.color, f.sort_order, f.is_system, f.category_default,
  f.created_at, f.created_by,
  COUNT(d.id) AS documents_count
FROM document_folders f
LEFT JOIN documents d ON d.folder_id = f.id AND d.status = 'active'
GROUP BY f.id
```

---

## 7. MAINTENANCE

### v_logbook_overview
```sql
-- Carnet d'entretien complet
SELECT
  le.id, le.copro_id, le.building_id, b.name AS building_name,
  le.entry_type, le.category, le.title, le.description,
  le.provider_id, COALESCE(p.name, le.provider_name) AS provider_name,
  le.contract_id, c.title AS contract_title,
  le.service_order_id, so.order_number,
  le.intervention_date, le.cost, le.warranty_end, le.next_due_date,
  le.created_at
FROM logbook_entries le
LEFT JOIN buildings b ON b.id = le.building_id
LEFT JOIN providers p ON p.id = le.provider_id
LEFT JOIN contracts c ON c.id = le.contract_id
LEFT JOIN service_orders so ON so.id = le.service_order_id
```

### v_logbook_alerts
```sql
-- Alertes carnet (échéances proches)
SELECT *
FROM v_logbook_overview
WHERE next_due_date IS NOT NULL
  AND next_due_date <= CURRENT_DATE + INTERVAL '30 days'
```

### v_contracts_overview
```sql
-- Contrats avec prestataire
SELECT
  c.id, c.copro_id, c.provider_id, p.name AS provider_name,
  c.contract_number, c.contract_type, c.title, c.description,
  c.start_date, c.end_date, c.renewal_date, c.tacit_renewal,
  c.notice_period_days, c.annual_amount, c.status, c.document_id
FROM contracts c
JOIN providers p ON p.id = c.provider_id
```

### v_contracts_alerts
```sql
-- Contrats à renouveler/résilier
SELECT *
FROM v_contracts_overview
WHERE renewal_date IS NOT NULL
  AND renewal_date <= CURRENT_DATE + INTERVAL '90 days'
  AND status = 'active'
```

### v_service_orders_overview
```sql
-- Ordres de service complets
SELECT
  so.id, so.copro_id, so.building_id, b.name AS building_name,
  so.lot_id, l.ref AS lot_ref, so.order_number,
  so.provider_id, p.name AS provider_name, p.email AS provider_email,
  so.contract_id, c.title AS contract_title,
  so.category, so.urgency, so.title, so.description, so.status,
  so.scheduled_date, so.completed_date,
  so.estimated_cost, so.actual_cost,
  so.created_by, so.created_at, so.updated_at
FROM service_orders so
LEFT JOIN buildings b ON b.id = so.building_id
LEFT JOIN lots l ON l.id = so.lot_id
LEFT JOIN providers p ON p.id = so.provider_id
LEFT JOIN contracts c ON c.id = so.contract_id
```

---

## 8. COMMUNICATION

### v_wall_feed
```sql
-- Flux mur communautaire
SELECT
  wp.id, wp.copro_id, wp.author_id, wp.title, wp.content,
  wp.category, wp.visibility, wp.is_pinned, wp.pinned_at,
  wp.likes_count, wp.comments_count,
  wp.attachment_ids, wp.created_at, wp.updated_at,
  p.full_name AS author_name, p.avatar_url AS author_avatar,
  -- ... has_liked (pour l'utilisateur courant)
FROM wall_posts wp
JOIN profiles p ON p.id = wp.author_id
ORDER BY wp.is_pinned DESC, wp.created_at DESC
```

### v_conversations_overview
```sql
-- Conversations avec dernier message
SELECT
  c.id, c.copro_id, c.subject, c.is_group, c.created_by,
  c.last_message_at, c.last_message_preview, c.created_at,
  cm.unread_count AS my_unread_count,
  cm.last_read_at AS my_last_read
FROM conversations c
JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = auth.uid()
```

### v_events_overview
```sql
-- Événements calendrier
SELECT
  e.id, e.copro_id, e.title, e.description, e.event_type, e.location,
  e.starts_at, e.ends_at, e.all_day, e.visibility,
  e.linked_ag_id, e.linked_service_order_id,
  e.created_by, e.created_at,
  p.full_name AS creator_name
FROM events e
LEFT JOIN profiles p ON p.id = e.created_by
```

---

## 9. MUTATIONS / VENTES

### v_mutations_overview
```sql
-- Ventes en cours
SELECT
  m.id, m.copro_id, m.lot_id, l.ref AS lot_ref, l.type AS lot_type,
  l.tantiemes_generaux, l.building_id, l.floor,
  m.status, m.mutation_type,
  m.seller_owner_id, seller.name AS seller_name,
  m.buyer_name, m.buyer_email, m.buyer_phone,
  m.notary_name, m.notary_email, m.notary_phone,
  m.sale_price, m.sale_date, m.act_date,
  m.created_by, m.created_at, m.updated_at
FROM mutations m
JOIN lots l ON l.id = m.lot_id
LEFT JOIN coproprietaires seller ON seller.id = m.seller_owner_id
```

### v_mutation_detail
```sql
-- Détail mutation avec étapes
SELECT
  m.*,
  steps.completed_steps, steps.total_steps,
  steps.current_step_code, steps.current_step_status
FROM mutations m
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_steps,
    COUNT(*) AS total_steps,
    -- ... étape en cours
  FROM mutation_steps ms WHERE ms.mutation_id = m.id
) steps ON true
```

### v_etat_date_latest
```sql
-- Dernier état daté par mutation
SELECT DISTINCT ON (mutation_id)
  eds.id, eds.copro_id, eds.mutation_id, eds.snapshot_type,
  eds.generated_at, eds.generated_by, eds.payload, eds.document_id
FROM etat_date_snapshots eds
ORDER BY eds.mutation_id, eds.generated_at DESC
```

---

## 10. FOURNISSEURS / FACTURES

### v_providers_overview
```sql
-- Prestataires avec stats
SELECT
  id, copro_id, name, category, domains,
  contact_name, contact_role, email, phone, phone_emergency,
  address, postal_code, city, siret,
  rating, interventions_count, is_active
FROM providers
```

### v_supplier_invoices_overview
```sql
-- Factures fournisseurs
SELECT
  si.id, si.copro_id, si.period_id, si.supplier_id, s.name AS supplier_name,
  si.invoice_number, si.invoice_date, si.due_date, si.label,
  si.total_amount, si.status,
  COALESCE(paid.amount, 0) AS paid_amount,
  si.total_amount - COALESCE(paid.amount, 0) AS remaining_amount
FROM supplier_invoices si
JOIN suppliers s ON s.id = si.supplier_id
LEFT JOIN (SELECT invoice_id, SUM(amount) AS amount FROM supplier_payments GROUP BY invoice_id) paid
  ON paid.invoice_id = si.id
```

---

## 11. INTÉGRITÉ / ALERTES

### v_finance_integrity_issues
```sql
-- Problèmes d'intégrité financière
SELECT 'call_for_funds' AS entity_type, cf.id AS entity_id, cf.copro_id,
  cf.label AS description, cf.total_amount AS expected_amount,
  COALESCE(SUM(cfl.amount_due), 0) AS actual_amount,
  cf.total_amount - COALESCE(SUM(cfl.amount_due), 0) AS difference
FROM call_for_funds cf
LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id
HAVING cf.total_amount <> COALESCE(SUM(cfl.amount_due), 0)
-- UNION autres vérifications...
```

### v_call_total_mismatch
```sql
-- Appels dont le total ne correspond pas aux lignes
SELECT cf.id AS call_id, cf.copro_id, cf.label,
  cf.total_amount AS expected_total,
  COALESCE(SUM(cfl.amount_due), 0) AS actual_lines_total,
  cf.total_amount - COALESCE(SUM(cfl.amount_due), 0) AS mismatch
FROM call_for_funds cf
LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id
HAVING cf.total_amount <> COALESCE(SUM(cfl.amount_due), 0)
```

### v_payment_allocation_issues
```sql
-- Paiements mal alloués
SELECT p.id AS payment_id, p.copro_id, p.lot_id, p.amount AS payment_amount,
  COALESCE(SUM(pa.amount_allocated), 0) AS total_allocated,
  p.amount - COALESCE(SUM(pa.amount_allocated), 0) AS unallocated
FROM payments p
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
GROUP BY p.id
HAVING p.amount <> COALESCE(SUM(pa.amount_allocated), 0) AND p.status = 'allocated'
```

---

## UTILISATION CÔTÉ CLIENT

Ces vues sont accessibles via le client Supabase avec RLS appliqué automatiquement :

```typescript
// Exemple: récupérer les impayés
const { data } = await supabase
  .from('v_unpaid_lots')
  .select('*')
  .eq('copro_id', currentCoproId)
  .order('balance', { ascending: false });

// Exemple: budget avec consommation
const { data } = await supabase
  .from('v_budget_lines_overview')
  .select('*')
  .eq('budget_id', budgetId);
```
