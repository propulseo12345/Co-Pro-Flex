# DB_SCHEMA_OVERVIEW.md
## Cartographie Supabase CoProFlex - Vue d'ensemble

**Date audit**: 2026-01-28
**Project ID**: `iyfesbjnkpynmwlsmxnp`
**Region**: `eu-west-1`
**PostgreSQL**: 17.6.1
**Status**: ACTIVE_HEALTHY

---

## A. COMPTEURS GLOBAUX

| Composant | Count | Status |
|-----------|-------|--------|
| **Tables (public)** | ~70 | Complètes |
| **Views (public)** | 70 | Complètes |
| **RPC Functions** | 107 | Complètes |
| **RLS Policies** | 220+ | Complètes |
| **Storage Buckets** | 1 | `ged` |
| **Extensions actives** | 6 | pgcrypto, uuid-ossp, pg_graphql, etc. |

---

## B. EXTENSIONS INSTALLÉES

| Extension | Schema | Version | Usage |
|-----------|--------|---------|-------|
| `plpgsql` | pg_catalog | 1.0 | PL/pgSQL procedural language |
| `pgcrypto` | extensions | 1.3 | Cryptographic functions |
| `uuid-ossp` | extensions | 1.1 | UUID generation |
| `pg_graphql` | graphql | 1.5.11 | GraphQL support |
| `pg_stat_statements` | extensions | 1.11 | Query statistics |
| `supabase_vault` | vault | 0.3.1 | Secrets management |

---

## C. STORAGE BUCKETS

| Bucket | Public | Size Limit | MIME Types |
|--------|--------|------------|------------|
| `ged` | Non | 10 MB | PDF, JPEG, PNG, DOCX, DOC |

---

## D. TABLES PAR DOMAINE MÉTIER

### D.1 Core / Multi-tenant
| Table | Description |
|-------|-------------|
| `copros` | Copropriétés (entité racine) |
| `buildings` | Bâtiments d'une copro |
| `lots` | Lots (appartements, parkings, etc.) |
| `lot_owners` | Propriétaires de lots (historique) |
| `coproprietaires` | Personnes physiques/morales |
| `profiles` | Profils utilisateurs (auth.users mirror) |
| `memberships` | Appartenance user ↔ copro avec rôle |

### D.2 Assemblées Générales (AG)
| Table | Description |
|-------|-------------|
| `ag_meetings` | Assemblées générales |
| `ag_resolutions` | Résolutions de l'AG |
| `ag_votes` | Votes sur résolutions |
| `ag_attendance` | Feuille de présence |
| `ag_correspondence_votes` | Votes par correspondance |
| `ag_session_drafts` | Brouillons de session AG |
| `ag_notifications` | Notifications AG (convocations) |
| `ag_notification_events` | Événements d'envoi |

### D.3 Finance / Comptabilité
| Table | Description |
|-------|-------------|
| `accounting_periods` | Exercices comptables |
| `accounts` | Plan comptable |
| `lot_accounts` | Comptes par lot |
| `budgets` | Budgets prévisionnels |
| `budget_lines` | Lignes budgétaires |
| `budget_expenses` | Dépenses réelles |
| `call_for_funds` | Appels de fonds |
| `call_for_funds_lines` | Lignes d'appel par lot |
| `payments` | Paiements copropriétaires |
| `payment_allocations` | Allocation paiements → lignes |
| `payment_reminders` | Relances impayés |
| `payment_reminder_rules` | Règles automatiques |
| `reminder_settings` | Paramètres relances |
| `ledger_transactions` | Écritures comptables (en-tête) |
| `ledger_entries` | Lignes d'écriture |
| `ledger_locks` | Verrouillages période |
| `bank_movements` | Mouvements bancaires |
| `bank_matches` | Rapprochement bancaire |
| `repartition_keys` | Clés de répartition |
| `repartition_key_lines` | Tantièmes par lot/clé |

### D.4 Fournisseurs / Factures
| Table | Description |
|-------|-------------|
| `suppliers` | Fournisseurs (compta) |
| `supplier_invoices` | Factures fournisseurs |
| `supplier_invoice_lines` | Lignes de facture |
| `supplier_payments` | Paiements fournisseurs |

### D.5 Maintenance / Prestataires
| Table | Description |
|-------|-------------|
| `providers` | Prestataires (maintenance) |
| `contracts` | Contrats prestataires |
| `service_orders` | Ordres de service |
| `service_order_events` | Historique transitions |
| `logbook_entries` | Carnet d'entretien |

### D.6 Documents (GED)
| Table | Description |
|-------|-------------|
| `documents` | Documents uploadés |
| `document_versions` | Versioning documents |
| `document_folders` | Dossiers GED |
| `document_access` | Droits d'accès granulaires |
| `document_links` | Liens entre documents |

### D.7 Communication
| Table | Description |
|-------|-------------|
| `wall_posts` | Posts mur communautaire |
| `wall_comments` | Commentaires |
| `wall_likes` | Likes |
| `conversations` | Conversations privées |
| `conversation_members` | Participants |
| `messages` | Messages |
| `events` | Événements calendrier |

### D.8 Mailing
| Table | Description |
|-------|-------------|
| `mail_templates` | Templates email |
| `mail_campaigns` | Campagnes email |
| `mail_recipients` | Destinataires |
| `mail_inbox` | Boîte de réception |
| `mail_folders` | Dossiers mail |
| `email_templates` | Templates système |

### D.9 Ventes / Mutations
| Table | Description |
|-------|-------------|
| `mutations` | Ventes de lots |
| `mutation_steps` | Étapes workflow vente |
| `etat_date_snapshots` | Snapshots état daté |

### D.10 Conseil Syndical
| Table | Description |
|-------|-------------|
| `council_members` | Membres du CS |
| `council_decisions` | Décisions CS |
| `council_votes` | Votes CS |
| `council_documents` | Documents CS |

---

## E. FONCTIONS RPC CLÉS

### E.1 Single Copro Bootstrap
```sql
get_default_copro_id() → uuid  -- EXISTE DÉJÀ!
```

### E.2 AG / Votes
| Fonction | Return | Description |
|----------|--------|-------------|
| `cast_vote(...)` | jsonb | Enregistrer un vote |
| `compute_ag_quorum(...)` | record | Calcul quorum |
| `compute_majority_threshold(...)` | record | Seuils majorités |
| `calculate_resolution_result(...)` | jsonb | Résultat résolution |
| `close_ag(...)` | jsonb | Clôturer l'AG |
| `create_ag_with_standard_resolutions(...)` | uuid | Créer AG + 14 résolutions |
| `save_ag_session_draft(...)` | uuid | Sauvegarder brouillon |
| `get_ag_session_draft(...)` | jsonb | Récupérer brouillon |

### E.3 Finance
| Fonction | Return | Description |
|----------|--------|-------------|
| `create_ledger_transaction(...)` | jsonb | Créer écriture comptable |
| `post_ledger_transaction(...)` | jsonb | Valider écriture |
| `allocate_payment(...)` | record | Imputer paiement |
| `validate_budget(...)` | jsonb | Valider budget |
| `submit_budget(...)` | jsonb | Soumettre budget |
| `close_period(...)` | boolean | Clôturer exercice |
| `lock_period(...)` | boolean | Verrouiller période |

### E.4 Relances
| Fonction | Return | Description |
|----------|--------|-------------|
| `create_payment_reminder(...)` | uuid | Créer relance |
| `mark_reminder_sent(...)` | void | Marquer envoyée |
| `get_pending_reminders_to_send(...)` | record | Relances à envoyer |

### E.5 Mutations / Ventes
| Fonction | Return | Description |
|----------|--------|-------------|
| `validate_mutation(...)` | jsonb | Valider mutation |
| `create_etat_date_snapshot(...)` | jsonb | Générer état daté |
| `generate_etat_date_payload(...)` | jsonb | Payload état daté |

### E.6 Maintenance
| Fonction | Return | Description |
|----------|--------|-------------|
| `update_service_order_status(...)` | enum | Transition workflow |
| `create_logbook_from_service_order(...)` | uuid | Auto-log intervention |
| `generate_service_order_number(...)` | text | Numéro séquentiel |

### E.7 Documents
| Fonction | Return | Description |
|----------|--------|-------------|
| `create_document_version(...)` | uuid | Nouvelle version |
| `generate_document_path(...)` | text | Path storage |
| `can_access_document(...)` | boolean | Vérifier accès |

---

## F. HELPERS RLS

Ces fonctions sont utilisées dans les politiques RLS :

| Fonction | Description |
|----------|-------------|
| `user_is_copro_manager(copro_id)` | L'user est-il gestionnaire? |
| `user_has_copro_access(copro_id)` | L'user a-t-il accès à cette copro? |
| `user_is_lot_owner(lot_id)` | L'user est-il propriétaire de ce lot? |
| `user_is_lot_owner_in_copro(copro_id)` | L'user possède-t-il un lot dans cette copro? |
| `user_is_council_member(copro_id)` | Membre du CS? |
| `is_council_member(copro_id)` | Alias |
| `is_council_president(copro_id)` | Président du CS? |
| `is_conversation_member(conv_id)` | Membre de la conversation? |
| `can_view_content(copro_id, visibility)` | Peut voir le contenu? |
| `user_can_view_document(doc_id)` | Accès document? |
| `get_user_lot_ids()` | Liste des lots de l'user |

---

## G. TRIGGERS PRINCIPAUX

| Trigger | Table | Action |
|---------|-------|--------|
| `handle_updated_at` | Multiple | Auto-update `updated_at` |
| `trg_ag_attendance_calc_tantiemes` | ag_attendance | Calcul tantièmes présence |
| `trg_ag_vote_check_duplicate` | ag_votes | Empêcher double vote |
| `trg_clear_drafts_on_ag_close` | ag_meetings | Nettoyer brouillons |
| `trg_ledger_entry_immutable` | ledger_entries | Immutabilité écritures postées |
| `trg_update_call_status_from_lines` | call_for_funds_lines | MAJ statut appel |
| `update_contract_status_auto` | contracts | MAJ statut contrat |
| `update_provider_stats` | service_orders | Stats prestataire |
| `update_wall_post_likes_count` | wall_likes | Compteur likes |
| `update_wall_post_comments_count` | wall_comments | Compteur comments |

---

## H. RÉSUMÉ COUVERTURE

| Module Frontend | Tables DB | Views | RPC | Status |
|-----------------|-----------|-------|-----|--------|
| Dashboard | copros, lots, budgets | v_owner_balance | get_default_copro_id | ✅ Prêt |
| AG | ag_* (8 tables) | v_ag_* (8 views) | 10+ fonctions | ✅ Complet |
| Finance | 15+ tables | 20+ views | 10+ fonctions | ✅ Complet |
| Maintenance | 5 tables | v_logbook_*, v_contracts_* | 3 fonctions | ✅ Complet |
| Documents | 5 tables | v_documents_* (8 views) | 4 fonctions | ✅ Complet |
| Communication | 6 tables | v_wall_feed, v_conversations_* | - | ✅ Complet |
| Ventes | 3 tables | v_mutations_* | 3 fonctions | ✅ Complet |
| Mailing | 5 tables | v_mail_* | 2 fonctions | ✅ Complet |

---

**CONCLUSION**: Le schéma Supabase est **complet et prêt** pour la migration. La fonction `get_default_copro_id()` existe déjà pour le mode Single Copro.
