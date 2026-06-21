# Cadrage — Campagne de test « prêt pour un vrai syndic »

> Issu d'une session **grilling** (méthode `mattpocock/grill-me`) le 2026-06-21.
> Ce document est la **boussole** de la campagne de test : il dit *pour quoi* on teste,
> *jusqu'où*, et *comment on sait que c'est fini*. Toute spec de test doit s'y rattacher.

---

## 1. Ligne d'arrivée

**Un VRAI syndic utilise CoProFlex en production** — vrai argent, responsabilité juridique.
C'est le standard le plus exigeant : on ne vise pas une démo ni un jalon interne.

⚠️ Piège explicitement écarté : « tester que **toutes** les fonctionnalités marchent » = on ne
livre jamais. On teste **le noyau critique** à fond ; le reste est assumé/décalé.

---

## 2. Périmètre & séquence

### Phase 1 — Fiabiliser l'espace GESTIONNAIRE *(maintenant)*
Nature = **tester + corriger l'existant** (déjà construit, avec dette connue).

**Noyau intouchable** (une erreur ici = argent faux ou faute professionnelle) :
- **Boucle comptable** : appels de fonds → répartition des charges → encaissements + rapprochement → dépenses/factures → clôture d'exercice → **5 annexes légales**.
- **AG de bout en bout** : convocation conforme (délais + pièces obligatoires), **majorités art. 24/25/26**, PV, activation des décisions votées.
- **État daté (art. 5)** si une vente tombe.
- **GED** *(remonté au noyau par l'utilisateur)*.
- **Maintenance** *(remontée au noyau par l'utilisateur)*.

### Phase 2 — Espaces NON-gestionnaire *(après Phase 1, mais AVANT le lancement)*
Nature = **construire (dev) puis tester** — ce n'est pas un chantier de test.
- **Portail copropriétaire** (design validé juin 2026, 0 ligne de code).
- **Conseil syndical** (même salve).

---

## 3. Critère « FINI » de la Phase 1 — TRIPLE (les 3 obligatoires)

1. **Cas P0 (104) = 100 % vert.** P1 (127) verts **ou** bug documenté **non bloquant + contournement connu**. P2/P3 = backlog assumé.
2. **Cycle de vie ANNUEL COMPLET prouvé** (pas des cas isolés) : budget voté en AG → appels de fonds → encaissements + rapprochement → dépenses/factures → clôture → **5 annexes justes** → état daté si vente. *Raison : on peut avoir 104 cases vertes isolément et une copro qui explose au bout de l'année parce que les briques ne s'enchaînent pas. Le syndic vit un cycle continu.*
3. **Persistance & non-régression inter-AG** :
   - **Continuité** : l'AG suivante **récupère** les décisions précédentes (budget en base de travail).
   - **Immutabilité de l'exercice** : une AG **extraordinaire** n'écrase **jamais** ce qui est figé à l'année (budget, conseil).

---

## 4. Deux chemins de test « cycle complet » (= 2 scénarios distincts)

- **(a) FROM SCRATCH** — copro créée de zéro, 1ᵉʳ exercice.
  *Déjà partiellement couvert :* `e2e/onboarding-clean-path.spec.ts` (crée une copro A→Z, vérifie compta propre). **À étendre** jusqu'au cycle annuel complet (clôture + annexes).
- **(b) REPRISE DE MANDAT** — copro existante basculée dans l'outil, avec historique. **À construire.**
  - **Les deux moments**, avec **MI-ANNÉE PRIORITAIRE** : cas réel le plus fréquent **et** le plus dur (appels déjà émis, soldes en cours, cut-off comptable, à-nouveaux partiels, imputation des règlements). « Si ça passe ici, ça passe partout. »
  - Reprise au **1ᵉʳ janvier** = sous-cas plus simple, à couvrir ensuite.

---

## 5. Découvertes du grilling — 3 fragilités inter-AG (→ cas P0 + corrections)

**Vérifié dans le code** (sous-agent Explore) : le budget est rattaché à l'**EXERCICE**
(`budgets.period_id`) + `copro_id` + `budget_type`, **jamais à une AG** ; verrou
`uq_budget_one_validated` (1 seul budget validé par copro+période+type). **Donc une AGE
n'écrase PAS le budget de l'AGO.** ✅ Mais l'intuition était juste — 3 fragilités réelles :

1. **Continuité absente** — pas de pré-remplissage « budget N-1 → N » (le front repart d'une feuille blanche). → **à construire** (confort important pour un syndic, central en cas de reprise de mandat).
2. **Garde manquante (AGE + budget)** — si une AGE vote une résolution `CREATE_BUDGET`, son activation provoque une **collision SQL brute** (`uq_budget_one_validated`, erreur 23505) au lieu d'un message clair. → **garde à ajouter** (`activate_ag_decisions`, migration 0030 ~ l.1808 / ou contrôle front).
3. **Conseil écrasable par une AGE** — `ELECT_COUNCIL` désactive l'ancien conseil (`0030` ~ l.1880). **Voulu** (le nouveau remplace), mais risqué si coché par erreur dans une AGE. → test + éventuel garde-fou de confirmation.

---

## 6. Méthode de test

- **Playwright-first** (preuve en client réel) : à chaque cas, vérifier **l'écran ET la base** (assertions service-role). **Alerte immédiate** sur toute incohérence (prisme expert copro).
- **Infra figée** : compte `lyes.triki@coproflex.fr` · e-mails de test → `lyestriki@gmail.com` (vérif humaine de la réception) · port `:3100` · helpers `e2e/support/` · `e2e/tsconfig.json`.
- **Catalogue** : `.planning/tests/` (327 cas — P0=104 / P1=127 / P2=85 / P3=11). **Pilote livré** : `e2e/lots-repartition.spec.ts`.

---

## 7. Questions opérationnelles restantes *(à trancher à l'exécution — non bloquantes pour le cadrage)*

- **Données de test** : copros dédiées **reproductibles** (1 « scratch » + 1 « reprise mi-année »), idéalement via seed/harnais jetable.
- **Stratégie de correction des bugs** : au fil de l'eau **par domaine** (recommandé) vs tout tester puis corriger en lot.
- **Le 1ᵉʳ syndic concret** : nombre de copros, tailles, mono/multi-cabinet — calibre le réalisme des données.
