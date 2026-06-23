# Plan de travaux parallélisables — dispatch multi-sessions

> But : pouvoir ouvrir plusieurs sessions (toi + Claude) **sans collision**. Pour chaque tâche : où ça touche, si ça a besoin de la **DB locale** (ressource partagée), si ça a besoin d'une **décision de ta part**, l'effort, et la dépendance.
>
> **Isolation** : chaque session de code = un **worktree** distinct, branche depuis `finance-drift-rebranchement` (PAS `main`, en retard de la PR #2).
> `git worktree add ..\CoProFlex-<nom> -b <branche> finance-drift-rebranchement`
>
> **Règle DB** : une seule base docker locale (`supabase_db_Co-Pro-Flex`). Deux sessions qui font `db reset` / appliquent des migrations **en même temps** = collision. Les sessions « zéro DB » (config, doc, UI pure) tournent en parallèle sans souci.

## Légende
🟢 sans décision · 🔵 besoin décision USER · 💾 utilise la DB locale · 🚫💾 zéro DB · ⚠️ zone de conflit

---

## Lane A — Décisions (zéro code, débloque tout) 🔵 🚫💾
À trancher (lecture `RESULTATS_FINANCE_2026-06-10.md` + `ROADMAP_FINALISATION_BETA.md`) :
1. **Périmètre bêta** : gestionnaire-only d'abord ? (reco oui)
2. **createCall / appel exceptionnel** : implémenter `post_exceptional_call_for_funds` (avec toi pour les écritures) **ou** masquer le wizard ?
3. **Feu vert rebranch fournisseurs** (Lane B).
4. **Cible cloud bêta** : redéployer le schéma propre 0001→0043 sur un projet Supabase neuf ?
→ **Plus haute valeur, zéro risque.** À faire en premier.

## Lane B — Rebranch fournisseurs 🟢 💾 ⚠️`src/lib/finance/api.ts`
- `listSuppliers` : `.from('suppliers')` → `.from('tiers').eq('is_supplier',true).eq('is_active',true).order('name')`.
- `createSupplierInvoiceDirect` + `CreateSupplierInvoicePayload` : `supplier_id` → `tiers_id`.
- Adapter le type `Supplier` aux colonnes `tiers`.
- Test : créer une facture fournisseur → vérifier GL (D6xx/C401, tiers_id lié).
- **Conflit** : touche `src/lib/finance/api.ts`. Ne PAS lancer en même temps que toute autre session qui modifie ce fichier. Compatible avec mes gates (je ne touche pas `src/`).
- Effort `Max`. Spec détaillée : `RESULTATS_FINANCE_2026-06-10.md` §3.

## Lane C — Infra Phase 2 🟢 🚫💾 (la plus isolée)
- `.github/workflows/ci.yml` : lance `tsc --noEmit` + `vitest run` + (optionnel) `db:test` sur runner avec Postgres.
- Headers sécu (`next.config` : CSP/HSTS), `vercel.json`.
- Retirer le piège mock `/finance/factures/new` (setTimeout qui ne persiste rien).
- **Conflit** : aucun (config/CI). **Zéro DB.** Parfait pour une session parallèle pendant que la DB est occupée.
- Effort `Max`.

## Lane D — Régénération des types Supabase 🟢 💾 ⚠️`src/types/supabase.ts`
- Régénérer `types/supabase.ts` depuis la base (supprime `bank_transfer` périmé, resync vues/RPC 0036-0043).
- **Conflit** : gros fichier généré ; **chevauche Lane B** (qui touche aussi les types fournisseurs). Faire APRÈS Lane B, ou la session B s'en charge en fin de course.
- Effort `Max`.

## Lane E — Finance haut de boucle (CE QUE JE FAIS CETTE NUIT) 🟢 💾 ⚠️`supabase/tests/`
- Gate E2E **clôture / à-nouveau / affectation du résultat** (`close_period`→`open_next_period`→`regularize_period`).
- **Zone Claude** : `supabase/tests/`, `scripts/`. Ne lance pas une autre session sur ces fichiers.

## Lane F — Sweep références mortes hors finance 🟢 💾 (diagnostic)
- Même méthode que pour la finance : grep `.from`/`.rpc` dans `src/lib/{ag,maintenance,documents,communication,...}` ↔ vues/fonctions réelles → liste des drifts.
- Produit un doc, ne modifie rien. Sans risque, parallélisable.
- Effort `Max`.

## Lane G — Sécurité / RLS (Phase 1, PRÉREQUIS BÊTA) 🔵 💾 ⚠️ migrations
- Activer la RLS (~71 tables, policies déjà écrites) + test d'étanchéité multi-tenant.
- `owner_id` codé en dur → `auth.uid()` (6 fichiers).
- **Conflit** : migrations + DB → **ne PAS paralléliser avec une autre session DB**. Enjeu fuite de données → **revue adversariale multi-agents (`ultracode`) recommandée.**
- **Bloqué par** Lane A décision #1 (périmètre) + #4 (cible cloud).

---

## Combinaisons parallèles SANS collision (exemples)
- **Toi (Lane A décisions) + Claude (Lane E clôture)** → idéal si tu dors.
- **Session 1 (Lane C infra, zéro DB) + Claude (Lane E, DB)** → aucune collision fichiers ni DB.
- **À ÉVITER en simultané** : Lane B + Lane D (toutes deux dans `src/types`/`finance`), et toute paire de sessions faisant des migrations/`db reset` (Lane G + Lane E pendant un reset).

## Ordre conseillé
A (décisions) → puis en parallèle { B fournisseurs · C infra · E clôture[Claude] } → D types → G sécurité (avant bêta).
