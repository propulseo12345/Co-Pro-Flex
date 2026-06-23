# 🚀 REPRISE — Démarrage de l'implémentation (Vague V0)

> À lire en entier au démarrage de la nouvelle session, AVANT de coder.
> Fin de la phase **lecture seule** (audit). On passe à l'**écriture**, prudemment (tests jetables d'abord).
> Daté du 2026-06-02. Branche `v2` @ `ee41d9d`.

---

## 0. Contexte en 30 secondes

Plateforme de gestion de copropriété (Next.js 16 + React 19 + CSS Modules + Supabase). On répare la **boucle financière** : tout doit dériver du **grand livre** (partie double, décret 2005-240). On vient de finir un **audit logique métier** (lecture seule) + un **red-team du plan de correction**. Maintenant : **implémenter**, en commençant par la vague la moins risquée (V0).

## 1. Les 3 livrables à lire en premier (tout est dedans)

- [`.planning/CARTOGRAPHIE_REELLE.md`](CARTOGRAPHIE_REELLE.md) — la base vivante vérifiée (schémas réels, vues, RPC, état RLS, helpers). **Source de vérité = la base, pas la doc.**
- [`.planning/AUDIT_LOGIQUE_METIER.md`](AUDIT_LOGIQUE_METIER.md) — 33 findings, 9 chapitres (verdict par règle + preuve par recalcul), constats transverses, plan V0→V6.
- [`.planning/PLAN_CORRECTION_VALIDE.md`](PLAN_CORRECTION_VALIDE.md) — **le doc maître** : red-team des correctifs (best/improve/replace), corrections de séquencement (S1-S5), gaps (G1-G10), **§3.3 chemin critique**, **§5 par où commencer**, **§6 arbitrages de Lyes** (font foi).

## 2. Chemin critique validé (finance-first)

```
V0 filets (zéro risque) → V2 unifier la route d'appels → V1 grand livre propre → V4 clôture (4.2 à-nouveau PUIS 4.1 affectation → annexe 1 + relevé sur GL)
```
⚠️ Corrections du red-team à ne pas oublier : **à-nouveau (4.2) AVANT affectation (4.1)** ; éviter le **double-comptage du résultat** (G1 : l'à-nouveau reporte le SOLDE du 120, ne le recalcule pas) ; re-imputation 450→450-1 **par écriture inverse**, pas par UPDATE (G2, immutabilité) ; **rebrancher le relevé de compte sur le GL** dans la même vague que V4 (G3).

## 3. Arbitrages de Lyes (PLAN §6 — ils font foi)

1. **Affectation du résultat** : **l'AG tranche** (report/imputation/remboursement) ; « reste sur 450 » = simple fallback si rien voté ; écriture 120/110→450 datée AG N+1.
2. **Imputation paiements** : **cloisonnée par nature** (courant/travaux/ALUR jamais croisés) ; imputation manuelle possible ; param `p_nature` dans `allocate_payment`.
3. **Vote correspondance sur résolution amendée** : le **gestionnaire qualifie** (flag `amended_in_session`) → effet légal **auto** (les « pour » correspondance → **défaillants**, art. 17-1 A, non négociable) + affichage de l'impact + confirmation ; cas « contre »/« abstention » (zone d'ombre) laissés au gestionnaire avec alerte.
4. **Plafond de pouvoirs (10 % + exclusion syndic)** : **avertir sans bloquer** (avertissement front visible rappelant le risque d'annulation ; pas d'EXCEPTION serveur).
5. **Quorum** : **supprimer** « QUORUM NON ATTEINT » du PV ; **afficher une participation indicative** (tantièmes présents/représentés) ; corriger `ag_attendance.tantiemes` (aujourd'hui `lot_ids=[]`→0).

## 4. La vague V0 — items concrets + critères de test (PLAN §5.1)

V0 est **non bloquant, parallélisable, zéro risque comptable**. À implémenter :

1. **`UNIQUE INDEX ag_pending_actions(ag_id, resolution_id)`** — vérifier d'abord 0 doublon existant (OK en base au 2026-06-02).
2. **Vue `v_call_vs_budget_mismatch`** — Σ appels (non annulés) vs Σ `budget_lines` par budget, seuil 0,01 ; exposée dans `v_finance_integrity_issues`.
3. **Vue `v_owner_vs_gl_mismatch`** (gap G3) — relevé de compte (`v_owner_statement_lines`) vs solde GL par copropriétaire (écarts connus −423 à +30 €).
4. **Preview AG honnête (front)** — `checkMajority` + `handleValidateSecondVote` en `pour > contre` (ART_24 / ART_25_1). ⚠️ **Preview seulement** : la correction de la *persistance* (front qui persiste un résultat faux au PV) est en **V5.1**, pas ici. Ne pas mélanger.

**Critères de test V0** : les vues d'intégrité s'affichent et chiffrent les écarts connus (+0,16 € ; −423/+30 €) **sans rien casser** ; un 2ᵉ INSERT de même `(ag_id, resolution_id)` échoue ; la preview live donne la **même majorité que la RPC** sur le contre-exemple `for=40 / against=30 / abstention=40`.

## 5. AVANT V0 (recommandé) — harnais de tests jetables (PLAN §4.2)

Monter un parcours de test sur **copro jetable** pour prouver les correctifs lourds avant de les écrire : **double-comptage** affectation/à-nouveau (résultat 2025 = **−755 €**, vérifier 120 final = 0 et 450 augmenté **une seule fois**), **trop-perçu → 450-3**, **cut-off cross-période** (paiement N+1 soldant un appel N une fois 2027 ouvert). C'est ce qui sécurise V1/V4 ensuite.

## 6. Garde-fous / gotchas (NE PAS SE PLANTER)

- **Supabase** : `project_id = iyfesbjnkpynmwlsmxnp` (compte perso, via MCP).
- **Boucle d'or `22222222` « Le Clos Saint-Michel » = IMMUABLE** — exo 2026 open / 2025 closed. **Ne JAMAIS y écrire.** Témoin `11111111` à laisser aussi. → toute écriture de test = **copro JETABLE neuve**.
- **Migrations** = fichier dans `supabase/migrations/` **+** `apply_migration`. **Le classifier bloque les DELETE/DDL/migrations non consentis → demander l'OK utilisateur** avant tout `apply_migration` / suppression.
- **Working tree dirty** : travail UTILISATEUR en cours sur `src/app/(dashboard)/coproprietaires/page.tsx`, `CoproprietaireEditModal.tsx`, `useCoproData.ts`, `useCoproprietairesPage.ts`, `lib/owners/api.ts` → **NE PAS TOUCHER**.
- **Type-check après chaque modif** (`tsc --noEmit` / équivalent projet). Tâche finie **seulement si** type-check **ET** tests passent.
- **Dev server** : `npm run dev` dans `Co-Pro-Flex/` → http://localhost:3000.
- **Stack/règles** : TypeScript strict (jamais `any`), alias `@/`, CSS Modules (pas Tailwind, pas de style inline), fichiers < ~300 lignes.
- **Anti-patterns à corriger, pas à reproduire** : `EXCEPTION WHEN OTHERS` (remontée d'erreur typée) ; doublons de pattern ; vues découplées du GL.
- **Defense-in-depth** : doubler les invariants RPC par des `CONSTRAINT TRIGGER` (pattern existant `trg_validate_call_total`).
- **Règle de Lyes** : confirmer avant tout gros changement ; agir en expert copro (positions argumentées + sources), se challenger mutuellement.

## 7. Première action proposée à la nouvelle session

> « On reprend pour démarrer V0. Je propose : (a) créer une **copro jetable** + le harnais de tests (double-comptage, trop-perçu, cut-off), puis (b) implémenter les 4 items V0. Je te montre chaque palier avant de pousser. OK pour (a) d'abord, ou tu veux attaquer directement les filets V0 ? »

Attendre le feu vert avant d'écrire (gros changement = validation préalable).
