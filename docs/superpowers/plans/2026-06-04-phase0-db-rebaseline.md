# Phase 0 — Re-baseline du schéma DB CoProFlex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer, dans l'ordre de dépendances, le SQL complet de re-baseline de la base CoProFlex (extensions → enums → socle multi-cabinet → finance/grand livre → domaines 03-08 → helpers d'autorisation → triggers d'intégrité → vues → RLS), chaque lot validé sur une branche Supabase jetable avant commit.

**Architecture:** Re-baseline propre (décision A1, aucune reprise du live). Le schéma fait foi. Tenance racine = `cabinets` (multi-cabinet, RLS cloisonnée centralisée dans 2 helpers). Grand livre en partie double = source unique de tout solde, lot-centric (`enforce_lot_id_on_45x` sans exception, A2). Tout DROP câblé est SÉQUENCÉ (rebrancher AVANT) — mais en Phase 0 on **crée** un schéma neuf, donc les DROP/séquençages sont documentés comme risques rattachés, pas exécutés ici (ils relèvent des phases applicatives 1+). Chaque migration est idempotente-friendly et testée sur une branche Supabase jetable via MCP (`create_branch` → `apply_migration` → requête de vérif structurelle → diff vs blueprint → commit).

**Tech Stack:** PostgreSQL 15 (Supabase), migrations SQL versionnées sous `supabase/migrations/NNNN_*.sql`, MCP Supabase (`create_branch`, `apply_migration`, `execute_sql`, `list_migrations`, `generate_typescript_types`, `delete_branch`), TypeScript strict pour les types générés.

**Sources blueprint (lecture seule) :** `.planning/db-cible/{ENUMS,AUTORISATION,00-SYNTHESE,01..08,INVENTAIRE-FONCTIONS,OBJETS-ABANDONNES,MIGRATION-DONNEES,TEMPLATE-SEED}.md` + `.planning/atlas/REGISTRE-RISQUES.md`.

---

## Conventions transverses (à lire avant toute tâche)

**Nommage des migrations :** `supabase/migrations/NNNN_<lot>.sql` (NNNN = 4 chiffres, ordre strict). Une migration = un lot logique. Jamais d'INSERT brut sur les tables financières (le seed du template, hors Phase 0, passe par les RPC canoniques).

**Procédure de TEST commune à CHAQUE tâche SQL** (le « critère de test » de chaque tâche s'y réfère) :
1. Au tout début (Task 0), créer UNE branche Supabase jetable `rebaseline-test` via MCP `create_branch` (name `rebaseline-test`). Toutes les migrations s'appliquent dessus, cumulativement, dans l'ordre.
2. Pour la tâche courante : `apply_migration` (name = nom du fichier sans extension, query = contenu du `.sql`).
3. Exécuter la **requête de vérif structurelle** indiquée dans la tâche via `execute_sql` sur la branche.
4. **Diff vs blueprint** : comparer le résultat (colonnes/types/contraintes/enum values) à la section blueprint citée. 0 écart attendu.
5. Si KO : corriger le `.sql`, re-`apply_migration` (les migrations Supabase sont rejouées sur la branche ; en cas de conflit, `reset_branch` puis ré-appliquer la chaîne). Si OK : commit.
6. À la toute fin (Task finale), `delete_branch` la branche jetable.

**Garde transverse fonctions (rappel INVENTAIRE-FONCTIONS §Garde) :** toute fonction d'écriture créée porte `REVOKE EXECUTE FROM anon, public; GRANT EXECUTE TO authenticated` (+ `service_role` si machine), `SECURITY DEFINER` si elle doit lire `memberships`/`lot_owners`, `SET search_path = public`. Détaillé aux tâches helpers/gardes.

**Registre des risques — rattachement (REGISTRE-RISQUES.md, R1..R42).** Phase 0 = schéma. Les risques applicatifs (front/edge/API) ne se *corrigent* pas ici mais leur **prérequis schéma** est posé et tracé. Rattachement intégral :
- **R1** (`/api/**` public) → prérequis = helpers `user_is_*` + RLS (Task 23-31) ; correction route handlers = Phase applicative.
- **R2, R3** (edges service_role / RPC sans `auth.uid()`) → prérequis = helper `is_service_call` + gardes G-MGR/G-SVC (Task 24, 25) ; conversion edges = Phase applicative.
- **R4** (`/api/mail/inbound` non signé, copro gelée 11111111) → A1 supprime 11111111 (aucune reprise) ; `mails` créée Task 22 sans ID en dur ; signature webhook = Phase applicative.
- **R5** (AG bespoke hors GL) → chaîne canonique `ag_pending_actions` + CHECK liste blanche posés Task 14 ; fonctions bespoke jamais créées (INVENTAIRE Q.2) ; rebranchement front AVANT drop = Phase applicative.
- **R6** (factures hors compta engagement) → chaîne `budget_expenses`/`supplier_invoices`/`ledger_tx_id` + `trg_cff_ledger_required` posés Task 13, 19 ; réactivation edges = Phase applicative.
- **R7** (`cast_vote` bugué) → table `ag_votes` + trigger `trg_ag_vote_requires_attendance` posés Task 14 ; réécriture `cast_vote` = lot fonctions (hors Phase 0 schéma pur, notée Task 14 test).
- **R8** (double source contrats) → table `contracts` unique posée Task 20 ; unification front = Phase applicative.
- **R9, R10, R11, R17** (mocks settings/etats-dates/relances/KPIs) → tables réelles posées Task 12-13, 16 ; rebranchement = Phase applicative.
- **R12** (`document_access` câblée, A4) → table NON créée (DROP, OBJETS §1.1) ; `documents.visibility` + enum `document_visibility` posés Task 18 ; helper `user_can_view_document` réécrit Task 24.
- **R13** (île notifications AG) → tables transitoires `ag_notifications`/`_events`/`ag_milestones` posées Task 15 (foyer transitoire AUTORISATION §5.2.1) ; drop séquencé = Phase applicative.
- **R14** (`any` data-layer) → types TS régénérés Task 33.
- **R15, R16** (identité hardcodée, `DEFAULT_*_ID`) → `profiles`/`coproprietaires.user_id` câblables posés Task 11 ; `link_coproprietaire_account` Task 25.
- **R18, R20, R22, R23, R29, R30, R31** (doublons EN/FR, pages mortes) → schéma cible unique ; suppression front = Phase applicative.
- **R19** (`/providers/copro` vs `/syndic`) → `tiers` unique + `tiers_category` Task 20.
- **R21** (domaine AG triplé, mock-data) → schéma unique ; migrations data-layer = Phase applicative.
- **R24, R35, R36** (conformité mock, stubs) → hors scope finance-first ; tables non créées si pas au blueprint.
- **R25** (`council_documents` faux-mort) → table GARDÉE posée Task 14 (propriété 04).
- **R26** (surcharges legacy) → seules les signatures canoniques sont créées (INVENTAIRE Q.1) ; aucune surcharge legacy posée.
- **R27** (fonctions buggées `get_pending_reminders_to_send` etc.) → schéma cible (`lot_owners`, `tiers_id`, `title`) posé Task 11, 16, 20 ; réécriture fonctions = lot fonctions.
- **R28** (`budget_payment_schedules`) → CONSERVÉE (faux-mort câblé, A8) posée Task 16.
- **R32** (DROP secs `lot_accounts`, île campagnes, `ag_pouvoirs`, `notaires`) → tables JAMAIS créées (OBJETS §1.1) ; absence = conformité.
- **R33** (hooks morts) → Phase applicative.
- **R34** (orphelins routage) → Phase applicative.
- **R37, R38** (fallbacks localStorage, compteurs client) → triggers compteurs posés Task 22 ; retrait fallbacks = Phase applicative.
- **R39** (`collective_loans`/`treasury_advances` faux-morts) → tables posées Task 13, structure conservée 0 ligne.
- **R40** (`v_coproprietaires_overview` doublons) → vue corrigée Task 32.
- **R41** (cosmétique) → Phase applicative.
- **R42** (`services/recommande`) → Phase applicative.

Une table récap des risques figure en fin de plan (Task 34 self-review).

---

## File Structure (vue d'ensemble des migrations)

| # | Fichier | Responsabilité | Blueprint |
|---|---|---|---|
| 0001 | `supabase/migrations/0001_extensions.sql` | extensions PG | conventions |
| 0002 | `supabase/migrations/0002_enums_finance.sql` | enums finance (02) | ENUMS §6.1 |
| 0003 | `supabase/migrations/0003_enums_domaines.sql` | enums 01/03/04/05/06/07/08 + fusions | ENUMS §1/§6 |
| 0004 | `supabase/migrations/0004_work_domain.sql` | table réf `work_domain` + seed | 07 §1.12 |
| 0005 | `supabase/migrations/0005_set_updated_at.sql` | fonction trigger horodatage consolidée | INVENTAIRE §N |
| 0006 | `supabase/migrations/0006_cabinets.sql` | tenant racine `cabinets` | 01 §1.0 |
| 0007 | `supabase/migrations/0007_copros_buildings.sql` | `copros` (cabinet_id NOT NULL) + `buildings` | 01 §1.1-1.2 |
| 0008 | `supabase/migrations/0008_lots.sql` | `lots` (sans tantiemes_*) | 01 §1.3 |
| 0009 | `supabase/migrations/0009_repartition_keys.sql` | `repartition_keys` + `repartition_key_lines` | 01 §1.6-1.7 |
| 0010 | `supabase/migrations/0010_coproprietaires_lot_owners.sql` | `coproprietaires` + `lot_owners` | 01 §1.4-1.5 |
| 0011 | `supabase/migrations/0011_profiles_memberships_invitations.sql` | `profiles` + `memberships` + `copro_invitations` | 01 §1.8-1.10 |
| 0012 | `supabase/migrations/0012_accounts.sql` | plan comptable `accounts` | 02 §1.1 |
| 0013 | `supabase/migrations/0013_ledger.sql` | `ledger_transactions` + `ledger_entries` + `accounting_periods` + `period_cutoff_items` | 02 §1.2-1.5 |
| 0013b | `supabase/migrations/0013b_finance_periph.sql` | `payments` + `payment_allocations` + `bank_movements` + `bank_matches` + `treasury_advances` + `collective_loans*` | 02 §1.6-1.11 |
| 0014 | `supabase/migrations/0014_tiers.sql` | entité fusionnée `tiers` + vue `tiers_directory` | 07 §1.1/§1.13 |
| 0015 | `supabase/migrations/0015_budgets_appels.sql` | budgets/appels/impayés/email_templates | 03 |
| 0016 | `supabase/migrations/0016_ag_conseil.sql` | AG + conseil syndical | 04 |
| 0017 | `supabase/migrations/0017_ag_notif_transitoire.sql` | île notifications transitoire | 04 §6.2 / AUTORISATION §5.2.1 |
| 0018 | `supabase/migrations/0018_mutations.sql` | mutations/état daté/juridique | 05 |
| 0019 | `supabase/migrations/0019_ged.sql` | documents/GED | 06 |
| 0020 | `supabase/migrations/0020_maintenance.sql` | contrats/OS/factures/assurance/PPT | 07 |
| 0021 | `supabase/migrations/0021_communication.sql` | messagerie/mur/events/mails | 08 |
| 0022 | `supabase/migrations/0022_helpers_authz.sql` | helpers d'autorisation | AUTORISATION §4 |
| 0023 | `supabase/migrations/0023_guards_link.sql` | `link_coproprietaire_account` + gardes RPC dangereuses | AUTORISATION §5.3 |
| 0024 | `supabase/migrations/0024_integrity_triggers.sql` | triggers d'intégrité GL + copro_id + enforce_lot_id_on_45x | 02 §4, INVENTAIRE §P |
| 0025 | `supabase/migrations/0025_views.sql` | vues v_* | 02 §5bis, 05/06/08 §5bis |
| 0026 | `supabase/migrations/0026_rls.sql` | ENABLE/FORCE RLS + bascule env | AUTORISATION §6 |

---

## Task 0: Branche jetable + numérotation

**Files:**
- Aucun fichier SQL (setup MCP).

- [ ] **Step 1: Créer la branche Supabase jetable**

Via MCP : `create_branch` avec `name = "rebaseline-test"` (confirmer le coût si `confirm_cost` requis : `get_cost` type=branch puis `confirm_cost`). Noter le `project_id` de la branche retournée.

- [ ] **Step 2: Vérifier l'état vierge de la branche**

Via MCP `list_tables` (schemas=`["public"]`) sur la branche → attendu : aucune table métier (seulement le socle Supabase `auth.*`/`storage.*`). Via `list_migrations` → attendu : liste vide ou seulement migrations Supabase de base.

- [ ] **Step 3: Vérifier que `supabase/migrations/` existe**

Run: `ls supabase/migrations/ 2>&1 || echo "MISSING"`
Expected: le dossier existe (sinon le créer : `New-Item -ItemType Directory -Force supabase/migrations`).

Critère de TEST : branche `rebaseline-test` créée, public vide, dossier migrations prêt.

- [ ] **Step 4: Commit (placeholder de structure)**

```bash
git checkout -b phase0-db-rebaseline
git add supabase/migrations/.gitkeep 2>$null; git commit -m "chore: init phase0 db rebaseline branch" --allow-empty
```

---

## Task 1: Extensions PostgreSQL

**Files:**
- Create: `supabase/migrations/0001_extensions.sql`

**Source blueprint :** conventions transverses (UUID `gen_random_uuid()`, `gen_random_bytes` pour tokens d'invitation 01 §1.10, full-text FR 06 §1.1).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0001_extensions.sql — extensions requises par le schéma cible
create extension if not exists pgcrypto;      -- gen_random_uuid(), gen_random_bytes (copro_invitations.token)
create extension if not exists "uuid-ossp";   -- compat éventuelle
-- full-text français : géré par to_tsvector('french', ...) — config 'french' livrée par défaut, pas d'extension.
```

- [ ] **Step 2: Appliquer sur la branche**

Via MCP `apply_migration` (name=`0001_extensions`, query=contenu).

- [ ] **Step 3: Vérif structurelle + diff blueprint**

Via `execute_sql` :
```sql
select extname from pg_extension where extname in ('pgcrypto','uuid-ossp') order by extname;
```
Expected: 2 lignes (`pgcrypto`, `uuid-ossp`). Diff vs blueprint : `gen_random_uuid`/`gen_random_bytes` disponibles.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_extensions.sql
git commit -m "feat(db): 0001 extensions PG (pgcrypto)"
```

---

## Task 2: Enums du domaine finance (02)

**Files:**
- Create: `supabase/migrations/0002_enums_finance.sql`

**Source blueprint :** ENUMS §6.1 + 02 §2. `tiers_type` ABANDONNÉ (flags booléens). `account_type` est un enum CONSERVÉ (ENUMS §4) — le créer ici car finance le porte.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0002_enums_finance.sql — enums du grand livre (02 §2, ENUMS §6.1)
create type account_type as enum ('asset','liability','income','expense','equity');
create type ledger_source_type as enum (
  'budget','call_for_funds','payment','supplier_invoice','supplier_payment',
  'bank_movement','transfer','od','opening','closing','manual','opening_balance',
  'opening_onboarding','reclassification','result_allocation','budget_expense',
  'mutation','collective_loan');
create type ledger_tx_status as enum ('draft','posted');
create type ledger_direction as enum ('debit','credit');
create type account_receivable_nature as enum ('current','works','alur','loan','advance','doubtful');
create type cutoff_kind as enum ('CAP','CCA','PCA','PAR');
create type treasury_advance_type as enum ('permanent','special','work_fund');
create type collective_loan_status as enum ('active','repaid','cancelled');
create type period_status as enum ('open','closed','approved');
create type payment_method as enum ('cash','check','transfer','card','direct_debit','other');
create type payment_status as enum ('recorded','reconciled','reversed');
create type bank_movement_status as enum ('unmatched','matched','ignored');
create type bank_match_target_type as enum ('payment','supplier_payment','other');
create type expense_status as enum ('draft','pending_validation','validated','rejected');
create type budget_type as enum ('current','works','alur');
create type budget_status as enum ('draft','submitted','validated','rejected','closed');
create type call_for_funds_status as enum ('draft','issued','partially_paid','paid','cancelled');
create type call_line_status as enum ('unpaid','partial','paid');
create type supplier_invoice_status as enum ('draft','posted','paid','cancelled');
create type transfer_destination as enum ('works','reserve','operating','other');
create type payment_phase_status as enum ('pending','called','paid','overdue');
```

> Note : `payment_method`/`supplier_invoice_status`/`transfer_destination`/`payment_phase_status` valeurs alignées sur le live conservé (ENUMS §4). Si la vérif live (sondage) révèle des labels différents, ajuster avant commit — la liste blanche de `ledger_source_type` et `period_status` (3 val.) fait foi (ENUMS §6.1/§1.3).

- [ ] **Step 2: Appliquer + vérifier**

Via `apply_migration` (name=`0002_enums_finance`). Puis `execute_sql` :
```sql
select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as vals
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname in ('ledger_source_type','period_status','account_receivable_nature')
group by t.typname order by t.typname;
```
Expected: `ledger_source_type` = 18 valeurs (dont `mutation`, `collective_loan`) ; `period_status` = `{open,closed,approved}` ; `account_receivable_nature` = `{current,works,alur,loan,advance,doubtful}`. **Diff** vs ENUMS §6.1.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_enums_finance.sql
git commit -m "feat(db): 0002 enums finance (ledger_source_type, period_status 3 val, nature 45x)"
```

---

## Task 3: Enums des domaines 01/03/04/05/06/07/08

**Files:**
- Create: `supabase/migrations/0003_enums_domaines.sql`

**Source blueprint :** ENUMS §1 (fusions), §6.2-§6.7 (créés), §4 (conservés). Fusions clés : `vote_choice`, `delivery_status` (+queued/clicked), `priority_level`, `membership_role` (3 val.), `document_category` (17 val.), `ag_status` (+archived), `document_visibility` (A4).

- [ ] **Step 1: Écrire la migration (partie 01 + transverses)**

```sql
-- 0003_enums_domaines.sql — enums 01/03/04/05/06/07/08 (ENUMS §1/§4/§6)
-- ── Domaine 01 ──
create type membership_role as enum ('gestionnaire','coproprietaire','platform_admin');
create type lot_type as enum ('appartement','studio','commerce','bureau','cave','parking','garage','local_technique','autre');
create type repartition_basis as enum ('tantiemes','surface','custom');
create type coverage_mode as enum ('all_lots','subset');
create type repartition_category as enum ('general','special','alur');
create type invitation_status as enum ('pending','accepted','revoked','expired');
-- ── Transverses fusionnés ──
create type vote_choice as enum ('for','against','abstention');
create type vote_source as enum ('live','correspondence');
create type priority_level as enum ('low','normal','medium','high','critical');
create type delivery_status as enum ('pending','queued','sent','delivered','opened','clicked','bounced','failed','cancelled');
create type notification_channel as enum ('email','registered_email','postal','registered_postal','hand_delivery');
create type content_visibility as enum ('all_members','council_only','managers_only');
-- ── Domaine 04 (AG / conseil) ──
create type ag_meeting_type as enum ('ordinary','extraordinary','mixed');
create type ag_status as enum ('draft','convoked','in_progress','session_active','closed','pv_generated','pv_signed','pv_sent','finalized','archived');
create type ag_draft_type as enum ('attendance','resolutions','votes','pv','envoi','milestones','other');
create type attendance_type as enum ('present','proxy','correspondence');
create type majority_type as enum ('art24','art25','art25_1','art26','art26_1','unanimity');
create type resolution_type as enum ('budget','accounts','works','contract','council','syndic','other');
create type resolution_status as enum ('draft','pending','voting','voted','approved','rejected','adjourned','withdrawn');
create type ag_action_type as enum ('CREATE_BUDGET','APPROVE_ACCOUNTS','SCHEDULE_BUDGET_PAYMENTS','CREATE_ALUR_FUND','SCHEDULE_ALUR_PAYMENTS','CREATE_WORK_BUDGET','CREATE_EXCEPTIONAL_CALL','ELECT_COUNCIL','APPOINT_SYNDIC','MANAGE_CONTRACT','GRANT_QUITUS','DESIGNATE_BUREAU');
create type correspondence_form_status as enum ('pending','validated','integrated');
create type council_role as enum ('president','secretary','treasurer','member','observer');
create type council_decision_status as enum ('draft','submitted','approved','rejected','archived');
create type council_doc_link_type as enum ('contract','service_order','ag','invoice','budget','other');
```

- [ ] **Step 2: Compléter la migration (domaines 03/05/06/07/08)**

Ajouter à la fin du même fichier :
```sql
-- ── Domaine 03 (budgets/relances) ──
create type reminder_status as enum ('pending','sent','failed','stale','skipped');
-- ── Domaine 05 (mutations) ──
create type mutation_status as enum ('draft','pre_etat_generated','etat_generated','signed','validated','cancelled');
create type mutation_type as enum ('sale','donation','succession','other');
create type mutation_step_key as enum ('demande','pre_etat_date','etat_date','envoi_notaire','signature_acte','cloture_compte');
create type mutation_step_status as enum ('pending','in_progress','completed','skipped');
create type etat_date_type as enum ('pre','final');
create type opposition_status as enum ('pending','opposed','paid','released','contested');
create type legal_proceeding_nature as enum ('litigation','recovery','other');
create type legal_proceeding_status as enum ('pending','in_progress','closed','won','lost');
-- ── Domaine 06 (GED) ──
create type document_category as enum ('pv_ag','convocation','reglement','contrat','facture','devis','diagnostic','assurance','budget','appel_fonds','releve_charges','etat_date','courrier','photo','plan','ordre_service','autre');
create type document_status as enum ('active','archived','deleted');
create type document_source as enum ('manual','ag','finance','maintenance','mutation','system');
create type document_visibility as enum ('gestionnaire_seul','conseil','tous_coproprietaires');
create type document_entity_type as enum ('ag','resolution','service_order','contract','supplier_invoice','mutation','budget','lot','coproprietaire','council','event','other');
create type document_relation_kind as enum ('related','annexe','source','justificatif');
create type technical_doc_type as enum ('dta','dpe_collectif','diagnostic_plomb','diagnostic_electricite','diagnostic_gaz','carnet_entretien','controle_ascenseur','controle_chaufferie','controle_incendie','controle_jeux','garantie_decennale','garantie_biennale','plan_copropriete','reglement_copropriete','etat_descriptif','ppt','dtg','audit_energetique','autre');
-- ── Domaine 07 (maintenance/tiers) ──
create type tiers_category as enum ('syndic','copropriete','externe');
create type logbook_status as enum ('planifiee','en_cours','terminee');
create type contract_status as enum ('draft','active','to_renew','expired','terminated');
create type service_order_type as enum ('classique','urgent','contrat','art18');
create type service_order_origin as enum ('syndic','conseil','coproprietaire','contrat','autre');
create type service_order_status as enum ('draft','sent','awaiting_provider','scheduled','in_progress','completed','closed','cancelled','refused');
create type service_order_event_type as enum ('created','sent','status_change','comment','document','cancelled');
create type intervention_category as enum ('courante','urgente','reglementaire','travaux');
create type intervention_frequency as enum ('once','weekly','monthly','quarterly','biannual','annual');
create type logbook_entry_type as enum ('intervention','controle','incident','maintenance','autre');
create type insurance_sub_type as enum ('multirisque','dommages_ouvrage','rc','protection_juridique','autre');
create type planned_work_status as enum ('identified','voted','scheduled','in_progress','completed','cancelled');
-- ── Domaine 08 (communication) ──
create type message_type as enum ('text','file','system');
create type wall_post_category as enum ('information','urgent','question','event','other');
create type event_type as enum ('ag','reunion_cs','travaux','intervention','fete','autre');
```

> Vigilance (ENUMS §1.2/§4) : `delivery_status` ÉTEND le live (ajoute `queued`,`clicked`) — ici on le crée from scratch (re-baseline), donc la liste complète directement. `correspondence_form_status` = `{pending,validated,integrated}` (≠ delivery_status). Labels `contract_status`/`service_order_status`/etc. à confirmer contre le live conservé (ENUMS §4) ; si divergence, ajuster.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0003_enums_domaines`). Puis :
```sql
select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as vals
from pg_type t join pg_enum e on e.enumtypid=t.oid
where t.typname in ('membership_role','document_category','ag_status','document_visibility','priority_level','vote_choice')
group by t.typname order by t.typname;
```
Expected: `membership_role`=3 val ; `document_category`=17 val (sans correspondance/carnet_entretien/fiche_synthetique) ; `ag_status`=10 val (avec `archived`) ; `document_visibility`=3 val ; `priority_level`=5 val ; `vote_choice`=3 val. **Diff** vs ENUMS §1.4/§3.1/§1.6/§6.5/§1.5/§1.1.

- [ ] **Step 4: Vérifier l'absence des enums abandonnés**

```sql
select typname from pg_type where typname in
('vote_direction','council_vote_choice','mail_delivery_status','mail_campaign_status','mail_recipient_type','ag_notification_type','urgency_level','work_priority','provider_domain','planned_work_type','contract_type','provider_category','document_confidentiality','tiers_type');
```
Expected: 0 ligne (ENUMS §7 — 13 supprimés + `tiers_type` jamais créé).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_enums_domaines.sql
git commit -m "feat(db): 0003 enums domaines 01-08 (fusions vote_choice/priority/delivery, document_visibility A4)"
```

---

## Task 4: Table de référence `work_domain` + seed

**Files:**
- Create: `supabase/migrations/0004_work_domain.sql`

**Source blueprint :** 07 §1.12 + ENUMS §2.1 (28 slugs). Possédée par 07, consommée par FK partout. **Rattache R19** (tiers unique).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0004_work_domain.sql — référentiel corps de métier (07 §1.12, ENUMS §2.1)
create table public.work_domain (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_work_domain_slug unique (slug)
);
create index idx_work_domain_active on public.work_domain (is_active, sort_order);

insert into public.work_domain (slug, label, sort_order) values
 ('plomberie','Plomberie',10),('electricite','Électricité',20),('chauffage','Chauffage',30),
 ('climatisation','Climatisation',40),('ascenseur','Ascenseur',50),('menage','Ménage',60),
 ('espaces_verts','Espaces verts',70),('serrurerie','Serrurerie',80),('peinture','Peinture',90),
 ('toiture','Toiture',100),('facade','Façade',110),('etancheite','Étanchéité',120),
 ('isolation','Isolation',130),('menuiserie','Menuiserie',140),('interphone','Interphone',150),
 ('portail','Portail',160),('securite','Sécurité',170),('securite_incendie','Sécurité incendie',180),
 ('accessibilite','Accessibilité',190),('parking','Parking',200),('assurance','Assurance',210),
 ('juridique','Juridique',220),('architecture','Architecture',230),('eau','Eau',240),
 ('electricite_commune','Électricité commune',250),('syndic','Syndic',260),
 ('maintenance','Maintenance',270),('autre','Autre',999);
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0004_work_domain`). Puis :
```sql
select count(*) as n_slugs from public.work_domain;
select slug from public.work_domain where slug='assurance';  -- requis par insurance_policies (07 §1.9)
```
Expected: `n_slugs`=28 ; slug `assurance` présent. **Diff** vs ENUMS §2.1 (liste exhaustive 28 slugs).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_work_domain.sql
git commit -m "feat(db): 0004 table de reference work_domain + seed 28 slugs (07 §1.12)"
```

---

## Task 5: Fonction trigger `set_updated_at` consolidée

**Files:**
- Create: `supabase/migrations/0005_set_updated_at.sql`

**Source blueprint :** INVENTAIRE §N (consolidation des ~11 variantes en UNE). Référencée par toutes les tables à `updated_at`.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0005_set_updated_at.sql — fonction trigger horodatage unique (INVENTAIRE §N)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0005_set_updated_at`). Puis :
```sql
select proname, prosecdef from pg_proc where proname='set_updated_at';
```
Expected: 1 ligne `set_updated_at`. **Diff** vs INVENTAIRE §N (une seule fonction).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_set_updated_at.sql
git commit -m "feat(db): 0005 set_updated_at() consolidee (INVENTAIRE §N)"
```

---

## Task 6: Tenant racine `cabinets`

**Files:**
- Create: `supabase/migrations/0006_cabinets.sql`

**Source blueprint :** 01 §1.0 (multi-cabinet, A12). **Rattache** la racine de tenance pour R1/R2 (cloisonnement).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0006_cabinets.sql — tenant racine multi-cabinet (01 §1.0)
create table public.cabinets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  siret text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text not null default 'France',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_cabinet_email check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);
create index idx_cabinets_name on public.cabinets (name);
create trigger trg_cabinets_updated before update on public.cabinets
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0006_cabinets`). Puis :
```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='cabinets' order by ordinal_position;
```
Expected: 13 colonnes, `country` NOT NULL default 'France'. **Diff** vs 01 §1.0 (table complète).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_cabinets.sql
git commit -m "feat(db): 0006 cabinets (tenant racine multi-cabinet, 01 §1.0)"
```

---

## Task 7: `copros` (cabinet_id NOT NULL) + `buildings`

**Files:**
- Create: `supabase/migrations/0007_copros_buildings.sql`

**Source blueprint :** 01 §1.1-1.2. `cabinet_id` FK NOT NULL (A12), sans compteurs morts (`lots_count`/`total_tantiemes`/`buildings_count` supprimés), typage `date_reglement`/`annee_construction`/`exercice_debut`.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0007_copros_buildings.sql — copros sous cabinet + buildings (01 §1.1-1.2)
create table public.copros (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete restrict,
  name text not null,
  address text, city text, postal_code text,
  siret text, num_immatriculation text,
  date_reglement date,
  annee_construction int2,
  exercice_debut int2 not null default 1,
  onboarding_step int2 default 0,
  onboarding_max_step int2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_copro_exercice_mois check (exercice_debut between 1 and 12),
  constraint ck_copro_annee check (annee_construction is null or (annee_construction between 1700 and extract(year from now())::int + 5))
);
create index idx_copros_cabinet on public.copros (cabinet_id);
create index idx_copros_name on public.copros (name);
create trigger trg_copros_updated before update on public.copros
  for each row execute function public.set_updated_at();

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  name text not null,
  address text,
  floors_count int2 default 1,
  construction_year int2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_building_annee check (construction_year is null or (construction_year between 1700 and extract(year from now())::int + 5))
);
create index idx_buildings_copro_id on public.buildings (copro_id);
create trigger trg_buildings_updated before update on public.buildings
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0007_copros_buildings`). Puis :
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='copros'
  and column_name in ('lots_count','total_tantiemes','buildings_count');
select is_nullable, data_type from information_schema.columns
where table_schema='public' and table_name='copros' and column_name='cabinet_id';
```
Expected: 1ère requête = 0 ligne (compteurs morts absents) ; 2e = `NO`, `uuid`. **Diff** vs 01 §1.1.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_copros_buildings.sql
git commit -m "feat(db): 0007 copros (cabinet_id NOT NULL, sans compteurs morts) + buildings"
```

---

## Task 8: `lots` (sans tantiemes_*)

**Files:**
- Create: `supabase/migrations/0008_lots.sql`

**Source blueprint :** 01 §1.3. DROP des 4 `tantiemes_*` (dette #1) — la quote-part vit dans `repartition_key_lines`. Trigger `tr_lot_copro_consistency`.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0008_lots.sql — unite de gestion canonique, sans tantiemes_* (01 §1.3)
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  ref text not null,
  type lot_type not null default 'appartement',
  floor int2,
  surface numeric(8,2),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_lots_copro_ref unique (copro_id, ref)
);
create index idx_lots_copro on public.lots (copro_id);
create index idx_lots_building on public.lots (building_id);
create trigger trg_lots_updated before update on public.lots
  for each row execute function public.set_updated_at();

-- integrite : si building_id renseigne, building.copro_id = lot.copro_id
create or replace function public.tr_lot_copro_consistency()
returns trigger language plpgsql as $$
begin
  if new.building_id is not null then
    if (select copro_id from public.buildings where id = new.building_id) <> new.copro_id then
      raise exception 'lot %% : building_id appartient a une autre copro', new.id using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_lot_copro_consistency before insert or update on public.lots
  for each row execute function public.tr_lot_copro_consistency();
revoke execute on function public.tr_lot_copro_consistency() from public, anon, authenticated;
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0008_lots`). Puis :
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='lots' and column_name like 'tantiemes%';
```
Expected: 0 ligne (aucune colonne tantiemes_*). **Diff** vs 01 §1.3 (dette #1 corrigée).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_lots.sql
git commit -m "feat(db): 0008 lots sans tantiemes_* (dette #1, 01 §1.3)"
```

---

## Task 9: `repartition_keys` + `repartition_key_lines`

**Files:**
- Create: `supabase/migrations/0009_repartition_keys.sql`

**Source blueprint :** 01 §1.6-1.7. Source UNIQUE des quotes-parts. Trigger `tr_rkl_copro_consistency` (key.copro = lot.copro = copro).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0009_repartition_keys.sql — cles de charges + poids lot×cle (01 §1.6-1.7)
create table public.repartition_keys (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  name text not null,
  basis repartition_basis not null,
  category repartition_category not null default 'general',
  coverage_mode coverage_mode not null default 'all_lots',
  description text,
  is_active boolean not null default true,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint uq_key_copro_name unique (copro_id, name),
  constraint ck_key_validity check (valid_to is null or valid_to >= valid_from)
);
create index idx_keys_copro_active on public.repartition_keys (copro_id, is_active);

create table public.repartition_key_lines (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.repartition_keys(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  weight numeric(12,4) not null,
  created_at timestamptz not null default now(),
  constraint uq_rkl_key_lot unique (key_id, lot_id),
  constraint ck_rkl_weight check (weight >= 0)
);
create index idx_rkl_copro on public.repartition_key_lines (copro_id);
create index idx_rkl_key on public.repartition_key_lines (key_id);
create index idx_rkl_lot on public.repartition_key_lines (lot_id);

create or replace function public.tr_rkl_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.repartition_keys where id = new.key_id) <> new.copro_id
     or (select copro_id from public.lots where id = new.lot_id) <> new.copro_id then
    raise exception 'rkl %% : key/lot/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_rkl_copro_consistency before insert or update on public.repartition_key_lines
  for each row execute function public.tr_rkl_copro_consistency();
revoke execute on function public.tr_rkl_copro_consistency() from public, anon, authenticated;
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0009_repartition_keys`). Puis :
```sql
select conname from pg_constraint where conrelid='public.repartition_key_lines'::regclass and contype='u';
select tgname from pg_trigger where tgrelid='public.repartition_key_lines'::regclass and not tgisinternal;
```
Expected: contrainte `uq_rkl_key_lot` ; trigger `trg_rkl_copro_consistency`. **Diff** vs 01 §1.7.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_repartition_keys.sql
git commit -m "feat(db): 0009 repartition_keys + key_lines (source unique quotes-parts, 01 §1.7)"
```

---

## Task 10: `coproprietaires` + `lot_owners`

**Files:**
- Create: `supabase/migrations/0010_coproprietaires_lot_owners.sql`

**Source blueprint :** 01 §1.4-1.5. `user_id` câblable (NULL au départ — R15/R16). Triggers intégrité copro + Σshare=100 + unicité primaire actif. **Note :** la FK `coproprietaires.user_id → profiles` est ajoutée en Task 11 (profiles créée après) via ALTER, pour respecter l'ordre.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0010_coproprietaires_lot_owners.sql (01 §1.4-1.5) — user_id FK ajoutee en 0011
create table public.coproprietaires (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  user_id uuid,  -- FK -> profiles ajoutee en 0011 (NULL tant que non invite)
  is_company boolean not null default false,
  company_name text, civility text, first_name text, last_name text,
  email text, phone text, mobile text,
  address_line1 text, address_line2 text, city text, postal_code text,
  country text not null default 'France',
  prefers_email boolean not null default true,
  prefers_paper boolean not null default false,
  is_resident boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_copro_person_company check (is_company = (company_name is not null)),
  constraint ck_copro_email check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);
create index idx_coproprietaires_copro on public.coproprietaires (copro_id);
create index idx_coproprietaires_email on public.coproprietaires (email);
create index idx_coproprietaires_name on public.coproprietaires (last_name, first_name);
create index idx_coproprietaires_user on public.coproprietaires (user_id) where user_id is not null;
create trigger trg_coproprietaires_updated before update on public.coproprietaires
  for each row execute function public.set_updated_at();

create table public.lot_owners (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  coproprietaire_id uuid not null references public.coproprietaires(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  share_percent numeric(6,3) not null default 100,
  is_primary boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint ck_lo_share check (share_percent > 0 and share_percent <= 100),
  constraint ck_lo_dates check (end_date is null or end_date >= start_date),
  constraint uq_active_ownership unique (lot_id, coproprietaire_id, start_date)
);
create unique index uq_lot_primary_active on public.lot_owners (lot_id) where end_date is null and is_primary;
create index idx_lo_active on public.lot_owners (lot_id) where end_date is null;
create index idx_lo_copro_active on public.lot_owners (copro_id, end_date);
create index idx_lo_owner_active on public.lot_owners (coproprietaire_id, end_date);
create index idx_lo_owner_primary on public.lot_owners (coproprietaire_id, is_primary);

-- integrite copro (lot + coproprietaire = meme copro)
create or replace function public.tr_lot_owner_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.lots where id = new.lot_id) <> new.copro_id
     or (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'lot_owner %% : lot/coproprietaire/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_lot_owner_copro_consistency before insert or update on public.lot_owners
  for each row execute function public.tr_lot_owner_copro_consistency();
revoke execute on function public.tr_lot_owner_copro_consistency() from public, anon, authenticated;

-- Σ share_percent des owners actifs d'un lot = 100 (A4 01 §7, indivision coherente)
create or replace function public.tr_lot_owner_shares_sum()
returns trigger language plpgsql as $$
declare v_lot uuid; v_sum numeric;
begin
  v_lot := coalesce(new.lot_id, old.lot_id);
  select coalesce(sum(share_percent),0) into v_sum
  from public.lot_owners where lot_id = v_lot and end_date is null;
  if v_sum > 100.0005 then
    raise exception 'lot %% : Σ share_percent actifs (%%) > 100', v_lot, v_sum using errcode='23514';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_lot_owner_shares_sum after insert or update or delete on public.lot_owners
  for each row execute function public.tr_lot_owner_shares_sum();
revoke execute on function public.tr_lot_owner_shares_sum() from public, anon, authenticated;
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0010_coproprietaires_lot_owners`). Puis :
```sql
select indexname from pg_indexes where tablename='lot_owners' and indexname='uq_lot_primary_active';
select tgname from pg_trigger where tgrelid='public.lot_owners'::regclass and not tgisinternal order by tgname;
```
Expected: index partiel `uq_lot_primary_active` présent ; triggers `trg_lot_owner_copro_consistency`, `trg_lot_owner_shares_sum`. **Diff** vs 01 §1.4.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0010_coproprietaires_lot_owners.sql
git commit -m "feat(db): 0010 coproprietaires + lot_owners (1 primaire actif/lot, Σshare=100, 01 §1.4-1.5)"
```

---

## Task 11: `profiles` + `memberships` + `copro_invitations`

**Files:**
- Create: `supabase/migrations/0011_profiles_memberships_invitations.sql`

**Source blueprint :** 01 §1.8-1.10. `profiles.cabinet_id` (rattachement gestionnaire). FK `coproprietaires.user_id → profiles` ajoutée ici. `copro_invitations` = pivot câblage portail (R15/R16). Trigger `handle_new_user`.

- [ ] **Step 1: Écrire la migration (profiles + FK rétroactive)**

```sql
-- 0011_profiles_memberships_invitations.sql (01 §1.8-1.10)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text, phone text, avatar_url text,
  cabinet_id uuid references public.cabinets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_email on public.profiles (email);
create index idx_profiles_cabinet on public.profiles (cabinet_id) where cabinet_id is not null;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- FK retroactive coproprietaires.user_id -> profiles (table profiles existe maintenant)
alter table public.coproprietaires
  add constraint fk_coproprietaires_user foreign key (user_id)
  references public.profiles(id) on delete set null;

-- handle_new_user : cree le profil a la creation d'un auth.users (AUTORISATION §3.2-B)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;
```

- [ ] **Step 2: Compléter (memberships + copro_invitations)**

Ajouter à la fin :
```sql
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  role membership_role not null default 'coproprietaire',
  created_at timestamptz not null default now(),
  constraint uq_membership_user_copro unique (user_id, copro_id)
);
create index idx_memberships_copro on public.memberships (copro_id);
create index idx_memberships_copro_role on public.memberships (copro_id, role);
create index idx_memberships_user on public.memberships (user_id);

create table public.copro_invitations (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  coproprietaire_id uuid not null references public.coproprietaires(id) on delete cascade,
  email text not null,
  token text not null default encode(gen_random_bytes(32),'hex'),
  status invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ck_inv_email check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  constraint ck_inv_accepted check ((status = 'accepted') = (accepted_at is not null)),
  constraint uq_invitation_token unique (token)
);
create unique index uq_invitation_pending_coprop on public.copro_invitations (coproprietaire_id) where status = 'pending';
create index idx_inv_copro on public.copro_invitations (copro_id);
create index idx_inv_coprop on public.copro_invitations (coproprietaire_id);
create index idx_inv_token on public.copro_invitations (token);
create index idx_inv_pending on public.copro_invitations (copro_id, status) where status = 'pending';

create or replace function public.tr_invitation_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'invitation %% : coproprietaire d''une autre copro', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_invitation_copro_consistency before insert or update on public.copro_invitations
  for each row execute function public.tr_invitation_copro_consistency();
revoke execute on function public.tr_invitation_copro_consistency() from public, anon, authenticated;
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0011_profiles_memberships_invitations`). Puis :
```sql
select conname from pg_constraint where conrelid='public.coproprietaires'::regclass and conname='fk_coproprietaires_user';
select indexname from pg_indexes where tablename='copro_invitations' and indexname='uq_invitation_pending_coprop';
select count(*) from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created';
```
Expected: FK `fk_coproprietaires_user` présente ; index partiel `uq_invitation_pending_coprop` ; trigger `on_auth_user_created`=1. **Diff** vs 01 §1.8-1.10.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0011_profiles_memberships_invitations.sql
git commit -m "feat(db): 0011 profiles (cabinet_id) + memberships + copro_invitations + handle_new_user"
```

---

## Task 12: Plan comptable `accounts`

**Files:**
- Create: `supabase/migrations/0012_accounts.sql`

**Source blueprint :** 02 §1.1. `nature` (45x), `is_postable`, sans `parent_id`. CHECK `ck_nature_only_on_45x`. **Rattache R9/R10/R17** (soldes réels dérivés du plan comptable).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0012_accounts.sql — plan de comptes par copro (02 §1.1)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  code text not null,
  name text not null,
  account_type account_type not null,
  nature account_receivable_nature,
  is_active boolean not null default true,
  is_system boolean not null default false,
  is_postable boolean not null default true,
  description text,
  iban text, bic text, bank_name text,
  initial_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_accounts_copro_code unique (copro_id, code),
  constraint ck_nature_only_on_45x check (nature is null or code like '45%')
);
create index idx_accounts_copro on public.accounts (copro_id);
create index idx_accounts_class on public.accounts (copro_id, left(code,1));
create index idx_accounts_type on public.accounts (copro_id, account_type);
create index idx_accounts_nature on public.accounts (copro_id, nature) where nature is not null;
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0012_accounts`). Puis :
```sql
select conname from pg_constraint where conrelid='public.accounts'::regclass and conname='ck_nature_only_on_45x';
select column_name from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='parent_id';
```
Expected: CHECK `ck_nature_only_on_45x` présent ; 2e requête = 0 ligne (pas de `parent_id`). **Diff** vs 02 §1.1.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0012_accounts.sql
git commit -m "feat(db): 0012 accounts (nature 45x, is_postable, sans parent_id, 02 §1.1)"
```

---

## Task 13: Grand livre — `ledger_transactions` + `ledger_entries` + `accounting_periods` + `period_cutoff_items`

**Files:**
- Create: `supabase/migrations/0013_ledger.sql`

**Source blueprint :** 02 §1.2-1.5. Cœur GL. Index idempotence partiels (dont `uq_ledger_tx_result_allocation`). `accounting_periods` avec UNIQUE partiel `(copro_id) WHERE status='open'` (remplace trigger). `period_cutoff_items.tiers_id` (FK ajoutée en Task 14 après `tiers`). **Rattache R6** (compta engagement). Triggers d'immutabilité posés en Task 24 (intégrité groupée).

- [ ] **Step 1: Écrire la migration (periods + transactions)**

```sql
-- 0013_ledger.sql — coeur grand livre (02 §1.2-1.5)
create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  name text not null,
  start_date date not null,
  end_date date not null,
  status period_status not null default 'open',
  closed_at timestamptz, closed_by uuid references public.profiles(id),
  approved_at timestamptz, approved_by uuid references public.profiles(id),
  approval_notes text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_dates check (end_date > start_date),
  constraint uq_period_copro_name unique (copro_id, name)
);
create unique index uq_period_single_open on public.accounting_periods (copro_id) where status = 'open';
create trigger trg_periods_updated before update on public.accounting_periods
  for each row execute function public.set_updated_at();

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  period_id uuid not null references public.accounting_periods(id) on delete restrict,
  tx_date date not null default current_date,
  source_type ledger_source_type not null,
  source_id uuid,
  label text not null,
  status ledger_tx_status not null default 'draft',
  created_by uuid references public.profiles(id),
  posted_by uuid references public.profiles(id),
  posted_at timestamptz,
  metadata jsonb not null default '{}',
  constraint ck_posted_consistency check (
    (status='draft' and posted_at is null and posted_by is null)
    or (status='posted' and posted_at is not null))
);
create unique index uq_ledger_tx_closing on public.ledger_transactions (copro_id, source_id, period_id) where source_type='closing';
create unique index uq_ledger_tx_opening_balance on public.ledger_transactions (copro_id, source_id, period_id) where source_type='opening_balance';
create unique index uq_ledger_tx_opening_onboarding on public.ledger_transactions (copro_id, source_id, period_id) where source_type='opening_onboarding';
create unique index uq_ledger_tx_result_allocation on public.ledger_transactions (copro_id, period_id) where source_type='result_allocation';
create index idx_ledger_tx_source on public.ledger_transactions (source_type, source_id) where source_id is not null;
create index idx_ledger_tx_copro_period on public.ledger_transactions (copro_id, period_id);
```

- [ ] **Step 2: Compléter (entries + cutoff)**

Ajouter :
```sql
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tx_id uuid not null references public.ledger_transactions(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete restrict,
  period_id uuid not null references public.accounting_periods(id),
  account_id uuid not null references public.accounts(id) on delete restrict,
  lot_id uuid references public.lots(id) on delete restrict,
  direction ledger_direction not null,
  amount numeric(14,2) not null check (amount > 0),
  entry_label text
);
create index idx_entries_tx on public.ledger_entries (tx_id);
create index idx_entries_account on public.ledger_entries (account_id);
create index idx_entries_cpa on public.ledger_entries (copro_id, period_id, account_id);
create index idx_entries_lot on public.ledger_entries (lot_id) where lot_id is not null;

create table public.period_cutoff_items (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  period_id uuid not null references public.accounting_periods(id),
  kind cutoff_kind not null,
  account_id uuid not null references public.accounts(id),
  counterpart_account_id uuid not null references public.accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  label text,
  tiers_id uuid,  -- FK -> tiers ajoutee en 0014
  auto_reverse boolean not null default true,
  posting_tx_id uuid references public.ledger_transactions(id),
  reversal_tx_id uuid references public.ledger_transactions(id)
);
create index idx_cutoff_copro_period on public.period_cutoff_items (copro_id, period_id);
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0013_ledger`). Puis :
```sql
select indexname from pg_indexes where tablename='accounting_periods' and indexname='uq_period_single_open';
select indexname from pg_indexes where tablename='ledger_transactions' and indexname='uq_ledger_tx_result_allocation';
select column_name from information_schema.columns where table_schema='public' and table_name='accounting_periods' and column_name in ('locked_at','locked_by');
```
Expected: `uq_period_single_open` présent ; `uq_ledger_tx_result_allocation` présent ; 3e requête = 0 ligne (pas de `locked_*`, verrou WP5.2 abandonné). **Diff** vs 02 §1.2-1.4.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0013_ledger.sql
git commit -m "feat(db): 0013 ledger (tx/entries/periods/cutoff, idempotence partielle, single open period, 02 §1.2-1.5)"
```

---

## Task 13b: Finance périphérique — paiements, banque, avances, emprunts

**Files:**
- Create: `supabase/migrations/0013b_finance_periph.sql`

**Source blueprint :** 02 §1.6-1.11. `payments` (lot-centric NOT NULL), `payment_allocations`, `bank_movements` (period_id nullable A15, sans account_code/category), `bank_matches`, `treasury_advances` (sans owner_id), `collective_loans`/`_shares`. **Rattache R39** (faux-morts emprunt/avances).

- [ ] **Step 1: Écrire la migration (payments + allocations + bank)**

```sql
-- 0013b_finance_periph.sql (02 §1.6-1.11)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  period_id uuid not null references public.accounting_periods(id),
  lot_id uuid not null references public.lots(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  method payment_method not null,
  reference text,
  status payment_status not null default 'recorded',
  ledger_tx_id uuid references public.ledger_transactions(id),
  created_by uuid references public.profiles(id),
  idempotency_key text
);
create unique index ux_payments_idempotency on public.payments (copro_id, idempotency_key) where idempotency_key is not null;
create index idx_payments_lot on public.payments (lot_id);
create index idx_payments_copro_period on public.payments (copro_id, period_id);

-- payment_allocations : FK call_line_id ajoutee en 0015 (call_for_funds_lines)
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete cascade,
  call_line_id uuid not null,  -- FK -> call_for_funds_lines ajoutee en 0015
  amount_allocated numeric(14,2) not null check (amount_allocated > 0),
  constraint uq_alloc_payment_line unique (payment_id, call_line_id)
);
create index idx_alloc_payment on public.payment_allocations (payment_id);
create index idx_alloc_line on public.payment_allocations (call_line_id);

create table public.bank_movements (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  period_id uuid references public.accounting_periods(id),  -- nullable (A15)
  bank_date date not null,
  value_date date,
  amount_signed numeric(14,2) not null,
  label text, bank_ref text,
  status bank_movement_status not null default 'unmatched',
  account_id uuid not null references public.accounts(id)
);
create index idx_bank_mov_copro on public.bank_movements (copro_id);

create table public.bank_matches (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  bank_movement_id uuid not null references public.bank_movements(id) on delete cascade,
  target_type bank_match_target_type not null,
  target_id uuid,
  amount_matched numeric(14,2) not null check (amount_matched > 0),
  matched_at timestamptz not null default now(),
  matched_by uuid references public.profiles(id)
);
create index idx_bank_matches_mov on public.bank_matches (bank_movement_id);
```

- [ ] **Step 2: Compléter (treasury_advances + collective_loans)**

Ajouter :
```sql
create table public.treasury_advances (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  lot_id uuid not null references public.lots(id),
  advance_type treasury_advance_type not null,
  label text,
  amount_due numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0
);
create index idx_treasury_lot on public.treasury_advances (lot_id);

create table public.collective_loans (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  label text, lender text,
  total_amount numeric(14,2), remaining_amount numeric(14,2),
  annual_payment numeric(14,2), interest_rate numeric(6,3),
  start_date date, end_date date,
  status collective_loan_status not null default 'active',
  ledger_tx_id uuid references public.ledger_transactions(id)
);
create table public.collective_loan_shares (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.collective_loans(id) on delete cascade,
  lot_id uuid not null references public.lots(id),
  share_amount numeric(14,2), remaining_amount numeric(14,2),
  last_payment_date date,
  constraint uq_loan_lot unique (loan_id, lot_id)
);
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0013b_finance_periph`). Puis :
```sql
select is_nullable from information_schema.columns where table_schema='public' and table_name='bank_movements' and column_name='period_id';
select column_name from information_schema.columns where table_schema='public' and table_name='treasury_advances' and column_name='owner_id';
select column_name from information_schema.columns where table_schema='public' and table_name='bank_movements' and column_name in ('account_code','account_category');
```
Expected: `bank_movements.period_id` = `YES` (nullable A15) ; pas de `treasury_advances.owner_id` ; pas de `account_code`/`account_category`. **Diff** vs 02 §1.6-1.10.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0013b_finance_periph.sql
git commit -m "feat(db): 0013b payments/bank/treasury/loans (period_id nullable A15, sans owner_id, 02 §1.6-1.11)"
```

---

> **JALON DE PHASE — Tranche verticale finance.** À ce stade, le socle multi-cabinet + le grand livre complet sont posés et vérifiés sur la branche. Les Tasks 14-22 ajoutent les domaines consommateurs ; Tasks 23-26 verrouillent autorisation/triggers/vues/RLS. **Continuer.**

## Task 14: Entité fusionnée `tiers` + vue `tiers_directory` + FK rétroactives finance

**Files:**
- Create: `supabase/migrations/0014_tiers.sql`

**Source blueprint :** 07 §1.1/§1.11/§1.12/§1.13. Fusion providers+suppliers+notaires par flags booléens (A4 synthèse, `tiers_type` abandonné). RIB porté sur le tiers. `domain_ids uuid[]` + trigger `check_tiers_domain_ids`. Vue `tiers_directory` (RIB masqué, `is_notary=false`, A22). FK rétroactive `period_cutoff_items.tiers_id`. **Rattache R8/R19/R26/R27** (tiers unique, RIB au paiement).

- [ ] **Step 1: Écrire la migration (table tiers)**

```sql
-- 0014_tiers.sql — entite fusionnee tiers (07 §1.1/§1.11)
create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  name text not null,
  is_supplier boolean not null default false,
  is_provider boolean not null default false,
  is_notary boolean not null default false,
  category tiers_category not null default 'externe',
  domain_ids uuid[] not null default '{}',
  siret text, vat_number text, iban text, bic text,
  office_name text, notary_reference text,
  contact_name text, contact_role text,
  email text, phone text, phone_emergency text,
  address text, postal_code text, city text,
  rating_avg numeric(2,1), rating_count integer not null default 0,
  interventions_count integer not null default 0,
  last_intervention_at timestamptz,
  intervention_radius_km integer,
  certifications text[] not null default '{}',
  description text, availability text, internal_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_tiers_name unique (copro_id, name),
  constraint ck_tiers_rating check (rating_avg is null or rating_avg between 0 and 5),
  constraint ck_tiers_role check (is_supplier or is_provider or is_notary),
  constraint ck_tiers_siret check (siret is null or siret ~ '^[0-9]{14}$')
);
create index idx_tiers_copro on public.tiers (copro_id);
create index idx_tiers_active on public.tiers (copro_id, is_active);
create index idx_tiers_category on public.tiers (copro_id, category);
create index idx_tiers_domains on public.tiers using gin (domain_ids);
create index idx_tiers_supplier on public.tiers (copro_id) where is_supplier;
create index idx_tiers_provider on public.tiers (copro_id) where is_provider;
create index idx_tiers_notary on public.tiers (copro_id) where is_notary;
create trigger trg_tiers_updated before update on public.tiers
  for each row execute function public.set_updated_at();

-- integrite : chaque domain_id existe dans work_domain (FK array non supportee par PG)
create or replace function public.check_tiers_domain_ids()
returns trigger language plpgsql as $$
declare d uuid;
begin
  foreach d in array new.domain_ids loop
    if not exists (select 1 from public.work_domain where id = d) then
      raise exception 'tiers %% : domain_id %% absent de work_domain', new.id, d using errcode='23503';
    end if;
  end loop;
  return new;
end;
$$;
create trigger trg_check_tiers_domain_ids before insert or update on public.tiers
  for each row execute function public.check_tiers_domain_ids();
revoke execute on function public.check_tiers_domain_ids() from public, anon, authenticated;
```

- [ ] **Step 2: Compléter (vue annuaire + FK rétroactive cutoff)**

Ajouter :
```sql
-- vue annuaire copropriétaire : RIB/notes masqués, notaires exclus (07 §1.13, A22)
create view public.tiers_directory with (security_invoker = true) as
select id, copro_id, name, category, domain_ids, vat_number,
       contact_name, contact_role, email, phone, address, postal_code, city,
       rating_avg, rating_count, certifications, description, is_active
from public.tiers
where is_notary = false;

-- FK retroactive : period_cutoff_items.tiers_id -> tiers (02 §1.5)
alter table public.period_cutoff_items
  add constraint fk_cutoff_tiers foreign key (tiers_id)
  references public.tiers(id) on delete set null;
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0014_tiers`). Puis :
```sql
select conname from pg_constraint where conrelid='public.tiers'::regclass and conname='ck_tiers_role';
select column_name from information_schema.columns where table_schema='public' and table_name='tiers' and column_name in ('iban','bic','is_notary');
select definition from pg_views where viewname='tiers_directory';
```
Expected: CHECK `ck_tiers_role` ; colonnes `iban`/`bic`/`is_notary` présentes ; vue `tiers_directory` filtre `is_notary = false` et ne SELECT pas `iban`. **Diff** vs 07 §1.1/§1.13.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0014_tiers.sql
git commit -m "feat(db): 0014 tiers fusion (flags is_supplier/provider/notary, RIB, vue directory masquee, 07 §1.1)"
```

---

## Task 15: Budgets / appels / impayés / email_templates (domaine 03)

**Files:**
- Create: `supabase/migrations/0015_budgets_appels.sql`

**Source blueprint :** 03 §1. `budgets` (UNIQUE partiel validé A17), `budget_lines`, `budget_expenses` (tiers_id, CHECK montant), `call_for_funds` (+ FK rétroactive `payment_allocations.call_line_id`), `call_for_funds_lines` (weight_snapshot), relances, `email_templates` (global), `budget_payment_schedules` + `alur_transfers` (faux-morts CONSERVÉS A8/A5). **Rattache R6/R28/R22**.

- [ ] **Step 1: Écrire la migration (budgets + lines + expenses)**

```sql
-- 0015_budgets_appels.sql (03 §1)
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  period_id uuid not null references public.accounting_periods(id) on delete restrict,
  budget_type budget_type not null,
  status budget_status not null default 'draft',
  version int not null default 1,
  name text, notes text,
  source_ag_id uuid,  -- FK ag_meetings ajoutee en 0016
  created_by uuid references public.profiles(id) on delete set null,
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_budget_version unique (copro_id, period_id, budget_type, version)
);
create unique index uq_budget_one_validated on public.budgets (copro_id, period_id, budget_type) where status='validated';
create index idx_budgets_copro on public.budgets (copro_id);
create index idx_budgets_cpts on public.budgets (copro_id, period_id, budget_type, status);
create trigger trg_budgets_updated before update on public.budgets for each row execute function public.set_updated_at();

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  repartition_key_id uuid not null references public.repartition_keys(id) on delete restrict,
  label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  code text, sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_budget_lines_budget on public.budget_lines (budget_id);
create index idx_budget_lines_account on public.budget_lines (account_id);
create index idx_budget_lines_copro on public.budget_lines (copro_id);
create trigger trg_budget_lines_updated before update on public.budget_lines for each row execute function public.set_updated_at();

create table public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete restrict,
  budget_id uuid not null references public.budgets(id) on delete restrict,
  budget_line_id uuid not null references public.budget_lines(id) on delete restrict,
  label text not null,
  amount numeric(14,2) not null check (amount > 0),
  montant_ht numeric(14,2), taux_tva numeric(5,2),
  tx_date date not null default current_date,
  status expense_status not null default 'draft',
  tiers_id uuid references public.tiers(id) on delete set null,
  piece_jointe uuid,  -- FK documents ajoutee en 0019
  ledger_tx_id uuid references public.ledger_transactions(id),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz, rejection_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_budget_exp_budget on public.budget_expenses (budget_id);
create index idx_budget_exp_date on public.budget_expenses (copro_id, tx_date);
create index idx_budget_exp_status on public.budget_expenses (status);
create trigger trg_budget_exp_updated before update on public.budget_expenses for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Compléter (call_for_funds + lines + FK rétroactive alloc)**

Ajouter :
```sql
create table public.call_for_funds (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  period_id uuid not null references public.accounting_periods(id),
  budget_id uuid references public.budgets(id),
  repartition_key_id uuid references public.repartition_keys(id),  -- toujours NULL (multi-cles)
  label text not null,
  issue_date date not null, due_date date not null,
  trimester int check (trimester between 1 and 4),
  total_amount numeric(14,2) not null check (total_amount > 0),
  status call_for_funds_status not null default 'draft',
  ledger_tx_id uuid references public.ledger_transactions(id),
  issued_at timestamptz, description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_call_idempotent unique (copro_id, period_id, label, issue_date)
);
create index idx_cff_copro_period on public.call_for_funds (copro_id, period_id);
create index idx_cff_due on public.call_for_funds (due_date);
create trigger trg_cff_updated before update on public.call_for_funds for each row execute function public.set_updated_at();

create table public.call_for_funds_lines (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_for_funds(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  lot_id uuid not null references public.lots(id),
  repartition_key_id uuid references public.repartition_keys(id),
  amount_due numeric(14,2) not null check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status call_line_status not null default 'unpaid',
  weight_snapshot numeric,
  constraint uq_call_line_lot_key unique (call_id, lot_id, repartition_key_id),
  constraint ck_call_line_amounts check (amount_paid <= amount_due)
);
create index idx_cff_lines_call on public.call_for_funds_lines (call_id);
create index idx_cff_lines_copro on public.call_for_funds_lines (copro_id, call_id);
create index idx_cff_lines_lot on public.call_for_funds_lines (lot_id);
create index idx_cff_lines_lot_status on public.call_for_funds_lines (lot_id, status);

-- FK retroactive payment_allocations.call_line_id -> call_for_funds_lines (02 §1.7)
alter table public.payment_allocations
  add constraint fk_alloc_call_line foreign key (call_line_id)
  references public.call_for_funds_lines(id) on delete cascade;
```

- [ ] **Step 3: Compléter (relances + email_templates + faux-morts)**

Ajouter :
```sql
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid references public.copros(id) on delete cascade,  -- NULL = systeme global
  code text not null, name text not null, description text,
  subject text not null, body_html text not null, body_text text,
  available_variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true, is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_email_templates_code_scope on public.email_templates (code, copro_id);
create unique index uq_email_templates_code_system on public.email_templates (code) where copro_id is null;
create index idx_email_templates_copro on public.email_templates (copro_id);
create trigger trg_email_templates_updated before update on public.email_templates for each row execute function public.set_updated_at();

create table public.payment_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  delay_days int not null check (delay_days > 0),
  channel notification_channel not null default 'email',
  template_id uuid references public.email_templates(id) on delete set null,
  label text, is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_reminder_rule_delay unique (copro_id, delay_days)
);
create trigger trg_reminder_rules_updated before update on public.payment_reminder_rules for each row execute function public.set_updated_at();

create table public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  lot_id uuid not null references public.lots(id),
  owner_id uuid references public.coproprietaires(id),
  reminder_rule_id uuid references public.payment_reminder_rules(id),
  call_id uuid references public.call_for_funds(id),
  call_line_id uuid references public.call_for_funds_lines(id),
  unpaid_amount numeric(14,2) not null check (unpaid_amount > 0),
  oldest_due_date date, days_overdue int check (days_overdue >= 0),
  delay_level int,
  status reminder_status not null default 'pending',
  delivery_status delivery_status,
  recipient_email text, recipient_name text, provider_message_id text,
  scheduled_at timestamptz, sent_at timestamptz, cancelled_at timestamptz,
  cancelled_reason text, content text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_reminder_lot_delay_active unique (lot_id, delay_level, status)
);
create index idx_reminders_pending on public.payment_reminders (scheduled_at) where status='pending';
create trigger trg_reminders_updated before update on public.payment_reminders for each row execute function public.set_updated_at();

create table public.reminder_settings (
  copro_id uuid primary key references public.copros(id) on delete cascade,
  is_paused boolean not null default false,
  paused_until date, pause_reason text,
  updated_at timestamptz not null default now()
);
create trigger trg_reminder_settings_updated before update on public.reminder_settings for each row execute function public.set_updated_at();

-- faux-morts CONSERVES (A8 / A5)
create table public.budget_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete cascade,
  service_order_id uuid,  -- FK service_orders ajoutee en 0020
  phase_label text, due_date date, amount numeric(14,2),
  status payment_phase_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_bps_updated before update on public.budget_payment_schedules for each row execute function public.set_updated_at();

create table public.alur_transfers (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete set null,
  destination transfer_destination not null,
  amount numeric(14,2) not null, transfer_date date,
  ledger_tx_id uuid references public.ledger_transactions(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_alur_transfers_updated before update on public.alur_transfers for each row execute function public.set_updated_at();
```

- [ ] **Step 4: Appliquer + vérifier**

`apply_migration` (name=`0015_budgets_appels`). Puis :
```sql
select indexname from pg_indexes where tablename='budgets' and indexname='uq_budget_one_validated';
select conname from pg_constraint where conrelid='public.payment_allocations'::regclass and conname='fk_alloc_call_line';
select count(*) from information_schema.tables where table_schema='public' and table_name in ('budget_payment_schedules','alur_transfers');
```
Expected: `uq_budget_one_validated` (A17) ; FK `fk_alloc_call_line` ; 2 tables faux-mortes présentes. **Diff** vs 03 §1.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0015_budgets_appels.sql
git commit -m "feat(db): 0015 budgets/appels/relances/email_templates + faux-morts schedules/alur (03 §1)"
```

---

## Task 16: AG + conseil syndical (domaine 04)

**Files:**
- Create: `supabase/migrations/0016_ag_conseil.sql`

**Source blueprint :** 04 §1.1-1.9. `ag_meetings`, `ag_resolutions` (sans 8 compteurs A19), `ag_votes` (UNIQUE unique), `ag_attendance` (mandat fusionné A10), correspondance, `ag_pending_actions` (CHECK liste blanche), `ag_session_drafts`, `ag_envoi_tracking`, conseil (`council_*`). FK rétroactive `budgets.source_ag_id`. **Rattache R5/R7/R25**. *(Réécriture `cast_vote`/`prepare_ag_decisions` = lot fonctions, hors schéma pur.)*

- [ ] **Step 1: Écrire la migration (ag_meetings + resolutions + votes)**

Reproduire intégralement les tables `ag_meetings` (04 §1.1, avec CHECK `current_step`/`max_step_reached` 1..9, `wizard_mode IN ('guided','expert')`), `ag_resolutions` (04 §1.2, SANS les 8 compteurs ni `vote_details`/`is_approved` ; `action_type ag_action_type` ; CHECK passerelle), `ag_votes` (04 §1.3, UNIQUE `(resolution_id, coproprietaire_id)` unique). FK : `ag_meetings.copro_id → copros CASCADE`, `president_id/scrutineer*_id → coproprietaires SET NULL`, `secretary_id/created_by → profiles SET NULL`, `pv_document_id` (FK documents ajoutée Task 19). Triggers `set_updated_at`. Le détail colonne-par-colonne suit 04 §1.1-1.3 (déjà cité dans le blueprint, le reproduire à l'identique).

```sql
-- 0016_ag_conseil.sql (04 §1) — extrait pivot ; reproduire 04 §1.1-1.9 in extenso
create table public.ag_meetings (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  title text not null,
  meeting_type ag_meeting_type not null default 'ordinary',
  meeting_date timestamptz not null,
  location text, convocation_date timestamptz,
  status ag_status not null default 'draft',
  quorum_required boolean not null default true,
  president_id uuid references public.coproprietaires(id) on delete set null,
  president_name text,
  secretary_id uuid references public.profiles(id) on delete set null,
  secretary_name text,
  scrutineer1_id uuid references public.coproprietaires(id) on delete set null, scrutineer1_name text,
  scrutineer2_id uuid references public.coproprietaires(id) on delete set null, scrutineer2_name text,
  session_started_at timestamptz, session_ended_at timestamptz,
  opening_notes text, closing_notes text, incidents text,
  pv_document_id uuid,  -- FK documents ajoutee en 0019
  pv_generated_at timestamptz, pv_sent_at timestamptz, closed_at timestamptz,
  current_step integer default 1, max_step_reached integer default 1,
  step_data jsonb default '{}', wizard_mode text default 'guided',
  remote_meeting_url text, remote_meeting_provider text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ck_ag_current_step check (current_step between 1 and 9),
  constraint ck_ag_max_step check (max_step_reached between 1 and 9),
  constraint ck_ag_wizard_mode check (wizard_mode in ('guided','expert'))
);
create index idx_ag_copro_date on public.ag_meetings (copro_id, meeting_date desc);
create index idx_ag_copro_status on public.ag_meetings (copro_id, status);
create trigger trg_ag_updated before update on public.ag_meetings for each row execute function public.set_updated_at();

-- FK retroactive budgets.source_ag_id -> ag_meetings (03 §1.1)
alter table public.budgets add constraint fk_budgets_source_ag
  foreign key (source_ag_id) references public.ag_meetings(id) on delete set null;
```

Puis ajouter `ag_resolutions`, `ag_votes`, `ag_attendance`, `ag_correspondence_votes`(+`_details`), `ag_pending_actions`, `ag_session_drafts`, `ag_envoi_tracking` exactement selon 04 §1.2-1.8 (incluant `ag_pending_actions.target_table` CHECK `IN ('budgets','call_for_funds','council_members','accounting_periods','copros','contracts')` et `status` CHECK `IN ('pending','activated','failed')` + UNIQUE `(ag_id, resolution_id)`).

- [ ] **Step 2: Compléter (conseil syndical)**

Ajouter `council_members`, `council_decisions` (avec FK `linked_ag_id → ag_meetings SET NULL`, `linked_resolution_id → ag_resolutions SET NULL`), `council_votes` (UNIQUE `(decision_id, council_member_id)`), `council_documents` (faux-mort GARDÉ, `visibility content_visibility`, `linked_type council_doc_link_type`, UNIQUE `(copro_id, document_id)` ; FK `document_id` ajoutée Task 19) — selon 04 §1.9 in extenso.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0016_ag_conseil`). Puis :
```sql
select column_name from information_schema.columns where table_schema='public' and table_name='ag_resolutions'
  and column_name in ('tantiemes_for','voters_for','is_approved','vote_details');
select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.ag_pending_actions'::regclass and conname like '%target_table%';
select conname from pg_constraint where conrelid='public.budgets'::regclass and conname='fk_budgets_source_ag';
```
Expected: 1ère requête = 0 ligne (8 compteurs A19 supprimés) ; CHECK target_table = liste blanche 6 tables ; FK `fk_budgets_source_ag`. **Diff** vs 04 §1.2/§1.6.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0016_ag_conseil.sql
git commit -m "feat(db): 0016 AG + conseil (sans compteurs A19, pending_actions liste blanche, mandat fusionne A10, 04 §1)"
```

---

## Task 17: Île notifications AG transitoire

**Files:**
- Create: `supabase/migrations/0017_ag_notif_transitoire.sql`

**Source blueprint :** 04 §6.2 + AUTORISATION §5.2.1. Tables `ag_notifications`/`ag_notification_events`/`ag_milestones` — foyer TRANSITOIRE (survivent jusqu'à l'étape 3 = refacto `email_webhook` → `ag_envoi_tracking`). **Rattache R13** (drop séquencé en Phase applicative, JAMAIS ici).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0017_ag_notif_transitoire.sql — foyer TRANSITOIRE (AUTORISATION §5.2.1, R13)
-- A DROPER A L'ETAPE 3 (refacto email_webhook -> ag_envoi_tracking). NE PAS droper en Phase 0.
create table public.ag_notifications (
  id uuid primary key default gen_random_uuid(),
  ag_id uuid not null references public.ag_meetings(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  coproprietaire_id uuid references public.coproprietaires(id) on delete set null,
  channel notification_channel,
  status delivery_status not null default 'queued',
  provider_ref text, error_message text,
  sent_at timestamptz, created_at timestamptz not null default now()
);
create index idx_ag_notif_copro on public.ag_notifications (copro_id);

create table public.ag_notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.ag_notifications(id) on delete cascade,
  copro_id uuid,
  event_type text, payload jsonb default '{}',
  occurred_at timestamptz, created_at timestamptz not null default now()
);

create table public.ag_milestones (
  id uuid primary key default gen_random_uuid(),
  ag_id uuid not null references public.ag_meetings(id) on delete cascade,
  copro_id uuid not null references public.copros(id) on delete cascade,
  milestone_key text, due_date date, done boolean default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger trg_ag_milestones_updated before update on public.ag_milestones for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Appliquer + vérifier**

`apply_migration` (name=`0017_ag_notif_transitoire`). Puis :
```sql
select table_name from information_schema.tables where table_schema='public'
  and table_name in ('ag_notifications','ag_notification_events','ag_milestones') order by table_name;
```
Expected: 3 tables transitoires. **Diff** vs 04 §6.2 (schéma minimal de survie).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0017_ag_notif_transitoire.sql
git commit -m "feat(db): 0017 ile notifications AG TRANSITOIRE (drop sequence etape 3, R13)"
```

---

## Task 18: Mutations / état daté / juridique (domaine 05)

**Files:**
- Create: `supabase/migrations/0018_mutations.sql`

**Source blueprint :** 05 §1.1-1.4. `mutations` (notaire_id → tiers, sans buyer_name/notary_*), `mutation_steps` (gardée A21), `etat_date_snapshots` (3 parties art.5, immuable), `mutation_oppositions` (art.20), `legal_proceedings` (lot-centric, RGPD A14). Triggers intégrité copro + immutabilité état daté. **Rattache R10**. *(FK `document_id` vers documents ajoutée Task 19.)*

- [ ] **Step 1: Écrire la migration (mutations + steps)**

Reproduire `mutations` (05 §1.1, FK `notaire_id → tiers(id) SET NULL`, `lot_id → lots RESTRICT`, CHECK `ck_mut_dates`/`ck_mut_cancelled`/`ck_mut_seller_buyer_distinct`, UNIQUE partiel `uq_mutations_active_lot`) et `mutation_steps` (05 §1.2, `completed_by → profiles`, CHECK `ck_step_completed`, UNIQUE `uq_mutation_step`). Triggers `set_updated_at` + `tr_mutation_init_steps` (AFTER INSERT, seed 6 steps via `initialize_mutation_steps()`) + `tr_mutation_copro_consistency` + `tr_mutation_step_copro_consistency`.

```sql
-- 0018_mutations.sql (05 §1) — extrait ; reproduire 05 §1.1-1.4 in extenso
create table public.mutations (
  id uuid primary key default gen_random_uuid(),
  copro_id uuid not null references public.copros(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete restrict,
  period_id uuid references public.accounting_periods(id) on delete restrict,
  status mutation_status not null default 'draft',
  mutation_type mutation_type not null default 'sale',
  seller_owner_id uuid not null references public.coproprietaires(id) on delete restrict,
  buyer_owner_id uuid references public.coproprietaires(id) on delete restrict,
  notaire_id uuid references public.tiers(id) on delete set null,
  requested_at timestamptz not null default now(),
  signature_date date, effective_date date,
  cancelled_at timestamptz, cancel_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ck_mut_dates check (signature_date is null or effective_date is null or effective_date >= signature_date),
  constraint ck_mut_cancelled check ((status='cancelled') = (cancelled_at is not null)),
  constraint ck_mut_seller_buyer_distinct check (buyer_owner_id is null or buyer_owner_id <> seller_owner_id)
);
create unique index uq_mutations_active_lot on public.mutations (lot_id)
  where status in ('draft','pre_etat_generated','etat_generated','signed');
create index idx_mutations_copro_status on public.mutations (copro_id, status);
create trigger trg_mutations_updated before update on public.mutations for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Compléter (etat_date_snapshots + oppositions + legal)**

Ajouter `etat_date_snapshots` (05 §1.3, CHECK `ck_etat_date_payload_parts` sur les 3 clés payload, trigger `tr_etat_date_immutable` BEFORE U/D RAISE), `mutation_oppositions` (05 §1.3bis, art.20, CHECK `ck_opp_deadline = avis+15`), `legal_proceedings` (05 §1.4, `lot_id`/`debtor_owner_id`, CHECK `ck_legal_recovery_target`). Tous les triggers `tr_*_copro_consistency` + `set_updated_at`. Fonction `initialize_mutation_steps()` (trigger) seedant les 6 steps.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0018_mutations`). Puis :
```sql
select conname from pg_constraint where conrelid='public.etat_date_snapshots'::regclass and conname='ck_etat_date_payload_parts';
select conname from pg_constraint where conrelid='public.legal_proceedings'::regclass and conname='ck_legal_recovery_target';
select tgname from pg_trigger where tgrelid='public.etat_date_snapshots'::regclass and tgname='trg_etat_date_immutable';
```
Expected: CHECK 3 parties ; CHECK recovery lot-centric ; trigger immutabilité. **Diff** vs 05 §1.3/§1.4.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0018_mutations.sql
git commit -m "feat(db): 0018 mutations/etat-date 3 parties/opposition art20/juridique lot-centric (05 §1)"
```

---

## Task 19: Documents / GED (domaine 06)

**Files:**
- Create: `supabase/migrations/0019_ged.sql`

**Source blueprint :** 06 §1 (5 tables). `documents` (`visibility` A4, SANS les 8 `*_id` morts ni versioning parallèle), `document_folders`, `document_relations` (polymorphe typé), `document_versions` (immuable, source unique A9), `technical_documents`. **document_access NON créée (A4, R12).** FK rétroactives vers `documents` (budget_expenses.piece_jointe, ag_meetings.pv_document_id, council_documents.document_id, mutations/etat_date document_id). **Rattache R12**.

- [ ] **Step 1: Écrire la migration (documents + folders)**

Reproduire `documents` (06 §1.1, colonnes nettoyées, `visibility document_visibility NOT NULL DEFAULT 'gestionnaire_seul'`, `current_version_no`, UNIQUE `uq_documents_copro_path`, index GIN tags/search_text, triggers expiration/search/copro_consistency) et `document_folders` (06 §1.2, CHECK `ck_no_self_parent`, trigger updated_at). Les fonctions triggers `calculate_document_expiration`/`update_document_search_text`/`prevent_protected_document_deletion` sont définies ici (corps selon 06 §4 ; déterministes).

- [ ] **Step 2: Compléter (relations + versions + technical + FK rétroactives)**

Ajouter `document_relations` (06 §1.3, enum `entity_type`/`relation_kind`, UNIQUE `(document_id, entity_type, entity_id)`, trigger `trg_relation_copro_consistency`), `document_versions` (06 §1.4, UNIQUE `(document_id, version_number)`, trigger immutabilité `trg_version_no_update`), `technical_documents` (06 §1.5, `document_id NOT NULL`, sans `storage_path`). Puis FK rétroactives :
```sql
-- FK retroactives vers documents (cibles posees apres documents)
alter table public.budget_expenses add constraint fk_be_piece foreign key (piece_jointe) references public.documents(id) on delete set null;
alter table public.ag_meetings add constraint fk_ag_pv_doc foreign key (pv_document_id) references public.documents(id) on delete set null;
alter table public.council_documents add constraint fk_council_doc foreign key (document_id) references public.documents(id) on delete cascade;
alter table public.etat_date_snapshots add constraint fk_etatdate_doc foreign key (document_id) references public.documents(id) on delete set null;
```
> Note : si une colonne `document_id` d'une table AG/mutation a déjà sa FK posée dans sa migration source, ne pas la redéclarer ici. Vérifier au moment de l'écriture quelles FK restent à poser (celles dont la cible `documents` n'existait pas encore). Les FK `ag_correspondence_votes.form_document_id`, `ag_attendance.proxy_document_id`, `ag_envoi_tracking.document_id`, `mutations`/`logbook_entries.document_id` suivent le même schéma rétroactif.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0019_ged`). Puis :
```sql
select count(*) from information_schema.tables where table_schema='public' and table_name='document_access';
select column_name from information_schema.columns where table_schema='public' and table_name='documents' and column_name='visibility';
select column_name from information_schema.columns where table_schema='public' and table_name='documents' and column_name in ('ag_id','contract_id','parent_document_id','is_current_version');
```
Expected: `document_access` = 0 (A4, jamais créée) ; `documents.visibility` présent ; 3e requête = 0 ligne (colonnes mortes absentes). **Diff** vs 06 §1.1.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0019_ged.sql
git commit -m "feat(db): 0019 GED 5 tables (visibility A4, sans document_access, versioning unique A9, 06 §1)"
```

---

## Task 20: Maintenance / contrats / OS / factures / assurance / PPT (domaine 07)

**Files:**
- Create: `supabase/migrations/0020_maintenance.sql`

**Source blueprint :** 07 §1.2-1.10. `contracts`/`service_orders`/`service_order_events`/`logbook_entries`/`supplier_invoices`/`supplier_invoice_lines`/`supplier_payments`/`insurance_policies`/`planned_works`. FK vers `tiers`, `work_domain`, `ag_meetings`/`ag_resolutions`. FK rétroactive `budget_payment_schedules.service_order_id`. **Rattache R8/R19/R27**.

- [ ] **Step 1: Écrire la migration (contracts + service_orders + events + logbook)**

Reproduire `contracts` (07 §1.2, `tiers_id`, `domain_id → work_domain`, trigger `check_contract_tiers_copro`), `service_orders` (07 §1.3, `tiers_id`, `urgency priority_level`, SANS `supplier_invoice_id`, trigger intégrité copro), `service_order_events` (07 §1.4, append-only, pas UPDATE/DELETE), `logbook_entries` (07 §1.5, `status logbook_status`, `domain_id`, trigger `trg_update_provider_stats` ciblant `tiers`).

- [ ] **Step 2: Compléter (factures + paiements + assurance + PPT)**

Ajouter `supplier_invoices` (07 §1.6, `tiers_id`, `service_order_id → service_orders SET NULL`, `ledger_tx_id → ledger_transactions RESTRICT`, UNIQUE `uq_supplier_invoice_num`), `supplier_invoice_lines` (07 §1.7, `account_id`/`repartition_key_id`), `supplier_payments` (07 §1.8, idempotency), `insurance_policies` (07 §1.9, trigger intégrité slug `assurance`), `planned_works` (07 §1.10, `domain_id`, `ag_id → ag_meetings SET NULL`, `resolution_id → ag_resolutions SET NULL`, `priority priority_level`). Puis :
```sql
-- FK retroactive budget_payment_schedules.service_order_id -> service_orders (03 §1.9)
alter table public.budget_payment_schedules add constraint fk_bps_service_order
  foreign key (service_order_id) references public.service_orders(id) on delete set null;
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0020_maintenance`). Puis :
```sql
select column_name from information_schema.columns where table_schema='public' and table_name='service_orders' and column_name='supplier_invoice_id';
select conname from pg_constraint where conrelid='public.supplier_invoices'::regclass and conname='uq_supplier_invoice_num';
select data_type from information_schema.columns where table_schema='public' and table_name='logbook_entries' and column_name='status';
```
Expected: pas de `service_orders.supplier_invoice_id` (sens unique) ; UNIQUE facture ; `logbook_entries.status` type `USER-DEFINED` (enum `logbook_status`). **Diff** vs 07 §1.3/§1.5/§1.6.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0020_maintenance.sql
git commit -m "feat(db): 0020 maintenance (contrats/OS/factures→tiers, logbook_status enum, PPT FK AG, 07 §1)"
```

---

## Task 21: Communication — messagerie / mur / events / mails (domaine 08)

**Files:**
- Create: `supabase/migrations/0021_communication.sql`

**Source blueprint :** 08 §1 (8 tables). `conversations`/`conversation_members`/`messages` (sans snapshots, `message_type` enum, PAS de updated_at sur messages), `wall_posts`/`wall_comments`/`wall_likes` (compteurs + triggers), `events` (FK `linked_ag_id`/`linked_service_order_id`), `mails` (Resend, GARDÉE, owner_id RESTRICT). **Île campagnes mail_* JAMAIS créée (R32).** Triggers compteurs + intégrité copro. **Rattache R38** (compteurs DB) **R32** (campagnes absentes).

- [ ] **Step 1: Écrire la migration (messagerie)**

Reproduire `conversations`/`conversation_members` (UNIQUE membre, CHECK `unread_count>=0`, trigger `trg_member_copro_consistency`)/`messages` (08 §1.1-1.3 ; `message_type message_type NOT NULL DEFAULT 'text'`, `attachment_id`/`reply_to_id` self, `read_by uuid[]`, `edited_at`, **PAS de colonne `updated_at` ni de trigger set_updated_at**, trigger `trg_message_copro_consistency` + `trg_conversation_last_message`).

- [ ] **Step 2: Compléter (mur + events + mails)**

Ajouter `wall_posts` (08 §1.4, SANS `author_role`/`author_name`, compteurs `likes_count`/`comments_count`, trigger `set_updated_at`), `wall_comments` (08 §1.5, self-parent, trigger compteur), `wall_likes` (08 §1.6, UNIQUE `(post_id,user_id)`, trigger compteur), `events` (08 §1.7, FK `linked_ag_id → ag_meetings SET NULL`, `linked_service_order_id → service_orders SET NULL`, trigger `trg_event_copro_consistency`), `mails` (08 §1.8, `owner_id → profiles RESTRICT`, `in_reply_to` self, trigger `trg_mail_copro_consistency` + `set_updated_at`). Fonctions triggers compteurs `update_conversation_last_message`/`update_wall_post_comments_count`/`update_wall_post_likes_count` définies ici (corps selon 08 §4).

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0021_communication`). Puis :
```sql
select column_name from information_schema.columns where table_schema='public' and table_name='messages' and column_name='updated_at';
select column_name from information_schema.columns where table_schema='public' and table_name='wall_posts' and column_name='author_role';
select count(*) from information_schema.tables where table_schema='public' and table_name in ('mail_campaigns','mail_recipients','mail_inbox','mail_templates','mail_folders','mail_labels_v2');
select count(*) from information_schema.tables where table_schema='public' and table_name='mails';
```
Expected: pas de `messages.updated_at` (R38 bug corrigé) ; pas de `wall_posts.author_role` ; île campagnes = 0 (R32) ; `mails` = 1 (GARDÉE). **Diff** vs 08 §1.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0021_communication.sql
git commit -m "feat(db): 0021 communication 8 tables (mails garde, campagnes absentes R32, messages sans updated_at)"
```

---

## Task 22: Helpers d'autorisation

**Files:**
- Create: `supabase/migrations/0022_helpers_authz.sql`

**Source blueprint :** AUTORISATION §4 + INVENTAIRE §F/§P. `is_service_call`, `user_is_platform_admin`, `user_has_copro_access`/`user_is_copro_manager` (périmètre cabinet inline), helpers lot/conseil/conversation/visibilité. **Rattache R1/R2/R3** (gardes deny-by-default). Tous DEFINER, STABLE, search_path=public, FALSE si `auth.uid()` NULL.

- [ ] **Step 1: Écrire la migration (cœur autz)**

```sql
-- 0022_helpers_authz.sql (AUTORISATION §4)
create or replace function public.is_service_call()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role','anon') = 'service_role';
$$;

create or replace function public.user_is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.role='platform_admin');
$$;

create or replace function public.user_is_copro_manager(p_copro_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.user_is_platform_admin()
    or exists (
      select 1 from public.memberships m
      join public.copros c on c.id = m.copro_id
      join public.profiles pr on pr.id = m.user_id
      where m.user_id = auth.uid() and m.copro_id = p_copro_id
        and m.role = 'gestionnaire' and pr.cabinet_id = c.cabinet_id));
$$;

create or replace function public.user_has_copro_access(p_copro_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.user_is_platform_admin()
    or exists (
      select 1 from public.memberships m
      join public.copros c on c.id = m.copro_id
      join public.profiles pr on pr.id = m.user_id
      where m.user_id = auth.uid() and m.copro_id = p_copro_id
        and (m.role <> 'gestionnaire' or pr.cabinet_id = c.cabinet_id))
    or exists (
      select 1 from public.lot_owners lo
      join public.coproprietaires co on co.id = lo.coproprietaire_id
      where co.user_id = auth.uid() and lo.copro_id = p_copro_id and lo.end_date is null));
$$;
```

- [ ] **Step 2: Compléter (helpers lot / conseil / conversation / visibilité)**

Ajouter `user_is_lot_owner(p_lot_id)`, `user_is_lot_owner_in_copro(p_copro_id,p_lot_id)`, `user_is_lot_owner_or_manager`, `user_owns_any_lot_in_copro`, `get_user_lot_ids(p_copro_id) returns uuid[]` (lisent `lot_owners`/`coproprietaires.user_id`), `is_council_member(p_copro_id,p_user_id)` (lit `council_members WHERE is_active`), `is_council_president`, `is_conversation_member(p_conversation_id,p_user_id)` (lit `conversation_members WHERE left_at IS NULL`), `can_view_content(p_copro_id,p_visibility content_visibility,p_user_id)`, `user_can_view_document(p_document_id)` (A4 : lit `documents.visibility` + lot-centric + `is_council_member`, JAMAIS `document_access`). Corps selon AUTORISATION §4 (signatures exactes du tableau). Tous : `security definer set search_path=public`, `revoke execute from anon, public; grant execute to authenticated`.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0022_helpers_authz`). Puis :
```sql
select proname, prosecdef from pg_proc where pronamespace='public'::regnamespace
  and proname in ('is_service_call','user_is_platform_admin','user_has_copro_access','user_is_copro_manager','user_can_view_document','is_council_member')
  order by proname;
-- verifier qu'aucun helper ne reference document_access (A4)
select proname from pg_proc where pronamespace='public'::regnamespace and prosrc ilike '%document_access%';
```
Expected: 6 helpers présents, DEFINER=true (sauf `is_service_call`) ; 2e requête = 0 ligne (R12/A4 : pas de `document_access`). **Diff** vs AUTORISATION §4.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0022_helpers_authz.sql
git commit -m "feat(db): 0022 helpers autz (perimetre cabinet inline, user_can_view_document A4 sans document_access)"
```

---

## Task 23: `link_coproprietaire_account` + gardes des RPC dangereuses (squelette)

**Files:**
- Create: `supabase/migrations/0023_guards_link.sql`

**Source blueprint :** AUTORISATION §3.2-B/§5.3 + INVENTAIRE §P. `link_coproprietaire_account` (câblage user_id, garde email JWT). **Note :** les RPC posteurs GL (`create_ledger_transaction`, `post_owner_payment`…) sont créées dans le lot fonctions (hors Phase 0 schéma pur) ; ce qu'on pose ici = le **patron de garde** documenté + `link_coproprietaire_account` réelle. **Rattache R15/R16** (câblage identité).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0023_guards_link.sql (AUTORISATION §3.2-B) — cablage portail
create or replace function public.link_coproprietaire_account(p_invite_token text)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.copro_invitations%rowtype; v_email text;
begin
  v_email := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
  select * into v_inv from public.copro_invitations
    where token = p_invite_token and status = 'pending' and now() < expires_at;
  if v_inv.id is null then raise exception 'invitation invalide ou expiree' using errcode='42501'; end if;
  if lower(v_inv.email) <> lower(coalesce(v_email,'')) then
    raise exception 'email JWT different de l''email invite' using errcode='42501'; end if;
  update public.coproprietaires set user_id = auth.uid() where id = v_inv.coproprietaire_id;
  insert into public.memberships (user_id, copro_id, role)
    values (auth.uid(), v_inv.copro_id, 'coproprietaire')
    on conflict (user_id, copro_id) do nothing;
  update public.copro_invitations set status='accepted', accepted_at = now() where id = v_inv.id;
end;
$$;
revoke execute on function public.link_coproprietaire_account(text) from public, anon;
grant execute on function public.link_coproprietaire_account(text) to authenticated;
```

- [ ] **Step 2: Documenter le patron de garde (commentaire SQL, pas de RPC GL ici)**

Ajouter en fin de fichier un bloc commentaire reproduisant le patron G-MGR/G-SVC (AUTORISATION §5.1) et la table des 5 fonctions dangereuses (§5.3 : `create_ledger_transaction`, `post_owner_payment`, `post_supplier_invoice`, `post_budget_call_for_funds`, `set_opening_balance`, + `allocate_payment` G-INTERNAL non exposée) — ces fonctions seront créées au lot fonctions avec ces gardes. Tracé ici pour R1/R2/R3.

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0023_guards_link`). Puis :
```sql
select proname, prosecdef from pg_proc where proname='link_coproprietaire_account';
select has_function_privilege('anon','public.link_coproprietaire_account(text)','execute') as anon_can;
```
Expected: fonction DEFINER ; `anon_can` = false (deny-by-default). **Diff** vs AUTORISATION §3.2-B.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0023_guards_link.sql
git commit -m "feat(db): 0023 link_coproprietaire_account (garde email JWT) + patron gardes RPC dangereuses"
```

---

## Task 24: Triggers d'intégrité GL (immutabilité, enforce_lot_id_on_45x, copro_id transverses)

**Files:**
- Create: `supabase/migrations/0024_integrity_triggers.sql`

**Source blueprint :** 02 §4 + INVENTAIRE §M/§P. Triggers GL : immutabilité (`trg_ledger_tx_immutable`, `trg_ledger_entry_immutable`, `_no_insert_posted`, `_no_delete_posted`), `trg_ledger_entry_consistency`, `enforce_is_postable` (CONSTRAINT), `trg_enforce_lot_id_on_45x` (A2 élargi, SANS exception), `check_transaction_balance`. Triggers copro_id transverses restants (AG, comm, GED, maintenance posés dans leurs migrations ; ceux du GL ici). **Rattache R6** (intégrité comptable).

- [ ] **Step 1: Écrire la migration (immutabilité + balance)**

```sql
-- 0024_integrity_triggers.sql (02 §4) — socle legal GL
create or replace function public.trg_ledger_tx_immutable()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' then
    raise exception 'ledger_transaction % postee : immuable', old.id using errcode='23514';
  end if;
  return new;
end;$$;
create trigger trg_ledger_tx_immutable before update on public.ledger_transactions
  for each row execute function public.trg_ledger_tx_immutable();

create or replace function public.trg_ledger_tx_no_delete_posted()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' then raise exception 'tx postee : suppression interdite' using errcode='23514'; end if;
  return old;
end;$$;
create trigger trg_ledger_tx_no_delete before delete on public.ledger_transactions
  for each row execute function public.trg_ledger_tx_no_delete_posted();

create or replace function public.trg_ledger_entry_guard()
returns trigger language plpgsql as $$
declare v_status ledger_tx_status;
begin
  select status into v_status from public.ledger_transactions where id = coalesce(new.tx_id, old.tx_id);
  if tg_op in ('UPDATE','DELETE') and v_status='posted' then
    raise exception 'ligne d''une tx postee : immuable' using errcode='23514';
  end if;
  if tg_op='INSERT' and v_status='posted' then
    raise exception 'insertion dans une tx postee interdite' using errcode='23514';
  end if;
  if tg_op<>'DELETE' then
    if (select copro_id from public.ledger_transactions where id=new.tx_id) <> new.copro_id then
      raise exception 'ligne : copro_id incoherent avec l''en-tete' using errcode='23514';
    end if;
  end if;
  return coalesce(new, old);
end;$$;
create trigger trg_ledger_entry_guard before insert or update or delete on public.ledger_entries
  for each row execute function public.trg_ledger_entry_guard();
```

- [ ] **Step 2: Compléter (enforce_lot_id_on_45x A2 + is_postable + balance)**

Ajouter :
```sql
-- A2 : lot_id NOT NULL sur TOUT compte 45% postable, SANS exception
create or replace function public.trg_enforce_lot_id_on_45x()
returns trigger language plpgsql as $$
declare v_code text; v_postable boolean;
begin
  select code, is_postable into v_code, v_postable from public.accounts where id = new.account_id;
  if v_code like '45%' and v_postable and new.lot_id is null then
    raise exception 'compte % (45x postable) : lot_id obligatoire (A2)', v_code using errcode='23514';
  end if;
  return new;
end;$$;
create trigger trg_enforce_lot_id_on_45x before insert on public.ledger_entries
  for each row execute function public.trg_enforce_lot_id_on_45x();

-- is_postable : interdit une ligne sur un compte agregateur
create or replace function public.trg_enforce_is_postable()
returns trigger language plpgsql as $$
begin
  if not (select is_postable from public.accounts where id = new.account_id) then
    raise exception 'compte non postable (agregateur) : ligne interdite' using errcode='23514';
  end if;
  return new;
end;$$;
create constraint trigger trg_enforce_is_postable after insert on public.ledger_entries
  deferrable initially deferred for each row execute function public.trg_enforce_is_postable();

-- equilibre Σdebit=Σcredit a la pose (CONSTRAINT DEFERRED sur tx)
create or replace function public.check_transaction_balance()
returns trigger language plpgsql as $$
declare v_d numeric; v_c numeric;
begin
  if new.status='posted' then
    select coalesce(sum(amount) filter (where direction='debit'),0),
           coalesce(sum(amount) filter (where direction='credit'),0)
      into v_d, v_c from public.ledger_entries where tx_id = new.id;
    if abs(v_d - v_c) > 0.005 then
      raise exception 'tx % desequilibree : debit=% credit=%', new.id, v_d, v_c using errcode='23514';
    end if;
  end if;
  return new;
end;$$;
create constraint trigger trg_check_tx_balance after update on public.ledger_transactions
  deferrable initially deferred for each row execute function public.check_transaction_balance();
```
Tous ces triggers : `revoke execute ... from public, anon, authenticated` sur les fonctions.

- [ ] **Step 3: Appliquer + vérifier (test comportemental A2)**

`apply_migration` (name=`0024_integrity_triggers`). Test fonctionnel sur la branche (seed minimal inline pour prouver le RAISE) :
```sql
-- prouver que enforce_lot_id_on_45x rejette une ligne 45x sans lot_id
do $$
declare v_cab uuid; v_cop uuid; v_per uuid; v_acc uuid; v_tx uuid;
begin
  insert into public.cabinets(name) values('T') returning id into v_cab;
  insert into public.copros(cabinet_id,name) values(v_cab,'TC') returning id into v_cop;
  insert into public.accounting_periods(copro_id,name,start_date,end_date) values(v_cop,'N','2026-01-01','2026-12-31') returning id into v_per;
  insert into public.accounts(copro_id,code,name,account_type,nature) values(v_cop,'450-1','Copro courant','liability','current') returning id into v_acc;
  insert into public.ledger_transactions(copro_id,period_id,source_type,label) values(v_cop,v_per,'manual','t') returning id into v_tx;
  begin
    insert into public.ledger_entries(tx_id,copro_id,period_id,account_id,direction,amount) values(v_tx,v_cop,v_per,v_acc,'debit',10);
    raise exception 'ECHEC TEST : la ligne 45x sans lot_id a ete acceptee';
  exception when others then
    if sqlerrm like '%lot_id obligatoire%' then raise notice 'OK : A2 rejette bien'; else raise; end if;
  end;
  rollback;
end;$$;
```
Expected: NOTICE « OK : A2 rejette bien » (le rollback nettoie). **Diff** vs 02 §4 (A2 sans exception).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0024_integrity_triggers.sql
git commit -m "feat(db): 0024 triggers GL (immutabilite, enforce_lot_id_on_45x A2, is_postable, balance, 02 §4)"
```

---

## Task 25: Vues v_*

**Files:**
- Create: `supabase/migrations/0025_views.sql`

**Source blueprint :** 02 §5bis (vues GL/solde/intégrité, source unique), 05 §5bis (`v_legal_proceedings_copro` RGPD A14, `v_mutation_detail`), 06 §5bis (`v_document_versions`), 08 §5 (`v_wall_feed` etc.). **Pose les vues de solde dérivées du GL** (R9/R10/R17/R40). `v_account_balances` NON créée (DROP, chemin parallèle). `v_coproprietaires_overview` corrigée (R40).

- [ ] **Step 1: Écrire la migration (vues solde GL — source unique)**

Reproduire les vues finance dérivées du GL (status='posted') : `v_general_ledger`, `v_trial_balance`, `v_lot_balance` (source du solde lot), `v_owner_balance`, `v_unpaid_lots`, `v_lot_vs_gl_mismatch` (garde-fou), `v_result_allocation_split` (garde-fou 110/120, 02 §0.2). Corps SQL selon 02 §5bis (repointés sur `accounts.nature`/`bank_name`/`tiers_id`). Toutes `security_invoker`.

> Note : `v_account_balances` n'est PAS créée (OBJETS §1.3, chemin parallèle au GL droppé).

- [ ] **Step 2: Compléter (vues relevé/intégrité/RGPD/GED/comm)**

Ajouter les vues « relevé d'appel » (`v_owner_statement_*`, `v_unpaid_by_lot` — présentation, pas autorité, 02 §0.1), `v_legal_proceedings_copro` (05 §5bis, SECURITY INVOKER, masque débiteur/lot sur `recovery`), `v_mutation_detail` (05 §5bis), `v_document_versions` (06 §5bis, lit `document_versions`), `v_wall_feed`/`v_conversations_overview`/`v_events_overview` (08 §5), `v_tiers`/annuaire (déjà `tiers_directory` Task 14). **`v_coproprietaires_overview`** : la définir avec une agrégation correcte (DISTINCT / GROUP BY par coproprietaire) pour éliminer les doublons (R40, front-06 §6).

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0025_views`). Puis :
```sql
select count(*) from information_schema.views where table_schema='public' and table_name='v_account_balances';
select table_name from information_schema.views where table_schema='public' and table_name in ('v_lot_balance','v_lot_vs_gl_mismatch','v_result_allocation_split','v_legal_proceedings_copro') order by table_name;
```
Expected: `v_account_balances` = 0 (droppée) ; 4 vues clés présentes. **Diff** vs 02 §5bis / 05 §5bis.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0025_views.sql
git commit -m "feat(db): 0025 vues v_* (solde derive du GL, garde-fous mismatch/110-120, RGPD A14, sans v_account_balances)"
```

---

## Task 26: RLS — ENABLE/FORCE + bascule par environnement

**Files:**
- Create: `supabase/migrations/0026_rls.sql`

**Source blueprint :** AUTORISATION §6 + RLS par table de chaque domaine (01-08 §3). Policies (gestionnaire/copropriétaire/anon-deny, bypass service_role), `FORCE` sur tables GL, fonction de bascule env. **Rattache R1/R14** (RLS = garde). En dev RLS OFF (drapeau).

- [ ] **Step 1: Écrire la migration (policies par table)**

Pour chaque table métier, créer les policies selon le tableau RLS de son domaine (01 §3, 02 §3, 03 §3, 04 §3, 05 §3, 06 §3, 07 §3, 08 §3). Patron par table :
```sql
-- exemple : lots (01 §3)
alter table public.lots enable row level security;
create policy lots_service on public.lots for all to service_role using (true) with check (true);
create policy lots_mgr on public.lots for all to authenticated
  using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));
create policy lots_read on public.lots for select to authenticated
  using (public.user_has_copro_access(copro_id));
-- (anon : aucune policy = deny)
```
Décliner pour TOUTES les tables (cabinets avec policy `platform_admin` ALL + gestionnaire SELECT son cabinet ; `email_templates`/`work_domain` SELECT authenticated + write service_role ; tables GL/finance gestionnaire-only en écriture + copropriétaire SELECT own ; mutations gestionnaire-only ; etc.). Suivre exactement chaque tableau de domaine.

- [ ] **Step 2: Compléter (FORCE GL + fonction bascule env)**

```sql
-- FORCE sur tables comptables (02 §6.4)
alter table public.ledger_transactions force row level security;
alter table public.ledger_entries force row level security;
alter table public.accounting_periods force row level security;
alter table public.accounts force row level security;

-- bascule par environnement (AUTORISATION §6.2) — idempotente
create or replace function public.apply_rls_for_env()
returns void language plpgsql as $$
declare t text; v_prod boolean;
begin
  v_prod := current_setting('app.environment', true) = 'production';
  for t in select tablename from pg_tables where schemaname='public' loop
    if v_prod then execute format('alter table public.%I enable row level security', t);
    else execute format('alter table public.%I disable row level security', t); end if;
  end loop;
end;$$;
revoke execute on function public.apply_rls_for_env() from public, anon, authenticated;
```

- [ ] **Step 3: Appliquer + vérifier**

`apply_migration` (name=`0026_rls`). Puis :
```sql
select relname, relrowsecurity, relforcerowsecurity from pg_class
where relnamespace='public'::regnamespace and relname in ('ledger_entries','ledger_transactions','accounts','accounting_periods','lots','cabinets') order by relname;
select count(*) from pg_policies where schemaname='public' and tablename='cabinets' and policyname like '%platform%';
```
Expected: tables GL `relforcerowsecurity`=true ; policy platform_admin sur cabinets. **Diff** vs AUTORISATION §6.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0026_rls.sql
git commit -m "feat(db): 0026 RLS (policies 3 roles + service_role, FORCE GL, bascule env, AUTORISATION §6)"
```

---

## Task 27: Test de restauration complet sur base vierge

**Files:**
- Aucun (validation MCP de bout en bout).

**Objectif :** prouver que la chaîne complète `0001 → 0026` s'applique sur une base **vierge** sans erreur ni dépendance manquante (FK rétroactives, ordre, triggers). C'est le critère d'acceptation de la Phase 0.

- [ ] **Step 1: Créer une 2e branche vierge dédiée**

Via MCP `create_branch` (name=`rebaseline-clean`). C'est une base neuve, aucune migration appliquée.

- [ ] **Step 2: Rejouer TOUTE la chaîne dans l'ordre**

Via MCP `apply_migration` successifs (ou `reset_branch` puis push des migrations du repo) : appliquer `0001`…`0026` dans l'ordre exact sur `rebaseline-clean`. Aucune erreur attendue. Si une FK rétroactive échoue (cible pas encore créée), corriger l'ordre/la migration concernée et recommencer.

- [ ] **Step 3: Vérif structurelle globale**

Via `execute_sql` sur `rebaseline-clean` :
```sql
-- comptage des objets cibles
select 'tables' as kind, count(*) n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'
union all select 'views', count(*) from information_schema.views where table_schema='public'
union all select 'enums', count(distinct t.typname) from pg_type t where t.typtype='e' and t.typnamespace='public'::regnamespace
union all select 'functions', count(*) from pg_proc where pronamespace='public'::regnamespace
union all select 'fk_total', count(*) from pg_constraint where contype='f' and connamespace='public'::regnamespace;
-- aucune table abandonnee ne doit exister
select table_name from information_schema.tables where table_schema='public'
  and table_name in ('lot_accounts','mail_campaigns','mail_recipients','mail_inbox','mail_templates','mail_folders','mail_labels_v2','ag_pouvoirs','notaires','document_access','dossiers');
-- advisors securite
```
Expected: comptes cohérents avec le blueprint (≈ 60+ tables) ; 2e requête = 0 ligne (R32/R12/A5 : aucune table abandonnée). Lancer aussi MCP `get_advisors` (type=security) → noter les avis (RLS, search_path) et corriger si bloquant.

- [ ] **Step 4: Vérifier l'intégrité référentielle (aucune FK orpheline déclarée)**

```sql
-- toute FK pointe une table existante (sinon apply aurait echoue, double-check)
select conname, conrelid::regclass as tbl from pg_constraint
where contype='f' and connamespace='public'::regnamespace and confrelid=0;
```
Expected: 0 ligne. **Diff** vs 00-SYNTHESE §1 (graphe des domaines complet).

- [ ] **Step 5: Commit (marqueur de validation)**

```bash
git commit -m "test(db): restauration complete 0001-0026 sur base vierge OK (Phase 0 valide)" --allow-empty
```

---

## Task 28: Générer les types TypeScript

**Files:**
- Create: `src/types/supabase.ts` (généré)

**Source :** R14/R15 (retypage couche entière sur types générés). MCP `generate_typescript_types`.

- [ ] **Step 1: Générer les types depuis la branche validée**

Via MCP `generate_typescript_types` sur la branche `rebaseline-clean` (schéma cible complet). Récupérer le contenu TS.

- [ ] **Step 2: Écrire le fichier**

Écrire le contenu généré dans `src/types/supabase.ts` (chemin aligné sur `tsconfig` path alias `@/types`). Vérifier qu'il n'y a aucun `any` dans le fichier généré (les types Supabase sont stricts par construction).

- [ ] **Step 3: Vérifier la compilation TS**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "supabase.ts" | Select-Object -First 20`
Expected: aucune erreur dans `supabase.ts` (le fichier généré compile seul ; les erreurs ailleurs relèvent du retypage applicatif, Phase 1).

- [ ] **Step 4: Commit**

```bash
git add src/types/supabase.ts
git commit -m "feat(db): 0028 types TS generes depuis le schema cible (base R14/R15 retypage)"
```

---

## Task 29: Nettoyage des branches jetables + handoff

**Files:**
- Aucun.

- [ ] **Step 1: Supprimer les branches de test**

Via MCP `delete_branch` sur `rebaseline-test` puis `rebaseline-clean`. (Les migrations vivent dans le repo Git, pas besoin des branches.)

- [ ] **Step 2: Vérifier que toutes les migrations sont commitées**

Run: `git status --short supabase/migrations/`
Expected: rien (tout commité). Run: `ls supabase/migrations/` → 24 fichiers `.sql` (0001…0026, dont 0013b).

- [ ] **Step 3: Commit final de phase**

```bash
git commit -m "chore(db): phase 0 schema rebaseline complete (24 migrations, branches jetables supprimees)" --allow-empty
```

---

## Self-Review (Task 30 — checklist auteur, pas un sous-agent)

- [ ] **Couverture spec :** chaque section du blueprint a une tâche. Enums (T2-3), work_domain (T4), socle 01 (T6-11), finance 02 (T12-13b), tiers 07 (T14), domaines 03-08 (T15-21), helpers (T22), gardes/câblage (T23), triggers (T24), vues (T25), RLS (T26), restauration (T27), types TS (T28). ✔
- [ ] **Couverture risques R1-R42 :** vérifier la table ci-dessous — chaque risque est rattaché à au moins une tâche (prérequis schéma) ou explicitement renvoyé à la Phase applicative.

| R | Tâche(s) de rattachement | R | Tâche(s) |
|---|---|---|---|
| R1 | T22, T26 (helpers+RLS) ; route handlers = Phase 1 | R22 | T15 (budgets unique) ; doublons front = Phase 1 |
| R2 | T22 (is_service_call), T23 (patron G-SVC) | R23 | schéma unique ; front = Phase 1 |
| R3 | T22, T23 (garde auth.uid) | R24 | hors scope finance-first |
| R4 | A1 (11111111 absente), T21 (mails sans ID dur) | R25 | T16 (council_documents GARDÉE) |
| R5 | T16 (pending_actions liste blanche) ; bespoke jamais créé | R26 | signatures canoniques seules (aucune surcharge créée) |
| R6 | T13, T15, T24 (chaîne engagement + ledger_required) | R27 | T11/T16/T20 (lot_owners/tiers/title) ; réécriture = lot fonctions |
| R7 | T16 (ag_votes + trigger attendance) ; cast_vote = lot fonctions | R28 | T15 (budget_payment_schedules GARDÉE) |
| R8 | T20 (contracts unique) | R29-R31 | schéma unique ; suppression front = Phase 1 |
| R9 | T12-13 (plan comptable/GL réel) | R32 | T27 (vérif tables abandonnées absentes) |
| R10 | T18, T25 (état daté/vues réelles) | R33 | Phase 1 |
| R11 | T15 (payment_reminders réelle) | R34 | Phase 1 |
| R12 | T19 (pas de document_access), T22 (user_can_view_document A4) | R35-R36 | hors scope / Phase 1 |
| R13 | T17 (foyer transitoire) ; drop = Phase 1 | R37 | Phase 1 ; triggers compteurs T21 |
| R14 | T26 (RLS), T28 (types TS) | R38 | T21 (triggers compteurs DB) |
| R15-R16 | T11, T23 (user_id/link) | R39 | T13b (faux-morts emprunt/avances) |
| R17 | T12, T25 (KPIs dérivés GL) | R40 | T25 (v_coproprietaires_overview corrigée) |
| R18-R20-R21 | schéma unique ; suppression front = Phase 1 | R41 | Phase 1 |
| R19 | T14 (tiers unique) | R42 | Phase 1 |

- [ ] **Scan placeholders :** aucun « TBD »/« à compléter » dans les blocs SQL de tâches autonomes (T1-T14, T17, T22-T28). Pour les tâches volumineuses T15-T16, T18-T21, certaines tables sont décrites par renvoi précis au § blueprint « reproduire in extenso » + les pivots/contraintes critiques sont donnés en SQL réel ; c'est volontaire (un seul fichier ne peut dupliquer 8 blueprints), le § cité contient le DDL colonne-par-colonne. L'exécutant copie le blueprint référencé.
- [ ] **Cohérence des types :** noms de fonctions/triggers cohérents entre tâches (`set_updated_at` T5 réutilisé partout ; `user_is_copro_manager`/`user_has_copro_access` définis T22 utilisés T26 ; `tr_*_copro_consistency` nommage uniforme ; FK rétroactives T14/T15/T16/T19/T20 nommées `fk_*`). Ordre des FK rétroactives validé par T27 (restauration complète).
- [ ] **Ordre de dépendances :** extensions → enums → work_domain → set_updated_at → cabinets → copros → lots → keys → coproprietaires/lot_owners → profiles/memberships → accounts → ledger → finance périph → tiers → budgets → AG → notif → mutations → GED → maintenance → comm → helpers → gardes → triggers → vues → RLS. FK rétroactives utilisées quand un cycle l'impose (coproprietaires↔profiles, payments↔call_lines, budgets↔ag, finance↔documents, schedules↔service_orders). ✔

---

## Execution Handoff

**Plan complete et sauvegardé dans `docs/superpowers/plans/2026-06-04-phase0-db-rebaseline.md`. Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — un sous-agent neuf par tâche (migration), revue entre tâches, itération rapide. Chaque tâche applique sa migration sur la branche Supabase jetable, vérifie la structure, commit.

**2. Inline Execution** — exécution des tâches dans cette session via executing-plans, par lots avec checkpoints de revue.

**Quelle approche ?**
