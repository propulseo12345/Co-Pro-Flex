# Roadmap — De l'état actuel à la bêta testable

> Écrit le 2026-06-10 (session autonome). Objectif : un chemin clair, ordonné par dépendances, de « boucle finance prouvée » jusqu'à « des syndics pilotes utilisent l'outil ». Honnête sur le « prouvé vs déclaré ».

## Où on en est (vérifié, pas déclaré)

- **Boucle finance de base : prouvée E2E** (gate `gate_finance_loop_e2e.sql`, `db:test` 7/7). Migrations 0001→0043 livrées et acceptées.
- **Produit : ~60 % en démo gestionnaire mono-utilisateur ; ~35 % en SaaS multi-clients prod.** L'écart = sécurité/isolation, pas fonctionnel.
- **3 blocages structurels connus pour la prod** : RLS désactivée (~71 tables), `owner_id` codé en dur (isolation users absente), pas de seed de comptes démo après reset.

## La décision qui cadre tout : quel périmètre de bêta ?

👉 **Recommandation : viser d'abord une « bêta gestionnaire-only »** — un syndic gère ses copros dans l'outil, sans portail copropriétaire ni paiement en ligne. C'est atteignable bien plus vite et ça valide le cœur métier auprès de vrais utilisateurs. Le portail copropriétaire et le paiement en ligne deviennent une **bêta 2**.

Trois décisions à acter (au réveil) :
1. **Bêta gestionnaire-only d'abord ?** (reco : oui) ou attendre le portail copropriétaire ?
2. **Appel exceptionnel** (`createCall`) : on l'implémente maintenant (avec toi pour les écritures) ou on **masque le wizard** tant que c'est différé (F4) ?
3. **Cible cloud de la bêta** : on redéploie le schéma propre (0001→0043) sur un **projet Supabase neuf** pour la bêta ? (l'actuel cloud est l'ancien schéma ; toute migration cloud attend ton GO.)

---

## Phase 0 — Fermer la finance *(finition, 1–2 sessions · effort `Max`)*

Le cœur est prouvé ; il reste à brancher proprement le front et à couvrir le cycle de clôture.

- **Rebranchement fournisseurs** `suppliers → tiers`, `supplier_id → tiers_id` (spec concrète dans `RESULTATS_FINANCE_2026-06-10.md` §3). Mécanique, à tester.
- **Décision `createCall`** : implémenter `post_exceptional_call_for_funds` (écritures validées avec toi) **ou** masquer le wizard.
- **Régénération `types/supabase.ts`** (dette connue) → supprime les enums périmés (`bank_transfer`) et resynchronise.
- **Gate dédié clôture/affectation** : un scénario E2E `close_period → open_next_period → regularize_period` (exclu du gate per-lot actuel pour raison structurelle documentée dans 0029) → prouver le report à-nouveau + l'affectation du résultat.
- **Sweep des références mortes restantes** hors finance (même méthode : grep `.from`/`.rpc` ↔ vues/fonctions réelles).

**Critère de sortie** : `tsc`+`vitest`+`db:test` verts, finance front 100 % branchée sur des vues/RPC existantes, cycle de clôture prouvé.

## Phase 1 — Sécurité & isolation *(prérequis ABSOLU de toute bêta · effort `ultracode` pour la RLS)*

C'est le mur entre « démo » et « des vraies données de syndic ».

- **Activer la RLS** sur les ~71 tables (les policies sont déjà écrites → bascule + test d'étanchéité multi-tenant). Revue adversariale multi-agents recommandée (enjeu fuite de données).
- **`owner_id` → `auth.uid()`** dans les 6 fichiers (communication mur/mail/messagerie + 2 routes API) → boîtes/messages réellement cloisonnés par utilisateur.
- **Seed des comptes démo** après reset (trou connu : `db reset` vide `auth.users`) → un parcours de test reproductible.
- **Vérifier le middleware d'auth** de bout en bout (déjà en place : `getUser()` → redirect login).

**Critère de sortie** : test d'étanchéité prouvant qu'un cabinet A ne voit jamais les données d'un cabinet B ; aucun `owner_id` codé en dur.

## Phase 2 — Qualité & garde-fous *(effort `Max`)*

- **Validation des formulaires critiques** (Zod + React Hook Form) sur finance/AG (montants, dates, clés) — aujourd'hui aucune validation.
- **CI** (`.github/workflows`) qui lance `tsc` + `vitest` + `db:test` à chaque PR → plus de régression silencieuse.
- **Headers de sécurité** (CSP/HSTS), `vercel.json`, retrait des pièges mock (`/finance/factures/new` qui ne persiste rien).

**Critère de sortie** : CI verte obligatoire avant merge ; formulaires finance/AG validés ; pas de faux bouton qui ne fait rien.

## Phase 3 — Parcours bêta gestionnaire, E2E réel *(effort `Max` + navigateur)*

- **Onboarding copro réel A→Z** dans le navigateur (création cabinet → copro → lots/tantièmes → exercice → budget → appel → paiement → relevé) sans plantage.
- **E2E navigateur (Playwright)** sur le parcours critique (le harnais `test:e2e` existe déjà) — la preuve « UI → base » qui manque encore (la preuve SQL, elle, est faite).
- **Déploiement staging** sur le projet cloud cible (après ton GO migrations) + données de démo.

**Critère de sortie** : un syndic peut faire un cycle complet dans l'app déployée, écrans réels, sans toi derrière.

## Phase 4 — Bêta-test *(pilotes réels)*

- Recruter **1–2 syndics pilotes** (ta cible métier).
- **Boucle de feedback** : monitoring d'erreurs (Sentry-like), canal de retour, triage hebdo.
- Itérer sur les frictions réelles avant d'élargir.

**Critère de sortie** : des copros réelles gérées dans l'outil, retours collectés, zéro perte de données.

---

## Après la bêta gestionnaire (bêta 2 / backlog)

- **Portail copropriétaire** (`(coproprietaire)`, plan `PLAN_MAITRE_VUE_COPROPRIETAIRE.md` : ~90 % de la data existe ; reste UI + RLS + `coproprietaires.user_id` + invitation).
- **Paiement en ligne** (Stripe).
- **Appel exceptionnel / hors-budget** (si pas fait en Phase 0).
- **Modules différés (rangs 7-8)** : mutations de lot / état daté, conseil syndical (art.21-22), GED/extranet ALUR avancé, communication, maintenance, RGPD, DTG/PPT.
- **Dette transverse** : `any` résiduels, `console.*`, hooks monolithiques (`useAgData`, `useBudget`…), modules encore en `*_USE_SUPABASE=false`.

## Chemin critique (résumé visuel)

```
Phase 0 (finance finie)
        │
        ▼
Phase 1 (RLS + isolation)  ◄── MUR démo→prod, non négociable
        │
        ▼
Phase 2 (validation + CI + headers)
        │
        ▼
Phase 3 (E2E navigateur + déploiement staging)
        │
        ▼
Phase 4 (syndics pilotes)  ──►  BÊTA GESTIONNAIRE
        │
        ▼
Bêta 2 : portail copropriétaire + paiement en ligne
```
