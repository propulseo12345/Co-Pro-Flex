# Échéancier prestataire — Budget travaux

**Date** : 2026-03-15
**Statut** : Approuvé
**Scope** : Gestion financière uniquement (le suivi physique chantier sera dans la partie Travaux)

---

## Contexte

Les budgets travaux en copropriété nécessitent un échéancier de paiement prestataire avec acomptes progressifs. Actuellement, la modale TravauxDetail affiche 4 onglets vides (historique, étapes, prestataires, documents) car aucune donnée n'est stockée en DB. Les devis uploadés à la création ne sont pas persistés.

## Objectif

Permettre au syndic de :
1. Configurer un échéancier d'acomptes (templates + personnalisé) à la création du budget travaux
2. Suivre les paiements phase par phase dans un tableau compact
3. Lier chaque phase à une facture (GED) et un ordre de service
4. Gérer la retenue de garantie (5%, bloquée 1 an)

---

## Modèle de données

### Nouvelle table : `budget_payment_schedules`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| copro_id | uuid | FK → copros ON DELETE CASCADE, NOT NULL | Pour RLS |
| budget_id | uuid | FK → budgets ON DELETE CASCADE, NOT NULL | Budget travaux parent |
| phase_number | int | NOT NULL | Ordre d'affichage (1, 2, 3...) |
| label | text | NOT NULL | "Signature contrat", "Démarrage travaux"... |
| percentage | numeric(5,2) | NOT NULL | % du montant total du budget |
| amount | numeric(12,2) | NOT NULL | Montant calculé = percentage × montant total / 100 |
| due_date | date | | Date d'échéance prévue |
| status | payment_phase_status | NOT NULL, default 'pending' | |
| paid_date | date | | Date de paiement effectif |
| invoice_ref | text | | Référence facture libre |
| document_id | uuid | FK → documents ON DELETE SET NULL | Facture/document lié dans la GED |
| service_order_id | uuid | FK → service_orders ON DELETE SET NULL | Ordre de service lié |
| is_retention | boolean | NOT NULL, default false | true = retenue de garantie |
| retention_release_date | date | | Date de libération (1 an après réception) |
| notes | text | | Notes libres du syndic |
| created_by | uuid | FK → profiles | Auteur |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | Auto-update via trigger |

**Enum `payment_phase_status`** : `pending`, `awaiting_invoice`, `paid`

**Contraintes** :
- `UNIQUE (budget_id, phase_number)` — pas de doublon de numéro par budget
- Trigger `update_budget_payment_schedules_updated_at()` sur UPDATE

**Index** :
- `idx_budget_payment_schedules_budget` sur `budget_id`
- `idx_budget_payment_schedules_copro` sur `copro_id`

**RLS policies** (même pattern que `budget_expenses`) :
- SELECT : `user_has_copro_access(copro_id)`
- INSERT/UPDATE/DELETE : `user_is_copro_manager(copro_id)`

### Modification table `documents`

Ajout colonne : `budget_id uuid FK → budgets ON DELETE SET NULL (nullable)`

Index : `idx_documents_budget` sur `budget_id`

---

## Templates d'échéancier (constantes frontend)

Type TypeScript : `type PaymentScheduleTemplate = 'unique' | 'fifty_fifty' | 'classic' | 'quarterly' | 'custom'`

| ID | Label | Phases (%) |
|----|-------|-----------|
| unique | Paiement unique | 100 |
| fifty_fifty | Deux versements | 50 / 50 |
| classic | Classique 4 phases | 30 / 30 / 30 / 10 |
| quarterly | Quarts égaux | 25 / 25 / 25 / 25 |
| custom | Personnalisé | N phases, % libre (total = 100%) |

Labels par défaut des phases :
1. "Signature du contrat"
2. "Démarrage des travaux"
3. "Avancement mi-parcours"
4. "Solde à la réception"

Labels éditables par le syndic.

### Retenue de garantie

- Checkbox optionnelle "Retenue de garantie 5%"
- La retenue est **prélevée sur le dernier acompte** : le % de la dernière phase est réduit de 5pp, et une phase retenue est ajoutée à 5%. Le total reste 100%.
- Exemple : template 30/30/30/10 sur 100 000 €
  - Phase 1 : 30% = 30 000 €
  - Phase 2 : 30% = 30 000 €
  - Phase 3 : 30% = 30 000 €
  - Phase 4 (solde) : 5% = 5 000 € ← réduit de 10% à 5%
  - Retenue : 5% = 5 000 € (bloquée 1 an) ← ajoutée automatiquement
- La phase retenue est créée avec `is_retention = true`
- `retention_release_date` = `due_date` de la dernière phase non-retenue + 1 an (modifiable manuellement). En pratique, cette date correspond à la réception des travaux + 1 an (garantie de parfait achèvement). Elle est initialement estimée à partir de la date prévue du solde, et doit être ajustée quand la réception effective a lieu.

---

## UX — CreateBudgetModal (budget travaux)

Après les champs existants (type travaux, nom, montant, description, devis), ajouter une section "Échéancier de paiement" :

1. **Dropdown template** : les 5 options ci-dessus
2. **Checkbox retenue de garantie 5%**
3. **Tableau aperçu** : affichage live du tableau compact avec :
   - N° phase
   - Label (éditable inline)
   - % (éditable si template personnalisé)
   - Montant (calculé auto)
   - Date prévue (date picker)
4. Validation : total des % = 100%

## UX — TravauxDetailModal

### 3 onglets (suppression de "Prestataires")

#### Onglet "Échéancier" (ex "Étapes")

Tableau compact (design validé — option B) :

| # | Phase | % | Montant | Date | Statut | Actions |
|---|-------|---|---------|------|--------|---------|

Colonnes :
- **#** : numéro phase, coloré par statut (vert=payé, bleu=en attente, gris=à venir, orange=retenue)
- **Phase** : label
- **%** : pourcentage
- **Montant** : montant formaté €
- **Date** : date prévue ou date paiement si payé
- **Statut** : badge coloré (`Payé`, `En attente facture`, `À venir`, `Bloquée`)
- **Actions** : bouton menu (marquer payé, lier facture, lier OS, éditer)

Ligne spéciale retenue de garantie : fond orange subtil, icône cadenas.

Résumé en bas : Payé / Reste / Total avec barre de progression.

**Mode édition** : bouton "Modifier l'échéancier" → les labels, %, dates deviennent éditables. Possibilité d'ajouter/supprimer des phases. Validation % = 100%.

**Contrainte d'édition** : les phases au statut `paid` ne peuvent pas être supprimées ni avoir leur % ou montant modifié. Seuls le label, les notes et les dates des phases `pending` / `awaiting_invoice` sont éditables. L'ajout de phases redistribue uniquement les montants non payés.

#### Onglet "Documents"

Documents liés au budget via `documents.budget_id` :
- Chargés depuis Supabase (query `documents WHERE budget_id = X`)
- Affichage : liste de cards (nom, type, date, taille, actions ouvrir/télécharger)
- Bouton "Ajouter un document" → upload vers GED avec `budget_id` pré-rempli
- Catégories pertinentes : `devis`, `facture`, `contrat` (valeurs enum existantes dans la table documents)

#### Onglet "Historique"

Auto-généré à partir des événements :
- Création du budget
- Chaque paiement d'acompte (phase + montant + date)
- Chaque upload de document
- Modification de l'échéancier

Stockage : pas de table dédiée, construit à la volée depuis :
- `budget_payment_schedules` (phases payées → événements paiement)
- `documents` WHERE `budget_id` (uploads → événements document)
- `budgets.created_at` (création)

---

## Liens entre entités

```
budget_payment_schedules
  ├── copro_id          → copros (RLS)
  ├── budget_id         → budgets ON DELETE CASCADE (parent)
  ├── document_id       → documents ON DELETE SET NULL (facture liée)
  ├── service_order_id  → service_orders ON DELETE SET NULL (OS lié)
  └── created_by        → profiles (audit)

documents
  └── budget_id         → budgets ON DELETE SET NULL (retrouver tous docs d'un budget)
```

Navigation bidirectionnelle :
- Depuis une phase → ouvrir la facture / ouvrir l'OS
- Depuis la GED → voir le budget associé
- Depuis un OS → voir la phase d'acompte liée

---

## Ce qui est hors scope

- Suivi physique du chantier (étapes terrain, photos, PV réception) → module Travaux séparé
- Gestion des prestataires (annuaire, assignation) → module Maintenance/Travaux
- Comptabilité des écritures (journal, grand livre) → existant
- Appels de fonds copropriétaires → déjà implémenté (Sprint 3)
- Table d'audit dédiée pour l'historique → v2 si le calcul à la volée devient insuffisant
