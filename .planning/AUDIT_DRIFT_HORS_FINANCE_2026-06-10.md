# Audit drift front ↔ base — HORS finance (2026-06-10, sweep autonome)

> Méthode : grep de **tous** les `.from('X')` / `.rpc('X')` dans `src/` (TS/TSX), diffés contre l'inventaire réel de la base locale (116 tables/vues, 183 fonctions). Liste les références du front vers des objets **inexistants**. Lecture seule, zéro modif.
>
> ⚠️ **À trier, pas à prendre au pied de la lettre** : certains modules sont volontairement non câblés (`*_USE_SUPABASE=false` : dashboard/budget/ventes) → leurs vues « manquantes » sont *attendues*. D'autres réfs peuvent vivre dans du code mort/mock. Ce doc = **carte de drift**, à valider module par module.

## Verdict d'ensemble

- **Finance = quasi propre** : seul `post_call_for_funds` (le `createCall` différé F4) traîne. Tout le reste de la finance pointe sur des vues/RPC réelles. ✅
- **Tous les autres modules ont un drift majeur** : le front a été écrit contre l'ANCIEN schéma ; la reconstruction (0001→0043) n'a pas (encore) recréé ces vues/RPC. C'est le gros du travail « câbler les modules à la base reconstruite » avant une bêta complète.

## Drift par module (front → objet base inexistant)

### AG (le plus touché après finance)
- Vues : `v_ag_overview`, `v_ag_attendance_summary`, `v_ag_correspondence_status`, `v_ag_documents`, `v_ag_drafts_progress`, `v_ag_notification_stats`, `v_ag_votes_detailed`.
- RPC : `delete_ag_draft`, `get_ag_milestones`/`save_ag_milestone`, `get_ag_pouvoirs`/`save_ag_pouvoir`/`update_ag_pouvoir_justificatif`/`delete_ag_pouvoir`, `get_ag_envoi_choices`/`save_ag_envoi_choices`.
- → **Pouvoirs, jalons (milestones), choix d'envoi, brouillons** : pans entiers non branchés sur la base cible.

### Communication / mail
- Tables : `mail_campaigns`, `mail_folders`, `mail_inbox`, `mail_recipients`, `mail_templates`.
- Vues : `v_mail_campaigns_overview`, `v_mail_inbox_overview`, `v_conversations_overview`, `v_conversation_messages`, `v_wall_feed`, `v_events_overview`.
- RPC : `generate_campaign_recipients`.

### Documents / GED
- Tables : `document_access`, `document_links`, `dossiers`, `ged`, `pv_templates`.
- Vues : `v_documents_by_category`, `v_documents_expiring`, `v_documents_stats`, `v_documents_with_folder`, `v_folders_with_counts`, `v_recent_documents`.

### Maintenance / prestataires
- Tables/vues : `providers`, `v_providers_overview`, `v_contracts_overview`, `v_contracts_alerts`, `v_logbook_overview`, `v_logbook_alerts`, `v_service_orders_overview`, `v_maintenance_stats`.
- NB : `providers` est probablement le même cas que `suppliers` → fusionné dans **`tiers`** (`is_provider=true`). À rebrancher comme les fournisseurs.

### Conseil syndical (CS)
- Tables : `annexes_rapport_cs`, `rapports_activite_cs`, `sections_rapport_cs`.
- Vues : `v_council_members`, `v_council_decisions_overview`, `v_council_documents_overview`.

### Dashboard (module non câblé — drift ATTENDU)
- `v_dashboard_kpis` (la base a la **fonction** `fn_dashboard_kpis` → adapter `.from(view)` en `.rpc(fn)`), `v_dashboard_recent_activity`, `v_dashboard_todos`.

### Mutations
- `v_mutations_overview` (la base a `v_mutation_detail` → vue d'aperçu à créer ou requête à adapter).

### Divers
- `increment_template_usage` (banque de résolutions AG — compteur d'usage non posé).
- `v_finance_integrity_issues` → remplacé par la **fonction** `audit_finance_integrity` (adapter l'appel).
- `post_call_for_funds` → `createCall`, différé F4 (cf. `RESULTATS_FINANCE_2026-06-10.md`).

## Recommandation pour la roadmap

Ce drift hors-finance **n'empêche pas une bêta gestionnaire centrée finance + AG votes**, mais bloque les modules communication / GED / maintenance / CS. Deux stratégies :
1. **Bêta gestionnaire minimale** : ne câbler que finance + AG (cœur), masquer/labelliser « à venir » les modules driftés → bêta plus vite.
2. **Recâblage complet** : recréer les vues/RPC manquantes module par module (gros chantier, ~80 objets) avant bêta.

→ Reco : **stratégie 1** pour la bêta, stratégie 2 en continu après. À chaque module, même méthode que la finance : recréer les vues d'agrégat + rebrancher le front, et **prouver par un gate**.

## Reproduire ce sweep
```bash
# tables+vues réelles
docker exec supabase_db_Co-Pro-Flex psql -U postgres -d postgres -tA -c \
  "select table_name from information_schema.tables where table_schema='public' union select table_name from information_schema.views where table_schema='public';" | tr -d ' ' | sort -u > /tmp/db.txt
# refs front
grep -rohE "\.from\(\s*['\"][a-z_0-9]+['\"]" src --include=*.ts --include=*.tsx | grep -oE "[a-z_0-9]+" | sort -u > /tmp/ref.txt
comm -23 /tmp/ref.txt /tmp/db.txt   # (filtrer le mot-clé 'from')
```
