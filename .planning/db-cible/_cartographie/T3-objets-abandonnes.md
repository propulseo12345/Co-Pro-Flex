# T3 — Liste ANTI-REPRISE (objets morts / doublons à NE PAS reprendre dans la DB cible)

> 2026-06-04 — **lecture seule** sur le live `iyfesbjnkpynmwlsmxnp`. Aucune écriture.
> Méthode : pour chaque candidat, 4 preuves croisées —
> **(a)** données `count(*)` ; **(b)** front grep `src/` (hors `types/supabase.ts` = types générés, ne compte pas comme usage) ; **(c)** edge functions Deno `supabase/functions/` ; **(d)** FK entrantes + vues + fonctions DB dépendantes.
> Règle d'or (mémoire) : on ne marque ABANDONNÉ que si **0 ligne pertinente + 0 importeur front réel + 0 usage edge + 0 dépendance DB (FK/vue/fonction)**. Tout objet avec UNE preuve d'usage bascule en **À GARDER**.

---

## A. ABANDONNÉS — confirmés morts (ne PAS reprendre)

### A1. `lot_accounts` — TABLE (modèle « un compte par lot » abandonné)
- **(a)** 21 lignes (vestiges du modèle 411-xxx abandonné, cf. mémoire `ledger_account_model`).
- **(b)** 0 `.from('lot_accounts')` dans `src/` (seul hit = `types/supabase.ts` généré).
- **(c)** 0 hit dans `supabase/functions/`.
- **(d)** 0 FK entrante ; 0 vue dépendante ; 0 fonction DB ne référence `lot_accounts`.
- **Verdict : ABANDONNÉ.** Le modèle canonique est sous-compte par nature (450-1/2/3/4/5) + dimension `lot_id`. Ne PAS reprendre.

### A2. `mail_labels_v2` — TABLE (refonte messagerie avortée)
- **(a)** 0 ligne.
- **(b)** 0 `.from('mail_labels_v2')` dans `src/` (seul hit = types générés).
- **(c)** 0 hit edge.
- **(d)** 0 FK entrante ; 0 vue ; 0 fonction DB.
- **Verdict : ABANDONNÉ.** Le labelling vit côté front (`IMailLabel`/`DEFAULT_LABELS` dans `features/communication/mail/domain`). Ne PAS reprendre.

### A3. Îlot CAMPAGNES D'EMAILING DE MASSE (décision user : DROP)
Tables : `mail_campaigns` (2), `mail_inbox` (2), `mail_recipients` (9), `mail_folders` (5), `mail_templates` (3) + vues `v_mail_campaigns_overview`, `v_mail_inbox_overview`.
- **(a)** quelques lignes de test (≤ 9), aucune sur copro immuable.
- **(b)** servies par `lib/mail/api.ts` + `hooks/modules/useMailData.ts`, **mais `useMailData()` n'est monté sur AUCUNE page** : seul `hooks/index.ts` (barrel) le ré-exporte. La messagerie RÉELLE montée (`app/(dashboard)/communication/mail/page.tsx`) passe par `useMailbox` → table `mails` (chemin distinct, à garder).
- **(c)** 0 hit edge sur ces 5 tables.
- **(d)** îlot FK fermé sur lui-même (campaigns↔recipients↔inbox↔folders↔templates) ; **aucune FK entrante externe** ; les 2 vues ne sont lues que par `lib/mail/api.ts` (île).
- **Verdict : ABANDONNÉ** (conforme « DROP les campagnes d'emailing de masse »). Reprendre l'île entière + `lib/mail/api.ts` + `useMailData.ts` + la ligne barrel `hooks/index.ts`. NE PAS confondre avec `mails` (= messagerie interne, gardée).

### A4. Couche AG « bespoke » (ne POSTE PAS le grand livre) — FONCTIONS
Toutes confirmées présentes en live, toutes en **drift** (absentes des migrations) :
`generate_combined_calls_from_ag(p_ag_id, p_nb_appels)`, `create_budget_from_ag(...)`, `elect_council_from_ag(...)`, `create_alur_fund_from_ag(...)`, `get_ag_pending_actions(p_ag_id)`, `mark_ag_action_activated(...)`.
- **(a)** N/A (fonctions). Écrivent `ag_pending_actions` mais **aucune écriture comptable**.
- **(b)** consommées par `lib/ag/api/finalisation.api.ts` + `features/ag/finalisation/` — **à rebrancher** sur le canonique avant drop (Phase 4 de la carte).
- **(c)** 0 hit edge.
- **(d)** doublent la chaîne canonique qui POSTE le GL : `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds` (toutes confirmées en live).
- **Verdict : ABANDONNÉ** (décision user verrouillée). La DB cible ne garde QUE la chaîne canonique. Drop des bespoke seulement après rebranchement front prouvé iso-comportement sur HARNESS.

### A5. Surcharges SQL legacy non droppées (résolution ambiguë) — FONCTIONS
- `post_budget_call_for_funds` **8-arg** (wp6) : confirmée en live À CÔTÉ de la 10-arg (cr8). La 10-arg agrégée est la cible → **ne pas reprendre la 8-arg**.
- `post_supplier_payment` **7-arg** (non idempotent) : l'edge `pay_supplier_invoice` passe `p_idempotency_key` → utilise la 8-arg. **Ne pas reprendre la 7-arg** (risque double paiement).
- `post_call_for_funds` (legacy mono-clé) : remplacée par `post_budget_call_for_funds` agrégé. ⚠️ encore appelée par l'edge `generate_call_for_funds/index.ts` → **rebrancher + redéployer l'edge AVANT** de l'abandonner.
- `can_access_document` : **CASSÉE** (référence table inexistante `copro_members`). ABANDONNÉE sèche.
- `generate_document_path` 3-arg, `clear_ag_session_drafts` doublon repo : ne garder que la dernière signature.
- **Verdict : ABANDONNÉ** (garder uniquement la signature canonique de chaque).

### A6. Fichiers de migration MORTS (7 `CREATE` sans contrepartie live) — à NE PAS rejouer
`generate_ag_document_path`, `get_latest_ag_document`, `register_ag_document`, `remove_ag_milestone`, `trg_ag_documents_create_ged_entry`, `trg_documents_updated_at`, `update_forum_topic_stats`.
- **(d)** présents en migration mais **absents du live** → un replay les recréerait à tort.
- **Verdict : ABANDONNÉ.** Ne pas les porter dans la DB cible.

---

## B. À GARDER FINALEMENT — preuve d'usage trouvée (« faux morts »)

> Ces objets figuraient parmi les « suspects » mais croisent au moins une preuve d'usage. **NE PAS les droper.**

| Objet | Lignes | Preuve d'usage décisive |
|---|---|---|
| `bank_matches` (TABLE) | 0 | **(c/d)** lue par la fonction DB `refresh_bank_movement_status` **et** par les vues `v_bank_movements_overview` + `v_payments_overview` (consommées par la feature `mouvements-bancaires`). 0 ligne = rapprochement pas encore fait sur la boucle d'or, pas une table morte. **GARDER.** |
| `mutation_steps` (TABLE) | 0 | **(b)** `lib/sales/api.ts` (read+write l.235/423) ; **(d)** vue `v_mutation_detail`. Feature mutations = gestionnaire (gardée). **GARDER.** |
| `alur_transfers` (TABLE) | 0 | **(b)** `useALURData.ts` (l.286) ; **(d)** vues `v_alur_fund_summary` + `v_alur_transfers_history`. **GARDER.** |
| `technical_documents` (TABLE) | 0 | **(b)** `useLogbook.ts` l.150. Carnet d'entretien. **GARDER.** |
| `planned_works` (TABLE) | 0 | **(b)** `useLogbook.ts` l.170. **GARDER.** |
| `insurance_policies` (TABLE) | 0 | **(b)** `useLogbook.ts` l.195 + `useAssuranceDetailPage.ts` l.53. **GARDER.** |
| `council_documents` (TABLE) | 0 | **(b)** `useConseilSyndicalPage.ts` l.57 + `lib/council/api.ts` l.395 ; **(c)** edge `council-workflow/index.ts` l.407. **GARDER.** |
| `document_access` (TABLE) | 0 | **(b)** `lib/documents/api.ts` l.580/598 ; **(c)** edge `get_document_url/index.ts` l.115. **GARDER.** |
| `budget_payment_schedules` (TABLE) | 0 | **(b)** `lib/budget/payment-schedules.api.ts` (6 requêtes). **GARDER.** |
| `ag_milestones` (TABLE) | 0 | **(b)** `useAGDelais.ts` l.149 + via RPC `get_ag_milestones`/`save_ag_milestone` (`useAgEnvoiPage.ts`). **GARDER.** |
| `ag_notifications` + `ag_notification_events` | 0 / 0 | **(b)** hook `useAgNotifications.ts` (l.77) ; **(c)** edge `email_webhook/index.ts` l.132 (lit) + l.150 (écrit `events`). « Câble derrière le meuble » : le hook n'est monté sur aucune page MAIS l'edge écrit dedans → **GARDER** jusqu'à refacto du webhook. ⚠️ pas un drop mécanique. |
| `mails` (TABLE) | 0 | **(b)** `useMailbox.ts`, `app/api/mail/{send,inbound}`, `communication/page.tsx`, `communication/mail/page.tsx`. = **messagerie interne (gardée)**, vide mais câblée. **GARDER.** À ne pas confondre avec l'île campagnes (A3). |
| `document_versions` (TABLE) | 0 | **(b)** via vue `v_document_versions` lue par `lib/documents/api.ts` l.408. **GARDER provisoirement** : drop seulement en bloc (table + vue + réécriture `getDocumentVersions`) — sinon casse le front. **Pas un drop sec.** |
| `providers` (13) / `suppliers` (8) | 13 / 8 | Décision user : **FUSIONNER** en une entité tiers. Les deux portent des données → ce n'est PAS un drop mais une migration de fusion. **GARDER (fusionner).** |
| `_rls_state_snapshot` (TABLE) | 69 | Outillage du toggle RLS dev/prod (`table_name, had_rls_enabled, had_force_rls, snapshot_at`). Artefact opérationnel, pas de la donnée métier. **GARDER comme tooling** (à requalifier hors schéma métier), ne pas migrer comme table de domaine. |

---

## Synthèse preuves (live)

- Tables candidates testées : 23 (toutes existent sauf `campaigns`/`campaign_recipients` = inexistantes).
- FK entrantes externes sur les candidats : **aucune** sauf paires internes (`ag_notification_events→ag_notifications`, île mail, self-FK `mails`).
- Aucun appel `.rpc(`/`functions.invoke(` **dynamique** (nom construit) côté front → greps statiques fiables.
- Copros immuables `11111111`/`22222222` : non touchées (lecture seule).
