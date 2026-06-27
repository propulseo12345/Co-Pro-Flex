# Registre des SUPERSEDES — v2

> **But** : qu'aucun agent de build (ni humain) ne s'appuie sur un **modèle MORT**. Avant de coder depuis un blueprint/spec, vérifier ici si le point a été remplacé.
> **Source de vérité des décisions** = `REFONTE_DECISIONS_2026-06-23.md`. Ce fichier ne fait que **cartographier les périmés**. Tenu à jour au fil des décisions (règle de maintenance v2).

## A. Documents entièrement périmés (archivés)

| Document | Pourquoi périmé | Remplacé par | Sort |
|---|---|---|---|
| `COHERENCE_PLAN_V2_2026-06-26.md` | Instantané écrit AVANT le grilling du 26/06 ; présente les 5 arbitrages comme « ouverts » | grilling 2026-06-26 (ARB-1..5 + C15-5 tranchés) | → `.planning/_archive/` |
| `PLAN_MAITRE_VUE_COPROPRIETAIRE.md` | Stack Next.js + « RLS à réactiver » | C15 (portail) + stack v2 TanStack + RLS FORCE native | → `.planning/_archive/` (design = inspiration) |

## B. Texte corrigé à la source

| Doc | Correction |
|---|---|
| `docs/claude/business-rules.md:66` | « `pv_*` posés par UPDATE front » → **réécrit** : tous les statuts AG via `set_ag_status` (C17-1). |

## C. Points périmés DANS des docs ENCORE UTILES (blueprints/spec) — corriger **JIT au palier concerné**

> Ces docs restent la **référence de construction** (justes à ~90 %). On ne les archive pas ; on corrige le point fautif juste avant de bâtir le palier qui l'utilise.

| Doc | Point périmé | Décision à jour |
|---|---|---|
| `db-cible/01-copros-lots-personnes` | super-admin = valeur d'enum `membership_role` | **C16-4** : table dédiée `platform_admins` hors-tenant (⚠️ générer depuis ce blueprint **recréerait la faille**) |
| `db-cible/01` | `lots.tantiemes_*` (colonnes) | **D9** : source unique = `repartition_key_lines.weight` |
| `db-cible/02` + `03` | multi-512 / `p_bank_account_id` obligatoire | **ARB-2** : deux poches (512 courant + 502 ALUR), virement interne 502→512 |
| `db-cible/02` + `03` | `validate_budget_expense` poste D6xx/C401 (double-posting) | **EXP-7c** : réalisé = classe 6 du GL ; `budget_expenses` = engagé (poste retiré) |
| `db-cible/02` (carte fonds) | `512100` (Face 2) | fantôme jamais créé → Face 2 = **502 seul** |
| `db-cible/05-mutations-etat-date` | 6 statuts mutation ; encaissement `source_type=mutation` | **C12** : 7 statuts (`sent_to_notary`) ; settle = wrapper sur `post_owner_payment` |
| `db-cible/08-communication` | provider e-mail **Resend** | **C11-P2** : Brevo + couple neutre `provider`+`provider_message_id` |
| `spec/ENTITIES_MAP/08` | GED 4 niveaux de confidentialité / `can_access_document` | **C14** : visibilité 3 niveaux + `user_can_view_document` (4e branche cloisonnement) |
| `REFONTE_DECISIONS` (stratégie PDF, « à trancher ») | doublon « à trancher » | **AM1/TECH-1** : HTML→PDF via Chrome headless (tranché) |

## D. Mémoires auto à corriger

| Mémoire | Correction |
|---|---|
| `coproflex_cloud_live` (« RLS ON+FORCE ») | **FAUX** : FORCE 5/87 ; escalade `platform_admin` encore active sur le live. À patcher au **pré-Palier 0** (cf. `BILAN_CADRAGE_2026-06-26.md` §2c). |
