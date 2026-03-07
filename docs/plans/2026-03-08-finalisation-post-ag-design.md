# Finalisation post-AG — Design complet

> Date: 2026-03-08
> Statut: Approuve
> Scope: Flux complet apres cloture de session AG

---

## Architecture generale

```
Session AG terminee (etape 7)
       |
  prepare_ag_decisions()   <-- scanne resolutions adoptees, cree ag_pending_actions
       |
  Page Finalisation (/ag/[id]/finalisation)
       |
  +--------------------------------------------------+
  |  BlocBudget (CREATE_BUDGET)                      |  S1
  |  Cree budget + budget_lines depuis postes        |
  +------------------------+-------------------------+
                           | debloque
  +--------------------------------------------------+
  |  BlocALUR (CREATE_ALUR_FUND)  [optionnel]        |  S2
  |  Cree budget type 'alur' + 1 ligne               |
  +------------------------+-------------------------+
                           | debloque (budget OK + ALUR OK ou absent)
  +--------------------------------------------------+
  |  BlocAppelsFonds (SCHEDULE_BUDGET_PAYMENTS)      |  S3
  |  Total = budget + ALUR (si present)              |
  |  Repartition par cle de repartition              |
  |  Modalites pre-remplies mais modifiables         |
  +--------------------------------------------------+
  |  Autres blocs (admin, comptable)                 |  S5-S12
  +--------------------------------------------------+
  |  Bouton "Finaliser l'AG"                         |  S13
  +--------------------------------------------------+
```

## Decisions de design

1. **Semi-automatique** — L'utilisateur confirme chaque bloc dans l'ordre, le systeme impose les dependances (blocs grises)
2. **Modalites pre-remplies mais modifiables** — La valeur votee en AG est le defaut, le syndic peut ajuster
3. **ALUR optionnel** — Si pas de resolution ALUR adoptee, appels bases uniquement sur le budget
4. **Repartition par cle** — Chaque poste budgetaire utilise sa propre cle de repartition pour les appels
5. **Appels de fonds combines** — Un seul jeu d'appels = budget previsionnel + fonds ALUR

## Regles d'ordonnancement

| Bloc | Prerequis | Grise si |
|------|-----------|----------|
| BlocBudget | Aucun | Jamais |
| BlocALUR | Aucun | Jamais |
| BlocAppelsFonds | Budget active + (ALUR active OU pas de resolution ALUR) | Prerequis non remplis |
| Blocs admin | Aucun | Jamais |

## RPCs existantes

| RPC | Statut | Action reelle |
|-----|--------|---------------|
| `prepare_ag_decisions` | OK | Cree ag_pending_actions depuis resolutions adoptees |
| `get_ag_pending_actions` | OK | Liste les actions pour la page finalisation |
| `create_budget_from_ag` | OK | Cree budget + budget_lines, marque action activated |
| `create_alur_fund_from_ag` | STUB | Juste marque activated, pas de budget reel |
| `generate_calls_from_ag_payload` | PARTIEL | Cree calls mais repartition tantiemes generaux uniquement |
| `mark_ag_action_activated` | STUB | Marque activated sans action reelle |
| `activate_ag_decisions` | OK | Batch activate (appelle generate_calls) |
| `markAgFinalized` | OK | Met ag_meetings.status = 'finalized' |

---

## Plan de sprints

### Sprints financiers (priorite 1)

#### S1 — Budget E2E (test & fix)
- Verifier create_budget_from_ag E2E avec postes enrichis (account_id + repartition_key_id)
- Fix opening_notes NULL : sauvegarder metadata des la creation (useAgDraftAutoCreate)
- Tester flux complet : creer AG > postes > session > vote > finalisation > budget en DB
- Valider que budget_lines ont les bons account_id et repartition_key_id

#### S2 — Fonds ALUR reel
- Modifier RPC create_alur_fund_from_ag :
  - Creer budget (budget_type = 'alur', source_ag_id)
  - Creer 1 budget_line (montant vote, compte 105, cle generale)
  - Marquer action activated
- Frontend BlocALUR : deja fonctionnel, juste brancher sur nouvelle RPC

#### S3 — Appels de fonds combines
- Nouveau composant BlocAppelsFonds (remplace BlocSimple pour SCHEDULE_BUDGET_PAYMENTS)
- Affiche : total (budget + ALUR), modalites (dropdown modifiable), apercu des appels
- Modifier generate_calls_from_ag_payload :
  - Combiner budget + ALUR du meme AG
  - Repartir par cle de repartition (JOIN budget_lines > repartition_keys > lots)
  - Creer call_for_funds_lines avec montant correct par lot/cle
- Supprimer le BlocSimple pour SCHEDULE_ALUR_PAYMENTS (fusionne dans BlocAppelsFonds)

#### S4 — Ordonnancement & polish financier
- Grisage conditionnel des blocs (dependances)
- Indicateur de progression (X/Y actions completees)
- Cas "ALUR absent" (pas de resolution votee > appels bases sur budget seul)
- Tests E2E du flux complet

### Sprints comptables (priorite 2)

#### S5 — Approbation des comptes
- APPROVE_ACCOUNTS : cloturer exercice N-1
- Passer accounting_period.status = 'closed'
- Passer budget correspondant en status = 'closed'

#### S6 — Quitus
- GRANT_QUITUS : marquer quitus accorde
- Historique dans ag_pending_actions.result_data

#### S7 — Budget travaux
- CREATE_WORK_BUDGET : creer budget type 'works'
- Postes travaux depuis variables resolution
- Lien vers appel exceptionnel (S8)

#### S8 — Appel exceptionnel
- CREATE_EXCEPTIONAL_CALL : appel hors budget courant
- Montant + echeancier depuis resolution
- Repartition par cle specifiee

### Sprints administratifs (priorite 3)

#### S9 — Nomination syndic
- APPOINT_SYNDIC : mettre a jour infos syndic sur la copro
- Contrat syndic (dates, honoraires) depuis variables

#### S10 — Election conseil syndical
- ELECT_COUNCIL : desactiver anciens membres, creer nouveaux
- RPC elect_council_from_ag existe deja

#### S11 — Gestion contrats
- MANAGE_CONTRACT : renouveler/resilier contrat prestataire
- Lien vers le contrat cible (target_id)

#### S12 — Designation bureau
- DESIGNATE_BUREAU : president, scrutateurs sur ag_meetings
- Deja gere en session, juste confirmer

### Sprint transversal (priorite 4)

#### S13 — Finalisation globale
- Bouton "Tout finaliser" (desactive tant que toutes actions non activees)
- Archivage AG (status = 'finalized')
- Notifications aux coproprietaires (resultats AG)
- PDF recapitulatif des decisions
