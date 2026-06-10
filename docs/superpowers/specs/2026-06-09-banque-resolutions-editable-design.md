# Banque de résolutions AG éditable par cabinet — SPEC (design)

> Chantier #3 sur 3 (après seed E2E ✅ et clôture/finalisation AG ✅). Décision USER : faire passer la
> banque de modèles de résolutions du **code** (constante figée) vers la **base**, **éditable par cabinet**
> (et par copropriété — cf. D6).
> Cadre : tranche verticale fine, finance-first (cette feature ne touche PAS le grand livre).
> Stack réelle : Next.js 16 + React 19 + TypeScript strict (jamais `any`) + CSS Modules + Supabase (npm / ESLint).
>
> **Révisée après revue adversariale 5 angles + arbitrages USER (2026-06-09)** — corrige : décompte réel
> (100, pas ~60), blocage CHECK catégorie, `cabinet_id` nullable, helper RLS cabinet manquant, policies à
> shipper, liste des consommateurs, parité de test. **Décisions USER intégrées** : majorités → ART_25 +
> passerelle 25-1 (A) ; **ajout `copro_id` pour modèles propres à une copro (B)** ; store localStorage
> `custom-resolutions-library` abandonné, non migré (D).

---

## 1. Contexte & problème

La banque est aujourd'hui une **constante TypeScript figée** : `RESOLUTIONS_BANK` (**100 modèles**, 15
catégories réellement utilisées) dans `src/lib/constants/resolutions.ts` (1718 lignes). Elle est lue
**partout en synchrone** par plusieurs fichiers (bibliothèque, constructeur d'ordre du jour, création d'AG).

L'interface `ResolutionTemplate` porte **déjà** tous les champs d'un monde multi-cabinet (`scope`,
`ownerOrgId`, `status`, `version`, `usageCount`, `legalRef`, `action_type`…) mais **non branchés**.

**Pourquoi ça n'a jamais été fait** (tracé dans `.planning/`) : appli née sur des listes-en-dur ; la
reconstruction de la base s'est limitée à « ce qui POSTE le grand livre » (`db-cible/04-ag-gouvernance.md`
§0) → un catalogue ne poste rien, absent du blueprint ; la page bibliothèque marche en lecture de la
constante (`atlas/front-01-ag.md`, `ag/resolutions/` = « actif ») → aucune douleur ne forçait la migration.

**Précédent maison pour la TABLE** : `email_templates` (migration `0016`, lignes 197-227) — « modèles
système `copro_id NULL` + personnalisables par tenant », unicité partielle `WHERE … IS NULL`, trigger
`set_updated_at`, FK `ON DELETE`, **et policies RLS shippées sous interrupteur** (`0034` lignes 784-796).
On calque ces conventions. **Divergences assumées** :
1. **Cloisonnement par `cabinet_id` + `copro_id`** (3 niveaux, cf. D6) — un syndic réutilise son catalogue
   sur toutes ses copros, mais peut aussi garder un modèle propre à une copro.
2. **Architecture de LECTURE neuve** : `email_templates` se lit par requête directe à la demande
   (`finance/api.ts:1390+`). Notre cache+provider (§5) **n'a pas de précédent dans le repo** — justifié par
   la lecture massive quasi-synchrone par plusieurs écrans AG (voir §5).

---

## 2. Objectif & périmètre

**Objectif** : une banque en base, **source unique**, où chaque cabinet voit les modèles système (lecture
seule) + ses propres modèles (cabinet ou propres à une copro) qu'il peut créer / modifier / dupliquer /
**supprimer**, bout en bout et testable.

**Périmètre (tranche verticale fine)** : table `resolution_templates` + seed des 100 modèles système (avec
nettoyage **structurel**) + lecture via copie mémoire + CRUD cabinet/copro minimal + extension de la page
bibliothèque existante.

**Hors-scope (YAGNI, assumé)** : modèles `'shared'` inter-cabinets · historique/diff de versions ·
incrément auto de `usage_count` · **ajout de nouveaux `action_type`** (gelé — dette tracée §4.2) · masquage
des modèles système (coupé) · activation RLS définitive en prod (phase dev) · réécriture du `localStorage`
`ag-resolutions-<agId>` (état de travail d'une AG ≠ banque). **NB (décision D)** : le store localStorage
`custom-resolutions-library` est **abandonné, non migré** — la page de résolutions lira la table (§6.3).

---

## 3. Décisions verrouillées (brainstorm + revue + arbitrages USER)

| # | Décision | Détail |
|---|----------|--------|
| D1 | **Périmètre** | Tranche verticale fine. |
| D2 | **Modèle d'édition** | **Duplication (fork)**. Système en lecture seule (référence centrale). Le cabinet duplique / crée de zéro. |
| D3 | **Suppression** | Le cabinet **supprime ses propres copies** (hard delete). Système intouchable. Sûr (invariant I1). |
| D4 | **Contenu** | Nettoyage **structurel** au seed (liste nommée §4.2). **Aucun nouvel `action_type`**. |
| D5 | **Architecture de lecture** | **Cache au chargement** (snapshot mémoire), rafraîchi après mutation. Helpers de lecture rendus **purs**. Archi neuve (§1). |
| D6 | **Cloisonnement (3 niveaux)** | `cabinet_id` (du gestionnaire courant `profiles.cabinet_id`) **+ `copro_id` nullable**. **Système** (rien) / **cabinet** (`cabinet_id`) / **cabinet+copro** (`cabinet_id` + `copro_id`, propre à une copro). |
| D7 | **Identifiant** | `id uuid` PK + `code text` lisible **unique pour système** (`ag-01`…) ; **`code NULL` imposé** pour les modèles cabinet/copro (CHECK). |
| D-A | **Majorités légales** | `cs-02`/`cs-04`/`cs-05` : **ART_24 → ART_25** + passerelle **25-1** documentée. |
| D-D | **Store local** | `custom-resolutions-library` **abandonné, non migré** (repart de zéro). |

---

## 4. Modèle de données

### 4.1 Table `resolution_templates` (migration `0042` — structure + helper + policies)

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK `pk_resolution_templates` |
| cabinet_id | uuid | YES | | FK `cabinets(id) ON DELETE CASCADE` — **NULL = système** |
| copro_id | uuid | YES | | FK `copros(id) ON DELETE CASCADE` — **set = propre à cette copro** (exige cabinet_id) |
| code | text | YES | | lisible (`ag-01`…) ; **NON NULL système / NULL cabinet** (CHECK) |
| titre | text | NO | | |
| categorie | text | NO | | CHECK ∈ liste canonique (note ci-dessous) |
| texte | text | NO | | corps templatisé (`{variables}`) |
| majorite | text | NO | | CHECK ∈ ART_24/25/25_1/26/26_1/UNANIMITE/INFORMATION — **store texte front-only** (§5.3) |
| is_information | boolean | NO | false | point d'information sans vote |
| applicable_ag | text[] | YES | | NULL = applicable à TOUS (NULL sémantique) |
| obligatoire_pour | text[] | NO | '{}' | types d'AG où la résolution est obligatoire |
| ordre_suggere | int | YES | | ordre dans l'ordre du jour |
| tags | text[] | NO | '{}' | recherche **en mémoire** (pas d'index SQL) |
| variables | text[] | NO | '{}' | liste simple (rétrocompat interface) |
| variables_typees | jsonb | NO | '[]'::jsonb | définitions typées (`VariableDefinition[]`) |
| scope | text | NO | 'system' | CHECK ∈ (system, org) ; 'org' = cabinet OU cabinet+copro ; 'shared' réservé |
| status | text | NO | 'active' | CHECK ∈ (active, deprecated, draft) |
| legal_ref | text | YES | | référence juridique |
| version | text | NO | '1.0' | |
| deprecated_by | uuid | YES | | FK auto-réf `resolution_templates(id)` **`ON DELETE SET NULL`** |
| action_type | text | YES | | action auto si adoptée (gelé) |
| usage_count | int | NO | 0 | non auto-incrémenté en tranche fine |
| created_by | uuid | YES | | FK `profiles(id) ON DELETE SET NULL` |
| created_at / updated_at | timestamptz | NO | now() | trigger `set_updated_at` |

**Contraintes** :
- `pk_resolution_templates` PRIMARY KEY (id).
- `ck_resolution_template_scope` : `(cabinet_id IS NULL) = (scope = 'system')`.
- `ck_resolution_template_copro` : `copro_id IS NULL OR cabinet_id IS NOT NULL` (un modèle copro appartient à un cabinet).
- `ck_resolution_template_code` : `(cabinet_id IS NULL AND code IS NOT NULL) OR (cabinet_id IS NOT NULL AND code IS NULL)`.
- `uq_resolution_templates_code_system` UNIQUE `(code) WHERE cabinet_id IS NULL`.
- CHECK `categorie` / `majorite` / `scope` / `status` ∈ listes.
- FK `cabinet_id` (CASCADE), **`copro_id` (CASCADE)**, **`deprecated_by` (SET NULL — explicite)**, `created_by` (SET NULL).
- **Trigger `enforce_template_copro_cabinet`** : si `copro_id` set, vérifie `copros.cabinet_id = NEW.cabinet_id`
  (la copro appartient bien au cabinet propriétaire). Calqué sur le motif `enforce_copro_consistency` maison.

**Index** : pkey ; `(cabinet_id, copro_id)` ; `(categorie)` ; `(scope, status)` ; partiel unique code système.
**Pas de GIN** : la recherche se fait 100 % en mémoire sur le snapshot (§5).

**Catégorie canonique (corrige B1 de la revue)** : `reglement-01..05` utilisent `'Modification du règlement
de copropriété et des lots'` (`resolutions.ts:829…`), **absente** de `CATEGORIES_RESOLUTIONS`. **Le nettoyage
0043 renomme ces 5 lignes → `'Modification du règlement'`** (libellé canonique court). Le CHECK liste les 15
catégories réellement semées + `Divers` (réservée futurs modèles cabinet). Test : tout `categorie` du seed ∈ CHECK.

**Helper RLS (migration `0042`)** : `user_is_cabinet_manager(p_cabinet_id uuid)` SECURITY DEFINER, vrai si
`profiles.cabinet_id` de `auth.uid()` = `p_cabinet_id` et rôle ∈ (gestionnaire, admin) — calqué sur la
logique interne de `user_is_copro_manager` (`0023:155-157`). Les helpers existants sont **par copro**, pas par cabinet.

**Policies RLS (migration `0042`, env-gated OFF comme `0034`)** :
- SELECT : `cabinet_id IS NULL` (système, lecture publique authentifiée) **OU** `user_is_cabinet_manager(cabinet_id)`.
- INSERT/UPDATE/DELETE : `cabinet_id IS NOT NULL AND user_is_cabinet_manager(cabinet_id)` (jamais le système).
  Le `copro_id` ne change pas la garde RLS (un gérant de cabinet gère tous ses modèles, cabinet-wide et copro).

### 4.2 Seed des 100 modèles système (migration `0043`)

Génère les lignes système **depuis `RESOLUTIONS_BANK`** (`cabinet_id NULL`, `copro_id NULL`, `scope 'system'`,
`code` = id actuel), **puis** applique le nettoyage **structurel nommé** (liste figée + commentée dans la migration) :

1. **Catégories** : `reglement-01..05` → `'Modification du règlement'`.
2. **Dédoublonnage quitus** : garder `ag-05` « Quitus au syndic » (porte `GRANT_QUITUS`, obligatoire) ;
   **requalifier `fin-10`** en `INFORMATION` « Prise d'acte de la situation de trésorerie » (retirer
   « quitus »), corriger sa collision `ordre_suggere=6`.
3. **⚖️ Majorités légales (D-A, confirmé USER)** : `cs-02` (élection CS), `cs-04` (nomination syndic),
   `cs-05` (renouvellement syndic) : **ART_24 → ART_25**. Commentaire seed : **passerelle art. 25-1**
   applicable (2nd vote à la majorité simple si la résolution a recueilli ≥ 1/3 des voix) — gérée au vote
   par le moteur (`ART_25_1` existe déjà comme type de majorité). Aligne banque + loi + moteur (`0030:710-712`).
4. **Dette `action_type` tracée (gel assumé)** : commentaire listant les résolutions à effet réel laissées
   **sans** `action_type` (ex. `fin-09` emprunt, `travaux-08/09/10` gros travaux, `travaux-11` PPT) — pour
   tracer/prioriser la dette. **Aucun ajout** dans cette tranche.

**Cardinalité testée** : `N = 100` modèles système moins les dédoublonnages effectifs — figer le nombre
exact attendu après nettoyage dans le harnais (pas de « ~ »).

---

## 5. Architecture de lecture (cache — archi neuve assumée)

### 5.1 Provider + hook + dérivation cabinet/copro

- **`ResolutionTemplatesProvider`** (monté dans `(dashboard)/layout.tsx`, dans `CoproProvider`). Il connaît :
  - le **cabinet** = `profiles.cabinet_id` de `auth.uid()` (réutiliser un contexte profil/auth existant) ;
  - la **copro active** = `currentCoproId` de `CoproContext` (nécessaire pour les modèles propres à une copro, D6).
- **Un** `SELECT` :
  `WHERE cabinet_id IS NULL`  *(système)*
  `OR (cabinet_id = <cabinet> AND copro_id IS NULL)`  *(cabinet)*
  `OR (cabinet_id = <cabinet> AND copro_id = <copro active>)`  *(propre à la copro active)*.
  Snapshot en mémoire ; **rafraîchi si cabinet OU copro active change**. Expose `templates`, `isLoading`,
  `error`, `refresh()`, `cabinetId`, `coproId`.
- **Cas `cabinet_id` null** (corrige la fausse hypothèse NOT NULL — `supabase.ts:4039` = `string | null`) :
  charger **système uniquement**, **CRUD cabinet désactivé**. `fetchTemplatesForCabinet` ne doit **jamais**
  émettre `cabinet_id = NULL` en SQL.

### 5.2 Helpers purs

Fonctions de `resolutions.ts` rendues **pures** (source injectée), logique inchangée :
`getResolutionsForAGType`, `getResolutionsObligatoires`, `getResolutionById`, **`getResolutionByTitle`**
(oubli revue — `useAgAgendaPage.ts:87` remappe `templateId`), `getResolutionsByCategorieForAGType`,
`getResolutionsSuggerees`, `searchResolutions`, `getResolutionsByCategory`, `getCategories`.
**`RESOLUTIONS_STATS`** (figé à l'import, 0 consommateur) : **supprimé**.

**Ripple wrappers** : `ag-resolutions.ts` enveloppe ces helpers → propager `templates` aux wrappers ET à
leurs appelants (§11). Wrappers recevant le snapshot depuis le hook.

### 5.3 Création d'AG (corrige B2 — sans cabinet)

`createStandardResolutions` n'a besoin que des **obligatoires**, toujours **modèles SYSTÈME** (`cabinet_id
NULL`) → fetch direct `WHERE cabinet_id IS NULL AND obligatoire_pour @> ARRAY[typeAG]`. **Aucun `cabinet_id`
requis** (le blocage relevé disparaît). Mapping `majorite` front → enum DB AG inchangé. **Trou documenté** :
`INFORMATION` absent de l'enum `majority_type` → fallback `art24` (intentionnel) ; vérifier qu'aucun modèle
`INFORMATION` n'est dans `obligatoire_pour`.

### 5.4 `useResolutionLibrary` — refactor des deps (PAS « inchangé »)

Les `useMemo`/`useCallback` ferment sur `RESOLUTIONS_BANK` avec deps vides
(`useResolutionLibrary.ts:188,192,348,356,377`) → **ajouter `templates` aux dépendances** (sinon
stale-closure). Idem `BibliothequeResolutions.tsx`. Logique de filtrage/tri identique ; sources + deps changent.

---

## 6. CRUD cabinet / copro

### 6.1 Module `src/lib/ag/resolutionTemplates/api.ts`

Résultats typés `ApiResult<T>`. Mutations **gardées contre `cabinetId` null** :
- `fetchTemplatesForCabinet(cabinetId | null, coproId | null)` → système (+ cabinet + copro active si non null).
- `createTemplate(cabinetId, payload, coproId?)` → ligne cabinet (`scope 'org'`, `code NULL`) ; `coproId` set
  = **propre à cette copro**. Refuse si cabinetId null.
- `updateTemplate(id, patch)` → **refuse si `cabinet_id IS NULL`** (système).
- `duplicateTemplate(fromId, cabinetId, coproId?)` → copie en nouvelle ligne cabinet, optionnellement copro.
- `deleteTemplate(id)` → **hard delete, refuse si `cabinet_id IS NULL`**.

Chaque mutation → `refresh()` (état « en cours » sur le bouton ; pas d'optimistic update nécessaire).

### 6.2 UI (extension de l'existant)

`BibliothequeResolutions` + `ResolutionCard` + `VariableEditor` : badge **Système (lecture seule)** /
**Cabinet** / **Cette copro** ; actions **Dupliquer** (tous), **Modifier / Supprimer** (cabinet+copro
uniquement, confirmation) ; filtre « Mes modèles » (= `scope: org`). À la création/duplication, un choix
**« pour mon cabinet » vs « pour cette copropriété seulement »** (positionne `copro_id`). Modale éditeur
réutilisant `VariableEditor`. CSS Modules, design system maison.

### 6.3 Store localStorage `custom-resolutions-library` — abandonné (D-D)

`useAgResolutionsPage.ts:41-60` maintient des modèles perso en localStorage. **Non migré** (repart de zéro) :
on cesse de le lire/écrire ; les « modèles personnalisés » de cette page proviennent désormais des lignes
cabinet/copro (`scope 'org'`) de la table. Store local traité comme mort (à purger).

---

## 7. Sécurité (RLS)

- Policies **écrites dans `0042`** (§4.1), **env-gated OFF** comme `email_templates`/`0034` (phase dev, pas
  de ré-alerte).
- Modèle : système = lecture publique authentifiée ; cabinet/copro = `user_is_cabinet_manager(cabinet_id)`.
  `platform_admin` transverse (avec le reste du modèle cible).
- **Garde applicative immédiate** (active en dev) : `update`/`delete` refusés si `cabinet_id IS NULL` ;
  `create` refusé si cabinet courant null.

---

## 8. Gestion d'erreurs

- Couche data en résultats typés ; toasts UI.
- Échec `refresh()` **non bloquant** (dernier snapshot conservé) ; après un `create`, éviter que la carte
  « disparaisse » (optimistic léger acceptable).
- Validation création/édition : `titre`/`texte` non vides, `majorite` ∈ liste, `categorie` ∈ liste.
- Premier accès cache froid : état « chargement ».

---

## 9. Invariants & risques

| id | Invariant / risque | Mitigation |
|---|---|---|
| I1 | **Suppression référentiellement sûre** | Aucun FK entrant vers `resolution_templates` (grep + dump live) — **contrairement à `email_templates`** (référencée par `payment_reminder_rules.template_id`). `ag_resolutions` n'a pas de colonne template, le texte est **recopié**. **Correction revue** : `templateId` EST recopié dans `ag_session_drafts.draft_data` (jsonb, via `useAgResolutionsPage.ts:166`), **sans FK ni jointure** → suppression sûre ; au pire un `templateId` obsolète traîne dans un brouillon non clôturé (inoffensif). |
| I1b | **`deprecated_by` self-ref** | **`ON DELETE SET NULL` explicite** (sinon DELETE rejeté, contredit D3) + test harnais (A.deprecated_by=B, DELETE B → A NULL, DELETE OK). |
| I2 | **Parité seed ↔ constante nettoyée** | **Parité champ-à-champ** (`id, categorie, majorite, action_type, obligatoire_pour, ordre_suggere, texte`) — pas seulement présence des obligatoires (sinon faux-vert sur majorité/catégorie). |
| I3 | **Ripple sync→async** | Cache + liste §11 reconstruite (« lit la banque au runtime ») + propagation `templates` aux wrappers. |
| I4 | Cohérence `scope`/`cabinet_id`/`copro_id`/`code` | CHECK scope + copro + code + trigger copro∈cabinet. |
| I5 | **Codes système consommés par la logique** | `variable-resolution.ts:195` fait `find(r => r.templateId===code)` sur `ag-01/02/03` (bureau PV) — sûr car codes **système, jamais supprimables** → test : delete d'un code système refusé. |

---

## 10. Tests (cadence 3-checks + harnais par migration)

- **SQL (docker psql + gate)** : table + helper + policies + trigger créés ; **toute `categorie` du seed ∈
  CHECK** ; seed = **N exact** ; CHECK scope/copro/code tiennent ; unicité code système ; trigger
  copro∈cabinet rejette une copro étrangère ; modèle copro visible uniquement pour sa copro (requête cache) ;
  `duplicate` crée une ligne cabinet/copro ; `update`/`delete` système **refusés** ; `delete` copie OK ;
  **`deprecated_by` SET NULL** (I1b) ; cascades FK.
- **Vitest** : helpers purs (fixtures) ; provider/cache (charge, cabinet null → système-only, copro active,
  refresh) ; CRUD ; **parité champ-à-champ I2**.
- **Harnais copro** : création d'AG → mêmes obligatoires (système) depuis le seed que depuis l'ancienne constante.

---

## 11. Fichiers touchés (critère « lit la banque au runtime »)

**Lecteurs réels (à rebrancher)** :
- `src/lib/constants/resolutions.ts` (helpers → purs ; constante = source seed + fixtures ; `RESOLUTIONS_STATS` supprimé).
- `src/hooks/modules/useResolutionLibrary.ts` (deps useMemo/useCallback).
- `src/components/features/ag/BibliothequeResolutions/BibliothequeResolutions.tsx`.
- `src/features/ag/hooks/useAgAgendaPage.ts` (`getResolutionByTitle`).
- `src/lib/utils/ag-resolutions.ts` (wrappers) **+ appelants** `src/features/ag/hooks/useAgNewPage.ts`, `…/InfoBox.tsx`.
- `src/lib/ag/create-standard-resolutions.ts` (fetch système, §5.3) **+ appelant** `src/features/ag/new/hooks/useAgCreateForm.ts`.
- `src/features/ag/hooks/useAgResolutionsPage.ts` (abandon `custom-resolutions-library`, §6.3 ; source = table).

**Nouveau** : `ResolutionTemplatesProvider`, `useResolutionTemplates`, `resolutionTemplates/api.ts`,
migrations `0042` / `0043`, harnais SQL.

**PAS touchés (imports type/constante uniquement)** : `useResolutionVariables.ts`, `AddToAGModal.tsx`,
`ResolutionCard.tsx`, `VariableEditor.tsx`.

**Contexte** : `CoproContext` / contexte profil — exposer `cabinet_id` (`profiles.cabinet_id`) ;
`currentCoproId` déjà exposé (utilisé pour les modèles propres à une copro).

---

## 12. Séquence d'implémentation (proposée pour le plan)

1. **`0042`** table + `copro_id` + `user_is_cabinet_manager` + policies (OFF) + trigger copro∈cabinet + harnais → gate.
2. **`0043`** seed système (nettoyage nommé §4.2, dont D-A) + parité champ-à-champ → gate.
3. **Helpers purs** + suppression `RESOLUTIONS_STATS` + fixtures + vitest (iso-comportement).
4. **Provider + hook + `api.ts`** (fetch/CRUD, gardes cabinet null, dimension copro) + exposition `profiles.cabinet_id`.
5. **Rebranchement** §11 (deps, wrappers, `getResolutionByTitle`, fetch création d'AG) + parité I2.
6. **UI CRUD** (badges 3 niveaux, sélecteur cabinet/copro, dupliquer/modifier/supprimer) + abandon store local (§6.3).
7. Type-check + ESLint + vitest + harnais verts (« terminé »).

---

## 13. Décisions USER — statut

- **A — Majorités légales** ✅ **tranché** : `cs-02`/`cs-04`/`cs-05` → ART_25 + passerelle 25-1 documentée (§4.2-3).
- **B — Modèles propres à une copro** ✅ **tranché** : **ajout `copro_id`** (3 niveaux, D6 / §4.1 / §5.1 / §6).
- **C — Libellé catégorie** : défaut retenu = renommer les 5 `reglement-*` → `'Modification du règlement'`
  (court canonique). *Dis-moi si tu préfères garder le libellé long.*
- **D — Store local** ✅ **tranché** : `custom-resolutions-library` abandonné, non migré (§6.3).
- **E — `usage_count`** : défaut retenu = colonne présente, **non alimentée** dans cette tranche (branchée plus tard).
