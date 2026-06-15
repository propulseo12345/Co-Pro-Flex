# Pattern — Cadence de migration SQL « à enjeu » (grand livre / RLS / FK)

> ⚠️ Tag stack : extrait d'un projet **npm / ESLint / CSS Modules / Supabase CLI**
> (≠ stack imposée library pnpm/Biome/Tailwind). Prendre le **process et le SQL**,
> jeter le tooling front. Généralisé / anonymisé.

## Quand l'appliquer
Toute migration qui touche une logique comptable/financière immuable, des RLS, des FK
ou une fonction/vue critique partagée — là où une erreur silencieuse coûte cher et où
la reproduction d'un gros corps `CREATE OR REPLACE` est source d'erreurs.

## La cadence (5 temps)

1. **Audit en fan-out (multi-agents, lecture seule)** avant d'écrire. N explorateurs
   parallèles, un par couche (modèle de données, fonctions SQL, appelants, front, tests,
   frontières/légal). Question clé toujours posée : *« renommer/changer X est-il un UPDATE
   d'une ligne, ou une réécriture de l'historique immuable ? »* → un agent **synthèse**
   produit le plan, puis **3 lentilles adversariales** (correction, intégrité, complétude)
   cassent le plan avant tout code.

2. **Reproduction MÉCANIQUE des corps de fonction** (anti-transcription). Un `CREATE OR
   REPLACE` doit ré-émettre tout le corps ; le retaper à la main introduit des bugs. À la
   place : un petit script extrait le corps EXACT de la migration source, applique des
   **remplacements ciblés** (littéraux de code uniquement, jamais les noms de variables),
   et émet la nouvelle migration. On ne touche jamais une migration déjà appliquée — on la
   **supersede** par `CREATE OR REPLACE` dans une nouvelle migration.

   Piège récurrent : ajouter un paramètre avec `DEFAULT` ne **remplace pas** une fonction,
   il crée une **surcharge** → ambiguïté sur les appels existants. Il faut `DROP` l'ancienne
   signature puis recréer.

3. **Gate SQL auto-rollback PAR migration** (preuve, pas affirmation). Un test `DO $$ … $$`
   qui : pose le contexte de rôle, fabrique une fixture jetable, exerce le chemin **dans les
   deux sens** (ex. excédent ET déficit, mono- ET multi-clé), inclut une assertion
   **anti-vacuité** (prouver qu'une écriture a bien été posée avant de conclure « 0 anomalie »),
   et finit par `RAISE 'ROLLBACK_TEST_OK'` capté en EXCEPTION (rien ne persiste). Plus la
   **non-régression** des gates voisins. Un CHECK comptable se prouve sur un **montant non
   divisible** par les quote-parts, sinon la branche d'arrondi cumulatif n'est jamais exercée.

   Gotcha SQL : un `CHECK` **passe quand l'expression vaut NULL** (seul FALSE bloque) →
   `colonne in (...)` ne suffit pas, mettre un `is not null` explicite.

4. **Revue de code adversariale** sur le diff réel (pas seulement le plan) : angles
   correction / équivalence-sémantique / complétude. Trier vrai bug / faux positif / différé.

5. **PR petite + squash-merge**, un jalon par PR, message qui **trace la preuve** (gates
   verts) et **documente les décisions réversibles** (ex. choix d'un code de compte) comme
   vetoables.

## Heuristique « ne pas deviner les règles métier »
Quand une classification/règle dépend d'un texte normatif (ici un arrêté comptable),
**la structure** (colonne + contrainte + fonctions qui la lisent) est mécanique et sûre,
mais **les valeurs de classification** se sourcent (recherche / expert), jamais à l'intuition,
et restent **ajustables par une simple data-migration**. Séparer les deux dé-risque.
