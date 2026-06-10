# Décisions différées — à traiter avec l'utilisateur à la fin des migrations

> ✅ **RÉSOLU le 2026-06-10 (session d'arbitrage J0.2b)** — les points ouverts D3-D6 sont
> **tranchés** et journalisés dans **`DECISIONS.md` §H** (H1-H4). Ce fichier reste une
> archive de contexte ; ne plus y ajouter de décisions (tout passe par DECISIONS.md).

> Collectées en mode autonome (lot fonctions 0030→0035). Chaque item = un point qui demande
> un **vrai retour métier** de l'utilisateur (expert copro), pas un bug technique simple.
> Les bugs techniques simples sont corrigés au fil de l'eau.

## Issues du lot fonctions (0030+)

### 0030 — rpc-ag-conseil
- **Modélisation du mandat syndic** (APPOINT_SYNDIC) : aujourd'hui no-op informatif (`copros` n'a pas
  de colonnes syndic). À modéliser dans une migration de schéma dédiée **après la phase finance**
  (table `syndic_mandates` ? colonnes sur `copros` ? lien `tiers` catégorie 'syndic' + contrat ?).
  cf. mémoire `syndic-mandate-deferred`.
- **Plafond pouvoirs art.22** (3 délégations max, sauf ≤10 % des voix) : garde au vote/présence, non posée.
  → lot « conformité vote » ultérieur.
- **Neutralisation correspondance art.17-1 A** (votant « pour » d'une résolution **amendée** en séance =
  défaillant) : exige une colonne `is_amended` hors des tables 0017 figées. → différé.
- **Orchestration auto de la passerelle 25-1/26-1** (re-création/rebascule du 2nd vote) : 0030 calcule
  l'éligibilité et alerte seulement ; le lancement reste une action gestionnaire. → à arbitrer.
- **Test runtime du conseil** (`compute_decision_result`) : non testable en local (pas d'utilisateurs
  `auth.users` pour `council_decisions.created_by`). Correctif appliqué + vérifié par lecture ; à éprouver
  sur un environnement avec auth.

### 0031 — rpc-ged-mutations
- **Recouvrement mutation art.20 (opposition)** : `validate_mutation` change `lot_owners` SANS poster le GL (le solde 450 reste sur le lot, conforme lot-centric). Le **recouvrement** des sommes dues par le vendeur via opposition notaire (D512/C450-x du lot) = `record_mutation_opposition` + `settle_mutation_opposition` + `reconstitute_buyer_advances` est **hors scope roadmap 0031**. Tables `mutation_oppositions` posées en 0019. → **Décision : implémenter ce workflow maintenant (mini-lot) ou plus tard ?**
- ~~**Immutabilité de l'état daté**~~ ✅ **RÉSOLU** : le trigger `tr_etat_date_immutable` EST dans 0031 (l.370-386) — DELETE interdit, UPDATE interdit sauf matérialisation unique de `document_id` (NULL→non NULL). Confirmé par la revue multi-agent du 2026-06-07.
- **Vue RGPD `legal_proceedings`** (masquage recouvrement pour copropriétaires) : hors scope 0031, liée à la couche RLS/portail. → à traiter avec le portail copropriétaire.

#### Issues remontées par la revue multi-agent (2026-06-07, run `wf_ed0b4557-b37`)
> 4 bugs techniques simples corrigés au fil de l'eau (volatilité `generate_document_path`, `is_company` dérivé, gel P3 `issue_date<=v_eff`, garde acquéreur≠vendeur, garde `v_key null`). Restent ces arbitrages **métier** :

- ✅ **[MAJOR — RÉSOLU 2026-06-07, fix commit voir 0031] Partie 2 de l'état daté** (`generate_etat_date_payload`) : recherche juridique (art.5 décret 67-223 + art.14-2-1 loi 65-557) → **partie 2 = |solde créditeur 45x du lot|** (avances art.45-1 du décret + provisions encaissées non employées = sommes que le syndicat restitue au vendeur). **Le fonds travaux ALUR (450-5/105) en est EXCLU** : attaché au lot, acquis au fonds, non remboursable (le vendeur le négocie dans le prix). Décision USER : trop-perçu cotisation ALUR (450-5 créditeur) = **acquis au fonds**, exclu. **D1 tranché** (contenu = créditeur 45x hors 450-5). **D2 tranché** (scindé par signe : `bal>0` → partie 1, `|bal<0|` → partie 2). Tantièmes déplacés vers la clé légale `annexe_quote_part`. Partie 3 inchangée (déjà correcte : reconstitution avances 450-3 + provisions non échues). Gate begin/rollback 5/5 (avance 450-3 en P2, ALUR exclu, symétrie P2/P3). vitest 75/75.
- **D3 — Indivision côté acquéreur** (`validate_mutation`) : la RPC écrase tous les co-propriétaires actifs et crée **un acquéreur unique à 100 %**. Beaucoup de ventes sont en indivision (couple, SCI, héritiers). La structure DB (`lot_owners`, `share_percent`, Σ≤100) le supporte ; la RPC non. → Ajouter un paramètre **tableau d'acquéreurs** `{coproprietaire_id, share_percent, is_primary}` maintenant, ou traiter l'indivision hors RPC (correction manuelle post-validation) ?
- **D4 — État daté nominatif vs lot-centric** : le payload expose `seller` = un seul `seller_owner_id` alors que tous les montants sont lot-centric (A3). En indivision avant vente, ça ne désigne qu'un indivisaire. → Assumer `seller_owner_id` comme libellé indicatif (documenter), ou lister tous les `lot_owners` actifs à la date d'effet dans le payload ?
- **D5 — Périmètre de la partie 3** (à la charge de l'acquéreur) : aujourd'hui = uniquement les **appels émis non échus**. Faut-il y ajouter les **provisions du budget voté restant à appeler** et la **cotisation fonds travaux ALUR à constituer** par l'acquéreur ? Le périmètre actuel est défendable. → Statu quo (documenter) ou couverture complète ?
- **D6 — Invariant « une seule clé de répartition générale active »** : aucune contrainte ne l'impose ; la sélection `limit 1` sans `order by` est le **pattern établi du projet** (0027/0030) — **NE PAS corriger localement** (créerait des tantièmes divergents entre état daté / seuils AG / régularisation). Si tu veux durcir : index unique partiel `(copro_id) where category='general' and is_active=true` — décision **globale**. (La garde `v_key null` → 23503, elle, est déjà appliquée en 0031, alignée sur 0027/0030.)

### 0032 — rpc-maintenance-comm
> Migration livrée (3 paliers). Bugs techniques corrigés au fil de l'eau (revues par palier + revue multi-agent finale `wf_7ad1b7d8-ce4`). Restent ces arbitrages **métier** + notes pour les lots à venir :

- **Sémantique `interventions_count` / `last_intervention_at`** (`update_provider_stats`) : aujourd'hui = `count(*)` / `max(happened_at)` de **TOUTES** les entrées carnet du tiers, sans filtre `entry_type`. Donc une entrée `controle`/`incident`/`maintenance` incrémente un compteur nommé « interventions ». → **Option A** (statu quo « toute activité du prestataire », documenter) ou **Option B** (compteur strict : ajouter `and le.entry_type = 'intervention'` aux 2 sous-requêtes). À trancher avec l'expert.
- **Catégorie du carnet figée à `'courante'`** (`create_logbook_from_service_order`) : l'entrée générée depuis un OS ignore l'urgence de l'OS (`urgency`/`is_art18_emergency`). Faut-il mapper urgence→`intervention_category` (`urgente`/`reglementaire`/`travaux`) ? → décision métier.
- **Appelant de `generate_service_order_number`** : la fonction est saine (advisory lock + filet `uq_service_order_number`) mais aucune RPC de création d'OS n'existe et `order_number` est NOT NULL sans default → la génération du numéro repose sur le **front**. → **Option A** (acter : création d'OS = couche applicative) ou **Option B** (ajouter une RPC `create_service_order(...)` encapsulant numéro+INSERT côté serveur). Découpage serveur/client à acter.
- **NOTE pour 0034 (RLS)** : pas de `tr_logbook_copro_consistency` enforçant `logbook_entries.tiers_id` (et `contract_id`/`service_order_id`/`building_id`) ∈ même copro. Le chemin `create_logbook` dérive `tiers_id` d'un OS déjà copro-checké, mais une insertion directe d'entrée carnet n'est pas filtrée tant que la RLS 0034 n'est pas posée. → ajouter le trigger de cohérence OU couvrir par RLS en 0034.
- **NOTE perf (messagerie à l'échelle)** : `mark_conversation_read` réécrit le `read_by` de tous les messages non lus du fil à chaque ouverture (O(n), `uuid[]` croissant). Négligeable en copro (peu de membres/messages) mais à **borner par `last_read_at`** (ou dériver les accusés du `last_read_at`) le jour où la messagerie passe à l'échelle.
- **NOTE pour le lot vues** : `contracts.status` est **dérivé à l'écriture** (recalculé à chaque insert/update depuis les dates, pas de cron) → un reporting « actuellement expiré / à renouveler » fiable hors écriture doit se dériver de `end_date`, pas faire confiance à la colonne.

### 0033 — notif-ag-transitoire
> Île transitoire livrée cible-pure. Notes pour les lots à venir :

- **NOTE étape 3 (réécriture edges)** : décision actée CIBLE-PURE → les edges `ag_send_convocations` et `email_webhook` (qui font de l'accès table direct + appels RPC sur l'ANCIEN schéma : `provider_message_id`, `notification_type`, `document_id`, `error_code`, `event_timestamp`, `raw_data`, `ip_address`, `user_agent`) **devront être réécrits** lors du recâblage vers `ag_envoi_tracking`. Les signatures cible des RPC 0033 diffèrent de ce que les edges appellent aujourd'hui (ex : `mark_notification_sent(p_notification_id, p_provider_ref, p_event_payload)` vs appel actuel `(p_notification_id, p_provider_message_id)`). À aligner au moment du cutover/étape 3.
- **À VÉRIFIER — `check_convocation_delay`** : appelé par le front `src/features/ag/hooks/useAgNotifications.ts` (l.264) mais PAS dans le périmètre notif-transitoire. Vérifier s'il est déjà livré en 0030 (délais AG) ; sinon c'est un **gap** à traiter (lot AG ou délais). Non bloquant pour 0033.
- **get_ag_sending_stats** : volontairement NON écrit (aucun appel front/edge prouvé par grep). À écrire seulement si un usage réel apparaît (sinon dette à droper à l'étape 3).

### 0034 — revoke-rls-seed (livré d242c14) / 0035 — vues (livré 9f03f95)
> ✅ `check_convocation_delay` RÉSOLU : présent en base (signature `p_ag_id uuid`, livré en 0030). Le « gap » du snapshot n'en était pas un.

- **DETTE prod — bascule RLS fail-OPEN** : le DO-block de bascule fait `current_setting('app.environment', true) = 'production'`. Si le GUC n'est PAS défini en prod → NULL ≠ 'production' → **RLS DISABLE silencieux** (fail-open). Conservé (design blueprint §6.2 ; dev local sans GUC + front dev en anon/authenticated sans user câblé → RLS OFF volontaire en dev). **Au déploiement prod** : `alter database <db> set app.environment='production'` (runbook) ou fonction `assert_production_rls()` au cutover. Revue : point d'attention, non bloquant Phase 0.
- **DETTE schéma — clé générale unique** : `v_coproprietaires_overview.total_tantiemes` borné à la clé `category='general' is_active` canonique (`order by id limit 1`) pour éviter le double-comptage si >1 clé générale active. Pas de contrainte schéma l'interdisant. → ajouter `create unique index uq_key_general_active on repartition_keys(copro_id) where category='general' and is_active;` (vérifier 0 copro seedée à 2 clés).
- **DETTE harnais — pgcrypto schema** : 0001 `create extension if not exists pgcrypto` sans `with schema extensions` (OK Supabase local, KO PG vanilla). `provision_demo_tenant` découplé (hash bcrypt littéral). Si besoin futur de crypt : qualifier le schéma ou figer 0001 `with schema extensions`.
- **NOTE indivision/portail** : `coproprietaires.p_own_indivision` expose les co-indivisaires des lots détenus ; solde/tantièmes des vues bornés `is_primary`. Le portail copropriétaire (Phase 3) devra câbler `coproprietaires.user_id` + membership coproprietaire (via `link_coproprietaire_account`) pour activer les volets own.
- **NOTE merge** : branche `phase0-db-rebaseline` (→ 9f03f95) en attente de **merge → main (décision USER)**. Lot fonctions complet (0023→0035).

### Revue /code-review 0034/0035 (2026-06-07) — dettes restantes
- **DÉCISION MÉTIER — indivision solde/tantièmes** : les vues (v_coproprietaires_overview) et v_owner_statement_by_person attribuent solde + tantièmes au propriétaire `is_primary` du lot (le co-indivisaire secondaire voit 0). Cohérent entre vues, mais sous-évalue les indivisaires. **À trancher** : garder « au primaire » ou passer au **prorata `share_percent`** (toucherait aussi 0028). Question copro pour l'USER.
- **DETTE perf prod — RLS lot-centric par ligne** : les volets own (`lot_id = any(get_user_lot_ids(copro_id))`) ré-invoquent le helper STABLE par ligne sur `ledger_entries`/`ledger_transactions` (grosses tables). À l'échelle, envelopper en sous-requête scalaire `= any((select get_user_lot_ids(copro_id)))` (cache InitPlan) + index `ledger_entries(lot_id)`. Négligeable en copro standard.
- **DETTE confidentialité mineure — email_templates système** : la branche `copro_id IS NULL` du SELECT est ouverte à tout `authenticated` (un copropriétaire lit les modèles de relance/mise en demeure). Si jugé sensible, restreindre à `user_is_copro_manager`/`platform_admin`.
- **ACTÉ — mur communautaire R/W membre** : wall_posts/wall_comments ont reçu les policies own insert/update/delete (auteur, garde `can_view_content`) ; wall_likes own_insert durci. Aligné blueprint §1.3 (≠ events qui reste écriture-mgr, décision USER). Si l'USER préfère un mur modéré (écriture-mgr), retirer ces own-write.
- **NOTE idempotence migration** : les `create policy` de 0034 ne sont pas `drop if exists` d'abord → 0034 n'est pas ré-entrante sur un rejeu partiel (sans incidence : le CLI Supabase rejoue depuis zéro). document_versions/etat_date_snapshots sans policy DELETE = immutabilité voulue (purge RGPD éventuelle via service_role/script tracé).

<!-- suite : ajouter ici les items au fil de l'eau -->
