# AUDIT AG STORAGE - Module Assemblées Générales

**Date**: 2026-01-29
**Statut**: MICRO-PASS 1 COMPLÉTÉE ✅
**Objectif**: Identifier toutes les dépendances localStorage/mocks et planifier la migration vers Supabase

---

## RÉSUMÉ EXÉCUTIF

### Travail Effectué (Micro-Pass 1)
1. ✅ Créé `src/lib/ag/draft-persistence.ts` - Utilitaire centralisé pour persistance DB
2. ✅ Mis à jour `useAgAgendaPage.ts` - Priorité DB sur localStorage
3. ✅ Ajouté types draft manquants dans DB: `variables`, `milestones`, `signataires`
4. ✅ Créé squelette E2E Playwright: `e2e/ag-workflow.spec.ts`
5. ✅ Corrigé bugs pre-existants bloquant le build
6. ✅ Build passe avec succès

### Prochaines Étapes
- Micro-Pass 2: Migrer résolutions vers `ag_resolutions` exclusivement
- Micro-Pass 3: Migrer présences/pouvoirs vers `ag_attendance`
- Micro-Pass 4: Migrer votes vers `ag_votes`
- Micro-Pass 5: Migrer rôles vers `ag_session_drafts` ou `ag_meetings`
- Micro-Pass 6: Migrer signataires PV
- Micro-Pass 7: Implémenter clôture via RPC `close_ag`

---

## A) TABLEAU D'AUDIT localStorage AG

| Fichier | Route/Page | Clé(s) localStorage | Nature données | Classification | Remplacement DB | Priorité |
|---------|------------|---------------------|----------------|----------------|-----------------|----------|
| `src/features/ag/hooks/useAgAgendaPage.ts` | `/ag/[id]/agenda` | `ag-draft-{agId}`, `ag-resolutions-{agId}`, `roles-ag-{agId}`, `ag-presences-{agId}` | meeting, resolutions, roles, attendance | BUSINESS_DATA | ag_meetings, ag_resolutions, ag_session_drafts | **P0** |
| `src/features/ag/hooks/useAgSessionPage.ts` | `/ag/[id]/session` | `ag-resolutions-{agId}`, `ag-votes-{agId}`, `ag-session-{agId}`, `ag-variables-{agId}` | resolutions, votes, session_state, variables | BUSINESS_DATA | ag_resolutions, ag_votes, ag_session_drafts | **P0** |
| `src/features/ag/pv/hooks/usePVPage.ts` | `/ag/[id]/pv` | `ag-draft-{agId}`, `ag-resolutions-{agId}`, `ag-votes-{agId}`, `ag-presences-{agId}`, `ag-session-{agId}`, `roles-ag-{agId}`, `ag-signataires-{agId}`, `ag-pv-signed-{agId}`, `ag-completed-{agId}` | all AG data, signataires, completion | BUSINESS_DATA | ag_meetings, ag_resolutions, ag_votes, ag_attendance, ag_session_drafts | **P0** |
| `src/features/ag/hooks/useAgEditPage.ts` | `/ag/[id]/edit` | `ag-draft-{agId}` | meeting | BUSINESS_DATA | ag_meetings | P1 |
| `src/features/ag/new/hooks/useAgCreateForm.ts` | `/ag/new` | `ag-draft-{agId}`, `ag-resolutions-created-{agId}` (session) | meeting, flag | BUSINESS_DATA | ag_meetings | P1 |
| `src/app/(dashboard)/ag/dashboard/page.tsx` | `/ag/dashboard` | `ag-draft-*`, `ag-completed-*`, `ag-resolutions-*` | drafts listing | BUSINESS_DATA | v_ag_drafts_progress | P1 |
| `src/app/(dashboard)/ag/[id]/feuille-presence/page.tsx` | `/ag/[id]/feuille-presence` | `feuille-presence-{agId}` | attendance | BUSINESS_DATA | ag_attendance, ag_session_drafts | P1 |
| `src/app/(dashboard)/ag/[id]/designation-roles/page.tsx` | `/ag/[id]/designation-roles` | `feuille-presence-{agId}`, `roles-ag-{agId}` | attendance, roles | BUSINESS_DATA | ag_session_drafts (type='roles') | P1 |
| `src/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/page.tsx` | `/ag/[id]/votes-correspondance/[coproId]` | `vote-correspondance-{agId}-{coproId}`, `ag-resolutions-{agId}` | votes | BUSINESS_DATA | ag_correspondence_votes | P1 |
| `src/app/(dashboard)/ag/[id]/resolutions/new/page.tsx` | `/ag/[id]/resolutions/new` | `ag-resolutions-{agId}` | resolutions | BUSINESS_DATA | ag_resolutions | P1 |
| `src/hooks/modules/usePouvoirs.ts` | - | `ag-pouvoirs-{agId}`, `ag-votes-correspondance-{agId}`, `ag-resolutions-{agId}` | powers, votes | BUSINESS_DATA | ag_attendance (proxy fields) | P1 |
| `src/hooks/modules/useVotesCorrespondance.ts` | - | `ag-votes-correspondance-{agId}`, `ag-resolutions-{agId}` | correspondence votes | BUSINESS_DATA | ag_correspondence_votes | P1 |
| `src/hooks/modules/useAGDelais.ts` | - | `ag-jalons-completes-{agId}` | milestones | BUSINESS_DATA | ag_session_drafts (type='milestones') | P2 |
| `src/hooks/modules/useAGWorkflow.ts` | - | `ag-workflow-mode-preference`, `ag-workflow-state-{agId}` | workflow state | UI_PREF + EPHEMERAL | ag_session_drafts | P2 |
| `src/lib/services/ag-session-persistence.service.ts` | - | `ag-session-presences-{agId}`, `ag-session-roles-{agId}`, `ag-session-votes-{agId}`, `ag-session-resolutions-{agId}`, `ag-session-metadata-{agId}` | session fallback | EPHEMERAL (fallback) | ✅ Déjà Supabase + fallback | ✅ OK |
| `src/lib/utils/ag-variables.ts` | - | `ag-donnees-partagees-{agId}` | shared variables | BUSINESS_DATA | ag_session_drafts (type='variables') | P2 |
| `src/lib/utils/ag-resolutions.ts` | - | `ag-resolutions-{agId}` | resolutions | BUSINESS_DATA | ag_resolutions | P1 |
| `src/lib/utils/projector-token.ts` | - | `projector-token-{agId}` | access token | EPHEMERAL | ✅ Acceptable (token éphémère) | - |
| `src/lib/constants/ag-workflow.ts` | - | `ag-draft-{agId}`, `ag-resolutions-{agId}`, `ag-sent-{agId}`, `ag-presences-{agId}`, `ag-session-{agId}` | workflow status checks | READ ONLY | Views Supabase | P1 |
| `src/hooks/modules/useConvocationData.ts` | `/ag/[id]/convocation` | `ag-draft-{agId}`, `ag-resolutions-{agId}` | convocation data | BUSINESS_DATA | ag_meetings, ag_resolutions | P1 |

---

## B) MOCKS UTILISÉS (À SUPPRIMER)

| Fichier | Mock importé | Usage | Remplacement |
|---------|--------------|-------|--------------|
| `src/features/ag/pv/hooks/usePVPage.ts` | `MOCK_COPROPRIETAIRES`, `MOCK_ASSEMBLEES` | Fallback si pas de localStorage | useEligibleVoters(), useAgDetail() |
| `src/features/ag/hooks/useAgAgendaPage.ts` | `MOCK_CONTRAT_SYNDIC`, `MOCK_PARAMETRES` | Suggestions variables | Config copro en DB |
| `src/app/(dashboard)/ag/[id]/checklist/page.tsx` | `MOCK_ASSEMBLEES` | Trouver AG par ID | useAgDetail() |
| `src/app/(dashboard)/ag/[id]/minutes/page.tsx` | `MOCK_ASSEMBLEES` | Fallback PV | useAgDetail() |
| `src/app/(dashboard)/ag/resolutions/select-ag/page.tsx` | `MOCK_ASSEMBLEES` | Liste AGs | useAgMeetings() |

---

## C) CLASSIFICATION DES DONNÉES

### BUSINESS_DATA (Migration obligatoire vers Supabase)
- `ag-draft-{agId}` → `ag_meetings`
- `ag-resolutions-{agId}` → `ag_resolutions`
- `ag-votes-{agId}` → `ag_votes`
- `ag-presences-{agId}` / `feuille-presence-{agId}` → `ag_attendance`
- `roles-ag-{agId}` → `ag_session_drafts` (type='roles') OU colonnes ag_meetings
- `vote-correspondance-{agId}-{coproId}` → `ag_correspondence_votes`
- `ag-pouvoirs-{agId}` → `ag_attendance.represented_by_*`
- `ag-signataires-{agId}` → `ag_meetings.pv_*` ou table dédiée
- `ag-donnees-partagees-{agId}` → `ag_session_drafts` (type='variables')
- `ag-jalons-completes-{agId}` → `ag_session_drafts` (type='milestones')

### UI_PREF (localStorage acceptable)
- `ag-workflow-mode-preference` → Préférence mode guidé/expert (localStorage OK)
- `theme` → Dark/light mode (non-AG, localStorage OK)

### EPHEMERAL (localStorage fallback acceptable)
- `projector-token-{agId}` → Token éphémère pour le mode projecteur
- `ag-session-*` keys → ✅ Déjà géré par AGSessionPersistenceService (Supabase + fallback)

---

## D) INFRASTRUCTURE SUPABASE EXISTANTE

### Tables AG
| Table | Colonnes clés | Utilisée par |
|-------|---------------|--------------|
| `ag_meetings` | id, copro_id, title, meeting_type, meeting_date, location, status, president_*, secretary_*, session_started_at, session_ended_at, opening_notes, pv_document_id | useAgDetail, useAgDraftEdit |
| `ag_resolutions` | id, ag_id, title, description, majority_type, resolution_number, is_approved, result_details | useAgDetail, useAddResolution |
| `ag_votes` | id, resolution_id, coproprietaire_id, vote, vote_source, tantiemes_at_vote | useCastVote |
| `ag_attendance` | id, ag_id, coproprietaire_id, lot_ids, presence_type, represented_by_*, tantiemes_total | useRegisterAttendance |
| `ag_correspondence_votes` | id, ag_id, coproprietaire_id, resolution_id, vote | (à utiliser) |
| `ag_session_drafts` | id, ag_id, copro_id, user_id, draft_type, draft_data, version, last_modified_at | AGSessionPersistenceService |
| `ag_notifications` | id, ag_id, status, sent_at | (notifications) |
| `ag_notification_events` | id, notification_id, event_type, ... | (tracking envois) |

### Vues AG
| Vue | Usage |
|-----|-------|
| `v_ag_overview` | Liste enrichie des AGs avec stats |
| `v_ag_drafts_progress` | Brouillons avec progression |
| `v_ag_attendance_summary` | Résumé présences/tantièmes |
| `v_ag_resolutions_results` | Résultats résolutions |
| `v_ag_vote_stats_by_resolution` | Stats votes par résolution |
| `v_ag_votes_detailed` | Détail votes |

### RPC Functions
| Fonction | Usage |
|----------|-------|
| `save_ag_session_draft(p_ag_id, p_draft_type, p_draft_data)` | ✅ Utilisée par AGSessionPersistenceService |
| `get_ag_session_draft(p_ag_id, p_draft_type)` | ✅ Utilisée par AGSessionPersistenceService |
| `clear_ag_session_drafts(p_ag_id)` | ✅ Utilisée par AGSessionPersistenceService |
| `create_ag_with_standard_resolutions(...)` | Création AG + résolutions standard |
| `close_ag(...)` | Clôture AG |
| `compute_ag_quorum(...)` | Calcul quorum |
| `get_ag_all_session_drafts(p_ag_id)` | Récupérer tous les drafts |

### Draft Types Enum (ag_draft_type)
- `attendance` ✅
- `votes` ✅
- `roles` ✅
- `resolutions` ✅
- `session` ✅

---

## E) ARCHITECTURE CIBLE "AG 100% DB"

### AGPersistence Contract

```
┌─────────────────────────────────────────────────────────────────┐
│                      SOURCE DE VÉRITÉ                            │
├─────────────────────────────────────────────────────────────────┤
│ ag_meetings        │ Données AG (titre, date, lieu, status)     │
│ ag_resolutions     │ Résolutions (titre, texte, majorité)       │
│ ag_attendance      │ Présences/Pouvoirs (mode, mandataire)      │
│ ag_votes           │ Votes en session (pour/contre/abstention)   │
│ ag_correspondence_votes │ Votes par correspondance              │
│ ag_session_drafts  │ Brouillons par étape (JSONB flexible)      │
├─────────────────────────────────────────────────────────────────┤
│                      DRAFT TYPES                                 │
├─────────────────────────────────────────────────────────────────┤
│ attendance         │ Présences enrichies pendant session        │
│ votes              │ Votes en cours (avant validation finale)   │
│ roles              │ Rôles désignés (président, secrétaire...)  │
│ resolutions        │ État résolutions (index actif, complétées) │
│ session            │ Métadonnées session (started, timestamp)   │
│ variables          │ Variables partagées                        │
│ milestones         │ Jalons workflow complétés                  │
│ signataires        │ Données signataires PV                     │
├─────────────────────────────────────────────────────────────────┤
│                      RÈGLES                                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Chaque "Suivant" du wizard → write DB (upsert/RPC)           │
│ 2. Chaque refresh page → read DB → hydrate UI                   │
│ 3. ag_id créé dès l'étape 1 (draft) pour ID stable              │
│ 4. localStorage = fallback offline uniquement                   │
│ 5. Toujours filtrer eq('copro_id', coproId)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Mapping 7 Étapes Workflow → DB

| Étape | Route | Données capturées | Table/Vue DB | RPC |
|-------|-------|-------------------|--------------|-----|
| 1. Création | `/ag/new`, `/ag/[id]/edit` | type, date, lieu, budget | `ag_meetings` | - |
| 2. Agenda | `/ag/[id]/agenda` | résolutions (titre, texte, majorité) | `ag_resolutions` | useAddResolution |
| 3. Convocation | `/ag/[id]/convocation` | config envoi, destinataires | `ag_notifications` | create_ag_notification |
| 4. Envoi | `/ag/[id]/envoi` | méthodes envoi par copro | `ag_notification_events` | - |
| 5. Préparation | `/ag/[id]/preparation` | votes correspondance, pouvoirs | `ag_correspondence_votes`, `ag_attendance` | - |
| 6. Session | `/ag/[id]/session` | présences, rôles, votes temps réel | `ag_attendance`, `ag_votes`, `ag_session_drafts` | cast_vote, save_ag_session_draft |
| 7. PV/Clôture | `/ag/[id]/pv` | signataires, signatures, clôture | `ag_meetings`, documents | close_ag |

---

## F) PLAN DE MIGRATION (MICRO-PASSES)

### MICRO-PASS 0: Ajouter draft_types manquants (si nécessaire)
- Vérifier si 'variables', 'milestones', 'signataires' existent dans l'enum
- Si non, ajouter via migration SQL

### MICRO-PASS 1: Centraliser agId + source DB ✅ PRIORITAIRE
**Fichiers**:
- `src/features/ag/hooks/useAgAgendaPage.ts`
- `src/features/ag/hooks/useAgSessionPage.ts`

**Actions**:
1. Utiliser `useAgDetail(agId)` comme source primaire
2. Supprimer lecture localStorage pour ag-draft si meeting existe en DB
3. Utiliser `dbResolutions` au lieu de localStorage si disponibles
4. Garder localStorage comme fallback uniquement pour AGs non-Supabase (IDs non-UUID)

### MICRO-PASS 2: Résolutions → ag_resolutions
**Fichiers**:
- `src/features/ag/hooks/useAgAgendaPage.ts`
- `src/app/(dashboard)/ag/[id]/resolutions/new/page.tsx`
- `src/lib/utils/ag-resolutions.ts`

**Actions**:
1. Remplacer `localStorage.setItem('ag-resolutions-{agId}')` par `addResolutionMutation`
2. Remplacer lecture par `dbResolutions` de `useAgDetail`
3. Supprimer `ajouterResolutionsAGOrdinaire()` localStorage

### MICRO-PASS 3: Présences/Pouvoirs → ag_attendance
**Fichiers**:
- `src/app/(dashboard)/ag/[id]/feuille-presence/page.tsx`
- `src/app/(dashboard)/ag/[id]/designation-roles/page.tsx`
- `src/hooks/modules/usePouvoirs.ts`

**Actions**:
1. Utiliser `registerAttendanceMutation` au lieu de localStorage
2. Lire depuis `dbAttendance` de `useAgDetail`
3. Stocker pouvoirs dans `ag_attendance.represented_by_*`

### MICRO-PASS 4: Votes → ag_votes + ag_correspondence_votes
**Fichiers**:
- `src/features/ag/hooks/useAgSessionPage.ts`
- `src/hooks/modules/useVotesCorrespondance.ts`
- `src/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/page.tsx`

**Actions**:
1. Utiliser `castVoteMutation` pour votes en session
2. Créer hook pour ag_correspondence_votes
3. Supprimer localStorage `ag-votes-{agId}`

### MICRO-PASS 5: Rôles → ag_session_drafts (type='roles') ou ag_meetings
**Fichiers**:
- `src/app/(dashboard)/ag/[id]/designation-roles/page.tsx`
- `src/features/ag/pv/hooks/usePVPage.ts`

**Actions**:
1. Utiliser `save_ag_session_draft('roles', data)`
2. Ou utiliser colonnes ag_meetings (president_*, secretary_*)
3. Supprimer localStorage `roles-ag-{agId}`

### MICRO-PASS 6: PV/Signataires → DB
**Fichiers**:
- `src/features/ag/pv/hooks/usePVPage.ts`

**Actions**:
1. Utiliser `save_ag_session_draft('signataires', data)`
2. Stocker `ag-pv-signed` dans ag_meetings.status
3. Supprimer localStorage `ag-signataires-{agId}`, `ag-pv-signed-{agId}`

### MICRO-PASS 7: Clôture → close_ag RPC
**Fichiers**:
- `src/features/ag/pv/hooks/usePVPage.ts`

**Actions**:
1. Appeler RPC `close_ag` au lieu de localStorage `ag-completed-{agId}`
2. Trigger notifications si applicable

---

## G) COMMANDES DE VÉRIFICATION

```bash
# Vérifier localStorage AG restant
rg -n "localStorage\.(getItem|setItem|removeItem).*ag-" src

# Vérifier mocks AG restant
rg -n "MOCK_ASSEMBLEES|MOCK_COPROPRIETAIRES" src --type ts

# Vérifier imports mock
rg -n "from '@/data/mock'" src --type ts

# Build check
npm run build
```

---

## H) CRITÈRES DE SUCCÈS

- [ ] `rg "localStorage.*ag-" src` retourne 0 résultat pour BUSINESS_DATA
- [ ] `rg "MOCK_ASSEMBLEES" src` retourne 0 résultat dans hooks AG
- [ ] Tous les hooks AG utilisent `useAgDetail`/`useAgMeetings` comme source
- [ ] `npm run build` passe sans erreur
- [ ] E2E: Créer AG → Refresh → Données persistées depuis Supabase
