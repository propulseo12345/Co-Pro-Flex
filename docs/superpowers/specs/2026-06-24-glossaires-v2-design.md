# Glossaires v2 — Design (chantier `GLOSS-`)

- **Date** : 2026-06-24
- **Statut** : design validé (brainstorming) — **amendé le 2026-06-24 suite à l'audit expert copro**
  (workflow multi-agents : 7 findings à enjeu confirmés en contre-vérification adversariale, 0 écarté).
- **Objectif** : doter la construction v2 d'un **vocabulaire commun centralisé** (humains + agents) pour
  tuer l'éparpillement et les bugs nés d'un même concept nommé de dix façons.

> Premier des trois livrables du socle de construction v2. Les deux suivants (garde-fou
> anti-fragmentation · capitalisation des 5 principes de conception) sont **hors scope ici**
> et feront chacun leur propre cycle brainstorming → spec → plan.

---

## 1. Contexte & problème

La refonte v2 se construit from-scratch (`v2-tanstack/`), la base (`supabase/`) restant le cœur
partagé et **source unique** des chiffres. Aujourd'hui le vocabulaire métier est **dispersé** :
`business-rules.md` (règles, pas définitions), mémoires, schéma `accounts`, `REFONTE_DECISIONS`,
`CARTE_DOUBLONS`. Conséquence : un même concept porte plusieurs noms (`110`/`12`, `120`/`478`,
appel/`call_for_funds`…) → on recopie le mauvais exemple (« deux patterns qui coexistent »).

Un **glossaire** corrige ça : un mot canonique, une définition, les synonymes bannis.

## 2. Décisions validées (brainstorming 2026-06-24)

- **GLOSS-1 — Périmètre** : on conçoit **le glossaire d'abord**. Anti-fragmentation et capitalisation
  des 5 principes suivront, chacun son tour.
- **GLOSS-2 — Deux glossaires, deux registres** : glossaire **métier** (copro + compta) et glossaire
  **technique** (jargon de code/projet) séparés. Un mot ne va que dans **un** des deux.
- **GLOSS-3 — Portée** : métier = copro **+ comptabilité** (zone la plus piégeuse → garde-fou) ;
  technique = jargon projet. **Exclus** : les concepts de programmation générale.
- **GLOSS-4 — Remplissage hybride** : un **noyau initial** (les termes les plus piégeux) maintenant,
  puis **enrichissement au fil de l'eau**, obligation **gravée dans la note auto-réinjectée**
  (`rules-v2.md`). ⚠️ La règle doit être **transverse — y compris aux PR de rename/typo** (sinon
  l'exemption « rename pur » de `rules-v2.md` la neutralise, beaucoup d'arbitrages de glossaire
  *étant* des renames).
- **GLOSS-5 — Emplacement : à la racine `Co-Pro-Flex/`**. Doc transverse qui coiffe la base
  (`supabase/`, partagée), les specs et le front. (Écarté : `v2-tanstack/`, qui couperait le
  glossaire de la base — le cœur métier.)
- **GLOSS-6 — Format** : celui du skill `domain-modeling`
  (`.agents/skills/domain-modeling/CONTEXT-FORMAT.md`) : **terme en gras** + définition d'1-2 phrases
  (ce que c'**est**) + `_Avoid_:` les synonymes **bannis**. Pour chaque **terme légal/comptable**,
  ajouter une ligne `Implémentation:` pointant la fonction SQL (fn_annexe_N, post_alur_transfer…)
  pour que la définition humaine et le code ne divergent jamais.

## 3. Architecture des fichiers

```
Co-Pro-Flex/
├── CONTEXT.md                          ← Glossaire MÉTIER (copro + compta)   [NOUVEAU]
├── docs/claude/glossaire-technique.md  ← Glossaire TECHNIQUE (jargon projet) [NOUVEAU]
├── supabase/                           ← la base (ce que le glossaire métier décrit surtout)
└── v2-tanstack/                        ← le front qui CONSOMME ce vocabulaire
```

`CONTEXT.md` est rangé en **sections** : `Structure (lots/tantièmes)` · `Finance / Grand livre` ·
`Clôture / Annexes` · `AG / Gouvernance` · `Ventes / État daté` · `Maintenance / Tiers` ·
`GED / Communication`.

## 4. Noyau initial (corrigé après audit)

### 4.1 Les cotisations — un QUATUOR de natures à ne JAMAIS mélanger

| Nature | Créance (appel) | Produit / réserve | Solde en attente (résultat) | Régime |
|--------|-----------------|-------------------|-----------------------------|--------|
| **Courant** (art. 14-1) | 450-1 | **701** (produit) | **478** (ex-120) | charges courantes |
| **Travaux votés** (art. 14-2 / vote 24-25-26) | 450-2 | **702** (produit) | **12** (ex-110) | travaux |
| **Avance / fonds de roulement** (art. 35) | 450-3 | **1031** (réserve) | — | **REMBOURSABLE au vendeur** en mutation |
| **Fonds travaux ALUR** (art. 14-2 II) | 450-5 | **105** → **705** (affectation) | — | **NON remboursable**, acquis au syndicat |

+ **450-4** emprunts, **459** créances douteuses. La nature est portée par `accounts.nature`
(enum `account_receivable_nature`), source de vérité.
**`_Avoid_` croisé clé** : *avance art. 35 ≠ fonds de travaux ALUR* (même mot « fonds », régime
opposé — la confusion la plus piégeuse du domaine).

### 4.2 Trois mots à NE PAS confondre (sinon mauvais compte au crédit)

- **Appel de fonds** = le *document* / la créance (côté 450-x). Canonique `appel de fonds` ≡
  `call_for_funds`. `_Avoid_` : **uniquement** l'inverse FR↔EN — **jamais** « provision » ni « cotisation ».
- **Provision** = le *produit* appelé d'avance sur budget voté : **701** courant / **702** travaux.
- **Cotisation** = réservé au **fonds ALUR** (art. 14-2 II), contrepartie le **105** (jamais 701/702).

### 4.3 Cut-off / régularisation (rattachement à l'exercice, art. 14-3) — 4 instruments, sens distincts

- **408** = Charges à payer (facture non parvenue) → **PASSIF**, `D 6x / C 408`.
- **486** = Charges constatées d'avance → **ACTIF**, *diminue* la charge, `D 486 / C 6x`.
  `_Avoid_` : ne **jamais** appeler le 486 « charge à payer ».
- **487** = Produits constatés d'avance → PASSIF. **461/462** = Produits à recevoir.
  (Pas de **418** dans notre plan copro.)
- Tous **contre-passés en N+1** (`reverse_period_cutoff`).

### 4.4 Soldes en attente — piège de renommage

- **12** (ex-110) = solde en attente **TRAVAUX**. `_Avoid_` : 110.
- **478** (ex-120) = solde en attente **COURANT**. `_Avoid_` : 120.
- ⚠️ **Noms de code internes trompeurs** : `mv_120`/`result_to_478` suivent le **COURANT** (478),
  `mv_110`/`result_to_12` le **TRAVAUX** (12) — figés par `CREATE OR REPLACE VIEW`, présents jusque
  dans `src/types/supabase.ts`. Ne pas s'y fier : lire le `code`.

### 4.5 Exercice & temps

- **Exercice comptable** = période annuelle de gestion (table `accounting_periods`, bornée par
  `exercice_debut`). Cycle : `open` (seul statut où l'écriture au GL est permise) → `closed`
  (clôture **technique**, `close_period`) → `approved` (comptes **approuvés en AG**, `approve_period` —
  dès lors **intangible**). L'exercice n'est **pas voté** ; c'est l'**approbation des comptes** qui se vote.
  `_Avoid_` : « period »/« période » en libellé métier ; **clôture d'exercice ≠ clôture d'AG** ;
  exercice ≠ année civile si `exercice_debut ≠ janvier`.

### 4.6 Structure (lots / tantièmes)

- **Clé de répartition** = règle de ventilation d'une catégorie de charges (`repartition_keys`).
- **Quote-part** = poids d'un lot dans une clé = `repartition_key_lines.weight`, **SOURCE UNIQUE**.
- **Tantième / Millième** = expression de la quote-part (millième = base 1000). Trois sens à
  distinguer (tantième de copropriété = poids dans la clé *générale*, base des majorités AG ;
  base de répartition d'une clé ; tantième de charges d'une clé spéciale). `_Avoid_` : **stocker des
  colonnes `tantiemes_*` sur le lot** (supprimées du schéma — vaut aussi pour les vues/tests legacy
  survivants). Base légale : art. 5 & 10 loi 65-557 ; art. 5 décret 67-223 (répartition des charges).

### 4.7 Acteurs (doublons à trancher)

- **Syndic** (mandataire légal du syndicat, art. 18) / **Cabinet** (l'entité SaaS multi-copro,
  table `cabinets`) / **Gestionnaire** (rôle applicatif back-office, `user_is_copro_manager`).
  `_Avoid_` : « manager » en libellé métier français.
- **Tiers** = annuaire unique (`tiers`), rôle porté par flags. **Fournisseur** (`is_supplier`,
  facture → 401/408) / **Prestataire** (`is_provider`, ordre de service) / **Notaire** (`is_notary`).
  `_Avoid_` : recréer un enum `tiers_type` ; tables `suppliers`/`providers` (inexistantes).

### 4.8 Ventes / État daté

- **Mutation** = transfert de propriété d'un lot (`mutations`, workflow 6 jalons). `_Avoid_` :
  vente / cession / transfert en libellé canonique.
- **Pré-état daté** (type `pre`, information avant compromis, non opposable) vs **État daté**
  (art. 5 décret 67-223, type `final`, pièce opposable à la signature, identité des parties
  **figée/immuable**, 3 parties : débiteur 45x / créditeur 45x *hors 450-5 ALUR* / acquéreur).
- **Opposition (art. 20)** = acte du syndic notifié au notaire pour retenir sur le prix les sommes
  dues par le vendeur. *(Au fil de l'eau si pas encore codée — garder la fiche pour éviter les synonymes.)*

### 4.9 AG / Gouvernance & Clôture / Annexes

- **Conseil syndical** (organe élu de contrôle, art. 21, comptes 624/706). **AG ordinaire vs
  extraordinaire**. → Majorités **art. 24/25/26** et **chaîne de statuts AG** : **RENVOI** à
  `business-rules.md` (déjà la source) — ne pas dupliquer.
- **Annexes 1-5** (modèles arrêté du 14 mars 2005, mod. 2016/2020) : 1 = état financier après
  répartition (équilibrée) ; 2 = compte de gestion général (voté vs réalisé) ; 3 = ventilation par
  clé ; **4 = travaux/opérations exceptionnelles TERMINÉS** (status `closed`) ; **5 = travaux votés
  NON clôturés** (status `validated`, contrôle Σ col. E = compte 12). `_Avoid_` : classer 4/5 **par
  article de vote** — c'est par **avancement** (terminé / en cours). `Implémentation:` fn_annexe_1..5.

### 4.10 Sources d'extraction (corrigées)

- **Compta** : table `accounts` + migrations `0025/0026/0056/0059/0075` + mémoires.
- **Annexes & état daté** : **`.planning/FACSIMILE_ANNEXES_2026-06-15.md`** +
  **`.planning/ANALYSE_ANNEXES_2026-06-14.md`** + **arrêté du 14 mars 2005** (mod. 2016/2020) —
  **PAS** `business-rules.md` ni `accounts`, qui ne portent **aucun** libellé d'annexe.
- **Doublons EN/FR** : **`.planning/CARTE_DOUBLONS.md`** — **VIVANT, pas en archive** (21 clusters ;
  ex. E2 disputes/litiges, M6 Sales↔Ventes, F5 renommer les 2 `PaymentModal`).
- **Au fil de l'eau (hors noyau)** : EDD, carnet d'entretien, PPT/DTG. *(RCP via `date_reglement` et
  Immatriculation RNIC via `num_immatriculation` = dans le noyau : champs déjà en base.)*

## 5. Remplissage & enrichissement continu

- **Démarrage (one-shot)** : extraire/définir le noyau ci-dessus. *(Candidat fan-out multi-agents par
  section + passe adversariale sur la justesse comptable — à décider au plan.)*
- **Au fil de l'eau (permanent)** : règle gravée dans `rules-v2.md` **et** `methodo-coproflex`,
  formulée **transverse** (s'applique à toute PR, **y compris rename/typo**) :
  > *Si tu croises ou renommes un terme métier/technique ambigu pendant la construction → ajoute-le
  > (ou tranche son `_Avoid_`) dans le bon glossaire, dans la même PR.*

## 6. Câblage (consommation)

- Référencer les deux glossaires depuis `CLAUDE.md` (racine) via imports : `@CONTEXT.md` et
  `@docs/claude/glossaire-technique.md`, pour qu'ils soient **lus par les agents avant de coder**.

## 7. Definition of Done de ce chantier

- `CONTEXT.md` (racine) créé, format `domain-modeling` respecté, noyau métier+compta (§4) rempli.
- `docs/claude/glossaire-technique.md` créé, noyau technique rempli.
- Règle d'enrichissement « au fil de l'eau » (transverse, y c. renames) ajoutée à `rules-v2.md`
  **et** `methodo-coproflex`.
- Imports ajoutés dans `CLAUDE.md` (racine).
- Doublons EN/FR du noyau **tranchés** (canonique + `_Avoid_`), cohérents avec `CARTE_DOUBLONS.md`.
- **Chaque terme d'annexe cite son article** (arrêté du 14 mars 2005) et sa fonction SQL.
- 1 PR ciblée + push.

## 8. Hors scope (chantiers suivants, même socle)

1. **Garde-fou anti-fragmentation** : règle de découpage du code (modules profonds, deletion test).
2. **Capitaliser les 5 principes** dans `methodo-coproflex` (modules profonds · test de suppression ·
   test au seam · un seul traducteur · spec AFK-ready).

## 9. Suite

Après validation de cette spec → `writing-plans` pour le plan d'implémentation.
