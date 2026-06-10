# Domaine 05 — Mutations / État daté / Vente de lots / Procédures juridiques — **SCHÉMA CIBLE (blueprint)**

> Conçu 2026-06-04. Forme idéale (PAS une photo du live). Cadre verrouillé par décisions USER.
> **A1 — PAS de reprise du live.** Schéma cible construit A→Z ; la COPRO-TEMPLATE propre sert de référence test/démo. L'historique live ne fait pas foi.
> **A3 (loi)** — mutation = état daté 3 parties (art.5 décret 67-223) + recouvrement par OPPOSITION (art.20 loi 65-557) + fonds ALUR figé au lot (art.14-2). Lot-centric strict (A2).

---

## 0. Périmètre du domaine cible

| Table cible | Rôle | Décision (template propre A1 — pas de reprise live) |
|---|---|---|
| `mutations` | Dossier de vente/transfert d'un lot — change le PROPRIÉTAIRE du lot, jamais le solde | **CONSTRUITE A→Z, lot-centric** |
| `mutation_steps` | Avancement workflow (kanban) — `status` = vérité (A21) | **GARDÉE** (détail kanban, pas source d'avancement) |
| `etat_date_snapshots` | État daté **3 parties légales** (art.5 décret 67-223) figé depuis le GL | **3 PARTIES légales, immuable** |
| `mutation_oppositions` | Avis de mutation notaire + **opposition art.20** (loi 65-557) | **NOUVELLE** (recouvrement légal) |
| `legal_proceedings` | Procédures / contentieux / recouvrement | **lot-centric + masquage RGPD A14** |

> **Notaire = rôle de `tiers` (domaine 07).** Pas de table `notaires` : notaire = flag `is_notary` sur `tiers` (07 §1.11). `mutations.notaire_id` / `mutation_oppositions.notaire_id` = **FK vers `tiers(id)`**, domaine 07 propriétaire, domaine 05 consommateur. Voir §1.1.

**Hors domaine :**
- `dossiers` → **A5 : DROP** (mini-kanban démo, pas de module tâches). Ne PAS reprendre.
- `alur_transfers` → le fonds ALUR art.14-2 **reste attaché au lot** (A3) ; aucun transfert ni table de transfert à la mutation. La compta ALUR appartient au domaine Finance.

---

## 1. TABLES (schéma cible)

### 1.1 `mutations` — dossier de vente/transfert d'un lot

Cadre cible : notaire en **FK `notaire_id → tiers(id)` `is_notary`** (domaine 07), **représentation unique de l'acquéreur** (`buyer_owner_id`, NULL jusqu'à `validate_mutation`), `period_id` (période où sera posté l'encaissement art.20 via `mutation_oppositions`, pas une écriture de transfert), `cancelled_at/reason` pour la traçabilité. La mutation **change le propriétaire du lot** (`lot_owners`) ; le solde 450 reste attaché au LOT (A2/A3).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `lot_id` | uuid | NO | — | FK lots — **unité de gestion** |
| `period_id` | uuid | YES | — | FK accounting_periods — période de l'encaissement art.20 (rempli au règlement de l'opposition) |
| `status` | `mutation_status` (enum) | NO | `'draft'` | voir §2 |
| `mutation_type` | `mutation_type` (enum) | NO | `'sale'` | voir §2 |
| `seller_owner_id` | uuid | NO | — | FK coproprietaires (vendeur) |
| `buyer_owner_id` | uuid | YES | — | FK coproprietaires — **NULL tant que l'acquéreur n'est pas créé** ; rempli par `validate_mutation` |
| `notaire_id` | uuid | YES | — | **FK `tiers(id)`** (tiers `is_notary`, domaine 07 — remplace notary_name/email/reference) |
| `requested_at` | timestamptz | NO | `now()` | date de demande du dossier |
| `signature_date` | date | YES | — | date acte authentique |
| `effective_date` | date | YES | — | date de transfert effectif (= date pivot des soldes art.20) |
| `cancelled_at` | timestamptz | YES | — | **NOUVEAU** — traçabilité annulation |
| `cancel_reason` | text | YES | — | **NOUVEAU** |
| `created_by` | uuid | YES | — | FK profiles |
| `notes` | text | YES | — | libre |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger consolidé |

**SUPPRIMÉ vs live** : `buyer_name`, `buyer_email`, `buyer_is_company` (doublon `buyer_owner_id` ⇒ source d'incohérence ; les infos pré-acquéreur transitent par le payload de step `demande` jusqu'à création du coproprietaire), `notary_name`, `notary_email`, `notary_reference` (→ rôle `tiers` `is_notary`, domaine 07 ; `notaire_id → tiers(id)`).

- **PK** : `id`.
- **FK** :
  - `copro_id → copros(id)` **ON DELETE CASCADE**
  - `lot_id → lots(id)` **ON DELETE RESTRICT** *(garde-fou conservé : empêche suppression d'un lot avec mutation)*
  - `period_id → accounting_periods(id)` **ON DELETE RESTRICT**
  - `seller_owner_id → coproprietaires(id)` **ON DELETE RESTRICT**
  - `buyer_owner_id → coproprietaires(id)` **ON DELETE RESTRICT**
  - `notaire_id → tiers(id)` **ON DELETE SET NULL** *(tiers `is_notary`, domaine 07 — voir 07 §1.11)*
  - `created_by → profiles(id)` **ON DELETE SET NULL**
- **CHECK** :
  - `ck_mut_dates` : `signature_date IS NULL OR effective_date IS NULL OR effective_date >= signature_date`
  - `ck_mut_cancelled` : `(status='cancelled') = (cancelled_at IS NOT NULL)` *(cohérence annulation)*
  - `ck_mut_seller_buyer_distinct` : `buyer_owner_id IS NULL OR buyer_owner_id <> seller_owner_id`
- **UNIQUE** : conservé tel quel — **`uq_mutations_active_lot` UNIQUE partiel sur `lot_id` WHERE `status IN ('draft','pre_etat_generated','etat_generated','signed')`** *(excellent garde-fou « une seule mutation active par lot » — BIEN FAIT, gardé)*.
- **Index** : `idx_mutations_copro_status (copro_id, status)` · `idx_mutations_seller (seller_owner_id)` · `idx_mutations_lot (lot_id)` · `idx_mutations_period (period_id)`.
- **Triggers** : `set_updated_at` (BEFORE UPDATE, fonction consolidée unique) · `tr_mutation_init_steps` (AFTER INSERT → seed des steps, voir §4) · **`tr_mutation_copro_consistency`** (BEFORE I/U → vérifie que `lot.copro_id = copro_id` ET `period.copro_id = copro_id`, **intégrité copro_id ajoutée**).

---

### 1.2 `mutation_steps` — avancement du workflow (kanban)

**Décision tranchée** (résout le candidat mort §4 cartographie + arbitrage cartographie « kanban OU dérivé du status ») : **on GARDE la table** (faux mort câblé front `lib/sales/api.ts` + vue `v_mutation_detail`, preuve T3-B) **mais elle n'est plus une source de vérité concurrente de `status`**. Le `status` global de `mutations` reste la vérité d'avancement ; `mutation_steps` ne porte QUE le détail kanban (payload, complété à quelle date, par qui) des 6 jalons. Garde-fou ajouté pour empêcher la désynchro silencieuse observée en live (mutation validée avec **0 step** persisté).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK (dénormalisé pour RLS — cohérence imposée par trigger) |
| `mutation_id` | uuid | NO | — | FK mutations |
| `step_key` | `mutation_step_key` (enum) | NO | — | voir §2 |
| `status` | `mutation_step_status` (enum) | NO | `'pending'` | voir §2 |
| `completed_at` | timestamptz | YES | — | rempli quand status→completed |
| `completed_by` | uuid | YES | — | **NOUVEAU** — FK profiles (qui a coché l'étape) |
| `payload` | jsonb | YES | `'{}'::jsonb` | détail libre (ex : coordonnées pré-acquéreur pour step `demande`) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

- **PK** : `id`. **UNIQUE** : `uq_mutation_step (mutation_id, step_key)`.
- **FK** : `copro_id → copros(id)` CASCADE · `mutation_id → mutations(id)` **CASCADE** · `completed_by → profiles(id)` SET NULL.
- **CHECK** : `ck_step_completed` : `(status='completed') = (completed_at IS NOT NULL)`.
- **Index** : `idx_mutation_steps_mutation (mutation_id)` · `idx_mutation_steps_status (mutation_id, status)`.
- **Triggers** : `set_updated_at` · **`tr_mutation_step_copro_consistency`** (vérifie `mutation.copro_id = copro_id`).

---

### 1.3 `etat_date_snapshots` — état daté en **3 parties légales** (art.5 décret 67-223, modifié décret 2020-153)

L'état daté n'est **pas** un simple relevé de solde : la loi (art.5 décret 67-223) impose **trois parties** que le syndic établit à la date de l'acte, **figées depuis le grand livre**. Le `payload` jsonb porte ces 3 blocs structurés, immuables une fois émis (comme une écriture du GL). `snapshot_type='pre'` = pré-état daté (avant compromis, indicatif) ; `'final'` = état daté définitif joint à l'acte.

Les **3 parties art.5** (clés du `payload`) :
- **P1 — `sommes_dues_par_vendeur`** : sommes dont le copropriétaire VENDEUR est débiteur envers le syndicat — provisions exigibles du budget prévisionnel, provisions hors budget (travaux art.14-2), charges impayées sur exercices antérieurs, **avances exigibles**, sommes devenues exigibles (cotisations travaux différées). Figées depuis le solde 450 du LOT à `effective_date`.
- **P2 — `sommes_dues_par_syndicat`** : sommes dont le syndicat est débiteur envers le vendeur — **méthode de calcul de la quote-part** (clés de répartition, tantièmes), avances/provisions excédentaires à restituer.
- **P3 — `a_la_charge_acquereur`** : sommes incombant au NOUVEL acquéreur — **reconstitution des avances** (art.14-2 / fonds de roulement), provisions du budget **non encore exigibles** (appels à venir), quote-part de travaux votés non encore appelés.

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `mutation_id` | uuid | NO | — | FK mutations |
| `lot_id` | uuid | NO | — | **FK lots** — l'état daté porte sur LE LOT (A2/lot-centric), figé même si le lot change de propriétaire |
| `snapshot_type` | `etat_date_type` (enum) | NO | — | `pre` / `final` |
| `effective_date` | date | NO | — | **date pivot** : date de l'acte, à laquelle le GL est figé |
| `generated_at` | timestamptz | NO | `now()` | |
| `generated_by` | uuid | YES | — | FK profiles |
| `payload` | jsonb | NO | — | **3 parties art.5** : `partie_1_sommes_dues_vendeur`, `partie_2_dues_par_syndicat`, `partie_3_charge_acquereur` + `lot,copro,seller,legal_reference='art.5 décret 67-223',effective_date,balance_45x_by_nature,alur_balance` (figés GL) |
| `document_id` | uuid | YES | — | FK documents (PDF GED) — NULL acceptable tant que le PDF n'est pas matérialisé |
| `created_at` | timestamptz | NO | `now()` | |

- **PK** : `id`.
- **FK** : `copro_id → copros(id)` CASCADE · `mutation_id → mutations(id)` CASCADE · `lot_id → lots(id)` **ON DELETE RESTRICT** · `document_id → documents(id)` **ON DELETE SET NULL** · `generated_by → profiles(id)` SET NULL.
- **CHECK** : `ck_etat_date_payload_parts` : `payload ? 'partie_1_sommes_dues_vendeur' AND payload ? 'partie_2_dues_par_syndicat' AND payload ? 'partie_3_charge_acquereur'` *(impose les 3 parties légales)*.
- **Index** : `idx_etat_date_mutation (copro_id, mutation_id, snapshot_type)` (non unique — historisation par design) · `idx_etat_date_lot (lot_id)`.
- **Triggers** : **`tr_etat_date_immutable`** (BEFORE U/D → **RAISE** : un état daté émis est immuable, comme une écriture du grand livre ; seul `document_id` peut être renseigné UNE fois s'il était NULL — exception ciblée). · `tr_etat_date_copro_consistency` (impose `mutation.copro_id = copro_id` ET `lot.copro_id = copro_id`).

---

### 1.3 bis `mutation_oppositions` — avis de mutation + **opposition art.20** (loi 65-557)

**NOUVELLE table — recouvrement légal de la vente.** À la vente, le syndicat recouvre les sommes dues PAR LE VENDEUR (P1 de l'état daté) **non pas** par un transfert comptable, mais via la procédure légale de l'**article 20 de la loi du 10 juillet 1965** : le notaire notifie au syndic un **avis de mutation** (transfert de propriété) ; le syndic dispose de **15 jours** pour former **opposition** au versement des fonds entre les mains du notaire, en précisant le **montant et les causes** de sa créance (créances **liquides et exigibles**, garanties par le **privilège immobilier spécial**). Le notaire, à défaut de contestation, **verse les sommes au syndicat dans les 3 mois**. Cet encaissement APURE le 450 exigible DU LOT (lot-centric).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `mutation_id` | uuid | NO | — | FK mutations |
| `lot_id` | uuid | NO | — | **FK lots** — créance attachée au LOT (A2) |
| `notaire_id` | uuid | YES | — | FK `tiers(id)` (`is_notary`, domaine 07) — émetteur de l'avis |
| `avis_mutation_date` | date | NO | — | date de réception de l'avis de mutation du notaire (point de départ des 15 j) |
| `opposition_deadline` | date | NO | — | `avis_mutation_date + 15 jours` (délai légal art.20) |
| `opposition_date` | date | YES | — | date d'émission de l'opposition par le syndic (NULL si pas encore formée) |
| `amount_opposed` | numeric(14,2) | NO | `0` | **montant** de la créance opposée (somme des causes) |
| `causes` | jsonb | NO | `'[]'::jsonb` | **causes** détaillées art.20 (par nature 450-x : provisions exigibles, impayés, travaux différés…) — liquides et exigibles |
| `status` | `opposition_status` (enum) | NO | `'pending'` | voir §2 (`pending → opposed → paid / released / contested`) |
| `notaire_payment_date` | date | YES | — | date du versement du notaire (≤ 3 mois) |
| `paid_amount` | numeric(14,2) | YES | — | montant effectivement versé par le notaire |
| `ledger_transaction_id` | uuid | YES | — | FK vers l'écriture d'encaissement qui apure le 450 du lot (`source_type='mutation'`) |
| `notes` | text | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintenu par trigger |

- **PK** : `id`. **UNIQUE** : `uq_opposition_mutation (mutation_id)` *(une opposition par dossier de mutation)*.
- **FK** : `copro_id → copros(id)` CASCADE · `mutation_id → mutations(id)` **CASCADE** · `lot_id → lots(id)` **ON DELETE RESTRICT** · `notaire_id → tiers(id)` SET NULL.
- **CHECK** :
  - `ck_opp_amount` : `amount_opposed >= 0`
  - `ck_opp_deadline` : `opposition_deadline = avis_mutation_date + 15` *(délai légal figé)*
  - `ck_opp_opposed_in_time` : `opposition_date IS NULL OR opposition_date <= opposition_deadline` *(opposition recevable dans les 15 j)*
  - `ck_opp_paid` : `status <> 'paid' OR (notaire_payment_date IS NOT NULL AND paid_amount IS NOT NULL AND ledger_transaction_id IS NOT NULL)` *(un versement encaissé pointe son écriture)*
- **Index** : `idx_opposition_copro (copro_id)` · `idx_opposition_lot (lot_id)` · `idx_opposition_status (copro_id, status)`.
- **Triggers** : `set_updated_at` · `tr_opposition_copro_consistency` (impose `mutation.copro_id = copro_id` ET `lot.copro_id = copro_id`).

---

### 1.4 `legal_proceedings` — procédures juridiques / contentieux / recouvrement

Refonte : **rendre lot-centric** + **masquage RGPD A14**. Ajout des liens vers le lot débiteur et la créance concernée pour les procédures de recouvrement. `opposing_party` reste en texte libre pour les contentieux non-recouvrement (entreprise BTP, etc.).

| Colonne | Type PG | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `copro_id` | uuid | NO | — | FK copros |
| `title` | text | NO | — | |
| `nature` | `legal_proceeding_nature` (enum) | NO | — | `litigation` / `recovery` / `other` |
| `status` | `legal_proceeding_status` (enum) | NO | `'pending'` | voir §2 |
| `lot_id` | uuid | YES | — | **NOUVEAU** — lot débiteur (recouvrement lot-centric) |
| `debtor_owner_id` | uuid | YES | — | **NOUVEAU** — coproprietaire débiteur |
| `nature_filter` | `repartition_category` (enum) | YES | — | **NOUVEAU** — nature de créance visée. `repartition_category` (general/special/alur) ≠ `account_receivable_nature` ; mapping code→sous-compte 450 = source unique **02 §1.1 / ENUMS §6.1** |
| `opposing_party` | text | YES | — | partie adverse texte libre (contentieux hors recouvrement) |
| `amount_at_stake` | numeric(14,2) | YES | — | montant en jeu |
| `start_date` | date | YES | — | |
| `end_date` | date | YES | — | |
| `court` | text | YES | — | juridiction |
| `lawyer` | text | YES | — | avocat (texte libre — pourra pointer `tiers` plus tard) |
| `notes` | text | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | **désormais maintenu par trigger** |

- **PK** : `id`.
- **FK** : `copro_id → copros(id)` CASCADE · `lot_id → lots(id)` **ON DELETE SET NULL** · `debtor_owner_id → coproprietaires(id)` **ON DELETE SET NULL**.
- **CHECK** :
  - `ck_legal_amount` : `amount_at_stake IS NULL OR amount_at_stake >= 0`
  - `ck_legal_dates` : `end_date IS NULL OR start_date IS NULL OR end_date >= start_date`
  - `ck_legal_recovery_target` : `nature <> 'recovery' OR lot_id IS NOT NULL` *(une procédure de recouvrement DOIT cibler un lot — impose le lot-centric)*
- **Index** : `idx_legal_copro (copro_id)` · `idx_legal_lot (lot_id) WHERE lot_id IS NOT NULL` · `idx_legal_status (copro_id, status)`.
- **Triggers** : **`set_updated_at`** (AJOUTÉ — corrige le bug latent) · `tr_legal_copro_consistency` (si lot_id renseigné → `lot.copro_id = copro_id`).

---

### 1.5 Notaire — **PAS de table dans ce domaine** (rôle de `tiers`, domaine 07)

L'arbitrage 05-A2 est **TRANCHÉ** dans `07 §1.11` : le notaire n'est **pas** un référentiel séparé mais un **rôle de l'entité `tiers`** (`is_notary=true`), domaine 07 propriétaire. Aucune table `notaires` n'est créée ici.

- **Identité** (`name`, `email`, `phone`) : portée par `tiers` (mutualisée avec prestataires/fournisseurs).
- **Colonnes de rôle notaire** : `office_name` (étude) et `notary_reference` (réf. dossier côté notaire) sont portées par `tiers` (cf. 07 §1.1).
- **Référencement** : `mutations.notaire_id → tiers(id)` (`ON DELETE SET NULL`), voir §1.1.
- **RLS** : le tiers `is_notary` est sous la policy `tiers` du domaine 07 ; le SELECT copropriétaire sur `tiers` est filtré `is_notary = false` (notaires masqués, donnée de mutation sensible). Ce domaine 05 n'a donc **aucune RLS/migration/trigger « notaires »** à porter.

---

## 2. ENUMS (catalogue rationalisé — cités, pas redéfinis)

Le domaine introduit des enums propres en remplacement des CHECK texte actuels (cohérent avec la rationalisation T2). Noms cibles :

| Enum cible | Valeurs | Remplace (live = CHECK text) |
|---|---|---|
| `mutation_status` | `draft, pre_etat_generated, etat_generated, signed, validated, cancelled` | CHECK sur `mutations.status` |
| `mutation_type` | `sale, donation, succession, other` | CHECK sur `mutations.mutation_type` |
| `mutation_step_key` | `demande, pre_etat_date, etat_date, envoi_notaire, signature_acte, cloture_compte` | CHECK sur `mutation_steps.step_key` |
| `mutation_step_status` | `pending, in_progress, completed, skipped` | CHECK sur `mutation_steps.status` |
| `etat_date_type` | `pre, final` | CHECK sur `etat_date_snapshots.snapshot_type` |
| `opposition_status` | `pending, opposed, paid, released, contested` | **NOUVEAU** — `mutation_oppositions.status` (art.20) |
| `legal_proceeding_nature` | `litigation, recovery, other` | CHECK sur `legal_proceedings.nature` |
| `legal_proceeding_status` | `pending, in_progress, closed, won, lost` | CHECK sur `legal_proceedings.status` |

**Enums RÉUTILISÉS du catalogue transverse** (ne pas dupliquer) : `repartition_category` (general/special/alur) sur `legal_proceedings.nature_filter`. C'est un enum DISTINCT de `account_receivable_nature` ; le mapping `repartition_category` → sous-compte 450 (general≈450-1 courant, special/works≈450-2 travaux, alur≈450-5) fait autorité dans **02 §1.1 / ENUMS §6.1** (source unique code→nature ; 450-3=advance, 450-4=loan). Ne PAS câbler nature_filter→450-3.

---

## 3. RLS (3 rôles + bypass service_role)

**Principe verrouillé** : RLS `ENABLE` + `FORCE` sur **toutes** les tables du domaine (corrige le DRIFT critique : aujourd'hui les 3 tables mutations ont RLS **désactivé** avec policies inertes). Mutations / état daté = **GESTIONNAIRE uniquement, jamais anon, jamais copropriétaire** (décision USER). `legal_proceedings` = gestionnaire en écriture, copropriétaire en lecture restreinte (transparence légale sur le contentieux de SA copro). *(La RLS du notaire est portée par le domaine 07 sur `tiers` — masquage `is_notary=false` côté copropriétaire — pas ici.)*

Helpers (T1-G, SECURITY DEFINER, déjà existants) : `user_is_copro_manager(p_copro_id)`, `user_has_copro_access(p_copro_id)`.
`service_role` bypasse via `FORCE ROW LEVEL SECURITY` + policies excluant explicitement le rôle machine (post-as-you-go / callbacks). Convention : **toutes les policies ciblent `authenticated`** ; `service_role` n'est jamais soumis aux policies métier.

| Table | Rôle | Policy (cmd) | Garde / `USING` + `WITH CHECK` |
|---|---|---|---|
| `mutations` | **gestionnaire** | SELECT/INSERT/UPDATE/DELETE | `user_is_copro_manager(copro_id)` (USING + WITH CHECK) |
| `mutations` | copropriétaire | — | **AUCUNE policy** (pas d'accès — décision USER) |
| `mutations` | anon | — | **AUCUNE policy** (refus total) |
| `mutation_steps` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` |
| `mutation_steps` | copro / anon | — | aucune |
| `etat_date_snapshots` | gestionnaire | SELECT/INSERT | `user_is_copro_manager(copro_id)` ; **pas d'UPDATE/DELETE policy** (immuable, renforce le trigger) |
| `etat_date_snapshots` | copro / anon | — | aucune |
| `mutation_oppositions` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` (USING + WITH CHECK) |
| `mutation_oppositions` | copro / anon | — | **aucune** (procédure de recouvrement nominative — gestionnaire only) |
| `legal_proceedings` | gestionnaire | ALL | `user_is_copro_manager(copro_id)` (USING + WITH CHECK) |
| `legal_proceedings` | **copropriétaire** | SELECT | `user_has_copro_access(copro_id)` *(transparence du contentieux de sa copro)* — **lecture via la vue `v_legal_proceedings_copro` (A14)**, jamais la table en direct |
| `legal_proceedings` | anon | — | aucune |

**A14 — masquage RGPD sur les recouvrements nominatifs.** Le copropriétaire a le droit de voir le contentieux de SA copro (transparence légale), mais **pas** d'identifier nominativement un voisin débiteur. La policy SELECT copropriétaire pointe la **vue `v_legal_proceedings_copro`** (SECURITY INVOKER) qui :
- expose intégralement les lignes `nature IN ('litigation','other')` ;
- pour `nature='recovery'` : **masque `debtor_owner_id`, `lot_id`, `nature_filter`** (NULL) et anonymise `title` (« Procédure de recouvrement »), ne laissant que `status`/`amount_at_stake`/`start_date` agrégés.
Le gestionnaire lit la table en clair (sa policy ALL). Voir §5 bis.

**Plan de câblage `coproprietaires.user_id` (NULL aujourd'hui)** : les policies copropriétaire de `legal_proceedings` reposent sur `user_has_copro_access` → `memberships(user_id, copro_id, role)`. La transparence copro fonctionne dès qu'un membership `coproprietaire` existe, **indépendamment** de `coproprietaires.user_id`. Le câblage `coproprietaires.user_id → auth.users` reste requis pour le futur portail copro mais **n'est pas bloquant** pour ce domaine (le gestionnaire, lui, est déjà câblé via memberships). Tant que `user_id` est NULL, seul le gestionnaire opère — ce qui est exactement le périmètre voulu ici.

---

## 4. TRIGGERS conservés / ajoutés

| Trigger | Table | Événement | Rôle | Statut |
|---|---|---|---|---|
| `set_updated_at` | mutations, mutation_steps, mutation_oppositions, legal_proceedings | BEFORE UPDATE | horodatage (fonction **consolidée unique**) | **CONSOLIDÉ** |
| `tr_opposition_copro_consistency` | mutation_oppositions | BEFORE I/U | impose `mutation.copro_id = copro_id` ET `lot.copro_id = copro_id` | **AJOUTÉ** |
| `tr_mutation_init_steps` | mutations | AFTER INSERT | seed des 6 steps (demande=completed, reste pending) via `initialize_mutation_steps()` | **GARDÉ** |
| `tr_mutation_copro_consistency` | mutations | BEFORE I/U | impose `lot.copro_id = copro_id` ET `period.copro_id = copro_id` | **AJOUTÉ** (intégrité) |
| `tr_mutation_step_copro_consistency` | mutation_steps | BEFORE I/U | impose `mutation.copro_id = copro_id` | **AJOUTÉ** |
| `tr_etat_date_immutable` | etat_date_snapshots | BEFORE U/D | **RAISE** sauf renseignement unique de `document_id` quand NULL ; jamais de DELETE | **AJOUTÉ** (immutabilité art.20, calqué sur GL) |
| `tr_etat_date_copro_consistency` | etat_date_snapshots | BEFORE I/U | impose `mutation.copro_id = copro_id` | **AJOUTÉ** |
| `tr_legal_copro_consistency` | legal_proceedings | BEFORE I/U | si `lot_id` renseigné → `lot.copro_id = copro_id` | **AJOUTÉ** |

---

## 5. FONCTIONS du domaine (GARDER / RÉÉCRIRE / ABANDONNER)

Cohérent avec T1-H. Toutes les fonctions d'écriture : **`REVOKE EXECUTE FROM anon`**, `GRANT authenticated`, garde in-function `G-MGR` (`IF NOT user_is_copro_manager(p_copro_id) THEN RAISE`). Aucune n'est accessible anon (décision USER : gestionnaire only).

| Fonction | Disposition | Garde | Changement cible |
|---|---|---|---|
| `initialize_mutation_steps()` (trigger) | **GARDER** | G-TRIG (REVOKE direct) | inchangé |
| `upsert_mutation_step(p_mutation_id, p_step_key, p_status, p_payload)` | **GARDER** | **G-MGR** (était anon) | + renseigne `completed_by = auth.uid()` |
| `generate_etat_date_payload(p_copro_id, p_mutation_id, p_snapshot_type, p_effective_date)` | **RÉÉCRIRE** | **G-MGR** | **produit les 3 PARTIES art.5** depuis le GL figé à `p_effective_date` : P1 (sommes dues vendeur = 450-x exigibles du LOT + impayés + travaux différés + avances exigibles), P2 (méthode quote-part), P3 (charge acquéreur = reconstitution avances + provisions non exigibles). Lit `v_owner_statement_*`, `ledger_entries`+`accounts(45x,105%)`, `call_for_funds(+lines)` |
| `create_etat_date_snapshot(p_copro_id, p_mutation_id, p_snapshot_type, p_effective_date)` | **GARDER** | **G-MGR** | INSERT snapshot (3 parties) + doc GED + MAJ status ; immuable |
| `validate_mutation(p_mutation_id, p_signature_date, p_effective_date, p_buyer_owner_id)` | **RÉÉCRIRE (loi A3)** | **G-MGR** | **NE poste AUCUN transfert personne→personne et NE solde PAS le 450.** Elle (1) **change le propriétaire du lot** dans `lot_owners` (clôt `lot_owners` du vendeur à `effective_date`, ouvre celui de l'acquéreur `p_buyer_owner_id`) ; **le solde 450 reste attaché au LOT** (lot-centric A2) ; (2) renseigne `mutations.buyer_owner_id`/`signature_date`/`effective_date`, status→`validated`, step `signature_acte`/`cloture_compte=completed`. Le recouvrement passe par `mutation_oppositions` (art.20), pas ici |
| `record_mutation_opposition(p_mutation_id, p_avis_date, p_causes)` | **NOUVELLE** | **G-MGR** | crée l'opposition art.20 : fige le montant + causes depuis P1 de l'état daté, pose `opposition_deadline = avis+15j`, status→`opposed`. Pas d'écriture (créance déjà au 450) |
| `settle_mutation_opposition(p_opposition_id, p_payment_date, p_amount)` | **NOUVELLE** | **G-MGR** | **encaissement notaire** : poste via `create_ledger_transaction` D512/C450-x du LOT (`source_type='mutation'`, `source_id`), **APURE le 450 exigible du lot**, renseigne `ledger_transaction_id`/`paid_amount`, status→`paid`. **Fonds ALUR (105/450-5) NON touchés** (art.14-2 reste au lot) |
| `reconstitute_buyer_advances(p_mutation_id, p_amount, p_payment_date)` | **NOUVELLE** | **G-MGR** | l'acquéreur **reconstitue les avances** (P3) : nouvel encaissement D512/C450-3 (avances) sur le LOT. Mouvement distinct, pas un transfert du vendeur |
| `create_test_copro*` / seed COPRO-TEMPLATE | **GARDER** | G-SVC (REVOKE anon) | construit la mutation de démo A→Z (A1) |

**Fonds ALUR art.14-2 — AUCUN mouvement à la mutation.** Le fonds de travaux (compte 105 / sous-solde 450-5) est **attaché au lot et non remboursable au vendeur** (art.14-2 II loi 65-557) : `validate_mutation` ne génère **aucune** écriture ALUR. Le solde ALUR suit le lot vers l'acquéreur de plein droit.

**Règle lot-centric (A2/A3)** : à aucun moment une fonction ne déplace un solde d'un compte personne A vers une personne B. Le solde vit sur le LOT ; on change `lot_owners`. Le solde par personne se dérive en sommant ses lots.

`legal_proceedings` / `mutation_oppositions` masquées : voir vues §5 bis (A14).

---

## 5 bis. VUES DU DOMAINE — disposition

Recensement des vues vivantes (schéma `public`) câblées au domaine, pour qu'aucune vue lue par le front ne reste sans disposition explicite.

| Vue | Lecteur | Disposition | Note |
|---|---|---|---|
| `v_mutation_detail` | `lib/sales/api.ts` (détail mutation + steps kanban + opposition) | **GARDER** | Agrège `mutations` + `mutation_steps` + `mutation_oppositions` (état art.20). Colonnes cibles : `buyer_owner_id`, `notaire_id → tiers(id)`, `mutations.status` = **vérité d'avancement** (A21). |
| `v_legal_proceedings_copro` | policy SELECT **copropriétaire** sur `legal_proceedings` (A14) | **NOUVELLE** (SECURITY INVOKER) | Expose `litigation`/`other` en clair ; pour `nature='recovery'` **masque `debtor_owner_id`/`lot_id`/`nature_filter` (NULL)** et anonymise `title`. Le copropriétaire ne lit JAMAIS la table en direct. |

Les vues finance lues par `generate_etat_date_payload` (`v_owner_statement_summary`, `v_owner_statement_lines`, soldes 45x/105 du LOT) appartiennent au **domaine 02** (cf. 02 §5 bis) ; ce domaine 05 les consomme pour figer les 3 parties art.5 (§1.3, §5).

---

## 6. COPRO-TEMPLATE — construction A→Z (A1, PAS de reprise live)

**A1 : aucune donnée du live n'est migrée.** Le domaine est instancié depuis zéro par le seed `create_test_copro*` qui construit une **mutation de démonstration légale** sur la COPRO-TEMPLATE, illustrant le cycle complet art.5 + art.20 + art.14-2 :

1. `mutations` : 1 dossier `mutation_type='sale'`, vendeur + lot du template, `notaire_id → tiers(is_notary)` (créé via seed domaine 07). `buyer_owner_id=NULL` jusqu'à `validate_mutation`.
2. `etat_date_snapshots` : 1 `final` généré par `generate_etat_date_payload` → **3 parties art.5** figées depuis le GL du template (P1 sommes dues vendeur, P2 quote-part, P3 charge acquéreur).
3. `mutation_oppositions` : 1 opposition art.20 (`record_mutation_opposition`) avec `amount_opposed` = P1, `opposition_deadline = avis+15j` ; puis `settle_mutation_opposition` → encaissement D512/C450-x qui **apure le 450 du lot**.
4. `validate_mutation` : change `lot_owners` (vendeur→acquéreur à `effective_date`), **sans toucher le solde** (reste au lot). Fonds ALUR **inchangé** (suit le lot).
5. `reconstitute_buyer_advances` : l'acquéreur reconstitue les avances (P3) → encaissement D512/C450-3.
6. `legal_proceedings` : 1 `litigation` de démo (ex. contentieux infiltrations) pour exercer la transparence copro + la vue masquée A14, et 1 `recovery` (lot ciblé) pour vérifier le masquage RGPD.

Tous les `mutation_steps` sont seedés par trigger puis cochés cohéremment avec `status`. Le seed REVOKE anon (G-SVC).

---

## 7. ARBITRAGES — statut

### A1. **Mécanique d'écriture à la mutation** — **TRANCHÉ (décision USER A3, loi)**
`validate_mutation` **ne poste PAS** d'écriture de transfert personne→personne et **ne solde PAS** le 450 : le solde reste attaché au LOT (lot-centric A2). Le recouvrement des sommes dues par le vendeur (P1) passe par l'**opposition art.20** (`mutation_oppositions` + `settle_mutation_opposition`) dont l'encaissement notaire (D512/C450-x) apure le 450 exigible du lot. Le fonds ALUR art.14-2 reste au lot (aucun mouvement). L'acquéreur reconstitue les avances (P3) par un encaissement distinct. **Plus d'arbitrage ouvert.**

### A4. **Masquage RGPD du recouvrement copropriétaire** — **TRANCHÉ (décision USER A14)**
Le copropriétaire voit `legal_proceedings` de nature `litigation`/`other` en clair ; pour `recovery`, **débiteur et lot sont masqués** (vue `v_legal_proceedings_copro`, SECURITY INVOKER, §5 bis). Les `mutation_oppositions` (nominatives) sont **gestionnaire only**, aucune policy copro. **Plus d'arbitrage ouvert.**

### A2. **Notaire : table dédiée OU rôle de l'entité `tiers`** ? — **TRANCHÉ (07 §1.11)**
Décision actée : le notaire est un **rôle de `tiers`** (`is_notary=true`), pas une table séparée. La table `notaires` du blueprint 05 est **abandonnée** ; `mutations.notaire_id` pointe **`tiers(id)`** (`ON DELETE SET NULL`). Les colonnes de rôle (`office_name`, `notary_reference`) sont portées par `tiers`. Le `tiers_id` « de transition » initialement proposé ici n'a plus lieu d'être (le notaire EST le tiers). Domaine 07 propriétaire, domaine 05 consommateur. **Plus d'arbitrage ouvert.**

### A3. **`dossiers` (kanban de tâches transverses)** — **TRANCHÉ AILLEURS (06 §9)**
Hors domaine juridique (12 lignes sur 11111111, RLS permissive `true`, `id` en `text` non-uuid, aucune colonne juridique). Le sort de `dossiers` n'est **plus un arbitrage de ce domaine** : il est tranché au **point de décision unique `06 §9`** → **`DROP TABLE dossiers` par défaut** (kanban non au roadmap), avec option rattachement au domaine `tâches-gestion` si l'utilisateur le confirme. Ce domaine 05 a déjà coupé tout lien et ne le reprend pas. **Voir 06 §9.**

### A5. **`mutation_steps` vs `mutations.status`** — **TRANCHÉ (décision USER A21)**
`status` = vérité d'avancement ; `mutation_steps` = détail kanban + garde-fou anti-désync. Le rebranchement du front (`lib/sales/api.ts`) pour qu'il cesse de traiter `steps` comme source d'avancement est une **tâche d'implémentation hors-SQL**, pas un arbitrage ouvert. **Plus d'arbitrage ouvert.**

---

## 8. Synthèse — conformité légale (A3)

**Cadre légal posé** :
- **État daté en 3 parties** (art.5 décret 67-223) figé depuis le GL : P1 sommes dues vendeur, P2 quote-part, P3 charge acquéreur (§1.3, CHECK `ck_etat_date_payload_parts`, immuable).
- **Recouvrement par opposition art.20** (loi 65-557) : avis de mutation notaire + opposition sous 15 j (montant + causes, créances liquides/exigibles, privilège), versement notaire ≤ 3 mois qui **apure le 450 du LOT** (`mutation_oppositions`, §1.3 bis, `settle_mutation_opposition`).
- **Fonds ALUR art.14-2 figé au lot** : aucun mouvement à la vente, suit l'acquéreur de plein droit (§5).
- **Lot-centric strict (A2)** : `validate_mutation` change `lot_owners`, jamais de transfert personne→personne ; le solde vit sur le LOT (§5).
- **RGPD (A14)** : copropriétaire voit `litigation`/`other`, débiteur/lot masqués sur `recovery` (vue `v_legal_proceedings_copro`) ; oppositions gestionnaire only.
- **A21** : `mutation_steps` gardés, `mutations.status` = vérité d'avancement.

**Garde-fous structurels** : RLS ENABLE+FORCE · enums propres · immutabilité état daté (trigger) · cohérence `copro_id`/`lot_id` par triggers · index unicité mutation active/lot · notaire = rôle `tiers` (domaine 07) · `updated_at` consolidé.
