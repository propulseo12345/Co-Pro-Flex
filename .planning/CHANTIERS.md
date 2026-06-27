# CHANTIERS — Tour de contrôle CoProFlex v2

> **But** : ne plus jamais perdre un chantier commencé puis oublié quand on change d'angle.
> **À consulter en début de session** (`/token-saver start`) et **à mettre à jour dès qu'un chantier change d'état**.
> Règle : un chantier qui passe en `📐 design validé` ou `⏸️ parké` SANS prochaine action datée est un signal d'alerte — soit on le relance, soit on l'archive explicitement.

## Légende statuts
- 💡 **Idée** — évoquée, pas encore cadrée.
- 📐 **Design validé** — brainstorming/spec faits, **pas encore implémenté** (zone de risque d'oubli n°1).
- 🚧 **En cours** — implémentation/cadrage actif.
- ⏸️ **Parké** — commencé puis arrêté (à relancer ou archiver — **ne pas laisser pourrir**).
- ✅ **Livré** — fini + vérifié (DoD).
- 🗄️ **Archivé** — abandonné volontairement (garder la trace pour ne pas re-proposer).

---

## Chantiers actifs / en attente

| Chantier | Statut | Dernière activité | Prochaine action | Réf |
|---|---|---|---|---|
| **🛡️ Sécurité native baseline** (ex-« sécurité live hors-bande ») | 📐 Exigence baseline 0001 (PAS un patch live) | 2026-06-26 : **décision Lyes — on NE patche PAS le live** (`qqfq` quasi vide, meurt gelé). Recon read-only = anti-pattern confirmé À NE PAS reproduire : `user_is_platform_admin()` lit `memberships.role='platform_admin'` **sans cloisonnement cabinet** → bypass écriture global, court-circuité en tête de `user_is_copro_manager`/`user_has_copro_access` | Intégrer dans la **baseline 0001** de la base neuve : (1) table `platform_admins` dédiée (C16-4) au lieu d'un rôle dans `memberships` ; (2) RLS ON+FORCE sur TOUTES les tables + 0 grant anon + gate `relforcerowsecurity` ; (3) zéro compte démo en clair. **Cohérent SESSION/BILAN « sécu native, pas de patch jetable ».** | `BILAN_CADRAGE_2026-06-26.md` §2c/§5 · `REFONTE_DECISIONS` C16-4/C17-8 · mémoire `db_neuve_v2_squash_clean` |
| **Purge contradictions + registre supersedes (pré-build)** | 🚧 Découverte LIVRÉE, tri à faire | 2026-06-26 : **balayage exhaustif multi-agents (2 vagues, ~310 agents, lecture seule) → 107 pièges à copie** (🔴18 · 🟠54 · 🟡28 · ⚪7), vérifiés en adversarial. `SUPERSEDES.md` créé + `business-rules.md:66` corrigé + 2 plans archivés (déjà fait) | **TRIER les 107 findings** (vrai/faux positif/différé) avec Lyes → corrections en PR séparées par THÈME (RLS-off mémoires & DECISIONS.md = urgent car auto-chargé ; provider Resend→Brevo ; statuts/enum ; finance/Edge ; machine à états AG `set_ag_status` ; plan comptable inventé ; live gelé/migration). Blueprints `db-cible/*` = corrigés **JIT au palier** (SUPERSEDES §C) | `AUDIT_CONTRADICTIONS_2026-06-26.md` · workflows `wnhc4412u`+`wr2p7og1a` · `BILAN_CADRAGE` §2b/§3 |
| **Bilan de cadrage + backlog de build séquencé** | ✅ Livré (2026-06-26) | Audit multi-agents 12 agents : couverture domaine par domaine + ~50 objets de socle/domaine avec `depends_on`/palier 0→12 + paliers de build avec DoD | Servir de référence de chantier pour le build (ne pas reperdre) | `BILAN_CADRAGE_2026-06-26.md` · sortie workflow `wqvq17a2r` |
| **Grilling cadrage PARTIE C** (blocs macro CLOS, reste trous fins) | 🚧 Blocs clos / trous fins à faire | **2026-06-26 : CADRAGE DES BLOCS CLOS** — 5 ARB + EXP + socle C.17 8/8 + C16/C12/C13/C14/C15/C11 tous tranchés (41 décisions ce jour, consignées) | **Reste = les 147 trous fins de la Partie C (18 domaines) + 8 angles morts** auto-déclarés par le registre (numérotation pièces, pagination vues GL, tantièmes en cours d'exo, T9 journal probant…) — passe de grilling domaine par domaine, à planifier | `BILAN_CADRAGE_2026-06-26.md` §2a · `REFONTE_DECISIONS_2026-06-23.md` l.288-289/304 |
| **Audit cohérence + complétude cadrage** | ✅ Livré (nuit 2026-06-25) | Workflow recon 7 lecteurs → 26 anomalies (6 bloquantes), registre supersedes, ordre 13 paliers ; + drift HORS-FINANCE audité (comble ANOM-25) | Résoudre les anomalies pendant le grilling (cf. plan Phase 3) | `AUDIT_COHERENCE_CADRAGE_2026-06-24.md` · `AUDIT_DRIFT_HORS_FINANCE_2026-06-25.md` · plan `docs/superpowers/plans/2026-06-24-cadrage-base-saine.md` |
| **GLOSS- Glossaires v2 — phase 1 (socle)** | 🚧 Commité, à pousser | 2026-06-24 : `CONTEXT.md` + `glossaire-technique.md` + câblage commités (`9d93046`) | **push** (`gh auth switch lyestriki-29`) | `docs/superpowers/specs/2026-06-24-glossaires-v2-design.md` |
| **GLOSS- phase 2 — enrichissement a posteriori** | ✅ Livré, à pousser | 2026-06-24 : workflow 41 agents, 230 termes vérifiés → +42 métier / +41 technique, condensés (commit `eeeb360`) ; auto-import retiré | **push** | spec §5 ; output `w7oi1i5l8` |
| **Anti-fragmentation du code** (modules profonds, deletion test) | 💡 Idée | 2026-06-24 : noté hors-scope du glossaire | brainstorming → spec dédiée | spec glossaire §8.1 |
| **Capitaliser les 5 principes de conception** dans `methodo-coproflex` | 💡 Idée | 2026-06-24 : noté hors-scope du glossaire | brainstorming → spec dédiée | spec glossaire §8.2 |
| **Golden exhaustif « Domaine des Tilleuls »** (tests) | 📐 Design validé | grilling 2026-06-22 : plan + valeurs attendues | EN ATTENTE GO USER pour dérouler | `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` |
| **Portail copropriétaire** (8 pages, server-first) | 📐 Design validé | 2026-06-10 : design validé, zéro implémentation | `/writing-plans` session dédiée | `docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md` |
| **Refonte UI/UX manager-first** + espaces copro/CS | 💡 Idée (direction) | direction posée | brainstorming → frontend-design (stack réelle CSS Modules) | mémoire `ui_ux_refonte_direction` |
| **S0 — Faille RLS anon du live** | ✅ Vérifié 2026-06-25 | Vérif empirique MCP (lecture seule) : **87 tables, 0 sans RLS, 0 anon-exploitable** ; les 2 tables nominatives ont RLS ON + 0 grant anon ; advisor = 0 finding RLS. **Fausse alerte** (déjà bouché par 0085/0086, 21 juin). Mémoire `coproflex-cloud-live` corrigée | Aucune — **clos**. Reliquat de durcissement → ligne dédiée ci-dessous | `AUDIT_COHERENCE_CADRAGE_2026-06-24.md` ANOM-01 (périmé) · mémoire `coproflex-cloud-live` |
| **Durcissement sécurité** (FORCE généralisé + advisors) | 💡 Idée (non urgent) | 2026-06-25 : issu de la vérif S0 — FORCE sur **5/87** seulement (cœur finance), 82 ON-sans-FORCE ; advisor = 169 WARN + 1 ERROR (vue `tiers_directory` DEFINER **voulue**) | Cadrer plus tard **avec revue cascade** (FORCE touche aux 154 RPC definer) : FORCE généralisé + tri advisors (13 `search_path`, `pg_net` hors `public`, activer protection mots de passe compromis) | mémoire `coproflex-cloud-live` MAJ 2026-06-25 |
| **Migration TanStack Start** (`v2-tanstack/`) | 🚧 En cours | from-scratch en cours, moteur=parité | dérouler features par catégorie + ordre de dépendance | `REFONTE_CARTOGRAPHIE/CHAINES/VERIFICATIONS_2026-06-22.md` |
| **Catalogue d'actes facturables auto-comptabilisés** | 💡 Idée (retenue P1) | 2026-06-26 : idée USER pendant ARB-3 ; paramétrage par syndic (LRAR, mise en demeure, état daté, frais mutation…) = libellé + tarif + **qui paie** + écriture déclenchée. S'appuie sur mandat complet (P1) | Brainstorming/spec en P1 : régime légal par acte (art.10-1 défaillant ; état daté plafonné 380€), acte=événement→écriture gardée idempotente→GL | `REFONTE_DECISIONS_2026-06-23.md` (ARB-3) · dossiers C16-1/C16-2 |

---

## Actions techniques repérées au fil du grilling (backlog build)
> Petites actions concrètes découvertes pendant le cadrage, à ne pas perdre (≠ chantiers).

- **Chart** : ajouter le compte `718` « Produits exceptionnels » (absent du seed) + vérifier `677` (dans la règle `charge_nature` 0059 mais absent du seed). *(C.7-P5, 2026-06-24)*
- **Annexe 6** : implémenter la liste individualisée des copropriétaires au format légal 7 colonnes. *(C.7-P1, 2026-06-24)*
- **RPC à créer** : `record_legal_proceeding` (table `legal_proceedings` sans fonction d'écriture). *(C.5-P3)*
- **GED unifiée** : inventorier TOUS les générateurs de documents + toute table parallèle (au-delà de `ag_documents`) → router via un helper unique `register_generated_document` ; `documents` = référentiel unique ; `ag_documents.document_id` → NOT NULL. *(C.10-P2, 2026-06-24)*
- **Mémoire** : `MEMORY.md` dépasse la limite (25,1 KB > 24,4 KB) → compacter (1 ligne/entrée, fusionner/élaguer les entrées périmées). *(2026-06-24)*

### Drifts repérés par l'enrichissement glossaire (ultracode, 2026-06-24)
> Écarts « conçu/décidé mais pas codé » remontés par la vérification adversariale du code. Détail complet : `…/tasks/w7oi1i5l8.output`. Plusieurs sont déjà connus (mémoires sécurité/drift) — ne pas re-traiter en double.

**Finance / écriture (RPC à créer ou réunifier) :**
- **Compte 102 « Provisions pour travaux décidés » (art. 14-2 I) = P1** : dormant en V1 (travaux via 702 + gel du résultat travaux compte 12). À câbler en P1 **avec le suivi par opération** (`operation_id`, palier E4) pour une présentation bilancielle orthodoxe (annexe 1/5) + réserve par chantier. **Pré-requis de mise en route** : test golden de travaux **à cheval sur 2 exercices** prouvant que le report via le 12 ne perd rien. *(EXP-6, 2026-06-26 ; pas un bloqueur de justesse V1.)*
- `post_exceptional_call_for_funds` (appel travaux dédié) — spécifiée design 0037, jamais codée ; aujourd'hui via le poseur générique.
- Appel **avance art.35** (D450-3/C1031) — aucune route d'émission (pas de `budget_type='advance'`).
- **Réalisé budgétaire = 2 sources** (budget_expenses vs classe 6 du GL) → réunifier vers le GL.
- **Double-posting** : `validate_budget_expense` ET `validate_supplier_invoice` postent D6xx/C401 → requalifier `budget_expenses` en **engagement** (couche « engagé » non matérialisée).
- Reclassement **459** (créance douteuse) + dotation **491/492** — comptes présents, aucune RPC.
- `718` produits exceptionnels — **à ajouter au plan** (déjà listé ci-dessus).
- `record_legal_proceeding`, `record/settle_mutation_opposition`, `create/resend/revoke_copro_invitation` — tables présentes, RPC à créer.
- Frais recouvrement **450-6** + plan d'apurement + intérêts art.36 — à câbler.

**AG / cadrage :**
- **RUPTURE `action_type=NULL`** : `createStandardResolutions` (front) ne pose pas `action_type` → résolutions « muettes », 0 décision matérialisée. *(à vérifier en priorité, casse l'auto-population)*
- `create_budget_from_ag_resolution` inexistante (budget créé en amont → risque fantôme sans `source_ag_id`).
- `activate_ag_decisions` tout-ou-rien (pas de savepoint/reprise partielle).
- Vote par **clé spéciale** + `is_amended` + `repartition_key_id` sur `ag_resolutions` : colonnes absentes (vote toujours sur tantièmes généraux).
- Émission appels **en bloc à l'AG** (option B « au fil des trimestres » non implémentée) ; reconduction provisoire art.14-1 al.3 non tracée.

**Annexes / maintenance :**
- Cascade clé **Annexe 3** (réalisé par clé) figée à 0 ; pas de `fn_annexe_6` (porté par `fn_annexe_1`).
- **OS récurrent + alerte Chatel** : colonnes dormantes, aucun cron/générateur.
- 3ᵉ voie bancaire (« comptabiliser un mouvement ») non implémentée.

**Sécurité / dette (déjà en mémoire — pour mémoire) :** RLS ON sans FORCE (hors 6 tables), faille anon `0085`, escalade `platform_admin`, IDOR GoCardless, ~61 fonctions SQL désync (repo non reproductible), HTML→PDF non fait (jsPDF), dette front (2 arbres `features`, ~13 formateurs euro, pages EN/FR, `PaymentModal` homonyme).

---

## Journal des changements d'état
- **2026-06-26 (repo v2 dédié — DÉCISION + migration infra)** : décision Lyes — **la v2 part dans un repo Git dédié** `propulsFlex/Coproflex` (local `Desktop/Code/coproflex-v2`), code + docs canoniques. **Supersède** la décision « même repo / bascule au go-live » ([[migration_tanstack_start]]). Raison : grep 100 % propre + moment le moins cher (v2 à peine commencée). **Phases 1-2 FAITES** : `v2-tanstack/` promu en repo indépendant (commit `8b46139`, 92 fichiers, `.env.local` gitignoré vérifié), `typecheck`+`vite build` verts, poussé sur GitHub (HTTPS, compte `propulsFlex`). **Reste** : Phase 3 = base `docs/` canonique (= atterrissage de la purge des 107 findings) ; Phase 4 = `CLAUDE.md` v2 + hook + re-clé mémoire + correction des mémoires empoisonnées ; Phase 5 = pointeur sur l'ancien repo (v1 gelé). Backend Supabase cloud `qqfqrcolzmcbsvfaumiq` **inchangé** (partagé). `v2-tanstack/` reste dans l'ancien repo (doublon gelé jusqu'au pointeur Phase 5).
- **2026-06-26 (audit cohérence exhaustif)** : balayage anti-pièges « tout sauf déchets » en **2 vagues** (vague 1 = 9 grappes ; vague 2 = 23 grappes relancées après un throttling serveur transitoire ; ~310 agents, ~18 M tokens, lecture seule). Résultat = **`AUDIT_CONTRADICTIONS_2026-06-26.md`, 107 findings** (🔴18 🟠54 🟡28 ⚪7), vérifiés adversarialement (panel de 3 jurés sur les 🔴). **Leçon méthode** : un workflow à fort fan-out (>30 grappes) sature l'API → découper en sous-vagues séquentielles. **0 correction appliquée** (lecture seule) ; tri/ratification à suivre. NB : le registre `SUPERSEDES` (10 périmés) était très incomplet — l'audit a multiplié la couverture ×10.
- **2026-06-26 (reprise post-déménagement)** : projet déplacé vers `Desktop\Code\Co-Pro-Flex`, **mémoire migrée** vers la nouvelle clé projet (104 fiches, vérifiées). **Contradiction tranchée** : le chantier « Sécurité live hors-bande » est **annulé en tant que patch live** — le live `qqfq` **meurt gelé** (quasi vide, voué au remplacement), la sécurité devient **native dans la baseline 0001 de la base neuve** (cohérent SESSION/BILAN « sécu native, pas de patch jetable »). La recon read-only a documenté l'anti-pattern `platform_admin` à ne pas reproduire. Restent les autres « pièges à copie » → chantier **purge des contradictions**.
- **2026-06-26 (soir)** : **CADRAGE DES BLOCS CLOS** (41 décisions ce jour : 5 ARB + EXP + socle C.17 + C16/C12/C13/C14/C15/C11). Puis **audit de couverture multi-agents** (12 agents, vérifs en base) → `BILAN_CADRAGE_2026-06-26.md`. Verdict : cartographie + décisions macro solides, mais **0 objet v2 construit** + **2 failles sécurité ACTIVES en prod** + **147 trous fins Partie C** restants. Prochaine action = sécurité live hors-bande, puis purge de texte + supersedes, puis Palier 0.
- **2026-06-26 (matin)** : prep de nuit livrée (`MORNING_BRIEF_2026-06-26.md` = 35 fiches de décision + `COHERENCE_PLAN_V2_2026-06-26.md`). **5 arbitrages bloquants TRANCHÉS** (ARB-1 impayés↔GL · ARB-2 deux poches · ARB-3 mandat minimal V1 + idée catalogue d'actes P1 · ARB-4 date état daté=v_eff · ARB-5 min ALUR=MAX(5%budget;2,5%PPT)) → consignés dans `REFONTE_DECISIONS`. Reste : C15-5 multi-rôle (risque d'ordre) + ratifier les 30 autres fiches du brief.
- **2026-06-25** : S0 « faille RLS anon » **vérifié empiriquement = fausse alerte** (déjà bouché 0085/0086) → **clos** ; reliquat de durcissement (FORCE généralisé + advisors) versé en chantier séparé non urgent. Mémoire `coproflex-cloud-live` corrigée (FORCE = 5/87 cœur finance, pas 87 ni 0).
- **2026-06-24** : création du registre. GLOSS- phase 1 (socle) + phase 2 (enrichissement ultracode, 230 termes) livrées ; auto-import retiré. Grilling PARTIE C : C.6 + C.7 + **C.9 entièrement cadrés** (P1-P5). Drifts versés au backlog.
