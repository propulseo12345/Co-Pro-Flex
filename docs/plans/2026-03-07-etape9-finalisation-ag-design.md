# Design — Étape 9 : Finalisation des décisions AG

**Date :** 2026-03-07
**Statut :** Approuvé

---

## Objectif

Créer une page étape 9 `/ag/[id]/finalisation` qui permet de valider et créer concrètement les entités issues des décisions prises en AG (budget, fonds ALUR, conseil syndical, etc.) **avant** l'envoi du PV. L'utilisateur contrôle chaque bloc, édite inline si besoin, et confirme bloc par bloc.

---

## Architecture & flux

```
[Session AG] → [PV étape 8] → [Finalisation étape 9]  ← nouvelle page
                                        │
                          ┌─────────────┼──────────────┐
                          ↓             ↓              ↓
                     Bloc Budget    Bloc ALUR    Bloc Conseil...
                          │
                    [Confirmer] → RPC création → ag_pending_actions.status = 'activated'
                                              ou error → inline error
                          │
                    Tous activés → "Marquer comme terminée" → status = 'pv_generated'
```

**Route :** `/ag/[id]/finalisation`
**Step ID :** `finalisation` (step 9)
**Guard :** accessible si `status IN ('closed', 'pv_generated')`
**Persistance :** `ag_pending_actions` (table existante) — états rechargés au montage

---

## Blocs de validation

### Bloc Budget prévisionnel (`CREATE_BUDGET`)
- **Source données :** `ag_meetings.opening_notes` → JSON → `budgetPostes[]` + `budgetExercice`
- **Champs éditables :** liste des postes (label + montant), exercice
- **Peut ajouter/supprimer des postes** avant confirmation
- **Action :** INSERT `budgets` (`type = 'previsionnel'`, `source_ag_id`, `status = 'validated'`) + INSERT `budget_lines` (un par poste)
- **Erreur typique :** budget déjà existant pour cet exercice → message inline, possibilité de forcer

### Bloc Fonds ALUR (`CREATE_ALUR_FUND`)
- **Source données :** `ag_session_drafts` type `variables` → `montant_fonds_travaux` + `modalites_paiement_fonds`
- **Champs éditables :** montant, modalités de paiement (unique / semestriel / trimestriel)
- **Action :** INSERT dans `budget_expenses` ou table dédiée fonds ALUR

### Bloc Budget travaux (`CREATE_WORK_BUDGET`)
- **Source données :** variables résolution adoptée avec `action_type = 'CREATE_WORK_BUDGET'`
- **Champs éditables :** montant, description
- **Action :** INSERT `budgets` (type `travaux`)

### Bloc Appel exceptionnel (`CREATE_EXCEPTIONAL_CALL`)
- **Source données :** variables résolution
- **Champs éditables :** montant, motif
- **Action :** INSERT appel de fonds

### Bloc Conseil syndical (`ELECT_COUNCIL`)
- **Source données :** résolutions adoptées + désignations session (dropdowns bureau)
- **Champs éditables :** liste membres avec rôle (président, membre, trésorier)
- **Action :** UPDATE `coproprietaires` → rôle conseil syndical

### Bloc Syndic (`APPOINT_SYNDIC`)
- **Source données :** variables résolution (nom_syndic, date_debut, date_fin)
- **Champs éditables :** nom, dates mandat
- **Action :** UPDATE/INSERT contrat syndic

### Bloc Approbation des comptes (`APPROVE_ACCOUNTS`)
- **Source données :** variables résolution
- **Champs éditables :** exercice, montant
- **Action :** marquer comptes comme approuvés

### Bloc Quitus (`GRANT_QUITUS`)
- **Source données :** résolution adoptée (pas de variables)
- **Affichage :** confirmation simple
- **Action :** enregistrer quitus

---

## États des blocs

| État | Visuel | Description |
|------|--------|-------------|
| `pending` | Badge gris | À confirmer |
| `activated` | Badge vert ✅ | Créé avec succès |
| `failed` | Badge rouge ❌ + message | Erreur inline, peut réessayer |
| `skipped` | Badge gris barré | Pas de résolution adoptée pour ce type |

---

## Comportement UX

- Les blocs sans résolution adoptée correspondante ne s'affichent pas
- Chaque bloc peut être confirmé indépendamment des autres
- En cas d'erreur : message inline sur le bloc, bouton "Réessayer"
- Rechargement de page : états rechargés depuis `ag_pending_actions`
- Bouton **"Marquer comme terminée"** : actif uniquement quand tous les blocs visibles sont `activated`
- En cliquant "Marquer comme terminée" → `ag_meetings.status = 'pv_generated'` via RPC `finish_ag_session` (déjà existant, à adapter)

---

## Données techniques

### Tables impliquées
- `ag_meetings.opening_notes` → postes budget étape 1
- `ag_session_drafts` → variables session (montant ALUR, etc.)
- `ag_resolutions` → résolutions adoptées avec `action_type` et `variables`
- `ag_pending_actions` → persistance état des blocs
- `budgets` + `budget_lines` → création budget
- `coproprietaires` → mise à jour conseil syndical

### RPCs à créer
- `create_budget_from_ag(p_ag_id, p_postes jsonb, p_exercice int)` → SECURITY DEFINER
- `create_alur_fund_from_ag(p_ag_id, p_montant numeric, p_modalites text)` → SECURITY DEFINER
- `elect_council_from_ag(p_ag_id, p_membres jsonb)` → SECURITY DEFINER
- Autres blocs : RPCs simples similaires

### Fichiers à créer
- `src/app/(dashboard)/ag/[id]/finalisation/page.tsx`
- `src/features/ag/finalisation/hooks/useFinalisationPage.ts`
- `src/features/ag/finalisation/hooks/useBlocBudget.ts`
- `src/features/ag/finalisation/hooks/useBlocALUR.ts`
- `src/features/ag/finalisation/hooks/useBlocConseil.ts`
- `src/features/ag/finalisation/components/BlocCard.tsx`
- `src/features/ag/finalisation/components/BlocBudget.tsx`
- `src/features/ag/finalisation/components/BlocALUR.tsx`
- `src/features/ag/finalisation/components/BlocConseil.tsx`
- `src/features/ag/finalisation/components/BlocSimple.tsx`
- `src/lib/ag/api/finalisation.api.ts`

### Migrations DB
- RPC `create_budget_from_ag`
- RPC `create_alur_fund_from_ag`
- RPC `elect_council_from_ag`
- Ajouter step 9 dans le stepper AG (STEP_PATHS)
