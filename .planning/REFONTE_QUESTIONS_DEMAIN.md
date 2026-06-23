# BATTERIE DE QUESTIONS — GRILLING REFONTE (2026-06-22, pour demain)

> Préambule. Les 9 décisions acquises ne sont jamais re-posées. Chaque question vise une décision à trancher demain pour dérouler la reconstruction sans ambiguïté. Format : (a) question, (b) options quand pertinent, (c) recommandation + justification courte. La phase 1 (valider/corriger le moteur sans UI) est supposée prioritaire : les questions « moteur » sont à trancher en premier, les questions « écran » servent la phase 2.

---

## A. Périmètre & phasage

**A1. Les deux nouveaux espaces (copropriétaire, conseil) entrent-ils dans CE chantier de reconstruction, ou après le go-live de l'espace gestionnaire ?**
- (b) Options : (1) gestionnaire seul d'abord, copro/conseil en chantier 2 ; (2) gestionnaire + copro dans le même chantier (le portail copro V1 est « pur UI, zéro migration », spec prête) ; (3) les trois d'un coup.
- (c) Recommandation : **option 1**, mais en figeant dès maintenant `getPortalContext()` et le modèle de visibilité (3 cercles) pour ne pas avoir à reconcevoir la sécurité plus tard. Le portail copro est une **obligation légale ALUR (P0 dans l'audit)** : il doit être planifié, pas oublié, mais le construire AVANT que la compta annuelle soit recettée de bout en bout serait prématuré (il consomme les vues finance). On le greffe juste après le socle finance prouvé.

**A2. Le conseil syndical = 4ᵉ route group autonome, ou extension du portail copropriétaire (`role: 'conseil'` dans `getPortalContext()`) ?**
- (c) Recommandation : **extension du portail copro**. Le conseil = un copropriétaire avec un cercle de visibilité élargi ; un 4ᵉ groupe triplerait le code de sécurité. Confirme la reco déjà posée dans le cadrage UX.

**A3. Niveau d'exhaustivité visé pour la V1 reconstruite : « parité fonctionnelle de l'ancien » ou « prêt pour un VRAI syndic » (combler les gaps légaux P0/P1) ?**
- (b) Options : (1) parité stricte avec l'ancien (mêmes features, mieux dessinées) ; (2) parité + gaps P0 légaux (extranet, pièces convocation forcées, mise en demeure réelle) ; (3) parité + tous gaps P0+P1.
- (c) Recommandation : **option 2**. Le brief cible « prêt pour un vrai syndic » : les P0 légaux (extranet ALUR, pièces obligatoires, boucle annuelle recettée, état daté branché, envoi recommandé réel) doivent être dans le périmètre de reconstruction, sinon on rebâtit un produit non vendable. Les P1 (mandat, honoraires, PPT/DPE réels, plan d'apurement) sont planifiés en backlog post-V1.

**A4. Gaps légaux à combler MAINTENANT (pendant la reconstruction) vs PLUS TARD (backlog) — liste à trancher poste par poste.**
- (b) À arbitrer un par un : extranet copro (P0) · pièces convocation forcées (P0) · mise en demeure LRE réelle (P0) · jours francs art.64 (P1) · règle 3 mandats art.22 (P1) · mandat syndic entité (P1) · honoraires (P1) · fiche synthétique auto (P1) · RNC téléservice (P1) · PPT/DPE réels (P1) · plan d'apurement (P1) · 105 ALUR éclaté par lot (P1) · RGPD formalisé (P1) · mise en concurrence contrats art.21 (P1).
- (c) Recommandation : **MAINTENANT = les 3 P0 non-extranet (pièces convocation, mise en demeure, jours francs) + extranet juste après socle finance**. Le reste en backlog priorisé, car ce sont des modules additifs qui ne contraignent pas l'architecture du socle.

**A5. Le « moteur sans UI » de la phase 1 inclut-il les chaînes CASSÉES à réparer avant tout écran (budget non matérialisé depuis l'AG, action_type non câblé, cut-off 408/486 sans appelant) ?**
- (c) Recommandation : **oui, c'est le cœur de la phase 1**. Trois ruptures racines bloquent tout le cycle annuel : (1) aucun écrivain ne matérialise `budgets` depuis `ag_resolutions.budget_postes` ; (2) `action_type=NULL` à la création de résolution → `prepare_ag_decisions` ignore tout → activation no-op ; (3) `post_period_cutoff`/`open_next_period` sans appelant applicatif. Tant que ces 3 ne sont pas réparées et prouvées en SQL, aucune UI au-dessus n'a de sens.

**A6. Ordre de construction par dépendance de données : confirme-t-on la séquence socle → AG/budget → appels/encaissement → clôture → consommateurs (impayés, portail, dashboard) ?**
- (c) Recommandation : **oui**. Les vues impayés, relevé individuel, état daté, dashboard sont des consommateurs terminaux : les migrer avant que appels+encaissement écrivent des données réelles rend tout test de parité vacue (aujourd'hui `payments=0` sur le live). Séquence : (1) socle GL + plan comptable ; (2) AG→budget→activation ; (3) appels→encaissement FIFO ; (4) clôture/affectation/à-nouveau ; (5) cut-off 408/486 ; (6) état daté + mutations ; (7) impayés/relances/contentieux ; (8) portail + dashboard.

**A7. Sur quelle copro recette-t-on la boucle annuelle de bout en bout (le test décisif jamais passé) ?**
- (b) Options : golden « Domaine des Tilleuls » (18 lots, 10000 tantièmes, 2 exercices — plan validé mais seed pas encore migré) ; copro E2E jetable ; copro réelle vide (Résidence Martin/Paris Ivry).
- (c) Recommandation : **golden Domaine des Tilleuls**, en migrant d'abord `create_test_copro_seeded` à la forme golden (aujourd'hui en drift : 4 lots/1000/3 clés). La boucle annuelle (clôture→affectation→à-nouveau) n'a JAMAIS tourné en prod — c'est le critère de sortie de phase 1.

---

## B. Châssis & technique

**B1. Stratégie de versions sur framework ALPHA (TanStack Start) : épinglage exact ou plages semver ?**
- (c) Recommandation : **épinglage EXACT** (pas de `^`/`~`/`latest`) sur toute la famille `@tanstack/*` + Vite 8 + TS 6, aux versions du POC (start 1.168.26, router 1.170.16, ssr-query 1.167.1, plugin 1.168.18, vite 8.0.16). `npm ci` en CI. MAJ manuelle par lot toute la famille ensemble, validée par le golden. Plan B = rester figé (pas de CVE qui force la main sur un alpha). Le POC a 5 `latest` à corriger d'abord.

**B2. Couche data : `useAsyncData` maison (5 hooks, ~70 consommateurs) vs `@tanstack/react-query` ?**
- (b) Options : tout react-query au châssis (big-bang) ; tout useAsyncData ; hybride par zone.
- (c) Recommandation : **hybride**. Châssis = copier `useAsyncData` tel quel (`ApiResult<T>` portable, zéro risque) ; câbler react-query dès le châssis via `react-router-ssr-query` (déjà dépendance) mais sans migrer de hook ; règle d'équipe : **tout nouveau hook en react-query + loader**, l'ancien gelé, migré opportunistiquement. Ne pas mélanger refonte data et migration framework (sinon on ne sait plus d'où vient une régression du golden).

**B3. Garde d'auth : porter `updateSession` en middleware global deny-by-default, ou s'appuyer sur `beforeLoad` par route ?**
- (c) Recommandation : **middleware `requestMiddleware` global deny-by-default, allowlist identique au Next actuel**. Le `beforeLoad` par route du POC est une denylist implicite = exactement le mécanisme de la faille 0085 (routes oubliées chargées en anonyme). Le middleware appelle `auth.getUser()` (validation serveur, jamais `getSession()`). `beforeLoad`/layout `_authenticated` = confort UX/typage seulement. RLS = dernier rempart.

**B4. Test n°1 du châssis : quel critère de validation AVANT de migrer la moindre feature ?**
- (c) Recommandation : **3 tests e2e bloquants** : (1) anonyme sur TOUTES les routes protégées (générées depuis l'arbre, incluant les oubliées de 0085 : `/conformite`, `/contentieux`, `/conseil-syndical`, `/legal`, `/sales`…) → chacune redirige `/login`, aucune ne rend de contenu ; (2) route bidon SANS `beforeLoad` → anonyme quand même redirigé (preuve que le deny-by-default tient au niveau middleware, pas route) ; (3) RLS : connecté `coprosCount>0`, faux user `0`/erreur. Tant que rouge, on ne migre rien.

**B5. RLS : confirme-t-on l'activation ON+FORCE sur tables sensibles avant tout vrai utilisateur, et le provisionnement d'un 2ᵉ cabinet de test permanent ?**
- (c) Recommandation : **oui aux deux**. La mémoire dit « ON+FORCE » mais l'audit a constaté ON sans FORCE → activer FORCE. Et la base live n'a qu'UN cabinet réel : sans 2ᵉ tenant permanent, l'étanchéité multi-copro n'est testable qu'en BEGIN/ROLLBACK fictif. Provisionner un cabinet B de non-régression. Bonus : convertir la faille `platform_admin` (escalade de privilèges) avant tout.

**B6. Déploiement : rester sur Vercel ou changer d'hébergeur pendant la migration ?**
- (c) Recommandation : **rester sur Vercel** (preset Start supporté). On change déjà de framework — ne pas cumuler un changement d'hébergeur. Node/Docker en plan B portable (utile si websockets temps réel pour le projecteur AG). Décision hébergeur reportée post-migration.

**B7. Env / fonts : politique de renommage et self-hosting ?**
- (c) Recommandation : `NEXT_PUBLIC_*` → `VITE_*` (client) / `process.env.*` (serveur), **audit exhaustif** de chaque variable classée client/serveur (un oubli = `undefined` runtime). Fonts : `@fontsource-variable/inter` self-hosté (pas de `next/font`, pas de Google Fonts runtime), mono `SF Mono` système + fallback `@fontsource/fira-code` pour les montants.

**B8. i18n : embarque-t-on une lib de traduction ?**
- (c) Recommandation : **NON, aucun i18n**. App mono-langue français (libellés légaux français). Les « doublons EN/FR » sont de la dette de NOMMAGE, pas de traduction — à traiter séparément (et c'est la décision acquise #7 : un seul chemin par feature). Une lib i18n serait de la complexité gratuite.

**B9. CI anti-faux-vert : comment garantir qu'un « vert » prouve un travail réel (piège Windows exit 0) ?**
- (c) Recommandation : **suite e2e unique pilotée par `E2E_BASE_URL`** jouée contre Next ET Start (golden de parité) ; **CI sous Linux** (ubuntu-latest, pas Windows local) ; **health-check HTTP obligatoire** (boucle until-200) via `webServer` natif Playwright, jamais sur exit code ; pipeline `npm ci → tsc → build → health-check → e2e → vitest`. Plus la règle inscrite en CLAUDE.md : tout test e2e qui écrit doit prouver l'effet EN BASE (service-role, count/somme exacts), jamais un 200 ou une redirection seule, jamais `toBeGreaterThanOrEqual(0)`.

**B10. Faut-il une garde « seed-vs-golden » bloquante en CI ?**
- (c) Recommandation : **oui**. Une gate qui asserte que `create_test_copro_seeded` produit EXACTEMENT la forme golden (18 lots, total_tantiemes=10000, 1 clé générale + 5 spéciales). Tant que le seed reste en 4 lots/1000/3 clés, marquer ROUGE bloquant pour empêcher tout test adverse de valider une copro-jouet non représentative.

---

## C. Design / UX
> 🔁 **Ces questions C1→C9 sont tranchées et RENOMMÉES en slugs `UX-*` / `VIS-*`** dans `REFONTE_DECISIONS_2026-06-23.md` (voir la table de correspondance). **Ne plus citer « C-n » pour le design** — ambigu avec les « C » finance de `DECISIONS.md`. Un chantier = un préfixe unique.

**C1. Source de vérité du design system : aligner `globals.css` sur `design-system.md`, ou l'inverse ?**
- (b) Options : aligner le CSS sur le doc (saturé -500/-600, borders 0.08, texte `#e2e8f0`) ; mettre le doc à jour pour refléter le CSS pastel actuel.
- (c) Recommandation : **aligner le CSS sur le doc** (saturé = plus lisible pour les montants financiers, intention manager-first). Conflit confirmé et net (texte, success, danger, warning, primary, surface, border tous divergents). Comme on reconstruit from-scratch en v2, on part directement des tokens cibles du doc. Supprimer aussi le §Design System de `modules.md` (3ᵉ source divergente) et la référence `da-preview.html` (4ᵉ).

**C2. Light theme : livrable supporté ou gelé en v2 ?**
- (c) Recommandation : **geler le light theme en v2** (focus dark, manager-first). Le supporter = double effort de design sur 3 espaces × 2 thèmes, et ses contrastes tertiaires sont déjà non conformes. À réintroduire post-V1 si demande client.

**C3. Architecture d'information : combien de hubs au niveau copro, et quelle recomposition des modules ?**
- (b) Options : garder les 8 modules actuels redessinés ; refondre en 6 hubs métier.
- (c) Recommandation : **6 hubs métier** : Accueil · Copropriété · Assemblées · Finance · Maintenance (PPT/DPE fusionnés ici) · Documents & comm · Recouvrement (impayés+relances+litiges+ventes/état daté). « Conformité 2026 » disparaît comme module (PPT/DPE→Maintenance, Factur-X→Finance). « Contentieux »→« Recouvrement ». Objectif : 2 clics max pour 90% des actions.

**C4. Navigation : un seul système (la décision #7 « une seule biblio UI » l'implique) — lequel garder ?**
- (b) Options : sidebar accordéon seule ; barre haute (HighBar) seule ; les deux.
- (c) Recommandation : **sidebar accordéon comme nav principale + en-tête réduit** (switcher copro + recherche + notifications + user réel). Aujourd'hui HighBar ET UnifiedSidebar consomment le même `MODULES` = doublon. Récupérer le bon balisage ARIA de recherche de HighBar dans l'en-tête.

**C5. Architecture d'accueil : « file de travail » (tâches à traiter) ou tableaux bruts ?**
- (c) Recommandation : **file de travail orientée action** à tous les niveaux : accueil cabinet ET chaque hub ouvrent sur « ce qui demande une décision » (impayés échus, AG à convoquer dans les délais art.64, appels à émettre, factures à valider, rapprochements en attente, contrats/diagnostics expirants) avec montants et échéances datées. Le bento dashboard existant est la bonne base.

**C6. Contexte copro : restaure-t-on un switcher de copro active permanent (sortir du `SINGLE_COPRO_MODE=true`) ?**
- (c) Recommandation : **oui**. Un cabinet est multi-copro par nature. La copro active = contexte permanent visible en en-tête, commutable en 1 clic, jamais re-déduit page par page. Retirer le `|| true` sur `isManager` et l'identité hardcodée « Jean Dupont ».

**C7. Cible matérielle : le gestionnaire doit-il TRAVAILLER sur mobile/tablette ou seulement CONSULTER ?**
- (b) Options : full responsive (saisie, validation, vote AG sur tablette) ; vue lecture allégée mobile, travail desktop seulement.
- (c) Recommandation : **desktop-first pour le travail + vue lecture allégée mobile**. L'app est dense/data-heavy ; un syndic saisit sur desktop. Mais le responsive est un **chantier structurel** (aujourd'hui zéro support mobile, sidebar qui chevauche) : prévoir un drawer/hamburger et des tables à colonne figée, pas un patch cosmétique. Le portail copropriétaire, lui, doit être full responsive (les copros consultent sur mobile).

**C8. Objectif de conformité accessibilité : RGAA/WCAG formel ou amélioration pragmatique ?**
- (c) Recommandation : **WCAG 2.1 AA pragmatique** comme cible de qualité (focus-trap dans modales, toasts en région live, contrastes corrigés, cibles tactiles ≥44px, `prefers-reduced-motion`), sans viser une certification RGAA formelle en V1. Centraliser focus-trap/inertage dans Modal/Drawer partagés.

**C9. Composants de layout partagés à figer AVANT les pages : lesquels ?**
- (c) Recommandation : figer en `ui/` normés CSS Modules (jamais Tailwind) **avant toute page** : TopBar/en-tête contextuel, KPI strip, Table (triable, colonne figée), Badge, Modal (focus-trap), Sidebar, Toast (région live), FormField (Zod+RHF, `useWatch`). Réutilisés par les 3 espaces.

---

## D. Par catégorie métier

### Onboarding / Reprise de mandat

**D1. Sélecteur en tête de wizard « Nouvelle copropriété » vs « Reprise de mandat » avec étapes adaptées ?**
- (c) Recommandation : **oui, deux chemins explicites dès le portefeuille**. La reprise active soldes hérités + charges/produits courus + appels déjà émis ; le neuf les masque. Checklist des pièces légales obligatoires (assurance MRI, RC, état daté sortant, fonds ALUR transféré) en reprise.

**D2. Le `source_type` réellement écrit par `set_opening_balance` : `opening_onboarding` ou `opening_balance` ? (bloquant alerte reprise + résolution de période)**
- (c) Recommandation : **trancher empiriquement sur le live AVANT de coder l'UI**, puis unifier en UN seul source_type et supprimer le writer dupliqué `postOnboardingOpeningBalances`. C'est un prérequis à la fiabilité de l'alerte « reprise à terminer ».

**D3. Étapes orphelines (Documents / Contrats / Carnet d'entretien) : câbler ou retirer ?**
- (c) Recommandation : **câbler en reprise, masquer en neuf**. Un syndic entrant récupère un dossier complet — ces étapes sont attendues. Mais figer le compte d'étapes réel (8 affichées vs 7 réelles aujourd'hui).

**D4. Reprise des appels déjà émis : reconstitution écriture par écriture ou résumé en solde par lot ?**
- (c) Recommandation : **résumé en solde par lot via à-nouveau** pour la V1 (le 450 par lot reflète le restant dû), pas de re-création écriture par écriture des appels historiques. Reconstituer chaque appel passé est coûteux et hors périmètre légal (le grand livre du nouveau syndic démarre à la reprise).

**D5. Solde bancaire étape 4 : vraie écriture d'ouverture (512x) ou métadonnée saisie à nouveau en étape 7 ?**
- (c) Recommandation : **vraie écriture d'ouverture en reprise** (via set_opening_balance), capter seulement IBAN/BIC en neuf. Éviter la double saisie du solde (bug actuel).

**D6. Politique de finalisation : autoriser à terminer avec résidu 471/472 non soldé, ou statut « reprise provisoire » jusqu'à apurement ?**
- (c) Recommandation : **statut « reprise provisoire » non bloquant + aide au solde** (proposer les écarts probables) plutôt qu'un avertissement passif. Un syndic pro veut un dossier propre, mais ne pas bloquer la mise en service.

**D7. GoCardless / connexion bancaire : dans le périmètre reprise V1 ou saisie manuelle nominale ?**
- (c) Recommandation : **saisie manuelle nominale en V1**, connexion bancaire en lecture seule (vision API readonly, mémoire) en backlog. Ne pas bloquer la reconstruction sur une intégration externe.

### Copropriétaires & Lots

**D8. Modèle d'indivision/multipropriété : implémenter (plusieurs propriétaires/lot, quote-part, mandataire) ou différer ?**
- (c) Recommandation : **implémenter le modèle minimal** (lot_owners avec `share_percent` + `is_primary` + mandataire unique pour vote/appel). C'est une exigence syndic réelle et structurante pour le schéma — coûteux à rétro-fitter. La règle lot-centric tient : appels/créances par lot, mandataire unique reçoit l'appel.

**D9. Tantième général : ligne de la clé « general » (modèle actuel) ou colonne de `lots` ? (source unique à trancher)**
- (c) Recommandation : **ligne de la clé générale** (cohérent avec le mécanisme anti-double-comptage prouvé correct dans l'audit majorités, résolution en UNE ligne). Supprimer tout double stockage vue/ligne.

**D10. Validation tantièmes : garde serveur (trigger somme par clé = total copro) ou alerte cliente ?**
- (c) Recommandation : **garde serveur (trigger/contrainte)**. Mémoire « verify before create DB » + immutabilité. Verrouiller le tableau de répartition après approbation en AG, versionner les clés par exercice.

**D11. Suppression de lot portant des écritures : interdire/contre-passer comme le GL, ou hard delete ?**
- (c) Recommandation : **interdire (RESTRICT) si écritures/appels existent**, cohérent avec l'immutabilité du grand livre. Aujourd'hui hard delete sans garde.

**D12. Onglet Locataires : implémenter (gestion locative) ou retirer l'onglet fantôme ?**
- (c) Recommandation : **retirer** (hors périmètre syndic de copropriété). La gestion locative est un autre métier ; ne pas porter un onglet vide.

### Finance — Appels de fonds

**D13. Tout appel doit-il dériver d'un budget/résolution voté, ou autorise-t-on un appel libre ? (post_exceptional_call_for_funds n'existe pas en base)**
- (c) Recommandation : **livrer `post_exceptional_call_for_funds`** (exceptionnel→450-2/702, avance art.35→450-3/1031) en RPC dédiée + brancher le wizard. Aujourd'hui un syndic ne PEUT PAS créer d'appel hors validation budget AG — c'est un manque dur. L'appel courant reste dérivé du budget ; l'exceptionnel a sa route.

**D14. Doctrine d'échéancier : trimestriel imposé ou paramétrable par copro/budget ?**
- (c) Recommandation : **trimestriel par défaut (doctrine ARC, 1er jour de trimestre) paramétrable**. ATTENTION piège golden : pour le déterminisme des tests cents, l'appel **annuel unique** est requis sur la golden. Donc : trimestriel par défaut en prod, mode unique pour les tests.

**D15. Émission de l'appel : l'écriture GL est-elle posée à la création ou à la validation AG ?**
- (c) Recommandation : **conserver le comportement actuel** : `post_budget_call_for_funds` poste l'écriture à la création de l'appel ; `updateCallStatus` ne fait que basculer le statut. Ne pas réinventer un cycle brouillon→émis qui re-poste.

**D16. Relances : centralisées dans le module Recouvrement ou par appel ? Grain de calcul du niveau de relance ?**
- (c) Recommandation : **centralisées dans Recouvrement, grain par lot toutes natures confondues** (un copro a un solde global, pas une dette par appel). Cohérent avec la fusion Recouvrement (C3).

### Factures fournisseurs & paiements

**D17. Statuts : 5 statuts métier (BROUILLON/A_VALIDER/VALIDEE/A_PAYER/PAYEE) ou strictement 4 SQL (draft/posted/paid/cancelled) ?**
- (c) Recommandation : **strictement les 4 SQL**, statut piloté par les écritures. Le mapping à 5 écrase A_VALIDER→draft et VALIDEE→posted = ambiguïté. Supprimer les transitions décoratives.

**D18. Saisie = comptabilisation immédiate, ou vrai 2-temps brouillon→validation responsable ?**
- (c) Recommandation : **2-temps (saisie gestionnaire → validation responsable)** avec piste d'audit réelle (backend, pas « Utilisateur courant » en dur). Workflow à 2 mains attendu d'un syndic pro. Bug à corriger d'abord : la fiche détail flippe le statut SANS écriture GL (rupture silencieuse).

**D19. Mono-poste ou ventilation multi-comptes/multi-clés + rattachement opération travaux ?**
- (c) Recommandation : **ventilation multi-postes** (le payload prévoit déjà `budget_line_id`/`operation_id`). Requis pour les annexes légales et les travaux par opération. Brancher `budget_line_id` à la saisie.

**D20. Réalisé fournisseur → suivi budgétaire : option A (validation crée/MAJ une budget_expense liée) ou option B (vues budget dérivent le réalisé des ledger_lines classe 6) ?**
- (c) Recommandation : **option B** (dériver des `ledger_lines` classe 6 par account_id+period), plus alignée avec « GL = source unique ». Aujourd'hui une facture comptabilisée laisse le budget afficher consommé=0 (deux mondes parallèles budget_expenses vs supplier_invoices). Déprécier budget_expenses comme source de réalisé. **Décision métier à confirmer par l'expert.**

**D21. Règlement : choix d'un compte de trésorerie réel + IBAN bénéficiaire (vrai virement SEPA) ?**
- (c) Recommandation : **oui**, étendre `post_supplier_payment` pour accepter le compte de banque choisi (cohérence rapprochement bancaire). PaymentModal liste les vrais comptes 512 avec solde réel. SEPA/lot de paiement en P1.

**D22. Edge `pay_supplier_invoice` (déclarée, jamais appelée) vs RPC `post_supplier_payment` : laquelle supprimer ?**
- (c) Recommandation : **supprimer l'edge, garder la RPC**. Décision #7 (un seul chemin). Plus largement : trancher la stratégie edge globale (voir E2).

### Clôture / affectation / annexes

**D23. Affectation du résultat : déclenchée manuellement (bouton) ou automatiquement par APPROVE_ACCOUNTS en AG ?**
- (c) Recommandation : **automatiquement par l'activation de la résolution APPROVE_ACCOUNTS en AG**, lien explicite cycle comptable↔cycle AG. Aujourd'hui `regularize_period` n'est appelée nulle part. L'à-nouveau doit rester AVANT l'affectation (ordre SQL : open_next_period puis regularize_period).

**D24. Enchaînement clôture : un seul flux close→open_next→regularize, ou 3 actions distinctes ?**
- (c) Recommandation : **assistant séquentiel à étapes visibles** (feu tricolore par palier) mais orchestré par `activate_ag_decisions` comme SEUL point d'entrée complet. Câbler les 4 RPC orphelines (regularize_period, open_next_period, approve_period, reopen_period). Supprimer le code mort `approvePeriod` (UPDATE direct qui court-circuite l'orchestration) et `rejectPeriod` (enum 'rejected' inexistant).

**D25. Excédent courant : reste sur le 450 (apuré T1 N+1) par défaut avec remboursement optionnel — exposé à l'écran ?**
- (c) Recommandation : **oui, exposer le choix** (défaut = reste sur 450, option remboursement). Confirme la décision WP5.3 en mémoire. Distinguer clairement de l'apurement travaux (settle_works_balance, le 12 gelé volontairement).

**D26. Cut-off 408/486 art.14-3 : matérialiser la chaîne dans le parcours gestionnaire (aujourd'hui sans appelant) ?**
- (c) Recommandation : **oui, ajouter les wrappers `postPeriodCutoff()`/`openNextPeriod()`** et un écran cut-off sur N ouverte avant clôture. La chaîne légale (droits constatés) n'a JAMAIS tourné en prod (period_cutoff_items=0). Corriger aussi l'idempotence de `reverse_period_cutoff` (FK DELETE).

### AG

**D27. Étape « votes par correspondance » : `/preparation` ou `/votes-correspondance` ? Quel modèle de données canonique ?**
- (c) Recommandation : **fusionner en une seule étape**, choisir UN modèle (`useVotesCorrespondance` vs `useCorrespondenceVotes`) et supprimer l'autre + les routes legacy (`/ag`, `/minutes`, `/checklist`, `/resolutions-preview`). Parité avant suppression.

**D28. RUPTURE RACINE : comment câbler `action_type` à la création des résolutions standard (sinon activation no-op) ?**
- (b) Options : basculer `createStandardResolutions` sur `create_ag_with_standard_resolutions` (SQL, qui pose déjà action_type) ; propager action_type via addResolution + champ dans l'edge.
- (c) Recommandation : **basculer sur la RPC SQL `create_ag_with_standard_resolutions`**. C'est la tranche verticale qui débloque TOUT le cycle AG→GL. Exposer aussi action_type dans `updateResolution` (réparation a posteriori).

**D29. Câblage finance AG : qui écrit `budgets.source_ag_id` / `ag_resolutions.linked_budget_id` ? (RUPTURE 2)**
- (b) Options : à la saisie wizard (createBudget enrichi) ; dans `activate_ag_decisions` (auto-population pure AG→GL).
- (c) Recommandation : **dans `activate_ag_decisions`** via une fonction `create_budget_from_ag_resolution` insérée AVANT validate_budget, dans la transaction tout-ou-rien. Cohérent avec le principe directeur « AG→GL atomique ». Sinon CREATE_BUDGET/SCHEDULE_* lèvent 23503 et rollback toute l'activation.

**D30. Conformité légale AG exigée en V1 : plafond 3 mandats art.22, jours francs art.64, valeur probante envoi électronique, signature PV réelle ?**
- (c) Recommandation : **jours francs + plafond mandats art.22 en V1 (P1, gardes serveur)** ; signature électronique réelle (prestataire) et LRE valeur probante en P1 backlog (intégration externe). Le moteur de majorité reste seul juge (décision #8) — retirer le `checkMajority` front parallèle au profit d'un appel unique à `get_ag_live_results` (supprime la divergence seuil 26-1 : 500 SQL vs 501 front).

**D31. Projecteur de séance : temps réel serveur (Realtime) multi-appareils ou local mono-poste ?**
- (c) Recommandation : **Realtime serveur** (supprimer localStorage, persister tous les votes/désignations en DB, retirer les ids `_dup_`). Un projecteur local n'est pas fiable en séance. Garde l'option Node/Docker (B6) en tête pour le temps réel.

**D32. Remontée d'erreur PV : corriger le faux « partiel » (activate_ag_decisions ne renvoie jamais `failed`) ?**
- (c) Recommandation : **oui, corriger** (`usePVPage` lit `result.failed` toujours undefined → faux « partiel »). Et durcir `finalize_ag` pour refuser une AG où prepared=0 alors que des résolutions à effet existent (faux-vert finalisation).

### Ventes / État daté / Mutations

**D33. Clôture du compte vendeur à la mutation : génère-t-elle une écriture (transfert 45x) ou reste-t-elle un pointage informatif ?**
- (c) Recommandation : **décision expert requise**. Reco par défaut : **étape « clôture compte vendeur » tracée + écriture de régularisation** si le vendeur n'est pas à 0, plutôt qu'informatif. `validate_mutation` ne poste rien aujourd'hui. Confirmer aussi que le fonds ALUR (450-5) suit l'acquéreur SANS remboursement vendeur ni écriture (décision actée à reconfirmer).

**D34. Vendeur débiteur à la validation : bloquer ou avertissement non bloquant ?**
- (c) Recommandation : **avertissement non bloquant** (choix métier expert — le notaire peut séquestrer/opposer). Mais exposer clairement le solde vendeur réel (45x) dès l'ouverture du cockpit, pas seulement dans la modale.

**D35. Acquéreur : copro existant via annuaire OU tiers libre créé à la validation ?**
- (c) Recommandation : **les deux chemins** (choisir un copro existant OU saisir un tiers créé réellement à la validation via lot_owners). Abandonner le `buyer_draft` jsonb libre sans annuaire.

**D36. Opposition art.20-II (`record_mutation_opposition` câblée DB, aucune UI) : exposer ou retirer ?**
- (c) Recommandation : **exposer** (après envoi notaire), c'est une obligation/protection réelle du syndic. Pré-état daté = livrable distinct envoyé au notaire (délai 15j art.20), pas un brouillon interne.

**D37. Hub `/ventes-impayes` : scinder Ventes et Impayés ou hub combiné ?**
- (c) Recommandation : **fusionner dans le hub Recouvrement** (C3 : impayés+relances+litiges+ventes/état daté = un seul cycle). Supprimer la pile legacy (VentesProvider/useSalesData) — parité avant suppression.

### Maintenance / Prestataires

**D38. Carnet d'entretien = maison-mère des contrats/assurances, ou modules distincts (Carnet / Contrats / Assurances) ?**
- (c) Recommandation : **modules distincts avec vues croisées** sous le hub Maintenance. Sortir les assurances dans une section dédiée (MRI, RC, dommages-ouvrage, sinistres, échéances de prime). Source unique contrats = table `tiers`/`contracts` Supabase, supprimer le store mock localStorage.

**D39. PPT : dans Maintenance ou Conformité ? Vue autonome ou couche au-dessus des opérations travaux réelles ?**
- (c) Recommandation : **dans Maintenance, comme vue de planification au-dessus des opérations travaux réelles** (operation_id, classe 6 travaux, ALUR), PAS une 3ᵉ source de vérité travaux. Lié au fonds ALUR et aux votes d'AG (statut dérivé, pas saisi à la main). Relier DPE→PPT (pré-remplir depuis travauxRecommandes).

**D40. Coût « réalisé » d'un OS : saisi manuellement ou strictement dérivé des factures fournisseurs ?**
- (c) Recommandation : **dérivé des supplier_invoices** (cohérence compta d'engagement). Rattacher chaque OS/contrat à une clé de répartition / poste budgétaire pour l'imputation engagé→réalisé.

**D41. Envoi OS / résiliation : email/LRE réel (Edge) ou génération de document à envoyer manuellement ?**
- (c) Recommandation : **email réel via Edge en V1** (avec accusé), LRE en P1. Dépend de E2 (déploiement edge functions) et E3 (provider email).

**D42. Marketplace CoProFlex : vraie place de marché ou vitrine gelée pour V1 ?**
- (c) Recommandation : **geler/masquer** tant que non fonctionnelle (éviter l'effet démo). Avis vérifiés + RFQ en backlog.

### GED / Documents

**D43. Périmètre : un hub mélangeant GED documentaire et sorties comptables, ou séparer GED ↔ « Documents comptables » (rendus du GL) ?**
- (c) Recommandation : **séparer**. GED = vraie gestion de fichiers (hub Documents & comm) ; les rendus du grand livre (ledger/balance/closing/annexes/expenses) restent dans Finance. Supprimer la famille `/documents/*` legacy.

**D44. Modèle de confidentialité : 4 niveaux DB (public/council/manager/restricted) vs 4 front (PUBLIC/CS_ONLY/SYNDIC_ONLY/CONFIDENTIEL) — lequel canonique ? Droits REELS persistés ?**
- (c) Recommandation : **les 4 niveaux DB canoniques**, persister visibility + journaliser les accès (document_access_log) + brancher la RLS. Aujourd'hui c'est cosmétique. Garder le niveau « confidentiel par utilisateur nommé » si besoin CS (table de droits par doc).

**D45. Documents réglementaires : vraie entité avec dates de validité + alertes d'expiration, ou simples documents tagués ?**
- (c) Recommandation : **vraie entité avec dates de validité + tableau de bord d'expiration** (diagnostics, contrôles ascenseur/chaufferie/extincteurs, décennale, DTA). Attendu fort du métier syndic (la matière existe : v_documents_expiring, morte). Conservation légale : soft-delete avec deletion_blocked + retention_years par catégorie (PV, comptes, contrats).

### Communication

**D46. Deux canaux (chat interne + email Resend) ou unifié ? Quel est le canal officiel légal syndic↔copro ?**
- (c) Recommandation : **garder deux canaux distincts** : chat interne (échanges courants) + email transactionnel (notifications). Le canal officiel légal (convocation/PV) reste le dispatch dédié AG avec traçabilité. Ne pas mélanger conversation et acte juridique.

**D47. Mur : qui peut publier ? Modération a priori ou a posteriori ?**
- (c) Recommandation : **publication copro libre + modération a posteriori** (signalement/verrouillage via is_locked déjà en base), avec visibilité (tous/conseil/gestionnaires) exposée. Décision à confirmer (risque contentieux vs argument commercial).

**D48. Boîte mail : partagée par copro (modèle actuel RLS) ou par gestionnaire ? Règle de routage mail entrant→copro ?**
- (c) Recommandation : **boîte collective par copro** (modèle actuel cohérent). Routage : passer du `MAIL_INBOUND_COPRO_ID` (env var, une seule copro) à une **sous-adresse par copro** (parsing du destinataire). À figer.

**D49. Agenda/événements (table `events` existe, edge la gère, ZERO UI) : dans Communication V1 ou hors V1 ?**
- (c) Recommandation : **dans le hub Documents & comm en V1** (calendrier copro : AG, interventions, échéances légales). La matière existe, c'est un attendu syndic.

### Conseil syndical (outil gestionnaire)

**D50. Le CS devient-il une entité persistée (mandat, dates, nb statutaire, quorum 3 ans art.22) ou reste une collection de membres ?**
- (c) Recommandation : **entité persistée** (mandat 3 ans, date prochaine ré-élection, président mis en avant, alerte échéance). Vue gouvernance manager-first + historique des conseils passés (v_council_members_detail expose déjà is_active/end_date).

**D51. Le gestionnaire peut-il modifier la composition hors AG (cooptation art.25, démission, correction de rôle) ?**
- (c) Recommandation : **oui pour démission/correction/cooptation entre deux AG** (besoin réel), la composition élue restant pilotée par ELECT_COUNCIL en AG. Ajouter la policy d'écriture council_members (notée manquante en 0053).

**D52. Feature « décisions du conseil entre AG » (council-workflow / council_decisions / council_votes) : câbler ou supprimer ?**
- (c) Recommandation : **câbler une UI minimale** (consultation CS sur devis/travaux, vote majorité simple, traçabilité art.21) si l'espace conseil (A2) est dans le périmètre ; sinon **supprimer** pour ne pas laisser une demi-feature. Lier au choix A1/A2.

**D53. Rapport d'activité CS : éditeur rich-text réel + upload annexes réel + lien auto à la convocation AG d'approbation des comptes ?**
- (c) Recommandation : **oui aux trois** : rich-text HTML (le modèle stocke du HTML, l'UI ne fait que du texte = incohérence), upload Supabase Storage réel, annexer auto à la convocation (art.21, lierResolution existe inutilisée). Câbler ou supprimer le générateur PDF débranché (le câbler).

### Conformité (DPE / PPT / Factur-X)

**D54. Persister le domaine en base (previsional_works, dpe_collectif versionné, e_invoices) — aujourd'hui 100% mock ?**
- (c) Recommandation : **oui, persister**, mais PPT comme vue au-dessus des opérations travaux réelles (D39, pas de 3ᵉ source). DPE : 1 par bâtiment (multi-DPE possible sur copro multi-bâtiments comme la golden Tilleuls 2 bâtiments). Versionner le DPE en base (historique des diagnostics).

**D55. Factur-X : sortantes (appels) ou seulement entrantes (fournisseurs) ? Niveau d'intégration PDP/PPF en V1 ?**
- (c) Recommandation : **entrantes fournisseurs d'abord, génération de fichier conforme (PDF/A-3 + XML EN 16931) sans transmission PDP/PPF en V1**. Intégré au module Factures fournisseurs (pas de duplication mock). Statut d'un syndic mandataire vis-à-vis B2B à trancher avec l'expert avant de modéliser les sortantes.

**D56. Déclenchement automatique des échéances légales (seuils PPT, tranches DPE, calendrier e-facturation) : calculé par copro ou sous-titres en dur ?**
- (c) Recommandation : **calculé dynamiquement par copro** (applicabilité selon taille/âge/lots principaux). Nécessite de distinguer lots principaux/annexes dans `copros`. Tableau de bord conformité agrégé multi-copro avec tri par urgence.

### Contentieux / Litiges

**D57. Périmètre Litiges : contentieux financier seul (impayés→procédure) ou aussi non financier (voisinage, travaux, dégâts des eaux) ?**
- (c) Recommandation : **contentieux financier en V1** (cœur du recouvrement), modèle « affaires » non financier en P1 (le modèle entities/litiges.ts existe, polymorphe). Une seule table « affaires » extensible plutôt que deux features.

**D58. « Réglé » d'un impayé : obligatoirement un encaissement comptable, ou bouton manuel ?**
- (c) Recommandation : **obligatoirement un encaissement** (paiement D512/C450 avec imputation FIFO cloisonnée par nature). Supprimer le bouton « marquer réglé » (setState). Un impayé ne se règle pas, il s'encaisse (mémoire payment_imputation_rules).

**D59. Statut d'impayé : dérivé du GL + relances réelles (auto) ou piloté manuellement (stade juridique) ?**
- (c) Recommandation : **hybride** : le montant/ancienneté dérivés du GL (auto, fiable), le stade juridique posé à la main par le gestionnaire (commandement, audience, jugement). Aujourd'hui heuristique fragile.

**D60. Relances J+15/30/60/90 (payment_reminder_rules + pg_cron 0055) : automatiques ou action manuelle assistée ? Qui valide une LRAR/mise en demeure ?**
- (c) Recommandation : **relances simples automatiques (cron), mise en demeure/LRAR validées manuellement** par le gestionnaire (acte engageant). Garantir l'envoi recommandé réel (sinon aucun délai légal ne court — risque juridique P0).

**D61. Frais de recouvrement art.10-1 : modéliser + imputer automatiquement au copro défaillant avec écritures ?**
- (c) Recommandation : **modéliser + imputer** (relance, mise en demeure, huissier, avocat) avec écritures associées. C'est un attendu pro. P1 si charge trop lourde pour la V1.

### Paramètres

**D62. Le paramétrage lots/clés/tantièmes reste sous `/settings` ou migre vers `/coproprietaires` + Finance, `/settings` ne gardant que le transverse ?**
- (c) Recommandation : **migrer dans le hub Copropriété** (structure : bâtiments+lots+clés+tantièmes+copropriétaires unifiés), `/settings` ne garde que les réglages transverses. Aujourd'hui dédoublé/incohérent (mock dans /settings/info qui réinvente la structure).

**D63. Modification des tantièmes en cours d'exercice : interdite (immutabilité) ou autorisée avec historisation/date d'effet ?**
- (c) Recommandation : **interdite sur exercice clôturé, historisée avec date d'effet sinon** (versionner les clés par exercice, D10). Garde-fou : impossible de modifier des tantièmes sur un exercice clôturé.

**D64. Fusionner `email_templates` et `pv_templates` en un moteur de modèles unique, ou les garder séparés ?**
- (c) Recommandation : **un module « Modèles » unifié avec moteur de variables unique** (emails, PV, convocations, états datés, courriers), aperçu avec données RÉELLES de la copro. Décision #7 (un seul chemin). Template système PV : seed en base versionné (pas en dur dans le service).

**D65. Fiche identité copro éditable : quels champs légalement obligatoires (RNIC, régime, RIB syndic, dates d'exercice) ?**
- (c) Recommandation : **écran « Identité copro » éditable** avec immatriculation RNIC, raison sociale, adresse, régime, RIB syndic, dates d'exercice. Saisie passive en V1 (connexion téléservice ANAH/RNC en P1). Audit/journal des changements de paramètres sensibles (qui a modifié une clé/un tantième).

### Dashboard & Portefeuille

**D66. Portefeuille = vraie page d'atterrissage post-login ? Sélecteur copro permanent en barre EN PLUS de la liste ?**
- (c) Recommandation : **oui aux deux** (D66 = corollaire de C6). Portefeuille = accueil niveau cabinet ; switcher copro permanent en en-tête pour basculer sans repasser par la liste.

**D67. Définition métier de « Fonds travaux » affichée : réserve ALUR (105) seule, 103+105, ou trésorerie compte travaux 5121 ?**
- (c) Recommandation : **décision expert requise**. Reco par défaut : **vue trésorerie multi-comptes séparée** (512 courant / 5121 travaux bancaire / 105 réserve ALUR / 103 réserve) avec libellés exacts, plutôt que fusionner provisions et trésorerie. Ne pas additionner réserve comptable et solde bancaire.

**D68. Source canonique unique des KPIs : `fn_dashboard_kpis` (RPC) ou `v_dashboard_kpis` (vue) ?**
- (c) Recommandation : **en garder UNE seule** (les deux coexistent avec règles « censées » identiques). Reco : la vue si multi-copro paginé, la RPC si calcul lourd par copro. Trancher après mesure de perf sur volume réaliste.

**D69. Dashboard réutilisé pour le portail copropriétaire (mêmes vues) ?**
- (c) Recommandation : **NON, vues distinctes**. Les KPIs gestionnaire `security_invoker` exposent des montants partiels comme des totaux ; un copro ne doit voir que son périmètre. Le portail a son propre `getPortalContext()` avec filtrage strict.

**D70. Seuils des « todos » (impayés >60j, contrats 30j, contrôles 7j, AG dans les délais art.64) : figés ou paramétrables par cabinet ?**
- (c) Recommandation : **valeurs par défaut métier + paramétrables par cabinet** (P1). Indicateurs de conformité légale en tête (AG dans les 6 mois de clôture, DPE, PPT, ALUR vs minimum légal).

---

## E. Bloquants à corriger AVANT / PENDANT le rebuild

**E1. Faille d'escalade `platform_admin` : comment la fermer définitivement en v2 ?**
- (b) Options : (a) trigger BEFORE INSERT/UPDATE interdisant role='platform_admin' sauf is_service_call() ; (b) sortir platform_admin de `memberships` vers `profiles` (géré service_role only) ; (c) restreindre la WITH CHECK de p_mgr_all.
- (c) Recommandation : **(b) + (a) combinés**. Sortir platform_admin de memberships (architecture propre) ET garder un trigger garde-fou. Re-tester empiriquement après correctif (impersonate authenticated, tenter UPDATE role='platform_admin', vérifier user_is_platform_admin()=false). Bloquant AVANT tout vrai second tenant.

**E2. Edge functions : 27 dans le repo, ZERO déployée sur le live. Déployer toutes, ou recâbler le front en `.rpc()` direct ?**
- (b) Options : (1) déployer les 27 (couche edge = adaptateur de signatures) ; (2) recâbler le front en RPC SQL directes avec les vrais noms DB et supprimer les edges fantômes.
- (c) Recommandation : **option 2 majoritaire** (le front pointe vers des edges fantômes : record_payment, post_owner_payment, import_bank_movements…) → recâbler en .rpc() direct, cohérent avec « finance = RPC SQL ». **Garder en edge UNIQUEMENT ce qui exige un secret serveur** (envoi email, webhooks HMAC). En v2 TanStack, ces routes serveur peuvent devenir des server functions. Bloquant : aujourd'hui paiements/AG/banque/emails sont appelés mais inexistants en prod.

**E3. Emails : provider Resend ou Brevo ? Secret configuré ? Domaine vérifié (DKIM/SPF) ?**
- (c) Recommandation : **clarifier Resend vs Brevo avec l'utilisateur** (100% du code edge est sur Resend, la mémoire évoque Brevo). Puis : configurer RESEND_API_KEY côté Supabase, vérifier coproflex.fr (DNS SPF/DKIM) sinon aucun email ne part. Tester end-to-end en dry_run sur copro E2E. Bloquant pour convocations/relances/mise en demeure.

**E4. GL annulations : 2 des 7 voies de contre-passation cassent l'audit (LOT_GL_MISMATCH), immutabilité période approuvée non protégée côté paiements.**
- (c) Recommandation : **corriger AVANT d'ouvrir les boutons de contre-passation en UI**. (a) Garde dans reverse_ledger_transaction refusant l'extourne directe d'un source_type IN ('payment','call_for_funds','supplier_invoice','supplier_payment') → rediriger vers la RPC métier dédiée (reverse_payment / cancel_call_for_funds). (b) Garde sur reverse_payment quand le paiement appartient à une période approuvée. (c) Brider `canReverseSelected` côté front. (d) Test de non-régression automatisé : pour CHAQUE voie, audit_finance_integrity=0 + équilibre GL après opération.

**E5. Faux-vert du harnais e2e : assertions UI-only/tautologiques + seed en drift + runner Windows exit-0.**
- (c) Recommandation : **les 3 corrections** : (1) règle anti-faux-vert en CLAUDE.md (tout test qui écrit prouve l'effet en base via service-role, count/somme exacts) ; (2) garde seed-vs-golden bloquante (B10) ; (3) health-check container + assertion « nb gates exécutées == attendu » (B9). Faire échouer db:test si un gate_*.sql existe sur disque mais pas dans GATES.

**E6. Divergence créances GL vs call_for_funds_lines : l'écran impayés lit un compteur parallèle, le relevé individuel lit le GL.**
- (b) Options : (1) dériver l'écran impayés du GL (45x source_type calls+payments) = source unique ; (2) garder le double compteur avec v_lot_vs_gl_mismatch comme gate active + triggers de synchro.
- (c) Recommandation : **option 1 (dériver du GL)** en v2, cohérent avec « GL = source unique ». Le double compteur est une dette fragile (toute écriture 45x sans allocation — à-nouveau, affectation, reprise, OD, mutation — désynchronise). Tant que le double existe, v_lot_vs_gl_mismatch DOIT être une gate CI active, pas une vue de diagnostic. **Décision métier/archi à trancher avec l'expert.**

**E7. Secrets live en clair sur le poste (.env.local : service_role, PAT, mot de passe DB, RESEND_API_KEY) + compte démo password123 dans le bundle client.**
- (c) Recommandation : **rotation immédiate de tous les secrets exposés** + sortie du repo vers un gestionnaire de secrets + suppression du .env.local.bak-local + correction de l'en-tête trompeur (commentaire iyfes… alors que ça pointe sur qqfq…). Retirer le compte démo 1-clic ou le gater derrière un flag non-prod. Bloquant AVANT tout vrai client (date-butoir à fixer, lié à J6/J7).

**E8. Déterminisme des dates métier (BUG-004, ~15 `new Date()` là où la date AG/exercice doit faire foi) : ne PAS re-porter en v2.**
- (c) Recommandation : **introduire une horloge métier injectable** (`getBusinessDate(periodId)` ou paramètre `asOf`) et BANNIR `new Date()`/`Date.now()` dans toute fonction produisant un p_tx_date, issue_date, due_date, date d'effet, exercice. Distinguer horodatage technique (created_at = OK) vs date d'effet métier (saisie/dérivée). Brancher `getCurrentBusinessYear()` (hard-codé 2026) sur la période ouverte Supabase. Geler les valeurs dérivées dans les documents au moment de l'émission (joursRetard, dateGeneration).

**E9. État daté : asymétrie cut-off (get_lot_balance_45x sans cut-off vs generate_etat_date_payload avec t.tx_date<=v_eff) + requête H3 non scopée à la période.**
- (c) Recommandation : **scoper H3 à la période de référence à v_eff** (aujourd'hui somme tous budgets validés toutes années → Partie 3 fausse en multi-exercice, cas golden 2026/2027). Expliciter l'asymétrie cut-off dans l'UI (intentionnelle mais lue comme incohérence). Supprimer la dette morte src/lib/sales/api.ts (INSERT brut + enum fantôme 'final_etat_generated').

**E10. Annexes légales : libellé annexe 3 faux, fn_annexe_3 incomplète (réalisé par clé + BP N+1/N+2 à 0), gate équilibre annexe 1 bloquée par arbitrage expert.**
- (c) Recommandation : **trancher l'arbitrage expert sur l'équilibre annexe 1** (créances=dettes après répartition) qui bloque le gate 0088 et la conformité convocation. Corriger le libellé annexe 3 (« Compte de gestion pour opérations courantes » selon arrêté 14/3/2005, la ventilation par clé est un complément). Compléter fn_annexe_3. Re-tester les annexes sur une copro AVEC soldes non nuls (golden seedée), pas seulement la forme JSON.

**E11. PDF légaux : PV à 0 tantième, convocation expédiée sans annexes comptables, identité syndic hardcodée, certains « documents » ne sont pas des PDF.**
- (c) Recommandation : corriger **avant d'envoyer la moindre convocation réelle** : passer accountingData + annexesStructured + liste copropriétaires au générateur PV/convocation ; corriger copropriete.nom (= nom syndic aujourd'hui) ; injecter l'identité réelle du syndic (source : contrat syndic ou table cabinet — à trancher) dans relance/PV. Décider feuille de présence PDF autonome (réparer Edge ag_generate_document OU générateur client). Avis d'appel : trancher window.print vs vrai PDF (RIB requis si officiel).

**E12. Ruptures racines AG/finance restant à câbler (synthèse, à prouver en SQL avant UI) : action_type (D28), budget matérialisé (D29), payloads échéancier/conseil/contrat vides (RUPTURE 3).**
- (c) Recommandation : **remplir les payloads** (variables.mode, council_members[], contract_id, date_debut/fin) et brancher `validate_ag_variables` en pré-vol du PV. Construire ces tranches AG→finance→conseil→contrat de bout en bout une par une (vertical), preuve e2e à chaque palier, plutôt que re-livrer le SQL déjà fonctionnel.

**E13. Migrations live à assainir avant projet prod neuf : trou 0074, 2 migrations force_delete_test_copro hors repo, post_call_for_funds banni.**
- (c) Recommandation : avant tout db push vers un projet neuf, **reproduire 0001→0087 SANS les 2 force_delete_test_copro** (outils de test), clarifier le trou 0074 (saut intentionnel), confirmer que post_call_for_funds reste banni (ne jamais le recréer) et que post_exceptional_call_for_funds (D13) est le seul appel hors-budget restant à coder. Rejouer le Security Advisor après chaque DDL (0 finding rls_disabled, seul tiers_directory toléré).

**E14. Performance structurelle : vues d'agrégat + chargement front sans pagination ne tiennent pas à l'échelle (centaines de copros, dizaines de milliers d'écritures).**
- (c) Recommandation : **borner côté SQL toutes les listes** (.range()/pagination serveur sur getGeneralLedger, listBankMovements, listUnpaidByLot, portefeuille) ; décider l'architecture des soldes (table account_balances pré-agrégée vs vue matérialisée) ; ajouter les index FK cibles (period_id partout, repartition_key_id) ; consolider les policies RLS SELECT redondantes. À traiter PENDANT le rebuild des vues (pas après), car c'est structurel — mais dimensionner selon la cible réelle du premier syndic (>100 copros = prioritaire, <30 = peut attendre).
