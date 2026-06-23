# Audit sécurité + fonctionnel — 2026-06-12 (nuit, run autonome)

> Méthode : workflow ultra 5 dimensions (sécu DB, sécu API, deps, fonctionnel statique, manquants
> produit), 50 agents, chaque trouvaille contre-vérifiée par 1-2 sceptiques (reproduction empirique
> psql/grep) + **parcours navigateur réel** des modules (gestionnaire démo, localhost:3010).
> 28 confirmées / 6 réfutées. Mandat Lyes : GO ultra, auto-merge si vert, navigateur autorisé.

## 🔴 SÉCURITÉ — à corriger AVANT toute exposition (lot correctif immédiat)

| # | Sév. | Trou | Fichier | Correctif |
|---|------|------|---------|-----------|
| S1 | HIGH | `/api/mail/inbound` : webhook SANS signature ni auth → injection anonyme de mails (phishing) dans la boîte copro, insert en service_role | `src/app/api/mail/inbound/route.ts:10` | Vérif signature svix (pattern `email_webhook`) AVANT insert, 401 sinon, secret `RESEND_INBOUND_SECRET` obligatoire |
| S2 | HIGH | `/api/mail/send` : authentifié mais AUCUNE autorisation sur coproId, destinataires libres, envoi AVANT l'insert RLS → relais spam/phishing du domaine | `src/app/api/mail/send/route.ts:24` | Vérifier membership/gestion de la copro AVANT envoi ; restreindre destinataires |
| S3 | HIGH | `/api/banking/*` (4 routes) : zéro auth → IDOR données bancaires (IBAN/solde via requisitionId), DoS quota GoCardless, redirectUrl libre | `src/app/api/banking/*` | `getUser` + contrôle d'appartenance copro sur chaque route |
| S4 | HIGH | Middleware : **denylist** de préfixes incomplète — `/conformite, /conseil-syndical, /contentieux, /dossiers, /legal, /sales, /agenda, /facturation, /modeles, /onboarding, /parametres-cabinet, /prestataires, /reporting` chargés par un anonyme (layouts sans garde) | `src/lib/supabase/middleware.ts:41` | Passer en **allowlist** (tout protégé sauf marketing//auth/assets) + garde getUser dans les 2 layouts |
| S5 | HIGH | Bucket Storage `ged` créé par PERSONNE (ni migration ni config) → en prod : soit GED cassée, soit bucket public cliqué à la main = tous les PV/factures de toutes les copros publics ; la policy legacy de référence a le MAUVAIS index de segment (`[2]` vs chemin actuel `[1]`) | migrations (absent) | Migration 0048 : bucket privé + 3 policies segment `[1]::uuid` + `user_has_copro_access`/`manager` + config.toml |
| S6 | MED | Edge `run_payment_reminders` : service_role dès que la clé existe (toujours) sans vérifier appelant↔copro → n'importe qui avec l'anon key publique déclenche des relances cross-tenant | `supabase/functions/run_payment_reminders/index.ts:178` | Chemin cron (secret en-tête) ≠ chemin manuel (contexte caller + appartenance) |
| S7 | MED | Edge `email_webhook` : le `return 401` sur signature invalide est COMMENTÉ ; pas de blocs `[functions.*]` dans config.toml (posture verify_jwt non figée) | `supabase/functions/email_webhook/index.ts:110-115` | Décommenter le 401, secret obligatoire, figer verify_jwt dans config.toml |
| S8 | LOW | `lib/supabase/admin.ts` sans `import 'server-only'` (sain aujourd'hui, fragile) ; `VERCEL_ENV.md` committe l'anon key prod (publique par design — réfuté comme fuite, gardé en hygiène) | admin.ts | `import 'server-only'` + placeholders dans le doc |

## 🟠 DÉPENDANCES (lot dédié)

- **`npm audit fix` simple** (prouvé sans saut majeur au dry-run) : ws, resend→6.12.4 (purge svix/uuid vulnérables), dompurify (8 XSS), jspdf-autotable, + chaînes dev. → à faire tout de suite.
- **next 16.0.7 épinglé EXACT** → 24 advisories (8 HIGH dont DoS RSC applicables) ; fix = 16.2.9 (même majeure) mais le pin exact bloque audit fix → bump manuel `next` + `eslint-config-next` + react 19.2.7, puis suite complète. Corrige aussi postcss interne.
- **jspdf 3.0.4 → 4.2.1 (MAJEUR)** : 2 critical/6 high ; exploitabilité calibrée faible (client-only, API vulnérables non utilisées) → bump planifié avec revalidation des ~25 générateurs PDF, PAS de `--force`.
- **@supabase/ssr 0.8.0 → 0.12.0** : cœur session SSR, 4 mineures de retard → lot dédié avec test login/refresh/logout.
- pdfjs-dist : prendre wanted 5.7.284 ; veille 6.x.

## 🟡 FONCTIONNEL CASSÉ — constats runtime navigateur (2026-06-12)

- ✅ **Fonctionnent sur données réelles** : Portefeuille (KPIs justes = gate), Dashboard copro, Factures (kanban + avoirs), **Maintenance** (création prestataire prouvée E2E — chantier 0047 validé), Communication (hub), Contentieux/Impayés (vrai débiteur, 131 j).
- ❌ **AG** : page principale en **spinner infini SILENCIEUX** (v_ag_overview absente, erreur avalée) — PAS une « annexe » : la liste des AG est morte.
- ❌ **Copropriétaires** : spinner infini silencieux ALORS QUE `v_coproprietaires_overview` existe → mécanisme différent à débugger (systematic-debugging).
- ❌ **GED** : v_documents_stats / v_documents_with_folder / v_folders_with_counts 404 → module vide.
- ❌ **Mur + conversations** : v_wall_feed / v_conversations_overview absentes (le plan disait « fonctionnent » — FAUX, requalifié).
- ⚠️ Transverse : `useSalesList` (v_mutations_overview 404) fetch + erreur sur TOUTES les pages (monté trop haut) ; 401 transitoire v_dashboard_kpis au 1er rendu (course de session) ; copro affichée « HARNESS bd992c5d (…) » (nom de seed) ; « 0 lots » portefeuille (champ en dur).

## 🟡 CASSÉ/TROMPEUR — statique confirmé

- **TravauxDetailModal** : `.eq('budget_id')` sur colonne FANTÔME de `documents` (cast + catch silencieux) → section Documents toujours vide. *Drift de COLONNE, invisible au diff d'objets.*
- **Faux succès « Budget transformé en appels de fonds ! »** (useBudget) : alert de succès, AUCUNE génération. Pire que bouton mort.
- **Impayés ventes/contentieux : fallback MOCK silencieux** (liste vide ou erreur → débiteurs fictifs affichés comme réels). À purger avant bêta.
- **Exports comptables** : boutons PDF/Excel = callbacks vides ; aucune lib tableur. Feature requise au 1er client (art. 18-1) → J5.
- **`src/lib/maintenance/api.ts`** : chemin d'écriture legacy 100 % drifté (orphelin : seuls 2 steps onboarding non importés) → supprimer ou réécrire AVANT J5-F8.
- Faux boutons Export PDF budget (×4) ; sélecteur d'échéancier du wizard validation budget = cosmétique (fini en commentaire texte).
- Casts d'écriture restants : useContractsPage (`as never` + faux toast succès au catch), useProviderDetailPage (copro_id:''), useAgDashboardPage (client détypé).

## 🟠 MANQUANT (absent du plan — ajouts à acter)

- **Rapprochement bancaire : voie d'écriture MORTE** — edge functions `import_bank_movement` / `reconcile_bank_movement` n'existent pas (lecture OK). Module inutilisable. → J2-bis (HIGH).
- **Relances « automatiques » J+15/30/60/90 : aucun déclencheur** — moteur complet (tables+RPC+edge+UI) mais ni pg_cron ni Vercel cron ; l'edge exige un copro_id unitaire. Promesse produit non tenue. → avant J7 (HIGH).
- **Notifications in-app = localStorage** (1 seul producteur) — cloche à retirer ou table à créer. → arbitrage.
- Recherche globale = routes statiques only (pas d'entités). → J9/J10.

## ✅ Réfutés par les sceptiques (ne PAS traiter)
seed.sql danger cloud (gardé par `supabase db push` qui ne rejoue pas seed en prod + G2) ; REVOKE anon défense-en-profondeur (RLS + 0 policy anon suffisent, pattern uniforme) ; post_budget_call_for_funds idempotence (protégée par garde applicative existante) ; VERCEL_ENV.md anon key (publique par design) ; journal recouvrement + alertes contrats (déjà couverts/par design).

## Plan d'exécution autonomie (ordre)
1. **PR sécu** : S1→S8 + gate/preuves. ✅→ auto-merge si vert.
2. **PR deps** : `npm audit fix` + bump next/eslint-config-next/react. (jspdf 4 + ssr 0.12 = lots séparés parqués.)
3. **Plan maître** : requalifications (2.2/2.5) + ajouts J2-bis (banque écriture, cron relances, TravauxModal, mock impayés, exports→J5, notifications→arbitrage).
4. **J2-bis lot 1** : v_ag_overview + v_wall_feed + v_conversations_overview (écrans principaux) + debug spinner copropriétaires + useSalesList descendu + retours revue 0047 (rename unpaid_lots_count, badges OS).
