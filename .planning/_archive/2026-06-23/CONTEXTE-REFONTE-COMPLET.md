# CONTEXTE COMPLET — Refonte CoProFlex (dossier de passation)

> **À quoi sert ce document.** Il est écrit pour être **copié-collé dans une nouvelle session Claude**.
> Objectif : donner *tout* le contexte de la refonte de CoProFlex pour que tu (Claude) puisses
> **(1)** nous aider à **trancher des décisions métier/comptables** encore ouvertes, et
> **(2)** nous **accompagner sur toute la suite** de l'exécution.
> Rédigé le 2026-06-08. Tu peux me challenger : on travaille en binôme d'experts, pas en exécutant.

---

## 0. Ce qu'on attend de toi (Claude)

1. **Trancher** les décisions de la section **§7** (certaines sont déjà éclairées par une recherche juridique sourcée ; il reste des arbitrages d'expert copro).
2. **Accompagner l'exécution** décrite en **§6** : un rebranchement front↔back, finance d'abord, en tranches verticales testables.
3. Respecter les **principes comptables non négociables** (§2) et les **conventions de travail** (§8).

L'utilisateur (Lyes) est **expert en copropriété / syndic** : sollicite-le sur la logique métier, ne devine pas les règles. Réponds **en français vulgarisé** (comme à quelqu'un qui ne code pas), et **demande validation avant toute action** (édition, commande, migration).

---

## 1. Le produit

**CoProFlex** = plateforme SaaS de **gestion de copropriété** (syndic), marché **français**.

- Deux espaces : **gestionnaire** (`(dashboard)`) + un futur **portail copropriétaire** (pas encore fait) + un **site marketing** public.
- 8 modules : Dashboard · Assemblées générales (AG) · **Finance** (budgets, appels de fonds, impayés, compta, factures) · Maintenance · GED (documents) · Communication · Copropriétaires · Ventes & impayés.

### Stack (à respecter — ne PAS importer une autre stack)
| Couche | Choix |
|---|---|
| Front | **Next.js 16** (App Router) · **React 19** · **TypeScript 5 strict, JAMAIS `any`** · **CSS Modules** (PAS Tailwind) · Lucide · jsPDF |
| Outillage | **npm** (pas pnpm) · **ESLint** (pas Biome) |
| Back | **Supabase / Postgres** — migrations SQL versionnées, fonctions `SECURITY DEFINER`, **edges Deno**, RLS |
| Règles code | alias `@/...` (pas d'imports relatifs `../../`), pas de styles inline, pages < 300 lignes, fichiers < ~200 lignes |

---

## 2. Principes comptables NON négociables (le cœur métier)

Ce sont les invariants. Toute violation = bug.

1. **Le grand livre (GL) est la SOURCE UNIQUE de vérité.** Tout solde / agrégat financier se **dérive des écritures comptables postées** (`ledger_entries`), **jamais** d'une table parallèle (mouvements bancaires, budgets, paiements bruts…). La migration 0028 a volontairement **abandonné** tout « parallèle au GL ».
2. **Partie double** : chaque opération équilibrée (Σ débits = Σ crédits). Chaque créance/encaissement génère une écriture.
3. **Comptabilité d'engagement / droits constatés** (décret 2005-240, art. 14-3) : on enregistre à l'engagement, pas seulement à l'encaissement.
4. **Lot-centric** : l'unité de gestion est **LE LOT**, jamais le copropriétaire. Créances par lot. Le solde d'une personne se dérive en sommant ses lots.
5. **Sous-comptes 450 par NATURE** (dimension `lot_id` obligatoire sur chaque ligne 450-x) :
   - `450-1` courant · `450-2` travaux · `450-3` avance · `450-4` prêt · `450-5` ALUR (fonds travaux).
6. **Écritures canoniques** :
   - Appel budget : 1 ligne par (lot × clé), **D 450-1/lot · C 701**.
   - Encaissement : **D 512 (banque) · C 450-x** par nature ; trop-perçu → 450-3.
   - Facture fournisseur : **D 6xx / C 401** puis paiement **D 401 / C 512**.
   - Cotisation fonds travaux ALUR (art. 14-2 II) : **D 450-5 / C 105** (réserve), **pas** 701/702. Emploi du fonds : **D 105 / C 705**.
7. **Plan comptable copro** = décret n°2005-240 + arrêté du 14 mars 2005 (82 comptes seedés via `provision_copro_chart`).

### Contexte légal de référence (sourcé)
- **Décret n°2005-240 du 14 mars 2005** (comptabilité du syndicat) — art. 8 = affectation du résultat.
- **Arrêté du 14 mars 2005** (nomenclature des comptes, art. 7 ; les **5 annexes comptables**, art. 9-11).
- **Loi n°65-557 du 10 juillet 1965** art. **14-2 / 14-2-1** (fonds travaux ALUR).
- **Code civil art. 1342-10 / 1343-1** (imputation des paiements).

---

## 3. Où on en est dans la refonte (l'histoire à comprendre)

### 3.1 Le pivot : reconstruction de la base
Le dépôt de migrations historiques **n'était plus reproductible** (61 fonctions désynchronisées, doublons). Décision (2026-06-04) : **re-baseline** = reconstruire un schéma propre depuis un **blueprint canonique** (`.planning/db-cible/`, 22 arbitrages tranchés + multi-cabinet + copro-template propre, **0 reprise du live**).

### 3.2 Ce qui est FAIT
- **Phase 0 (reconstruction de la base) = faite** : migrations **`0001` → `0036`** appliquées en local, rejouables à neuf. Inclut : socle (cabinets→copros→lots→clés→copropriétaires), **finance/GL complète** (comptes, écritures partie double, périodes), budgets/appels/relances, AG, mutations, GED, maintenance, communication, **helpers d'autorisation + RLS (0034)**, vues transverses (0035), **vues d'agrégat finance recréées (0036)**.
- **Boucle d'or prouvée** : une copro de test `22222222` « Le Clos Saint-Michel » (exercice 2026 ouvert) sert de harnais ; `audit_finance_integrity = 0 écart` ; vitest ~78/0.
- **Reprise de mandat / balance d'ouverture**, **clôture d'exercice + à-nouveau + affectation 110/120** : codés et prouvés sur copro jetable.

### 3.3 LE problème central (à bien saisir)
**On a refait le moteur (la base), mais le front n'a jamais été rebranché dessus.** Les écrans/hooks/edges appellent encore les **anciens** noms d'objets. D'où un **drift** permanent :
- `createCall` (front) appelle `post_call_for_funds`, une RPC **abandonnée** (n'existe plus) → création d'appel cassée.
- Tout encaissement « Virement » envoie l'enum `bank_transfer`, **valeur qui n'existe plus** (l'enum attend `transfer`) → 500.
- Colonnes renommées, vues renommées → 118 références cassées (cf. `AUDIT_DRIFT_FINANCE.md`).

> **Conclusion clé** : les bugs qu'on trouve ne sont pas *nouveaux*, ce sont des **écarts entre un back neuf et un front resté sur l'ancien**, + des **bugs de logique métier hérités** recopiés à l'identique quand on a recréé les vues. La reconstruction a garanti le **contenant** (schéma propre, reproductible), jamais le **contenu** (logique). Le test (boucle d'or) ne traverse **qu'un seul scénario** (un budget *courant* + un encaissement + une facture) → il laisse passer tout ce qui touche un budget *travaux*, un lot *créditeur*, l'*ALUR*, le *rapprochement bancaire*, et tout le *front*.

### 3.4 État git actuel
- Branche : **`finance-drift-rebranchement`** @ `4e813d8` (au moment d'écrire). DB locale = `0001→0036` appliqué.
- Suivi vivant : `.planning/SESSION.md` (snapshot court) + `.planning/PROGRESS_REFONTE.md` (tracker maître).

### 3.5 La roadmap phasée 0→4 (déjà écrite : `docs/superpowers/plans/2026-06-04-rebaseline-roadmap.md`)
```
Phase 0  RECONSTRUIRE LA BASE ........ ✅ FAIT (0001-0036)
Phase 1  Sécurité (cloisonnement) ..... ⬜ pas commencé (OK : RLS off en DEV = voulu, à activer avant PROD)
Phase 2  FINANCE FRONT testable E2E ... 🔴 PAS FAIT  ← LE bouchon, c'est ici qu'on attaque
Phase 3  Dédoublonnage hors finance ... ⬜
Phase 4  Nettoyage + RLS prod ......... ⬜
```
42 risques (R1..R42) sont rattachés aux phases (`.planning/atlas/REGISTRE-RISQUES.md`).

---

## 4. L'architecture (front ↔ back)

```
  ÉCRAN (page/feature)
     │
     ▼
  HOOK (~90)
     │
     ▼
  api.ts / service (14 api de domaine + services)
     │
     ├─► .from(table)        ← ~568 accès directs (RLS = seule garde)
     ├─► .rpc(fonction)      ← ~86, finance/AG (GL = source unique)
     ├─► functions.invoke ──► EDGE Deno (25 fonctions)
     └─► fetch('/api')   ───► ROUTE API Next (6)
```
- **Finance = l'exception saine** : tout passe par des **RPC `SECURITY DEFINER`** qui écrivent le grand livre. C'est le modèle à étendre.
- Ailleurs : accès table directe (à sécuriser par la RLS, posée mais désactivée en dev).
- **Multi-cabinet** : cloisonnement par `cabinet_id` (tenant racine), helpers `user_has_copro_access` / `user_is_copro_manager`.

### Comportements VOLONTAIRES — NE PAS signaler comme bugs
- **RLS désactivée sur ~72/87 tables** = voulu en phase dev. Bascule fail-open hors prod = voulue en dev.
- **Boucle d'or `22222222`** : des écarts historiques **+0,16 / −423 / +30** sont des **artefacts attendus** (une copro fraîche = 0 écart). Copro `11111111` laissée intacte (immutabilité GL).
- **`src/types/supabase.ts` est périmé** (post_call_for_funds y traîne encore) → connu, à régénérer ; pas un bug de logique.

---

## 5. Les cartographies & audits qu'on a déjà (à RÉUTILISER, pas à refaire)

> Tout ça vit sous `.planning/`. **Ne relance pas une grosse audit app-wide** : on a déjà la carte.

- **Atlas applicatif** `.planning/atlas/` (daté 2026-06-04, ~95 % de couverture) :
  - `00-ATLAS.md` (index) · **`MATRICE-LIAISON.md`** (= *« si je touche cet objet base, qu'est-ce qui casse ? »* : chaque RPC/table/vue → ses consommateurs front/edge/api + disposition GARDER/RÉÉCRIRE/ABANDONNER + objets morts + écrans branchés sur du mock + écrans morts).
  - `REGISTRE-RISQUES.md` (42 risques priorisés, 6 bloquants).
  - `front-01..09` (par domaine) · `edge-functions.md` · `api-routes.md` · `data-layer.md`.
  - ⚠️ **Daté du 4 juin = AVANT 0034/0035/0036** → socle solide mais **périmé sur la finance**, à rafraîchir.
- **Blueprint base cible** `.planning/db-cible/` (01..08 + INVENTAIRE-FONCTIONS, TEMPLATE-SEED, ENUMS…).
- **Audits récents** : `AUDIT_DRIFT_FINANCE.md` (118 refs cassées) · `AUDIT_DRIFT_FONCTIONS.md` · `AUDIT_LOGIQUE_METIER.md` · `CARTOGRAPHIE_REELLE.md` (57 Ko) · `PLAN_CORRECTION_VALIDE.md` (audit red-teamé).
- **Audit cascade du 2026-06-08** (49 sous-agents, finance) — résumé en §7.
- **Catalogue finance** `docs/claude/catalogue-finance.md` (vues/renommages/enums/RPC de référence du rebranchement).
- **Spec comptable** `.planning/comptabilite-spec.md` + **rendu cours syndic ARC** `.planning/RENDU_COURS_SYNDIC.md`.

---

## 6. Le plan décidé cette session (à exécuter)

**Stratégie : RÉCONCILIER puis EXÉCUTER. Finance d'abord. Tranches verticales testables.**
But : **app testable bientôt + fonctionnelle + code le plus propre**. Décisions de cadrage prises avec l'utilisateur :
- **1er palier** = **boucle finance complète E2E**, cliquable et prouvée.
- **Périmètre carto maintenant** = **finance en profondeur + balayage léger des 8 autres domaines**.
- **Borne haute de la boucle** = **budget créé directement** (on saute l'orchestration AG pour ce palier).

### Artefact A — la réconciliation (carto à jour)
Un sweep (idéalement multi-agents) qui confronte chaque **consommateur réel** (~568 `.from`, ~86 `.rpc`) à l'objet DB **réellement présent post-0036**. Finance à fond, reste léger. Sortie : rafraîchir les lignes finance de la MATRICE + un **tracker vivant d'exécution** (`consommateur front → objet back réel → statut OK/drifté/cassé/mort → action → risque`).

### Artefact B — la boucle finance E2E en 8 tranches verticales
Chaque tranche = *rebrancher le front sur le vrai objet + supprimer le mort de la tranche + prouver l'écriture GL*.

```
T1 Onboarding (créer copro)      → + finitions (mois d'exercice, retrait « nb bâtiments ») + fix enum paiement
T2 Budget (création directe)     → rebrancher l'écran budgets sur le réel
T3 Appel de fonds                → route AGRÉGÉE post_budget_call_for_funds (l'appel hors-budget = plus tard)
T4 Encaissement                  → record_payment (fix enum 'transfer')
T5 Relance impayés               → brancher payment_reminders réel (retirer setTimeout/mock)
T6 Facture fournisseur           → edges D6xx/C401 puis D401/C512 (supprimer l'UPDATE direct hors-GL)
T7 Clôture + affectation 110/120 → ⚠️ décisions §7 (routage par nature, report pluriannuel)
T8 Annexes légales 1-5           → ⚠️ décisions §7 (annexe 1 sens, annexe 2 deux blocs, réalisé par opération)
```
**Preuve** : auto (vitest + **boucle d'or étendue** : ajouter un budget *travaux* + un lot *créditeur* au seed pour couvrir les angles morts) → `audit_finance_integrity = 0`. **Manuel** : l'utilisateur clique le parcours lui-même (ne lance pas Playwright à sa place sauf demande).

**Effort recommandé** : `Max` (mono-agent) pour cadrage + chaque tranche ; `ultracode` (workflows multi-agents) ponctuel pour la réconciliation (artefact A) et la **revue adversariale du SQL à enjeu** (T7/T8).

---

## 7. LES DÉCISIONS À TRANCHER (le cœur de ce qu'on attend de toi)

### 7.A — Décisions déjà éclairées par une recherche juridique (sourcée Légifrance) → à VALIDER
> Recherche faite le 2026-06-08 (5 sous-agents, sources officielles). Conclusions :

**(1) Affectation du résultat & comptes 110/120 (gate T7).**
- `110`/`120` **n'existent pas** dans le plan légal. Le seul compte d'attente est le **compte 12**, et **uniquement pour les travaux/exceptionnel**. Le **résultat courant se répartit immédiatement** sur les 450 à l'arrêté des comptes (décret 2005-240, **art. 8**). Nos `110`/`120` sont des **comptes internes** (110 ≈ subdivision du 12 ; 120 = commodité technique). La séparation courant/travaux est **légalement obligatoire** → le bug actuel « tout sur 120 » est une vraie non-conformité.
- ⚠️ **Timing** : le résultat *travaux* ne s'affecte **qu'à la clôture DÉFINITIVE de l'opération** (pas à chaque clôture d'exercice). Le compte travaux doit pouvoir **rester chargé d'un exercice sur l'autre** (travaux pluriannuels).
- **Routage par nature** (`accounts.nature`, 2ᵉ dimension sur les 6x/7x, distincte de la nature des 45x) :
  - *Courant* = comptes **60→64** + **701** + **711-718**.
  - *Travaux/exceptionnel* = **tout le 67** (671…678, dont **677**, **678**) + **702/703/704/705** + **661**.
  - Notre ancienne liste en dur **oubliait 661, 662, 671, 677, 703, 704** (oublier **671** = le pire).

**(2) Les 5 annexes & l'annexe 1 (gate T8a).**
- Titres officiels confirmés : annexe **1** = « État financier après répartition » · **2** = « Compte de gestion général… et budget prévisionnel » · **3** = opérations courantes ventilées **par clés** · **4** = travaux art.14-2 **réalisés** · **5** = travaux votés **non clôturés**. → **Notre spec est juste ; c'est le CODE (`useConvocationAnnexes`) qui a les mauvais libellés.**
- **Un copropriétaire au solde créditeur = une DETTE du syndicat** (jamais soustrait des créances). Le **105 ALUR = réserve (classe 1), hors créances**. → Annexe 1 : séparer **par sens de solde, par lot** ; isoler le 450-5 ; 105/103 au bloc « réserves ».

**(3) Réalisé travaux (gate T8b).**
- La loi exige un suivi **par opération** (annexe 5 + compte 12), pas un compte 6x par opération. → Rattacher chaque écriture de charge travaux à l'**opération votée** (`operation_id`), en plus du compte. ⚠️ **Ajout de schéma** (pas juste un fix de vue). Annexe 2/4 bornées à l'exercice ; annexe 5 = **cumul pluriannuel**.
- ⚠️ **Correction d'un point antérieur** : l'**annexe 2 n'est PAS « courant seulement »** — le décret impose une **double présentation** (bloc courant **+** bloc travaux). La correction = **séparer en deux blocs**, pas exclure les travaux.

**(4) Fonds travaux ALUR (gate T8).**
- Seuil **MAX(2,5 % du PPT ; 5 % du budget prévisionnel)** — confirmé exact et à jour (loi Climat 2021).
- **Solde disponible = solde créditeur cumulé du compte 105, tous exercices, DÉJÀ net** des affectations (D105/C705). **Ne pas re-soustraire le 705** (double comptage). Dériver du GL, abandonner la table de planif. **Non remboursable**, attaché au **lot**.

**(5) Imputation des paiements (gate allocate_payment).**
- **Cloisonnement ALUR = OBLIGATOIRE** (fonds dédié d'ordre public, art. 14-2) ; cloisonnement travaux **fortement recommandé**. Le commentaire de code qui invoque l'art. 1342-10 pour un **FIFO multi-nature est un contresens** (« plus ancienne » y est un critère de **4ᵉ rang**, après l'échéance et « le plus d'intérêt à acquitter »). → **La décision interne ② (cloisonnement par nature) est juridiquement correcte.** Modèle : override manuel → cloisonnement par nature (reliquat → 450-3) → intra-nature : accessoires (art. 1343-1) puis FIFO ancienneté.
- ⚠️ **Prérequis** : supprimer les appels `budget_id = NULL` (étape « V2 ») sinon la nature n'est pas fiable.

### 7.B — Décisions ENCORE ouvertes (jugement d'expert copro requis)
1. **Nature de 662** (agios/charges financières) et **711-718** (produits divers) : proposition = *travaux* par défaut pour 662, *courant* pour 711-718, **configurables au compte**. À confirmer.
2. **Ajout de `operation_id`** sur les écritures travaux : on confirme (seule façon légale de produire l'annexe 5) ?
3. **Annexe 1 — 450-5 débiteur** (cotisation ALUR appelée non versée) : ligne créance dédiée « cotisations fonds travaux à recevoir » (recommandé) ou neutralisé ?
4. **Cloisonnement travaux** : strict (par nature partout) ou seulement ALUR strict + FIFO universel pour le reste ? (recommandé : strict partout, plus simple et cohérent.)
5. **Vérifier visuellement** sur le PDF officiel des modèles d'annexes la numérotation exacte **annexe 3 vs 4** (une source minoritaire les intervertit).

### 7.C — Décisions d'implémentation / séquencement
- **`createCall`** (appel mono-clé, RPC abandonnée) : pour le palier 1, on route le wizard sur **post_budget_call_for_funds** (budget-driven agrégé). L'**appel hors-budget / exceptionnel** (déjà conçu : `docs/superpowers/specs/2026-06-08-appels-hors-budget-design.md`, migration 0037) vient **après** le palier 1.
- **Sécurité (Phase 1)** : avant la **prod**, pas avant de tester en dev.

---

## 8. L'audit cascade du 2026-06-08 (les bugs concrets trouvés)

49 sous-agents, vérif adversariale. **19 bugs confirmés** (3 blockers, 5 majors, reste mineur), 8 faux positifs écartés, 14 points d'arbitrage (largement couverts par §7).

**3 blockers** (2 cassent des flux LIVE) :
1. **Encaissement « Virement » plante** : front envoie `bank_transfer` (enum inexistant ; attend `transfer`). 3 maillons : `PaymentModal.tsx` + edges `record_payment` & `pay_supplier_invoice`. → **mécanique**.
2. **Création d'appel mono-clé cassée** : `createCall` appelle `post_call_for_funds` (abandonnée). → résolu par §7.C (route agrégée).
3. **`v_account_balances`** (0036) : solde dérivé du **relevé bancaire** au lieu du GL (+ un `like '5121%'` redondant). → recalculer depuis le GL (`v_trial_balance`).

**5 majors** (tous des annexes/ALUR, couverts par §7) : annexe 1 (créances/avances mélangées), annexe 2 (budget non filtré), annexes 4/5 (réalisé qui fuit entre opérations), fonds ALUR (solde hors GL), routage 110/120.

**Cascade** : la garantie « zéro cascade » est tenue car **aucun fix ne modifie une écriture postée** — tout porte sur des **vues lecture seule** ou du front/edge. Preuve de non-régression à chaque fix : `db reset` + `audit_finance_integrity = 0` + vitest. Seul point de vigilance : le fix annexes 4/5 ne doit pas faire disparaître les factures fournisseurs **sans `budget_id`** (à tester).

---

## 9. Conventions de travail (à respecter absolument)

- **Français vulgarisé.** Métaphores du quotidien pour les concepts techniques. Réponses courtes par défaut.
- **Confirmation AVANT toute action** (édition, commande, migration). Seules les lectures sont libres.
- **Gros changements = annoncer en 1-3 lignes et attendre validation.** Petites modifs évidentes = agir.
- **TypeScript strict, jamais `any`.** Alias `@/...`. CSS Modules. Pas de styles inline.
- **Type check après chaque modif** (`tsc --noEmit`). Une tâche n'est finie que si **type check + tests passent**.
- **Commits séparés par changement logique** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`). PRs petites (< ~150 lignes).
- **JAMAIS committer de secret** (`.env`, clés, tokens). Scanner les diffs avant `git add`.
- **Finir les migrations** : ne pas laisser deux patterns coexister (un code à moitié migré pousse à copier le mauvais exemple).
- **Cadence par migration SQL = « 3-checks »** : implémenteur → relecture conformité + relecture qualité → gate fonctionnel + commit isolé. Pour le SQL à enjeu (RLS, FK, finance) : **revue adversariale multi-agents**.
- **Prouver le comportement réel**, pas seulement le type-check : tester une violation de contrainte en transaction `rollback` et vérifier le bon code d'erreur. **Grepper les appelants réels** d'une RPC avant de figer sa signature.

---

## 10. Outillage (comment tester en local)

- **DB locale (Docker)** : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres` (psql pas sur le PATH).
- **Reset complet** (rejoue 0001→0036 + seeds) : `npx --no-install supabase db reset`.
- **Gate SQL** : `... psql -U postgres -d postgres -f - < .planning/gate_XXXX.sql` (pattern RED→GREEN).
- **Tests front** : `tsc --noEmit` + ESLint + **vitest** (suite finance, ~78/0 actuellement).
- **Plan comptable** seedé par `provision_copro_chart` (82 comptes) ; sous-comptes 450-1..5 ; 701/702/703/705/105/103 existent.
- **RPC budget** = `post_budget_call_for_funds` (appel agrégé, largest-remainder, Σ lignes = budget).
- **Boucle d'or** = copro `22222222` ; harnais jetable `create_test_copro(_seeded)`.
- **Régénérer les types** : `supabase gen types` après chaque vague de migrations (le `src/types/supabase.ts` actuel est périmé).
- Windows / PowerShell (pas bash par défaut). `gh auth switch --user lyestriki-29` avant tout push.

---

## 11. Fichiers à ouvrir en priorité (si tu as accès au repo)

| Besoin | Fichier |
|---|---|
| Où on en est maintenant | `.planning/SESSION.md` |
| Tracker maître de la refonte | `.planning/PROGRESS_REFONTE.md` |
| Roadmap phasée 0→4 + 42 risques | `docs/superpowers/plans/2026-06-04-rebaseline-roadmap.md` |
| « Si je touche X, qui casse ? » | `.planning/atlas/MATRICE-LIAISON.md` |
| Risques priorisés | `.planning/atlas/REGISTRE-RISQUES.md` |
| Drift finance (118 refs) | `.planning/AUDIT_DRIFT_FINANCE.md` |
| Référence rebranchement | `docs/claude/catalogue-finance.md` |
| Spec comptable + cours ARC | `.planning/comptabilite-spec.md` · `.planning/RENDU_COURS_SYNDIC.md` |
| Blueprint base cible | `.planning/db-cible/00-SYNTHESE.md` (+ 01..08) |
| Règles projet | `CLAUDE.md` + `docs/claude/{conventions,business-rules,modules,design-system}.md` |
| Appel hors-budget (déjà conçu) | `docs/superpowers/specs/2026-06-08-appels-hors-budget-design.md` |

---

### TL;DR pour toi, Claude
On a **reconstruit la base proprement (0001-0036)** mais **le front n'a jamais été rebranché dessus** → c'est *ça* le chantier. On attaque **la finance d'abord, en tranches verticales testables**, pour une **boucle finance cliquable de bout en bout** (1er palier). La recherche juridique a **tranché les grandes questions comptables** (§7.A, sourcées Légifrance) ; il reste **5 arbitrages d'expert** (§7.B) + le séquencement (§7.C). **Le grand livre est la source unique, l'unité c'est le lot, et on prouve chaque écriture.** Aide-nous à valider §7 et à exécuter §6.
