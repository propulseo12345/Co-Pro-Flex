# Spec — États Datés Conformes + Gestion Lots/Tantièmes

> **Date** : 2026-03-31
> **Branche** : v2
> **Approche** : Bottom-up (Phase 1→5, fondations d'abord)
> **Conformité** : Décret 67-223 du 17 mars 1967, Art. 5 et 5-1 ; Loi ALUR Art. 14-2 II

---

## Contexte

Le module ventes/mutations existe déjà avec un workflow complet (`draft → pre_etat_generated → etat_generated → signed → validated`), une Edge Function de génération, et un composant `EtatDateViewer`. Cependant :

1. Le payload actuel (v1) n'est **pas conforme au décret** — il a un seul bloc `financial_situation` au lieu des 3 parties réglementaires
2. Il manque des **données complémentaires** en base (emprunts collectifs, avances de trésorerie, procédures judiciaires)
3. Il n'y a **aucune UI** pour gérer les lots, tantièmes et clés de répartition (les données existent en base via seed mais pas d'interface)
4. Il n'y a **pas de génération PDF** côté client (jsPDF est dans la stack mais pas utilisé pour les états datés)

Ce spec couvre la refonte complète en 5 phases séquentielles.

---

## Phase 1 — Tables complémentaires (SQL)

### Objectif
Ajouter les tables manquantes en base pour stocker les données nécessaires à un état daté 100% conforme.

### Tables à créer

#### `collective_loans` — Emprunts collectifs du syndicat

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `copro_id` | UUID FK → copros | |
| `label` | TEXT NOT NULL | "Emprunt ravalement 2025" |
| `lender` | TEXT | Organisme prêteur |
| `total_amount` | NUMERIC(12,2) | Montant total emprunté |
| `remaining_amount` | NUMERIC(12,2) | Capital restant dû |
| `annual_payment` | NUMERIC(12,2) | Annuité |
| `interest_rate` | NUMERIC(5,3) | Taux d'intérêt |
| `start_date` | DATE | Date de souscription |
| `end_date` | DATE | Date de fin prévue |
| `status` | ENUM ('active','repaid','cancelled') | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

RLS : Accessible aux membres de la copro.

#### `collective_loan_shares` — Part par lot dans chaque emprunt

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `loan_id` | UUID FK → collective_loans | |
| `lot_id` | UUID FK → lots | |
| `share_amount` | NUMERIC(12,2) | Part totale du lot |
| `remaining_amount` | NUMERIC(12,2) | Reste à payer |
| `last_payment_date` | DATE | |

#### `treasury_advances` — Avances de trésorerie

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `copro_id` | UUID FK → copros | |
| `lot_id` | UUID FK → lots | |
| `owner_id` | UUID FK → coproprietaires | |
| `advance_type` | ENUM ('permanent','special','work_fund') | permanent = fonds de roulement, work_fund = fonds travaux ALUR |
| `label` | TEXT NOT NULL | |
| `amount_due` | NUMERIC(12,2) | Montant attendu |
| `amount_paid` | NUMERIC(12,2) | Montant versé |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

#### `legal_proceedings` — Procédures judiciaires en cours

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `copro_id` | UUID FK → copros | |
| `title` | TEXT NOT NULL | "Contentieux infiltrations" |
| `nature` | ENUM ('litigation','recovery','other') | |
| `opposing_party` | TEXT | Partie adverse |
| `amount_at_stake` | NUMERIC(12,2) | Montant en jeu |
| `status` | ENUM ('pending','in_progress','closed','won','lost') | |
| `start_date` | DATE | |
| `end_date` | DATE | NULL si en cours |
| `court` | TEXT | Juridiction |
| `lawyer` | TEXT | Avocat |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### Vue à créer

#### `v_lot_detail` — Vue enrichie par lot

Agrège pour chaque lot :
- Infos du lot (ref, type, étage, surface)
- Propriétaire actuel (via `lot_owners` WHERE `end_date IS NULL AND is_primary`)
- Tantièmes par clé de répartition (via `repartition_key_lines`)
- Solde compte copropriétaire (via `v_owner_statement_lines`)
- Part emprunts collectifs (via `collective_loan_shares`)
- Avances versées (via `treasury_advances`)
- Fonds travaux ALUR (via `treasury_advances` WHERE `advance_type = 'work_fund'`)

### Seed data

Ajouter des données de test cohérentes :
- 1 emprunt collectif actif avec parts pour chaque lot
- Avances de trésorerie permanentes pour chaque lot
- Fonds travaux ALUR pour chaque lot
- 0 ou 1 procédure judiciaire en cours

### Critères de validation

- [ ] Les 4 tables existent et ont les bonnes contraintes FK
- [ ] RLS activé sur toutes les tables
- [ ] La vue `v_lot_detail` retourne les données enrichies
- [ ] Les seed data sont cohérentes avec les lots existants

---

## Phase 2 — UI gestion lots / tantièmes / clés de répartition

### Objectif
Permettre de voir, ajouter et modifier les lots et leur répartition via une interface. Nécessaire aussi pour les votes en AG (calcul des majorités basé sur les tantièmes).

### Routes

```
/(dashboard)/coproprietaires/lots/              → Liste des lots
/(dashboard)/coproprietaires/lots/[id]          → Détail lot
/(dashboard)/coproprietaires/repartition/       → Clés de répartition
```

### Feature structure

```
src/features/lots/
├── domain/
│   └── types.ts
├── api/
│   └── lotsApi.ts
├── hooks/
│   ├── useLots.ts
│   ├── useLotDetail.ts
│   └── useRepartition.ts
├── components/
│   ├── LotCard.tsx
│   ├── LotTable.tsx
│   ├── RepartitionChart.tsx
│   ├── TantièmesEditor.tsx
│   ├── CreateLotModal.tsx
│   └── *.module.css
└── index.ts
```

### Page liste des lots

- Tableau triable : ref, type, étage, surface, tantièmes, propriétaire
- KPI strip : total lots, occupés, vacants, en vente
- Filtres : type (appartement, parking, cave, commerce), propriétaire, recherche
- Total tantièmes affiché en permanence (contrôle de cohérence)
- Badge "En vente" si mutation active sur le lot
- Bouton "+ Nouveau lot" → modal de création

### Page détail lot

Layout sidebar + main (comme la page détail mutation) :

**Sidebar :**
- Propriétaire actuel (nom, email, depuis quand)
- Situation financière (solde, nombre impayés, fonds ALUR)
- Emprunts collectifs (part restante)

**Main :**
- Tantièmes & répartition : tableau avec chaque clé + tantièmes du lot
- Historique propriétaires : timeline des propriétaires successifs
- Mutations en cours : lien vers `/ventes-impayes/ventes/[id]` si actif
- Avances & dépôts : trésorerie permanente + fonds travaux

### Page clés de répartition

- Une section par clé (Charges générales, Ascenseur bât. A, etc.)
- Barres proportionnelles par lot (visualisation de la ventilation)
- Total par clé avec vérification automatique (total réel = total déclaré)
- Alerte si incohérence (lot manquant, total qui ne correspond pas)
- Édition en masse via tableau éditable
- Bouton "+ Nouvelle clé"

### Critères de validation

- [ ] Liste des lots affiche tous les lots de la copro avec tantièmes
- [ ] Détail lot montre toutes les informations (proprio, tantièmes par clé, solde, emprunts, avances)
- [ ] Clés de répartition affiche la ventilation avec barres proportionnelles
- [ ] CRUD lots fonctionne (création, modification)
- [ ] CRUD clés de répartition fonctionne
- [ ] Total tantièmes vérifié automatiquement
- [ ] Styles conformes au design system (dark theme, tokens CSS)

---

## Phase 3 — Nouveau payload état daté V2

### Objectif
Restructurer le payload JSON stocké dans `etat_date_snapshots.payload` pour qu'il soit conforme au décret du 17 mars 1967 (3 parties + annexe).

### Type `EtatDatePayloadV2`

```typescript
interface EtatDatePayloadV2 {
  version: '2.0';
  legal_reference: 'Décret 67-223 du 17 mars 1967, Art. 5 et 5-1';
  snapshot_type: 'pre' | 'final';
  generated_at: string;
  snapshot_date: string;

  // EN-TÊTE
  copro: {
    id: string;
    name: string;
    address: string;
    siret: string | null;
    syndic_name: string;
    syndic_address: string;
  };

  lot: {
    id: string;
    ref: string;
    type: string;
    building: string | null;
    floor: number | null;
    surface: number | null;
    tantiemes_generaux: number;
    total_tantiemes: number;
    repartition_keys: Array<{
      key_name: string;
      tantiemes: number;
      total: number;
    }>;
  };

  seller: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    is_company: boolean;
  };

  mutation: {
    id: string;
    type: MutationType;
    requested_at: string;
    signature_date: string | null;
    notary_name: string | null;
    notary_email: string | null;
  };

  // PARTIE 1 — Sommes dues PAR le vendeur AU syndicat
  partie1_vendeur_doit: {
    provisions_budget: {
      amount: number;
      detail: Array<{
        label: string;
        due_date: string;
        amount_due: number;
        amount_paid: number;
        remaining: number;
      }>;
    };
    provisions_travaux: {
      amount: number;
      detail: Array<{
        label: string;
        due_date: string;
        amount_due: number;
        amount_paid: number;
        remaining: number;
      }>;
    };
    arrieres: {
      amount: number;
      detail: Array<{
        period_label: string;
        amount: number;
      }>;
    };
    emprunts_collectifs: {
      amount: number;
      detail: Array<{
        label: string;
        lender: string;
        total_loan: number;
        seller_share: number;
        remaining: number;
      }>;
    };
    avances_exigibles: {
      amount: number;
      detail: Array<{
        label: string;
        amount_due: number;
        amount_paid: number;
      }>;
    };
    total: number;
  };

  // PARTIE 2 — Sommes dues PAR le syndicat AU vendeur
  partie2_syndicat_doit: {
    avances_versees: {
      amount: number;
      detail: Array<{
        label: string;
        type: string;
        amount: number;
      }>;
    };
    provisions_post_mutation: {
      amount: number;
      note: string;
    };
    trop_percus: {
      amount: number;
      note: string;
    };
    total: number;
  };

  // PARTIE 3 — Sommes incombant au nouvel acquéreur
  partie3_acquereur: {
    reconstitution_avances: {
      amount: number;
      detail: Array<{
        label: string;
        amount: number;
      }>;
    };
    provisions_non_exigibles: {
      amount: number;
      note: string;
    };
    travaux_votes_non_appeles: {
      amount: number;
      detail: Array<{
        label: string;
        ag_date: string;
        total_vote: number;
        lot_share: number;
      }>;
    };
    fonds_travaux_alur: {
      balance: number;
      note: string;
    };
    total: number;
  };

  // ANNEXE
  annexe: {
    historique_charges: Array<{
      period_label: string;
      budget_previsionnel: number;
      hors_budget: number;
      total: number;
    }>;
    procedures_judiciaires: Array<{
      title: string;
      nature: string;
      opposing_party: string;
      amount_at_stake: number;
      status: string;
      court: string;
    }>;
    solde_compte: number;
    recent_transactions: Array<{
      line_date: string;
      line_type: 'call' | 'payment';
      label: string;
      debit: number;
      credit: number;
      running_balance: number;
    }>;
  };
}
```

### Rétrocompatibilité

Le type `EtatDatePayload` devient une union :
```typescript
type EtatDatePayload = EtatDatePayloadV1 | EtatDatePayloadV2;
```

Le viewer détecte `payload.version` pour choisir le rendu approprié. Les snapshots existants (v1) restent lisibles sans migration de données.

### Critères de validation

- [ ] Le type `EtatDatePayloadV2` est défini dans `domain/types.ts`
- [ ] L'ancien type est renommé `EtatDatePayloadV1`
- [ ] L'union `EtatDatePayload` gère les deux versions
- [ ] Aucune erreur TypeScript dans les fichiers existants

---

## Phase 4 — Génération PDF côté client

### Objectif
Générer un PDF structuré en 3 parties + annexe à partir du payload V2, directement dans le navigateur avec jsPDF.

### Architecture

```
src/features/ventes/pdf/
├── generateEtatDatePDF.ts          (fonction principale)
├── pdfLayout.ts                    (constantes: marges, fonts, couleurs, tailles)
├── sections/
│   ├── renderHeader.ts             (page 1: copro, lot, vendeur, mutation)
│   ├── renderPartie1.ts            (page 2: dettes vendeur)
│   ├── renderPartie2.ts            (page 3: créances vendeur)
│   ├── renderPartie3.ts            (page 4: charges acquéreur)
│   └── renderAnnexe.ts             (page 5: historique + procédures)
└── helpers/
    ├── renderTable.ts              (tableaux génériques jsPDF)
    ├── renderSectionTitle.ts       (titres de section avec filet)
    └── formatters.ts               (montants FR, dates FR)
```

### Structure du PDF

- **Page 1** : En-tête — titre (ÉTAT DATÉ / PRÉ-ÉTAT DATÉ), référence légale, identification copropriété, lot, vendeur, mutation, date du présent état
- **Page 2** : Partie 1 — Sommes dues par le vendeur (5 sous-sections avec tableaux détaillés + total)
- **Page 3** : Partie 2 — Sommes dues au vendeur (3 sous-sections + total)
- **Page 4** : Partie 3 — Sommes incombant à l'acquéreur (4 sous-sections + total)
- **Page 5** : Annexe — Tableau charges N-1/N-2, procédures judiciaires, pied de page (date, syndic, signature)

Les pages s'ajoutent dynamiquement — si une section est longue (beaucoup de lignes de détail), le saut de page est automatique.

### Mode de génération

Génération côté client uniquement (option B validée) :
- Le bouton "Télécharger PDF" dans `EtatDateViewer` appelle `generateEtatDatePDF(payload)`
- `jsPDF.save('etat-date-lot-001-2026-03-28.pdf')` déclenche le téléchargement
- Optionnel : upload automatique dans la GED après génération (via Supabase Storage)

### Critères de validation

- [ ] Le PDF se génère sans erreur pour un payload V2 complet
- [ ] Le PDF se génère correctement avec des sections vides (0 €, "Aucun")
- [ ] Les montants sont formatés en euros français (1 234,56 €)
- [ ] Les dates sont formatées en français (28 mars 2026)
- [ ] Les sauts de page sont gérés automatiquement
- [ ] Le nom de fichier contient le lot et la date

---

## Phase 5 — Refonte Edge Function + EtatDateViewer

### Objectif
Mettre à jour la chaîne complète : la fonction SQL qui calcule les données, et le composant qui les affiche.

### 5A — Refonte fonction SQL `create_etat_date_snapshot`

La fonction SQL existante est refactorisée pour :

1. Séparer les provisions budget vs travaux (via le type de budget lié à l'appel)
2. Calculer les arriérés par exercice antérieur (via `accounting_periods` clôturés)
3. Interroger `collective_loan_shares` pour la part emprunts du lot
4. Interroger `treasury_advances` pour les avances (versées ET exigibles)
5. Calculer les provisions post-mutation (appels payés couvrant après la date de cession)
6. Calculer les trop-perçus (régularisation de charges)
7. Interroger `treasury_advances` pour la reconstitution (Partie 3)
8. Chercher les travaux votés non encore appelés (résolutions AG avec budget non appelé)
9. Calculer l'historique charges N-1/N-2 par exercice
10. Interroger `legal_proceedings` pour les procédures
11. Assembler le payload V2
12. Insérer dans `etat_date_snapshots` avec `version: '2.0'`

L'Edge Function `generate_etat_date` elle-même ne change pas — elle continue d'appeler cette fonction SQL.

### 5B — Refonte `EtatDateViewer`

Le composant monolithique actuel (324 lignes) est découpé en sous-composants :

```
src/features/ventes/components/
├── EtatDateViewer.tsx                  (REFONTE — orchestrateur + détection version)
├── EtatDateViewer.module.css           (REFONTE)
├── EtatDateViewerLegacy.tsx            (NOUVEAU — rendu payload v1, copie de l'ancien)
├── etat-date/
│   ├── EtatDateHeader.tsx              (identification copro/lot/vendeur)
│   ├── EtatDatePartie.tsx              (composant générique : titre + lignes + total)
│   ├── EtatDatePartieRow.tsx           (ligne : label + montant + toggle détail)
│   ├── EtatDateSummary.tsx             (3 KPIs récap + solde net)
│   ├── EtatDateAnnexe.tsx              (historique charges + procédures)
│   ├── EtatDateTransactions.tsx        (tableau opérations)
│   ├── EtatDateJsonViewer.tsx          (JSON brut, toggle)
│   └── etat-date.module.css
```

**Rétrocompatibilité :**
```typescript
// EtatDateViewer.tsx
if (payload.version === '1.0' || !payload.version) {
  return <EtatDateViewerLegacy snapshot={snapshot} />;
}
return <EtatDateViewerV2 snapshot={snapshot} onDownloadPDF={...} />;
```

### 5C — Intégration PDF dans le viewer

Le bouton "Télécharger PDF" dans `EtatDateViewerV2` :
```typescript
import { generateEtatDatePDF } from '../pdf/generateEtatDatePDF';

const handleDownloadPDF = () => {
  generateEtatDatePDF(payload);
};
```

Remplace l'ancien mécanisme qui passait par `getDocumentSignedUrl` (qui nécessitait un PDF pré-généré côté serveur).

### Critères de validation

- [ ] La fonction SQL produit un payload V2 conforme pour une mutation existante
- [ ] L'Edge Function retourne le payload V2 quand appelée
- [ ] Le status de la mutation est mis à jour correctement après génération
- [ ] Le viewer V2 affiche les 3 parties + annexe avec les bons montants
- [ ] Le viewer legacy affiche correctement les anciens snapshots
- [ ] Le bouton PDF génère et télécharge le document
- [ ] Les sections avec 0 € affichent "Aucun" proprement
- [ ] Les détails se déplient/replient (toggle)
- [ ] Styles conformes au design system (dark theme)

---

## Ordre d'implémentation

```
Phase 1 (SQL)
  ↓
Phase 2 (UI lots)     Phase 3 (types payload V2)
  ↓                      ↓
  ↓                   Phase 4 (PDF)
  ↓                      ↓
  └──────────────→  Phase 5 (Edge Function + Viewer)
```

Phase 2 et Phase 3 peuvent être développées en parallèle car elles n'ont pas de dépendance entre elles. Phases 4 et 5 dépendent de Phase 3.

---

## Hors scope (futur)

- Opposition Art. 20 (workflow syndic pour bloquer le prix de vente)
- Envoi automatique au notaire par email
- Signature électronique de l'état daté
- Pré-état daté (dossier de documents Art. L.721-2 CCH — distinct de l'état daté)
- Liaison lots ↔ votes AG (utilisation des tantièmes pour le calcul des majorités)
