# 07 — Mutations de lots, État daté & Conseil syndical

> **Statut : BROUILLON** — Audit logique métier RANG 7 (lecture seule) — **Date : 2026-05-30**
> **Périmètre légal :** art. 20 loi 65-557 (état daté), art. 14-2-1 (fonds travaux ALUR), art. 14-1 (charges/prorata), art. 21-22 (conseil syndical), art. 42 al. 2 (contestation PV), art. 9/64 décret 67-223 (convocation)
> **Dépendances amont :** rang 4 (solde 450 par lot / ledger), rang 5 (clé ALUR), rang 6 (auto-propagation AG → CS)
> **Projet Supabase :** `iyfesbjnkpynmwlsmxnp` (schéma `public`)

---

## 1. Identité (périmètre du rang 7)

Le rang 7 couvre la **fin de vie d'un lot dans le cycle de gestion** et le **contrôle de la gestion**. Quatre sous-domaines :

1. **Mutations de lots** — cession (vente, donation, succession) : déclenchement, étapes (`mutation_steps`), validation, transfert de propriété, clôture du compte.
2. **État daté (art. 20)** — document légal probant établi par le syndic à la mutation, publiant en 3 parties la situation financière du lot/vendeur à un instant T figé. **Révélateur aval** : il lit (et ne recalcule jamais) les soldes amont (solde 450 par lot du rang 4, fonds travaux ALUR du rang 5).
3. **Conseil syndical (art. 21-22)** — organe de contrôle du syndic élu par l'AG : composition (`council_members`), éligibilité, mandat 3 ans, présidence, décisions/votes, documents, mise en concurrence du syndic. Le CS est un **produit de l'auto-propagation** du rang 6 (`elect_council_from_ag`).
4. **Propriétaires & historique** — `coproprietaires` (phys./morales) et `lot_owners` (historique horodaté start/end) : **clé du prorata** et de la lecture du solde « à date ». Plus les **notifications légales** (convocation 21 j, contestation 2 mois, conservation 10 ans).

**Posture transverse.** L'état daté est l'épreuve de vérité de toute la chaîne financière : si le grand livre n'est pas alimenté (rang 4), si la clé ALUR est orpheline (rang 5), ou si le CS n'est pas peuplé (rang 6), l'état daté publie des chiffres faux **avec valeur probante légale**. C'est le rang le plus exposé au **risque de responsabilité du syndic**.

---

## 2. Modèle de données + source de vérité

### 2.1 Tables cœur

| Table | Rôle | Colonnes structurantes | Source de vérité |
|---|---|---|---|
| `mutations` | en-tête de cession | `lot_id`, `mutation_type` (sale/donation/succession/other), `status` (draft→pre_etat_generated→etat_generated→signed→validated→cancelled), `signature_date`, `seller_owner_id`, `buyer_owner_id/buyer_name/buyer_email`, `notary_name/email/reference` | dossier de mutation |
| `mutation_steps` | workflow 6 étapes | `demande`, `pre_etat_date`, `etat_date`, `envoi_notaire`, `signature_acte`, `cloture_compte` ; `completed_at` | suivi procédural |
| `etat_date_snapshots` | snapshot figé probant | `mutation_id`, `copro_id`, `snapshot_type` (pre/final), `generated_at/by`, `document_id`, **`payload` JSONB NOT NULL** | **figé** = valeur probante art. 20 |
| `coproprietaires` | personnes phys./morales | `is_company`, `company_name`, `first_name/last_name`, `email` | identité |
| `lot_owners` | historique de propriété | `lot_id`, `coproprietaire_id`, `is_primary`, `share_percent` num(5,2), `start_date`, `end_date` | **clé du prorata + lecture « à date »** |
| `lot_accounts` | lien lot ↔ compte | `copro_id`, `lot_id`, `account_id` — **pas de end_date, pas d'unicité (lot_id, account_id)** | mapping comptable |
| `council_members` | composition CS | `user_id`/`coproprietaire_id`, `role` (president/secretary/treasurer/member/observer), `is_active`, `start_date`, `end_date` | composition |
| `council_decisions` / `council_votes` | délibérations CS | `linked_ag_id`, `linked_resolution_id` ; vote unique `uq_council_vote(decision_id, member_id)` | délibérations |
| `council_documents` | GED du CS | `linked_type`, `linked_id`, `visibility` (council_only) — **pas de `document_type`** | documents de contrôle |
| `ag_notifications` / `ag_notification_events` | preuve d'envoi | `notification_type` (convocation/relance/pv/reminder), `delivery_status`, `sent_at/delivered_at/opened_at`, `document_id` | **preuve juridique d'envoi** |

### 2.2 Fonctions PG
- `validate_mutation(...)` — transfert **atomique** : `UPDATE lot_owners SET end_date=signature_date` (vendeur, is_primary) puis `INSERT lot_owners` (acquéreur, start_date=signature_date), `status='validated'`.
- `create_etat_date_snapshot(...)` — INSERT snapshot + document, **aucun UPDATE ultérieur du payload**.
- `generate_etat_date_payload(...)` — construit le JSON : solde, impayés, fonds travaux ALUR par lot_id, appels à venir, 10 dernières écritures.
- `initialize_mutation_steps()` (trigger) — crée les 6 étapes.
- `elect_council_from_ag(p_ag_id, p_membres JSONB)` — SECURITY DEFINER, désactive l'ancien CS **et insère le nouveau** (corrige le constat rang 6 D6-04 : la fonction dédiée, elle, insère bien).
- `compute_decision_result(p_decision_id)` — majorité simple (`for>against`) + quorum 50 %.
- `is_council_member` / `is_council_president` — helpers de droits.

### 2.3 Edge functions
`generate_etat_date` (v2, PDF pdf-lib + GED + signed URL 15 min), `validate_mutation` (v1), `generate_owner_statement`, `council-workflow` (create-decision / cast-vote / attach-document). Notifications : `ag_send_convocations`, `ag_send_relance`, `email_webhook` (bounces/opens Resend). **`ag_send_pv_notification` N'EXISTE PAS.**

### 2.4 Vues
`v_mutation_detail`, `v_mutations_overview`, `v_etat_date_latest`, `v_owner_statement_summary` (appels+paiements), `v_owner_statement_lines`, **`v_lot_balance` (solde par lot depuis le grand livre = `ledger_entries`)**, `v_lots_with_owners`, `v_council_members`, `v_council_decisions_overview`.

### 2.5 SOURCE DE VÉRITÉ — règle d'or de l'état daté
> **Le solde de l'état daté DOIT être lu depuis le grand livre (compte 450 par lot, `v_lot_balance`/`ledger_entries`), JAMAIS recalculé depuis les appels/paiements.**

C'est la décision actée (rang 4 : `lot_id` obligatoire sur 450, solde par lot = `v_lot_balance`). **Or l'implémentation actuelle VIOLE cette règle** (cf. §5 D7-01) : `generate_etat_date_payload` lit `v_owner_statement_summary` (appels − paiements), pas le ledger. **C'est le défaut central du rang 7.**

---

## 3. Règles métier + loi

### 3.1 État daté — art. 20 (les 3 parties)
1. **Sommes dues PAR le vendeur** au syndicat (provisions exigibles impayées, charges, dettes).
2. **Sommes dont le syndicat est/sera débiteur** envers le copropriétaire (avances remboursables, trop-perçus, excédents).
3. **Sommes incombant au NOUVEAU copropriétaire** : avances/provisions du budget en cours, provisions travaux votés non encore exigibles, **quote-part de fonds travaux ALUR**.

S'ajoutent l'**opposition du syndic sur le prix** (privilège art. 20, notifiée au notaire pour recouvrer les impayés) et la **notification de la mutation au syndic par le notaire**. L'état daté doit être **figé à un instant T** (valeur probante) et **daté de la date de signature** (transfert de propriété), pas de génération.

### 3.2 Fonds travaux ALUR — art. 14-2-1
À la mutation, la **quote-part de fonds travaux du lot reste ACQUISE au syndicat** : **non remboursable** au vendeur. L'état daté publie le solde du fonds travaux du lot et le présente côté acquéreur (3e partie).

### 3.3 Prorata des charges — art. 14-1
Répartition vendeur/acquéreur des charges de l'exercice en cours : selon l'**exigibilité des appels** (le copropriétaire au jour de l'exigibilité doit la provision) — le règlement de copropriété peut préciser un prorata temporis.

### 3.4 Conseil syndical — art. 21-22
Élu par l'AG (art. 25), mandat **3 ans renouvelable**, contrôle la gestion du syndic, met en concurrence les contrats de syndic (tous les 3 ans). **Incompatibilités (art. 22) : le syndic, son conjoint/partenaire PACS et ses préposés NE PEUVENT PAS être membres du CS.**

### 3.5 Notifications légales
Convocation **21 jours** avant l'AG (art. 9 décret) ; notification du **PV** = point de départ du délai de **contestation 2 mois** (art. 42 al. 2) pour les opposants/défaillants ; conservation **10 ans**.

---

## 4. État réel en base (preuves)

### 4.1 Ce qui est CONFORME (socle sain)
- **Workflow de mutation atomique** : `validate_mutation` clôt le vendeur (`end_date`) et ouvre l'acquéreur (`start_date`) en une transaction ; 6 étapes auto-créées par trigger.
- **Snapshot d'état daté figé** : `etat_date_snapshots.payload` JSONB NOT NULL, écrit une fois, jamais ré-UPDATE → valeur probante (mais sans garde d'immutabilité dure, cf. D7-11).
- **Historique de propriété horodaté** : `lot_owners` (start/end, share_percent) permet de savoir qui était propriétaire à une date — base du prorata.
- **Élection du CS réellement câblée** : `elect_council_from_ag` **insère** les nouveaux membres (nuance importante vs rang 6 : la branche `ELECT_COUNCIL` de `activate_ag_decisions` ne les insérait pas, mais la fonction dédiée, si elle est appelée, le fait).
- **Solde par lot disponible depuis le ledger** : `v_lot_balance` lit bien `ledger_entries` compte 450 — la bonne source existe, elle n'est juste pas utilisée par l'état daté.

### 4.2 Ce qui est cassé/absent (voir §5)
- État daté : solde lu depuis appels−paiements et non le ledger ; 3 parties art. 20 non structurées ; ALUR non marqué « acquis » ; prorata absent.
- CS : aucun contrôle d'éligibilité art. 22 ; pas d'alerte de fin de mandat / mise en concurrence.
- Notification PV inexistante (départ du délai de contestation non traçable).
- Opposition sur prix non modélisée ; `lot_accounts` sans unicité ni end_date.

---

## 5. Mal implémenté / dette (P0-P3)

### P0 — bloquants (état daté = document légal probant)
- **D7-01 [P0]** — **Solde lu depuis `v_owner_statement_summary` (appels−paiements) au lieu du grand livre.** → réécrire `generate_etat_date_payload` pour lire `v_lot_balance` (ledger 450 par lot). *Sans ça, l'état daté publie un montant faux dès que ledger et appels divergent — ce qui est le cas vu les P0 du rang 4.*
- **D7-02 [P0]** — **Les 3 parties art. 20 ne sont pas structurées** dans le payload. → restructurer en 3 blocs (vendeur dû / syndicat débiteur / acquéreur : avances budget + provisions travaux + quote-part ALUR).
- **D7-03 [P0]** — **Prorata vendeur/acquéreur non calculé.** → implémenter le partage des charges de l'exercice (exigibilité des appels OU prorata temporis — à trancher §7).

### P1 — fort
- **D7-04 [P1]** — **Aucun contrôle d'éligibilité art. 22** : le syndic (ou conjoint/préposé) pourrait être membre du CS. → trigger/validation bloquant ou alertant.
- **D7-05 [P1]** — **Notification du PV non tracée** (`ag_send_pv_notification` absent) → départ du délai de contestation art. 42 al. 2 inconnu. → créer la fonction + dater la notification par destinataire + calculer la deadline (notif + 2 mois).
- **D7-06 [P1]** — **ALUR à la mutation non marqué « acquis au syndicat »** (non remboursable). → présenter en partie 3 (acquéreur) avec mention explicite (art. 14-2-1).
- **D7-07 [P1]** — **Opposition du syndic sur le prix (privilège art. 20) non modélisée.** → ajouter montant impayés / date / notaire dans le dossier de mutation.
- **D7-08 [P1]** — **`lot_accounts` sans unicité (lot_id, account_id) ni end_date** (suivi mutation). → ajouter contrainte + end_date (le compte 450 suit le lot).

### P2/P3
- **D7-09 [P2]** mandat CS 3 ans : pas de calcul/alerte de fin de mandat ni de mise en concurrence du syndic (art. 21). → `start_date + 3 ans` + alerte + trace.
- **D7-10 [P2]** indivision / personne morale (SCI) : représentation et mandataire commun non modélisés finement (`lot_owners` + `share_percent` à exploiter).
- **D7-11 [P2]** snapshot état daté : payload non ré-écrit mais **pas de garde d'immutabilité dure** → trigger interdisant l'UPDATE du payload après création.
- **D7-12 [P3]** `council_documents` sans `document_type` (PV CS, rapport de contrôle, mise en concurrence…).

---

## 6. Sources divergentes → source unique

| Sujet | Sources concurrentes | Source unique cible |
|---|---|---|
| **Solde de l'état daté** | `v_owner_statement_summary` (appels−paiements) **vs** `v_lot_balance` (ledger 450) | **`v_lot_balance` / grand livre** (D7-01) |
| Propriétaire « à date » | `lots`/courant **vs** `lot_owners` (historique) | `lot_owners` horodaté |
| Composition du CS | branche `ELECT_COUNCIL` (n'insère pas) **vs** `elect_council_from_ag` (insère) | `elect_council_from_ag` câblée |
| Compte tiers d'un lot en mutation | `lot_accounts` sans end_date | `lot_accounts` versionné/horodaté (D7-08) |
| Quote-part ALUR au vendeur | « remboursable » implicite | **acquise au syndicat** (D7-06) |

---

## 7. Questions expert (à trancher)

1. **État daté — règle d'or** : confirmer que le solde se lit **exclusivement** depuis le grand livre (`v_lot_balance`/450), même si ça diffère du « appels − paiements » actuel. *(reco forte : OUI)*
2. **Prorata** : à la mutation en cours d'exercice, répartition vendeur/acquéreur **au prorata temporis** (date de signature) ou **selon l'exigibilité des appels** ? *(la loi penche pour l'exigibilité ; le règlement peut préciser)*
3. **ALUR** : confirmer que la quote-part fonds travaux du vendeur reste **acquise au syndicat** (non remboursable) et figure en **partie 3** (acquéreur).
4. **3 parties art. 20** : valider la structure attendue dans le payload (vendeur dû / syndicat débiteur / acquéreur).
5. **Éligibilité CS (art. 22)** : incompatibilités à appliquer (syndic, conjoint/partenaire, préposés) — **bloquer en base ou alerter** ?
6. **Opposition sur prix (art. 20)** : modéliser et tracer (montant, date, notaire) dans le dossier de mutation ?
7. **Notification PV (art. 42 al. 2)** : tracer la date de notification par destinataire + générer `ag_send_pv_notification` ?
8. **Mandat CS (3 ans)** : calculer/alerter automatiquement la fin de mandat + la mise en concurrence du syndic (art. 21) ?
9. **Clôture de compte à la mutation** : le compte 450 **suit le lot** (l'acquéreur reprend le compte) ou **nouveau compte par propriétaire** ? Le solde vendeur est-il soldé/transféré ?

---

## 8. Vue d'ensemble & impacts transverses (dev fullstack + syndic)

**Le rang 7 est le RÉVÉLATEUR AVAL de toute la chaîne.** L'état daté agrège, dans un document **à valeur probante légale**, ce que produisent les rangs amont :

```
Rang 4 (solde 450 par lot, ledger)  ─┐
Rang 5 (quote-part ALUR par lot)     ├──►  ÉTAT DATÉ (art. 20, figé, probant)  ──►  notaire / acquéreur
Rang 6 (CS élu via auto-propagation) ─┘
```

- **→ Rang 4** : tant que le ledger n'est pas alimenté (edge functions cassées, D-01) et que `generate_etat_date_payload` lit appels−paiements au lieu du 450 (D7-01), **l'état daté est faux deux fois** : mauvaise source ET source vide.
- **→ Rang 5** : la quote-part ALUR de l'état daté dépend de la clé ALUR — orpheline en base (D5-01). Un état daté avec ALUR à 0 est juridiquement fautif.
- **→ Rang 6** : le CS n'apparaît que si `elect_council_from_ag` est réellement appelée (la branche d'`activate_ag_decisions` ne l'appelle pas, D6-04). Le rang 7 montre que la **fonction dédiée fonctionne** — il manque juste son câblage côté pilier.

**Ses propres défauts restent indépendants** : même rangs 4/5/6 corrigés, il faudra (a) basculer la source du solde sur le ledger, (b) structurer les 3 parties art. 20, (c) calculer le prorata, (d) contrôler l'éligibilité CS, (e) tracer la notification du PV. **Risque dominant : la responsabilité du syndic** — un état daté erroné est opposable et engage. C'est pourquoi D7-01/02/03 sont P0 malgré l'absence de données en DEV.

**Posture de priorisation** : le rang 7 se **fiabilise en dernier** (il dépend de l'amont), mais ses 3 P0 doivent être inscrits dès maintenant car ils touchent un document légal — à corriger juste après les rangs 4/5/6 dans le plan global.
