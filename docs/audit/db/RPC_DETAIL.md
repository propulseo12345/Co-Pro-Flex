# RPC_DETAIL.md
## Détail des 107 Fonctions RPC Supabase CoProFlex

**Date audit**: 2026-01-28

---

## VUE D'ENSEMBLE

| Catégorie | Count | Description |
|-----------|-------|-------------|
| **Single Copro / Bootstrap** | 1 | get_default_copro_id |
| **AG / Votes** | 15 | Gestion assemblées générales |
| **Finance / Comptabilité** | 18 | Budgets, appels, écritures |
| **Relances / Impayés** | 8 | Gestion des relances |
| **Mutations / Ventes** | 5 | Workflow ventes |
| **Maintenance** | 4 | Service orders, logbook |
| **Documents** | 5 | GED, versioning |
| **Communication** | 4 | Conversations, wall |
| **Mailing** | 3 | Campagnes email |
| **Helpers RLS** | 12 | Fonctions d'accès |
| **Triggers** | 30 | Fonctions trigger |
| **Validation** | 12 | Intégrité données |

---

## 1. SINGLE COPRO / BOOTSTRAP

### get_default_copro_id
```sql
-- Retourne l'ID de la copropriété par défaut pour l'utilisateur courant
-- CRITIQUE pour le mode Single Copro!
get_default_copro_id() RETURNS uuid
LANGUAGE sql STABLE

-- Implémentation probable:
SELECT copro_id
FROM memberships
WHERE user_id = auth.uid()
ORDER BY created_at
LIMIT 1;
```

**Usage côté client:**
```typescript
const { data: coproId } = await supabase.rpc('get_default_copro_id');
```

---

## 2. ASSEMBLÉES GÉNÉRALES (AG)

### create_ag_with_standard_resolutions
```sql
-- Crée une AG avec les 14 résolutions standard
create_ag_with_standard_resolutions(
  p_copro_id uuid,
  p_title text,
  p_meeting_type ag_type,
  p_meeting_date timestamptz,
  p_location text
) RETURNS uuid
LANGUAGE plpgsql

-- Retourne l'ID de l'AG créée
-- Crée automatiquement les résolutions ordinaires (approbation comptes, quitus, budget, etc.)
```

### cast_vote
```sql
-- Enregistre un vote sur une résolution
cast_vote(
  p_resolution_id uuid,
  p_lot_id uuid,
  p_vote_value vote_value,  -- 'pour', 'contre', 'abstention'
  p_vote_mode vote_mode     -- 'present', 'proxy', 'correspondence'
) RETURNS jsonb
LANGUAGE plpgsql

-- Retourne: { success: true, vote_id: uuid }
-- Vérifie: pas de double vote, AG en cours, droits
```

### compute_ag_quorum
```sql
-- Calcule le quorum de l'AG
compute_ag_quorum(p_ag_id uuid) RETURNS record
LANGUAGE plpgsql

-- Retourne:
--   total_tantiemes: integer
--   present_tantiemes: integer
--   quorum_percentage: numeric
--   quorum_reached: boolean
```

### compute_majority_threshold
```sql
-- Calcule le seuil de majorité selon l'article
compute_majority_threshold(
  p_ag_id uuid,
  p_majority_type majority_type
) RETURNS record
LANGUAGE plpgsql

-- Retourne:
--   threshold_tantiemes: integer
--   threshold_percentage: numeric
--   base_tantiemes: integer (présents ou tous selon article)
```

### calculate_resolution_result
```sql
-- Calcule le résultat d'une résolution
calculate_resolution_result(p_resolution_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Retourne:
-- {
--   total_pour: number,
--   total_contre: number,
--   total_abstention: number,
--   threshold: number,
--   passed: boolean,
--   passthrough_eligible: boolean  -- Article 25-1 ou 26-1
-- }
```

### close_ag
```sql
-- Clôture une AG (calcule tous les résultats)
close_ag(p_ag_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Actions:
--   1. Calcule résultats de toutes les résolutions
--   2. Met à jour statuts (adopted/rejected)
--   3. Nettoie les brouillons de session
--   4. Passe AG en status 'closed'
```

### save_ag_session_draft
```sql
-- Sauvegarde un brouillon de session AG
save_ag_session_draft(
  p_ag_id uuid,
  p_draft_type text,    -- 'votes', 'attendance', 'resolutions', 'session'
  p_draft_data jsonb
) RETURNS uuid
LANGUAGE plpgsql

-- Upsert sur (ag_id, user_id, draft_type)
-- Remplace le localStorage ag-draft-*, ag-votes-*, etc.
```

### get_ag_session_draft
```sql
-- Récupère un brouillon de session
get_ag_session_draft(
  p_ag_id uuid,
  p_draft_type text
) RETURNS jsonb
LANGUAGE plpgsql

-- Retourne draft_data ou NULL si pas de brouillon
```

### get_ag_all_session_drafts
```sql
-- Récupère tous les brouillons d'une AG
get_ag_all_session_drafts(p_ag_id uuid) RETURNS SETOF record
LANGUAGE plpgsql

-- Retourne: draft_type, draft_data, updated_at
```

### clear_ag_session_drafts
```sql
-- Supprime les brouillons d'une AG
clear_ag_session_drafts(p_ag_id uuid) RETURNS integer
LANGUAGE plpgsql

-- Retourne le nombre de brouillons supprimés
-- Appelé automatiquement par close_ag
```

### get_ag_recipients
```sql
-- Liste les destinataires des convocations
get_ag_recipients(p_ag_id uuid) RETURNS SETOF record
LANGUAGE plpgsql

-- Retourne: coproprietaire_id, name, email, lots[], tantiemes_total
```

### get_ag_sending_stats
```sql
-- Statistiques d'envoi des notifications AG
get_ag_sending_stats(p_ag_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Retourne: { total, sent, delivered, failed, pending }
```

### create_ag_notification
```sql
-- Crée une notification AG (convocation, rappel, PV)
create_ag_notification(
  p_ag_id uuid,
  p_coproprietaire_id uuid,
  p_notification_type text,
  p_channel text
) RETURNS uuid
LANGUAGE plpgsql
```

### check_convocation_delay
```sql
-- Vérifie le respect du délai légal de convocation (21 jours)
check_convocation_delay(p_ag_id uuid) RETURNS record
LANGUAGE plpgsql

-- Retourne:
--   meeting_date: date
--   convocation_date: date
--   days_before: integer
--   compliant: boolean
--   minimum_days: integer (21)
```

---

## 3. FINANCE / COMPTABILITÉ

### create_ledger_transaction
```sql
-- Crée une écriture comptable (draft)
create_ledger_transaction(
  p_copro_id uuid,
  p_period_id uuid,
  p_tx_date date,
  p_label text,
  p_source_type text,
  p_source_id uuid,
  p_entries jsonb  -- [{account_id, debit, credit, lot_id?}]
) RETURNS jsonb
LANGUAGE plpgsql

-- Vérifie l'équilibre débit = crédit
-- Retourne: { tx_id, status: 'draft' }
```

### post_ledger_transaction
```sql
-- Valide/poste une écriture comptable
post_ledger_transaction(p_tx_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Passe le statut à 'posted'
-- Vérifie que la période n'est pas verrouillée
-- Retourne: { success, posted_at }
```

### allocate_payment
```sql
-- Alloue un paiement aux lignes d'appel
allocate_payment(
  p_payment_id uuid,
  p_allocations jsonb  -- [{call_line_id, amount}]
) RETURNS record
LANGUAGE plpgsql

-- Vérifie: total allocations <= montant paiement
-- Met à jour les statuts des lignes d'appel
-- Retourne: allocated_amount, remaining
```

### validate_budget
```sql
-- Valide un budget (passage en 'validated')
validate_budget(p_budget_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Vérifie: toutes les lignes ont une clé de répartition
-- Retourne: { success, validated_at }
```

### submit_budget
```sql
-- Soumet un budget pour validation
submit_budget(p_budget_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Passage de 'draft' à 'submitted'
```

### close_period
```sql
-- Clôture un exercice comptable
close_period(p_period_id uuid) RETURNS boolean
LANGUAGE plpgsql

-- Vérifie: toutes les écritures postées
-- Vérifie: balance équilibrée
-- Génère écritures de clôture si nécessaire
```

### lock_period
```sql
-- Verrouille une période (empêche nouvelles écritures)
lock_period(p_period_id uuid) RETURNS boolean
LANGUAGE plpgsql
```

### get_period_for_date
```sql
-- Trouve l'exercice pour une date donnée
get_period_for_date(
  p_copro_id uuid,
  p_date date
) RETURNS uuid
LANGUAGE plpgsql
```

### compute_repartition_shares
```sql
-- Calcule les quotes-parts par lot selon une clé
compute_repartition_shares(
  p_key_id uuid,
  p_total_amount numeric
) RETURNS SETOF record
LANGUAGE sql

-- Retourne: lot_id, lot_ref, weight, share_amount, share_percentage
```

### audit_finance_integrity
```sql
-- Audit complet de l'intégrité financière
audit_finance_integrity(p_copro_id uuid) RETURNS SETOF record
LANGUAGE plpgsql

-- Vérifie:
--   - Totaux appels = somme lignes
--   - Totaux factures = somme lignes
--   - Allocations <= paiements
--   - Balance comptable équilibrée
```

### check_call_total_integrity
```sql
-- Vérifie intégrité d'un appel de fonds
check_call_total_integrity(p_call_id uuid) RETURNS boolean
LANGUAGE plpgsql
```

### check_payment_allocation_integrity
```sql
-- Vérifie les allocations d'un paiement
check_payment_allocation_integrity(p_payment_id uuid) RETURNS record
LANGUAGE plpgsql
```

### check_transaction_balance
```sql
-- Vérifie l'équilibre d'une écriture
check_transaction_balance(p_tx_id uuid) RETURNS record
LANGUAGE plpgsql

-- Retourne: total_debit, total_credit, balanced
```

### recalculate_all_call_statuses
```sql
-- Recalcule les statuts de tous les appels
recalculate_all_call_statuses(p_copro_id uuid) RETURNS record
LANGUAGE plpgsql

-- Utile après import ou correction massive
```

### calculate_budget_projection
```sql
-- Projection budget sur exercice futur
calculate_budget_projection(
  p_budget_id uuid,
  p_new_period_id uuid
) RETURNS record
LANGUAGE plpgsql
```

---

## 4. RELANCES / IMPAYÉS

### create_payment_reminder
```sql
-- Crée une relance
create_payment_reminder(
  p_copro_id uuid,
  p_lot_id uuid,
  p_owner_id uuid,
  p_reminder_level integer,  -- 1=J+15, 2=J+30, 3=J+60, 4=J+90
  p_unpaid_amount numeric,
  p_oldest_due_date date
) RETURNS uuid
LANGUAGE plpgsql
```

### mark_reminder_sent
```sql
-- Marque une relance comme envoyée
mark_reminder_sent(
  p_reminder_id uuid,
  p_sent_at timestamptz DEFAULT now()
) RETURNS void
LANGUAGE plpgsql
```

### mark_reminder_failed
```sql
-- Marque une relance en erreur
mark_reminder_failed(
  p_reminder_id uuid,
  p_error_message text
) RETURNS void
LANGUAGE plpgsql
```

### get_pending_reminders_to_send
```sql
-- Récupère les relances à envoyer
get_pending_reminders_to_send(p_copro_id uuid) RETURNS SETOF record
LANGUAGE plpgsql

-- Retourne les relances en status 'pending' avec destinataires
```

### cancel_stale_reminders
```sql
-- Annule les relances obsolètes (lot payé entre-temps)
cancel_stale_reminders(p_copro_id uuid) RETURNS integer
LANGUAGE plpgsql

-- Retourne le nombre de relances annulées
```

### is_reminders_paused
```sql
-- Vérifie si les relances sont en pause pour un lot
is_reminders_paused(
  p_copro_id uuid,
  p_lot_id uuid
) RETURNS record
LANGUAGE plpgsql

-- Retourne: paused, pause_until, reason
```

---

## 5. MUTATIONS / VENTES

### validate_mutation
```sql
-- Valide une mutation (passage à 'completed')
validate_mutation(p_mutation_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Vérifie: toutes les étapes complétées
-- Crée le transfert de propriété (lot_owners)
-- Retourne: { success, completed_at }
```

### create_etat_date_snapshot
```sql
-- Génère un snapshot état daté
create_etat_date_snapshot(
  p_mutation_id uuid,
  p_snapshot_type text  -- 'pre_etat_date', 'etat_date'
) RETURNS jsonb
LANGUAGE plpgsql

-- Capture: solde lot, charges, travaux votés, etc.
-- Retourne: { snapshot_id, payload }
```

### generate_etat_date_payload
```sql
-- Génère le payload de l'état daté
generate_etat_date_payload(p_mutation_id uuid) RETURNS jsonb
LANGUAGE plpgsql

-- Retourne le JSON complet pour le PDF:
-- {
--   lot: {...},
--   owner: {...},
--   financial: { balance, calls, payments },
--   copro: { budget, works_voted, litigation },
--   legal: { latest_ag, rules }
-- }
```

### upsert_mutation_step
```sql
-- Met à jour une étape de mutation
upsert_mutation_step(
  p_mutation_id uuid,
  p_step_code text,
  p_status step_status,
  p_notes text DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
) RETURNS mutation_steps
LANGUAGE plpgsql
```

---

## 6. MAINTENANCE

### update_service_order_status
```sql
-- Transition de statut d'un ordre de service
update_service_order_status(
  p_order_id uuid,
  p_new_status service_order_status,
  p_notes text DEFAULT NULL
) RETURNS service_order_status
LANGUAGE plpgsql

-- Vérifie la validité de la transition
-- Crée un événement dans service_order_events
-- Retourne le nouveau statut
```

### create_logbook_from_service_order
```sql
-- Crée une entrée carnet depuis un ordre clos
create_logbook_from_service_order(p_order_id uuid) RETURNS uuid
LANGUAGE plpgsql

-- Copie les infos de l'ordre dans logbook_entries
-- Appelé automatiquement quand status = 'completed'
```

### generate_service_order_number
```sql
-- Génère le numéro séquentiel OS-YYYY-NNNN
generate_service_order_number(p_copro_id uuid) RETURNS text
LANGUAGE plpgsql
```

### is_valid_service_order_transition
```sql
-- Vérifie si une transition est valide
is_valid_service_order_transition(
  p_from_status service_order_status,
  p_to_status service_order_status
) RETURNS boolean
LANGUAGE plpgsql

-- Matrice de transitions autorisées
```

---

## 7. DOCUMENTS

### create_document_version
```sql
-- Crée une nouvelle version de document
create_document_version(
  p_document_id uuid,
  p_file_path text,
  p_file_name text,
  p_file_size integer,
  p_file_hash text,
  p_change_summary text
) RETURNS uuid
LANGUAGE plpgsql

-- Incrémente version_number
-- Met à jour is_current_version
```

### generate_document_path
```sql
-- Génère le chemin Storage pour un document
generate_document_path(
  p_copro_id uuid,
  p_category document_category,
  p_file_name text
) RETURNS text
LANGUAGE plpgsql

-- Format: {copro_id}/{category}/{year}/{file_name}
```

### can_access_document
```sql
-- Vérifie l'accès à un document
can_access_document(p_document_id uuid) RETURNS boolean
LANGUAGE plpgsql

-- Selon confidentiality: public, owners, council, manager
```

### user_can_view_document
```sql
-- Alias pour RLS
user_can_view_document(p_document_id uuid) RETURNS boolean
LANGUAGE plpgsql
```

### create_document_system_folders
```sql
-- Crée les dossiers système pour une copro
create_document_system_folders(p_copro_id uuid) RETURNS void
LANGUAGE plpgsql

-- Crée: PV AG, Contrats, Factures, Diagnostics, etc.
```

---

## 8. COMMUNICATION

### mark_conversation_read
```sql
-- Marque une conversation comme lue
mark_conversation_read(p_conversation_id uuid) RETURNS void
LANGUAGE plpgsql

-- Met à jour last_read_at et unread_count
```

### is_conversation_member
```sql
-- Vérifie si l'utilisateur est membre
is_conversation_member(p_conversation_id uuid) RETURNS boolean
LANGUAGE plpgsql
```

### can_view_content
```sql
-- Vérifie l'accès selon visibility
can_view_content(
  p_copro_id uuid,
  p_visibility visibility_level
) RETURNS boolean
LANGUAGE plpgsql

-- 'all' → user_has_copro_access
-- 'owners' → user_is_lot_owner_in_copro
-- 'council' → user_is_council_member
-- 'manager' → user_is_copro_manager
```

---

## 9. MAILING

### generate_campaign_recipients
```sql
-- Génère les destinataires d'une campagne
generate_campaign_recipients(p_campaign_id uuid) RETURNS integer
LANGUAGE plpgsql

-- Selon recipient_type: all, owners, council, custom
-- Retourne le nombre de destinataires créés
```

### create_mail_system_folders
```sql
-- Crée les dossiers mail système
create_mail_system_folders(p_user_id uuid) RETURNS void
LANGUAGE plpgsql

-- Crée: Inbox, Sent, Drafts, Trash
```

---

## 10. HELPERS RLS

Ces fonctions sont utilisées dans les politiques RLS:

### user_is_copro_manager
```sql
user_is_copro_manager(p_copro_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- Vérifie: memberships.role = 'manager'
```

### user_has_copro_access
```sql
user_has_copro_access(p_copro_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- Vérifie: EXISTS membership pour cette copro
```

### user_is_lot_owner
```sql
user_is_lot_owner(p_lot_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- Vérifie: l'utilisateur possède ce lot (via coproprietaires + lot_owners)
```

### user_is_lot_owner_in_copro
```sql
user_is_lot_owner_in_copro(p_copro_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- Vérifie: possède au moins 1 lot dans cette copro
```

### user_owns_any_lot_in_copro
```sql
-- Alias
```

### user_is_lot_owner_or_manager
```sql
user_is_lot_owner_or_manager(p_lot_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE
```

### user_is_council_member
```sql
user_is_council_member(p_copro_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- Vérifie: council_members actif
```

### is_council_member
```sql
-- Alias public
```

### is_council_president
```sql
is_council_president(p_copro_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE

-- role = 'president' dans council_members
```

### get_user_lot_ids
```sql
get_user_lot_ids() RETURNS uuid[]
LANGUAGE plpgsql STABLE

-- Retourne tous les lot_ids de l'utilisateur courant
```

---

## 11. TRIGGERS (Sélection)

### handle_new_user / handle_updated_at
```sql
-- Trigger sur auth.users pour créer profile
-- Trigger générique pour updated_at
```

### trg_ag_attendance_calc_tantiemes
```sql
-- Calcule automatiquement les tantièmes dans attendance
AFTER INSERT ON ag_attendance
```

### trg_ag_vote_check_duplicate
```sql
-- Empêche le double vote sur même résolution/lot
BEFORE INSERT ON ag_votes
```

### trg_clear_drafts_on_ag_close
```sql
-- Nettoie les brouillons quand AG passe en 'closed'
AFTER UPDATE ON ag_meetings
```

### trg_ledger_entry_immutable
```sql
-- Empêche modification des écritures postées
BEFORE UPDATE ON ledger_entries
```

### trg_update_call_status_from_lines
```sql
-- Met à jour status appel selon lignes
AFTER UPDATE ON call_for_funds_lines
```

### update_contract_status_auto
```sql
-- MAJ automatique status contrat selon dates
BEFORE UPDATE ON contracts
```

### update_wall_post_likes_count / comments_count
```sql
-- Compteurs dénormalisés
AFTER INSERT OR DELETE ON wall_likes/wall_comments
```

---

## USAGE CÔTÉ CLIENT

```typescript
// Appel RPC simple
const { data: coproId } = await supabase.rpc('get_default_copro_id');

// Appel avec paramètres
const { data } = await supabase.rpc('cast_vote', {
  p_resolution_id: resolutionId,
  p_lot_id: lotId,
  p_vote_value: 'pour',
  p_vote_mode: 'present'
});

// Appel retournant un record
const { data: quorum } = await supabase.rpc('compute_ag_quorum', {
  p_ag_id: agId
});
// quorum = { total_tantiemes, present_tantiemes, quorum_percentage, quorum_reached }

// Appel avec retour SETOF (array)
const { data: shares } = await supabase.rpc('compute_repartition_shares', {
  p_key_id: keyId,
  p_total_amount: 10000
});
// shares = [{ lot_id, lot_ref, weight, share_amount }, ...]
```
