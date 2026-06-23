Je vais consolider ce rapport directement. Le travail d'analyse est déjà fait dans les 13 JSON ; mon rôle est de synthétiser, prioriser et croiser. Pas de fichiers à créer, je retourne le markdown.

# RAPPORT DE VERIFICATIONS COMPLEMENTAIRES — CoProFlex (pre-rebuild Next → TanStack Start)
*Consolidé le 2026-06-22 à partir de 13 audits empiriques (live `qqfqrcolzmcbsvfaumiq`, tests BEGIN/ROLLBACK). Document de travail.*

---

## 1. TABLEAU DE BORD — LES BLOQUANTS (rouges)

Triés par gravité. Trois familles : **sécurité**, **corruption GL possible**, **production cassée / faux-vert**.

### A. Sécurité — étanchéité multi-tenant compromise
| # | Bloquant | Preuve | Impact |
|---|----------|--------|--------|
| **S1** | **Escalade platform_admin** : tout gestionnaire peut s'auto-promouvoir et lire/écrire TOUS les cabinets | `UPDATE memberships SET role='platform_admin'` autorisé par `p_mgr_all` (contrôle `copro_id`, PAS la valeur `role`) ; aucun trigger garde la table. Prouvé : `copros_visible` 18→19, lecture d'un copropriétaire du cabinet B. | **Étanchéité multi-cabinet totalement contournable.** Toute la RLS devient cosmétique. La faille la plus grave de l'audit. |
| **S2** | **Secrets LIVE en clair** sur le poste (`Co-Pro-Flex/.env.local` + `.bak`) | `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS total), PAT `sbp_…[REDACTED]`, `SUPABASE_DB_PASSWORD=[REDACTED]`, `RESEND_API_KEY` — valeurs retirées de ce document (secrets). **Point positif : gitignorés, jamais commités** (`git log -S` vide). | Pas de fuite git, mais compromission/partage du poste = accès total prod. **Rotation requise avant prod.** |
| **S3** | **Compte démo prod 1-clic** mdp en clair dans le bundle client | `login/page.tsx:10-11` `DEMO_PASSWORD='password123'`, vrai compte gestionnaire (cabinet 257ef0f9, 18 copros). | Accès 1-clic à de vraies données ; **combiné à S1 → platform_admin → accès total**. |

### B. Corruption du grand livre possible (audit casse)
| # | Bloquant | Preuve | Impact |
|---|----------|--------|--------|
| **GL1** | **`reverse_ledger_transaction` exposé brut** sur l'écran Comptabilité casse l'audit (LOT_GL_MISMATCH) | `useComptabilitePage.ts:230` appelle `reverseLedgerTransaction` sur N'IMPORTE QUELLE opération (paiements/appels inclus). La RPC ne désimpute pas et ne touche pas `payments.status`. Test : audit 0→1. | Un gestionnaire contre-passe un paiement → solde copropriétaire **faux**, sans avertissement. |
| **GL2** | **`unallocate_payment` + `cancel_call_for_funds`** → audit=3 LOT_GL_MISMATCH (−13550) | Le « refus strict » de `cancel_call_for_funds` ne regarde que les allocations actives, PAS les paiements toujours postés au GL. | 13550€ encaissés au GL **sans contrepartie d'appel**. Faux sentiment de sécurité du refus strict. |

### C. Production cassée / faux-vert
| # | Bloquant | Preuve | Impact |
|---|----------|--------|--------|
| **P1** | **ZÉRO Edge Function déployée** alors que le front en invoque 12+ | `list_edge_functions = []`. Front appelle `record_payment`, `reconcile_bank_movement`, `ag_send_convocations`, etc. | **Paiements, banque, factures fournisseur, AG (création/clôture/vote/doc), envoi convocations/relances = CASSÉS en prod.** Bloquant n°1 avant un vrai syndic. |
| **P2** | **Emails ne partent pas end-to-end** ; provider = Resend (pas Brevo) | Aucune fonction déployée + secret non vérifiable. `send-convocation-email` renvoie un **FAUX succès stub** (`{success:true, stub:true}`) sans clé → notification juridiquement mensongère (art.42 loi 65-557 = nullité si non convoqué). | Convocation marquée « envoyée » alors que rien ne part. |
| **P3** | **Convocations expédiées SANS annexes comptables + mauvais nom de copro + heure vide** | `useAgEnvoiPage.ts:547` n'envoie ni `accountingData` ni `annexesStructured` ; `:566` `copropriete.nom = syndic.nom` ; `agData.heure=''`. | Convocation **juridiquement incomplète et inexpédiable** (preview ≠ PDF réellement envoyé). |
| **P4** | **PV généré faux** : participants à 0 tantième, quorum toujours « NON ATTEINT » | `usePVPage.ts:375` n'envoie pas le 7e arg `coproprietaires` → `find()` sur tableau vide → noms vides, tantièmes 0. | Pièce maîtresse de l'AG **fausse**. |
| **P5** | **Drift fournisseur bloquant** : création de dépense écrit dans `budget_expenses.fournisseur` INEXISTANTE | `budget/api.ts createExpense:538` insère `fournisseur` ; cible = `tiers_id` (0027:36 le confirme). | Premier maillon du cycle dépense **cassé ou dégradé** (tiers jamais relié). |
| **F1 (faux-vert)** | **Assertions e2e tautologiques** dans `ag-workflow.spec.ts` | `:246` `expect(length).toBeGreaterThanOrEqual(0)` (toujours vrai) ; `:344` `{success:true}` codé en dur ; `if(isVisible())` sans `else`. | Tests **VERTS par construction**. Fausse couverture attendance/votes/drafts. |
| **F2 (faux-vert)** | **Seed `create_test_copro_seeded` en DRIFT confirmé** : 4 lots / base 1000 / 3 clés vs golden 18 lots / 10000 / 6-7 clés | Vérifié `pg_get_functiondef` live : A101/A102/A201/A202 = 4 lots. La fixture UI golden = 18 lots/10000. | **Deux vérités de test.** Un test adverse valide une copro-jouet non représentative. |

> **Note de cohérence** (audit #9) : plusieurs alertes mémoire sont **déjà résolues** et ne doivent PAS être retraitées comme bloquantes : faille RLS anon (0085 ✅), `createCall`/`post_call_for_funds` (migré ✅), `reverse_payment`/`cancel_supplier_invoice`/`unallocate_payment` (0087, existent ✅), annexe 1 PDF « cassée » (faux : problème de **contenu**, pas de crash). **Lire le DEBRIEF_AUTONOMIE_2026-06-21 AVANT l'audit fondations.**

---

## 2. CONSTATS PAR THÈME (sévérité)

### Thème 1 — Sécurité / étanchéité multi-tenant
- 🔴 **S1** escalade `platform_admin` (cf. §1).
- 🟠 **RLS jamais FORCÉE** : `relforcerowsecurity=false` sur les 87 tables. La mémoire dit « ON+FORCE » → **faux, c'est ON sans FORCE**. Propriétaire de table / `BYPASSRLS` / DEFINER mal écrit contourne en silence.
- 🟠 **S2** secrets en clair ; 🟠 **S3** compte démo 1-clic.
- 🟡 Vue `tiers_directory` en SECURITY DEFINER (lint ERROR 0010) — risque maîtrisé tant que le `WHERE user_has_copro_access` reste, mais fragile (à passer `security_invoker=true`).
- 🟡 Grants `anon` larges au niveau table (défaut Supabase) — seule la RLS protège ; renforce l'enjeu du FORCE manquant.
- 🟢 Fonctions SECURITY DEFINER correctement révoquées d'`anon`/`public` (vecteur d'escalade classique fermé).
- 🟢 Isolation par cabinet bien modélisée dans les helpers (`profiles.cabinet_id = copros.cabinet_id`, fail-closed).

### Thème 2 — Annulation / contre-passation GL (7 voies)
- 🔴 **GL1** `reverse_ledger_transaction` brut, 🔴/🟠 **GL2** `unallocate + cancel` (cf. §1).
- 🟠 `reverse_period_cutoff` **pas ré-entrant** : son DELETE d'idempotence viole la FK `ON DELETE RESTRICT` `period_cutoff_items.reversal_tx_id`. Latent (seul `open_next_period` l'appelle), se réveille à toute ré-clôture.
- 🟠 `reverse_payment` sur **période APPROUVÉE** mute `status`+allocations (immutabilité période non protégée côté `payments` ; les triggers d'immutabilité ne portent que sur `ledger_*`). GL protégé (extourne en N+1), mais un appel soldé redevient non-soldé après coup.
- 🟢 Chemins nominaux sains : `reverse_payment` (ouvert), `cancel_call_for_funds` (refus strict), anti-double-extourne, `FOR UPDATE`. GL jamais déséquilibré.
- 🟢 `cancel_supplier_invoice` (marquée « non testée ») + `post_supplier_credit_note` : nominal + refus OK. **Lacune levée.**

### Thème 3 — Intégrité base live
- 🟢 `audit_finance_integrity(NULL)` = **0 écart** sur les 4 contrôles, toutes copros.
- 🟢 0 orphelin / FK incohérente (19 contrôles), 0 drift de statuts/périodes (1 période ouverte/copro).
- 🟢 Immutabilité GL défendue par ≥4 triggers + 1 check (prouvé en BEGIN/ROLLBACK).
- 🟡 **Base financièrement quasi VIDE** : 16/18 copros = fixtures E2E ; les 2 « réelles » (Résidence Martin, Paris Ivry) ont **0 écriture**. « Propre » = « rien de cassé », PAS « validé sur un cycle annuel réel ».
- 🟡 1 ERROR advisor (`tiers_directory`, délibéré) ; 🟢 head migrations à 0087 + 2 `force_delete_test_copro` (au-delà du 0081 en mémoire).
- ❓ Trou de numérotation **0074** (0073→0075), local ET live.

### Thème 4 — Exactitude légale des calculs
- 🟠 **Minimum légal ALUR `MAX(2,5% PPT ; 5% budget)` JAMAIS contrôlé** par le moteur. Un syndic peut voter une cotisation sous le plancher légal sans alerte. **Risque juridique direct.**
- 🟠 **État daté Partie 3** : provisions H3 somment TOUS les budgets validés **sans filtre de période** → faux en multi-exercice (cas golden 2026/2027), charge acquéreur surévaluée (pièce opposable au notaire).
- 🟡 Libellé **annexe 3** non conforme arrêté 14/3/2005 (« par clé de répartition » au lieu de « opérations courantes »).
- 🟡 Annexe 3 SQL ne renseigne QUE la colonne budget voté (réalisé + BP N+1/N+2 = 0, V1 documentée).
- 🟢 **Majorités art.24/25/25-1/26/26-1/unanimité = LÉGALEMENT CORRECTES** (10 scénarios prouvés ; seuils `floor(T/2)+1`, `floor(2T/3)+1`, base = tous les tantièmes).
- 🟢 **Arrondi appels** : Σ lignes = total au centime garanti (télescopage cumulatif = plus-grand-reste). Seule la position du cent résiduel dépend de l'ordre `lot_id`.
- 🟢 État daté : 450-5 ALUR inclus en P1, exclu de P2 (conforme décision USER).
- 🟡 Divergence front↔SQL sur passerelle 26-1 (seuil 500 SQL vs 501 front) — informatif tant que le front n'écrit pas.

### Thème 5 — PDF légaux
- 🔴 **P3** convocation (nom copro = syndic, heure vide, sans annexes), 🔴 **P4** PV faux (cf. §1).
- 🟠 Chemin serveur AG (`ag_generate_document`) **mort** (0 Edge déployée) + SELECT sur colonnes inexistantes (`tantiemes_for/voters_*/is_approved`).
- 🟠 **Feuille de présence** : aucun générateur PDF client, dépend UNIQUEMENT de l'Edge non déployée → document obligatoire non productible.
- 🟠 Relance impayés : identité syndic **codée en dur fictive** (« COPRO MANAGER, 123 Avenue de la Gestion ») → mise en demeure inopérante.
- 🟠 Avis d'appel de fonds = HTML/`window.print()`, pas un vrai PDF (placeholder MVP, RIB absent).
- 🟡 Balance / Grand livre = CSV uniquement, pas de PDF.
- 🟢 Annexe 1 PDF **NE crashe PAS** (régression 0075 corrigée, `fn_annexe_1` renvoie un jsonb structuré + garde `arr()`).
- 🟢 État daté : générateur PDF complet et bien structuré, alimenté par vraie RPC.
- 🟡 Annexe 2 : `.length` sans garde `arr()` (latent).

### Thème 6 — Edge Functions / emails / notifications
- 🔴 **P1** 0 Edge déployée, 🔴 **P2** Resend stub mensonger (cf. §1).
- 🟠 **Deux chemins convocation parallèles incohérents** (`send-convocation-email` stub vs `ag_send_convocations` traçabilité légale). Anti-pattern double-pattern.
- 🟠 **Mismatch noms params RPC** : edge appelle `p_provider_message_id`/`p_error_code` ; DB attend `p_provider_ref` / pas de `p_error_code` → marquage notifications échouerait même après déploiement → **traçabilité juridique cassée**.
- 🟡 Phantom mineur `get_document_signed_url` (seul `get_document_url` existe) + drift nommage edge↔RPC (`import_bank_movement` vs `import_bank_movements`, `record_payment`→`post_owner_payment`).
- 🟢 `generate_etat_date`/`validate_mutation` PAS des phantoms (routés vers vraies RPC via `.rpc()`).
- 🟡 Infra email seedée (6 templates) mais 0 trafic (cohérent avec 0 déploiement).

### Thème 7 — Auth / rôles / invitations
- 🟠 **Flux d'invitation copropriétaire AUCUN point d'entrée front** : table `copro_invitations` + RPC `link_coproprietaire_account` existent en DB, mais **rien ne les appelle**. Espaces copro/conseil structurellement inaccessibles.
- 🟠 **Aucune séparation d'espaces UI** + `CoproContext.tsx:88` `isManager = ... || true` (garde-fou de rôle **neutralisé**). Pas de route group `(coproprietaire)`/`(conseil)`.
- 🟡 Rôle **conseil syndical PAS un `membership_role`** : vit dans `council_members` (choix défendable, source unique RLS). Le futur routeur doit combiner `memberships.role` ET `is_council_member()`.
- 🟡 Auth front réduite à email/mdp (pas de magic link, reset, OAuth, signup câblés ; `resetPasswordForEmail` 0 occurrence).
- 🟢 Périmètre cabinet du gestionnaire fail-closed et correct (à préserver).

### Thème 8 — Déterminisme des dates (BUG-004, ~14+ endroits)
- 🔴 **Écritures GL datées à l'horloge** : onboarding/reprise soldes (`onboarding/api.ts:801`), mutation/ALUR vente (`sales/api.ts:765`), affectation+règlement ALUR (`useBudget.ts:490/503`) — tous `p_tx_date: new Date()`. **Viole le cut-off par période** ; casse le déterminisme golden.
- 🟠 `issue_date`/échéances appels dérivées de `today` (`useCreateCallWizard.ts`).
- 🟠 Exercice = `new Date().getFullYear()+1` (~15 endroits) au lieu de la période ouverte / date AG. Source unique `getCurrentBusinessYear()` existe mais hard-codée 2026 et contournée.
- 🟠 État daté `useEtatsDate` encore sur MOCK + `budget.annee = getFullYear()`.
- 🟡 Délais AG (`now` injectable = bon pattern), jours de retard impayés recalculés au rendu (document non reproductible), votes correspondance horodatés à l'horloge.

### Thème 9 — Anti-faux-vert du harnais de test
- 🔴 **F2** seed en drift, 🔴 **F1** assertions tautologiques (cf. §1).
- 🟢 **Gates SQL solides** : `audit_finance_integrity` + `gate_finance_loop_e2e` (8 invariants chiffrés, `RAISE EXCEPTION`, `ON_ERROR_STOP=1`) → **échouent vraiment** quand la compta casse. **Socle à conserver.**
- 🟡 `golden-from-scratch.spec.ts` prouve la STRUCTURE + audit=0 mais **pas la chiffraison** (701/450/512). Doubler avec preuve DB (bon pattern à généraliser).
- 🟠 Aucune protection contre l'**exit-0-sans-travail Windows** (pas de health-check conteneur, pas d'assertion « nb gates exécutées == attendu »).
- 🟡 `db:test` = liste curatée en dur (anti-oubli absent : une gate sur disque non listée = 0 couverture sans alerte).

### Thème 10 — Cohérence planning ↔ réalité
- 🟠 Mémoires PÉRIMÉES (à ne plus traiter comme bloquantes) : `createcall_banned`, faille RLS anon, intégrité comptable 0087, annexe 1 « cassée ». Garde de rôle `(gestionnaire)/layout.tsx` ajoutée (mais `(dashboard)/layout.tsx` ne vérifie toujours que `user != null`).
- 🟡 SESSION.md légèrement périmé (BUG-003/005 déjà commités 063cb0c, HEAD=50842e0).
- 🟡 2 migrations `force_delete_test_copro` sur le live absentes du repo + trou 0074.
- 🟡 Contradiction compte démo (à retirer vs gardé pour tests) — **retrait conscient différé**, pas oubli.
- 🟡 Rapprochement bancaire partiel : `reconcile_bank_movement` existe (0066), `import_bank_movement` **n'existe pas**.

### Thème 11 — Performance / scale
- 🔴 `fn_dashboard_kpis` : **5 scans séquentiels du GL/copro + N+1 intra-SQL** (50k écritures = 126ms, 81k buffers ~633Mo).
- 🔴 **Page Portefeuille charge `v_dashboard_kpis` pour TOUTES les copros sans filtre** (`usePortefeuille.ts:94`). À 300 copros = 300× le coût en une requête bloquante. **Point de rupture le plus net.**
- 🔴 **Listes massives sans pagination** (`getGeneralLedger`, `listBankMovements`, impayés, relances : aucun `.range()/.limit()`). 50k lignes → tri JS navigateur, `external merge Disk` côté SQL.
- 🟠 `v_dashboard_kpis` calcule `v_unpaid_by_lot` 2× ; sous-requêtes corrélées `owner_name/email` par ligne ; filtres `accounts.code LIKE '512%'` (seq scan plan comptable) ; 169 FK non indexées (dont `ledger_entries.period_id`, `payments.period_id`).
- 🟠 RLS : 79 multiple_permissive_policies + 32 auth_rls_initplan (re-éval par ligne).
- 🟡 Inserts GL row-by-row trop lents (triggers) → imports set-based/COPY. 99 index « unused » = faux positif (base vide), ne pas droper.

### Thème 12 — Cycle engagé→réalisé (2/4 paliers)
- 🔴 **Palier « engagé » INEXISTANT** : enum `expense_status` = draft/pending/validated/rejected uniquement. Pas de `service_order_id`, pas de montant engagé.
- 🔴 **OS ne génèrent AUCUN engagement** : `update_service_order_status` ne fait que changer le statut. Un OS de 8000€ n'apparaît nulle part au budget. Contrôle de dépassement budgétaire = hors-système.
- 🟠 Suivi budgétaire = voté vs réalisé seulement (pas d'`engaged_amount`, `remaining` ignore les engagements).
- 🟠 **Deux portes vers D6xx/C401** (`validate_budget_expense` vs `validate_supplier_invoice`) sans garde anti-double-comptabilisation.
- 🟠 Cut-off 408/486 déconnecté (saisie 100% manuelle `p_items`).
- 🔴 **P5** drift `fournisseur` (cf. §1) ; 🟡 réalisé `budget_expenses` non réversible (pas de contre-passation).

### Thème 13 — UI/UX / accessibilité / responsive
- 🔴 **AUCUN support mobile/tablette réel** : sidebar `fixed` se réduit en rail 60px qui **chevauche le contenu** (`main-content margin-left:0`), `.subPages{display:none}` → navigation 2e niveau **inaccessible**, pas de hamburger/drawer.
- 🟠 Modal **sans focus trap** (clavier s'échappe vers le fond non inerté) — composant partagé, défaut systémique.
- 🟠 Toasts **non annoncés** aux lecteurs d'écran (pas d'`aria-live`).
- 🟠 Texte 9-11px omniprésent (125 occurrences) ; tableaux denses sans colonne figée sur petit écran.
- 🟠 Contraste tertiaire **échoue AA** (thème clair `#a89b88` = 2.57:1 ; sombre 3.3:1) sur les en-têtes/labels.
- 🟡 Tooltip pattern souris (span non focusable, pas d'`aria-describedby`) ; 3 shells de nav coexistent (HighBar a le meilleur ARIA) ; pas de `prefers-reduced-motion` ni cibles tactiles 44px.
- 🟢 Bases a11y saines : `focus-visible` global, skip-link, FormField correct, `aria-sort`, Modal ESC+restauration focus.

---

## 3. CE QU'IL FAUT VÉRIFIER / AJOUTER DANS V2 (contrôles, invariants, tests)

### 3.1 Invariants & gardes MOTEUR (DB / RPC)
1. **Garde anti-escalade `platform_admin`** : trigger `BEFORE INS/UPD memberships` interdisant `role='platform_admin'` sauf `is_service_call()` ou auteur déjà admin ; idéalement sortir `platform_admin` de `memberships` (le mettre sur `profiles`, service-role only) ; restreindre la `WITH CHECK` de `p_mgr_all`.
2. **RLS FORCE** : `ALTER TABLE ... FORCE ROW LEVEL SECURITY` sur les tables sensibles + re-documenter la mémoire.
3. **Garde `reverse_ledger_transaction`** : REFUSER `source_type IN ('payment','call_for_funds','supplier_invoice','supplier_payment')`, rediriger vers la RPC métier dédiée.
4. **`cancel_call_for_funds`** : refus strict doit détecter les **paiements encore postés au GL** (pas seulement allocations actives).
5. **`reverse_period_cutoff` ré-entrant** : mettre `reversal_tx_id`/`posting_tx_id` à NULL avant DELETE (ou FK `ON DELETE SET NULL`).
6. **Immutabilité période côté `payments`** : décider refuser vs autoriser-avec-trace `reverse_payment` sur période approuvée ; ajouter un check `payments.period_id.status`.
7. **Garde minimum légal ALUR** `MAX(2,5% PPT ; 5% budget)` au vote/validation du budget ALUR.
8. **Scoper la requête H3** de `generate_etat_date_payload` à la période de référence à `v_eff` (multi-exercice).
9. **Palier « engagé »** : enum `engaged` ou table d'engagements reliée à `service_orders` ; chaîner `update_service_order_status` → engagement budgétaire avec `budget_line_id`.
10. **Garde anti-double-comptabilisation** D6xx/C401 (lien `budget_expense ↔ supplier_invoice ↔ service_order` + unicité).
11. **Source de date métier injectable** (`getBusinessDate(periodId)` / param `asOf`) ; bannir `new Date()` dans tout producteur de `p_tx_date`/`issue_date`/`due_date`/date d'effet/exercice.

### 3.2 Tests de régression / chaîne / sécurité
12. **Test sécurité escalade** (rejouer après correctif) : impersonate authenticated, `UPDATE memberships SET role='platform_admin'`, vérifier `user_is_platform_admin()=false` + `copros_visible` inchangé.
13. **Suite SQL des 7 voies d'annulation** : pour CHAQUE voie, `audit_finance_integrity=0` ET GL équilibré après opération, sur la golden. (Aucune suite SQL ne les couvre aujourd'hui.)
14. **Garde seed-vs-UI** : asserter que `create_test_copro_seeded` produit EXACTEMENT la forme golden (18 lots, `total_tantiemes=10000`, 1 clé générale + 5 spéciales avec Σ poids attendus). Marquer ROUGE bloquant tant que le drift persiste.
15. **Enrichir `golden-from-scratch`** des invariants chiffrés du gate SQL (701=Σappels, 450-1=relevé restant, 512=encaissements−décaissements, budget=50000, ventilation par clé).
16. **Règle anti-faux-vert v2** (dans CLAUDE.md/skill test) : tout e2e qui écrit DOIT prouver l'effet en base via service-role (count/somme/montant exact), JAMAIS un 200/redirection/élément visible seuls. INTERDIRE `toBeGreaterThanOrEqual(0)` sur `.length`, objets `{success:true}` codés en dur, `if(isVisible())` sans `else`.
17. **Durcir le runner** contre exit-0 Windows : health-check conteneur avant 1re gate, assertion « nb gates exécutées == attendu », échec si une gate `gate_*.sql` sur disque n'est ni dans `GATES` ni `DEFERRED_GATES`.
18. **Check audit invariance allocations/statuts** sur période approuvée (aujourd'hui invisible car l'extourne GL équilibre).
19. **Test fonctionnel `cancel_supplier_invoice`** sur copro seedée avec facture (0 facture dans le seed actuel).
20. **Re-tester `fn_annexe_1..5`** sur copro AVEC soldes non nuls (rendu visuel, pas que la forme JSON).
21. **Test E2E envoi convocation dry-run** (`ag_send_convocations dry_run=true`) → vérifier `ag_notifications` passe à 'sent'.

### 3.3 Performance
22. Re-mesurer `fn_dashboard_kpis`/`v_dashboard_kpis` après chargement réaliste (5 exercices, ~50k écritures), cible <20ms/dashboard.
23. Trancher l'architecture des soldes : **table `account_balances` pré-agrégée** (copro/période/compte) vs vue matérialisée vs single-pass GROUP BY par classe.
24. Pagination serveur (`.range()`) sur TOUTES les listes GL ; tri/filtre en SQL.
25. Réécrire la requête portefeuille (pas de `v_dashboard_kpis` tous-copros).
26. Index FK cibles : `ledger_entries.period_id`, `ledger_transactions.period_id`, `call_for_funds_lines.repartition_key_id`, `bank_movements.account_id/period_id`, `payments.period_id`.
27. Consolider les policies RLS SELECT redondantes + pattern initplan `(SELECT auth.fn())`.
28. Remplacer `accounts.code LIKE 'NNN%'` par filtres sur `account_type`/`charge_nature` indexés.
29. Sortir `is_reversed` du chemin de lecture de `v_general_ledger`.

### 3.4 Déploiement / config
30. **Déployer les 27 Edge Functions** ; re-vérifier `list_edge_functions != []`.
31. Corriger les noms de params RPC dans `ag_send_convocations`/`ag_send_relance` (`p_provider_message_id`→`p_provider_ref`, supprimer `p_error_code`).
32. Configurer `RESEND_API_KEY` + **vérifier le domaine `coproflex.fr` (SPF/DKIM)** dans Resend.
33. Retirer le faux succès stub de `send-convocation-email` ; trancher le doublon convocation.
34. Rotation des secrets exposés + sortie du repo (gestionnaire de secrets) ; corriger l'en-tête trompeur `.env.local` (commentaire `iyfesbjnkpynmwlsmxnp`) ; supprimer `.env.local.bak-local`.
35. Retirer le compte démo 1-clic ou le gater derrière un flag non-prod.
36. Activer `auth_leaked_password_protection` ; durcir 13 fonctions `search_path` mutable ; `tiers_directory` → `security_invoker=true`.

### 3.5 UI/Front (à câbler dans la reconstruction)
37. Brider `canReverseSelected` (interdire contre-passation générique d'un `source_type='payment'`).
38. PV : passer la liste copropriétaires en 7e arg ; Convocation : passer annexes + corriger nom copro + heure.
39. Relance : injecter l'identité réelle du syndic.
40. Corriger drift `fournisseur`→`tiers_id` dans `budget/api.ts`.
41. Construire le flux d'invitation (UI émission + page `/invitation/[token]` + appel `link_coproprietaire_account`).
42. Retirer `|| true` de `CoproContext` ; router les 3 espaces sur rôle réel + `is_council_member()`.
43. Shell responsive (drawer off-canvas + hamburger + overlay ESC/clic-extérieur) ; focus trap + inert dans Modal/Drawer partagés ; `aria-live` Toasts ; plancher police 12px ; colonnes sticky + cartes mobiles ; contrastes tertiaires ≥4.5:1 ; cibles 44px ; `prefers-reduced-motion`. Récupérer le balisage ARIA de HighBar, supprimer les 3 shells redondants.

---

## 4. NOUVELLES QUESTIONS POUR LE GRILLING DE DEMAIN

*Numérotées, regroupées, avec ma reco quand c'est tranchable.*

**Sécurité / rôles**
1. **`platform_admin` est-il un besoin réel** (super-admin plateforme) ou un reliquat ? → *Reco : le sortir de `memberships` (le porter sur `profiles`, géré service-role). C'est le correctif le plus propre de S1.*
2. Qui/comment crée le **premier admin plateforme** (jamais seedé), et faut-il un espace admin distinct des 3 espaces ?
3. Faut-il **provisionner un second cabinet de test permanent** pour les non-régressions multi-tenant (aujourd'hui 1 seul tenant réel) ? → *Reco : oui, une fixture cabinet B permanente hors prefixe E2E.*
4. **Date-butoir de retrait** du compte démo `password123` (lié à J6 ou J7) ? → *Reco : J7, sur la même checklist que la rotation des secrets.*
5. Périmètre **écriture du rôle copropriétaire** (portail) : à auditer quand le portail sera câblé — confirmer le scope minimal (lecture seule au départ ?).

**Comptabilité / légal**
6. **Définition légale du minimum ALUR** à coder : `2,5% du budget art.14-1` (loi post-ELAN) vs `MAX(2,5% PPT ; 5% budget)` du PLAN_GOLDEN ? → *Question d'expert copro (toi). Reco provisoire : coder le seuil loi 1965 art.14-2 II et afficher le calcul à la saisie.*
7. Une **période APPROUVÉE doit-elle être totalement immuable** (y compris statuts/imputations de paiement) ou la contre-passation post-approbation est-elle un acte volontaire toléré avec régularisation N+1 ? → *Décision expert requise.*
8. **`approved_at` d'une période** = date système de l'action OU date de l'AG d'approbation des comptes ? → *Reco : date de l'AG (donnée métier opposable), `created_at` reste l'horodatage technique.*
9. **Période de référence de l'état daté P3** (provisions votées non appelées) : exercice en cours à la date d'effet, ou exercice à venir déjà voté ?
10. **Arbitrage équilibre annexe 1** (créances = dettes après répartition) — **bloque le gate 0088 et la conformité convocation**. Tranché ? → *Question d'expert (toi).*

**Architecture / cycle**
11. **Table maître du cycle dépense** : `budget_expenses` (engagement) ou `supplier_invoices` (canonique GL) ? Laquelle disparaît/devient esclave ? → *Reco : `supplier_invoices` canonique GL ; `budget_expenses` requalifié en engagement extra-comptable lié à l'OS.*
12. Palier « engagé » = écriture extra-comptable ou purement informatif ? → *Reco : extra-comptable (table/colonne d'engagement), pour piloter le dépassement budgétaire.*
13. **Stratégie de date métier** : horloge React-context injectée + param API, ou `asOf` explicite par mutation ? → *Reco : `asOf` explicite obligatoire sur chaque mutation comptable + défaut = dernier jour de la période ouverte.*
14. Couche Edge = **adaptateur de signatures** (à déployer) ou **recâblage front en `.rpc()` direct** avec les vrais noms DB ? → *Reco : déployer les edges (elles portent l'adaptation `record_payment→post_owner_payment`), c'est le moins de churn pour le rebuild.*
15. **Provider email = Resend confirmé** (et pas Brevo) ? Changement prévu ?
16. Le **front de session AG (`checkMajority`)** reste-t-il un moteur d'affichage parallèle au SQL, ou appel unique à `calculate_resolution_result`/`get_ag_live_results` ? → *Reco : source unique SQL, supprimer le moteur front (élimine la divergence 26-1).*

**Scale**
17. **Combien de copros/lots/écritures/exercice** pour le premier vrai syndic ? Détermine si les soldes pré-agrégés sont prioritaires (>100 copros). → *Question pour toi.*
18. Tableau de bord portefeuille : **KPI temps réel exacts** ou vue matérialisée rafraîchie (5-15 min) acceptable métier ? → *Reco : matérialisée rafraîchie, exactitude temps réel uniquement sur la copro ouverte.*
19. Existe-t-il une **table `account_balances`** prévue au blueprint db-cible, ou à concevoir ? (la mémoire mentionne une *vue* `v_account_balances`).
20. Import historique reprise de mandat = **set-based/COPY** ou code applicatif row-by-row ? → *Reco : set-based obligatoire (les triggers rendent le row-by-row inexploitable).*

**Tests / harnais**
21. **Migrer le seed à la forme golden** (SQL sur le live, Option A : Lyes applique) OU faire passer les tests adverses par `onboardGolden` (UI) ? → *Reco : migrer le seed SQL (les gates SQL en dépendent), c'est la source de vérité du harnais.*
22. **Cible exacte = 6 clés** (1 générale + 5 spéciales, K7/ALUR retiré car budget_type) à confirmer pour la garde seed-vs-UI.
23. `ag-workflow.spec.ts` (tautologique + placeholder) : **réparer ou supprimer** ? → *Reco : supprimer (antérieur à la campagne golden, data-testid possiblement obsolètes après la refonte UI).*
24. Comment prouver le **cycle pluriannuel** (close/open/regularize, report à-nouveaux) sans tomber sur le faux-rouge structurel de la gate per-lot (incompatibilité `v_owner_statement_by_lot` cross-période) ? → *Reco : scénario de harnais dédié hors gate per-lot.*

**UI/UX**
25. Refonte manager-first : le gestionnaire doit-il **TRAVAILLER sur tablette/mobile** (saisie, validation paiements, vote AG) ou seulement CONSULTER ? Change radicalement l'effort responsive. → *Question structurante pour toi.*
26. Thème clair = **livrable v2 supporté** (alors ses contrastes sont bloquants) ou mode « best effort » ?
27. **Objectif de conformité formel** (RGAA / WCAG 2.1 AA) ou amélioration pragmatique ?
28. Vue **AG sur projecteur** (`/ag/[id]/projector`, gros texte) à préserver en optimisant le mobile ?

**Hygiène repo / migrations**
29. Trou **0074** intentionnel ou migration perdue ?
30. Sort des **2 `force_delete_test_copro`** (live, absentes du repo) : committer comme outils de test ou supprimer avant projet prod neuf ? → *Reco : committer dans un dossier `supabase/tools/` exclu du `db push` prod.*
31. Mémoire **`bank_reconciliation_model`** à jour sur le chemin réel d'écriture du pointage ? (`import_bank_movement` n'existe pas en base).

---

## 5. À FAIRE AVANT TOUT REBUILD (short-list Phase 1 — correctifs MOTEUR avant de toucher l'UI)

> Critère : ce sont les correctifs qui (a) empêchent une corruption/fuite, ou (b) figent un invariant que l'UID v2 va consommer. Tout le reste (responsive, déploiement edge, contenu PDF) vient APRÈS, en s'appuyant dessus.

1. **🔴 SÉCURITÉ — Bloquer l'escalade `platform_admin`** (trigger + sortie de `memberships`) PUIS re-tester empiriquement. Sans ça, toute la RLS multi-tenant est cosmétique. *(S1)*
2. **🔴 SÉCURITÉ — Rotation des secrets live** + sortie du repo + suppression du `.bak` + correction en-tête `.env.local`. *(S2)*
3. **🔴 GL — Garde `reverse_ledger_transaction`** (refus des `source_type` métier, redirection vers les RPC dédiées). *(GL1)*
4. **🔴 GL — Renforcer `cancel_call_for_funds`** (détecter paiements postés orphelins). *(GL2)*
5. **🟠 GL — `reverse_period_cutoff` ré-entrant** (NULL avant DELETE / FK SET NULL) — débloque le cycle de clôture pluriannuel golden.
6. **🟠 LÉGAL — Garde minimum ALUR** au vote du budget (risque juridique direct). *(après arbitrage Q6)*
7. **🟠 LÉGAL — Scoper la requête H3 état daté** à la période de référence (Partie 3 fausse en multi-exercice). *(après arbitrage Q9)*
8. **🟠 DATES (BUG-004) — Date métier injectable** sur les 5 appels `create_ledger_transaction` (onboarding, vente, ALUR ×2) : c'est le cœur du bug et le plus risqué pour le GL ; le poser MAINTENANT évite de le re-porter dans v2.
9. **🟠 RLS FORCE** sur les tables sensibles + re-documenter.
10. **🔴 TEST — Garde seed-vs-golden + suite SQL des 7 voies d'annulation** : sans un harnais qui prouve l'effet en base, la reconstruction avancera à l'aveugle. Fait partie de Phase 1 car c'est le filet qui sécurise tout le reste. *(après tranche Q21/Q22)*

**Différable en Phase 2+ (post-correctifs moteur, pendant/après le rebuild UI)** : déploiement des 27 Edge Functions + config Resend + domaine (P1/P2), correction noms params RPC notifications, contenu PDF (convocation/PV/relance), palier engagé + cut-off auto, optimisations scale (account_balances, pagination, index FK), responsive + a11y, flux d'invitation + 3 espaces.

---

*Croisements clés à retenir pour demain : (1) S1 × S3 = le compte démo public devient platform_admin → priorité absolue ; (2) GL1/GL2 × absence de suite SQL des annulations = corruption silencieuse non détectée par le harnais actuel ; (3) BUG-004 × tests golden = aucun golden reproductible tant que les écritures sont datées à l'horloge ; (4) Thème 10 = ne pas gaspiller le grilling sur des alertes déjà résolues (RLS anon, createCall, 0087, annexe 1 PDF).*
