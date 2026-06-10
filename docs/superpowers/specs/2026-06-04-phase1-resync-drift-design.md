# Spec — Phase 1 : stopper le drift migrations ↔ live

> 2026-06-04. Issu de `.planning/AUDIT_DRIFT_FONCTIONS.md` + `.planning/CARTE_DOUBLONS.md`.
> Vérifications de cascade effectuées en lecture seule sur le live `iyfesbjnkpynmwlsmxnp` (résultats §4).
> Décisions de cadrage validées avec l'utilisateur (découpage par paliers BAC + figer le `search_path` maintenant).

## 1. Objectif

Faire en sorte qu'un **replay des migrations sur une base neuve reproduise exactement le live**. Aujourd'hui **61 fonctions sont désynchronisées** (25 « drift pur » absentes de toute migration + 36 dont le corps diverge), donc un replay ne reproduit pas le live et certaines versions-fichier planteraient. Périmètre d'action : **60 à graver** (24 drift-pur + 36 divergences) **+ 1 à dropper** (`can_access_document`).

On grave le live dans des fichiers de migration datés, **sauf trois exceptions déjà décidées** :
- `cast_vote` → ré-appliquer le **fichier** (le live est bugué : version pré-feature « vote par correspondance »).
- 9 fonctions `SECURITY DEFINER` → figer le corps live **+ restaurer la garde d'accès retirée** (trou PII inter-copro).
- `can_access_document` → **DROP** (cassée : référence la table inexistante `copro_members`).

Et on en profite, sur le **même périmètre `SECURITY DEFINER`**, pour **figer le `search_path`** manquant (vecteur d'escalade de privilèges).

## 2. Hors périmètre (phases ultérieures)

Drops de tables mortes (Phase 2), surcharges/fusions de fonctions (Phase 3), et le gros chantier « finalisation AG bespoke → moteur canonique » (Phase 4). Les fonctions AG bespoke (`create_budget_from_ag`, `elect_council_from_ag`, `generate_combined_calls_from_ag`, `get_ag_pending_actions`, `mark_ag_action_activated`) sont **figées en Phase 1** (pour rendre le replay fidèle) puis **droppées en Phase 4** — pas de contradiction : Phase 1 ne fait qu'arrêter la dérive.

## 3. Principe de risque

- **Figer un live drifté = quasi no-op en prod** : le corps écrit est identique au corps déjà en place ; `CREATE OR REPLACE` ne change rien. La valeur est dans le **repo** (convergence repo ↔ live).
- **Vrais changements de comportement en prod = BAC3 uniquement** (`cast_vote`, gardes) **+ le DROP**. C'est là, et seulement là, que le **GO explicite de l'utilisateur** et un **test sur copro HARNESS** sont requis.

## 4. Analyse de cascade (preuves live, lecture seule)

| Vecteur | Constat base | Verdict |
|---|---|---|
| Vues/règles dépendant des 60 fns | 1 seule : `v_ag_overview` → `compute_ag_quorum` (simple `CREATE OR REPLACE`, pas un changement de signature) | aucune vue cassée |
| Policies RLS référençant ces fns | 0 | rien |
| Fonctions DB appelant les 3 à signature changée | 0 (vérifié sur les corps `prosrc` ; `pg_depend` ne tracke pas les appels fn→fn) | aucun appelant interne |
| Gardes `auth.uid()` restaurées bloquant un appel `service_role` | 0 edge caller : 100 % des appels des 9 fns viennent de `src/` (front, session user) | sûr |
| Fonctions trigger (corps rejoué à chaque écriture) | 4 : `documents`, `copros`, `ledger_entries`, `call_for_funds_lines` | gel byte-à-byte (cf. garde-fous) |
| `search_path` durci cassant la résolution de noms | convention 100 % uniforme : `search_path=public` (153/153) | figer à `public` = résolution **identique** |

**Deux garde-fous imposés par cette analyse :**
1. **`search_path` figé uniquement sur les `SECURITY DEFINER`** (le vrai vecteur), valeur **`public`** (convention du projet). Les fonctions `invoker` ne sont pas touchées — en particulier le trigger financier `validate_call_for_funds_total` reste en **gel pur**.
2. **Les 4 fonctions trigger** (`calculate_document_expiration`/documents, `create_default_reminder_rules`/copros, `enforce_lot_id_on_45x`/`ledger_entries`, `validate_call_for_funds_total`/`call_for_funds_lines`) sont en **BAC1 gel à l'identique**. Critère bloquant : `pg_get_functiondef` **avant == après**. Diff non vide ⇒ stop.

## 5. Étape 0 — Préparation mécanique (lecture seule, AUCUNE écriture)

1. `pg_get_functiondef` des 60 fonctions (toutes sauf `can_access_document`) → corpus exact du live.
2. Pour les 36 divergences : diff déterministe **corps live ↔ corps du dernier fichier de migration** (normalisé : commentaires, espaces, casts ignorés) → **re-dériver la partition BAC fonction par fonction** (la partition §6 est provisoire, issue de l'audit).
3. Résoudre les **2 fonctions présentes à la fois en BAC2 (signature) et BAC3 (garde)** : `get_ag_all_session_drafts` et `get_ag_session_draft` → traitées **une fois, en BAC3** (garder le retour `text` du live + restaurer garde + `search_path`).
4. Localiser dans le repo le **dernier** fichier de migration définissant chaque fonction (pour BAC2/BAC3).
5. **Livrable** : manifeste figé (nom, signature live, DEFINER/invoker, `search_path` oui/non, BAC assigné, fichier-source repo) avant toute écriture.

## 6. Lots de livraison

### BAC1 — figer les sûres `(1 migration)`
- **24 drift-pur** (les 25 moins `can_access_document`) : `CREATE OR REPLACE` à l'identique du live.
- **~18 divergences sûres** : 6 cosmétiques + 5 bénignes + 7 « live clairement correct » (`calculate_document_expiration`, `create_ag_with_standard_resolutions` [retour uuid — le fichier jsonb casserait l'edge], `create_etat_date_snapshot`, `get_ag_recipients`, `register_correspondence_vote`, `rpc_get_ag_pv_bundle`, `upsert_mutation_step`) + finance cosmétique (`open_next_period`, `post_period_cutoff`, `reverse_period_cutoff`, `provision_copro_chart`, `enforce_lot_id_on_45x`, `seed_golden_loop`, `validate_call_for_funds_total`).
- **+ durcissement `search_path = public`** sur les `SECURITY DEFINER` de ce lot en `NO_sp`.
- **Critère** : `pg_get_functiondef` avant == après (hors `search_path` ajouté volontairement) + `tsc` + vitest boucle d'or verts.

### BAC2 — inspecter puis figer (5) `(1 migration)`
Pour chacune : lire le diff live ↔ fichier, présenter la décision, l'utilisateur tranche, puis figer.
- `delete_ag_draft` : **fichier = version aboutie**, live = sommaire → décision produit.
- `generate_campaign_recipients` : figer le live **mais réintroduire la branche `custom`**.
- `register_correspondence_form_votes` : vérifier `status` vs `integration_status` (lu par `v_ag_correspondence_status`).
- `validate_mutation` : valider le pipeline de statuts + ancrage `p_signature_date`.
- `close_ag` : confirmer le retrait d'une éventuelle surcharge 1-arg (live = 2 args `p_ag_id, p_closing_notes`) → `DROP` ciblé puis `CREATE`.
- **Critère** : chaque décision tracée dans ce spec (§8), puis figée, tests verts.

### BAC3 — corriger AVANT de figer `(commits séparés)`
- **`cast_vote`** : ré-appliquer le **fichier** (commit dédié). N'a aucun dépendant (vue/policy/fn) ; enrichit le contrat (active les votes par correspondance) → aucun appelant cassé.
- **Batch sécurité (9)** : `get_ag_all_session_drafts`, `get_ag_envoi_choices`, `get_ag_milestones`, `get_ag_session_draft`, `rpc_get_ag_coproprietaires`, `save_ag_envoi_choices`, `save_ag_milestone`, `save_ag_session_draft`, `save_ag_wizard_state`. Pour chacune : figer le corps live **+ ré-injecter la garde d'accès** (`user_has_copro_access`/`user_is_copro_manager`/`auth.uid()`) **+ `search_path = public`**. Pour `get_ag_*_drafts` : conserver le retour `text` du live ⇒ `DROP`+`CREATE` (le type de retour change vs fichier enum). **Un commit batch** (décision utilisateur : groupé, pas un commit par fonction).
- **Critère** : test sur copro HARNESS jetable qu'un accès inter-copro est **refusé** après restauration ; boucle d'or inchangée.

### Fichiers morts `(1 commit)`
- Retirer du repo / ajouter un `DROP` pour les **7 CREATE** présents en migration mais absents du live : `generate_ag_document_path`, `get_latest_ag_document`, `register_ag_document`, `remove_ag_milestone`, `trg_ag_documents_create_ged_entry`, `trg_documents_updated_at`, `update_forum_topic_stats`.
- **`DROP can_access_document`** après grep front + edge confirmant 0 usage.

## 7. Validation & application prod

- Après **chaque** lot : `tsc --noEmit` + vitest (boucle d'or) verts ; regen `src/types/supabase.ts` si une signature change ; build Next si du front est touché.
- **Application prod sur GO utilisateur, lot par lot.** BAC1/BAC2 = idempotents (no-op prod). BAC3 + DROP = vrais changements → **test HARNESS d'abord**.
- **Preuve finale** : sur une base neuve, replay des migrations → diff `pg_get_functiondef` vs live = **0 écart**, hors les 3 exceptions assumées (`cast_vote` corrigé, gardes restaurées, `can_access_document` droppée) et le `search_path` ajouté volontairement.

## 8. Décisions actées (rappel) & points ouverts BAC2

**Actées (mémoire `cleanup_doublons_audit`, 2026-06-04) :** reset `ag_pending_actions` abandonné ; restaurer les gardes (pas figer le live nu) ; `cast_vote` = ré-appliquer le fichier ; la finance n'a pas dérivé ; pages EN/FR = copies (Phase 2).

**Points ouverts à trancher en BAC2 (Étape 0 fournit les diffs) :**
- `delete_ag_draft` : garder la version fichier (aboutie) ou la version live (sommaire) ?
- `generate_campaign_recipients` : forme exacte de la branche `custom` à réintroduire.
- `register_correspondence_form_votes` / `validate_mutation` : confirmer les contrats de statut.

## 9. Critères d'acceptation (résumé)

1. Manifeste Étape 0 figé et revu avant toute écriture.
2. BAC1 livré : replay == live sur le périmètre, tests verts, triggers byte-identiques.
3. BAC2 livré : décisions tracées ici, figées, tests verts.
4. BAC3 livré : `cast_vote` corrigé + gardes restaurées + `search_path` figé ; HARNESS prouve le refus inter-copro ; boucle d'or inchangée.
5. Fichiers morts nettoyés + `can_access_document` droppée.
6. Preuve finale « replay base neuve == live » à 0 écart (hors exceptions assumées).
