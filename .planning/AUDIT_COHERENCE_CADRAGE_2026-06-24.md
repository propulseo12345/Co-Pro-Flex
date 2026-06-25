# Audit de cohérence du cadrage v2 — 2026-06-24

> **Source** : workflow ultracode `cadrage-recon-coherence` (run `wf_738be527-ce0`, 7 lecteurs + 1 synthèse, ~770k tokens) ayant lu tout le corpus de cadrage (`REFONTE_DECISIONS`, `TRIAGE_PARTIE_C`, cartographies, chaînes, vérifications, décisions antérieures, registre de risques + audits de drift).
> **But** : photographier l'état réel des décisions v2 et lister les anomalies de cohérence AVANT de figer le plan de construction. Sert de base à `docs/superpowers/plans/2026-06-24-cadrage-base-saine.md`.

---

## 1. État du cadrage par bloc

| Bloc | Statut | Résumé |
|---|---|---|
| **Partie A** (périmètre/espaces/phasage) | ✅ cadré | A1-A7 tranchés (3 espaces, V1=parité+5 P0, Phase 1=réparer 3 chaînes avant UI, ordre par dépendance de données, golden Tilleuls). Reliquat : A3 « pièces convocation forcées » contredit la décision non-bloquante (ANOM-07). |
| **Partie B** (stack/infra/CI/data) | ✅ cadré | B1-B10 tranchés (TanStack/Vite8 épinglé, react-query+loaders, middleware deny-by-default, RLS ON+FORCE baseline, CI anti-faux-vert, seed-to-golden). Tension mineure B6 hébergeur (ANOM-24). |
| **Série C.1-C.10** (PARTIAL consignés) | ✅ cadré | Onboarding→GED triés P1-P6. Corrections majeures actées (annexe 6≠1, 678/718≠672/772, deux poches, 662=courant). |
| **C.11 P4-P6** | 🟠 partiel | Recos posées dans le triage, **non ratifiées**. 3 items. |
| **C.12** (ventes/état daté/opposition) | 🟠 partiel | 6 PARTIAL, recos posées, non ratifiées. |
| **C.13** (conseil syndical) | 🟠 partiel | 5 PARTIAL. Dépend du périmètre A1/A2. |
| **C.14** (conformité/RNIC/DTG/Factur-X) | 🟠 partiel | 6 PARTIAL dont l'objet fantôme `document_access_log` (ANOM-10). |
| **C.15** (portail/vote/paiement/RGPD/multi-rôle) | 🟠 partiel | 5 PARTIAL. Multi-rôle à trancher AVANT le middleware. |
| **C.16** (mandat/honoraires/platform_admin/KPIs) | 🟠 partiel | 5 PARTIAL + contradiction mandat V1/P1 (ANOM-08). |
| **C.17** (transverse-fondateur) | 🟠 partiel | **8 doctrines de socle** à trancher AVANT baseline/cron/RPC. |
| **Salves G24** (T/AM/C/META) | ✅ cadré | Très dense. Reliquat : G24-T12 (vérif empirique `regularize_period` multi-clés) = 1re action technique. |
| **Transverse sécurité (live)** | 🟠 partiel | 2 tables 0077/0078 SANS RLS, RLS ON **SANS FORCE** sur 87 tables, escalade platform_admin, 0 edge déployée. Cadré mais **non appliqué** (ANOM-01/04). |
| **Transverse drift code↔schéma** | 🟠 partiel | 118 refs cassées finance ; **hors-finance jamais audité** (ANOM-25). |
| **Transverse arbitrages expert métier** | 🔴 ouvert | ~7 questions expert bloquant du code aval (à trancher avec Lyes). |

---

## 2. Décisions de cadrage encore à trancher (35 items — « finir la photo »)

### C.17 — Doctrines fondatrices transverses (8) — **PRIORITÉ, à trancher AVANT toute baseline**
1. **Machine à états centralisée** : `set_ag_status` unique pose `pv_signed`/`pv_sent` (fait juridique daté), **aucun UPDATE de status depuis le front** (corrige `business-rules.md`).
2. **Audit trail des ACTIONS** (qui/quoi/motif) : persister le `p_reason` de `reverse_payment` + motif des contre-passations E4 sur l'écriture (colonne `reason`/`reversed_by`) — aujourd'hui nulle part.
3. **Idempotence des écritures** : `p_idempotency_key` contrat OBLIGATOIRE de TOUTE RPC d'écriture (jamais de `23505` nue) ; clé cron D15 = `echeancier_line_id`.
4. **Horloge métier `asOf`** : date d'écriture = `p_tx_date` OBLIGATOIRE validé serveur (refus si période≠'open' sauf régul) ; SUPPRIMER tout `DEFAULT current_date` ; `created_at` reste `now()`.
5. **Périmètre/contrat des CRON v2** : registre `cron_runs` + politique de rattrapage par date d'effet + idempotence sur tout job financier + alertes informatives.
6. **Cohérence machines à états SQL vs doctrine** : enums techniques EN + libellés FR à l'affichage, figer CHAQUE machine AVANT de reconstruire l'écran, purger les valeurs mortes (OS 6 FR vs 9 SQL).
7. **Contrat de sécurité des WEBHOOKS** : patron unique (signature sur corps brut avant parsing + résolution copro/refus si non rattachable + idempotence `event_id`/`webhook_events` + jamais service_role qui shunte + dead-letter).
8. **Modèle de droit du super-admin** : support LECTURE SEULE par défaut, écriture exceptionnelle = break-glass tracé/borné, INTERDIRE le cumul platform_admin+gestionnaire.

### Arbitrages expert métier (~7) — **à trancher avec Lyes**
- Minimum ALUR légal (2,5% budget vs MAX(2,5% PPT ; 5% budget)).
- Immutabilité période approuvée.
- Période de référence de l'état daté (P3).
- Équilibre annexe 1 (créances=dettes — bloque gate 0088).
- Clôture compte vendeur : écriture vs pointage (D33).
- Définition des fonds travaux affichée (D67).
- Dérivation réalisé + impayés du GL (D20/E6 — recoupe ANOM-12).

### C.11 P4-P6 (3)
- **P4** Idempotence/reprise envois en masse : trace `pending` AVANT provider + clé (ag_id, coproprietaire_id, canal), rejeu ciblé (calqué D32).
- **P5** Drift destinataires : désigner NOMMÉMENT la source projetée unique (ex. `v_coproprietaires_overview`, `display_name` calculé) + grep des appelants.
- **P6** Modération du mur : soft-delete auditable (`is_hidden`+`hidden_by`+motif+horodatage), signalement structuré P1.

### C.12 (6) — ventes/état daté
- RPC opposition art.20 (`record_mutation_opposition` sans écriture + `settle` réutilise post-paiement D33, nudge non bloquant).
- Pré-état daté (`snapshot_type` 'pre'/'final', avis de mutation = événement saisi → deadline+15j → todo).
- Répartition vendeur/acquéreur (art.6-2, pas de pro rata auto, affiché sur l'état daté).
- Clôture compte vendeur (jalon 6) : `get_lot_balance_45x` à `effective_date`, issue forcée si solde≠0, découplé de la signature.
- Enum `mutation_status` : conserver 'signed'≠'validated', table de transition linéaire posée par RPC.
- RLS ventes/état daté/opposition : aucune policy copro (FORCE), gestionnaire-only.

### C.13 (5) — conseil syndical
- FK `council_decisions/votes` (`linked_service_order_id`/`linked_contract_id` RESTRICT), avis unique gestionnaire V1.
- Élection président CS (`set_council_president`, ≤1 actif, « sans président » non bloquant).
- Droit d'accès CS aux pièces (vues dédiées `security_invoker`+RLS `is_council_member`, journaliser).
- Délégation de pouvoir (art.21-1) : V1 consultation/avis seulement, crochet dormant.
- Annexion avis CS sur marché (lier à la résolution, alerte non bloquante).

### C.14 (6) — conformité
- Journal d'accès aux actes : corriger l'incohérence `document_access_log` (ANOM-10) — construire OU aligner sur report P1.
- RNIC = télédéclaration annuelle (statut + `date_derniere_declaration_rnic` + alerte D70).
- DTG ≠ PPT (document réglementaire dédié `type='dtg'`).
- Factur-X EN 16931 = pré-requis champs du module Factures.
- Coffre-fort/extranet (décret 2019-650) : check-list + cloisonnement + trace dérogation.
- Conservation/archivage : barème durées éditable + registre PV dérivé de `ag_meetings`.

### C.15 (5) — portail
- Vote par correspondance en ligne (texte exact lié à `form_document_id` + horodatage serveur + dépouillement défaillant si amendée).
- Paiement en ligne des charges (P1, SEPA GoCardless, webhook→`allocate_payment`).
- Périmètre RGPD bloquants go-live (politique conf.+cookies+base légale+durées+self-rectification tracée+journal accès docs).
- Étanchéité espace CS art.21 (journaliser accès nominatifs + mention confidentialité).
- Compte multi-copro/multi-rôle (1 auth/personne, switcher porte contexte ET rôle, middleware sur memberships réels) — **AVANT de coder le middleware**.

### C.16 (5) — multi-cabinet
- Mandat de syndic V1 (vs A3 P1) — **CONTRADICTION ANOM-08**, prérequis du plafond 3 mandats D30.
- Honoraires (noyau « honoraires de gestion » forfait 621 V1, grille Novelli P1).
- Transfert de portefeuille (V1 = sortie minimale + export passation).
- Escalade platform_admin (`profiles.is_platform_admin` hors memberships, bypass lecture tracé) — **impacte baseline RLS**.
- KPIs portefeuille (`v_cabinet_overview` sommant D68/D70, jamais un 2e calcul).

---

## 3. Anomalies de cohérence (26) — par sévérité

### 🔴 Bloquantes (6)
- **ANOM-01** (contradiction) — **RLS live : croyance fausse « ON+FORCE »** alors que c'est ON **SANS FORCE** sur 87 tables + 2 tables (`0077` opening_balance_residual_items nominatif, `0078` supplier_advances) **SANS RLS** = anon exploitable depuis internet. À corriger AVANT de déclarer la baseline saine.
- **ANOM-02** (contradiction) — **Modèle de trésorerie** : D21/D67/G24-T7 décrivent un multi-512 par nature, MAIS G24-C6-P P1 l'ABANDONNE pour le modèle « deux poches » (512 courant + 502 livret ALUR, virement interne avant paiement) sans réécrire D21/D67/G24-T7. Deux modèles incompatibles → matérialiser le mauvais casse la chaîne paiement fournisseur + carte fonds travaux.
- **ANOM-03** (contradiction) — **Source de vérité des créances** : divergence prouvée GL 4950 vs compteur `call_for_funds_lines` 4450 (écart 500) ; `cancel_call_for_funds` laisse audit=3 LOT_GL_MISMATCH (-13550). `FinanceAnnexeStats` affiche les deux chiffres côte à côte. Couplage impayés↔GL = **décision OUVERTE** qui bloque onboarding/mutation/relances/état daté/portail.
- **ANOM-04** (orpheline) — **0 edge function déployée** alors que le front en invoque 12+ ; `send-convocation-email` renvoie `{success:true, stub:true}` (succès mensonger). Paiements/banque/AG/emails cassés en prod. Doctrine v2 = RECRÉER proprement (cron+webhooks only), pas redéployer les 27 edges v1.
- **ANOM-05** (dépendance) — **3 ruptures racines AG→finance** bloquent TOUTE UI : (1) `action_type=NULL` posé par `createStandardResolutions` → `prepare_ag_decisions` filtre → 0 action ; (2) budget jamais matérialisé depuis `ag_resolutions` → `activate_ag_decisions` lève 23503 + rollback ; (3) cut-off existe mais SANS appelant. Orphelines à créer : `create_ag_with_standard_resolutions` (D28), `create_budget_from_ag_resolution` (D29).
- **ANOM-06** (dépendance) — **`copro_bank_accounts` (G24-T7) inexistante** mais déclarée prérequis BLOQUANT de toute la finance. Doit être dans le socle racine après `create_ledger_transaction`. Recoupe ANOM-02 (modèle 512/502 à figer avant).

### 🟠 Importantes (15)
- **ANOM-07** — Pièces convocation : A3 (P0, « forcées ») vs G24-C8-P P4 (« avertissement non bloquant »). Risque de nullité juridique ou de friction. Position récente non-bloquante prime, à acter.
- **ANOM-08** — Mandat syndic V1 vs P1 : D30 (plafond 3 mandats V1) orphelin de données si mandat reste P1. Trancher entité minimale V1.
- **ANOM-09** — Périmètre partie 3 état daté : DEFERRED-D5 (statu quo) vs Cadrage-8 (couverture complète) ; trace D5 non marquée résolue. Recoupe Q9.
- **ANOM-10** — `document_access_log` : D44 le dit existant, ABSENT en base ; réglage de confidentialité GED = mock en mémoire perdu au reload. Traçabilité fantôme.
- **ANOM-11** — Machine à états AG : `business-rules.md` (UPDATE front) contredit G24-T11/C.17 (RPC gardée unique). Recopier l'UPDATE front rouvre le contournement.
- **ANOM-12** — Réalisé budgétaire = 2 sources : `budget_expenses` vs classe 6 GL ; double-posting `validate_budget_expense`+`validate_supplier_invoice`. Décision expert (D20) à trancher AVANT D29/D40/annexe 3.
- **ANOM-13** — Renommage 110→12/120→478 (0056, B3) acté mais `regularize_period` parle ENCORE de 110/120. Migration à moitié faite = piège à copie.
- **ANOM-14** — FIFO imputation : `allocate_payment` 0072 (cloisonné par nature) remplace 0026 §F (global). Vérifier qu'aucun appelant ne présuppose l'ancien.
- **ANOM-15** — Affectation travaux clôture : `regularize_period` 0057 (B4) GÈLE la branche travaux par défaut (déversement via `settle_works_balance`) ; D25/ventilation_110_120 décrivent encore l'auto. Annexes faussées si le plan suppose l'auto.
- **ANOM-16** — Provider email : décision Brevo / code 100% Resend / Q15 ouverte = triple état divergent. Config clé API + DNS coproflex.fr (SPF/DKIM) à faire. Confirmer Brevo et purger Resend.
- **ANOM-17** — Faux WYSIWYG appel de fonds : l'aperçu front (mono-clé, montant libre) ≠ créances 45x réellement écrites (la RPC recalcule depuis `budget_lines` en ignorant la saisie). Le montant affiché ment.
- **ANOM-18** — Palier « engagé » (`commitments` G24-T6) INEXISTANT : un OS de 8000 € est invisible au budget. Prérequis de la chaîne cut-off (408/486) et du suivi engagé/réalisé. Orphelin à CRÉER.
- **ANOM-19** — ~12 vues d'agrégat fantômes lues par le front mais absentes (`v_general_ledger`, `v_calls_overview`, `v_account_balances`…) = chantier pivot. À recréer au socle, dérivant du GL.
- **ANOM-20** — Doctrines C.17 (idempotence/horloge/set_ag_status/cron/webhooks/super-admin) = contrats de socle ; les rétro-installer force à réécrire toutes les RPC d'écriture + jobs. + ~15 `new Date()` contournent `getCurrentBusinessYear()` hardcodé 2026.
- **ANOM-21** — `post_exceptional_call_for_funds` inexistante (wizard codé mais DÉSACTIVÉ, bouton disabled) + route avance art.35 inexistante. Un syndic ne PEUT PAS créer d'appel hors-budget. Ajouter `resolution_id` sur `call_for_funds`.
- **ANOM-25** — **Drift HORS-FINANCE jamais audité** (AG/maintenance/GED/comm/ventes). Photo INCOMPLÈTE. Orphelins déjà entrevus : `council_decisions/votes` inertes, `v_conversations_overview` sans `last_sender_name`, `fn_dashboard_kpis` ne calcule pas `ods_urgents`, edge `communication-workflow` jamais invoquée.
- **ANOM-26** — Faux-vert de test structurel : `payments=0` sur le live → tests de parité vacués ; assertions tautologiques. Poser des paiements réels AVANT la campagne.

### ⚪ Mineures (4)
- **ANOM-22** — Découpage : 13 catégories finance-centrées superseded par ~15 modules métier réels ; aligner sur 6 hubs UX + 15 modules.
- **ANOM-23** — Routes/enums morts (`final_etat_generated`, `/finance/calls`, status `rejected`) = pièges à copie ; purger.
- **ANOM-24** — Hébergeur : B6 « reporté/portable » vs VERIFICATIONS « rester Vercel ». Retenir portabilité comme contrainte, Vercel comme cible par défaut.

---

## 4. Registre des supersedes (« X remplace/corrige Y ») — à centraliser

> Garde-fou anti-recodage du vieux. À maintenir comme **section vivante unique** dans `REFONTE_DECISIONS`.

- **BREVO** remplace Resend comme provider email V1 (G24-C11-P P2 supersede D41) — *code réel encore Resend, à aligner (ANOM-16)*.
- **662 = charges courantes** (G24-C7-P) annule la décision de nuit 0067 « 662→travaux » (re-confirmé ×2).
- **110→12 / 120→478** (0056, B3) supersede l'ancien nommage — *`regularize_period` non aligné (ANOM-13)*.
- **D14** : 4 appels trimestriels ARC ; piste « appel annuel unique » ABANDONNÉE (moteur déjà déterministe).
- **D15** : chaque appel émis à SA date (option B) supersede « 4 appels d'un coup à l'AG ».
- **D32** : atomicité PAR ACTION (savepoint) assouplit D29 « tout ou rien ».
- **G24-C6-P P1** : modèle « deux poches » abandonne le multi-512 + `p_bank_account_id` — *contredit D21/D67/G24-T7 non réécrits (ANOM-02)*.
- **G24-C7-P P1** : liste individualisée = **annexe 6** (pas annexe 1).
- **G24-C7-P P2b** : annexe 3 = **5 colonnes** dès V1 (révise le triage « 3 colonnes »).
- **G24-C7-P P5** : **678/718** dates N+1 corrigent le faux « 672/772 ».
- **G24-C6** : 627=Frais d'AG, agios=662, 661=annuités d'emprunt, produits financiers=**716** (pas 762).
- **D69-bis** : 3 niveaux de confidentialité GED (abandon du 4e « restreint », supersede D44).
- **G24-2** : pas d'`ownership_type` complet V1 (usufruit/NP = flag + contact).
- **G24-SCOPE** : cible = syndics PROS uniquement (branche bénévole/coopératif abandonnée).
- **D28** : `create_ag_with_standard_resolutions` remplace le chemin front (qui oublie `action_type`).
- **D29** : `create_budget_from_ag_resolution` remplace l'attente d'un budget pré-existant (cause du 23503).
- **allocate_payment 0072** (FIFO cloisonné) remplace 0026 §F (FIFO global) — ANOM-14.
- **regularize_period 0057** (travaux gelé) remplace l'affectation auto D12/C450-2 — ANOM-15.
- **v_alur_fund_balance** (source unique) remplace `v_alur_fund_summary` par exercice.
- **set_opening_balance** (`opening_onboarding`) remplace `postOnboardingOpeningBalances` (dead code).
- **post_budget_call_for_funds** supersede `post_call_for_funds` (fantôme, BANNIE).
- **~15 modules métier** supersede les 13 catégories finance-centrées (AG = catégorie pleine).
- **Routes canoniques** : `/finance/factures`, `/finance/comptabilite`, `/ventes-impayes/ventes`, `/contentieux/impayes`.
- **AUDIT_DRIFT_FINANCE** (0001-0035 autoritaires) supersede la base du REGISTRE-RISQUES (migrations_legacy obsolètes).
- **Cadrage-8** (couverture complète partie 3 état daté) supersede DEFERRED-D5 (statu quo) — ANOM-09.
- **Mémoire « RLS ON+FORCE »** supersédée : ON SANS FORCE sur 87 tables (ANOM-01).
- **Mémoire head « 0081 »** supersédée : le live est à **0087**.

---

## 5. Ébauche d'ordre de construction (13 paliers) — base du plan d'implémentation

> Du socle aux feuilles. Détail dans le plan. Ici = squelette validé par la reco.

- **Palier 0** — Décisions de socle AVANT baseline : figer « deux poches » (ANOM-02), ~7 arbitrages expert, 8 doctrines C.17, mandat syndic V1 (ANOM-08).
- **Palier 0-bis** — Sécurité live + complétude : fermer escalade platform_admin + RLS ON+FORCE 87 tables + 0077/0078 (ANOM-01), retirer compte démo, **auditer drift HORS-FINANCE** (ANOM-25).
- **Palier 1** — Châssis v2 : stack épinglée, middleware deny-by-default, react-query+loaders, 3 e2e bloquants, RLS FORCE + 2e cabinet, CI anti-faux-vert + garde seed-vs-golden.
- **Palier 2** — Socle GL : `create_ledger_transaction` + triggers intégrité + `provision_copro_chart` (ajouter 718/677) + clés + `copro_bank_accounts` (deux poches) + `commitments` + période 'open'. Vérif `regularize_period` multi-clés (G24-T12).
- **Palier 3** — Réparer les 3 ruptures AG→finance et PROUVER le cycle EN SQL avant toute UI.
- **Palier 4** — Moteur appels (multi-clés → `post_budget_call_for_funds` à l'émission + exceptionnel + avance art.35).
- **Palier 5** — Lecteurs GL (12 vues recréées dérivant du GL + annexes 1-6 + anciennetés + `v_cabinet_overview`).
- **Palier 6** — Trancher couplage impayés↔GL (ANOM-03) PUIS encaissement (`allocate_payment` FIFO cloisonné + factures fournisseurs 2-temps).
- **Palier 7** — Clôture/affectation (cut-off → close → à-nouveau N+1 → `regularize_period` → approve ; à-nouveau AVANT affectation ; finir 110→12).
- **Palier 8** — Onboarding/reprise de mandat.
- **Palier 9** — AG cycle complet (UI).
- **Palier 10** — État daté/mutations (Lots+lot_owners indivision → état daté → mutation → opposition → relances).
- **Palier 11** — Modules feuilles (Maintenance, GED, Communication Brevo, Conseil, Conformité, Recouvrement).
- **Palier 12** — Portail copropriétaire & conseil (vues DÉDIÉES + 3 cercles + invitations + RGPD).
- **Transverse** — edges recréées proprement, DoD stricte, golden Tilleuls comme banc de recette.

---

## 6. Top risques pour une base saine (priorisés)

1. **Sécurité live non fermée** (ANOM-01) — prérequis absolu.
2. **Source de vérité des créances non imposée** (ANOM-03) — à trancher tôt.
3. **3 ruptures racines AG→finance + orphelins** (ANOM-05/21) — prouver EN SQL d'abord.
4. **Modèle de trésorerie contradictoire** (ANOM-02/06) — figer « deux poches » avant `copro_bank_accounts`.
5. **Doctrines transverses C.17 non tranchées** (ANOM-20) — figer au Palier 0.
6. **Faux-vert structurel** (ANOM-04/26) — recréer edges + poser paiements réels.
7. **Photo de cadrage incomplète** (ANOM-25 + 35 PARTIAL) — compléter audit + ratifier.
8. **Arbitrages expert métier bloquants** (~7) — à trancher avec Lyes.
9. **Migrations à moitié faites = pièges à copie** (ANOM-13/16/23) — purger avant reconstruire.
10. **Contradictions périmètre V1/P1** (ANOM-07/08) — trancher explicitement.
