# KILL_ORDER.md - Plan de Suppression des Mocks (v2)

> **Date:** 2026-01-28 (v2 - corrigé)
> **Objectif:** Élimination méthodique des données mock/hardcodées
> **Méthode:** Solo, passes successives, validation après chaque étape

---

## FORMULE DE SCORING "BLAST RADIUS"

```
Score = (ConsumersCount × 2) + RoutesCount + (Provider ? 5 : 0) + (LocalStorageDB ? 5 : 0)
```

### Légende Actions

| Action | Description |
|--------|-------------|
| **NEUTRALIZE** | Supprimer mock, UI assume data absente (empty state) |
| **REPLACE** | Brancher Supabase (vue/table/RPC) à la place du mock |
| **DELETE** | Supprimer fichier/répertoire (uniquement si 0 consumer) |

---

## TOP 20 P0 - TRIÉS PAR BLAST RADIUS (SCORING STRICT)

| Rank | SourceID | Path | Consumers | Routes | Provider | LS_DB | **Score** | Action |
|------|----------|------|-----------|--------|----------|-------|-----------|--------|
| **1** | S001 | `src/data/mock/index.ts` | 83 | 25 | 0 | 0 | **191** | REPLACE |
| **2** | S010 | `providers/CurrentUserProvider.tsx` | 4 | 118 | 5 | 5 | **136** | NEUTRALIZE→REPLACE |
| **3** | S014 | AG hooks (localStorage) | 13 | 15 | 0 | 5 | **46** | REPLACE |
| **4** | S016 | `hooks/useGlobalVariables.ts` | 3 | 15 | 0 | 5 | **26** | REPLACE |
| **5** | S002 | `src/data/mock/documents-ged.ts` | 13 | 2 | 0 | 0 | **28** | REPLACE |
| **6** | S011 | `providers/ContractsProvider.tsx` | 1 | 12 | 5 | 5 | **24** | REPLACE |
| **7** | S003 | `src/data/mock/mail.mock.ts` | 8 | 2 | 0 | 0 | **18** | REPLACE |
| **8** | S005 | `src/shared/mock/finance.ts` | 5 | 3 | 0 | 5 | **18** | REPLACE |
| **9** | S012 | `features/communication/hooks/useWall*.ts` | 3 | 3 | 0 | 5 | **14** | REPLACE |
| **10** | S013 | `features/communication/hooks/useEvent*.ts` | 3 | 3 | 0 | 5 | **14** | REPLACE |
| **11** | S015 | `features/finance/budgets/useBudgetDetailPage.ts` | 1 | 1 | 0 | 5 | **8** | NEUTRALIZE |
| **12** | S017 | `lib/services/mail.service.ts` | 1 | 3 | 0 | 5 | **10** | REPLACE |
| **13** | S018 | `lib/services/contracts.service.ts` | 1 | 5 | 0 | 0 | **7** | NEUTRALIZE |
| **14** | S006 | `components/features/finance/AppelsFonds/mock-data.ts` | 2 | 1 | 0 | 0 | **5** | REPLACE |
| **15** | S004 | `src/data/mock/nouvelle-vente.mock.ts` | 3 | 1 | 0 | 0 | **7** | REPLACE |
| **16** | S019 | `lib/utils/alerts.ts` | 1 | 1 | 0 | 5 | **8** | NEUTRALIZE |
| **17** | S007 | `components/features/finance/Budget/mock-data.ts` | 1 | 1 | 0 | 0 | **3** | REPLACE |
| **18** | S009 | `src/lib/mock-data/` (34 fichiers) | 1 | 0 | 0 | 0 | **2** | NEUTRALIZE→DELETE |
| **19** | S008 | `components/features/finance/RelevesIndividuels/mock-data.ts` | 1 | 0 | 0 | 0 | **2** | DELETE |
| **20** | S020 | `lib/utils/mock-generator.ts` | 1 | 0 | 0 | 0 | **2** | DELETE |
| **21** | S021 | `hooks/useDevMockData.ts` | 1 | 0 | 0 | 0 | **2** | DELETE |

---

## DEPENDENCY GRAPH

```
S001 (data/mock/index.ts)
├── S011 (ContractsProvider) ─ dépend de S001
├── S016 (useGlobalVariables) ─ dépend de S001
├── S018 (contracts.service) ─ dépend de S001
├── S019 (alerts.ts) ─ dépend de S001 + S006
├── C003-C012 (hooks/modules/*) ─ dépendent de S001
├── C027-C035 (components/*) ─ dépendent de S001
└── 25 pages direct imports

S005 (shared/mock/finance.ts)
├── C015 (shared/services/financeApi.ts)
├── C016 (shared/hooks/useFinance.ts)
└── C029 (Budget components)

S002 (documents-ged.ts)
├── C027 (ged/hooks/*.ts)
├── C028 (ged/components/*.tsx)
└── C049 (DocumentViewerModal)

S003 (mail.mock.ts)
├── C013 (useComposeForm)
├── C014 (useMailListPage)
└── C031 (mail/*.tsx)

S010 (CurrentUserProvider) ─ STANDALONE (pas de dépendance mock externe)
└── Injecté via layout.tsx → 100 pages

S011 (ContractsProvider)
└── dépend de S001

S014 (AG localStorage)
├── dépend de S016 (useGlobalVariables)
└── 13 fichiers AG hooks

S006 (AppelsFonds/mock-data)
├── C004 (useAppelsFonds)
└── C030 (AppelsFonds components)

S004 (nouvelle-vente.mock)
└── C032 (NouvelleVenteForm, NouvelleVenteConfirmModal)
```

### Ordre de suppression sécurisé (dépendances)

1. **Feuilles d'abord** (pas de dépendants):
   - S008, S009, S020, S021 (DELETE direct)
   - S004, S007 (peu de consumers)

2. **Puis nœuds intermédiaires**:
   - S006, S003, S002 (consumers localisés)
   - S005 (finance isolé)

3. **Puis providers**:
   - S010 (CurrentUserProvider) - après Supabase Auth
   - S011 (ContractsProvider) - après S001

4. **Enfin racine**:
   - S001 (data/mock/index.ts) - après tous les consumers migrés
   - S014-S016 (localStorage/defaults) - en parallèle

---

## DÉTAIL TOP 10 - CE QU'IL FAUT FAIRE

### #1 - S001: data/mock/index.ts (Score: 191) - REPLACE

**Pourquoi #1:** 83 consumers, 25 routes directes. Source de quasi tout.

**Ce que je dois faire:**
1. Migrer chaque export vers une API Supabase (vue ou RPC)
2. Modifier les 83 consumers un par un pour utiliser les nouvelles sources
3. Supprimer le fichier quand 0 import restant

**Dépendances:** S011, S016, S018, S019 dépendent de ce fichier

**Commande vérif:**
```bash
rg -c "from '@/data/mock'" src --type ts
# Cible: 0
```

---

### #2 - S010: CurrentUserProvider (Score: 136) - NEUTRALIZE→REPLACE

**Pourquoi #2:** Provider injecté dans layout = toutes les 118 pages impactées

**Ce que je dois faire (2 étapes):**

**Step A - NEUTRALIZE (sans Supabase):**
1. Supprimer array `MOCK_USERS` (lignes 10-71)
2. `currentUser = null` par défaut
3. UI affiche "Non connecté" (empty state propre)
4. Supprimer export `MOCK_USERS` (ligne 149)
5. L'app fonctionne mais sans utilisateur actif

**Step B - REPLACE (avec Supabase Auth - plus tard):**
1. Configurer Supabase Auth
2. `useEffect` → `supabase.auth.getUser()`
3. Remplacer localStorage par session Supabase

**Dépendances:** Aucune (standalone)

**Commande vérif:**
```bash
rg -n "MOCK_USERS" src
# Cible: 0
```

---

### #3 - S014: AG localStorage (Score: 46) - REPLACE

**Pourquoi #3:** 13 fichiers, 15 routes AG. Workflow complet en localStorage.

**Ce que je dois faire:**
1. Créer tables Supabase: `ag_sessions`, `ag_votes`, `ag_presences`
2. Migrer chaque clé `ag-*` vers les tables correspondantes
3. Utiliser Supabase Realtime pour les votes temps réel

**Dépendances:** Dépend de S016 (useGlobalVariables)

**Commande vérif:**
```bash
rg -c "localStorage.*ag-" src --type ts
# Cible: 0 (sauf EPHEMERAL)
```

---

### #4 - S016: useGlobalVariables (Score: 26) - REPLACE

**Pourquoi #4:** Variables utilisées partout dans AG + documents

**Ce que je dois faire:**
1. Créer une RPC Supabase `get_copro_variables(copro_id)`
2. Remplacer les defaults `MOCK_CONTRAT_SYNDIC`, `MOCK_PARAMETRES`
3. Hook doit fetch depuis Supabase au lieu de retourner des constantes

**Dépendances:** Dépend de S001

**Commande vérif:**
```bash
rg -n "MOCK_CONTRAT_SYNDIC|MOCK_PARAMETRES" src/hooks
# Cible: 0
```

---

### #5 - S002: documents-ged.ts (Score: 28) - REPLACE

**Pourquoi #5:** GED complète mockée, 13 consumers

**Ce que je dois faire:**
1. Utiliser Supabase Storage + table `documents`
2. Remplacer `GED_FOLDERS`, `MOCK_DOCUMENTS_GED`
3. Adapter les hooks/components GED

**Dépendances:** Aucune

**Commande vérif:**
```bash
rg -c "from '@/data/mock/documents-ged'" src
# Cible: 0
```

---

### #6 - S011: ContractsProvider (Score: 24) - REPLACE

**Pourquoi #6:** Provider global = 12 pages maintenance

**Ce que je dois faire:**
1. Créer hooks Supabase pour `contrats`, `prestataires`, `assurances`
2. Remplacer les useState initialisés avec MOCK_*
3. Possibilité de supprimer le Provider si hooks suffisent

**Dépendances:** Dépend de S001

**Commande vérif:**
```bash
rg -n "MOCK_CONTRATS|MOCK_PRESTATAIRES|MOCK_ASSURANCES" src/providers
# Cible: 0
```

---

### #7 - S003: mail.mock.ts (Score: 18) - REPLACE

**Pourquoi #7:** Messagerie complète mockée

**Ce que je dois faire:**
1. Créer table `mail_messages` + `mail_folders`
2. Adapter les hooks mail
3. Supprimer le fichier

**Dépendances:** Aucune

**Commande vérif:**
```bash
rg -c "from '@/data/mock/mail.mock'" src
# Cible: 0
```

---

### #8 - S005: shared/mock/finance.ts (Score: 18) - REPLACE

**Pourquoi #8:** Backbone finance, 871 lignes

**Ce que je dois faire:**
1. Les tables finance existent probablement déjà
2. Adapter `shared/services/financeApi.ts` pour utiliser Supabase
3. Adapter `shared/hooks/useFinance.ts`
4. Supprimer le fichier mock

**Dépendances:** Aucune

**Commande vérif:**
```bash
rg -c "from '@/shared/mock/finance'" src
# Cible: 0
```

---

### #9-10 - S012/S013: Communication localStorage (Score: 14 each) - REPLACE

**Pourquoi:** Mur + Events 100% localStorage

**Ce que je dois faire:**
1. Créer tables `wall_posts`, `events`
2. Migrer les hooks pour fetch/write Supabase
3. Supprimer les clés localStorage

**Dépendances:** Aucune

**Commande vérif:**
```bash
rg -c "MUR_STORAGE_KEY|EVENTS_STORAGE_KEY" src
# Cible: 0
```

---

## PLAN EN 4 PASSES (RÉVISÉ)

### PASS 1: NEUTRALIZE (rapide, safe)

**Objectif:** Supprimer les fallbacks mock sans casser l'app (empty states)

**Fichiers:**
1. `features/finance/budgets/useBudgetDetailPage.ts` - supprimer `DEFAULT_BUDGETS`
2. `lib/services/contracts.service.ts` - supprimer init mock
3. `lib/utils/alerts.ts` - retourner `[]` au lieu de calculer sur mocks

**Commandes vérif:**
```bash
rg -n "DEFAULT_BUDGETS" src
rg -n "MOCK_" src/lib/services/contracts.service.ts
rg -n "MOCK_" src/lib/utils/alerts.ts
```

**Critère DONE:** 0 occurrence pour chaque pattern

---

### PASS 2: DELETE (fichiers sans consumers actifs)

**Objectif:** Supprimer les fichiers mock orphelins ou avec 0 consumer externe

**Fichiers à supprimer directement:**
1. `src/components/features/finance/RelevesIndividuels/mock-data.ts` (0 consumer)
2. `src/lib/utils/mock-generator.ts` (0 consumer externe)
3. `src/hooks/useDevMockData.ts` (0 consumer externe)
4. `src/services/recommande/mock.ts` (0 consumer externe)

**S009 (lib/mock-data/) - SÉQUENCE SPÉCIALE:**
- Consumer: `src/hooks/modules/useAGContext.ts:15`
- Step A: Modifier `useAGContext.ts` pour ne plus importer de `@/lib/mock-data`
- Step B: Vérifier `rg "from '@/lib/mock-data'" src` = 0
- Step C: Seulement alors `rm -rf src/lib/mock-data/`

**Commandes vérif:**
```bash
# Fichiers directs (0 attendu pour chaque)
rg "from '.*RelevesIndividuels/mock-data'" src
rg "mock-generator" src
rg "useDevMockData" src

# S009 - doit être 0 AVANT suppression
rg "from '@/lib/mock-data'" src
```

**Critère DONE:** Toutes les commandes retournent 0, puis `rm -rf`

---

### PASS 3: REPLACE (Providers + Services)

**Objectif:** Connecter Supabase aux providers/services

**Ordre d'exécution:**

#### 3.1 - S010 CurrentUserProvider (NEUTRALIZE D'ABORD)

**Step A - NEUTRALIZE (sans Supabase):**
1. Supprimer `MOCK_USERS` array (lignes 10-71)
2. `currentUser = null` si pas de session
3. UI affiche "Non connecté" proprement (empty state)
4. Supprimer export `MOCK_USERS` ligne 149
5. Vérif: `rg -n "MOCK_USERS" src` = 0

**Step B - REPLACE (avec Supabase Auth):**
1. Configurer Supabase Auth
2. `useEffect` qui appelle `supabase.auth.getUser()`
3. Remplacer localStorage par session Supabase

#### 3.2 - Autres providers/services
1. **S011** - ContractsProvider → Supabase hooks
2. **S017** - mail.service → Supabase
3. **S005** - shared/mock/finance → Supabase tables
4. **S002** - documents-ged → Supabase Storage

**Critère DONE:** `npm run build` réussit après chaque étape

---

### PASS 4: REPLACE (Data + localStorage) - WINS RAPIDES D'ABORD

**Objectif:** Migrer les sources principales et localStorage

**Ordre d'exécution (réordonné pour victoires rapides):**

#### 4.1 - Communication localStorage (WIN RAPIDE - 6 fichiers isolés)
1. **S012** - Wall hooks → Supabase `wall_posts` (3 fichiers)
2. **S013** - Events hooks → Supabase `events` (3 fichiers)
3. Vérif: `rg "MUR_STORAGE_KEY|EVENTS_STORAGE_KEY" src` = 0

#### 4.2 - Mock files simples
1. **S003** - mail.mock.ts (8 consumers)
2. **S004** - nouvelle-vente.mock.ts (3 consumers)
3. **S006** - AppelsFonds/mock-data.ts (2 consumers)
4. **S007** - Budget/mock-data.ts (1 consumer)

#### 4.3 - AG localStorage (COMPLEXE - Supabase Realtime)
1. **S014** - AG workflow localStorage → Supabase
2. Tables: `ag_sessions`, `ag_votes`, `ag_presences`, `ag_resolutions`
3. Activer Realtime pour votes en direct
4. Vérif: `rg "localStorage.*ag-" src` = 0 (sauf EPHEMERAL)

#### 4.4 - Fichier central (DERNIER)
1. **S001** - data/mock/index.ts → après tous consumers migrés
2. Vérif: `rg "from '@/data/mock'" src` = 0
3. `rm -rf src/data/mock/`

**Critère DONE:**
```bash
rg "@/data/mock|@/shared/mock" src && echo "FAIL" || echo "PASS"
find src -name "*mock*" -type f | wc -l  # Cible: 0
```

---

## CHECKLIST VALIDATION FINALE

```bash
# 1. Aucun import mock
rg "@/data/mock|@/shared/mock|@/lib/mock-data" src && echo "FAIL" || echo "PASS"

# 2. Aucun MOCK_* export/usage
rg "MOCK_[A-Z]" src --type ts && echo "FAIL" || echo "PASS"

# 3. localStorage BUSINESS_DATA = 0
# Voir: docs/audit/LOCALSTORAGE_BUSINESS_KEYS.txt pour la liste des 33 clés
# Script de validation inclus dans ce fichier

# 4. Aucun fichier mock restant
[ $(find src -name "*mock*" -type f | wc -l) -eq 0 ] && echo "PASS" || echo "FAIL"

# 5. Build réussi
npm run build && echo "PASS" || echo "FAIL"

# 6. Tests passent (si existants)
npm test && echo "PASS" || echo "SKIP"
```

---

## FICHIERS DE RÉFÉRENCE

| Fichier | Description |
|---------|-------------|
| `docs/audit/MOCK_INVENTORY.md` | Inventaire complet des sources et consumers |
| `docs/audit/KILL_ORDER.md` | Ce fichier - plan de suppression |
| `docs/audit/LOCALSTORAGE_BUSINESS_KEYS.txt` | Liste des 33 clés localStorage à migrer + script validation |

---

*Généré automatiquement v2.0 - Scoring et dépendances vérifiés*
