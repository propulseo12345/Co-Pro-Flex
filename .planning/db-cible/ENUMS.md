# ENUMS.md — Catalogue d'enums de la base CIBLE (rationalisé)

Source legacy : `_cartographie/T2-enums-vues-triggers.md` (65 enums live `iyfesbjnkpynmwlsmxnp`).
Objet : définir le set d'enums de la **DB cible** après fusion des doublons, purge du legacy et résolution des recouvrements de catégories.

Cohérent avec la mémoire projet : verrou de période (WP5.1, saisie gelée dès `status != 'open'`), règle lot-centric, 3 rôles d'autorisation, GL source unique.

---

## 0. Synthèse des décisions de rationalisation

| Décision | Avant | Après |
|---|---|---|
| Fusion votes | `vote_direction` + `council_vote_choice` | **`vote_choice`** unique |
| Fusion acheminement | `delivery_status` + `mail_delivery_status` | **`delivery_status`** unique |
| Période | `period_status` (5 val.) | **`period_status`** (open/closed/approved) — `locked`→`approved`, `rejected`→`open` |
| Rôle appartenance | `membership_role` (5 val.) | **`membership_role`** (3 val.) ; `admin` → **`platform_admin`** (A13, multi-cabinet) ; `membre_cs` → attribut conseil via `council_role` |
| Confidentialité doc | `document_confidentiality` (4 val. : public/council/manager/restricted) | **`document_visibility`** (3 val. : gestionnaire_seul/conseil/tous_coproprietaires — A4, labels alignés sur 06) ; `document_confidentiality` **supprimé**, `restricted`/ACL fine abandonnés avec le DROP de `document_access` |
| Catégories métier | `contract_type`, `provider_domain`, `planned_work_type` | **table de référence `work_domain`** (possédée par 07, FK partout — propagé dans 07 §1.1/§1.2/§1.5/§1.10/§1.12) ; `technical_doc_type` reste un enum |
| Catégories docs | `document_category` (20 val., courrier+correspondance, carnet_entretien, fiche_synthetique) | dédupliqué `courrier` + frontière pièce technique : retrait `correspondance`/`carnet_entretien`/`fiche_synthetique` (20→17) |
| Urgence/priorité | `urgency_level` + `work_priority` | **`priority_level`** unique (5 niveaux) |
| Statut budget | `budget_status` (7 val.) | **réduit à 5** (§1.8, tranché 03 §2) — −`draft_from_ag`/−`pending_approval` |
| ag_status archivage | `archived` manquant | **ajouté** (état terminal post-`finalized`, requis par `archive_ag`) |
| Enum porteur de table gardée | `payment_phase_status`, `transfer_destination` | **CONSERVÉS** : leurs tables porteuses `budget_payment_schedules` (câblée front) et `alur_transfers` sont GARDÉES (faux-morts câblés) |

> Les enums **non listés en §1/§2/§6** sont conservés à l'identique depuis le legacy (account_type, ag_meeting_type, budget_type, lot_type, majority_type, payment_method, etc.). Seuls les enums modifiés/fusionnés/supprimés (§1-§5) et **créés (§6)** sont détaillés ci-dessous.

---

## 1. Enums FUSIONNÉS ou MODIFIÉS

### 1.1 `vote_choice` (NOUVEAU — fusion du triplon de vote)

**Valeurs cibles :** `for`, `against`, `abstention`

| Legacy enum | Valeur legacy | → Cible | Note |
|---|---|---|---|
| `vote_direction` | for / against / abstention | `vote_choice.*` | identique, **enum supprimé** |
| `council_vote_choice` | for / against / abstention | `vote_choice.*` | identique, **enum supprimé** |
| `resolution_status` | (voting/voted/approved/rejected) | — | NON fusionné : c'est un **statut de résolution**, pas un choix de vote (reste distinct, cf. §1.7) |

> `vote_source` (live/correspondence) reste un enum séparé : c'est le **canal** du vote, orthogonal au choix.

---

### 1.2 `delivery_status` (fusion des 2 statuts d'acheminement)

**Valeurs cibles :** `pending`, `queued`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `failed`, `cancelled`

Union normalisée des deux enums legacy (on garde le surensemble pour ne perdre aucun état réel : `queued`/`cancelled` venaient de l'un, `clicked` de l'autre).

> **Mode de construction (l'enum cible ÉTEND l'enum live `delivery_status`, il ne le recrée pas).** L'enum live `delivery_status` ne contient PAS `clicked` ni `queued` (ils viennent de `mail_delivery_status`). La migration fait donc `ALTER TYPE delivery_status ADD VALUE 'clicked'` et `ADD VALUE 'queued'` (ajout, pas retrait — non destructif). `cancelled`/`opened`/`bounced`/`failed` sont déjà présents côté `delivery_status` live.
>
> **⚠ Remap text→enum de `ag_envoi_tracking.status` (04 §1.8).** La colonne `ag_envoi_tracking.status` est aujourd'hui `text` en live et porte la valeur `error` (9 lignes, dont l'immuable 11111111) **absente de l'enum cible**. Règle de conversion OBLIGATOIRE avant le `ALTER COLUMN ... TYPE delivery_status` : **`error → failed`** (sinon `invalid input value for enum delivery_status: "error"`). À répercuter dans 04 §1.8/§6.

| Legacy enum | Valeur legacy | → Cible |
|---|---|---|
| `delivery_status` | pending | `pending` |
| `delivery_status` | queued | `queued` |
| `delivery_status` | sent | `sent` |
| `delivery_status` | delivered | `delivered` |
| `delivery_status` | opened | `opened` |
| `delivery_status` | bounced | `bounced` |
| `delivery_status` | failed | `failed` |
| `delivery_status` | cancelled | `cancelled` |
| `mail_delivery_status` | pending | `pending` |
| `mail_delivery_status` | sent | `sent` |
| `mail_delivery_status` | delivered | `delivered` |
| `mail_delivery_status` | opened | `opened` |
| `mail_delivery_status` | clicked | `clicked` |
| `mail_delivery_status` | bounced | `bounced` |
| `mail_delivery_status` | failed | `failed` |

→ **`mail_delivery_status` supprimé** ; toutes ses colonnes repointent sur `delivery_status`.

---

### 1.3 `period_status` (3 valeurs — `open` / `closed` / `approved`, purge du legacy `locked`/`rejected`)

**Valeurs cibles :** `open`, `closed`, `approved`

**Décision tranchée (alignée sur le code conservé et la donnée live) : enum à 3 valeurs `open`/`closed`/`approved`.** Le verrou financier reste binaire (`status != 'open'` gèle la saisie de l'exercice), mais `closed` et `approved` sont **deux jalons distincts du cycle de vie** : `close_period` (04) arrête comptablement l'exercice (`closed`, jalon `closed_at`), puis `approve_period`/AG le valide (`approved`, jalon `approved_at`) — le modèle 02 garde `closed_at` ET `approved_at` comme deux dates séparées. Fusionner `closed` et `approved` casserait ce double jalon et le cast à la migration (les 2 copros réelles portent 6 périodes `closed` : 11111111 → 1 open + 2 closed + 1 approved ; 22222222 → 1 open + 1 closed). On ne purge donc que `locked` (verrou legacy abandonné WP5.2) et `rejected` (jamais utilisé). Le live porte 5 valeurs (open 11 / closed 6 / approved 3 / locked 0 / rejected 0) ; `locked` migre en `approved`, `rejected` (s'il en survenait) en `open`.

| Valeur legacy | → Cible | Note |
|---|---|---|
| open | `open` | conservé (exercice en cours, saisie ouverte) |
| closed | **`closed`** | conservé (6 lignes live) ; exercice arrêté comptablement (jalon `closed_at`), saisie gelée (`status != 'open'`) mais pas encore approuvé en AG |
| approved | `approved` | conservé (clôture validée en AG, jalon `approved_at` ; `reopen_period` interdit) |
| locked | **`approved`** | mappé → `approved` (verrou legacy abandonné WP5.2 ; 0 ligne live) |
| rejected | **`open`** | mappé → `open` (un exercice « rejeté » reste ouvert à correction ; 0 ligne live) |

> Conséquence sur les fonctions : `close_period` (04) écrit `closed`, `approve_period`/AG écrit `approved` (chaîne `close_period`→`approve_period` préservée) ; le gel de saisie teste `status != 'open'`, et seul `approved` interdit `reopen_period`.

---

### 1.4 `membership_role` (5 → 3 — multi-cabinet, A13)

**Valeurs cibles :** `platform_admin`, `gestionnaire`, `coproprietaire`

Le set minimal cohérent avec les **rôles d'autorisation multi-cabinet** (AUTORISATION §1 + décision MULTI-CABINET/A13) : `platform_admin` (équipe CoProFlex, transverse à tous les cabinets) / `gestionnaire` (gestionnaire **d'un cabinet**, cloisonné à ses copros via `cabinets`) / `coproprietaire`. Le cloisonnement par cabinet est porté par la couche de tenance (`copros.cabinet_id` FK NOT NULL) et **centralisé dans les helpers** `user_is_copro_manager`/`user_has_copro_access` — pas par une valeur d'enum supplémentaire. `membre_cs` n'est PAS un rôle d'appartenance : être au conseil syndical est un **attribut** porté par `council_role` (president/secretary/treasurer/member/observer) sur la table conseil — un copropriétaire reste `coproprietaire` même élu au CS.

| Valeur legacy | → Cible | Note |
|---|---|---|
| admin | **`platform_admin`** | **renommé (A13)** : équipe plateforme CoProFlex, rôle **transverse hors cabinet** (voit/agit cross-cabinet). Distinct du `gestionnaire` de cabinet. |
| gestionnaire | `gestionnaire` | syndic / gestionnaire **d'un cabinet** ; ne voit que les copros de SON cabinet (RLS cloisonnée) |
| coproprietaire | `coproprietaire` | copropriétaire |
| membre_cs | **supprimé** | un membre du CS est un `coproprietaire` + ligne dans `council_members` (`council_role`) |
| prestataire | **supprimé** | un prestataire n'est pas membre de la copro ; il vit dans `tiers` (table dédiée), pas dans l'appartenance |

> Migration : `admin` (legacy) → `platform_admin`. Si une autz « membre CS » est requise au niveau applicatif, elle se **dérive** de la présence dans `council_members`, pas d'une valeur d'enum. Le périmètre cabinet (`gestionnaire` borné à son cabinet, `platform_admin` transverse) est résolu dans les helpers d'autorisation, pas dans cet enum.

---

### 1.5 `priority_level` (NOUVEAU — fusion urgency_level + work_priority)

**Valeurs cibles :** `low`, `normal`, `medium`, `high`, `critical`

Échelle unique à 5 niveaux (on garde l'amplitude de `urgency_level`, plus expressive). `work_priority.urgent` est remappé sur `critical`.

| Legacy enum | Valeur legacy | → Cible |
|---|---|---|
| `urgency_level` | low | `low` |
| `urgency_level` | normal | `normal` |
| `urgency_level` | medium | `medium` |
| `urgency_level` | high | `high` |
| `urgency_level` | critical | `critical` |
| `work_priority` | low | `low` |
| `work_priority` | medium | `medium` |
| `work_priority` | high | `high` |
| `work_priority` | urgent | `critical` |

→ **`urgency_level` et `work_priority` supprimés**, remplacés par `priority_level`.

---

### 1.6 `ag_status` (ajout de l'état terminal `archived`)

**Valeurs cibles :** `draft`, `convoked`, `in_progress`, `session_active`, `closed`, `pv_generated`, `pv_signed`, `pv_sent`, `finalized`, `archived`

Décision tranchée en faveur du blueprint **04-ag** (§1.1 + §2) : la fonction `archive_ag` est **conservée** (gardée en G-MGR) et échouait faute de valeur `archived` dans l'enum. On **ajoute donc `archived`** comme **état terminal post-`finalized`** (une AG finalisée puis sortie de la vue active). C'est une valeur d'état dans l'enum, pas une table `archive_ag` séparée : `finalized` = clôturée légalement, `archived` = rangée hors du flux courant.

| Valeur legacy | → Cible | Note |
|---|---|---|
| draft → finalized (9 val.) | identiques | conservées telles quelles |
| *(archived)* | **ajouté** | état terminal post-`finalized` ; requis par `archive_ag` (04-ag) |

---

### 1.7 `resolution_status` (nettoyé — ne porte plus le choix de vote)

**Valeurs cibles :** `draft`, `pending`, `voting`, `voted`, `approved`, `rejected`, `adjourned`, `withdrawn`

Inchangé en valeurs, mais **clarifié** : ce sont des états de cycle de vie d'une résolution. Le décompte des voix (`for`/`against`/`abstention`) appartient désormais à `vote_choice` (§1.1), plus à `resolution_status`. Aucune fusion.

---

### 1.8 `budget_status` (réduit 7 → 5 — aligné sur le workflow réel des fonctions budget)

**Valeurs cibles :** `draft`, `submitted`, `validated`, `rejected`, `closed`

Décision tranchée en **03-budgets §2 (§7-A1)** et intégrée ici (le catalogue est la source unique ; cet enum n'est **plus « hors périmètre »**). Le live portait **7 valeurs** dont 4 quasi-synonymes au stade « pas encore validé ». Réduction alignée sur les fonctions réelles (`submit_budget` : draft→submitted ; `validate_budget` : draft/submitted→validated).

| Valeur legacy | → Cible | Note |
|---|---|---|
| draft | `draft` | brouillon (saisie manuelle OU issu d'AG) |
| draft_from_ag | **supprimé** → `draft` | la provenance AG est tracée par `source_ag_id`, pas besoin d'un statut dédié |
| submitted | `submitted` | soumis pour validation |
| pending_approval | **supprimé** → `submitted` | doublon de « en attente de validation » |
| validated | `validated` | budget actif (1 seul/copro×période×type) |
| rejected | `rejected` | refusé |
| closed | `closed` | exercice clôturé (budget historisé) |

---

## 2. Recouvrements de CATÉGORIES MÉTIER (4 enums → table de réf + enums réduits)

Les 4 enums partagent un large socle de corps de métier (ascenseur, chauffage, toiture, façade, électricité, plomberie, espaces_verts, sécurité…). Cible : **une table de référence `work_domain`** (corps de métier, extensible sans migration d'enum) que référencent contrats, prestataires et travaux planifiés ; les enums de *type de document* restent des enums car ce sont des typologies fermées réglementaires.

### 2.1 `work_domain` (NOUVELLE table de référence — remplace le socle commun)

Socle unifié (slug stable) : `plomberie`, `electricite`, `chauffage`, `climatisation`, `ascenseur`, `menage`, `espaces_verts`, `serrurerie`, `peinture`, `toiture`, `facade`, `etancheite`, `isolation`, `menuiserie`, `interphone`, `portail`, `securite`, `securite_incendie`, `accessibilite`, `parking`, `assurance`, `juridique`, `architecture`, `eau`, `electricite_commune`, `syndic`, `maintenance`, `autre`.

**Décision tranchée — option (a) `work_domain` partout** (les 3 enums catégories métier sont SUPPRIMÉS, remplacés par des FK vers la table de référence `work_domain`). Justification : un corps de métier doit être **extensible sans migration d'enum** (cf. mémoire projet) et un même socle (ascenseur, chauffage, toiture…) était dupliqué dans 3 enums divergents. `provider_domain` n'est donc **pas** « réutilisé tel quel ». **Décision propagée dans 07-maintenance (07 §1.1/§1.2/§1.5/§1.10/§2 réécrits — voir ci-dessous).**

**Propriété de la table `work_domain`** : la table de référence est **possédée par le domaine 07-maintenance** (domaine qui porte tiers/contrats/travaux, ses plus gros consommateurs). 07 crée la table (DDL + RLS lecture-pour-tous-rôles-authentifiés / écriture gestionnaire-ou-service_role + migration de seed des slugs ci-dessus). Les autres domaines la **consomment** via FK. C'est un référentiel partagé en lecture, à l'image de `accounts` (plan comptable) côté finance.

| Legacy enum | Couverture | → Cible |
|---|---|---|
| `contract_type` (17 val.) | corps de métier + assurance/syndic/juridique | `contracts.contract_type` → colonne `domain_id uuid → work_domain` ; valeurs `menage`/`nettoyage` dédupliquées en `menage` ; **enum supprimé** |
| `provider_domain` (18 val.) | corps de métier | `tiers.domains provider_domain[]` → `tiers.domain_ids uuid[] → work_domain` ; `logbook_entries.domain` → `domain_id uuid → work_domain` ; **enum supprimé** |
| `planned_work_type` (14 val.) | corps de métier travaux | `planned_works.work_type` → colonne `domain_id uuid → work_domain` ; **enum supprimé** |

#### 2.1.bis Correspondance COMPLÈTE valeur legacy → slug `work_domain`

Les 3 enums legacy ont été lus en live (`iyfesbjnkpynmwlsmxnp`, 2026-06-04). **Toutes** leurs valeurs sont couvertes par les 28 slugs seedés (§2.1) — aucune valeur orpheline, donc aucun remap vers `autre` forcé (sauf valeur inconnue future).

| Valeur legacy | Enum(s) source | → slug `work_domain` |
|---|---|---|
| `ascenseur` | contract_type, provider_domain, planned_work_type | `ascenseur` |
| `chauffage` | contract_type, provider_domain, planned_work_type | `chauffage` |
| `nettoyage` | contract_type | **`menage`** (dédup FR) |
| `menage` | contract_type, provider_domain | `menage` |
| `espaces_verts` | contract_type, provider_domain, planned_work_type | `espaces_verts` |
| `securite` | contract_type, provider_domain | `securite` |
| `securite_incendie` | planned_work_type | `securite_incendie` (distinct de `securite`) |
| `assurance` | contract_type, provider_domain | `assurance` |
| `syndic` | contract_type | `syndic` |
| `eau` | contract_type | `eau` |
| `electricite` | contract_type, provider_domain, planned_work_type | `electricite` |
| `toiture` | contract_type, provider_domain, planned_work_type | `toiture` |
| `facade` | contract_type, provider_domain, planned_work_type | `facade` |
| `interphone` | contract_type, provider_domain | `interphone` |
| `portail` | contract_type, provider_domain | `portail` |
| `juridique` | contract_type, provider_domain | `juridique` |
| `maintenance` | contract_type | `maintenance` |
| `plomberie` | provider_domain, planned_work_type | `plomberie` |
| `serrurerie` | provider_domain | `serrurerie` |
| `peinture` | provider_domain | `peinture` |
| `architecture` | provider_domain | `architecture` |
| `climatisation` | provider_domain | `climatisation` |
| `etancheite` | planned_work_type | `etancheite` |
| `accessibilite` | planned_work_type | `accessibilite` |
| `isolation` | planned_work_type | `isolation` |
| `menuiserie` | planned_work_type | `menuiserie` |
| `parking` | planned_work_type | `parking` |
| `autre` | contract_type, provider_domain, planned_work_type | `autre` |

> Slugs seedés **non issus** d'un legacy (réservés à l'usage futur / autres consommateurs) : `electricite_commune`. Tout le reste du seed est couvert ci-dessus.

> `contract_type.nettoyage` + `contract_type.menage` (doublon FR) → **un seul** `menage`. `securite` (générique) et `securite_incendie` (planned_work) coexistent dans `work_domain` car distincts métier.
>
> **✅ Alignement effectué sur 07-maintenance** (contradiction résolue, plus signalée) : 07 §2 ne liste plus `contract_type`/`provider_domain`/`planned_work_type` parmi les « réutilisés tels quels » ; ses tables sont recâblées vers `work_domain` — `tiers.domain_ids uuid[] → work_domain` (§1.1), `contracts.domain_id` (§1.2), `logbook_entries.domain_id` (§1.5), `planned_works.domain_id` (§1.10) — et 07 crée la table `work_domain` (§1.12). Le remap des valeurs legacy de chaque enum vers le slug `work_domain` est porté par la migration 07 §6. Plus aucune colonne de 07 ne référence un enum déclaré supprimé ici.

### 2.2 `technical_doc_type` (CONSERVÉ comme enum — typologie réglementaire fermée)

**Valeurs cibles :** inchangées (dta, dpe_collectif, diagnostic_plomb, diagnostic_electricite, diagnostic_gaz, carnet_entretien, controle_ascenseur, controle_chaufferie, controle_incendie, controle_jeux, garantie_decennale, garantie_biennale, plan_copropriete, reglement_copropriete, etat_descriptif, ppt, dtg, audit_energetique, autre).

Justification : ce sont des **types de documents techniques** normés (diagnostics, contrôles, garanties), pas des corps de métier. Pas de fusion avec `work_domain` (sémantique différente : « un document de type contrôle ascenseur » ≠ « le métier ascenseur »).

---

## 3. Catégorie de DOCUMENTS — déduplication courrier/correspondance

### 3.1 `document_category` (dédupliqué)

**Valeurs cibles :** `pv_ag`, `convocation`, `reglement`, `contrat`, `facture`, `devis`, `diagnostic`, `assurance`, `budget`, `appel_fonds`, `releve_charges`, `etat_date`, `courrier`, `photo`, `plan`, `ordre_service`, `autre`

| Valeur legacy | → Cible | Note |
|---|---|---|
| courrier | `courrier` | conservé |
| correspondance | **supprimé** | doublon sémantique → mappé sur `courrier`. ⚠️ **Dépendance fonction** : `create_document_system_folders` insère `category_default='correspondance'` en dur → **doit être réécrit** en `'courrier'` (06 §5.1), sinon le seed système de toute nouvelle copro casse. Migrer l'enum AVANT de remplacer la fonction. |
| carnet_entretien | **supprimé** | frontière catégorie/pièce technique : recoupe `technical_doc_type` (un carnet d'entretien = entrée `technical_documents`, pas une catégorie GED). Décision unique posée en 06 §2. Migration : si présent sur `documents.category`, basculer la ligne en `technical_documents` (live = 0 occurrence → no-op). |
| fiche_synthetique | **supprimé** | idem `carnet_entretien` (recoupe `technical_doc_type` / pièce technique). Décision unique 06 §2. Migration : 0 occurrence live → no-op. |
| (toutes les autres) | identiques | conservées |

> `correspondance` et `courrier` désignaient la même réalité (échanges écrits) ; on garde `courrier`.

---

## 4. Enums CONSERVÉS à l'identique (référence)

Aucun changement : account_type, ag_draft_type, ag_meeting_type, attendance_type, bank_match_target_type, bank_movement_status, budget_type, call_for_funds_status, call_line_status, content_visibility, contract_status, council_decision_status, council_doc_link_type, council_role, coverage_mode, document_source, document_status, event_type, expense_status, insurance_sub_type, intervention_category, intervention_frequency, logbook_entry_type, lot_type, majority_type, notification_channel, payment_method, payment_phase_status, payment_status, planned_work_status, reminder_status, repartition_basis, repartition_category, resolution_type, service_order_event_type, service_order_origin, service_order_status, service_order_type, supplier_invoice_status, transfer_destination, vote_source, wall_post_category.

> **`budget_status`** : **plus dans cette liste** — il est désormais **modifié** (réduit 7→5), voir §1.8 (décision tranchée en 03 §2). | **`transfer_destination`** : **CONSERVÉ à l'identique** ici — sa table porteuse `alur_transfers` est GARDÉE (faux-mort câblé : 2 vues + `useALURData.ts`), enum requis par `alur_transfers.destination` (cf. correctif §4.1). | **`payment_phase_status`** : **CONSERVÉ à l'identique** ici — sa table porteuse `budget_payment_schedules` est GARDÉE (faux-mort câblé : `usePaymentSchedule.ts` + `TravauxDetailModal.tsx` + 2 pages), enum requis par sa colonne de statut de phase (cf. correctif §4.1).
> **`council_doc_link_type`** ajouté ici (conservé à l'identique) : enum vivant porté par `council_documents.linked_type` (table GARDÉE, 04 §1.9) — une note antérieure le déclarait à tort « absorbé » par `document_relation_kind` (corrigé §6.5).

### 4.1 Retraits de la liste « conservés » (enums dont la table/feature est DROPPÉE ou remplacée)

| Enum legacy | Sort | Raison |
|---|---|---|
| `mail_campaign_status` | **supprimé** | feature emailing de masse DROPPÉE (décision USER verrouillée, cf. 08-communication : `mail_campaigns` DROP) |
| `mail_recipient_type` | **supprimé** | idem — dépend de `mail_campaigns` (DROP) |
| `mail_delivery_status` | **supprimé** | déjà acté §1.2 (fusionné `delivery_status`) + table `mail_recipients` DROPPÉE |
| `ag_notification_type` | **supprimé** | île notifications fantôme (`ag_notifications`/`events`) droppée (cf. 04-ag §2/§6) ; le canal légal est `ag_envoi_tracking` |
| `provider_category` | **supprimé** | remplacé par `tiers_category` (§6) — `coproflex` retiré (label marketing, pas un type de tiers) |
| `document_confidentiality` | **supprimé (A4)** | remplacé par **`document_visibility`** (3 niveaux, §6.5). La décision USER A4 (verrouillée) impose une confidentialité **SIMPLE** sans 3e mécanisme : `restricted` + ACL fine `document_access` sont abandonnés (table `document_access` **DROP**). Migration des 4 valeurs → 3 : voir §6.5. **Tranche la divergence avec 06 §2** (qui proposait de garder les 4 valeurs + `restricted` pour l'ACL fine) : A4 fait foi, à répercuter dans 06 §2/§6 (header 06 déjà aligné). |

> **`transfer_destination` — CONSERVÉ (correction d'une affirmation erronée).** Une version antérieure le classait « orphelin retiré » au motif que `alur_transfers` serait DROPPÉE. **C'est faux** : `alur_transfers` est **GARDÉE** (faux-mort câblé — 2 vues + `useALURData.ts` — décidé en 03 §1.10/§7-A5, règle de réconciliation VERROUILLÉE, OBJETS-ABANDONNES §1.4, MIGRATION-DONNEES §3). Vérifié live : `alur_transfers.destination` est typée `transfer_destination`. L'enum est donc **structurellement requis** par une table conservée → **CONSERVÉ à l'identique** (§4) tant que `alur_transfers` vit. Aligné sur OBJETS-ABANDONNES §1.4 (déjà correct).

> **`budget_status` — DÉCISION TRANCHÉE (catalogue source unique), n'est plus « hors périmètre ».** L'astérisque/note legacy (« à arbitrer séparément ») est **levé** : le blueprint 03 §2 (§7-A1) tranche la réduction **7 → 5 valeurs**. Le catalogue d'enums étant la source unique, il intègre cette décision — voir §1.8.

### 4.2 Recouvrements résiduels — tranchés / documentés

- **`vote_source` (live/correspondence) vs `attendance_type` (…/correspondence)** : recouvrement apparent du jeton `correspondence` signalé en T2 §1.2. **Restent distincts** : `vote_source` qualifie le **canal d'un vote** (exprimé en séance vs par correspondance), `attendance_type` qualifie le **mode de présence d'un copropriétaire** à l'AG (présent / représenté / par correspondance / absent). Deux dimensions orthogonales — pas de fusion.
- **`call_line_status` {unpaid, partial, paid} vs `call_for_funds_status` {…, partially_paid, paid}** : divergence de vocabulaire **assumée et conservée** : `call_line_status` est le statut d'une **ligne** d'appel (par lot×clé), `call_for_funds_status` celui de l'**en-tête** d'appel (avec en plus `draft`/`issued`/`cancelled`, absents au niveau ligne). Le terme `partial` (ligne) ≡ `partially_paid` (en-tête) est volontairement laissé tel quel pour ne pas casser la donnée live ; toute vue d'agrégation doit mapper `partial → partially_paid`.

---

## 6. Enums NOUVEAUX créés par les domaines (catalogue unique)

Ces enums **n'existent PAS en live** : ce sont des **créations** des blueprints (remplacement de CHECK text, de colonnes `text` libres, ou de référentiels nouveaux). Recensés ici pour que ce catalogue reste la **source unique** (garantie de non-collision et de cohérence du vocabulaire entre domaines). Les valeurs ci-dessous font foi ; chaque domaine doit s'y conformer, pas redéfinir.

### 6.1 Domaine 02 — Finance / grand livre

| Enum | Valeurs | Origine / note |
|---|---|---|
| `ledger_source_type` | `budget`, `call_for_funds`, `payment`, `supplier_invoice`, `supplier_payment`, `bank_movement`, `transfer`, `od`, `opening`, `closing`, `manual`, `opening_balance`, `opening_onboarding`, `reclassification`, `result_allocation`, `budget_expense`, `mutation`, `collective_loan` | ex-CHECK liste blanche, **+2 valeurs cibles** ; `NOT NULL`. `mutation` = cloture de compte mutation (05 5/7-A1) ; `collective_loan` = mise en place emprunt D512/C164 (02 1.11/5) |
| `ledger_tx_status` | `draft`, `posted` | ex-CHECK (statut d'écriture) |
| `ledger_direction` | `debit`, `credit` | ex-CHECK (sens de ligne) |
| `account_receivable_nature` | `current`, `works`, `alur`, `loan`, `advance`, `doubtful` | **pour 45x uniquement** ; mappe 450-1/2/5/4/3 + 459 ; supprime le parsing fragile du `code` |
| `cutoff_kind` | `CAP`, `CCA`, `PCA`, `PAR` | ex-CHECK (cut-off droits constatés) |
| `treasury_advance_type` | `permanent`, `special`, `work_fund` | ex-CHECK (avances de trésorerie) |
| `collective_loan_status` | `active`, `repaid`, `cancelled` | ex-CHECK (emprunts collectifs) |
| ~~`tiers_type`~~ | — | **ABANDONNE** (non cree) : roles de `tiers` portes par FLAGS booleens `is_supplier`/`is_provider`/`is_notary` (07 1.1, 02 1.12), pas un enum (un enum ne sait pas exprimer le cumul de roles). Categorie metier = `tiers_category` (6.4) |

### 6.2 Domaine 04 — AG / gouvernance

| Enum | Valeurs | Origine / note |
|---|---|---|
| `ag_action_type` | `CREATE_BUDGET`, `APPROVE_ACCOUNTS`, `SCHEDULE_BUDGET_PAYMENTS`, `CREATE_ALUR_FUND`, `SCHEDULE_ALUR_PAYMENTS`, `CREATE_WORK_BUDGET`, `CREATE_EXCEPTIONAL_CALL`, `ELECT_COUNCIL`, `APPOINT_SYNDIC`, `MANAGE_CONTRACT`, `GRANT_QUITUS`, `DESIGNATE_BUREAU` | **pivot de l'auto-population** ; remplace le `text` libre de `ag_resolutions.action_type` + `ag_pending_actions.action_type` |
| `correspondence_form_status` | `pending`, `validated`, `integrated` | remplace les 5 statuts chevauchants de l'en-tête correspondance |

### 6.3 Domaine 05 — Mutations / état daté

| Enum | Valeurs | Origine / note |
|---|---|---|
| `mutation_status` | `draft`, `pre_etat_generated`, `etat_generated`, `signed`, `validated`, `cancelled` | ex-CHECK sur `mutations.status` |
| `mutation_type` | `sale`, `donation`, `succession`, `other` | ex-CHECK sur `mutations.mutation_type` |
| `mutation_step_key` | `demande`, `pre_etat_date`, `etat_date`, `envoi_notaire`, `signature_acte`, `cloture_compte` | ex-CHECK sur `mutation_steps.step_key` |
| `mutation_step_status` | `pending`, `in_progress`, `completed`, `skipped` | ex-CHECK sur `mutation_steps.status` |
| `etat_date_type` | `pre`, `final` | ex-CHECK sur `etat_date_snapshots.snapshot_type` |
| `legal_proceeding_nature` | `litigation`, `recovery`, `other` | ex-CHECK sur `legal_proceedings.nature` |
| `legal_proceeding_status` | `pending`, `in_progress`, `closed`, `won`, `lost` | ex-CHECK sur `legal_proceedings.status` |
| `opposition_status` | `pending`, `opposed`, `paid`, `released`, `contested` | **NOUVEAU** — `mutation_oppositions.status` (opposition art.20 sur prix de mutation, 05 §1.3 bis / §2). |

### 6.4 Domaine 07 — Maintenance / tiers

| Enum | Valeurs | Origine / note |
|---|---|---|
| `tiers_category` | `syndic`, `copropriete`, `externe` | **remplace `provider_category`** ; valeur `coproflex` retirée (label marketing, pas un type de tiers) |
| `logbook_status` | `planifiee`, `en_cours`, `terminee` | **NOUVEAU** ; remplace le `status text + CHECK` de `logbook_entries` (corrige le drift de typage) |

### 6.5 Domaine 06 — Documents / GED

| Enum | Valeurs | Origine / note |
|---|---|---|
| `document_entity_type` | `ag`, `resolution`, `service_order`, `contract`, `supplier_invoice`, `mutation`, `budget`, `lot`, `coproprietaire`, `council`, `event`, `other` | enum unique pour le polymorphisme typé (uniformise `ag_meeting`+`ag`) |
| `document_relation_kind` | `related`, `annexe`, `source`, `justificatif` | typologie de relation document↔entité dans la GED (06). **`acl` retiré (A4)** : la valeur `acl` ne servait qu'à l'ACL fine via relations ; avec la visibilité SIMPLE 3 niveaux et le DROP de `document_access`, ce mécanisme disparaît. **N'absorbe AUCUN enum vivant** (création autonome). |
| `document_visibility` | `gestionnaire_seul`, `conseil`, `tous_coproprietaires` | **NOUVEAU (A4)** — confidentialité **SIMPLE par document, fixée par le gestionnaire**. Remplace `document_confidentiality` (4 val.) **supprimé** et l'ACL fine `document_access` (**DROP**, table). Porte `documents.visibility`. `user_can_view_document` s'appuie sur ce niveau + propriété de lot + appartenance au conseil (`is_council_member`) — plus aucune table d'ACL ni valeur `restricted`. **Jeu de labels tranché = celui de 06 (`{gestionnaire_seul, conseil, tous_coproprietaires}`), source unique** : 06 §2/§3 (`user_can_view_document`) et AUTORISATION §4/§7.2 (qui décrivaient `manager_only/council/all_owners`) doivent s'y aligner. Mapping migration depuis `document_confidentiality` (live = public 44 / manager 5 / council 2, 0 `restricted`) : `manager`→`gestionnaire_seul`, `council`→`conseil`, `public`→`tous_coproprietaires`, `restricted`→`gestionnaire_seul` (le plus fermé, 0 ligne live). `DEFAULT 'gestionnaire_seul'`. |

> **⚠ Correction (anti-contradiction) — `content_visibility` et `council_doc_link_type` ne sont PAS abandonnés.** Une version antérieure de cette note déclarait que `document_relation_kind` « absorbait » `council_doc_link_type` + `content_visibility`. C'est **faux** et contredit 2 domaines :
> - **`content_visibility`** (`all_members`/`council_only`/`managers_only`) est un enum **VIVANT** : porté par `wall_posts.visibility` et `events.visibility` (08 §1.4/§2), par `council_documents.visibility` (04 §1.9) et par le principe transverse de visibilité (08 §2, 04 §2). Il borne la **lecture** d'un contenu — sémantique orthogonale à la relation document↔entité de `document_relation_kind`. → **CONSERVÉ à l'identique** (§4).
> - **`council_doc_link_type`** (`contract`/`service_order`/`ag`/`invoice`/`budget`/`other`) reste **VIVANT** tant que `council_documents` existe : la table est **GARDÉE** (04 §1.9, « câblée front+edge ») et porte `linked_type council_doc_link_type` (04 §6.2 « inchangé »). → **CONSERVÉ à l'identique** (§4). Il ne deviendrait abandonnable que si `council_documents` était un jour absorbée dans la GED `documents` (non décidé).
>
> `document_relation_kind` est donc une **création autonome** du domaine 06, sans fusion d'enum legacy.

### 6.6 Domaine 01 — Copros / lots / personnes

| Enum | Valeurs | Origine / note |
|---|---|---|
| `invitation_status` | `pending`, `accepted`, `revoked`, `expired` | **NOUVEAU** ; statut de `copro_invitations` (01 §1.10, table AJOUTÉE pivot du câblage portail copropriétaire). Porte l'unicité métier « 1 invitation `pending`/personne » (AUTORISATION §3.3). Consommé par `link_coproprietaire_account` (passe `pending`→`accepted`). |

### 6.7 Domaine 08 — Communication

| Enum | Valeurs | Origine / note |
|---|---|---|
| `message_type` | `text`, `file`, `system` | **NOUVEAU** (08 §2) ; remplace le `text` libre `messages.message_type` (live = `'text'` en dur, aucun CHECK). `text`=ordinaire, `file`=pièce jointe, `system`=message de service. `DEFAULT 'text'`. |

> **Périmètre campagnes DROP (rappel) :** aucun enum `mail_campaign_status`/`mail_recipient_type`/`ag_notification_type` n'est recréé (§4.1). La messagerie interne transactionnelle (`mails`, table 8ᵉ gardée) réutilise `delivery_status` (§1.2), pas un enum campagne.

> **Cohérence vocabulaire « envoi/livraison » (anti-collision)** : `delivery_status` (§1.2, acheminement technique d'un message) ≠ `correspondence_form_status` (§6.2, cycle d'un formulaire de vote par correspondance) ≠ `mutation_step_status` (§6.3, avancement d'une étape de mutation). Trois concepts distincts, trois enums distincts — ne pas réutiliser un `status text` générique.

---

## 7. Bilan quantitatif

- Enums **supprimés** (13) : `vote_direction`, `council_vote_choice`, `mail_delivery_status`, `mail_campaign_status`, `mail_recipient_type`, `ag_notification_type`, `urgency_level`, `work_priority`, `provider_domain`, `planned_work_type`, `contract_type`, `provider_category`, **`document_confidentiality`** (`contract_type`/`planned_work_type`/`provider_domain` → `work_domain` ; `provider_category` → `tiers_category` ; **`document_confidentiality` → `document_visibility`, A4**).
- Enums **créés (§6)** : **24** — `ledger_source_type`, `ledger_tx_status`, `ledger_direction`, `account_receivable_nature`, `cutoff_kind`, `treasury_advance_type`, `collective_loan_status`, `ag_action_type`, `correspondence_form_status`, `mutation_status`, `mutation_type`, `mutation_step_key`, `mutation_step_status`, `etat_date_type`, `legal_proceeding_nature`, `legal_proceeding_status`, **`opposition_status` (05, art.20)**, `tiers_category`, `logbook_status`, `document_entity_type`, `document_relation_kind` (sans `acl`, A4), **`document_visibility` (06, A4)**, **`invitation_status` (01)**, **`message_type` (08)** ; **+ fusions** : `vote_choice`, `priority_level` ; **+ table de réf** `work_domain`. (`tiers_type` **NON créé** : rôles portés par flags booléens — §6.1.)
- Enums **réduits / modifiés** : **`period_status` (5→3 : open/closed/approved — `locked`→`approved`, `rejected`→`open` ; `closed`/`approved` = jalons distincts `closed_at`/`approved_at`)**, **`membership_role` (5→3, `admin`→`platform_admin` A13/multi-cabinet)**, `delivery_status` (fusion), `document_category` (20→17 : −correspondance/−carnet_entretien/−fiche_synthetique), `ag_status` (+`archived`, car `archive_ag` GARDÉE), **`budget_status` (7→5 : −draft_from_ag/−pending_approval, §1.8)**.
- Enums **retirés des conservés** (§4.1) : **`document_confidentiality` (remplacé par `document_visibility`, A4)**. **`transfer_destination` ET `payment_phase_status` ne sont PLUS retirés** : leurs tables `alur_transfers` / `budget_payment_schedules` sont GARDÉES (faux-morts câblés) → enums CONSERVÉS (§4/§4.1).
- Enums **inchangés** : ~40 (cf. §4, après retraits §4.1 ; `content_visibility` et `council_doc_link_type` ré-affirmés conservés car `council_documents`/wall/events GARDÉS ; `payment_phase_status` conservé car `budget_payment_schedules` GARDÉE).
