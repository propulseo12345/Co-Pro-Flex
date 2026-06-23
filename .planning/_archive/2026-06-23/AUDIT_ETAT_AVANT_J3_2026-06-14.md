# Audit d'état réel — « que reste-t-il avant le portail J3 ? » (2026-06-14)

> Produit par workflow multi-agents (`wictig60s`, 15 domaines × audit + vérificateur sceptique + synthèse).
> Croise git × migrations (jusqu'à 0060) × appels front réels. Statut faisant foi = `corrected_status` du vérificateur.
> Périmètre = finir **J2-bis** (recâblage hors-finance) + le reste de **J5** (conformité légale/métier). B3/B4/B5/E3 mergés, E4-cœur livré (branche, non mergé) → non relistés.

## Verdict global

- **J2-bis ≈ 80 % fait.** Le cœur (vues + RPC + tables) est livré, durci, câblé. Restent des trous de plomberie ciblés (RPC fantômes legacy, services mock encore branchés, drift de colonnes masqué par le client `as any`), + **un vrai morceau** : la voie d'écriture du **rapprochement bancaire** (2 edge functions 404), + **un bug d'écriture mutation** (bouton « Nouvelle mutation » cassé).
- **J5 ≈ 20 % fait.** 4 domaines `todo` purs (annexes E2/E7/E8, schéma E5/E6/E9, paiements C2/C3/C6, contre-passation F9) + 2 `partial` (état daté H1/H2/H3 ; reprise mandat F8 socle livré). **Tout le poids restant est ici, et touche le grand livre → revue adversariale obligatoire.**
- Le portail **J3 ne démarre pas tant que J5 n'est pas soldé** (la gate RLS du portail dépend de fondations comptables stables).

## Confirmé FAIT (à recocher dans le plan)

- **J2-bis Dashboard** (#18) : `v_dashboard_recent_activity` + `v_dashboard_todos`, câblées au rendu, gate strict.
- **J2-bis Divers** : `increment_template_usage` en base + câblée (`4a1f054`).
- **J2-bis Retours revue 0047** (#13) : `critical_unpaid_count`→`unpaid_lots_count`, statuts AG alignés, OS boutons FACTURE/PAYE retirés + badge facture.
- **J2-bis Retours audit 2026-06-12** items a/c/d/e/f : purge mock impayés (`58eb43a`), relances auto DB (`0055`), spinners AG+copro, `useSalesList` descendu, TravauxDetailModal→`document_relations`.
- **J2-bis cœurs livrés** (domaines restant `partial`) : AG annexes (0050, #14), Communication (#15), GED (#16/#27, 0052), Conseil (#17, 0053).
- **J5** : B3 #29, B4 #30, B5 #31, E3 #32 ; **E4-cœur** (0060, branche `e4-operation-id-ledger`, NON mergé) ; **H4** (index unique clé générale, 0050/#14) ; **F8 socle** (moteur reprise A→D mergé main) ; **Export CSV** (`d7e0b35`) ; C6 moteur SQL art.24 (pré-existant).

## RESTE avant J3

### J2-bis (nettoyage ciblé + 2 gros)

1. **AG annexes — 3 familles de RPC fantômes** *(medium)* : POUVOIRS (`get/save/delete_ag_pouvoir`+`update_justificatif`), JALONS (`get_ag_milestones`/`save_ag_milestone`), CHOIX D'ENVOI (`get/save_ag_envoi_choices`) — appelées par des pages live, absentes du canonique. ⚠️ Le commentaire d'en-tête de 0050 prétend à tort qu'elles sont mortes. Trancher le modèle d'abord, puis migration + resync types.
2. **Régénérer `src/types/supabase.ts`** *(small)* : stale post-0050 ET post-0054 (v_ag_*, v_mutations_overview, v_dashboard_*, etc. en `as any` → faux-vert). À faire APRÈS les RPC fantômes AG, en un resync. Méthode anti-drift = rejeu en base jetable.
3. **Mutations — bug d'écriture LIVE** *(medium)* : `createMutation` INSERT `buyer_*`/`notary_*` (colonnes déplacées vers tiers en 0019) → bouton « Nouvelle mutation » jette une erreur Postgres. Corriger (FK `seller_owner_id`/`notaire_id`) ou masquer le bouton. + nettoyer doublon mort `lib/sales`.
4. **Rapprochement bancaire — voie d'ÉCRITURE absente** *(large, le plus lourd)* : edge `import_bank_movement` + `reconcile_bank_movement` INEXISTANTES (front les appelle déjà, `finance/api.ts:831/843` → 404). Tables/vue OK. `reconcile` poste D512/C450 (modèle pointage). **Poser l'auth/appartenance copro dès le départ** (risque IDOR/DoS). PR isolée + revue adversariale.
5. **GED — rebrancher 4 UI hors mocks** *(small)* : `document-linking`/`document-versioning` mock → `lib/documents/api.ts`, supprimer les 2 mocks, câbler `v_document_versions` orpheline, retirer `AccessBadge` mort.
6. **Conseil syndical — bug onglet Membres** *(small)* : `useConseilSyndicalPage` lit `last_name/first_name/email` sur `council_members` (colonnes absentes) → noms vides. JOIN coproprietaires/profiles.
7. **Communication — double-comptage mur** *(small)* : triggers 0032 incrémentent déjà likes/comments, `useMur` ré-incrémente côté front (course). + `author_name` inséré dans `wall_comments` (colonne supprimée 0022) → INSERT commentaire cassé.
8. **Suppression `src/lib/maintenance/api.ts`** *(small, item g)* : legacy drifté encore importé par StepCarnetEntretien/StepContracts → migrer ces 2 steps onboarding vers le canonique, puis supprimer + nettoyer TODO `interventions.service.ts:12`.

### J5 (gros morceau, touche le GL)

9. **E5/E6/E9** *(medium, DÉPEND du merge E4)* : E5 défauts 662/661/704→travaux + override configurable au compte ; E6 711-718 courant (≈ satisfait par E3) ; E9 rattachement travaux OBLIGATOIRE à la saisie + filet « non rattachés » (annexe 5) + blocage clôture d'opération + sélecteur `operation_id` front (0 fichier aujourd'hui).
10. **Paiements C2/C3/C6** *(medium)* : C2 cloisonnement par nature par défaut (FIFO intra-nature, reliquat→450-3) + PaymentModal ; C3 reprise auto trop-perçu 450-3 à l'émission + mention sur l'avis (front+PDF), 103 intouché ; C6 doc/enums/seuil feuille de présence art.24 (trivial, SQL déjà conforme).
11. **Annexes E2/E7/E8** *(large, revue adversariale)* : E2 fac-similé légal (à valider avec Lyes AVANT gel) ; E7 refonte `fn_annexe_1` sans compensation, par lot et par sens, 450-5 isolé ; E8 `fn_annexe_2` en 2 blocs officiels lisant `charge_nature`. + résorber drift front↔base (types riches vs SQL pauvre) + PDF.
12. **État daté H1/H2/H3** *(medium, H4 fait)* : H1 multi-acquéreurs Σ=100 ; H2 cédants nominatifs ; H3 partie 3 complète (provisions votées non appelées art.14-1 + ALUR art.14-2-1). ⚠️ Le builder SQL n'est branché NULLE PART (INSERT brut côté client) et l'edge `validate_mutation` appelée par l'UI N'EXISTE PAS → recâbler front sur RPC.
13. **Reprise mandat F8 — 3 briques** *(medium)* : traçabilité 471/472 ligne-par-ligne art.10 ; import balance Excel/CSV ; acompte fournisseur 409. Le cœur d'équilibre est prouvé+mergé.
14. **Contre-passation F9** *(medium, session de conception d'abord)* : RPC `reverse_ledger_transaction` (refus si période figée / double extourne, écriture inverse liée, gardes manager) + UI modale guidée + gate. Gérer aussi « annuler un appel déjà posté » (dette 0026).

## Ordre d'attaque recommandé

0. **Confirmer/merger E4** (`bee14b4`) sur main — prérequis dur de E9.
1. Nettoyage J2-bis léger en parallèle (bug Membres, double-comptage mur, GED mocks, suppression `lib/maintenance/api.ts`).
2. AG annexes (trancher modèles) → corriger bug Mutations → **régénérer les types** en un coup.
3. Rapprochement bancaire (2 edge + auth copro + gate), PR isolée + revue adversariale.
4. **J5 fondations** : E5/E6/E9 (après E4 mergé).
5. J5 Paiements C2 puis C3 (après classification stable) ; C6 doc en parallèle.
6. J5 Annexes E2 (validé Lyes) puis E7/E8 + drift + PDF ; revue ultracode.
7. J5 État daté H1/H2/H3 (après annexes ; recâbler front sur RPC).
8. J5 F8 reprise (3 briques, indépendant, à intercaler).
9. J5 Contre-passation F9 (en dernier, après session de conception) → J5 soldé → gate RLS → J3.

## Décisions à trancher avec Lyes (avant de coder les tranches concernées)

1. **AG pouvoirs** : nouvelle table `ag_pouvoirs`+RPC, OU rebrancher sur `presence_type='proxy'`+`represented_by_*` de `ag_attendance` (0017) ? *(l'en-tête 0050 suggère la 2e)*
2. **AG choix d'envoi** : rebrancher sur `get/save_ag_envoi_tracking` (0030, déjà utilisées) OU créer les `*_choices` ? *(reco : rebrancher l'existant)*
3. **Conseil v_council_*** : définitivement hors périmètre (legacy 0 appelant) ? exposer `council_decisions/votes` à l'UI dans J2-bis ?
4. **Annexes E2** : valider le fac-similé légal (décret 2005-240 / arrêté 14 mars 2005) AVANT gel des libellés.
5. **Schéma E5/E6** : forme de l'override `charge_nature` (RPC manager `set_account_charge_nature` vs défaut système reseed-safe) ?
6. **État daté H3** : périmètre partie 3 = trimestres du budget voté non appelés (art.14-1) + ALUR art.14-2-1 ?
7. **État daté câblage** : recâbler front sur la RPC (reco) vs répliquer H1-H4 côté client ?
8. **Contre-passation F9** : comportement si l'écriture d'origine est dans une période approuvée/figée ?
9. **F8 reprise** : la sortie/apurement 471/472 par décision d'AG (§11) est-elle dans le scope maintenant ou différée ?
10. **Mutations** : corriger le bouton « Nouvelle mutation » maintenant (J2-bis) ou le masquer en attendant le chantier écriture J9 ?
