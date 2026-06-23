# 🛠️ Plan d'action — Résolution des problèmes de l'audit

> Issu de `AUDIT_COPROFLEX.md` (2026-06-01). Objectif : assainir CoProFlex jusqu'à un état sain et sécurisé, **puis** ouvrir le portail copropriétaire.
> **Insight clé** : le LOT 2 (auth + RLS) **est** la Phase 0 du portail copropriétaire → travail mutualisé.
> **Architecture portail décidée** : Option A (même app Next.js, route group `(coproprietaire)`, backend partagé, cloisonnement rôle + RLS). Séquencement portail : 0 → 1 (consultation) → 2 (AG) → 4 (communication) → 3 (paiement).

**Principe de séquencement** : bloquant & peu risqué d'abord (flux cassés) → prérequis lourd (auth/RLS) → cohérence métier (finance) → nettoyage (mocks, dette).

---

## 🔴 LOT 1 — Débloquer les flux cassés (quick wins) · ~2-3 j

| # | Tâche | Fichier(s) | Terminé quand |
|---|---|---|---|
| 1.1 | Ajouter `createCoproprietaire()` + brancher le formulaire (#13) | `lib/owners/api.ts`, modale création | Création copropriétaire OK depuis l'UI |
| 1.2 | Brancher `factures/new` sur `create_supplier_invoice` (retirer le `setTimeout`) | `features/finance/factures-new/hooks/useNewFacturePage.ts:69` | Une facture créée génère l'écriture au ledger |
| 1.3 | Recréer `ensure_dev_membership()` en migration (appelée 9× mais absente) | nouvelle migration `supabase/migrations/` | Le portefeuille charge en local sans erreur RPC |
| 1.4 | Fix onboarding step 4 (`asset` vs `bank`) + remontée erreur step 2 (#8) | `Step4Comptes.tsx`, `Step2Coproprietaires.tsx` | Comptes affichés à la reprise ; échec ajout copro affiche un message |
| 1.5 | `handleSaveEdit` ordre de service qui ne persiste pas | `useServiceOrderDetailPage.ts:243` | L'édition d'un OS est réellement enregistrée |

---

## 🟠 LOT 2 — Auth réelle + RLS *(= Phase 0 du portail)* · ~5-7 j

| # | Tâche | Détail | Terminé quand |
|---|---|---|---|
| 2.1 | Auth Supabase réelle | remplacer les 6 `owner_id` hardcodés (`f76855bb…`) par `auth.uid()`/session | Chaque utilisateur voit SES données |
| 2.2 | Sortir les comptes démo (`password123`) | → seed SQL / `.env` | Aucun identifiant en clair dans le source |
| 2.3 | Réactiver la RLS progressivement (1 domaine/jour) | finance → AG → GED → communication. Policies déjà écrites (68) | `get_advisors` ne signale plus de table critique exposée |
| 2.4 | Durcir les advisors | `SET search_path` (35 fn), revoir `SECURITY DEFINER` par `anon`, protection mots de passe fuités | Advisors au vert (hors faux positifs) |
| 2.5 | Système d'invitation | table `invitations` + flux syndic→email→activation | Un syndic peut inviter un utilisateur |

> Ordre interne : 2.1/2.2 avant 2.3 (sinon la RLS casse tout car le code utilise un faux user). Tester chaque domaine sur la boucle d'or `22222222`.

---

## 🟠 LOT 3 — Cohérence financière : finir la boucle · ~4-6 j

| # | Tâche | Terminé quand |
|---|---|---|
| 3.1 | Orchestrateur AG (WP2) : `close_ag → prepare → activate` | Une AG votée active budget + appels auto |
| 3.2 | ALUR : affectation travaux `105 → 705` | Fonds ALUR ventilés quand travaux votés |
| 3.3 | Annexes comptables 2-5 en PDF | Approbation des comptes en AG possible |
| 3.4 | Rapprochement bancaire : auto-match | Mouvements GoCardless lettrés semi-auto |

**Jalon finance** : boucle AG → budget → appels → paiement → ledger testable de bout en bout sur `22222222`.

---

## 🟡 LOT 4 — Mocks → Supabase · ~3-5 j

| # | Tâche | Terminé quand |
|---|---|---|
| 4.1 | Litiges : créer `legal_proceedings` + hook + page (template `dossiers`) | `/contentieux/litiges` lit de vraies données |
| 4.2 | Conformité : migrer DPE + PPT en base (Factur-X → sept. 2026) | DPE/PPT persistés, plus de `MOCK_` |
| 4.3 | Rôles conseil syndical assignables (#14) + converger les 2 schémas | Rôle CS assignable depuis `/coproprietaires` |
| 4.4 | Décider marketplace prestataires CoproFlex (mock assumé ou réel) | Statut tranché et documenté |

---

## 🟡 LOT 5 — Dette & hygiène (fil de l'eau)
Doublons EN/FR (démêler CSS/composants ou garder redirections), `console.log` (259) → logger, résorber les `any` (104) et `eslint-disable` (122), **ESLint en CI**, headers de sécurité (CSP) dans `next.config.ts`.

> **Lot optionnel — Espace cabinet** : 6 placeholders (`facturation`, `reporting`, `agenda`, `modeles`, `parametres-cabinet`, `prestataires`) + notion de collaborateurs/cabinet. À planifier si go-live multi-gestionnaires.

---

## 📍 Jalons & lien portail

```
LOT 1 ──► Jalon A : app cliquable, zéro flux cassé
LOT 2 ──► Jalon B : multi-utilisateur sécurisé   ✅ = Phase 0 du portail FAITE
LOT 3 ──► Jalon C : finance cohérente & testable
LOT 4/5 ─► fil de l'eau
                    └──► 🏢 Portail copropriétaire (Phase 1 consultation, puis 2 → 4 → 3)
```

**Estimation** : ~2,5 à 3,5 semaines pour LOT 1→3, puis portail.

---

## Suivi d'avancement

- [ ] LOT 1.1 — `createCoproprietaire`
- [ ] LOT 1.2 — `factures/new` → edge function
- [ ] LOT 1.3 — `ensure_dev_membership` migration
- [ ] LOT 1.4 — onboarding step 4 + step 2
- [ ] LOT 1.5 — OS `handleSaveEdit`
- [ ] LOT 2 — auth + RLS (Phase 0 portail)
- [ ] LOT 3 — cohérence financière
- [ ] LOT 4 — mocks → Supabase
- [ ] LOT 5 — dette & hygiène
