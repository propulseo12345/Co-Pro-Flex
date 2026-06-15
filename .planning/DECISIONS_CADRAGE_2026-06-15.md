# Décisions de cadrage — session 2026-06-14/15 (avant J3)

> Validées avec Lyes cette session. À exécuter dans les tranches J2-bis / J5.
> Gouvernance : **Option A** — je n'applique AUCUNE migration sur le live `qqfqrcolzmcbsvfaumiq` ;
> je livre les `.sql` + gates, **Lyes applique** au déploiement délibéré ; tests sur **branche Supabase jetable**.

## AG
1. **Pouvoirs** → rebrancher `usePouvoirs` sur le modèle EXISTANT `ag_attendance` (`presence_type='proxy'` + `represented_by_*` + `proxy_document_id` pour le scan). Créer les 4 RPC sur cette table (pas de table en double). **+ durcir la limite art. 22 (3 pouvoirs / 10 %) côté serveur** (aujourd'hui client-only). *(0050 prétend à tort que ces RPC sont mortes.)*
2. **Choix d'envoi** → rebrancher `useAgEnvoiPage` sur `get/save_ag_envoi_tracking` (0030, table `ag_envoi_tracking`). **Multi-canal autorisé** (LRAR + email pour la même personne — la table porte `method`). **Distinguer canal légal** (`registered_*`/`hand_delivery` = fait foi, déclenche le délai 21 j) **des copies informatives** (`email`/`postal`). RPC de gestion des choix = purge des lignes `status='queued'` non envoyées + réinsertion (ne jamais toucher une trace envoyée).
3. **Jalons** → créer `get/save_ag_milestone` sur la table existante `ag_milestones` (0018) ; **statut dérivé côté app** (urgent/dépassé/fait depuis `due_date`+`done`+aujourd'hui) ; **pas** de migration de renommage `milestone_key`→`milestone_type`.
4. **Conseil — onglet Membres** → créer une vue `v_council_members_detail` (JOIN `council_members`→`coproprietaires`/`profiles`, COALESCE noms/emails). Ne PAS réexposer `council_decisions/votes` à l'UI en bêta. `v_council_*` legacy = hors périmètre.

## GED *(encore à cadrer en détail — brainstorming en attente)*
5. Rebrancher les **liens** (getDocumentLinks/getDocumentsForEntity canoniques `lib/documents/api.ts` + 2 helpers triviaux) ; sortir la **logique pure** (détection type, config, libellés) des « .service mock » et supprimer les **données** mock ; **versioning** = câbler sur la vue orpheline `v_document_versions` + config front (obsolescence dérivée). Async/types à adapter sur plusieurs composants.

## Comptable (J5, touche le GL → revue adversariale)
6. **charge_nature (E5/E6)** → (a) **migration corrective** : 661/662/704 → `'travaux'` (le seed 0059 les laisse en `courant` par fallback — BUG dans une migration mergée) ; (b) RPC manager `set_account_charge_nature` (override par compte, tracé, respecte le CHECK).
7. **Annexes (E2/E7/E8 + 3/5)** → **réécrire les 5 `fn_annexe_*`** (0028) ; **le front (`types.ts`) est DÉJÀ au bon format**, c'est le SQL en retard. Détail + croisement légal : `.planning/ANALYSE_ANNEXES_2026-06-14.md`. 3 décisions actées :
   - **Annexe 4 → 6 colonnes** (sur-ensemble safe : votés/payés/réalisés/appels reçus/solde/subventions).
   - **Libellé colonne financement** → version en vigueur (arrêtés 2016/2020) : « Appels de provisions, emprunts et subventions reçus, affectation du fonds de travaux ».
   - **Sens du solde annexe 5** → aligné automatiquement sur le **compte 12** du GL (technique, pas de décision Lyes).
   - Poser des **gates de cohérences croisées** (Σ annexe5 col. E = compte 12 ; Σ annexe3 = bloc I annexe2 ; débit=crédit annexe1 ; 105 = 501/502). ⚠️ **VIDE DE TEST total** sur les annexes aujourd'hui.
   - **Annexe 1** oublie le compte 12 + mélange 103/105 + trésorerie limitée à 512 (déséquilibre ALUR) ; **annexe 5** a un solde FAUX (voté−réalisé). PDF convocation AG : annexe 1 CASSÉE (`.map` sur un nombre) → **ne pas envoyer de convocation avec annexes avant la refonte**.

## État daté / GL
8. **État daté partie 3 (H3)** → compléter : provisions du budget voté **non encore appelées** (art. 14-1) + **ALUR à venir** (art. 14-2). *(Le SQL ne fait que les avances 450-3 + provisions déjà appelées.)*
9. **H1 multi-acquéreurs** → **différé J9** (modèle lot-centric mono-acquéreur suffit pour la bêta).
10. **Câblage état daté** → recâbler le front directement sur les RPC `generate_etat_date_payload`/`create_etat_date_snapshot`/`validate_mutation` (0031) ; **créer les edge functions manquantes** `generate_etat_date` et `validate_mutation` (le front les appelle, elles n'existent pas).
11. **Contre-passation F9** → colonne `ledger_transactions.reversed_tx_id` + RPC `reverse_ledger_transaction` (extourne dans la **période ouverte courante** — déjà imposé par le verrou de `create_ledger_transaction` ; jamais rouvrir une période figée) + UI guidée + gate. Aucune RPC d'extourne manuelle n'existe.
12. **Reprise mandat F8** → apurement 471/472 par AG **différé** ; 3 briques restantes (traçabilité 471/472 ligne-par-ligne art.10, import balance Excel, acompte 409) **après** le cœur J5. Socle `set/get_opening_balance` déjà mergé main.
13. **Mutations** → **réparer une création MINIMALE** (FK `seller_owner_id`/`buyer_owner_id`/`notaire_id` au lieu des `buyer_*`/`notary_*` à plat qui n'existent pas → `createMutation` plante) pour débloquer l'état daté ; workflow vente complet (opposition art. 20, multi-acquéreurs) = **J9**.

## Reste de Lyes (expert)
- Annexes : valider le **fac-similé légal** (formulaire officiel à jour) avant gel des libellés.
- État daté : confirmer le **périmètre exact de la partie 3** (provisions votées non appelées + ALUR).

## Vérif migration `providers → tiers` (faite cette session)
**Saine et délibérée** (blueprint `.planning/db-cible/07-maintenance-tiers.md`, décisions tracées). Modèle `tiers` (multi-rôles, RIB, domaines `domain_ids`→work_domain) **meilleur que l'ancien**. **Manques mineurs → backlog** (à noter, non bloquants bêta) : litige OS, rapport/PV réception typé, forecasting réglementaire auto (`next_due_at`), dates couverture assurance, génération auto d'OS (drapeau `auto_generate_orders` sans RPC), budget vs réel par contrat, durée estimée/réelle OS, `signed_at` contrat, motif non-reconduction, historique des montants, préférence de contact, zones GIS.
