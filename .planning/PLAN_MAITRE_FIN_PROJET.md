# PLAN MAÎTRE — Fin de projet CoProFlex (suivi E2E)

> Écrit le 2026-06-10 (analyse complète docs + vérification code). **Document de suivi unique**
> de la fin du projet — remplace `ROADMAP_FINALISATION_BETA.md` (périmètre élargi) et
> `PROGRESS_REFONTE.md` (périmé). Décisions de cadrage : **G6** (horizon feature-complete),
> **G7** (recâblage complet avant bêta), **G8** (arbitrages en session dédiée) — cf. `DECISIONS.md`.
>
> **Conventions de suivi** : cocher les cases à chaque fin de session (`/token-saver save`),
> état instantané dans `SESSION.md`. Cadence **F10** : Lyes teste en fin de CHAQUE tranche
> (Claude annonce « quoi tester »). **Toute migration cloud = GO explicite** (G2).

---

## Cible (3 paliers successifs)

1. **BÊTA pilotes** = 8 modules recâblés (G7) + portail copropriétaire (G1) + sécurité prouvée + déployé sur projet Supabase neuf (G2).
2. **1ER CLIENT PROD** (F7) = bêta + conformité légale complète (annexes, état daté, contre-passation, reprise de mandat fiabilisée).
3. **FEATURE-COMPLETE** (G6) = + mutations/ventes, paiement en ligne, conformité 2026, RGPD, dette transverse.

## Carte des dépendances

```
J0 hygiène + arbitrages (immédiat)
 │
 ├─► J1 sécurité/RLS ─────────────┐
 ├─► J2 recâblage 6 modules ──────┤    (J2/J3 parallélisables par lanes :
 ├─► J3 portail copropriétaire ───┼──►  portail/front = src/ · vues/RPC = supabase/)
 ├─► J4 qualité Zod/CSP/lint ─────┤
 │                                ▼
 │                        J6 déploiement cloud neuf + E2E navigateur
 │                                │
 ├─► J5 conformité légale ────────┤  (requis AU PLUS TARD avant J8 ;
 │    (peut avancer en parallèle) ▼   idéalement avant la 1re clôture pilote)
 │                        J7 BÊTA pilotes (1-2 syndics)
 │                                ▼
 │                        J8 1ER CLIENT PROD
 │                                ▼
 └──────────────────────► J9 FEATURE-COMPLETE
```

---

## J0 — Hygiène & arbitrages *(démarrage immédiat · 2-3 sessions · effort `Max`)*

- [x] **0.1 Hygiène git** ✅ 2026-06-10 : `.gitattributes` (EOL sql/sh), ~92 commits poussés, **CI verte** (run 27286218272, db:test bloquant inclus), **PR #2 mergée** (`d9a6911`), `main` local = `origin/main` (rebase ; le commit de sauvegarde 3h01 était déjà intégralement dans la branche → absorbé).
- [x] **0.2a Dossier d'arbitrage (G8)** ✅ 2026-06-10 : `DOSSIER_ARBITRAGE_J0.md` — **20 fiches** (7 🔴 + 7 🟡 + D3/D4/D5/D6 état daté + S1/S2 seed E2E), état du code vérifié dans les migrations, recos sourcées Légifrance.
- [x] **0.2b Session de décision** ✅ 2026-06-10 soir : **20/20 tranchés** (analyse expert, délégation Lyes) + 4 durcissements (B3 renommage requis J5 · B4 écran d'apurement · B5 assertion bloquante multi-clés · C3 mention sur l'avis). Journalisé : `DECISIONS.md` (B/C/E 🟢 + **§H** état daté/mutations/fixtures). **J0 CLOS À 100 %.**
- [x] **0.3 Finitions finance** ✅ 2026-06-10 : types = **greffe chirurgicale 0044** (enum/colonnes/vue/RPC ; la regen complète exposait ~430 erreurs des modules driftés → **déplacée en 2.9**, référence fraîche : `.planning/supabase_types_regenerated.ts`) ; **UI « créer un avoir »** livrée (fiche facture : modal total/partiel au prorata ; liste : `handleConfirmAvoir` re-routé RPC, fin du montant négatif rejeté) ; **piège mock `/finance/factures/new` remplacé** (saisie réelle mono-poste, `post_immediately=true`) ; mapper liste `doc_kind` → les avoirs sortent des KPIs « à payer »/retards (filtres existants redevenus effectifs).

**Test Lyes** : créer un avoir sur une facture test → net à payer correct ; saisir une vraie facture depuis l'UI → elle persiste.

## J1 — Sécurité / isolation *(LE mur démo→prod · 2-3 sessions · effort `ultracode`)*

> **PR #5** (`j1-rls-securite`, CI verte) — 2026-06-10. Cœur isolation livré et prouvé.

- [x] **B1** ✅ : bascule RLS **fail-safe** (`apply_rls_environment()` 0034 : RLS ON + FORCE GL par défaut, OFF si `app.environment='development'` explicite posé par seed.sql) ; **+ M2** ✅ (assertion REVOKE anon : exclut fonctions d'extensions `pg_depend` deptype `'e'` + REVOKE défensif). Prouvé : rejeu 0001→0045 sur base fraîche → 80/80 RLS ON, FORCE ×5.
- [x] **RLS ON + étanchéité prouvée** ✅ : `gate_rls_multitenant_isolation` (cabinet A ⊀ cabinet B sur 9 tables + écriture refusée + modèle privé invisible + preuve positive), FORCE sur le GL, `resolution_templates` couvert par le registre.
- [x] **7 fuites `SECURITY DEFINER` fermées** ✅ (audit adversarial ultracode → migration 0045) : RPC DEFINER `to authenticated` sans garde = IDOR cross-tenant. Garde `is_service_call() OR user_has_copro_access/manager`. Gate `gate_rls_definer_guards`. Inventaire propre : 0 table hors registre, 0 vue sans `security_invoker`, 0 grant anon.
- [x] **`owner_id` → session** ✅ : les 6 fichiers comm (useMur/useMessagerie/useMailbox/page/2 routes) dérivent l'utilisateur de la session (`useSupabase()`) ; `mails` = boîte partagée par copro ; webhook inbound = client service_role + gestionnaire de la copro (`MAIL_INBOUND_COPRO_ID`). Nouveau `lib/supabase/admin.ts`.
- [x] **Seed comptes démo** ✅ : déjà dans `seed.sql` (admin/gestionnaire/jean.dupont + memberships). `ensure_dev_membership` = mort (aucun appelant src/migrations) → bascule sans objet.

**Test Lyes** : 2 comptes de 2 cabinets → aucune fuite de données dans aucun module. *(Reste à brancher en cloud J6 : poser `SUPABASE_SERVICE_ROLE_KEY` + `MAIL_INBOUND_COPRO_ID` ; mapping fin adresse→copro du webhook = J2.5.)*

## J2 — Recâblage hors-finance *(G7 · ~~8-12 sessions~~ → **quasi soldé**, audit 2026-06-10)*

> **RÉVISION 2026-06-10 (audit mock vs Supabase, 2 agents)** : la prémisse « modules sur mock à recâbler » était PÉRIMÉE. **Tous les modules hors-finance sont déjà 100% Supabase** (vérifié par les tells `createClient()`/`.from()`/`.rpc()` dans les hooks/api). Le « gros recâblage » a été fait pendant la refonte finance. Il ne reste que **2.8** (vrai trou comptable) + un nettoyage de flags morts.

- [x] **2.1 Budget** ✅ déjà Supabase (`useBudget` 955L → `useBudgetData` Supabase ; vues `v_budgets_overview`/`v_budget_lines_overview`/`v_budget_expenses_detail` créées en 0036 ; RPC `validate_budget_expense`/`post_alur_transfer`). **Flag `BUDGET_USE_SUPABASE` MORT** (jamais lu).
- [x] **2.2 AG** ✅ déjà Supabase (`ag_meetings`/`v_ag_overview` + RPC cycle de vie). Compléments (pouvoirs/jalons/stats) = enrichissements, pas du recâblage.
- [x] **2.3 GED / documents** ✅ déjà Supabase (`v_documents_with_folder`, storage `ged`). *Rattachement justificatif→facture (`document_id`) = attente terrain Lyes, à traiter avec 2.8.*
- [x] **2.4 Maintenance / prestataires** ✅ déjà Supabase (`v_providers_overview`, `v_logbook_overview`, `v_service_orders_overview`, RPC OS).
- [x] **2.5 Communication / mail** ✅ déjà Supabase ; cloisonnement utilisateur réglé en J1 (owner_id→session).
- [x] **2.6 Conseil syndical** ✅ déjà Supabase (`v_council_members`, `v_council_decisions_overview`, edge functions).
- [x] **2.7 Dashboard / restes** ✅ déjà Supabase (`v_dashboard_*`).
- [x] **2.8 Factures fournisseurs : validation & paiement RÉELS** ✅ *(livré 2026-06-11, branche `j2-factures-validation-gl`)* : RPC **`validate_supplier_invoice`** (0046) poste D6xx/C401 depuis le brouillon + ses lignes (gardée gestionnaire, idempotente, refuse brouillon sans ligne, recalcule le total depuis les lignes) ; **paiement** rebranché sur la RPC `post_supplier_payment` (D401/C512) au lieu du flip nu. Front : `handleSendToAccounting`/`handlePaymentComplete` → RPC, état optimiste conditionné au succès. Gate `gate_supplier_invoice_validation` (12/12) + rebaseline 46/46. Limitations parkées (paiement partiel, sous-compte 512) : `DECISIONS_AUTONOMIE.md`.
- [x] **Nettoyage flags morts** ✅ *(2026-06-11)* : supprimé `BUDGET_USE_SUPABASE`, `VENTES_USE_SUPABASE`, `DASHBOARD_USE_SUPABASE` (déprécié) et `moduleUsesSupabase()` de `src/lib/features/flags.ts` (aucun import dans le code, mentions docs = historique).
- [ ] **2.9 Régénération `src/types/supabase.ts`** : référence `.planning/supabase_types_regenerated.ts` (purge objets fantômes). *À refaire après 2.8 si la signature RPC change.*

**Test Lyes** : un parcours type par module (la plupart déjà testables) ; focus = parcours facture (saisie brouillon → validation → vérifier l'écriture GL → paiement).

## J3 — Portail copropriétaire *(G1 · 4-6 sessions · effort `Max` + `ultracode` ponctuel)*

- [ ] `/writing-plans` depuis la spec validée (`docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md`) — session dédiée.
- [ ] Implémentation : route group `(coproprietaire)`, 8 pages server-first RSC, V1 zéro-migration.
- [ ] Invitations + rattachement `coproprietaires.user_id`.
- [ ] **Gate de lancement = RLS** (dépend J1) : revue adversariale `ultracode` avant ouverture.

**Test Lyes** : se connecter en copropriétaire → voir SES lots/appels/documents, rien d'autre.

## J4 — Qualité & garde-fous *(2 sessions · effort `Max`)*

- [ ] **Zod + React Hook Form** sur les formulaires critiques finance/AG (aucune validation aujourd'hui — confirmé absent des deps).
- [ ] **CSP** : passer de Report-Only à enforced (après vérification des écrans).
- [ ] Dette lint bloquante (13 erreurs) → job lint CI bloquant ; sweep final « aucun faux bouton ».

## J5 — Conformité légale & métier 1er client *(F7/F8/F9 · 5-7 sessions · effort `Max` + `ultracode` sur annexes)*

Exécution des arbitrages **tranchés le 2026-06-10** (verdicts : `DECISIONS.md` B/C/E + §H) :
- [ ] **Annexes** : vérif fac-similé puis gel des libellés SQL+front+PDF (E2, clôt E1) ; refonte annexe 1 sans compensation, par lot et par sens, 450-5 isolé (E7) ; annexe 2 en 2 blocs officiels (E8).
- [ ] **Schéma comptable** : colonne `charge_nature` + CHECK + seed sourcé arrêté (E3) ; `operation_id` niveau ligne FK budgets (E4) ; défauts 662 travaux / 711-718 courant (E5/E6) ; rattachement travaux obligatoire + filet « non rattachés » + blocage clôture d'opération (E9).
- [ ] **Clôture/affectation** : renommage 110→12 + compte d'attente courant hors racine 12x (B3, REQUIS avant 1ᵉʳ client) ; gel du 110 + écran « opérations à apurer » (B4) ; assertion bloquante multi-clés dans `regularize_period` (B5).
- [ ] **Paiements** : cloisonnement par nature PAR DÉFAUT (C2) ; reprise auto du trop-perçu + mention sur l'avis d'appel, 103 intouché (C3) ; correction doc/enums/seuil feuille de présence art. 24 (C6).
- [ ] **État daté & mutations** : tableau d'acquéreurs Σ=100 (H1) ; tous les cédants nommés (H2) ; partie 3 complète — provisions restantes + ALUR (H3) ; index unique clé générale (H4).
- [ ] **UX contre-passation guidée** (F9) — un syndic qui se trompe ne reste jamais bloqué.
- [ ] **Reprise de mandat fiabilisée** (F8) : unifier les 2 chemins front (B6), traçabilité 471/472 ligne-par-ligne (art. 10), import balance Excel, acompte 409.

## J6 — Déploiement + parcours bêta réel *(2-3 sessions · effort `Max` + `ultracode` pré-push)*

- [ ] **GO Lyes** → `db push` sur **projet Supabase NEUF** (cloud actuel intact) ; vérifs post-push obligatoires (checklist `RE-BASELINE_READINESS.md` : `app.environment`, RLS on + FORCE, cloisonnement réel).
- [ ] **Seed démo cloud** via API Admin GoTrue (jamais INSERT SQL — M1) + seed E2E AG (`seed_ag_e2e_FINAL.sql`, arbitrages tranchés en J0.2).
- [ ] **E2E navigateur Playwright** sur le parcours critique (harnais `test:e2e` existant) — la preuve « UI → base » qui manque encore.
- [ ] **Staging Vercel** + données démo → **recette complète Lyes** (jalon F10).

## J7 — BÊTA pilotes *(continu · effort `Max`)*

- [ ] Recruter 1-2 syndics pilotes ; monitoring d'erreurs (Sentry-like) ; canal de retour + triage hebdo ; itérer sur les frictions. **Critère** : copros réelles gérées, zéro perte de données.

## J8 — 1ER CLIENT PROD *(jalon F7)*

- [ ] Reprise de mandat réelle outillée (J5) ; recette conformité sur cas réel (annexes produites à une vraie clôture) ; go-live commercial.

## J9 — FEATURE-COMPLETE *(G6 · 8-12 sessions · backlog ordonné)*

- [ ] **Mutations / ventes** : `VENTES_USE_SUPABASE` → true, `v_mutations_overview`, opposition art. 20, workflow vente complet.
- [ ] **Appels exceptionnels / hors-budget** (F4) : `post_exceptional_call_for_funds` (design 2026-06-08 validé, écritures à figer avec Lyes) → réactiver le wizard masqué (G3).
- [ ] **Paiement en ligne** (Stripe) · **API bancaire lecture seule** (vision réconciliation trésorerie).
- [ ] **Conformité 2026** : DPE/PPT/Factur-X (aujourd'hui 100 % mock → brancher) ; contentieux/litiges.
- [ ] **RGPD** · extranet ALUR avancé · mandat syndic modélisé (différé 0030).
- [ ] **Dette transverse** : `any` résiduels, `console.*`, hooks monolithiques (`useAgData` 1091L, `useBudget`, `useAppelsFonds`), fichiers `.legacy`, doublons constantes, suppression des derniers fichiers EN morts.

## J10 — Gros pass POLISH UI/UX *(ajouté 2026-06-11 · effort `Max` + skills design)*

> Passe finale de qualité visuelle/ergonomie sur TOUTE l'app, une fois fonctionnellement complète (après J9). Objectif : qualité « agence haut de gamme », anti-générique, cohérence totale.

- [ ] **Audit UX d'ensemble** : parcours par module (dashboard, finance, AG, maintenance, GED, communication, copropriétaires, ventes, portail copro), repérer les écrans pauvres / incohérents / « faux boutons » résiduels.
- [ ] **Design system durci** : faire de `docs/claude/design-system.md` la source unique appliquée partout (tokens, espacements, typo, états hover/focus/loading/empty/error), supprimer tout style en dur / pastel / `rem` en finance.
- [ ] **Polish par module** : hiérarchie visuelle, densité, micro-interactions, transitions, skeletons de chargement, états vides soignés, responsive. Respecter la stack RÉELLE (Next.js + CSS Modules) — **ne PAS importer Tailwind** (skills design = goût, pas la stack).
- [ ] **Accessibilité** : labels, focus visibles, contrastes, navigation clavier (sweep a11y final).
- [ ] **Cohérence finale** : composants partagés unifiés (boutons, modales, tables, badges, KPI strips), 0 divergence entre pages ; PDF (convocation/PV/appels) alignés sur la DA.
- Outils : skills `frontend-design` / goût visuel (adaptés CSS Modules), MCP navigateur pour vérif réelle (Lyes), screenshots avant/après par écran.

**Test Lyes** : revue visuelle écran par écran ; « ça fait premium, c'est cohérent, rien ne sonne faux ».

---

## Règles de garde (rappel)

- **GL immuable** : correction = contre-passation, jamais d'UPDATE/DELETE sur écriture postée (A5).
- **Lot-centric** (A2) · **GL = source unique** (A1) · **cloisonnement ALUR d'ordre public** (C1).
- Copro **11111111 gelée** (D4) · boucle d'or **22222222** : écarts +0,16/−423/+30 = artefacts attendus (D2).
- Cadence migration : 3-checks + harnais (gate SQL) par migration ; grep des appelants front/edge AVANT de figer une signature RPC.
- `Max` par défaut ; `ultracode` aux jalons à enjeu (RLS J1, gate portail J3, annexes J5, pré-push J6).
