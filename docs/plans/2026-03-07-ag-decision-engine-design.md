# AG Decision Engine — Design Document

Date: 2026-03-07

## Objectif

Automatiser la creation des entites metier (budgets, appels de fonds, contrats, conseil syndical, etc.) a partir des resolutions votees en AG. Les decisions de l'AG sont la source de verite pour toute la gestion de l'annee.

## Architecture generale

Flux en deux temps :

1. **Cloture AG (etape 8)** : validation des variables + creation des entites en brouillon
2. **Envoi du PV** : activation des brouillons (statuts definitifs)

```
Session AG -> Cloture (etape 8)
                |-- Validation : variables completes ?
                |   NON -> formulaire inline pour completer
                |   OUI -> ok
                |-- Preparation : creer les entites en brouillon
                |   |-- budgets (status: 'draft_from_ag')
                |   |-- call_for_funds (status: 'draft_from_ag')
                |   |-- contracts (status: 'draft_from_ag')
                |   |-- council_members (status: 'pending_activation')
                |   |-- ag_meetings (copro_ids bureau)
                |-- Recapitulatif affiche au gestionnaire

Envoi PV -> Activation
                |-- budgets -> status: 'active'
                |-- call_for_funds -> status: 'pending'
                |-- contracts -> status: 'active'
                |-- council_members -> status: 'active'
                |-- exercice comptable -> cloture
```

## Champ action_type

Nouveau champ `action_type` (TEXT, nullable) sur `ag_resolutions`. Auto-rempli depuis le template a la creation de la resolution.

| action_type | Resolutions | Entite creee | Variables requises |
|---|---|---|---|
| APPROVE_ACCOUNTS | Approbation des comptes (N+1 et N+2) | Cloture exercice + budget si N+2 | montant, date_debut, date_fin |
| CREATE_BUDGET | Approbation budget previsionnel | budgets + budget_lines | montant, date_debut, date_fin |
| SCHEDULE_BUDGET_PAYMENTS | Calendrier financement budget | call_for_funds | modalites_paiement_budget, dates_echeances_budget |
| CREATE_ALUR_FUND | Fonds travaux ALUR | budgets (type ALUR) + call_for_funds | montant, pourcentage |
| SCHEDULE_ALUR_PAYMENTS | Calendrier financement fonds travaux | call_for_funds | modalites_paiement, dates_echeances |
| CREATE_WORK_BUDGET | Vote de travaux / travaux + honoraires | budgets (type travaux) + call_for_funds | montant, description_travaux |
| CREATE_EXCEPTIONAL_CALL | Appel de fonds exceptionnel | call_for_funds | montant, motif |
| APPOINT_SYNDIC | Nomination/renouvellement syndic | Mise a jour copropriete | nom_syndic, date_debut, date_fin, honoraires |
| ELECT_COUNCIL | Election conseil syndical | council_members | nom (via copro_id) |
| MANAGE_CONTRACT | Souscription/renouvellement/resiliation | contracts | nom_prestataire, montant, duree |
| DESIGNATE_BUREAU | Designation president/secretaire/scrutateur | ag_meetings (copro_ids) | nom (via copro_id) |
| GRANT_QUITUS | Quitus au syndic | Flag sur exercice | date_debut, date_fin |

## Table ag_pending_actions

Nouvelle table intermediaire pour le suivi des actions :

```sql
CREATE TABLE ag_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id),
  resolution_id UUID NOT NULL REFERENCES ag_resolutions(id),
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | activated | failed
  error_message TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Etape 8 — Recapitulatif de cloture

Avant le bouton "Cloturer l'AG" :

1. Liste des resolutions adoptees avec leur action_type
2. Indicateur par resolution : complet ou variables manquantes
3. Variables manquantes editables inline (memes composants VariableEditor, mode compact)
4. Bouton "Cloturer l'AG" grise tant qu'il reste des variables manquantes
5. Au clic, appel a `prepare_ag_decisions` qui cree les brouillons + lignes dans ag_pending_actions

## Activation a l'envoi du PV

1. Appel a `activate_ag_decisions(p_ag_id)`
2. Parcourt `ag_pending_actions` (status = 'pending')
3. Active chaque entite (mise a jour du statut)
4. Si erreur : status = 'failed' + error_message, les autres continuent
5. Recapitulatif affiche : "X actions activees, Y en erreur"

## Bureau — Stockage des copro_ids

Nouvelles colonnes sur ag_meetings :

```sql
ALTER TABLE ag_meetings ADD COLUMN president_copro_id UUID REFERENCES coproprietaires(id);
ALTER TABLE ag_meetings ADD COLUMN secretary_copro_id UUID REFERENCES coproprietaires(id);
ALTER TABLE ag_meetings ADD COLUMN scrutineer1_copro_id UUID REFERENCES coproprietaires(id);
```

On conserve president_name, secretary_name, scrutineer1_name en cache denormalise (remplis automatiquement depuis le copro_id).

Flux :
- Session AG : dropdown selectionne un copro -> sauvegarde copro_id + nom dans ag_meetings
- Page PV : auto-fill lit le copro_id, join vers coproprietaires pour email, telephone
- Signature : champs pre-remplis avec toutes les infos

## Dashboard — AG archivees

Nouvelle section dans le dashboard AG avec deux onglets :

- **AG en cours** : AG draft / in_progress avec etape courante
- **AG passees** : AG closed avec recap des actions (activees/en attente/echouees), lien PV, lien entites creees

## Decisions techniques

- Blocage a la cloture si variables manquantes (pas de brouillons incomplets)
- Edition inline des variables manquantes a l'etape 8 (pas besoin de revenir aux resolutions)
- action_type auto-rempli depuis le template, modifiable pour resolutions custom
- copro_id stocke pour le bureau (+ nom en cache), join pour infos completes
- Deux temps : brouillon a la cloture, activation a l'envoi du PV
- Table ag_pending_actions pour tracer et debugger les actions
