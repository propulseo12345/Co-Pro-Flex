# SYNTHÈSE DE CLÔTURE — Audit logique métier CoProFlex (8 rangs)

> Date : 2026-05-31 — Audit **lecture seule** terminé sur les 8 rangs. Projet Supabase `iyfesbjnkpynmwlsmxnp`.
> Détail par entité : `ENTITIES_MAP/01..08`. Backlog consolidé : `PROGRESS_audit-coherence.md`.

---

## Cause racine unique

**Les ponts d'alimentation du grand livre sont cassés.** Le symptôme déclencheur (budget consommé 0 € vs 5 430 €, trésorerie incohérente) n'est pas un bug d'affichage : le grand livre — source unique de vérité légale — n'est **quasiment jamais alimenté**. Les fonctions qui devraient créer les écritures (`create_supplier_invoice`, `pay_supplier_invoice`, `record_payment` au rang 4 ; la chaîne OS→facture→écriture au rang 8) soit écrivent dans des **colonnes inexistantes**, soit **ne sont jamais appelées**. Au rang 6, le **pilier AG → données copro ne se déclenche pas**. Cascade : `source_id` NULL à 100 %, réalisé à 0, soldes par lot faux, état daté faux, dashboard incohérent.

---

## Les 4 thèmes récurrents

1. **Ponts cassés / auto-propagation non opérationnelle** (dominant) — rang 4 (edge functions comptables), rang 6 (`close_ag` n'appelle pas `activate_ag_decisions` ; activation côté front), rang 8 (OS→facture→carnet à 0 %). *Sans lui : budget voté jamais actif, appels non générés, réalisé toujours nul.*
2. **Source unique non respectée** — le même chiffre calculé différemment selon l'écran : dashboard (vue vs fonction), impayés (solde 450 vs appels échus), état daté (appels−paiements au lieu du ledger), notifications (3 systèmes). Correction partout identique : **dériver du grand livre / d'une source canonique**.
3. **Intégrité & conformité** — `lot_id` non garanti sur les écritures 450 (6 orphelines), clés non versionnées (réécriture rétroactive d'exercices clos), éligibilité CS non contrôlée (art. 22 : un admin siège au CS), majorité art. 24 sur présents au lieu des exprimés, RLS désactivé sur 18 tables communication.
4. **Rétention / extranet / RGPD documentaire** (rang 8) — conservation 10 ans déclarée mais archivage non automatisé, extranet ALUR non implémenté, RGPD messagerie absent. *Obligation légale, non bloquant technique.*

---

## Décompte des P0 par rang

| Rang | Entité | P0 | Note |
|---|---|---|---|
| 1-2 | Grand livre / Dashboard | ~5 | bugs vues/clés JSON, `CURRENT_DATE`, casse `critical`, redondance |
| 3 | Budget | — | décisions tranchées ; dépend du ledger |
| 4 | Appels/paiements | **5** | 3 edge functions + `source_id` + `lot_accounts` 411 + ventilation 450 |
| 5 | Clés/tantièmes | **2** | clé ALUR orpheline, absence de versioning |
| 6 | AG (pilier) | **3** | scrutin non calculé sur le vrai chemin, auto-propagation non déclenchée, non atomique |
| 7 | Mutations/état daté | **2** | prorata absent, snapshot non verrouillé |
| 8 | GED/comm/maintenance | **~5** | chaîne OS→facture→écriture→carnet à 0 % (mêmes ponts que rang 4). *RLS comm désactivé = hors périmètre (dev volontaire).* |

**Sain, à préserver (ne pas refondre) :** le cœur juridique des **majorités** (art. 25/26/unanimité) et la **GED** (bucket privé, RLS confidentialité, rétention, versioning).

---

## Ordre recommandé du plan de correction (du fondement vers l'aval)

1. **SOCLE LEDGER (rang 4 P0)** — réparer/réécrire `create_supplier_invoice`, `pay_supplier_invoice`, `record_payment` en routant TOUT par `create_ledger_transaction`/`post_ledger_transaction` ; renseigner `source_id` ; migrer `lot_accounts` 411→450 + sous-comptes ; ventiler le 450 par lot. *Fondement : tout réalisé en dépend.*
2. **PILIER AUTO-PROPAGATION (rang 6 P0)** — orchestrateur serveur unique, transactionnel et idempotent (calcul scrutin → prepare → [revue/correction gestionnaire] → **notifier PV** → activate) ; câbler les RPC dédiées (budget, ALUR, conseil) ; corriger art. 24 (exprimés). *Décision actée : activation à la notification du PV, avec fenêtre de correction.*
3. **CLÉS & VENTILATION (rang 5 P0/P1)** — catégoriser (générale/spéciale/ALUR), versionner, router `budget_type→450-x` ; fiabiliser la clé ALUR. *Prérequis de la ventilation des appels et de l'état daté.*
4. **SOURCE UNIQUE DASHBOARD/IMPAYÉS (rangs 1-2-3)** — une seule implémentation par KPI, alignée ledger ; corriger les 6 clés JSON, `CURRENT_DATE`→période active, casse `critical`.
5. **AVAL PROBANT (rang 7)** — rebrancher l'état daté sur le grand livre à la date de signature, implémenter le prorata, verrouiller les snapshots, garder l'éligibilité CS (art. 22).
6. **CONFORMITÉ & CÂBLAGE (rang 8 + transverse)** — câbler OS→facture→carnet (mêmes ponts que rang 4), planifier extranet ALUR / rétention / RGPD. *(RLS communication = traité au durcissement go-live avec tout le RLS, hors plan de cohérence.)*
7. **CLÔTURE 408/486 & RÉGULARISATIONS** — une fois le ledger alimenté : assistant de clôture (FNP semi-auto) + régularisation de fin d'exercice.

---

## Méthode (à conserver pour la correction)

L'audit a produit 8 fiches traçant **chaque dette à une preuve en base**, avec **vérification adversariale** (faux positifs écartés : enums bien typés, FK existantes, dossiers peuplés, rétention fonctionnelle, `calculate_resolution_result` correcte…). Le passage à la correction doit conserver cette rigueur : **chaque P0 corrigé doit être prouvé par un test reproduisant le flux réel** (une facture fournisseur qui apparaît bien au grand livre ; un budget voté qui devient actif et génère des appels).
