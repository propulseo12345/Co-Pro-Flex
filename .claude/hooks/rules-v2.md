🛑 RÈGLES v2 — CoProFlex (rappel automatique à chaque message ; garder synchro avec le skill methodo-coproflex)

1. FROM-SCRATCH : on ne REPRODUIT pas l'ancien ; jamais « supprimer le code v1 » (il meurt gelé). Corriger > copier.
   1-bis. COPIE À DEUX VOIES (BL 2026-06-28) : (1) ALGORITHME / corps de RPC éprouvé → copier qqfq quasi-littéral (réécrire = risque de bug). (2) PÉRIMÈTRE / valeurs d'enum / câblage / inclusion table·colonne·trigger·vue → filtre FROM-SCRATCH + finance-first OBLIGATOIRE et PREMIER, défaut MAIGRE, CHAQUE inclusion justifiée par « le golden l'exerce » ou « une FK/vue de la baseline en a besoin ». Jamais hériter du scope v1 « parce que c'est là » ; un confort technique (ex. éviter une re-migration) ne prime JAMAIS sur le from-scratch (et se vérifie : ALTER TYPE ADD VALUE est trivial).
2. GRAND LIVRE = source unique des chiffres ; solutionner la CAUSE, JAMAIS maquiller (ni « skip »/truquer un test).
   2-bis. DOCTRINE ÉTATS (G24-T11) : statuts « conséquence des comptes » (payé/impayé, soldé, réalisé) = TOUJOURS calculés depuis le GL, jamais un drapeau stocké ; statuts « événementiels » (AG, ordre de service, stade de recouvrement) = stockés mais changés UNIQUEMENT par une fonction de transition serveur unique et gardée (jamais d'UPDATE direct éparpillé).
2-ter. CAUSE RACINE, JAMAIS DE CONTOURNEMENT (tout bug, pas que la finance) : un bug = un symptôme → diagnostiquer, comprendre, corriger À LA SOURCE, re-vérifier, AVANT d'avancer. INTERDIT de masquer le problème : `@ts-ignore`/`eslint-disable`/skip d'un test, try-catch qui avale l'erreur, valeur par défaut ou hardcode qui cache, retry qui planque une vraie panne, désactiver/contourner un gate pour « faire passer ». Cause ambiguë ou comptable → STOP + question (ne pas deviner). Réflexe = skill `systematic-debugging`.
3. FRANÇAIS VULGARISÉ : le pourquoi avant le comment, métaphores du quotidien, zéro jargon nu.
4. STACK RÉELLE : Tailwind CSS + shadcn/ui (composants copiés/possédés dans le repo, thème = NOS tokens ; JAMAIS de couleur en dur → toujours un token) ; react-query + server functions → RPC SQL ; edge = cron/webhooks only. *(Bascule CSS Modules → Tailwind actée le 2026-06-28, cf. FRONT-* dans REFONTE_DECISIONS.)*
5. CONFIRMER avant tout gros changement ; petites modifs évidentes = agir.
   5-bis. SUPPRESSION = ACCORD EN AMONT (USER 2026-06-28, ferme) : AUCUNE suppression sans validation explicite de Lyes AVANT — fichier/dossier (`rm`, `rm -rf`, `git rm`), table/colonne/fonction/donnée en base (`DROP`, `DELETE`, `TRUNCATE`), ni purge massive de code/lignes au-delà d'un edit ciblé. Vaut AUSSI pour les fichiers « jetables » (sondes, temporaires) et le ménage : ne JAMAIS supposer qu'un chemin est sûr. AVANT de proposer : regarder la cible (`git status`/`ls`/lire) — si je ne l'ai pas créée moi-même dans CETTE session, la suppression est suspecte. Réflexe = lister ce qui partirait, demander, attendre le OUI. *(Né d'un `rm -rf` qui a emporté le squelette `features/` déjà committé.)*

6. DoD STRICTE (toute feature ; typo/rename pur exempté) :
   • Toujours : tsc 0 (aucun any) · tests unit · 1 e2e Playwright qui PROUVE l'effet EN BASE (count/somme exacts, jamais un 200/redirection seul) · NON-RÉGRESSION (toute la suite e2e + tous les gates SQL verts) · lint · /simplify + re-test · code review multi-agents · vérif navigateur Lyes · 1 PR + push.
   • Si BASE (migration/RPC/RLS) : revue d'impact en cascade AVANT · test BEGIN/ROLLBACK avant apply · Security Advisor 0 (rls_disabled).
   • Si FINANCE/GL : audit_finance_integrity = 0 · équilibre GL · golden inchangé (parité résultat).
   • SEED BÉNI = AVAL D'UN ONBOARDING PROUVÉ (BL-07, USER 2026-06-28) : la fonction de seed golden naît d'un VRAI test Playwright d'onboarding (vrais écrans → RPC → GL) qui PROUVE le golden en base ; on la cristallise SEULEMENT une fois ce parcours vert (jamais une fixture écrite à la main, jamais figée en amont). Tant que l'écran d'onboarding n'existe pas, un socle SQL se prouve par le SCÉNARIO SQL des RPC (count/sommes exacts, BEGIN/ROLLBACK).
   • Boucle autonome (nuit) : jamais skip/désactiver/truquer un test (sinon ROUGE + signal) · LIMITE de tentatives par point puis on passe · « code faux » = corrige+reboucle / « attendu ambigu/comptable » = STOP + question à Lyes · compte-rendu au réveil.

7. GLOSSAIRES (vocabulaire canonique) : avant de nommer un concept, lire CONTEXT.md (métier+compta) et docs/claude/glossaire-technique.md (technique). Si tu croises OU renommes un terme ambigu → ajoute-le (ou tranche son `_Avoid_`) dans le bon glossaire, DANS LA MÊME PR — règle TRANSVERSE, y compris aux PR de rename/typo (l'exemption « rename pur » ne s'y applique pas).

🔧 MAINTENANCE (ne rien laisser se périmer) :
   • Décision de MÉTHODE (nouvelle règle de travail) → mettre à jour le skill methodo-coproflex ET ce fichier rules-v2.md.
   • Décision PRODUIT/MÉTIER → la consigner au fil dans .planning/REFONTE_DECISIONS_2026-06-23.md.
   • TERME métier/technique ambigu croisé ou renommé → CONTEXT.md / glossaire-technique.md (même PR).
   • CHANTIERS : tenir à jour .planning/CHANTIERS.md (registre des chantiers, statuts) — le consulter au début de session, ne jamais laisser un « design validé » ou « parké » sans prochaine action.

💾 SAUVEGARDE : consigner les décisions au fil ; avant une compaction de contexte ou en fin de session → point dans .planning/SESSION.md + proposer /token-saver save (ne rien perdre).
