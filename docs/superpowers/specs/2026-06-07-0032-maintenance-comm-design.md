# Design — 0032 rpc-maintenance-comm

> Spec de cadrage (brainstorming). Migration « lot fonctions » du domaine **maintenance/tiers** + **communication**.
> Branche `phase0-db-rebaseline`. Roadmap : `docs/superpowers/plans/2026-06-05-lot-fonctions-roadmap.md` (ex-0028, numérotation réelle +4 → 0032).
> Scoping multi-agent : run `wf_6b9b3e5e-194` (verdict `plan_solide` : 34 objets, 0 oubli, 0 doublon).
> Blueprints sources : `.planning/db-cible/07-maintenance-tiers.md`, `08-communication.md`, `INVENTAIRE-FONCTIONS.md`.

## 1. Objectif & périmètre

Brancher la **logique** (RPC + triggers) sur des tables **déjà posées** (schéma pur 0021 maintenance, 0022 communication, 0015 tiers, 0004 work_domain). **Aucune table, aucun enum, aucune vue, aucune RLS** ici.

- **Maintenance/tiers** : machine à états des ordres de service (OS), carnet d'entretien, stats prestataires, bascule auto du statut des contrats, 3 garde-fous d'intégrité inter-copro.
- **Communication** : `mark_conversation_read`, 3 dénormalisations automatiques (aperçu fil + compteurs mur), 6 garde-fous d'intégrité inter-copro.

### Hors-scope (confirmé)
- **RLS / policies / enable / force** → migration **0034** (les en-têtes 0021/0022 disent encore « 0026 », obsolète).
- **Vues reporting** maintenance (`v_contracts_to_renew`, `v_service_orders_overview`) et communication (`v_conversations_overview`, `v_wall_feed`, …) → **lot vues ultérieur** (ex-0031 vues-transverses).
- **Chaîne facture/paiement fournisseur** (`post_supplier_invoice`, `post_supplier_payment`, `get_supplier_invoice_paid_amount`, les 4 triggers supplier) → **DÉJÀ en 0026**. Hors 0032.
- **RPC mur/messagerie « futures »** (`post_message`, `create_conversation`, `toggle_wall_like`) → absentes de la roadmap, non inventées ici.
- **Campagnes mail** (`mail_*`, `create_mail_system_folders`, `generate_campaign_recipients`, `v_mail_*`) → île **abandonnée**, jamais créée.
- **Résiliation contrat** (`terminated`/`terminated_at`) = acte gestionnaire explicite, hors automatisme `update_contract_status_auto` ; pas de RPC dédiée demandée.
- **DROP `budget_payment_schedules`** → NON (roadmap A8 : table conservée).

## 2. Arbitrages métier tranchés (USER, 2026-06-07)

1. **Transitions OS = souples.** Avancement logique du workflow + `cancelled` atteignable depuis tout état non terminal + relance `refused → sent` + retour arrière `completed → in_progress` (correction d'une clôture hâtive) + `refused` depuis `awaiting_provider`. `closed`/`cancelled` = terminaux définitifs. Enum réel (0003) : `draft, sent, awaiting_provider, scheduled, in_progress, completed, closed, cancelled, refused`.
2. **Statut du carnet à la création depuis un OS = dérivé de l'état de l'OS** : OS clôturé/terminé → `'terminee'` ; OS en cours → `'planifiee'`.
3. **`mark_conversation_read`** : on ajoute l'utilisateur au `read_by` de **tous** les messages du fil pas encore marqués, **sans exclure** ses propres messages.

## 3. Décisions techniques (tranchées, non métier)

- **Numéro d'OS** : `generate_service_order_number(copro)` → format `OS-AAAA-NNNN`, sérialisé **par copro** via `pg_advisory_xact_lock(hashtext(copro::text))` puis `MAX(order_number)+1` (pas de séquence par copro ; copro créée à la volée).
- **`update_provider_stats`** : trigger `AFTER INSERT OR UPDATE OR DELETE ON logbook_entries` (le DELETE évite un compteur qui ne redescend jamais) ; **recalcul complet** (`count`/`max` depuis `logbook_entries WHERE tiers_id=…`), idempotent ; gère `tiers_id` NULL et le changement de `tiers_id` (recalcul ancien + nouveau).
- **`delete_service_order`** : un seul `DELETE FROM service_orders` — les FK font le ménage (`service_order_events` ON DELETE CASCADE ; `logbook_entries.service_order_id` ON DELETE SET NULL) ; on retire le bloc legacy `UPDATE budget_payment_schedules`. Pas de DROP de table.
- **Nommage** : triggers préfixés `trg_` / `tr_` (pattern repo). Le trigger de bascule de statut s'appelle `trg_contract_status_auto` (fonction `update_contract_status_auto`).
- **`event_type`** (enum 0003 `{created, sent, status_change, comment, document, cancelled}`) : `'sent'` pour `draft→sent`, `'cancelled'` pour annulation, `'status_change'` sinon.
- **Conventions** (imitées à l'identique de 0030/0031) :
  - RPC = `SECURITY DEFINER` + `set search_path = public` + `REVOKE EXECUTE FROM public, anon` + `GRANT EXECUTE TO authenticated, service_role`.
  - Fonction trigger = `SECURITY DEFINER` + `set search_path = public` + `REVOKE EXECUTE FROM public, anon, authenticated` (jamais GRANT).
  - G-INTERNAL (math pure) = `LANGUAGE sql IMMUTABLE` + REVOKE public,anon + GRANT authenticated,service_role.
  - Un seul `%` par RAISE ; cast enum explicite ; errcodes `42501` (forbidden) / `23514` (règle violée) / `23503` (introuvable).
  - Helpers de garde **réutilisés depuis 0023** (à appeler, jamais redéfinir) : `is_service_call`, `user_is_copro_manager`, `user_has_copro_access`, `is_conversation_member`.

## 4. Objets à créer — 3 paliers (1 seul fichier `0032_rpc_maintenance_comm.sql`, modèle 0030)

### Palier 1 — Cœur ordres de service (maintenance)
| Objet | Type | Garde | But |
|---|---|---|---|
| `is_valid_service_order_transition(from, to)` | RPC `sql IMMUTABLE` | G-INTERNAL | Table des transitions souples (cf. §2.1). |
| `generate_service_order_number(copro)` | RPC | G-INTERNAL | `OS-AAAA-NNNN` sérialisé par copro (advisory lock). |
| `update_service_order_status(order, new_status, comment, user)` | RPC → jsonb | G-MGR | Valide la transition, MAJ statut, horodate le jalon, INSERT `service_order_events` (append-only). Pas de GL. Idempotent (from=to = no-op). |
| `create_logbook_from_service_order(order)` | RPC → uuid | G-MGR | Entrée carnet idempotente : `tiers_id` + `title` de l'OS, statut dérivé (§2.2). |
| `delete_service_order(order)` | RPC → jsonb | G-MGR | `DELETE` simple, FK font le ménage (§3). |

**Gate P1** : 2 OS → 2 `order_number` distincts (anti-race) · transition valide OK (jalon + 1 event) · invalide → 23514 · non-manager → 42501 · carnet idempotent (même id) · `budget_payment_schedules` inchangée.

### Palier 2 — Triggers maintenance
| Objet | Type | But |
|---|---|---|
| `update_provider_stats()` + `trg_update_provider_stats` (AFTER I/U/D `logbook_entries`) | trigger | Recalcul `tiers.interventions_count` / `last_intervention_at` (§3). |
| `update_contract_status_auto()` + `trg_contract_status_auto` (BEFORE I/U `contracts`) | trigger | `draft→active→to_renew→expired` selon dates ; ne touche pas `terminated` manuel. |
| `tr_contract_tiers_copro_consistency()` + trigger (BEFORE I/U `contracts`) | trigger | tiers.copro_id = copro (23514). |
| `tr_so_copro_consistency()` + trigger (BEFORE I/U `service_orders`) | trigger | tiers + contract + lot (si présents) même copro (23514). |
| `tr_insurance_contract_copro_consistency()` + trigger (BEFORE I/U `insurance_policies`) | trigger | contract.copro_id = copro ET contract.domain_id = work_domain slug `'assurance'` (23514). |

**Gate P2** : INSERT carnet lié tiers → `interventions_count +1` & `last_intervention_at` MAJ ; changement de `tiers_id` → ancien décrémenté, nouveau incrémenté ; DELETE → décrément · contrat end_date proche → `to_renew`, passée → `expired` · INSERT contract/OS/assurance d'une autre copro → 23514.

### Palier 3 — Communication
| Objet | Type | Garde | But |
|---|---|---|---|
| `mark_conversation_read(conversation)` | RPC → void | G-OWNER (`is_conversation_member`) | `unread_count=0` + `last_read_at=now()` + append `auth.uid()` dans `messages.read_by` (§2.3). |
| `update_conversation_last_message()` + `trg_conversation_last_message` (AFTER INSERT `messages`) | trigger | `last_message_at`/`_preview`/`updated_at` + `unread_count +1` des membres actifs sauf l'auteur. |
| `update_wall_post_comments_count()` + `trg_wall_comments_count` (AFTER I/D `wall_comments`) | trigger | `comments_count ±1`, plancher `GREATEST(0,…)` (ck_wall_counts ≥ 0). |
| `update_wall_post_likes_count()` + `trg_wall_likes_count` (AFTER I/D `wall_likes`) | trigger | `likes_count ±1`, plancher 0. |
| `tr_member_copro_consistency()` (conversation_members) · `tr_message_copro_consistency()` (messages) · `tr_comment_copro_consistency()` (wall_comments) · `tr_like_copro_consistency()` (wall_likes) · `tr_event_copro_consistency()` (events : linked_ag_id→ag_meetings, linked_service_order_id→service_orders) · `tr_mail_copro_consistency()` (mails : in_reply_to) + leurs triggers BEFORE I/U | triggers | G-TRIG | Anti-fuite inter-copro (23514). Tous **neufs** (0024 ne couvre que le GL-strict). |

**Gate P3** : INSERT message → `last_message_preview`/`_at` MAJ + `unread_count +1` membres actifs sauf auteur · `mark_conversation_read` membre → unread=0, read_by contient l'uid ; non-membre → 42501 · INSERT/DELETE like/comment → compteurs cohérents plancher 0 · parent d'une autre copro → 23514.

## 5. Ordre de déclaration
Chaque fonction trigger est déclarée **juste avant** son `CREATE TRIGGER` ; `is_valid_service_order_transition` **avant** `update_service_order_status`. Tous les helpers de garde viennent de 0023 (déjà en place). Ordre global : P1 (1→5) → P2 (6→10) → P3 (11→20).

## 6. NE PAS recréer (extrait — liste complète dans le run)
`set_updated_at` (0005) · tous les `trg_*_updated` (0021/0022/0015) · helpers 0023 (`is_service_call`, `user_is_copro_manager`, `user_has_copro_access`, **`is_conversation_member`**) · `check_tiers_domain_ids` + `tiers_directory` (0015) · `resolve_lot_tiers_account` (0025) · **toute la chaîne fournisseur 0026** (`post_supplier_invoice`, `post_supplier_payment`, `get_supplier_invoice_paid_amount`, `tr_validate_supplier_invoice_total`, `tr_validate_supplier_payment`, `tr_update_supplier_invoice_status_after_payment`, `tr_check_invoice_copro_consistency`) · `create_document_system_folders` (0031) · aucune table/enum.

## 7. Stratégie de gate (cadence 3-checks + harnais)
1. **db reset** 0001→0032 sur docker psql → 0 erreur de compilation (search_path, casts, %).
2. **Gate fonctionnel** en `BEGIN/ROLLBACK` sur copro boucle d'or (`create_test_copro_seeded`) → les 3 gates de palier ci-dessus.
3. **vitest** non régressé (75/75 attendu).
4. **Hygiène** : grep de non-régression confirmant qu'aucun objet du §6 n'est redéclaré.

## 8. Risques principaux
- Suivre aveuglément les analyses sources recréerait la chaîne fournisseur (déjà 0026) → suivre §6. (Attrapé par la vérif.)
- `is_conversation_member` est en 0023 : un `create or replace` masquerait un bug → **ne pas redéclarer**.
- Plancher `GREATEST(0,…)` obligatoire sur les compteurs mur (`ck_wall_counts ≥ 0`).
- Slug `'assurance'` de `work_domain` : confirmé au seed 0004 (l.44) avant de figer le trigger assurance.
- Volume (~20 fns + ~14 triggers) → risque de hang d'agent à l'écriture → d'où les 3 paliers + bascule écriture-main si besoin (`workflow_authoring_cadence`).

## 9. Étapes suivantes
`writing-plans` → plan d'implémentation exécutable par palier → authoring (workflow auteurs split + retry, bascule main si hang) → gate par palier → /code-review multi-agent → fix simples → **1 commit quand les 3 paliers sont verts**.
