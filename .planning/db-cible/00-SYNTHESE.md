# 00 — SYNTHÈSE D'OUVERTURE — Blueprint DB cible CoProFlex

> Document d'entrée du dossier `db-cible/`. Conçu 2026-06-04 (lecture seule sur le live `iyfesbjnkpynmwlsmxnp`).
> Il agrège les 8 blueprints de domaine (`01`→`08`) + les 2 référentiels transverses (`AUTORISATION.md`, `ENUMS.md`).
> Le détail technique (colonnes, FK, triggers, RLS, migration) vit dans chaque fichier de domaine ; ce document donne la **vision d'ensemble, l'approche, le verdict qualité, les décisions actées et les arbitrages encore ouverts**.

---

## 1. Vision d'ensemble — schéma des domaines

CoProFlex est une plateforme SaaS de gestion de copropriété (marché français). La base cible est **multi-cabinet** (tenant racine = le cabinet syndic, au-dessus des copros), **lot-centric** (l'unité de gestion est le LOT, jamais le copropriétaire), et **adossée à un grand livre comptable en partie double** qui fait autorité sur tout solde.

```
              ┌─────────────────────────────────────────────────────┐
              │  CABINETS — tenant racine (organisation syndic)     │
              │  RLS cloisonnée : un gestionnaire ne voit que SON   │
              │  cabinet ; cloisonnement centralisé dans les helpers│
              └───────────────┬─────────────────────────────────────┘
                  copros.cabinet_id FK NOT NULL
                       ▼
                       ┌─────────────────────────────────────────────┐
                       │  01  SOCLE — copros / lots / personnes      │
                       │  copros · buildings · lots · lot_owners     │
                       │  coproprietaires · repartition_keys(_lines) │
                       │  memberships · profiles · copro_invitations │
                       └───────────────┬─────────────────────────────┘
                  FK lots/copro_id     │  quote-part = repartition_key_lines
       ┌───────────────┬───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼               ▼
 ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
 │ 02 FINANCE│  │ 03 BUDGETS │  │ 04 AG +    │  │ 05 MUTATIONS│  │ 07 MAINT.  │
 │ GRAND     │◄─┤ APPELS     │  │ CONSEIL    │  │ ÉTAT DATÉ  │  │ TIERS      │
 │ LIVRE     │  │ IMPAYÉS    │─►│ (auto-pop) │  │ JURIDIQUE  │  │ CONTRATS   │
 │ (source   │  │ ALUR       │  │            │  │            │  │ OS/FACTURES│
 │  unique   │  └────────────┘  └────────────┘  └─────┬──────┘  └─────┬──────┘
 │  du solde)│        │ poste le GL via posteurs       │ notaire =     │ tiers =
 └─────┬─────┘        │ canoniques (create_ledger_tx)  │ tiers(07)     │ FOYER
       │              ▼                                ▼               ▼
       │     ┌──────────────────────────────────────────────────────────┐
       │     │ 06 DOCUMENTS / GED   ·   08 COMMUNICATION (msg/mur/mails) │
       │     └──────────────────────────────────────────────────────────┘
       ▼
  Tout solde (lot, personne, trésorerie) se DÉRIVE du GL posté (vues v_*).
```

**Référentiels transverses** :
- **`work_domain`** (corps de métier) — table de référence possédée par 07, consommée par FK partout (remplace 3 enums).
- **`tiers`** (fournisseur ⊕ prestataire ⊕ notaire, par flags booléens) — possédée par 07, consommée par 02 (factures/cut-off) et 05 (notaire).
- **`accounts`** (plan comptable) + **`ledger_*`** — possédés par 02, socle de toute la chaîne comptable.
- **Modèle d'autorisation** (3 rôles + service_role, helpers SECURITY DEFINER) — défini dans AUTORISATION, branché par toutes les RLS.
- **Catalogue ENUMS** — source unique du vocabulaire typé (anti-collision inter-domaines).

---

## 2. Approche globale — re-baseline propre + redesign justifié

Le constat de départ (mémoire `rebaseline_db_decision`, audits cartographie) : **le repo de migrations n'est PAS reproductible** (61 fonctions désynchronisées, doublons EN/FR, AG bespoke doublant le canonique, dette structurelle des tantièmes). On ne « patche » pas : on **re-baseline** sur un schéma cible propre.

**Pas de reprise du live (décision A1, verrouillée).** On n'importe **aucune** ligne de la base live : ni la boucle d'or `22222222`, ni l'immuable `11111111`, ni les harnais jetables. Le schéma fait foi, pas l'historique. La référence test/démo devient une **COPRO-TEMPLATE construite A→Z** par les fonctions canoniques, sous un **cabinet de référence**, qui **remplace** l'ancienne boucle d'or (détail dans `TEMPLATE-SEED.md`, exécution dans `MIGRATION-DONNEES.md`). Avantage : on ne réinjecte jamais la dette qu'on veut supprimer, et l'audit financier cible part de 0 écart.

**Couche multi-cabinet (vision d'ensemble).** Au-dessus des copros, on pose un **tenant racine** : la table `cabinets` (organisation syndic). `copros.cabinet_id` est une **FK NOT NULL**. La RLS est cloisonnée par cabinet (un gestionnaire ne voit que les copros de SON cabinet), et ce cloisonnement est **centralisé dans les helpers d'autorisation** (`user_has_copro_access` / `user_is_copro_manager` intègrent le périmètre cabinet) — les policies de domaine appellent ces helpers sans gérer le cabinet directement. La couche schéma + RLS est posée maintenant ; les écrans de gestion de cabinet (CRUD, invitation gestionnaires) sont **différés** (finance d'abord).

**Principe directeur du redesign** (justifié par le verdict, pas refonte gratuite) :
1. **Conserver le bien-fait** : noyau GL (ledger header+lignes, partie double, immutabilité câblée, 0/134 tx déséquilibrée), modèle de clés versionné lot-centric, machine à états OS, rétention légale GED. On NETTOIE et DURCIT, on ne réécrit pas le cœur.
2. **Corriger la dette identifiée** : dénormalisations mortes/fausses (compteurs copros, snapshots), doubles sources de vérité (tantièmes `lots.*` vs `repartition_key_lines`, solde vs relevé d'appel), CHECK texte → enums, doublons d'index/triggers, FK manquantes, intégrité `copro_id` absente.
3. **Sécuriser** : RLS partout (ON prod / OFF dev), 3 rôles + service_role, gardes in-function deny-by-default (le live exposait 189/190 fonctions à `anon`, 0 garde de rôle — critique).
4. **Finir les migrations** : abandonner les couches bespoke (AG hors-GL, campagnes mail, surcharges legacy) — pas de coexistence de deux patterns.

---

## 3. Tableau des verdicts qualité par domaine

| Dom. | Périmètre | Verdict de départ | Posture cible |
|---|---|---|---|
| **01** Copros / lots / personnes | Socle lot-centric | **Sain avec 1 dette structurelle #1** (4 `lots.tantiemes_*` = double source incohérente 970≠971) | REDESIGN + DROP tantièmes + triggers intégrité `copro_id` + `copro_invitations` ajoutée + **table `cabinets` (tenant racine) + `copros.cabinet_id` FK NOT NULL** + enum role rationalisé |
| **02** Finance / grand livre | Cœur comptable | **NOYAU EXCELLENT** (partie double, immutabilité, lot-centric par sous-compte) ; périphérie à durcir | NETTOYER + DURCIR (jamais réécrire le GL) ; invariant 110/120 contraint par assertion |
| **03** Budgets / appels / ALUR / impayés | Chaîne appel de fonds | **Cœur BIEN FAIT** (agrégé multi-clés, idempotent) ; périphérie à durcir | NETTOYER (fusion triggers, dédup index, FK→profiles ; `budget_payment_schedules` faux-mort câblé CONSERVÉE) |
| **04** AG + conseil | Gouvernance / auto-population | **À REPENSER** (couche bespoke hors-GL, 9 compteurs désync, mandat dupliqué, île notifications) | REDESIGN PROFOND : chaîne canonique GL unique, bespoke abandonné, mandat fusionné |
| **05** Mutations / état daté / juridique | Vente de lots | **Sobre mais incomplet** (mutation validée = 0 écriture GL, pas lot-centric sur recouvrement) | REPRISE + écriture clôture de compte (dette #2) + lot-centric + immutabilité art.20 |
| **06** Documents / GED | GED / versioning | **À REPENSER** (8 colonnes `*_id` FK-less mortes, versioning parallèle inerte, double stockage, ACL fine `document_access` morte) | REDESIGN : 7→5 tables, liens polymorphes typés, 1 seule source versioning, **DROP `document_access` → visibilité SIMPLE par document fixée par le gestionnaire** |
| **07** Maintenance / tiers | Contrats / OS / factures | **À REPENSER** (2 référentiels providers/suppliers, RIB introuvable au paiement) | FUSION `tiers` unique + table `work_domain` + chaîne compta fournisseur préservée |
| **08** Communication | Messagerie / mur / mails | **Plutôt bien fait** ; campagnes mail mortes | GARDER msg/mur/mails ; DROP bloc campagnes ; FK liens posées |

**Transverse** : AUTORISATION = **critique** (ACL plat et permissif, anon écrit le GL) → modèle **multi-cabinet** : rôles `platform_admin` (équipe CoProFlex, transverse) / `gestionnaire` (de cabinet) / `coproprietaire` / `anon` + `service_role` machine ; cloisonnement cabinet **centralisé dans les helpers** `user_has_copro_access` / `user_is_copro_manager`. ENUMS = 65 enums live → catalogue rationalisé (12 supprimés, ~20 créés, plusieurs fusionnés/réduits).

---

## 4. DÉCISIONS ACTÉES (arbitrages utilisateur verrouillés)

1. **RLS partout + multi-cabinet + service_role.** RLS `ENABLE` prod / `DISABLE` dev (drapeau par environnement), `FORCE` sur tables comptables. Rôles : `platform_admin` (transverse) / `gestionnaire` (de cabinet) / `coproprietaire` / `anon` + `service_role` machine. **Cloisonnement par cabinet** centralisé dans les helpers d'autorisation. Deny-by-default sur toutes les fonctions d'écriture.
1bis. **Multi-cabinet dès la cible (tenant racine).** Table `cabinets`, `copros.cabinet_id` FK NOT NULL ; un gestionnaire ne voit que les copros de SON cabinet. Schéma + RLS posés maintenant ; écrans CRUD cabinet / invitation gestionnaires différés (finance d'abord).
1ter. **Pas de reprise du live → COPRO-TEMPLATE propre (A1).** Aucune ligne live importée ; référence test/démo reconstruite A→Z par RPC canoniques, sous un cabinet de référence, remplace la boucle d'or (`TEMPLATE-SEED.md`). Portée des données : le schéma fait foi, l'historique est jeté.
1quater. **GED — visibilité SIMPLE par document (A4).** DROP de `document_access` (ACL fine). Le **gestionnaire** fixe la visibilité : `{gestionnaire seul / + conseil syndical / + tous les copropriétaires}`. `user_can_view_document` = visibilité + propriété de lot + appartenance conseil.
2. **Lot-centric absolu.** L'unité de gestion est le LOT ; la quote-part vit exclusivement dans `repartition_key_lines` ; le solde d'une personne se dérive en sommant ses lots. → DROP des `lots.tantiemes_*`.
3. **GL = source unique du solde.** Tout solde se dérive du grand livre posté ; les chemins parallèles (relevé d'appel, mouvements bancaires) sont des intrants vérifiés contre le GL (`v_lot_vs_gl_mismatch`), jamais une autorité concurrente.
4. **Fusion `tiers` (un seul référentiel).** `providers` ⊕ `suppliers` ⊕ `notaires` → entité `tiers` unique avec rôles par **flags booléens** (`is_supplier`/`is_provider`/`is_notary`), RIB porté sur le tiers. Enum `tiers_type` abandonné. → tranche aussi 05-A2 (notaire = rôle de tiers).
5. **AG : garder uniquement la chaîne qui poste le GL, abandonner le bespoke.** `finalize_and_activate_ag → prepare → activate → post_budget_call_for_funds`. Couche bespoke (`create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`…) abandonnée.
6. **Catégories métier → table de référence `work_domain`** (extensible sans migration d'enum), pas 3 enums divergents. `contract_type` / `provider_domain` / `planned_work_type` supprimés → FK `work_domain`.
7. **DROP du bloc campagnes mail** (`mail_campaigns`/`mail_recipients`/`mail_inbox`/`mail_templates`/`mail_folders`/`mail_labels_v2`). **`mails`** (boîte Resend transactionnelle, câblée front) et **`email_templates`** (modèles relances+AG, foyer en 03) sont GARDÉES, distinctes des campagnes.
8. **Conseil syndical = majorité simple propre, source unique `is_council_member`** (lit `council_members`). `membre_cs` n'est plus un rôle de membership mais un attribut ; `user_is_council_member` (qui lisait `memberships.role`) abandonné. Enum `membership_role` réduit 5→3.

---

## 5. ARBITRAGES A1→A22 — TOUS TRANCHÉS (décisions USER finales, verrouillées)

> Toutes les décisions sont prises. **Il ne reste AUCUN arbitrage bloquant ouvert.** Récapitulatif de la décision retenue pour chaque point ; le détail technique vit dans chaque blueprint de domaine.

| # | Sujet | Décision tranchée |
|---|---|---|
| **A1** | Reprise du live | **PAS de reprise.** COPRO-TEMPLATE propre construite A→Z (remplace la boucle d'or). Le schéma fait foi, l'historique est jeté ; les 4 écritures `450`/lot_id NULL de 11111111 disparaissent (plus reprises). |
| **A2** | `enforce_lot_id_on_45x` | Toute écriture sur un compte **copropriétaire (45x)** nomme un lot (`lot_id` NOT NULL), **SANS liste blanche ni exception**. Ne s'applique PAS aux 512/401/6x/7x/105. |
| **A3** | Mutation / état daté | Refaite **selon la loi** : (1) état daté 3 parties figé du GL à la date de vente ; (2) recouvrement via **opposition art.20** (avis notaire → opposition 15 j, créances liquides/exigibles, privilège ; notaire verse sous 3 mois) → encaissement qui **apure le 450 exigible du lot** ; (3) **ALUR art.14-2 reste attaché au lot** (aucun mouvement) ; (4) acquéreur **reconstitue les avances**. Lot-centric : on change `lot_owners`, **pas** de transfert personne→personne. |
| **A4** | GED — ACL | DROP `document_access`. **Visibilité SIMPLE par document** fixée par le gestionnaire : `{gestionnaire seul / + conseil syndical / + tous copropriétaires}`. `user_can_view_document` = visibilité + propriété de lot + appartenance conseil. |
| **A5** | `dossiers` (kanban démo) | **DROP.** Pas de module tâches. |
| **A6** | `budget_status` 7→5 | `draft_from_ag`→`draft`, `pending_approval`→`submitted`. Provenance via `source_ag_id`. |
| **A7** | `post_call_for_funds` | Mono-clé → **agrégé 10-args**. Rebrancher l'edge `generate_call_for_funds` AVANT abandon. |
| **A8** | `budget_payment_schedules` | **CONSERVÉE finalement** (DROP annulé) : faux-mort câblé front (`usePaymentSchedule.ts` → `TravauxDetailModal.tsx` + 2 pages dashboard). `delete_service_order` reste inchangée. |
| **A9** | Versioning GED | `document_versions` = **source unique** (bloc atomique fonction + vue + front). |
| **A10** | Mandat AG | **Fusion `ag_pouvoirs` → `ag_attendance`** (mandat unique). |
| **A11** | Notifications AG | **Drop de l'île** séquencé : refacto `email_webhook` → `ag_envoi_tracking` + réécrire `get_ag_wizard_state` AVANT. |
| **A12** | `copros.cabinet_id` | **REMPLACÉ par MULTI-CABINET** : devient FK **NOT NULL** (PAS de drop). Table `cabinets` créée. |
| **A13** | Rôle admin | `admin` → **`platform_admin`** (transverse, hors cabinet, équipe CoProFlex). |
| **A14** | Lecture copro contentieux | La copro **voit** le contentieux ; sur les procédures `recovery`, **débiteur/lot masqués** (RGPD). |
| **A15** | `bank_movements.period_id` | **Nullable** (un mouvement importé peut précéder son affectation). |
| **A16** | Emprunt collectif | `post_collective_loan` **différé** hors template. |
| **A17** | Unicité budget | **UNIQUE partiel** : 1 budget validé par copro×période×type. |
| **A18** | Statut ligne d'appel | **Fusion des 2 triggers** en un seul. |
| **A19** | Compteurs `ag_resolutions` | **Supprimés** (dérivés d'une vue). |
| **A20** | `ag_votes.tantiemes` | **Figés au vote** (instant T, légalement correct). |
| **A21** | `mutation_steps` | **Gardé**, `mutations.status` = vérité. |
| **A22** | Tiers / factures | Ex-`coproflex` → **`externe`** ; sens OS↔facture **côté facture** ; annuaire `tiers` via **vue masquant le RIB** ; ajout **`vat_number`**. |

> **À confirmer au review** (non bloquant) : avec A1 (aucun historique repris), le cas A22 « factures `posted/paid` sans `ledger_tx_id` » devient sans objet — valider seulement que le seed du template n'en produit aucune. **Déjà tranchés (rappel)** : `planned_works` = propriété 07 ; `alur_transfers` = CONSERVÉ (faux-mort câblé) ; `council_documents` = propriété 04 jusqu'au rebranchement prouvé.

---

## 5bis. COHÉRENCE VÉRIFIÉE (trous mécaniques fermés)

Au-delà des arbitrages métier ci-dessus, les vérifications transverses confirment qu'**il ne reste aucun trou mécanique** dans le blueprint :

- **Fonctions ↔ tables alignées.** Chaque fonction conservée pointe une table/colonne qui existe dans la cible ; les surcharges fantômes (`can_access_document`→table inexistante `copro_members`, `post_call_for_funds` mono-clé, 8-arg legacy, 7 `CREATE` de migration sans contrepartie live) sont recensées et abandonnées (INVENTAIRE-FONCTIONS + OBJETS-ABANDONNES §1.2). Aucune fonction cible n'appelle un objet droppé.
- **Enums = source unique.** Tout le vocabulaire typé vit dans le catalogue ENUMS (anti-collision inter-domaines) : fusions actées (`vote_choice`, `delivery_status`, `priority_level`), feature-drops (campagnes, notifications), et bascule vers la table de réf `work_domain`. Pas de CHECK-texte divergent qui doublerait un enum.
- **Faux-morts câblés GARDÉS.** Les 19 objets à 0 ligne mais prouvés câblés (front/edge/vue/fonction) sont conservés — `alur_transfers`, `budget_payment_schedules`, `mails`, `mutation_steps`, `planned_works`, `council_documents`, etc. Aucun DROP « sec » : tout retrait câblé est séquencé (rebranchement AVANT). `count(*)=0` n'est jamais à lui seul une preuve de mort.
- **Aucune écriture du GL exposée à `anon`.** Le modèle d'autorisation pose deny-by-default sur toute fonction d'écriture ; les posteurs comptables (`create_ledger_transaction`, `post_budget_call_for_funds`, paiements) exigent le rôle gestionnaire (ou service_role machine). Le copropriétaire est en lecture dérivée du GL uniquement, l'`anon` n'a aucun accès en écriture — correction directe du live (189/190 fonctions ouvertes à `anon`, 0 garde).
- **Intégrité `copro_id` et lot-centric câblés.** Triggers de cohérence `copro_id` ajoutés (lots, legal, mutations…) ; `enforce_lot_id_on_45x` garde le rattachement au lot sur les comptes 450/459 (extension 45x = arbitrage A2). Tout solde reste DÉRIVÉ du GL posté, jamais d'autorité concurrente.

→ Les décisions métier (§5) sont désormais **toutes tranchées** ; il ne reste aucun trou mécanique ni arbitrage bloquant.

---

## 6. Prochaines étapes

Arbitrages A1→A22 **tranchés** : on passe à la **génération SQL + seed du template**.

1. **Génération du SQL de re-baseline** — ordre indicatif :
   - enums + table de réf `work_domain` ; **table `cabinets` (tenant racine)** ; socle 01 (copros→lots→personnes, `cabinet_id` FK NOT NULL) ; finance 02 (accounts → ledger → périodes) ;
   - domaines dépendants 03/04/05/06/07/08 ;
   - helpers d'autorisation **(cloisonnement cabinet centralisé)** + gardes in-function ; triggers d'intégrité (`copro_id`, `enforce_lot_id_on_45x` sans exception) ; vues ;
   - RLS (ENABLE prod / FORCE comptable, cloisonnée par cabinet).
2. **Seed de la COPRO-TEMPLATE** (A1) — exécution de la séquence de RPC canoniques (`TEMPLATE-SEED.md` / `MIGRATION-DONNEES.md`) : cabinet de référence → copro → lots → clés → exercice → boucle financière complète + une mutation ; **aucune reprise du live**. Audit cible = 0 écart.
3. **Test bout-en-bout sur le template en session-user gestionnaire** (parcours légitime non bloqué par les gardes).
4. **Séquences différées** (post-baseline) : écrans CRUD cabinet + invitation gestionnaires, refacto `email_webhook`, posteur `post_collective_loan`, portail copropriétaire (câblage `coproprietaires.user_id`).

---

> **État** : blueprint complet (8 domaines + autorisation + enums + multi-cabinet) ; **arbitrages A1→A22 tranchés**. **Prochain jalon : génération SQL + seed du template.**
