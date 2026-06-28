🛑 RÈGLES v2 — CoProFlex (rappel automatique à chaque message ; garder synchro avec le skill methodo-coproflex)

1. FROM-SCRATCH : on ne REPRODUIT pas l'ancien ; jamais « supprimer le code v1 » (il meurt gelé). Corriger > copier.
2. GRAND LIVRE = source unique des chiffres ; solutionner la CAUSE, JAMAIS maquiller (ni « skip »/truquer un test).
   2-bis. DOCTRINE ÉTATS (G24-T11) : statuts « conséquence des comptes » (payé/impayé, soldé, réalisé) = TOUJOURS calculés depuis le GL, jamais un drapeau stocké ; statuts « événementiels » (AG, ordre de service, stade de recouvrement) = stockés mais changés UNIQUEMENT par une fonction de transition serveur unique et gardée (jamais d'UPDATE direct éparpillé).
3. FRANÇAIS VULGARISÉ : le pourquoi avant le comment, métaphores du quotidien, zéro jargon nu.
4. STACK RÉELLE : Tailwind CSS + shadcn/ui (composants copiés/possédés dans le repo, thème = NOS tokens ; JAMAIS de couleur en dur → toujours un token) ; react-query + server functions → RPC SQL ; edge = cron/webhooks only. *(Bascule CSS Modules → Tailwind actée le 2026-06-28, cf. FRONT-* dans REFONTE_DECISIONS.)*
5. CONFIRMER avant tout gros changement ; petites modifs évidentes = agir.

6. DoD STRICTE (toute feature ; typo/rename pur exempté) :
   • Toujours : tsc 0 (aucun any) · tests unit · 1 e2e Playwright qui PROUVE l'effet EN BASE (count/somme exacts, jamais un 200/redirection seul) · NON-RÉGRESSION (toute la suite e2e + tous les gates SQL verts) · lint · /simplify + re-test · code review multi-agents · vérif navigateur Lyes · 1 PR + push.
   • Si BASE (migration/RPC/RLS) : revue d'impact en cascade AVANT · test BEGIN/ROLLBACK avant apply · Security Advisor 0 (rls_disabled).
   • Si FINANCE/GL : audit_finance_integrity = 0 · équilibre GL · golden inchangé (parité résultat).
   • Boucle autonome (nuit) : jamais skip/désactiver/truquer un test (sinon ROUGE + signal) · LIMITE de tentatives par point puis on passe · « code faux » = corrige+reboucle / « attendu ambigu/comptable » = STOP + question à Lyes · compte-rendu au réveil.

7. GLOSSAIRES (vocabulaire canonique) : avant de nommer un concept, lire CONTEXT.md (métier+compta) et docs/claude/glossaire-technique.md (technique). Si tu croises OU renommes un terme ambigu → ajoute-le (ou tranche son `_Avoid_`) dans le bon glossaire, DANS LA MÊME PR — règle TRANSVERSE, y compris aux PR de rename/typo (l'exemption « rename pur » ne s'y applique pas).

🔧 MAINTENANCE (ne rien laisser se périmer) :
   • Décision de MÉTHODE (nouvelle règle de travail) → mettre à jour le skill methodo-coproflex ET ce fichier rules-v2.md.
   • Décision PRODUIT/MÉTIER → la consigner au fil dans .planning/REFONTE_DECISIONS_2026-06-23.md.
   • TERME métier/technique ambigu croisé ou renommé → CONTEXT.md / glossaire-technique.md (même PR).
   • CHANTIERS : tenir à jour .planning/CHANTIERS.md (registre des chantiers, statuts) — le consulter au début de session, ne jamais laisser un « design validé » ou « parké » sans prochaine action.

💾 SAUVEGARDE : consigner les décisions au fil ; avant une compaction de contexte ou en fin de session → point dans .planning/SESSION.md + proposer /token-saver save (ne rien perdre).
