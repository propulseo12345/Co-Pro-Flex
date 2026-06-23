# 🌙 RAPPORT DE RÉVEIL — Nuit autonome du 2026-06-15

## TL;DR (lis ça d'abord)
- Branche **`nuit-2026-06-15`** (depuis `j2bis-nettoyage-front` + E4). **NON poussée, RIEN appliqué sur le live** (Option A respectée).
- **J2-bis est SOLDÉ** (toutes les tranches restantes T1→T9) **+ fondations J5 livrées** (charge_nature, override, art.24).
- **Tout est prouvé** : `npm run db:test` = **27/27 gates bloquantes vertes**, `tsc --noEmit` = **0 erreur**, rejeu complet 0001→0068 reproductible (seul `0055/pg_cron` échoue = limitation structurelle pré-existante, smoke `audit_finance_integrity=0`).
- **15 commits** de code + SQL, chacun avec sa gate. Revue adversariale multi-agents sur chaque tranche.
- **3 arbitrages t'attendent** (section ⚠️) avant de continuer J5.

---

## ✅ Ce qui a été livré (commits, dans l'ordre)

| Commit | Tranche | Contenu | Preuve |
|--------|---------|---------|--------|
| `08de512` | E4 | Intégration `operation_id` niveau ligne (0060) par checkout fichiers (pas merge) | gate_e4 verte |
| `1b91d7c` | **T1 Mur** | Double-comptage likes/commentaires supprimé (refetch ciblé `v_wall_feed`) | tsc 0 |
| `5ecfe2d` | **T2 Conseil** | Vue `v_council_members_detail` (0061) — noms/emails de l'onglet Membres résolus | gate 0061 |
| `5699744` | **T4 Jalons** | RPC `get/save_ag_milestone` (0062) + colonne `milestone_key` corrigée | gate 0062 |
| `5c2f554` | **T5 GED** | Sortie des mocks document-linking/versioning → Supabase (`linking.ts`) ; bug pré-existant `ENTITY_TYPE_FROM_LEGACY` corrigé | tsc 0 |
| `a33da72` | **T7 Mutations** | `buyer_draft` jsonb + notaire→tiers (0064) — bouton « Nouvelle mutation » réparé | gate 0064 |
| `fc905df` | **T6 AG envoi** | Choix d'envoi dans `ag_meetings.envoi_choices` (0063), **séparés des traces légales** | gate 0063 |
| `f73efed` | **T3 Maintenance** | Suppression des mocks morts du carnet (interventions/budget/providers-domain) | tsc 0 |
| `4d49530` | **T8 AG pouvoirs** | RPC pouvoirs (0065) sur `ag_attendance` + **garde art.22 serveur** | gate 0065 |
| `2f8fa72` | **T9 Banque** | Rapprochement bancaire : import + reconcile **pointage pur** (0066 + 2 edge functions) | gate 0066 |
| `4090252` | **T10 charge_nature** | 661/662/704→travaux (0067), **711 reste courant** | gate 0067 + e2e |
| `3cbe681` | **T11 set_account** | RPC `set_account_charge_nature` (0068) — override classification | gate 0068 |
| `556416a` | **C6 art.24** | Libellés/seuils de la feuille de présence corrigés (moteur déjà conforme) | tsc 0 |

> 2 cascades graves attrapées par la revue adversariale et corrigées avant commit :
> 1. **T6** — la 1re version purgeait les **preuves d'envoi recommandé** (perte du délai 21 j art.13) → réécrite (stockage séparé).
> 2. **T9** — risque de **double encaissement** (re-poster D512/C450 au pointage) → reconcile = pointage pur, **zéro écriture grand livre prouvée** (`ledger_entries` inchangé avant/après).

---

## 📦 Migrations de la nuit (à appliquer sur le live quand TU décides)
`0060` (E4, intégré) · `0061` conseil · `0062` jalons · `0063` envoi · `0064` mutations · `0065` pouvoirs · `0066` banque · `0067` charge_nature · `0068` set_account.
+ 2 edge functions : `supabase/functions/import_bank_movement`, `supabase/functions/reconcile_bank_movement`.

**Pour appliquer** (toi, quand prêt) : revue de la branche → `gh auth switch -u lyestriki-29` → push → CI → application délibérée. Je n'ai rien poussé ni touché le live.

---

## ⚠️ ARBITRAGES PRIORITAIRES (à trancher ENSEMBLE au réveil)

1. **Paiements C2/C3 (+ C4/B7)** — tu avais cliqué « je tranche maintenant » mais tu es parti avant. Par sécurité je **n'ai PAS codé C2/C3** :
   - **C3** (reprise auto du trop-perçu) **contredit ta décision verrouillée B7** (« le trop-perçu appartient au copro, ne pas le ré-imputer auto »). Conflit interne master plan ↔ DECISIONS.md à résoudre.
   - **C2** (cloisonnement par nature par défaut) dépend de **C4** resté ouvert (« cloisonnement strict partout ? »).
   - → décide la position d'expert, je code derrière (avec revue).
2. **Classification 661/662 → travaux** : je l'ai appliquée (ta décision du 15), mais **comptablement discutable** (661 = annuités d'emprunt, 662 = agios). **Confirme** ou je rebascule via `set_account_charge_nature` (réversible, c'est fait pour ça).
3. **Annexes (fac-similé légal) + état daté partie 3** : ta validation d'expert reste requise avant de geler ces libellés (hors périmètre de cette nuit).

---

## 🔜 Ce qui RESTE (ordre conseillé)

- **E9 — rattachement travaux `operation_id`** *(le dernier gros morceau J5)* : volontairement NON fait en autonomie car **prospectif** + touche la **saisie (décision UX)** + front diffus, sans filet F10. Design red team prêt : **front (sélecteur operation_id) d'abord → vue filet `v_works_entries_unlinked` → garde RPC de clôture (jamais une contrainte NOT NULL brutale) → JAMAIS de backfill du posté** (immuabilité GL). À faire ensemble en 1re tâche.
- **Reste J5** : annexes E2/E7/E8, état daté H1/H2/H3, reprise mandat F8 (3 briques), contre-passation F9.
- **T14 — régénérer `src/types/supabase.ts`** : différé (risque de cascade tsc, déjà vu en J0 : ~430 erreurs). Le front nouveau de la nuit utilise le client non typé (`as any`), donc rien n'est cassé ; à régénérer proprement ensemble.
- **Portail copropriétaire (J3)** : seulement après J5 soldé + validé.

---

## 🧰 Comment vérifier (DB locale)
- Conteneur **`supabase_db_Co-Pro-Flex`** (DB SEULE — `supabase start` complet crashe par OOM sur cette machine ; relancer la DB via `docker start supabase_db_Co-Pro-Flex`).
- Gates : `npm run db:test` → **27/27 bloquantes OK** (5 différées rouges = attendu, chemin authenticated non câblé en dev).
- Repro : `bash scripts/rebaseline-check.sh` → smoke `audit_finance_integrity=0` (seul `0055/pg_cron` rouge = structurel).

## 🧪 À tester par toi (F10, quand la branche est appliquée)
- **Conseil** → onglet Membres (noms/emails affichés, plus vides).
- **AG** → jalons (cocher un délai), choix d'envoi (éditer sans perdre les traces), pouvoirs (max 3/mandataire bloqué).
- **Mur** → liker/commenter (compteur juste, +1 unique).
- **GED** → liens de documents, fiche facture (documents liés).
- **Ventes** → bouton « Nouvelle mutation » (ne plante plus).
- **Finance** → rapprochement bancaire (import relevé + pointer un paiement = aucune double écriture).

## 🧹 Dette / points connus (non bloquants)
- **~35 fichiers-déchets à la racine** (artefacts de redirection shell : `(,`, `[k`, `router.back()`…) — **NON committés**. `git clean -n` pour les voir, puis nettoyage ciblé quand tu veux (NE PAS `git add .`).
- **Banque** : les 2 edge functions sont **écrites mais non testées en runtime Deno** (seules les RPC SQL sont prouvées par gate). UI `mouvements-bancaires` lit encore `account_code/account_category` (colonnes mortes) → retirer le bouton « catégoriser » (la catégorisation passe désormais par le rapprochement). Pointage **partiel** multi-cibles non modélisé (enum `bank_movement_status` sans état « partiel »).
- **GED** : `IMPAYE/INTERVENTION/APPEL_FONDS` mappés vers `'other'` (pas de valeur d'enum dédiée) → migration enum si on veut un vrai « home ».
- **Suivi détaillé** : `.planning/PLAN_NUIT_2026-06-15.md`.
