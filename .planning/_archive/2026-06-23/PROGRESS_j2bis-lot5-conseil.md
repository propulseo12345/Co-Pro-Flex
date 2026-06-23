# PROGRESS — J2-bis lot 5 : Conseil syndical (design figé 2026-06-13, à exécuter après merge #16)

## Découvertes d'audit (≠ plan initial)

- `rapport-cs.service.ts` (662 l.) = **MOCK PUR** : tous les appels `rapports_activite_cs`/
  `sections_rapport_cs`/`annexes_rapport_cs` sont dans des blocs commentés TODO ;
  les rapports vivent en mémoire (perdus au reload). Le drift réel = feature jamais branchée.
- Page liste (`useConseilSyndicalPage`) lit `council_documents` avec une colonne fantôme
  `document_type` (42703 silencieux → liste vide) et mappe des colonnes ANGLAISES
  (period_start, title, status, author_id, content_text).
- Les mappers du service attendent des colonnes FRANÇAISES (periode_debut, titre, statut,
  auteur_id, contenu_brut, valide_par) → **piège EN/FR** ; trancher : table canonique EN.
- MORTS à purger : `lib/council/api.ts` + `useCouncilData` (3 vues v_council_* sans appelant),
  `resolution-cs.service.ts` (0 importeur), export hooks/index.
- `handleCreateRapport` passe `conseilSyndicalId:'cs-1'`, `auteurId:'1'` (mocks) → user réel.

## Cible (migration 0053 + gate)

1. **`rapports_activite_cs`** : id, copro_id (FK cascade), author_id (FK profiles set null),
   period_start/period_end (date NN), title NN, introduction/content/content_text text NN
   default '', status text NN default 'brouillon' CHECK in (brouillon, en_revision, valide,
   publie, archive) [valeurs FR conservées = enum métier UI], ag_id (FK ag_meetings set null),
   resolution_id (FK ag_resolutions set null), validated_by, validated_at, created_at/updated_at
   + trigger set_updated_at.
2. **`sections_rapport_cs`** : id, copro_id, rapport_id (FK cascade), sort_order int NN
   default 0, title NN, content text NN default '', created_at/updated_at.
3. **`annexes_rapport_cs`** : id, copro_id, rapport_id (FK cascade), name NN, description,
   kind text NN CHECK in (document, image, tableau), file_url, file_name, file_size bigint,
   embedded_content text, sort_order int NN default 0, created_at.
4. RLS classe A ×3 (sel: user_has_copro_access ; all: user_is_copro_manager) — V1 gestionnaire ;
   écriture par MEMBRES du CS = à câbler avec le portail (note métier, pas de helper
   user_is_council_member aujourd'hui). + registre 0034 + apply_rls_environment().
5. Gate `gate_0053_conseil_rapports` : contrats stricts ×3, CRUD valeurs (création rapport →
   sections/annexes cascade delete), transitions statut, RLS (membre lit, n'écrit pas ;
   manager écrit) — calque gate_0052.

## Front

- **Réécrire les 14 méthodes** de `rapport-cs.service.ts` en VRAI Supabase (colonnes EN,
  API camelCase externe INCHANGÉE → useRapportCS/page intacts) ; mappers → EN
  (data.period_start…) ; ajouterAnnexe/Section dérivent copro_id du rapport ;
  supprimer le store MOCK_RAPPORTS/generateMockId ; garder genererTexteResolution (pur).
- `useConseilSyndicalPage` : liste ← `rapports_activite_cs` (plus council_documents),
  création avec `auteurId = user.id` réel (+conseilSyndicalId supprimé/ignoré).
- Purges : lib/council/api.ts, useCouncilData, resolution-cs.service, export index.

## Ordre d'exécution

branche `j2bis-lot5-conseil` depuis main APRÈS merge #16 (numérotation 0053 > 0052) →
migration+gate → service → page → purges → tsc/vitest/db:test → PR → revue → merge.
