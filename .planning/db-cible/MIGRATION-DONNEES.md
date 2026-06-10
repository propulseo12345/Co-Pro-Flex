# AMORÇAGE DES DONNÉES — seed propre (PAS de reprise du live)

> Réécrit 2026-06-04. **Décision USER A1 (verrouillée) : on ABANDONNE TOUTE reprise du live.**
> Le schéma cible fait foi, PAS l'historique. La base live (`iyfesbjnkpynmwlsmxnp`) et ses ~12 copros
> (boucle d'or 22222222, immuable 11111111, harnais jetables, « Residence Test »…) sont **jetables** :
> aucune ligne n'est migrée. La référence de test/démo devient une **COPRO-TEMPLATE construite A→Z**
> par les fonctions canoniques (voir `TEMPLATE-SEED.md`), sous un **cabinet de référence**.

---

## 0. Pourquoi on ne migre plus le live

L'ancienne carte de migration (reprise par vagues V0→V9, exemptions de triggers pour les 4 lignes 450
sans lot de 11111111, filtrage `ag_pending_actions`, re-câblages d'identité…) **n'a plus lieu d'être**.
Elle existait pour préserver un historique qu'on a décidé de **ne pas conserver**. Raisons de l'abandon :

- **Le live est sale par construction** : doublons EN/FR, 61 fonctions désynchronisées des migrations,
  AG bespoke doublant le canonique, à-nouveaux artefacts, brouillons de test, 4 écritures 450 sans lot
  violant la règle A2. Migrer = importer la dette qu'on veut justement supprimer.
- **Le repo de migrations n'est pas reproductible** (re-baseline décidée, cf. `PROMPT_NOUVELLE_DB.md`).
  On part d'un schéma propre ; y réinjecter le vieil état recréerait le drift.
- **A2 sans exception** : toute écriture 45x nomme un lot. Les 4 lignes historiques de 11111111
  (450 parent, `lot_id` NULL, postées/immuables) sont **inconciliables** avec la cible sans exemption —
  exemption qu'on ne veut plus. En repartant de zéro, le problème disparaît.
- **La boucle d'or était une donnée live** ; elle est **remplacée** par la COPRO-TEMPLATE, rejouée par
  le chemin canonique → 0 écart d'audit garanti, pas d'artefact historique (les +0,16 / −423 / +30 de
  l'ancienne boucle d'or étaient des scories de reprise).

**Conséquence** : plus aucune section « live → cible », plus de vagues FK de reprise, plus d'exemption de
trigger de migration (`coproflex.migration_exempt` abandonné), plus de filtrage/re-câblage. Le seul
« import » est l'**amorçage** d'une base neuve.

---

## 1. Ce qui remplace la migration

| Ancien (abandonné) | Nouveau (cible) |
|---|---|
| Reprise byte-à-byte de 2 copros + exemptions triggers | **Seed canonique** d'1 cabinet + 1 copro-template |
| Vagues V0→V9 respectant les FK du live | **Séquence d'appels de fonctions** (onboarding → boucle → mutation), cf. `TEMPLATE-SEED.md` |
| à-nouveaux figés repris tels quels | à-nouveaux **régénérés proprement** via `set_opening_balance` (chaque 45x avec `lot_id`, A2) |
| `weight_snapshot` / `payload` art.20 figés repris | **régénérés** par les fonctions au fil du seed (état authentique, daté du seed) |
| Re-câblage `auth.users→profiles`, enums legacy→FK | **N/A** : tout est créé directement au bon format cible |

L'amorçage s'appuie **exclusivement** sur les routes canoniques déjà inventoriées
(`INVENTAIRE-FONCTIONS.md`) : `provision_copro_chart`, `set_opening_balance`, `finalize_and_activate_ag`
(+ `post_budget_call_for_funds`), `post_owner_payment`, `post_supplier_invoice` / `post_supplier_payment`,
le chemin ALUR canonique (`finalize_and_activate_ag` → `generate_calls_from_ag_payload` budget_type='alur'
⇒ D450-5/lot · C105 ; `create_alur_fund_from_ag` est **ABANDONNÉE**, jamais appelée),
`open_next_period` (split 110/120) + `regularize_period`, et le chemin
mutation/état daté du domaine 05. **Aucun INSERT brut** sur les tables financières : tout passe par les RPC
qui produisent les écritures de grand livre (source unique des soldes).

---

## 2. Données de référence GLOBALES (hors copro) à semer une fois

Ces référentiels ne dépendent d'aucune copro et sont **créés vides puis seedés** une seule fois sur la
base neuve (préalable au cabinet) :

- **`work_domain`** : seed des ~28 slugs de domaines métier (FK consommée par `tiers`/`contracts`/`logbook`).
- **`email_templates` système** (`copro_id NULL`) : 6 modèles (`ag_convocation`, `ag_relance`,
  `ag_pv_notification`, `payment_reminder_7/30/60`) — **obligatoires** (FK `template_id` + seed
  `create_default_reminder_rules` d'une nouvelle copro en dépend).
- **`platform_admin`** : 1 profil équipe CoProFlex (rôle transverse, hors cabinet) pour opérer le seed.

> Ces 3 seeds globaux sont le **seul vrai « V0 »** restant. Tout le reste est de l'amorçage applicatif.

---

## 3. Le live après bascule

- La base live actuelle est **gelée puis abandonnée** (référence morte). On ne s'y reconnecte qu'en
  **lecture seule** pour mémoire, jamais pour copier des lignes.
- Aucune correspondance d'UUID à maintenir : la COPRO-TEMPLATE a ses **propres identifiants neufs**.
- Si un écran de démo pointait l'ancienne boucle d'or 22222222, il sera **repointé** vers la
  copro-template (sélection via Portefeuille), exactement comme aujourd'hui.

---

## 4. Garanties attendues du seed propre

- **A2** : chaque ligne 45x porte un `lot_id` non NULL (aucune exemption, aucune liste blanche).
- **Audit** : `audit_finance_integrity` sur la copro-template = **0 écart** (boucle bouclée par le canonique).
- **Légalité** : un exercice complet exercé (budget voté en AG → appels → encaissements → facture →
  cotisation ALUR → clôture → affectation 110/120 → à-nouveau) + une **mutation** exerçant l'état daté
  3 parties (art.5 décret 67-223) et le recouvrement par opposition (art.20).
- **Reproductibilité** : le seed est une **séquence de RPC idempotente**, rejouable sur une base neuve —
  pas un dump. Détail complet dans `TEMPLATE-SEED.md`.
