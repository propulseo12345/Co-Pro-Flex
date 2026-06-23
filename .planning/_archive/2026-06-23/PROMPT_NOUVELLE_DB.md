# PROMPT — Conception de la nouvelle base CoProFlex (re-baseline propre)

> À coller tel quel au démarrage d'une **session neuve** dans ce projet.
> Objectif : concevoir, sans aucun trou, la **base de données cible propre** de CoProFlex —
> structure complète (tables, colonnes, types, contraintes, index, RLS, enums, vues, triggers)
> + inventaire des fonctions + carte de migration des données existantes.
> C'est un travail de fond : prendre le temps, multiplier les vérifications croisées, ne rien supposer.

---

## 0. Comment démarrer (méthode imposée)

1. **Invoque le skill `superpowers:brainstorming`** et suis son flux (questions de cadrage une par une, design présenté et validé avant tout livrable). NE PAS écrire de SQL ni de migration tant que le design n'est pas validé par l'utilisateur.
2. **Ultracode est attendu sur cette tâche** : orchestre une **équipe d'agents** (outil `Workflow`) pour la cartographie et la conception exhaustives. Pas de raccourci, pas d'échantillonnage silencieux. Toute conclusion à enjeu est **vérifiée de façon adversariale** par un second agent.
3. **Tout est en lecture seule sur le live** jusqu'à validation du design. Aucune écriture, aucun DDL, jamais sur les copros immuables `11111111` / `22222222`.
4. Travaille en **français accessible** (règle projet) et **confirme avant toute action** d'écriture.

---

## 1. Contexte & pourquoi (ce qui a déclenché ce chantier)

CoProFlex = SaaS de gestion de copropriété (droit français). Backend Supabase/Postgres, projet live **`iyfesbjnkpynmwlsmxnp`** (compte perso, MCP Supabase branché).

Une revue experte (2026-06-04) a prouvé que **le dépôt de migrations n'est plus une source de vérité reproductible** :
- L'historique a divergé : **270 versions appliquées en prod vs 137 fichiers**, ~3 préfixes seulement correspondent.
- **La baseline manque** : sur 87 tables live, **2 seulement** ont un `CREATE TABLE` dans le repo ; **8 enums** n'ont aucun `CREATE TYPE` ; un replay sur base vide plante immédiatement.
- **33 fonctions** (pas 25) sont en drift pur (absentes de toute migration) ; vues/triggers/enums ont aussi dérivé.
- Trous de sécurité confirmés (SECURITY DEFINER sans garde, ex. `validate_mutation` = transfert de propriété cross-copro ; `generate_etat_date_payload`/`create_etat_date_snapshot` = fuite PII appelable par `anon`).

**Décision actée par l'utilisateur** : ne pas rapiécer, mais **repartir sur une base propre** (re-baseline) — et **réfléchir à la forme idéale** du schéma (tables, colonnes), pas seulement photographier l'existant. La nouvelle base doit être **complète** et **fonctionnelle vis-à-vis des fonctions** (les fonctions définissent le contrat réel des données nécessaires). Sécurité : **« tout couvrir »** (gardes sur toutes les fonctions DEFINER, avec la bonne garde selon le mode d'appel).

Ce chantier **précède et conditionne** le reste de la refonte (tracker maître `.planning/PROGRESS_REFONTE.md`).

---

## 2. Objectif du livrable

Produire le **blueprint complet de la base cible** (un ou plusieurs docs sous `.planning/db-cible/`), tel que :
- il décrit chaque **table** : colonnes (nom, type, nullabilité, défaut), clés primaires/étrangères, contraintes (CHECK, UNIQUE), index, et **politique RLS** prévue ;
- il décrit chaque **enum/type**, chaque **vue**, chaque **trigger**, chaque **fonction** (signature + rôle + tables touchées) ;
- il est **cohérent avec les règles métier** (compta copro, lot-centric, grand livre source unique…) ;
- il **satisfait le contrat fonctionnel** : toute table/colonne lue ou écrite par une fonction existante est présente (ou la fonction est explicitement réécrite, et le changement est tracé) ;
- il fournit une **carte de migration des données** ancien→nouveau pour chaque table porteuse de données (sinon on ne pourra pas reprendre les copros existantes) ;
- il liste les **objets abandonnés** (morts/doublons) qu'on NE reprend PAS, avec preuve.

---

## 3. Principes directeurs (non négociables — voir mémoire projet)

- **Grand livre = source unique immuable** ; compta d'engagement (partie double, droits constatés, décret 2005-240) → cf. mémoire `compta_engagement`, `compta_engage_realise`.
- **Unité de gestion = LE LOT**, jamais le copropriétaire ; le solde par personne se dérive → `lot_centric_rule`.
- **Modèle de compte tiers** : créance copro = sous-compte par nature (450-1/2/3/4/5) + dimension `lot_id` → `ledger_account_model`.
- **Périodes / à-nouveau / clôture** : ordre à-nouveau avant affectation ; 110=travaux / 120=courant → `wp5_1_periode_anouveau`, `ventilation_110_120`, `affectation_resultat_copro`.
- **Appels de fonds agrégés** multi-clés, ALUR art.14-2, imputation paiements FIFO cloisonné → `appel_fonds_agrege_model`, `alur_fonds_travaux_accounting`, `payment_imputation_rules`.
- **AG → données copro (auto-population)** : les décisions votées incrémentent l'état (budget, travaux, conseil, clôture) ; **chaîne canonique** `prepare→activate → generate_calls_from_ag_payload → post_budget_call_for_funds` (qui POSTE le GL). **La couche AG « bespoke » qui ne poste pas le GL ne doit PAS être reportée dans la base cible** → `ag_auto_population`, `cleanup_doublons_audit`.
- **5 annexes comptables légales** + pièces de convocation → `annexes_legales_copro`, `docs_obligatoires_convocation`.
- **Données existantes préservées** : copros immuables et boucle d'or `22222222` = données réelles à pouvoir migrer ; `--schema-only` ne touche jamais les données → `golden_loop_copro`, `test_harness_throwaway_copro`.
- **RLS** : aujourd'hui off en dev (volontaire) MAIS la base cible doit **concevoir le modèle d'autorisation pour la prod** (RLS + gardes in-function, modèle bicéphale session-user vs service_role) → `dev_phase_rls`.
- Stack réelle : Next.js 16 / TS strict / CSS Modules — ne PAS importer une stack tierce.

---

## 4. Méthode anti-trou : triangulation à 3 sources

La complétude se prouve en croisant **trois vérités**. Tout élément présent dans l'une mais absent du design = **trou à combler ou décision à tracer**.

1. **Le LIVE (vérité empirique)** — rétro-ingénierie complète via MCP Supabase (lecture seule) :
   - tables/colonnes/types/défauts (`information_schema.columns`), contraintes (`pg_constraint`), index, FK, séquences ;
   - enums (`pg_type`/`pg_enum`), vues (`pg_views`), triggers (`pg_trigger`), policies (`pg_policy`), grants (`proacl`) ;
   - **comptage réel des lignes** par table (`count(*)`, pas les stats) pour distinguer vivant/mort.
2. **Le CONTRAT FONCTIONNEL** — pour **chaque** fonction (`pg_proc.prosrc`), extraire les tables et **colonnes** lues/écrites. Le schéma cible doit honorer ce contrat (ou la fonction est réécrite et c'est tracé). C'est le garde-fou « fonctionnelle par rapport à nos fonctions ».
3. **Les RÈGLES MÉTIER** — la mémoire projet + l'expertise de l'utilisateur (copro/syndic). Chaque règle doit être **exprimable** dans le schéma (table/colonne/contrainte). Sinon = trou.

Sources documentaires à lire en entrée (toutes dans `.planning/`) :
`CARTE_DOUBLONS.md` (21 clusters morts/doublons à NE PAS reprendre), `AUDIT_DRIFT_FONCTIONS.md`, `AUDIT_V1_GRAND_LIVRE.md`, `CARTOGRAPHIE_TABLES.md`, `AUDIT_LOGIQUE_METIER.md`, `PLAN_CORRECTION_VALIDE.md`, `REPRISE_V0.md`, le spec `docs/superpowers/specs/2026-06-04-phase1-resync-drift-design.md`, et le rapport de revue de la session précédente (workflow `expert-review-phase1-spec`).

---

## 5. L'équipe d'agents (structure suggérée du/des Workflow)

**Phase Cartographie (lecture seule, en parallèle)** — un agent par tranche verticale, qui rétro-ingénie le live + extrait le contrat fonctionnel de son domaine :
1. Copros / lots / tantièmes / coproprietaires / lot_owners / memberships & auth.
2. **Finance — grand livre** : `ledger_entries`/transactions, plan de comptes, périodes, à-nouveau, cut-off (408/486), 110/120. *(domaine le plus critique)*
3. Budgets / appels de fonds / ALUR / impayés / imputation des paiements.
4. AG : assemblées, résolutions, votes, pouvoirs, vote par correspondance, convocation, PV, auto-population (chaîne **canonique** uniquement).
5. Mutations / état daté / vente de lots.
6. Documents (GED) / versioning.
7. Maintenance / contrats / prestataires (`suppliers` vs `providers`) / ordres de service.
8. Communication / messagerie / campagnes / notifications.

**Phase Conception (par domaine)** — chaque agent propose le schéma cible de son domaine : tables/colonnes idéales, contraintes, index, RLS, et la **carte de migration des données** depuis le live.

**Agents transverses :**
- **Extracteur de contrat fonctionnel** : table fonction → {tables, colonnes} lues/écrites, pour les ~190 fonctions.
- **Concepteur enums/types** + **concepteur modèle d'autorisation** (RLS + gardes, bicéphale session-user/service_role).
- **Éliminateur morts/doublons** (depuis `CARTE_DOUBLONS`) : ce qu'on ne reprend pas, avec preuve d'usage nul (front + **edge functions Deno** + FK + données).
- **Critique de complétude (adversarial)** : « quelle fonction casserait sur ce schéma ? quelle colonne est référencée mais absente ? quelle table a des données mais aucun foyer dans la cible ? quelle règle métier n'est pas exprimable ? ». Ce qu'il trouve = prochaine itération. **Boucler jusqu'à ce que deux passes consécutives ne trouvent plus rien (loop-until-dry).**

---

## 6. Questions à poser à l'utilisateur (expert copro — `pose-moi-des-questions`)

Poser une par une, au bon moment du brainstorming. Au minimum :
- **Ambition** : photo fidèle + corrections sûres, ou redesign plus profond de certains domaines (lesquels) ? Jusqu'où on « réfléchit la forme » vs on fige l'existant qui marche ?
- **AG bespoke** : on confirme qu'on ne reporte QUE la chaîne canonique (poste le GL) et qu'on abandonne `generate_combined_calls_from_ag`/`create_budget_from_ag`/`elect_council_from_ag`/`get_ag_pending_actions`/`mark_ag_action_activated` ?
- **suppliers vs providers** : fusion ? FK `providers.supplier_id` ? (Q7 de `CARTE_DOUBLONS`).
- **Messagerie campagnes** : feature gardée ou abandonnée (îlot mail) ?
- **Conseil syndical** : majorités propres ou alignées AG ?
- **Modèle d'autorisation prod** : RLS activé partout + gardes ? périmètre des rôles (gestionnaire/copropriétaire/anon) ? (cf. portail copropriétaire à venir `vue_coproprietaire_pending`).
- **Portée des données à migrer** : on reprend quelles copros (toutes, ou repart-on de zéro côté données en gardant juste la golden loop) ?
- **`validate_mutation` & état daté** : qui a le droit (gestionnaire only) ? garde à imposer.
- Tout point où le live, les fonctions et les règles métier se contredisent → arbitrage métier.

---

## 7. Livrable de la session

Sous `.planning/db-cible/` :
- `00-SYNTHESE.md` : vision d'ensemble, schéma de domaines, décisions actées, questions ouvertes.
- un fichier par domaine : tables + colonnes + contraintes + index + RLS + carte de migration des données.
- `INVENTAIRE-FONCTIONS.md` : chaque fonction → garde-t-on / réécrit / abandonne, et son contrat (tables/colonnes).
- `MIGRATION-DONNEES.md` : mapping ancien→nouveau par table porteuse de données + stratégie de reprise.
- `OBJETS-ABANDONNES.md` : morts/doublons non repris, avec preuve.
- **Ne PAS encore écrire le SQL final** : le blueprint d'abord, validé par l'utilisateur, puis (session suivante) la génération des migrations + `supabase db dump` de référence + test de restauration sur cible jetable + diff vs prod.

---

## 8. Critères « aucun trou » (acceptation)

1. **100 % des fonctions** ont leur contrat (tables/colonnes) couvert par le schéma cible, ou une décision explicite de réécriture/abandon.
2. **100 % des tables live porteuses de données** ont un foyer dans la cible + une ligne de carte de migration (ou une décision d'abandon tracée).
3. **100 % des enums/types/vues/triggers** vivants sont soit dans la cible, soit explicitement abandonnés avec preuve.
4. Chaque **règle métier** de la mémoire est exprimable et tracée à une construction du schéma.
5. Le **modèle d'autorisation** (RLS + gardes) est défini pour chaque table/fonction sensible, en distinguant session-user et service_role.
6. Le **critique de complétude** passe deux fois de suite à vide (loop-until-dry).
7. Toute décision est **traçable** à sa source (preuve live / règle métier / arbitrage utilisateur).

---

## 9. Garde-fous

- Lecture seule sur le live jusqu'à validation ; jamais d'écriture sur `11111111`/`22222222`.
- Greper **aussi les edge functions Deno** (`supabase/functions/`) avant de déclarer un objet mort — elles sont hors `src/` et systématiquement oubliées.
- Ne jamais faire confiance à un dump à l'aveugle : prévoir le test de restauration + diff en aval.
- Données = `--schema-only` ne les touche pas ; la reprise des données est un sujet à part (carte de migration).
- Confirmer chaque gros changement avant action ; commits/PRs petits et ciblés le moment venu.
