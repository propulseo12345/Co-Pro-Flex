# Appels de fonds — Refonte complète

**Date** : 2026-03-14
**Statut** : Design validé
**Scope** : Reconstruction totale du module (UI + hooks + services) sur le schéma DB existant

---

## 1. Contexte

Le module appels de fonds existe avec un schéma DB complet (tables `call_for_funds`, `call_for_funds_lines`, vues, triggers) mais le code frontend est un mix de legacy mockées et de composants partiellement branchés (~37 fichiers, hook de 832 lignes). L'émission, les paiements et l'archivage GED sont des stubs.

**Décision** : tout reprendre côté frontend en repartant du schéma DB vérifié.

---

## 2. Flux utilisateur complet

```
Budget voté en AG
    ↓
Génération des appels (trimestriel pour courant, échéancier libre pour travaux)
    ↓
Revue brouillon (détail par copropriétaire/lot)
    ↓
Émission (verrouillage + écriture comptable + génération PDF avis)
    ↓
Envoi multi-canal (email / courrier / électronique) avec tracking
    ↓
Archivage GED automatique (sous-dossier : Appels de fonds/{exercice}/T{n})
    ↓
Suivi encaissements (paiements lot par lot)
    ↓
Relances automatiques (J+15, J+30, J+60 pour impayés)
    ↓
Clôture (trimestre/appel soldé)
```

---

## 3. Architecture des pages

### 3.1 Page principale — `/finance/appels-fonds`

**Layout** : Dashboard campagne par exercice avec navigation par onglets.

#### Éléments communs (toujours visibles)
- **Page header** : titre "Appels de fonds" + boutons Export / + Générer
- **Period bar** : navigation exercice (◀ ▶) + budget courant + travaux votés

#### 3 onglets (tabs)

| Onglet | Contenu |
|--------|---------|
| **Vue globale** | KPIs agrégés (total appelé, encaissé, restant dû, taux recouvrement) + alerte impayés + résumé budget courant (barre progression) + résumé travaux (barre progression) |
| **Budget courant** | KPIs budget courant + barre progression exercice + alerte impayés + grille 2×2 des trimestres |
| **Travaux** | KPIs travaux + barre progression + liste des chantiers avec échéanciers |

Chaque onglet affiche dans son tab : le montant total + le taux de recouvrement.

#### Carte trimestre (budget courant)
- Titre (T1 — Janvier → Mars 2026)
- Badge taux recouvrement (couleur : vert >75%, ambre 25-75%, neutre <25%)
- Métadonnées : nb clés, montant, date émission ou "En cours"
- Mini barre de progression
- Tags des clés de répartition avec montants
- Actions : Avis PDF, Détail, Relancer/Émettre/Envoyer selon statut
- États visuels : `active` (border primaire, fond gradient), `draft` (border dashed, opacité réduite)
- **Cliquable** → navigue vers la page détail

#### Carte travaux
- Titre du chantier + origine (AG, résolution, article, clé)
- Montant total + montant encaissé
- Barre progression violette
- **Échéancier** : cartes numérotées (Appel 1/N, 2/N...) avec :
  - Date échéance
  - Montant
  - Statut : Soldé (vert) / En cours (violet) / À émettre (gris dashed)
  - **Chaque échéance cliquable** → page détail de cet appel
- Actions : Avis PDF, Détail appel N/N, Relancer, Envoyer
- Bordure gauche violette

### 3.2 Page détail — `/finance/appels-fonds/[callId]`

Page commune pour budget courant et travaux. Accessible par clic sur carte trimestre, échéance travaux, ou bouton Détail.

#### Éléments
- **Back link** : ← Retour aux appels de fonds (revient au listing, même onglet)
- **Header** : titre de l'appel + sous-titre (échéance, date émission, clé, tantièmes)
- **Actions** : Avis PDF, Envoyer, + Enregistrer un paiement
- **4 KPI cards** : Appelé, Encaissé, Restant, Copropriétaires (N/total payés)
- **Tableau copropriétaires** :

| Colonne | Contenu |
|---------|---------|
| Copropriétaire | Nom (gras, rouge si impayé) |
| Lot | Référence (muted) |
| Tantièmes | X / total (depuis repartition_key_lines.weight) |
| Montant dû | Montant (gras) |
| Payé | Montant (vert si payé, ambre si partiel, rouge si 0) |
| Statut | Badge : Payé (vert) / Partiel (ambre) / Impayé (rouge) |
| Actions | Relancer (lien) ou — si payé |

- Lignes impayées : fond rouge subtil (`row-danger`)
- Tri par statut (impayés en bas) ou par nom

#### États vides et erreurs
- **Pas de budget voté** : empty state "Aucun budget voté pour cet exercice" + lien vers module budget
- **Pas d'appels** : empty state "Aucun appel généré" + bouton Générer
- **Erreur chargement** : bandeau erreur avec retry
- **Loading** : skeleton cards (trimestres) ou skeleton table (détail)

---

## 4. Types de données (frontend)

### Types API (réutilisés depuis `src/lib/finance/api.ts`)

Les types existants sont utilisés directement — pas de re-définition :

```typescript
// Depuis api.ts — déjà définis, réutilisés tels quels
import type {
  CallForFundsOverview,  // v_calls_overview (id, status, total_amount, total_paid, total_unpaid, lines_count, lines_paid_count, lines_unpaid_count, etc.)
  CallLineDetailed,       // v_call_lines_detailed (lot_ref, owner_name, amount_due, amount_paid, amount_remaining, status)
  CallCampaign,           // v_call_campaigns (period_id, ag_id, ag_title, total_calls, total_keys, global_status)
  UnpaidByLot,            // v_unpaid_by_lot
  PaymentOverview,        // v_payments_overview
} from '@/lib/finance/api';

type CallStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
type CallLineStatus = 'unpaid' | 'partial' | 'paid';
```

### Valeurs calculées côté frontend

```typescript
// Taux recouvrement — calculé depuis CallForFundsOverview
function recoveryRate(call: CallForFundsOverview): number {
  return call.total_amount > 0 ? (call.total_paid / call.total_amount) * 100 : 0;
}
```

### Types d'affichage (nouveaux, spécifiques au module)

```typescript
type AppelTab = 'all' | 'courant' | 'travaux';

interface TrimesterCard {
  trimester: number; // 1-4
  label: string; // "T1 — Janvier → Mars 2026"
  calls: CallForFundsOverview[]; // Appels du trimestre (1 par clé)
  totalAmount: number;
  totalPaid: number;
  recoveryRate: number; // calculé
  keys: { name: string; amount: number }[];
  status: TrimesterStatus;
}

// Statut dérivé : 'draft' si tous draft, 'paid' si tous paid,
// 'active' si au moins 1 issued/partially_paid, sinon 'draft'
type TrimesterStatus = 'draft' | 'active' | 'paid';

// Agrégation travaux — construit en joignant CallForFundsOverview + budgets + ag_resolutions
interface TravauxProject {
  budgetId: string;             // Budget travaux lié
  budgetLabel: string;          // Ex: "Ravalement façade nord"
  agId: string | null;          // AG d'origine (depuis budgets.ag_resolution_id → ag_resolutions.ag_id)
  agDate: string | null;        // Date AG
  resolutionTitle: string;      // Titre résolution
  article: string;              // Article de vote (24, 25, 26)
  repartitionKeyName: string;   // Clé de répartition
  totalAmount: number;          // Montant total voté
  totalPaid: number;            // Total encaissé (somme des calls)
  recoveryRate: number;         // Calculé
  calls: CallForFundsOverview[]; // Appels de l'échéancier, triés par issue_date
}
```

### Tantièmes dans la page détail

La vue `v_call_lines_detailed` ne contient pas les tantièmes. Deux options :

**Option retenue : migration DB** — Étendre `v_call_lines_detailed` pour ajouter le poids du lot depuis `repartition_key_lines` :

```sql
-- Migration : ajouter weight à v_call_lines_detailed
CREATE OR REPLACE VIEW v_call_lines_detailed AS
SELECT
  cfl.id, cfl.copro_id, cfl.call_id,
  cf.label as call_label, cf.issue_date, cf.due_date, cf.status as call_status,
  cf.repartition_key_id,
  cfl.lot_id, l.ref as lot_ref, l.type as lot_type,
  cfl.amount_due, cfl.amount_paid, cfl.amount_due - cfl.amount_paid as amount_remaining,
  cfl.status,
  -- Tantièmes : poids du lot dans la clé de répartition de l'appel
  COALESCE(rkl.weight, 0) as lot_weight,
  -- Total tantièmes de la clé
  COALESCE(rk_total.total_weight, 0) as key_total_weight,
  -- Propriétaire
  (SELECT cp.first_name || ' ' || cp.last_name
   FROM lot_owners lo JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
   WHERE lo.lot_id = cfl.lot_id AND lo.is_primary = true
     AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE) LIMIT 1) as owner_name
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
LEFT JOIN repartition_key_lines rkl ON rkl.key_id = cf.repartition_key_id AND rkl.lot_id = cfl.lot_id
LEFT JOIN (
  SELECT key_id, SUM(weight) as total_weight FROM repartition_key_lines GROUP BY key_id
) rk_total ON rk_total.key_id = cf.repartition_key_id;
```

Côté TypeScript, `CallLineDetailed` dans `api.ts` sera étendu avec :
```typescript
lot_weight: number;       // Poids du lot dans la clé
key_total_weight: number; // Total des poids de la clé
```

---

## 5. Architecture des composants

```
src/features/finance/appels-fonds/
├── hooks/
│   ├── useAppelsFondsPage.ts      # Orchestrateur page principale
│   │                               # Compose: useCalls, useCallCampaigns, useAccountingPeriods
│   ├── useAppelsFondsDetail.ts    # Orchestrateur page détail
│   │                               # Compose: useCallLines, useRecordPayment
│   └── useAppelsFondsActions.ts   # Mutations (create, emit, cancel)
│                                   # Compose: useCreateCall, updateCallStatus
├── components/
│   ├── AppelsFondsHeader.tsx      # Header page + period bar
│   ├── AppelsFondsTabs.tsx        # Barre d'onglets (3 tabs)
│   ├── TabVueGlobale.tsx          # Contenu onglet vue globale
│   ├── TabBudgetCourant.tsx       # Contenu onglet budget courant
│   ├── TabTravaux.tsx             # Contenu onglet travaux
│   ├── TrimesterCard.tsx          # Carte trimestre
│   ├── TravauxCard.tsx            # Carte travaux avec échéancier
│   ├── EcheanceCard.tsx           # Carte échéance individuelle
│   ├── StatsGrid.tsx              # Grille KPI réutilisable (4 colonnes)
│   ├── ProgressBar.tsx            # Barre progression compacte
│   ├── AlertBanner.tsx            # Bandeau alerte impayés
│   ├── DetailHeader.tsx           # Header page détail (back + title + actions)
│   ├── CoproTable.tsx             # Tableau copropriétaires + lignes
│   └── StatusBadge.tsx            # Badge statut (Payé/Partiel/Impayé/Brouillon/Émis)
├── services/
│   └── avis-appel-export.service.ts  # Déplacé + adapté aux types API
├── styles/
│   ├── AppelsFondsPage.module.css    # Styles page listing (tabs, header, period)
│   ├── Cards.module.css              # TrimesterCard + TravauxCard + EcheanceCard
│   ├── StatsGrid.module.css          # KPIs + ProgressBar + AlertBanner
│   ├── DetailPage.module.css         # Header détail
│   └── CoproTable.module.css         # Tableau + StatusBadge
└── types.ts                          # TrimesterCard, TravauxProject, AppelTab, TrimesterStatus
```

### Pages Next.js

```
src/app/(dashboard)/finance/appels-fonds/
├── page.tsx                       # Page listing (dashboard campagne)
└── [callId]/
    └── page.tsx                   # Page détail
```

---

## 6. Hooks

### useAppelsFondsPage (orchestrateur listing)

Compose les hooks React Query existants de `useFinanceData.ts` :

```typescript
interface UseAppelsFondsPageReturn {
  // Données (depuis useCalls + useCallCampaigns)
  calls: CallForFundsOverview[];
  campaign: CallCampaign | null; // Campagne de la période sélectionnée
  trimesterCards: TrimesterCard[]; // Calculé : calls filtrés courant, groupés par trimester
  travauxProjects: TravauxProject[]; // Calculé : calls filtrés travaux, groupés par budget

  // KPIs (calculés depuis calls)
  globalStats: { totalCalled: number; totalPaid: number; totalUnpaid: number; recoveryRate: number };
  courantStats: { totalCalled: number; totalPaid: number; totalUnpaid: number; recoveryRate: number };
  travauxStats: { totalCalled: number; totalPaid: number; totalUnpaid: number; recoveryRate: number; projectCount: number };

  // UI state
  activeTab: AppelTab;
  setActiveTab: (tab: AppelTab) => void;
  impayesCount: number; // Depuis listUnpaid

  // Period navigation (depuis useAccountingPeriods)
  periods: AccountingPeriod[];
  selectedPeriodId: string;
  navigatePeriod: (direction: 'prev' | 'next') => void;

  // Actions
  generateCalls: () => Promise<void>;
  exportExcel: () => void;

  // Loading
  isLoading: boolean;
  error: string | null;
}
```

**Logique de séparation courant/travaux :**
```typescript
// Requête budgets pour la période → type 'previsionnel' vs 'travaux'
// calls.filter(c => budgetTypeMap[c.budget_id] === 'previsionnel') → courant
// calls.filter(c => budgetTypeMap[c.budget_id] === 'travaux') → travaux
```

### useAppelsFondsDetail (orchestrateur détail)

```typescript
interface UseAppelsFondsDetailReturn {
  // Données (depuis getCallById + useCallLines)
  call: CallForFundsOverview | null;
  lines: CallLineDetailed[]; // Inclut lot_weight, key_total_weight après migration
  stats: { called: number; paid: number; remaining: number; paidCount: number; totalCount: number };

  // Actions
  recordPayment: (lineId: string, amount: number, method: PaymentMethod) => Promise<void>;
  sendReminder: (lineId: string) => Promise<void>;
  generatePdf: () => Promise<Blob>;
  sendCall: (options: SendOptions) => Promise<void>;

  // Loading
  isLoading: boolean;
  error: string | null;
}
```

---

## 7. Intégrations

### 7.1 API Supabase (existantes à réutiliser)

Fonctions de `src/lib/finance/api.ts` + hooks React Query de `src/hooks/modules/useFinanceData.ts` :

| Fonction API | Hook React Query | Source DB |
|-------------|-----------------|-----------|
| `listCalls(coproId)` | `useCalls(coproId)` | `v_calls_overview` |
| `listCallCampaigns(coproId)` | `useCallCampaigns(coproId)` | `v_call_campaigns` |
| `getCallLines(callId)` | `useCallLines(callId)` | `v_call_lines_detailed` |
| `getCombinedCallLines(callIds)` | — | `v_call_lines_detailed` |
| `createCall(payload)` | `useCreateCall()` | Edge Function `generate_call_for_funds` |
| `recordPayment(payload)` | `useRecordPayment()` | Edge Function `record_payment` |
| `updateCallStatus(callId, status)` | — | Direct table update |
| `listUnpaid(coproId)` | — | `v_unpaid_by_lot` |

**Requête supplémentaire** : charger les budgets de la période pour connaître leur type (`previsionnel` / `travaux`) et les métadonnées AG (via `budgets.ag_resolution_id`).

### 7.2 Génération PDF (avis d'appel)

Service `avis-appel-export.service.ts` à **déplacer** dans `src/features/finance/appels-fonds/services/` et **adapter** :
- Remplacer les types legacy (`AppelFonds`, `CoproprietaireAppel`) par les types API (`CallForFundsOverview`, `CallLineDetailed`)
- Signatures : `generateAvisAppelHTML(call: CallForFundsOverview, lines: CallLineDetailed[])` etc.

### 7.3 Archivage GED

Utiliser `autoFileToGED` avec convention sous-dossiers :
- Budget courant : `Appels de fonds/{exercice}/T{n} - {mois} {année}`
- Travaux : `Appels de fonds/{exercice}/Travaux/{nom_chantier}/Appel {n}`

### 7.4 Envoi multi-canal

Réutiliser le pipeline convocations (`ag_envoi_tracking`) adapté aux appels :
- Email via Resend (Edge Function)
- Courrier (PDF téléchargeable)
- Électronique (plateforme)

### 7.5 Relances

Infrastructure existante : tables `payment_reminder_rules`, vues `v_payment_reminders_overview`, `v_unpaid_with_reminders`.

Le module réutilise ce système configurable (seuils par copro) plutôt que les seuils fixes J+15/J+30/J+60. L'UI affiche les relances dues depuis `v_unpaid_with_reminders` et déclenche l'envoi via le service d'envoi.

### 7.6 Distinction budget courant / travaux

La distinction se fait côté frontend par le champ `budget_id` :
- **Budget courant** : `call_for_funds.budget_id` pointe vers un budget de type `'previsionnel'`
- **Travaux** : `call_for_funds.budget_id` pointe vers un budget de type `'travaux'`
- Le regroupement travaux par résolution AG se fait via `budgets.ag_resolution_id`

**Fonds ALUR** : hors scope de cette refonte. Les appels liés à un budget de type `'alur'` n'apparaissent pas dans ce module (traitement séparé dans le module fonds ALUR).

### 7.7 Enum legacy

L'enum `AppelFondsStatut` dans `src/types/enums/statuts.ts` (valeurs françaises : `BROUILLON`, `EMIS`, etc.) est **dépréciée**. Le nouveau module utilise exclusivement les valeurs DB anglaises (`draft`, `issued`, `partially_paid`, `paid`, `cancelled`). L'ancien enum sera supprimé avec le code legacy.

---

## 8. Migration DB requise

Une seule migration pour étendre la vue `v_call_lines_detailed` avec les tantièmes :

```sql
-- Ajouter lot_weight et key_total_weight à v_call_lines_detailed
-- Voir section 4 pour le SQL complet
```

Pas de modification de tables ni de triggers.

---

## 9. Code à supprimer

Tout le code legacy sera supprimé et remplacé :

```
# Composants legacy (37 fichiers)
src/components/features/finance/AppelsFonds/     → SUPPRIMER

# Hook monolithique
src/hooks/modules/useAppelsFonds.ts (832 lignes) → SUPPRIMER

# Page /calls (doublon)
src/app/(dashboard)/finance/calls/               → SUPPRIMER
src/features/finance/calls/                      → SUPPRIMER

# Service mock émission
src/lib/services/emission-appel.service.ts       → SUPPRIMER
src/lib/services/regles-modification-appel.service.ts → SUPPRIMER

# Enum legacy
AppelFondsStatut dans src/types/enums/statuts.ts → SUPPRIMER

# Hook page legacy
src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts → RÉÉCRIRE
```

**À conserver** :
- `src/lib/finance/api.ts` — fonctions API + types (`CallForFundsOverview`, `CallLineDetailed`, etc.)
- `src/hooks/modules/useFinanceData.ts` — hooks React Query (`useCalls`, `useCallLines`, `useCreateCall`, `useRecordPayment`)
- `avis-appel-export.service.ts` — à déplacer + adapter les types (voir §7.2)

---

## 10. Design system

Respecte le design system CoProFlex existant :
- Dark mode natif (surfaces `#1e2330`, fond `#0f1117`)
- Borders subtils `rgba(148, 163, 184, 0.2)`
- Stat cards avec icône colorée (40×40, fond rgba)
- Badges sémantiques (vert/ambre/rouge) en pill `border-radius: 9999px`
- Hover lift `transform: translateY(-1px)` + shadow-md
- Cards draft : `border-style: dashed` + `opacity: 0.65`
- Couleur travaux : violet `#A78BFA` / `rgba(167, 139, 250, 0.15)`
- Couleur budget courant : bleu `#2563eb` / `rgba(37, 99, 235, 0.15)`
- Font Inter, spacing multiples de 8px
- CSS Modules uniquement (pas de styles inline)
- Responsive : grille 2×2 → 1 colonne sur mobile, tableau scroll horizontal

---

## 11. Maquettes de référence

Les maquettes validées sont dans `.superpowers/brainstorm/67034-1773491862/appels-v5.html` (interactif, tabs + navigation détail).
