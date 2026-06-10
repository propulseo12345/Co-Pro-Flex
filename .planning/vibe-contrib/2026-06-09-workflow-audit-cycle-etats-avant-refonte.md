<!--
BROUILLON DE CONTRIBUTION vibe-library — en attente de publication.
La publication directe via mcp__vibe-library__create_library_document a été bloquée par
le classifieur de sécurité (écriture vers système externe partagé). Pour publier :
autoriser l'outil (règle de permission) puis recréer le document, ou pousser manuellement.

Champs cibles :
  type: template
  slug: workflow-audit-cycle-etats-avant-refonte
  category: templates--audit
  maturity: stable
  tags: [workflow, multi-agent, refactoring, state-machine, audit, cascade-safety, postgres-enum, dead-code]
  when_to_use: Avant de réparer/refondre une machine à états dont les transitions ont des effets de bord sensibles.
-->

# Workflow — Cartographier et sécuriser un cycle d'états avant de le refondre

## Quand l'utiliser
Avant de réparer/refondre une **machine à états** (statuts + transitions d'une entité : commande, réunion, dossier, ticket…) qui est emmêlée, partiellement cassée, ou dont les transitions déclenchent des **effets de bord sensibles** (écritures comptables, envois, écritures irréversibles). But : concevoir sur une carte **fiable** plutôt que sur des suppositions.

## Principe
Fan-out **lecture seule** multi-agents qui produit une carte d'architecture + une reco de chemin canonique + une checklist de nettoyage + un verdict de cascade, **AVANT** toute modification.

### Phase 1 — Trace (agents parallèles, lecture seule, un par angle)
1. **Par mécanisme/chemin** : pour chaque fonction/route/composant du cycle — ce qu'il fait, **qui l'appelle réellement** (vivant vs code mort), gardes/idempotence, conflits avec les autres.
2. **Par valeur d'état (enum/label)** : pour CHAQUE valeur, est-elle *écrite* quelque part ou seulement *lue* (comparaison/garde) ? → distingue les valeurs réellement mortes des « mortes côté serveur mais posées côté client ».
3. **Mécanique de retrait + cascade** : ce qui dépend de chaque valeur/objet (contraintes, défauts, gardes, vues, types générés) et le coût/risque de le retirer. *(Ex. : retirer une valeur d'enum PostgreSQL impose de **recréer le type** — `ALTER TYPE` ne sait pas `DROP VALUE`.)*
4. **Cascade de la réparation** : triggers, contraintes différées, immutabilité d'enregistrements déjà « postés », invariants d'ordre.

### Phase 2 — Synthèse (1 agent)
Consolide en : **chemin canonique** recommandé · **checklist de dépollution** (code mort, doublons) ordonnée par risque · **verdict cascade** (hotspots + mitigations) · **ordre d'implémentation en tranches verticales testables**.

## Disciplines non négociables
- **Vérifier les dires du workflow avant d'agir.** Un agent de synthèse peut affirmer faux (ex. « cette fonction/route est absente »). Un check rapide contre la source de vérité (base de données, filesystem) attrape l'erreur. *Ne jamais annoncer « c'est cassé » sans l'avoir reconfirmé soi-même.*
- **Fix root cause, pas symptôme.**
- **Anti-pattern fréquent** : classer une valeur d'état « morte » parce qu'aucune fonction backend ne l'écrit — alors que le **client la pose par écriture directe**. Vérifier les DEUX côtés (serveur + client).
- **Ne pas retirer des valeurs d'enum pour un bénéfice quasi nul** : si elles sont lues par des gardes ou posées par le client, le coût (recréer le type + réécrire les objets dépendants) dépasse le gain. Préférer **documenter**.
- **Preuve empirique avant commit** : chaque tranche touchant la base est rejouée en transaction `BEGIN … ROLLBACK` sur un environnement jetable (clone de données de test), **y compris le re-run** (prouver qu'un 2ᵉ passage échoue proprement plutôt que de corrompre).

## Hotspots de cascade typiques
- Une garde/contrainte qui référence une valeur qu'on veut retirer.
- **Immutabilité** d'enregistrements déjà validés/postés (un re-traitement lèverait une erreur) → l'étape de *finalisation* ne doit JAMAIS relancer l'étape d'*exécution*.
- **Invariant d'ordre** (étape A doit précéder B, sinon données vides en aval).

## Note de stack
Pattern **agnostique** (process + backend). Implémentation d'origine : PostgreSQL/RPC (`SECURITY DEFINER`) + front Next.js/TypeScript. Le projet contributeur utilise **npm / ESLint / CSS Modules** (≠ stack par défaut de cette bibliothèque : pnpm / Biome / Tailwind) — adapter l'outillage, **garder le principe**.
