# PROGRESS — J2-bis lot 2 : AG annexes — ✅ LIVRÉ + REVU + CORRIGÉ (PR #14, prête à merger)

> **État 2026-06-12 ~21h40 : revue adversariale `ultracode` PASSÉE (95 agents,
> 44 constats, 35 confirmés double contre-expertise) PUIS TOUS LES VRAIS CONSTATS
> CORRIGÉS. 3 commits poussés (`8950a14` db+gate, `b7735b7` edge, `1d605fe` front)
> sur `1d605fe`. CI PR #14 TOUTE VERTE (rejeu migrations à neuf + Gates SQL + tsc/lint/tests).
> RESTE : merge USER.**
>
> ## Corrections appliquées (revue → fix)
> - **BLOCKER** v_ag_drafts_progress : filtre `status='draft'` restauré (sinon toute
>   AG convoquée/clôturée réapparaissait comme brouillon éditable + auto-resume cassé).
> - **BLOCKER** create_ag_notification RECRÉÉE (signature edges p_copro_id/p_notification_type/
>   p_document_id) : l'ancienne 0033 échouait silencieusement → notification_type jamais
>   écrit, vue stats morte. `relance`/`pv` désormais possibles.
> - **MAJOR** completion_ratio : décision USER = **jauge B** (étapes wizard /9, 0..100).
> - **MAJOR** versionnage ag_documents : chemin storage unique par génération côté edge
>   (avant : toutes les versions pointaient le même fichier écrasé).
> - **MAJOR** correspondence_tantiemes : dérivé des votes `vote_source='correspondence'`
>   (la RPC n'écrit jamais ag_attendance). total_tantiemes : **les deux** = vue alignée
>   `limit 1` + index unique partiel (1 seule clé générale active/copro).
> - **MAJOR** gate : refus 42501 register/delete sous non-gestionnaire + RLS ag_documents
>   (flag/policies/visibilité) désormais prouvés.
> - **MINORS** : advisory lock anti-collision version, delete_ag_draft anti-TOCTOU +
>   restitution storage_path, generated_by_name figé, v_ag_notification_stats exclut
>   'cancelled', index ag_notifications(ag_id), updated_at+trigger ag_documents,
>   last_activity_at réintègre résolutions/présences, front remise_main→hand_delivery.
> - **DETTE TRACÉE** : src/types/supabase.ts garde l'ancienne signature create_ag_notification
>   (clients untyped, regen scratch déjà différée) ; p_document_id reçu mais non persisté
>   (ag_notifications sans colonne dédiée — hors périmètre).
>
> Rapport revue complet (temporaire) : `tasks/wfp38lnlh.output`.
>
> ## Code review des fixes (27 agents, 2026-06-12 ~22h) → suites TRACÉES (non bloquantes)
> Verdict : fixes solides, 0 régression nominale, 6/23 candidats réfutés. Constats confirmés,
> tous LATENTS ou dette déjà connue (vérifié empiriquement : 0 indivision, 0 drift clé sur la base) :
> - **MAJOR latent (à trancher MÉTIER)** : en indivision (share_percent<100), correspondence_tantiemes
>   dérivé des votes vaut la quote-part pondérée (RPC 0030 : weight×share/100) alors que la feuille
>   de présence/quorum compte le poids BRUT du lot. Ratio correspondance non comparable au quorum
>   pour les indivisions. 0 ligne concernée aujourd'hui (toutes share=100). À arbitrer avec Lyes :
>   poids correspondance d'un indivisaire = sa quote-part OU le poids plein (art.23 mandataire) ?
> - **Deploy** : uq_one_active_general_key sans IF NOT EXISTS / pré-nettoyage casserait 0050 sur une
>   base portant déjà 2 clés générales actives. 0 drift sur nos bases + CI rejeu neuf vert → OK pour
>   notre modèle fresh-replay. À garder en tête si applique sur une base legacy driftée.
> - **MINORS dette** : src/types/supabase.ts garde l'ancienne signature create_ag_notification (regen
>   différée) ; delete_ag_draft renvoie deleted_storage_paths mais useAgDrafts ne câble pas encore
>   storage.remove (orphelins bucket — quasi nul car un brouillon a rarement des docs) ; p_document_id
>   reçu non persisté (pas de colonne) ; gate_0050 dépend implicitement du contexte service_role du runner.
> ---
> **Archive de référence (design initial) ci-dessous :**

## Périmètre RÉEL (après audit des appelants — bien plus petit que le plan)
À CRÉER (migration **0050**) :
1. **6 vues** `security_invoker` (toutes appelées par le front, aucune n'existe) :
   - `v_ag_attendance_summary` — contrat ancien types `.planning/tmp_types_5c8209e.ts:10253` (18 col). Sources : ag_attendance + ag_meetings (ag_title, ag_date=meeting_date) + coproprietaires (owner_name=display_name, owner_email) + `lot_refs` = array des `lots.ref` pour lot_ids. Appelants : session.api.ts:19, meetings.api.ts:74, **edge ag_generate_document:813** (la créer répare la génération PDF).
   - `v_ag_votes_detailed` — tmp_types:10888 (17 col). ag_votes + ag_resolutions (number/title/majority_type) + ag_meetings + coproprietaires (voter_name). Labels vote IDENTIQUES anciens/nouveaux : 'for'/'against'/'abstention' (vote_choice). Appelant : votes.api.ts:19 (filtre resolution_id).
   - `v_ag_drafts_progress` — tmp_types:10401 (21 col). Base ag_meetings (status='draft' inclus en colonne, le front filtre) + counts résolutions/votes/présences + has_* booleans + `completion_ratio` = round(max_step_reached/7.0*100) **[APPROXIMATION à challenger Lyes]** + last_activity_at = greatest(updated_at, max(ag_session_drafts.last_modified_at)). Appelant : useAgDrafts.ts:190.
   - `v_ag_correspondence_status` — tmp_types:10361 (13 col). ag_correspondence_votes (enum status : pending/validated/integrated → forms_received=count(*), forms_validated, forms_integrated) + details (vote_details_count, votes_integrated=integrated_vote_id not null) + correspondence_tantiemes = Σ ag_attendance.tantiemes presence_type='correspondence' + total_tantiemes via clé générale (pattern 0049/compute_ag_quorum) + ratio %. Appelant : useCorrespondenceVotes.ts:99.
   - `v_ag_documents` — PAS dans l'ancien types (née en live post-5c8209e). Contrat = interface front `AgDocument` (src/lib/ag/types.ts:414, 17 champs). Source = NOUVELLE table ag_documents (ci-dessous) + join ag_meetings (ag_title/ag_date/ag_status) + profiles (generated_by_name) + documents (document_name). Appelants : documents.api.ts:28,47 (filtres ag_id, doc_type, order generated_at/version).
   - `v_ag_notification_stats` — PAS dans l'ancien types. Contrat = interface `AgNotificationStats` (src/features/ag/types/notifications.ts:50) + copro_id. Group by ag_id, notification_type : total/pending(pending,queued)/sent/delivered/opened(opened,clicked)/bounced/failed counts (enum delivery_status 0003:40). Appelant : useAgNotifications.ts:90 (.eq notification_type 'convocation' .single()).
2. **Table `ag_documents`** (id, copro_id, ag_id, doc_type check convocation/attendance_sheet/pv, storage_path, file_name, file_size bigint, version int default 1, generated_at, generated_by→profiles, generation_metadata jsonb, document_id (FK documents set null), retention_until, unique(ag_id,doc_type,version)) + RLS classe collectif (modèle 0034).
3. **RPC `register_ag_document`**(p_copro_id,p_ag_id,p_doc_type,p_storage_path,p_file_name,p_file_size,p_metadata) → jsonb {ag_document_id, version} ; version=max+1 par (ag,doc_type) ; garde is_service_call() OR user_is_copro_manager ; appelée par edge ag_generate_document:973 (qui TOLÈRE l'échec silencieusement ligne 990 — d'où le drift jamais vu).
4. **RPC `delete_ag_draft`**(p_ag_id) → json {success} ; garde manager + UNIQUEMENT status='draft' ; delete ag_meetings (cascade emporte résolutions/drafts/présences). Appelant : useAgDrafts.ts:337 (aujourd'hui : crash silencieux → fallback localStorage).
5. **ALTER `ag_notifications` ADD notification_type text not null default 'convocation'** check in ('convocation','relance','pv') — le front le lit sur la TABLE (useAgNotifications.ts:115) ET via la vue stats ; l'edge ag_send_convocations n'envoie pas ce champ → default OK.

## NE PAS créer (morts, zéro appelant front — décision 2026-06-12)
get/save_ag_milestone(s), get/save/update/delete_ag_pouvoir(s)/justificatif, get/save_ag_envoi_choices.
Pouvoirs = ag_attendance.presence_type='proxy' + represented_by_* ; envoi = ag_envoi_tracking ; jalons = ag_milestones (0018 transitoire, lue par get_ag_wizard_state).

## Étapes restantes
1. Écrire 0050 + gate `gate_0050_ag_annexes` (calque gate_0049 : security_invoker ×6, contrats colonnes STRICTS, valeurs prouvées — présences/votes/correspondance/notifications/register version++/delete_ag_draft refusé si non-draft, claims utilisateur pour vues contextuelles s'il y en a) ; l'ajouter à scripts/db-test.mjs.
2. Appliquer au docker local (`docker exec -i supabase_db_Co-Pro-Flex psql ...`), `npm run db:test` (15 gates), tsc, vitest (**lancer depuis `C:\...` MAJUSCULE — minuscule = 2 copies vitest chargées, échec bidon**).
3. Types : ajouter à la main les 6 vues + table + 2 RPC dans src/types/supabase.ts ? NON — clients untyped (`createUntypedClient`), seule la table ag_documents mérite l'ajout si tsc le réclame. Regen scratch différée (déjà tracée).
4. Commits séparés (db / front si retouches) + push (**gh auth switch -u lyestriki-29 juste avant CHAQUE push — le compte retombe tout seul sur Propulseo**) + PR.
5. **ULTRACODE à la revue finale du lot** (revue adversariale multi-agents, comme l'audit du 12/06) — le proposer à Lyes AVANT le merge.

## Pièges connus
- total_tantiemes : JAMAIS lots.tantiemes_generaux (droppée) → Σ weight clé générale active.
- Trigger tr_ag_attendance_tantiemes ÉCRASE tantiemes depuis lot_ids (gate : fournir des lots réels de la clé).
- ck_ag_attendance_proxy : proxy ⇒ represented_by_id NOT NULL ≠ soi-même.
- Parasites 0-octet à la racine ('to_renew', etc.) : `git clean -f` jamais passé (action user).
