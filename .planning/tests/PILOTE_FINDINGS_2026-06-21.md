# Pilote Playwright — incohérences relevées (2026-06-21)

**Contexte** : app CoProFlex servie sur **localhost:3100** (le port 3000 est occupé par une AUTRE app « TropPayé » — penser à relancer CoProFlex sur 3100 : `npm run dev -- -p 3100`). Login démo `lyes.triki@coproflex.fr` (1-clic). Copros testées : **Résidence Martin** (`c0edd2b9-…`, onboarding_step=3) et **Residence Paris Ivry** (`7e17ea99-…`, onboarding_step=3).

## ✅ Confirmé OK (correctif étape 3 validé en client réel)
Page **Lots & Répartition** de Résidence Martin : fusion réussie — **UNE seule colonne « Tantièmes » éditable** (= clé générale), **plus de doublon** « Charges générales », 2 colonnes de clés spéciales (Batiment A/B), **total tantièmes = 1 000**, KPI « Lots 7 / Tantièmes généraux 1 000 / Clés spéciales 2 ». Le rendu correspond à l'attendu.

## ⚠️ Incohérences à corriger (par priorité)

1. **[P1] Copros EN ONBOARDING affichées dans l'espace géré.** Résidence Martin et Paris Ivry (onboarding_step=3, **0 période comptable**) apparaissent dans **Portefeuille** ET **Dashboard**. Du point de vue syndic, une copro encore en configuration ne devrait pas polluer le portefeuille « live » (ou être clairement marquée « en configuration / brouillon »).

2. **[P1] Dashboard : 3× erreur HTTP 406** sur `accounting_periods?…&status=eq.open&limit=1` (copro c0edd2b9). Cause : requête en `.single()` (négociation objet) qui échoue quand il n'y a **aucune période ouverte**. Correctif : `.maybeSingle()` + gérer le cas « pas de période » (cf. famille bugs cascade / erreurs avalées).

3. **[P2] Portefeuille : compteurs faux.** En-tête « Vue consolidée de vos 2 copropriétés · **0 lots** » et cartes « 0 lots / 0 / solde 0,00€ » alors que Martin = 7 lots et Ivry = 6 lots. Probablement lié au point 1 (vue d'agrégat qui exclut/ignore les copros en onboarding).

4. **[P2] Clé « Batiment A » affichée « 3/7 lots » (orange, incomplète).** En base, les 3 clés sont `coverage_mode='all_lots'`. Pour une clé de **bâtiment** (charges spéciales art.10 = uniquement les lots concernés), ce devrait être **« certains lots » (subset)** → « 3/3 ✓ ». Le correctif récent SUPPORTE la conversion (Éditer la clé → Portée → « Certains lots ») mais les clés existantes ne sont pas converties. Piste : auto-suggérer le mode subset quand une clé all_lots n'a de poids que sur une partie des lots.

## Prochaine étape (figer le pilote puis dérouler)
- **Infra Playwright** : helper `login` pointant sur `lyes.triki@coproflex.fr` (le défaut actuel des specs = `admin@coproflex.fr` = inexistant) + **charger `.env.local`** dans `playwright.config.ts` (pour la clé service-role des assertions base) + `baseURL` overridable (port 3100).
- **Spec pilote** lots/tantièmes (lecture seule sur Résidence Martin) = ce qu'on vient de faire à la main, figé en `@playwright/test`.
- Puis dérouler les specs par domaine (catalogue dans `.planning/tests/TC_*.md`, 327 cas), **prisme expert copro** + **assertions base** à chaque fois, **alerte immédiate** sur incohérence.
