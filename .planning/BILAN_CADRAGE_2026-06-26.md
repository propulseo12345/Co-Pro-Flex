# Bilan du cadrage v2 — 2026-06-26

> Produit par un audit multi-agents (12 agents, lecture du corpus `.planning/` + atlas + blueprints db-cible + vérifications EN BASE sur le live `qqfqrcolzmcbsvfaumiq`).
> Trois mots-clés à distinguer : **cartographié** (on connaît le terrain) · **décidé** (on a tranché le *quoi*) · **prêt à construire** (objets listés + **zéro contradiction** de texte).

---

## 1. Verdict : a-t-on tout cartographié ?

**Oui pour la carte et les grandes décisions ; NON, aucun domaine n'est « prêt à construire » au sens strict.** État = *plan d'architecte complet sur un terrain encore nu, avec deux portes de sécurité restées ouvertes en prod.*

| Domaine | Cartographié | Décidé | Prêt à construire | Ce qui bloque |
|---|---|---|---|---|
| **Finance / GL / budgets / appels / impayés / trésorerie** | Partiel | Complet | **Non** | Blueprints `db-cible/02-03` périmés (avant les décisions de fin juin) ; ~12 objets de socle décidés mais inexistants ; 1 micro-arbitrage ouvert (réalisé→budget courant) |
| **AG / votes / cycle de vie** | Complet | Complet | **Non** | 0 objet AG construit en v2 ; `set_ag_status`, `create_budget_from_ag_resolution` absents ; `cast_vote` bugué ; `business-rules.md:66` contredit C17-1 |
| **Ventes / mutations / état daté / opposition** | Complet | Complet | **Non** | Squelette inerte (5 tables vides) ; 8 RPC d'écriture absentes ; 1 micro-arbitrage (vendeur créditeur) ; blueprint `05` + spec `07` périmés |
| **Maintenance / tiers / contrats / OS / sinistres** | Complet | Complet | **Non** | Objets décidés après le 26/06 absents du blueprint : table devis, sinistres, dates d'assurance, `commitments`, crons |
| **GED / documents / conservation / PV** | Complet | Complet | **Non** | 0 SQL appliqué ; dépend de `G24-AM2` (numérotation sans trou) non construit ; spec `08` périmée |
| **Communication / mur / e-mails** | Complet | Complet | **Non** | Blueprint `08` encore couplé Resend (décision = Brevo) ; `notifications`/`delivery_events`/soft-delete mur inexistants ; 1 trou RGPD (contenu messages privés) |
| **Copropriétaires / lots / tantièmes / portail / CS** | Complet | Complet | **Non** | Socle dont tout dépend, **rien n'est construit** ; versioning tantièmes présenté « dormant » alors que c'est un vrai moteur à concevoir |
| **Transverse / multi-cabinet / RLS / RGPD / socle C.17 / edges** | Complet | Complet | **Non** | **2 failles de sécurité ACTIVES en prod** (escalade super-admin + RLS sans FORCE) ; tous les objets de socle C.17 absents |

**Solide** : la cartographie (atlas + blueprints + spec entités) et les décisions *macro* (`REFONTE_DECISIONS`, des centaines de points tranchés au numéro de compte près). Finance, AG, transverse = modèles de rigueur.

**Fragile** (3 points, par gravité) :
1. **Tout est « design validé », rien n'est bâti.** `v2-tanstack/src/features/**` = uniquement des `.gitkeep` ; aucune migration v2 ; aucun dossier `supabase/` dans v2. La base « live » = l'**ancien** schéma qui meurt gelé. ~40 objets de socle décidés **n'existent pas** en base (vérifié).
2. **Deux failles de sécurité ACTIVES en prod** (vérifiées en base le 26/06) — voir §2c.
3. **Le registre déclare lui-même 147 trous fins (Partie C, 18 domaines) + 8 angles morts** non tranchés. La complétude des décisions est vraie au niveau *macro*, fausse au niveau *fin*.

---

## 2. Ce qui RESTE avant de coder

### (a) Arbitrages USER encore vraiment ouverts (peu, légers)
1. **Réalisé → budget COURANT** (EXP-7d) : `operation_id` ne marche que pour les travaux ; pour le courant, étendre `operation_id` ou rattacher par compte 6x (faux si 2 budgets partagent un compte). *Touche la justesse des chiffres.*
2. **Vendeur créditeur à la mutation** (EXP-5) : comportement par défaut (rembourser vs reprise acquéreur) non figé. *À confirmer avant l'écran mutation, pas avant les tables.*
3. **Contenu des messages privés au départ d'un copro** (COMM-F4, RGPD) : durée/anonymisation non décidées. *Mineur.*
4. **Journal d'audit générique** (D65-b) : table dédiée vs triggers sur colonnes — « ou » non tranché.
5. **Les 147 trous fins + 8 angles morts** (Partie C) : à passer en revue domaine par domaine. *Le vrai gros morceau caché derrière « décidé : complet ».*

### (b) Contradictions de texte à PURGER (hygiène pas chère, gros effet — éviter qu'un implémenteur recopie le mauvais modèle)
- **`business-rules.md:66`** : « statuts PV posés par UPDATE front » ⟂ C17-1 (`set_ag_status`). Réécrire.
- **`db-cible/02-03`** (finance) : multi-512 + double-posting de la charge. Réécrire (noyau GL OK, périphérie à refondre).
- **Contradiction `512100`** : « Face 2 = 502 + 512100 » vs « 512100 fantôme, Face 2 = 502 seul ». Trancher pour 502.
- **`db-cible/05`** (ventes) : 6 statuts (base = 7) + route d'encaissement interdite par C12-1. Aligner.
- **`db-cible/01`** (copros) : super-admin modélisé en enum ⟂ C16-4 (table dédiée). **Générer depuis ce blueprint recréerait la faille.**
- **`db-cible/08`** (comm) : couplé Resend ⟂ décision Brevo + couple neutre.
- **spec `08`** (GED) : 4 niveaux de confidentialité abandonnés. Marquer historique.
- **`COHERENCE_PLAN_V2_2026-06-26.md`** : présente les 5 arbitrages comme « ouverts » — **périmé, ils sont tranchés**. Neutraliser en tête.
- **Stratégie PDF** : « à trancher » à un endroit, décidée (HTML→PDF Chrome headless) ailleurs. Purger le « à trancher ».
- **`PLAN_MAITRE_VUE_COPROPRIETAIRE.md`** : Next.js + « RLS juste à réactiver » — faux pour v2. Marquer historique.

### (c) Faux-verts vérifiés EN BASE
- **FAUX-VERT n°1 — escalade super-admin ACTIVE en prod** : `user_is_copro_manager` (portier écriture) appelle encore `user_is_platform_admin` qui lit `memberships` **sans `copro_id`** → bypass écriture global multi-cabinet. C16-4 exige le patch **avant tout 2e cabinet**.
- **FAUX-VERT n°2 — « RLS ON+FORCE » est faux** : 87 tables ON / **5 en FORCE**. FORCE = prérequis non négociable de C15-5/C16-5/C13-3/C15-3/C11-P6/C17-8. La mémoire projet « ON+FORCE » est fausse.
- **FAUX-VERT n°3 — « design validé » = 0 objet** : ~40 objets de socle décidés mais inexistants.
- **FAUX-VERT n°4 — « 0 anomalie » sur base vide** : prouve l'absence de données, pas la justesse du moteur. Il faut seeder le golden « Domaine des Tilleuls ».
- **Trou — sauvegarde / reprise après sinistre** : aucune décision (PITR, RPO/RTO, test de restauration). *Pour un grand livre LÉGAL, vrai trou opérationnel.*
- **Trou — contrôleur aux comptes externe** : rôle distinct du CS, non cartographié. *Mineur.*

---

## 3. Comment préparer l'implémentation

**Règle d'or : aucun écran ne se construit avant que le SQL du palier soit PROUVÉ en base (e2e Playwright + non-régression).**

- **Étape 0 — Sécurité live hors-bande (tout de suite)** : patch escalade super-admin (table `platform_admins` + retrait du bypass + 4 helpers corrigés) ; FORCE sur 87 tables + revoke anon + durcir le gate ; retirer le compte démo `password123` ; poser des paiements RÉELS avant le golden.
- **Étape 1 — Purge des contradictions** (cf. §2b).
- **Étape 2 — Registre des supersedes** : page unique « tel doc/décision remplace tel autre » (ARB-2 ⟶ db-cible/02 ; C16-4 ⟶ db-cible/01 ; etc.).
- **Étape 3 — Figer la liste « objets à créer/purger »** (le backlog ci-dessous = ~40 objets de socle + objets par domaine).

### Paliers de build (DoD = critère de preuve par palier)
- **Palier 0 — Doctrines socle C.17 + base neuve.** Graver les 8 contrats (`set_ag_status`, audit des annulations, idempotence, horloge des dates, `cron_runs`, machines à états, webhooks, super-admin) ; squash+clean ; `cabinets` + socle lot-centric + `G24-AM2`. *DoD : 8 contrats en base, structure verte, `get_advisors`=0.* **En premier car contrats rétroactifs** (posés après = tout réécrire).
- **Palier 1 — Châssis sécurité/multi-rôle.** `get_my_contexts()` + cookie contexte signé + middleware deny-by-default. *DoD : étanchéité inter-cabinet rouge-puis-vert sur vraie session.*
- **Palier 2 — Socle GL + deux poches + engagé.** `create_ledger_transaction` + `copro_bank_accounts` (512/502) + `commitments`. **1re action technique : prouver `regularize_period` multi-clés sur le golden 6 clés** (si RAISE → correctif P0). *DoD : GL équilibré sur le golden.*
- **Palier 3 — AG → finance.** `create_budget_from_ag_resolution` (corrige le 23503) + rebrancher `create_ag_with_standard_resolutions` + réécrire `cast_vote` + appels nés des résolutions + tantièmes versionnés + conseil syndical. *DoD : cycle annuel complet prouvé en SQL avant toute UI.*
- **Palier 5 — Vues d'agrégat + ancienneté.** Rebrancher budgets/impayés sur le GL + `v_creances_aging` (source unique) + recréer ~12 vues fantômes + gate `audit_finance_integrity=0` en CI. *DoD : impayés/budgets = mêmes chiffres que le GL.*
- **Palier 6 — Factures/paiements.** `post_supplier_payment` sans compte obligatoire + virement interne 502→512. *DoD : cycle facture saisie→validée→payée.*
- **Palier 7 — Maintenance/tiers.** `tiers` unifié + devis multiples + assurances datées + sinistres + mandat syndic + crons. *DoD : OS avec mise en concurrence bout en bout.*
- **Palier 8 — Recouvrement.** Frais art.10-1 (450-6/714) + plan d'apurement + échelle 7 stades. *DoD : relance qui crée des frais sur le bon sous-compte.*
- **Palier 9 — Ventes/mutations/état daté.** Opposition art.20 + clôture compte vendeur + état daté 3 parties lu du GL. *DoD : état daté juste vs GL.*
- **Palier 10 — GED/conservation/PV.** GED refondue + numérotation sans trou + registre PV. *DoD : PV généré avec numéro coté sans trou.*
- **Palier 11 — Communication.** `notifications` + soft-delete mur + e-mails Brevo + calendrier. *DoD : e-mail réellement envoyé et tracé.*
- **Palier 12 — Portail/RGPD/front.** Invitations + cloisonnement docs (gate go-live) + socle RGPD + écrans v2 CSS Modules. *DoD : un copro voit ses docs et RIEN des autres.*

---

## 4. Outils nécessaires

**Techniques** : TanStack Start (front, server functions) · Supabase cloud (base + auth) · RPC SQL (seule porte d'écriture gardée) · CSS Modules (jamais Tailwind) · MCP Supabase (`apply_migration`/`execute_sql`/`get_advisors`=0) · protocole BEGIN/ROLLBACK · gates SQL (RLS+FORCE, intégrité finance=0) · golden « Domaine des Tilleuls » (à seeder) · Playwright e2e (preuve en base) · Vitest (unitaires purs) · workflows multi-agents/ultracode + code-review (revue adversariale par migration).

**Méthode** : skill `methodo-coproflex` · DoD stricte par feature · registre `CHANTIERS.md` · revue cascade avant migration · glossaires `CONTEXT.md`/`glossaire-technique.md` · **registre des supersedes (à créer)**.

---

## 5. Recommandation finale — la prochaine action

**Demain : zéro ligne de code de feature. Fermer d'abord les deux portes ouvertes en prod (Étape 0).**
1. Patcher l'escalade super-admin (`platform_admins` dédiée + retrait du bypass + 4 helpers), après avoir vérifié qu'aucun rôle existant n'est cassé.
2. Poser FORCE sur les 87 tables + durcir le gate.

**Pourquoi celle-là** : seules failles réelles et actives (vérifiées en base) ; C16-4 exige ce patch *avant tout 2e cabinet* ; et ce 2e cabinet de test est le prérequis du test d'étanchéité qui validera tout le multi-rôle.

**Juste après** : purge de texte (§2b) + registre des supersedes (rapide, sans risque, évite de recopier le blueprint `01` qui recréerait la faille). **Ensuite seulement** : Palier 0 (8 doctrines C.17 + base neuve).

> En une phrase : **sécuriser la prod, nettoyer les textes, poser le socle — le code des features vient après, jamais avant.**

*(Backlog d'objets détaillé et séquencé : sortie complète du workflow `wqvq17a2r` — ~50 objets avec `depends_on`/`palier`.)*
