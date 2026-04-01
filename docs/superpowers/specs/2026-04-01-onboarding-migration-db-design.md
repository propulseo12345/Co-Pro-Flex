# Spec — Onboarding Wizard + Migration Mock→Supabase + Modèle de données unifié

**Date** : 2026-04-01
**Branche** : v2
**Statut** : Draft — en attente de validation

---

## 1. Objectif

Permettre à un syndic d'installer CoProFlex et d'y saisir toutes les données d'une copropriété existante via un assistant pas-à-pas (wizard). En parallèle, connecter tous les modules frontend existants à Supabase en éliminant les mock data.

### Ce qui est inclus (v1)
- Wizard d'onboarding copropriété par copropriété
- Connexion des 9 modules existants à Supabase
- Création des tables manquantes (Ventes, Communication partielle)
- Architecture de données unifiée (source unique de vérité financière)

### Ce qui est exclu (v2+)
- Import CSV en masse
- Import transversal multi-copros
- Clonage de config entre copros
- Modules manquants : assurances, sinistres, diagnostics obligatoires, mandat de gestion, extranet copropriétaires (loi ELAN), reporting/annexes comptables, archivage légal, registre des mandats

---

## 2. Architecture de données — Principe "Mix"

### Règle fondamentale

Chaque module garde ses **données opérationnelles** dans ses propres tables (devis, montant contrat, étape workflow). Mais dès qu'un **euro bouge réellement** (créance créée, argent reçu, facture validée), une écriture est générée dans le **journal comptable** (`ledger_transactions` + `ledger_entries`).

Le **solde d'un lot** n'est jamais stocké — c'est toujours une **vue SQL calculée** depuis le journal.

### Pourquoi ce choix

| Alternative | Problème |
|-------------|----------|
| Tout dans le journal | Un devis n'est pas un fait comptable — ça pollue la comptabilité |
| Chaque module ses montants | Duplication → incohérence (le même montant existe en 5 endroits) |
| **Mix (choisi)** | Données opérationnelles là où elles ont du sens, vérité financière centralisée |

### Concrètement

| Donnée | Où elle vit | Pourquoi |
|--------|------------|----------|
| Devis d'un prestataire (500€) | `service_orders.montant_devis` | Estimation, pas un fait comptable |
| Montant annuel d'un contrat | `contracts.montant_annuel` | Engagement opérationnel |
| Appel de fonds émis | `call_for_funds` → **écriture journal** | Créance réelle |
| Paiement reçu d'un copro | `payments` → **écriture journal** | Mouvement d'argent réel |
| Facture fournisseur validée | `supplier_invoices` → **écriture journal** | Dette reconnue |
| Transfert ALUR (mutation) | `mutations` → **écriture journal** | Mouvement réel |
| Budget voté en AG | `ag_resolutions` → `budgets` → `call_for_funds` | Le vote déclenche la chaîne |
| Solde d'un lot | `v_lot_balance` (vue SQL) | Jamais stocké, toujours calculé |

---

## 3. Wizard d'onboarding — Parcours complet

### Contexte
Un syndic qui installe CoProFlex doit pouvoir saisir toutes les données d'une copropriété existante. Le wizard se fait **copropriété par copropriété**. Chaque étape valide ses données avant de passer à la suivante.

### Étapes

#### Étape 1 — Créer la copropriété
**Tables** : `copros`
**Champs** :
- Nom de la copropriété
- Adresse complète (rue, code postal, ville)
- Nombre de bâtiments
- Année de construction
- SIRET du syndic
- Date de début d'exercice comptable
- Image/photo (optionnel)

**Validation** : nom + adresse obligatoires.

#### Étape 2 — Ajouter les copropriétaires
**Tables** : `coproprietaires`, `profiles`
**Champs par copropriétaire** :
- Nom, prénom
- Email, téléphone
- Adresse postale (si différente du lot)
- Préférence de communication (email / courrier / les deux)
- Résident ou non-résident
- Rôle au conseil syndical (optionnel)

**UX** : formulaire ajout rapide en tableau, possibilité d'ajouter N copropriétaires d'un coup. Pas de notion de lot ici — l'association lot↔proprio se fait à l'étape 3.

**Validation** : au moins un copropriétaire. Nom obligatoire.

#### Étape 3 — Lots + Clés de répartition (en parallèle)
**Tables** : `lots`, `lot_owners`, `repartition_keys`, `repartition_key_lines`

Cette étape se fait en **grille interactive** (la grille lots×clés qui existe déjà dans le module copropriétaires).

**3a — Définir les clés de répartition** :
- Tantièmes généraux (obligatoire, créé automatiquement)
- Clés personnalisées (eau, chauffage, ascenseur, parking...)
- Chaque clé a un total qui doit être cohérent

**3b — Créer les lots** :
- Numéro, type (appartement, cave, parking, commerce...)
- Étage, surface
- Bâtiment (si multi-bâtiments)
- Tantièmes par clé de répartition
- Propriétaire(s) — sélection depuis la liste de l'étape 2

**UX** : grille lots×clés comme la grille existante. Chaque ligne = un lot, chaque colonne = une clé. Le propriétaire est sélectionnable par lot. Total par clé affiché en bas pour vérification.

**Validation** :
- Au moins un lot
- Chaque lot a un propriétaire
- Total des tantièmes généraux > 0
- Chaque lot a ses tantièmes généraux renseignés

#### Étape 4 — Comptes bancaires
**Tables** : `accounts` (plan comptable — comptes de classe 5)
**Champs** :
- Compte courant (obligatoire) : banque, IBAN, BIC, solde initial
- Fonds travaux ALUR (obligatoire depuis loi ALUR) : banque, IBAN, BIC, solde initial

**Note** : le fonds ALUR suit les tantièmes généraux — ce n'est pas une clé de répartition à part.

**Validation** : au moins le compte courant.

#### Étape 5 — Budget prévisionnel
**Tables** : `budgets`, `budget_lines`
**Champs** :
- Année budgétaire
- Type : courant ou travaux
- Catégories et postes (avec montants prévisionnels)
- Clé de répartition par poste

**UX** : le budget peut être saisi manuellement, ou l'utilisateur peut indiquer "je n'ai pas encore voté le budget" et passer cette étape.

**Note** : le budget n'est PAS validé à cette étape. Il le sera quand une AG le votera (étape 6). Ici on prépare le prévisionnel.

#### Étape 6 — AG → Vote budget → Appels de fonds
**Tables** : `ag_meetings`, `ag_resolutions`, `ag_votes`, `call_for_funds`, `call_for_funds_lines`

Cette étape est la **connexion critique** entre le budget et les appels de fonds.

**Deux cas** :
- **Cas A — Le budget a déjà été voté** (copro existante) : l'utilisateur indique que le budget est voté, renseigne la date de l'AG et le mode d'appels (trimestriel, semestriel...). Le système génère les appels de fonds et les écritures comptables.
- **Cas B — Le budget n'est pas encore voté** : l'utilisateur crée une AG future. Les appels seront générés après le vote.

**Flux** :
```
Budget prévisionnel (étape 5)
  → Résolution AG "Approbation du budget" (auto-générée)
    → Vote en AG (pour/contre/abstention par copro)
      → Si adopté : génération des appels de fonds
        → Pour chaque lot : montant dû = (tantièmes lot / total tantièmes clé) × montant poste
          → Écriture journal (créance)
```

#### Étape 7 — Reprise des soldes existants
**Tables** : `call_for_funds`, `call_for_funds_lines`, `payments`, `ledger_transactions`, `ledger_entries`

Pour une copropriété qui existait avant CoProFlex, il faut reprendre l'historique de ce que chaque lot doit ou a payé.

**Saisie** : détail appel par appel (pas juste le solde global).
**Par lot** :
- Liste des appels de fonds passés (date, montant)
- Montant payé pour chaque appel
- Date de paiement
- Si non payé → marqué comme impayé avec ancienneté

**Chaque appel saisi** → écriture journal (créance).
**Chaque paiement saisi** → écriture journal (encaissement).
Le solde résultant est calculé automatiquement via `v_lot_balance`.

**UX** : tableau lot × appels passés. Possibilité de saisir rapidement "tout est payé" pour les copropriétaires à jour.

#### Étapes parallèles (accessibles à tout moment après l'étape 3)

**Contrats en cours** :
- Tables : `contracts`, `suppliers`
- Prestataire, type de contrat, montant annuel, dates début/fin, tacite reconduction
- Pas d'écriture journal — c'est opérationnel

**Documents existants** :
- Tables : `documents`, `document_folders`
- Upload du règlement de copropriété, PV des dernières AG, diagnostics, etc.
- Catégorisation automatique par type

**Carnet d'entretien** :
- Tables : `logbook_entries`
- Saisie des interventions passées (date, description, prestataire)

---

## 4. Migration modules frontend → Supabase

### État actuel et travail à faire

#### Dashboard
- **État** : ✅ Branché sur Supabase (vues `v_dashboard_kpis`, `v_dashboard_todos`, `v_dashboard_recent_activity`)
- **À faire** : Rien — s'alimente automatiquement depuis les autres modules

#### Copropriété / Lots / Copropriétaires
- **État** : ✅ Branché sur Supabase
- **À faire** : Créer le wizard d'onboarding (étapes 1-3)

#### Finance (comptabilité, budgets, appels, factures, mouvements)
- **État** : ✅ Branché sur Supabase (45+ tables)
- **À faire** :
  - Wizard étapes 4-7 (comptes bancaires, budget, AG→appels, reprise soldes)
  - Connecter le flux AG vote → génération appels de fonds
  - Créer/vérifier la vue `v_lot_balance`

#### AG
- **État** : ✅ Branché sur Supabase (15+ tables)
- **À faire** :
  - Connecter le résultat du vote budget → déclenchement génération appels de fonds
  - S'assurer que le wizard peut marquer un budget comme "déjà voté"

#### Maintenance (contrats, OS, carnet, prestataires)
- **État** : Tables Supabase existent (`contracts`, `service_orders`, `logbook_entries`, `suppliers`) mais le frontend utilise encore les mocks
- **À faire** :
  - Créer les services Supabase pour chaque sous-module
  - Remplacer les imports mock dans tous les composants maintenance
  - Brancher la grille contrats, le kanban ordres de service, le carnet d'entretien
  - Wizard étape parallèle "Contrats en cours"
  - Connecter facture validée d'OS → écriture journal

#### Documents / GED
- **État** : ✅ Partiellement branché (tables `documents`, `document_folders`, `document_versions`)
- **À faire** :
  - Vérifier que tous les composants GED lisent depuis Supabase
  - Wizard étape parallèle "Documents existants"
  - Connecter les documents aux autres modules (AG→PV, Maintenance→devis, Ventes→état daté)

#### Communication (mail, messagerie, mur)
- **État** : 🟡 Partiellement migré — tables `mail_*` existent, mais `conversations`, `messages`, `wall_posts` ont des tables mais le frontend utilise les mocks
- **À faire** :
  - Compléter les tables manquantes si nécessaire
  - Créer les services Supabase pour messagerie et mur
  - Remplacer les imports mock
  - Brancher les composants

#### Contentieux / Ventes / Mutations
- **État** :
  - Impayés : 🟡 logique de relance en mock, données financières sous-jacentes dans Supabase
  - Ventes : ❌ Aucune table Supabase
  - Mutations : ✅ tables `mutations`, `mutation_steps` existent
- **À faire** :
  - **Créer les tables** : `sales`, `sale_workflow_steps`, `sale_documents`
  - Brancher le frontend ventes sur Supabase
  - Connecter mutation → écriture journal (transfert ALUR)
  - Brancher les relances impayés sur les données réelles (`payment_reminders`)

#### Conseil Syndical
- **État** : ✅ Tables existent (`council_members`, `council_decisions`, `council_votes`)
- **À faire** : Vérifier que le frontend est branché, sinon connecter

---

## 5. Tables à créer

### Module Ventes

```sql
-- Table principale des ventes
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id),
  lot_ids UUID[] NOT NULL,  -- peut être multi-lots
  vendeur_id UUID REFERENCES coproprietaires(id),
  acquereur_nom TEXT NOT NULL,
  acquereur_email TEXT,
  acquereur_telephone TEXT,
  notaire_nom TEXT,
  notaire_email TEXT,
  date_compromis DATE,
  date_acte_authentique DATE,
  date_notification_art6 DATE,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee','annulee')),
  observations TEXT,
  workflow_v2 BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Étapes du workflow de vente (6 étapes)
CREATE TABLE sale_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  etape TEXT NOT NULL CHECK (etape IN (
    'notification', 'pre_etat_date', 'etat_date',
    'questionnaire_syndic', 'transfert', 'cloture'
  )),
  statut TEXT NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','in_progress','done','skipped')),
  date_debut DATE,
  date_completion DATE,
  notes TEXT,
  ordre INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents liés à une vente
CREATE TABLE sale_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),  -- lien vers la GED
  type TEXT NOT NULL CHECK (type IN (
    'pre_etat_date','etat_date','certificat_article_20',
    'diagnostic','pv_ag','reglement','carnet_entretien',
    'compromis','questionnaire_syndic','autre'
  )),
  statut TEXT DEFAULT 'a_fournir' CHECK (statut IN ('a_fournir','fourni','signe','envoye')),
  obligatoire BOOLEAN DEFAULT FALSE,
  date_upload TIMESTAMPTZ,
  date_signature TIMESTAMPTZ,
  date_envoi TIMESTAMPTZ,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Vue solde par lot

```sql
-- Vue calculée depuis le journal — JAMAIS de stockage direct
CREATE OR REPLACE VIEW v_lot_balance AS
SELECT
  le.lot_id,
  lt.copro_id,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) AS total_debits,
  SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE 0 END) AS total_credits,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) AS solde
FROM ledger_entries le
JOIN ledger_transactions lt ON le.transaction_id = lt.id
WHERE lt.status = 'posted'
  AND le.lot_id IS NOT NULL
GROUP BY le.lot_id, lt.copro_id;
```

---

## 6. Flux de données critiques

### Flux 1 : Budget → Appels de fonds (via AG)
```
Budget prévisionnel (postes × clés)
  → Résolution AG auto-générée
    → Vote en AG
      → Si adopté : pour chaque poste du budget
        → Pour chaque lot : montant = (tantièmes lot / total clé) × montant poste
          → Création call_for_funds + call_for_funds_lines
            → Écriture journal (débit compte copropriétaire, crédit compte produits)
```

### Flux 2 : Paiement copropriétaire
```
Paiement reçu (mouvement bancaire ou saisie manuelle)
  → Allocation à un ou plusieurs appels de fonds (payment_allocations)
    → Mise à jour call_for_funds_lines (montant payé)
      → Écriture journal (débit banque, crédit compte copropriétaire)
        → v_lot_balance recalculé automatiquement
```

### Flux 3 : Ordre de service → Facture → Journal
```
Ordre de service créé (montant devis = opérationnel, pas de journal)
  → Intervention réalisée
    → Facture fournisseur créée (montant facture = opérationnel)
      → Facture validée
        → Écriture journal (débit charges, crédit fournisseur)
          → Paiement fournisseur
            → Écriture journal (débit fournisseur, crédit banque)
```

### Flux 4 : Vente de lot (mutation)
```
Vente créée (workflow 6 étapes)
  → Pré-état daté puis état daté générés
    → Questionnaire syndic
      → Transfert de propriété
        → Mutation enregistrée
          → Transfert fonds ALUR si applicable
            → Écriture journal (transfert entre comptes copropriétaire)
              → Changement propriétaire dans lot_owners
```

### Flux 5 : Impayé → Relance
```
Appel de fonds non payé après échéance
  → Calcul jours de retard (automatique)
    → Déclenchement relance selon règles (J+15 email, J+30 courrier, J+60 LRAR, J+90 contentieux)
      → Historique des actions de relance
        → Si paiement reçu → Flux 2
        → Si contentieux → module Contentieux / Litiges
```

---

## 7. Ordre d'implémentation recommandé

### Phase 1 — Onboarding (fondation)
1. Wizard étape 1 : création copropriété
2. Wizard étape 2 : ajout copropriétaires
3. Wizard étape 3 : lots + clés de répartition (grille existante adaptée)
4. Wizard étape 4 : comptes bancaires

### Phase 2 — Finance & AG (coeur)
5. Wizard étape 5 : budget prévisionnel
6. Connexion AG vote → génération appels de fonds
7. Wizard étape 7 : reprise soldes existants
8. Vue `v_lot_balance`

### Phase 3 — Maintenance (brancher frontend)
9. Services Supabase pour contrats, OS, carnet, prestataires
10. Remplacement des mocks dans tous les composants maintenance
11. Wizard étape parallèle : contrats en cours

### Phase 4 — Ventes & Contentieux
12. Création tables `sales`, `sale_workflow_steps`, `sale_documents`
13. Services Supabase pour ventes
14. Remplacement des mocks ventes
15. Connexion mutation → journal
16. Branchement relances impayés sur données réelles

### Phase 5 — Communication & finitions
17. Compléter migration communication (messagerie, mur)
18. Vérifier documents/GED entièrement branché
19. Vérifier conseil syndical branché
20. Suppression de TOUS les fichiers mock restants
21. Wizard étapes parallèles : documents + carnet d'entretien

---

## 8. Contraintes techniques

### RLS (Row Level Security)
Toutes les tables doivent avoir des politiques RLS :
- Un utilisateur ne voit que les copropriétés auxquelles il appartient
- Les copropriétaires ne voient que leurs propres lots et données financières
- Le gestionnaire (syndic) voit tout pour ses copropriétés

### Intégrité des données
- Le journal comptable est **immutable** après posting (pas de modification, seulement des écritures d'annulation)
- Les transactions journal doivent toujours être **équilibrées** (total débits = total crédits)
- Les périodes comptables peuvent être **verrouillées** (pas d'écriture rétroactive)

### Performance
- `v_lot_balance` sera sollicitée fréquemment → envisager une materialized view avec refresh périodique si les performances le nécessitent
- Index sur `lot_id`, `copro_id`, `status`, et les dates dans les tables à forte volumétrie

### Migration
- Chaque module migré = une branche, un PR, des tests
- Les mocks ne sont supprimés qu'une fois le module entièrement branché et testé
- Aucune donnée ne doit être perdue pendant la transition
