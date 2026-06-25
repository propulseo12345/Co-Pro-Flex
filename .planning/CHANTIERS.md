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
| **Grilling cadrage PARTIE C** (PARTIAL résiduels) | 🚧 En cours | 2026-06-24/25 : C.6→C.10 ✅ ; C.11 P1-P3 faits ; nuit : 45 dossiers pré-grillés → `PRE_GRILLING_PACK_2026-06-25.md`. **2026-06-25 : socle C.17 COMPLET (C17-1/2/3/4/7) + EXP-7 tranché** (GL = source unique des montants, séquencé réalisé→impayés ; ANOM-03/12) — tout consigné | Ordre conseillé du pack : **C17-6** (cohérence machines à états SQL), puis C17-8, C17-5, EXP-4…, puis C.16/C.15/C.12/C.13/C.14, finir C.11 P5-P6. ⚠️ 6 arbitrages strictement USER (créances↔GL, mandat V1, annexe 1, état daté, ALUR, multi-rôle) | `PRE_GRILLING_PACK_2026-06-25.md` · `REFONTE_DECISIONS_2026-06-23.md` (salve Socle C.17) · `AUDIT_COHERENCE_CADRAGE_2026-06-24.md` |
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
- **2026-06-25** : S0 « faille RLS anon » **vérifié empiriquement = fausse alerte** (déjà bouché 0085/0086) → **clos** ; reliquat de durcissement (FORCE généralisé + advisors) versé en chantier séparé non urgent. Mémoire `coproflex-cloud-live` corrigée (FORCE = 5/87 cœur finance, pas 87 ni 0).
- **2026-06-24** : création du registre. GLOSS- phase 1 (socle) + phase 2 (enrichissement ultracode, 230 termes) livrées ; auto-import retiré. Grilling PARTIE C : C.6 + C.7 + **C.9 entièrement cadrés** (P1-P5). Drifts versés au backlog.
