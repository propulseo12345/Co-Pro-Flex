# Triage Partie C — Cadrage CoProFlex v2

**Date : 2026-06-24**

Classification des trous de couverture sur 17 domaines (146 trous au total).

## Totaux

| Statut | Nombre |
|--------|-------:|
| 🟢 COVERED | 33 |
| 🟠 PARTIAL | 83 |
| 🔴 OPEN | 30 |
| **Total** | **146** |

**Trous critiques encore OPEN : 6.**

### Domaines triés par nombre de trous non couverts (PARTIAL + OPEN) décroissant

| Domaine | COVERED | PARTIAL | OPEN | Non couverts | Total |
|---------|--------:|--------:|-----:|-------------:|------:|
| C.8 — Assemblées générales | 0 | 7 | 4 | **11** | 11 |
| C.12 — Ventes & état daté | 0 | 6 | 2 | **8** | 8 |
| C.14 — Conformité légale | 0 | 6 | 2 | **8** | 8 |
| C.17 — Transverse | 0 | 8 | 0 | **8** | 8 |
| C.5 — Recouvrement / impayés | 3 | 4 | 3 | **7** | 10 |
| C.10 — GED | 2 | 4 | 3 | **7** | 9 |
| C.6 — Factures fournisseurs & banque | 1 | 5 | 2 | **7** | 8 |
| C.7 — Clôture & annexes | 3 | 5 | 2 | **7** | 10 |
| C.9 — Maintenance | 3 | 5 | 2 | **7** | 10 |
| C.13 — Conseil syndical | 2 | 5 | 2 | **7** | 9 |
| C.15 — Portails copro & CS | 2 | 5 | 2 | **7** | 9 |
| C.16 — Multi-cabinet & pilotage | 1 | 5 | 2 | **7** | 8 |
| C.1 — Onboarding & reprise de mandat | 3 | 6 | 1 | **7** | 10 |
| C.11 — Communication | 2 | 6 | 1 | **7** | 9 |
| C.4 — Budget & appels | 4 | 2 | 2 | **4** | 8 |
| C.3 — Personnes & rôles | 5 | 3 | 0 | **3** | 8 |
| C.2 — Structure | 2 | 1 | 0 | **1** | 3 |

---

## 🔴 À griller (OPEN)

Trous sans aucune décision de couverture, à trancher en priorité. Triés par sévérité (critique d'abord), regroupés par domaine.

### C.1 — Onboarding & reprise de mandat

- **Reprise provisions travaux (102), avances art.18 (1032), opérations de travaux en cours** — *critique*
  - **Question :** quand un gros chantier est en cours à la bascule, recrée-t-on l'OPÉRATION (operation_id) pour que les annexes 4/5 et settle_works_balance fonctionnent, ou se contente-t-on de porter 102/1032 en comptes globaux ? (G24-AM5 ne couvre que la reprise d'une procédure de recouvrement ; G24-T6 couvre l'engagé futur, pas un chantier déjà engagé/réalisé.)
  - **Position experte :** prévoir une section « Travaux en cours » à la reprise qui crée une OPÉRATION (budget voté + cumul réalisé + solde 102/1032) ; repli minimal = au moins 102 + 1032 en comptes globaux + avertissement, jamais noyé dans « autres comptes » (décret art.14-2 I, art.18 loi 65-557, annexes 4/5).

### C.6 — Factures fournisseurs & banque

- **Écritures bancaires « directes » sans facture (agios, intérêts Livret A, frais, prélèvements)** — *critique*
  - **Question :** comment comptabiliser un mouvement bancaire sans facture en amont ? Il manque la « 3e voie » : créer l'écriture de contrepartie depuis le relevé (D7 ne décrit que le pointage pur, et le reste de la chaîne suppose une écriture préexistante).
  - **Position experte :** ajouter une 3e action sur la ligne de relevé, « Comptabiliser ce mouvement », distincte du pointage — pose une écriture équilibrée (512x + compte choisi) puis pointe la ligne. Défauts : agios/frais → 627 ou 661/662 ; intérêts Livret A travaux → 762 (côté fonds travaux) ; frais de relance → art.10-1. Voie qui ÉCRIT au GL → RPC atomique + revue adversariale (décret 2005-240 art.14-3).

### C.9 — Maintenance

- **Mise en concurrence / demande de devis (RFQ) — aucune modélisation** — *critique*
  - **Question :** faut-il modéliser en V1 une mise en concurrence interne (entité « consultation » + lignes « devis par tiers »), distincte de la marketplace gelée (D42), le devis retenu alimentant l'estimé de l'OS (D40) et l'engagé budget (D20/G24-T6) ?
  - **Position experte :** OUI en V1, pré-requis de l'art.21 (le gate CS de G24-T8 suppose des devis comparables). Modèle léger « consultation 1→N quotes », le devis retenu écrit estimated_amount de l'OS et crée une ligne dans commitments. Marketplace nationale = backlog (D42). À ne pas confondre avec G24-T8 (qui ne tranche que le seuil/gate).

### C.14 — Conformité légale

- **RGPD : aucune brique opérationnelle (registre des traitements, base légale, durées des DONNÉES, journalisation)** — *critique*
  - **Question :** quel palier RGPD V1 ? (B7 et D65-b ne couvrent qu'une micro-traçabilité.)
  - **Position experte :** palier (a) MINIMAL en V1 — registre statique des traitements + durée par catégorie de donnée + export « mes données » ; (b) purge/pseudonymisation auto en P1 ; (c) module DPO complet plus tard. Le syndic = RESPONSABLE, CoProFlex = SOUS-TRAITANT → DPA art.28. SÉPARER conservation des données personnelles (minimisation art.5) de celle des écritures comptables (10 ans) → effacement = pseudonymiser les coordonnées mais conserver les écritures (RGPD art.5/15/17/28/30).

- **Fiche synthétique de copropriété : livrable légal annuel, en P0 mais NON modélisé** — *critique*
  - **Question :** document généré à la volée (dérivé du GL) ou vraie entité versionnée par exercice (snapshot daté opposable) ? Les 15 rubriques (décret 2016-1822) se dérivent-elles de la base ?
  - **Position experte :** entité LÉGÈRE VERSIONNÉE par exercice (snapshot daté opposable, même logique que l'état daté D33). ~90 % des rubriques se dérivent du GL et de l'identité (RNIC via D65, ALUR via D67, impayés via G24-T5) → source unique GL, rendu HTML→PDF (AM1). Pré-requis : distinction lots principaux/annexes (acquise via G24-4). Loi 65-557 art.8-2, décret 2016-1822.

### C.15 — Portails copro & CS

- **Flux d'émission/renvoi/révocation des invitations portail** — *critique*
  - **Question :** le flux d'invitation complet (qui invite, renvoi, expiration, révocation, masse) est-il en V1, et le cas multi-copro = un seul compte auth + un membership par copro ? (A3 classe l'extranet en P0, mais seule la RPC d'acceptation est codée.)
  - **Position experte :** le flux DOIT être en V1, sinon le P0 « extranet » est fictif. 3 RPC (create_copro_invitation en masse / resend / revoke) + email Brevo (E3-q), un seul compte auth par personne, link_coproprietaire_account crée un membership par copro → multi-copro natif via le switcher D66 (décret 67-223 art.64-2, loi ALUR art.18 I 5°).

### C.4 — Budget & appels

- **Provision travaux décidés art.14-2 I (102) jamais mouvementée — confusion avec ALUR (105)** — *important*
  - **Question :** faut-il distinguer la PROVISION pluriannuelle pour travaux décidés (art.14-2 I → 102) de l'appel travaux ordinaire de l'exercice (→ 702) ? Un appel travaux débordant l'exercice doit-il créditer 102 plutôt que 702 ?
  - **Position experte :** en V1, garder works→702 pour les travaux votés/exécutés dans l'exercice ; documenter que la provision art.14-2 I (102) est un mécanisme distinct (travaux pluriannuels décidés non encore appelés), à brancher via operation_id (E4) en P1. Ne JAMAIS confondre 102 (art.14-2 I) et 105 (ALUR art.14-2 II). Risque : appel travaux mal logé faussant l'annexe 5.

- **Garde-fou « appel seulement sur budget validé » absent du chemin MANUEL** — *important*
  - **Question :** (1) descendre le contrôle de statut (budget = 'validated') À L'INTÉRIEUR de la RPC post_budget_call_for_funds (défense en profondeur) ? (2) comment modéliser la reconduction de budget art.14-1 al.3 ?
  - **Position experte :** (1) OUI — gardes au niveau serveur non contournables (cohérent B3/D24/D30) ; un appel sur budget non voté = créance illégale (art.14-1), le RPC doit REFUSER si ≠ 'validated'. (2) drapeau EXPLICITE de reconduction provisoire sur l'appel/l'exercice, jamais un contournement de la garde. Loi 65-557 art.14-1.

### C.5 — Recouvrement / impayés

- **Dépréciation des créances douteuses (491/492) : comptes présents, aucune écriture** — *important*
  - **Question :** V1 ou P1 ? Saisie manuelle au jugement ou barème d'ancienneté auto ? S'impute-t-elle au budget courant ?
  - **Position experte :** P1 pour l'écriture (D68x/C491), mais modéliser la porte dès V1. En copro la dépréciation est une charge collective → saisie MANUELLE au stade jugement/risque avéré, jamais automatique. V1 = afficher solde 459 + voyant « créances à risque » ; prérequis = la reclassification 459 doit exister d'abord. Décret 2005-240 (prudence), comptes 49x.

- **Intérêts de retard art.36 / clause pénale : mentionnés, jamais calculés** — *important*
  - **Question :** gère-t-on les intérêts dès la MED ou seulement en mention/chiffrage au contentieux ? Taux légal versionné (config cabinet) ou clause pénale par copro ?
  - **Position experte :** V1 = NE RIEN AFFICHER DE FAUX. Poser une base « intérêts » optionnelle (départ = date MED, taux légal versionné par semestre, utilitaire indicatif). L'ÉCRITURE des intérêts = P1 ; clause pénale = champ optionnel par copro = P1. Essentiel V1 = tracer la date de MED (point de départ légal). CC art.1231-6, décret 67-223 art.36.

- **Plan d'apurement (échéancier négocié) : aucune entité, aucun suivi** — *important*
  - **Question :** V1 ou P1 ? Un plan suspend-il les relances tant qu'il est respecté, alerte-t-il en cas de rupture, reprend-il l'escalade D59 ?
  - **Position experte :** table `payment_plan` MINIMALE dès V1 (échéances datées + statut actif/respecté/rompu), un seul effet métier : pause ciblée des relances auto tant que respecté. AUCUNE écriture (seul l'encaissement réduit le solde 45x). Rupture = alerte + reprise de l'escalade D59 au stade atteint. Attendu fort des syndics, coût faible. CC art.1342-10.

### C.7 — Clôture & annexes

- **Quitus au syndic : pur informatif, sans lien aux comptes** — *important*
  - **Question :** le quitus est-il une simple trace de vote (accordé/refusé/non soumis), sans effet comptable, et explicitement DÉCOUPLÉ d'approve_period ?
  - **Position experte :** persister le résultat du vote quitus sur l'exercice comme trace forte, SANS effet GL, et JAMAIS coupler quitus et approbation (approbation des comptes ≠ quitus). Drapeau d'alerte « comptes approuvés mais quitus refusé ». Champ événementiel (porté par la résolution AG).

- **Annexe 2 : produits et résultat travaux incomplets (bloc travaux sans produits ni résultat)** — *important*
  - **Question :** l'annexe 2 présente-t-elle uniquement le résultat COURANT (→120, travaux renvoyés en 4/5), et faut-il un invariant de réconciliation au centime (solde courant annexe 2 == part 120 reportée ; total travaux 4/5 == part 110) ?
  - **Position experte :** annexe 2 = résultat courant, travaux détaillés en 4/5 ; AJOUTER un invariant de contrôle bloquant garantissant la cohérence 110/120 entre annexes et écriture d'à-nouveau — à cadrer comme gate de clôture (décret 2005-240, arrêté 14/03/2005, annexes 2/4/5).

### C.8 — Assemblées générales

- **Seconde convocation / nouvelle assemblée après échec quorum ou majorité art.25** — *important*
  - **Question :** gère-t-on en V1 une AG liée (re_convocation_of_ag_id) reprenant les résolutions non adoptées, votées cette fois à l'art.24, avec alerte de délai 3 mois ? Ou trop rare pour V1 ?
  - **Position experte :** V1 = traçabilité légère obligatoire — champ `re_convocation_of_ag_id` + alerte du délai 3 mois + assistant « reprendre les résolutions non adoptées » avec bascule auto en art.24. Sans ce lien, la régularité de la décision n'est pas prouvable (art.25-1). Coût faible, enjeu de validité réel.

- **Privation et exclusion du droit de vote (débiteur, conflit d'intérêt, syndic candidat, art.24 II)** — *important*
  - **Question :** (A) exclusion manuelle assistée (coche + motif au PV) vs (B) détection auto des conflits ; la privation art.24 II est-elle gérée comme un mécanisme de clé spéciale plutôt qu'un flag is_excluded ?
  - **Position experte :** V1 = exclusion manuelle assistée (A) avec motif obligatoire au PV ; la privation art.24 II se gère par la clé spéciale ; détection auto de conflit (B) = P1. ATTENTION : pas de privation générale pour impayé en droit copro — cadrer les cas légitimes (intérêt opposé art.24 II ; syndic candidat). Art.24 II loi 65-557 + jurisprudence.

- **Neutralisation des votes par correspondance sur résolution amendée en séance (art.17-1 A)** — *important*
  - **Question :** sur une résolution amendée en séance, les votes par correspondance sont-ils (A) TOUS neutralisés, (B) seuls les « pour », ou (C) au cas par cas ? Qui marque la résolution « amendée » ?
  - **Position experte :** (A) neutralisation automatique de TOUS les votes par correspondance dès amendement (art.17-1 A al.3 : le votant devient défaillant, la loi ne distingue pas pour/contre). Flag `is_amended` + bouton « marquer résolution amendée » (président/gestionnaire) qui bascule is_excluded avec motif art.17-1 A. Loi 65-557 art.17-1 A al.3.

- **Feuille de présence : signature, émargement, arrivées/départs en séance, cohérence présence/vote en indivision** — *important*
  - **Question :** (1) exige-t-on l'émargement + certification par le président (art.14 décret) comme annexe obligatoire du PV ? (2) un copro parti (left_at) est-il écarté des votes postérieurs ? (3) accepte-t-on l'asymétrie présence (poids plein quorum) vs vote (quote-part réelle indivision) ?
  - **Position experte :** (1) feuille émargée et certifiée = annexe obligatoire du PV ; (2) exploiter left_at pour refuser tout vote « live » après départ ; (3) conserver l'asymétrie (cohérent G24-2). Décret 67-223 art.14. G24-2 règle le vote unique de l'indivision mais pas la feuille de présence.

### C.10 — GED

- **Versioning : déclenchement réel d'une nouvelle version et immutabilité des anciennes** — *important*
  - **Question :** (a) version = même document, re-upload explicite (create_document_version, ancien file_path conservé, change_summary obligatoire) ? (b) un RCP modificatif = version OU nouveau document lié ? (c) un PV corrigé = version ou nouveau document ?
  - **Position experte :** version = re-upload explicite du MÊME acte avec change_summary obligatoire et zéro écrasement (immutabilité calquée sur le GL) ; un RCP MODIFICATIF = acte juridique NOUVEAU → nouveau document lié (document_relations) ; un PV rectificatif = acte distinct → nouveau document lié (le PV erroné reste consultable). Cohérent art.17/33 décret 67-223.

- **Convention de classement / arborescence par défaut (dossiers système)** — *mineur*
  - **Question :** seeder une arborescence système à la création de chaque copro (dossiers is_system non supprimables, category_default) et déduire le dossier de la CATÉGORIE plutôt que par choix libre ?
  - **Position experte :** oui, ~8 dossiers système par copro (AG, Comptabilité, Appels de fonds, Contrats, Diagnostics, Assurances, Mutations, Correspondance), chacun avec un category_default ; le rangement se DÉDUIT de la catégorie, surchargeable. Faible enjeu juridique, fort gain UX.

- **Déduplication et intégrité des fichiers (file_hash présent mais non exploité)** — *mineur*
  - **Question :** calculer un SHA-256 à l'upload pour (1) détecter les doublons et (2) sceller l'intégrité des pièces juridiques ? Avertissement non bloquant ou refus sur doublon ?
  - **Position experte :** SHA-256 calculé côté server function, stocké dans file_hash ; collision dans la même copro → avertissement non bloquant ; pour les actes probants (PV signé, état daté), le hash = SCEAU d'intégrité affiché et figé. Enjeu mineur mais bon filet anti-altération.

### C.11 — Communication

- **Notifications in-app (cloche) : type modélisé front mais aucune table en base** — *important*
  - **Question :** crée-t-on en V1 une vraie infra de notifications applicatives (table `notifications` générique, distincte des emails, avec Realtime), ou dérive-t-on la cloche des vues worklist/todos (D70) en reportant le temps réel en P1 ?
  - **Position experte :** table `notifications` dédiée dès V1, distincte du canal email (un événement = 0..N notifs + 0..1 email). L'auto-population (D31/D32/D69/D70) produit déjà les événements. Les vues worklist répondent au « quoi faire », pas au « on vient de me notifier de X » — deux besoins distincts. Non abordé dans aucune décision D/E/G24.

### C.12 — Ventes & état daté

- **Frais d'état daté (plafond 380 € TTC, décret 2020-153) absents du modèle et des décisions** — *important*
  - **Question :** ces honoraires sont-ils (A) un champ informatif hors GL copro, ou (B) inscrits au 450 du vendeur puis reversés au syndic ? Barème configurable par cabinet ?
  - **Position experte :** Option A — honoraires d'état daté = recette du SYNDIC, PAS du syndicat → hors GL copro. Champ etat_date_fee_amount plafonné à 380 € TTC, affiché sur l'état daté, défaut configurable par cabinet. À NE PAS confondre avec les frais de recouvrement art.10-1 (eux au 450 du débiteur). Décret 2020-153, art.10-1 II loi 65-557.

- **Créances opposables : périmètre « liquides et exigibles » et privilège immobilier (4 ans)** — *important*
  - **Question :** sur quel montant former l'opposition art.20 — pas la Partie 1 brute, mais les seules créances LIQUIDES ET EXIGIBLES (échues + reliquats d'exercices approuvés + déchéance du terme + frais art.10-1), en EXCLUANT les provisions non échues ? Distingue-t-on la part privilégiée de la chirographaire ?
  - **Position experte :** record_mutation_opposition NE recopie PAS la P1 brute → montant opposable = solde 450 débiteur EXIGIBLE à l'avis, provisions non échues exclues ; jsonb causes par nature ; partition privilégié/chirographaire portée par la P1. Art.20/19/19-1 loi 65-557, art.2374 CC.

### C.13 — Conseil syndical

- **Éligibilité au conseil syndical (art.21) : qui peut être élu et incompatibilités** — *important*
  - **Question :** blocage DUR du syndic/ses préposés ? Tolérance en avertissement des éligibles élargis (conjoint/PACS, ascendants/descendants, mandataire de PM, usufruitier/NP) ? La perte d'éligibilité par vente = retrait auto ou manuel ?
  - **Position experte :** V1 = (1) interdiction DURE d'élire le syndic ou un préposé (ordre public art.21) ; (2) éligibilité élargie TOLÉRÉE avec avertissement ; (3) perte d'éligibilité par vente → ALERTE de retrait non silencieuse confirmée par le gestionnaire (cohérent D51, jamais de delete). Loi 65-557 art.21.

- **Comptes 624 (frais CS) et 706 : usage comptable du conseil syndical non modélisé** — *mineur*
  - **Question :** compte dédié 624 (PCG d'entreprise) ou charge ordinaire d'administration ventilée sur la clé générale ? Existe-t-il un produit 706 propre au CS ?
  - **Position experte :** pas de feature dédiée — frais du CS = charge ordinaire d'administration ventilée sur la clé générale (poste « Frais de conseil syndical »), sans forcer un 624 (le plan comptable du décret 2005-240 prime) ; le 706 n'a aucun usage propre au CS. À acter comme « non-feature ».

### C.16 — Multi-cabinet & pilotage

- **Facturation du SaaS au cabinet (billing éditeur ↔ tenant)** — *important*
  - **Question :** confirme-t-on le hors-scope V1 explicite, en posant tout de même deux briques sans coût — (1) figer l'unité tarifaire pressentie, (2) un champ cabinets.status (actif/suspendu/résilié) ?
  - **Position experte :** hors-scope V1, mais figer dès maintenant l'unité tarifaire = par lot principal géré (cohérent G24-4) + ajouter cabinets.status nullable ; brique billing complète (subscription/plan + Stripe) en P1/P2. Décision sans dette technique.

- **Équipe cabinet : multi-membres et rôles intra-cabinet (admin/gestionnaire/comptable/assistant)** — *important*
  - **Question :** V1 = gestionnaires indifférenciés voyant tout, ou pose-t-on (1) un rôle admin_cabinet distinct, (2) responsible_manager_id nullable sur la copro pour le « référent » et le filtrage « mes copros » ?
  - **Position experte :** V1 simple (tous les gestionnaires voient tout le portefeuille) MAIS préparer le modèle avec admin_cabinet (white-label/honoraires/équipe non modifiables par n'importe qui — recoupe platform_admin) et responsible_manager_id ; répartition fine en P1. À cadrer car impacte la RLS dès la baseline v2 (B5).

---

## 🟠 Sous-questions résiduelles (PARTIAL)

Trous dont le principe est couvert mais qui gardent une question résiduelle à trancher.

### C.1 — Onboarding & reprise de mandat

- **Report à nouveau par nature (110/120→12/478) vs soldes par lot (450)** — *couvert par* D2, D5, B3. *Résiduel :* structure exacte de l'écriture d'ouverture (que met-on en 478/12 vs somme des 450 par lot, double emploi à éviter), et le résidu 471/472 doit-il tendre vers 0 (tampon) ou rester ? Position : distinguer (1) soldes 450 par lot, (2) report 478/12 = résultat antérieur non affecté ; 471/472 = tampon devant tendre vers 0, jamais une poubelle (art.6 décret 2005-240).
- **Fonds ALUR (105) éclaté par lot vs réserve globale** — *couvert par* A3, D7, D33. *Résiduel :* le TIMING de capture à la reprise. Position : capter la ventilation 105 par lot DÈS la reprise même si l'UI d'éclatement reste P1 ; repli = global + note par lot, dette assumée (ALUR art.14-2 II).
- **Immatriculation RNIC absente du flux** — *couvert par* D65, A3, G24-1. *Résiduel :* le GATING (obligatoire en « Reprendre », facultatif en « Créer » ?). Position : obligatoire en « Reprendre », facultatif + tâche de conformité en « Créer », jamais bloquant pour produire un appel (CCH L711-1 à L711-6).
- **Reprise des opérations courantes (impayés, factures fournisseurs non réglées)** — *couvert par* G24-AM5, E2/G24-T5 (volet créances OK). *Résiduel :* factures fournisseurs — 401 global vs facture par facture. Position : reprendre les factures INDIVIDUELLEMENT (réglables/rapprochables une à une) ; un 401 global casse le règlement et le rapprochement (loi 65-557 art.10-1/36/14-3).
- **Définition du « minimum pour démarrer » et gating** — *couvert par* D1, D3, D4, D10, G24-T7, B0. *Résiduel :* formaliser le contrat « copro opérationnelle » et la frontière bloquant-dur/avertissement. Position : contrat = {≥1 lot ; quote-part clé générale ; Σ tantièmes = total (avertissement) ; ≥1 propriétaire/lot ; ≥1 compte 512 ; clé générale complète} ; en reprise + balance d'ouverture postée ; bloquants DURS = uniquement ce qui rend une écriture impossible.
- **Date d'effet de la reprise vs faux N-1** — *couvert par* D1, D29, G24-AM8, S6. *Résiduel :* les deux modes (A : 1er jour d'exercice / B : mi-année avec charges courues) et la fabrication d'un faux N-1. Position : assumer les deux modes ; NE PAS fabriquer de faux N-1 (afficher « pas de comparatif — 1re année »), sinon pollution du GL (art.14-3/art.6).

### C.2 — Structure

- **Mutation en indivision / démembrement (acquéreur figé à 100 %)** — *couvert par* D35, D8, G24-2. *Résiduel :* validate_mutation reste sur UN acquéreur. Position : réutiliser le moteur d'indivision de D8 à l'entrée de la mutation — autoriser N acquéreurs (somme=100 %, is_primary = mandataire art.23) + flag démembrement (G24-2) ; cérémonie guidée = V1+ (art.23 loi 65-557, décret 67-223).

### C.3 — Personnes & rôles

- **Sous-rôles dans un cabinet et périmètre de copros par gestionnaire** — *couvert par* G24-SCOPE, B5, E1. *Résiduel :* cabinet mono ou multi-utilisateurs en V1, sous-rôles et périmètre par gestionnaire ? Position : prévoir DÈS la baseline une table d'affectation gestionnaire↔copros + enum de sous-rôle (gestionnaire/comptable/lecteur), même si RLS V1 permissive — sinon faille RGPD de minimisation + rétro-installation lourde (loi Hoguet, RGPD).
- **Lien personne ↔ compte utilisateur (multi-copro/multi-cabinet)** — *couvert par* D66, D69/D69-bis, A1. *Résiduel :* modèle d'identité du compte copropriétaire au portail (1 compte agrégeant N fiches vs N comptes ; email partagé couple/indivision). Position : 1 compte auth = 1 personne, relié à N fiches via memberships + switcher symétrique au gestionnaire ; email partagé : inviter le mandataire is_primary par défaut. À cadrer AVANT de coder le portail (art.23, RGPD).
- **Conseil syndical : éligibilité, incompatibilité syndic-CS** — *couvert par* D50/D51, D52. *Résiduel :* garde d'ÉLIGIBILITÉ à l'élection. Position : avertissement non bloquant en V1 (alerte si pas de lot actif) ; garde DURE pour le seul cas du membre CS = gestionnaire/syndic (incompatibilité art.21).

### C.4 — Budget & appels

- **Route d'appel d'avance art.35 (fonds de roulement)** — *couvert par* D13, D67. *Résiduel :* (1) plafond légal (1/6 du budget, art.35-1) = avertissement/blocage/non contrôlé ? Position : avertissement non bloquant. (2) restitution de l'avance au vendeur = V1 ou P1 ? Position : P1 (l'avance suit le lot via l'état daté, comme l'ALUR D33).
- **Révision/régularisation de budget en cours d'exercice** — *couvert par* D25, D23 (volet affectation OK). *Résiduel :* (a) RÉVISION en cours d'exercice et (b) RÉGULARISATION de fin d'exercice. Position : régularisation (b) INDISPENSABLE en V1 (mécanique légale de répartition des charges réelles art.14-1) ; révision (a) peut être P1 si rare, mais trancher explicitement (sinon un budget rectificatif n'a aucun chemin). Ne pas fusionner les trois logiques.

### C.5 — Recouvrement / impayés

- **Reclassement en créance douteuse (459)** — *couvert par* E4-q, D59. *Résiduel :* crée-t-on reclass_doubtful_receivable (D459/C450-x, écriture de présentation, motif obligatoire) ancrée stade 3/4, manuelle et non bloquante ? Position : oui, intégrée au socle E4-q comme 5e voie de correction (art.5 décret 2005-240, compte 459).
- **Écriture comptable des frais art.10-1** — *couvert par* D61, D60, G24-T6/T5 (principe OK). *Résiduel :* détail comptable — (a) sous-compte 450 dédié hors FIFO ? (b) contrepartie 714 ? (c) nom/signature RPC ? (d) structure de la table de barème ? Position : sous-compte 450-6 hors FIFO, produit dédié, RPC atomique avec motif, table de barème scopée (art.10-1).
- **legal_proceedings : table sans RPC d'écriture** — *couvert par* D57, D59, G24-T9. *Résiduel :* (a) stade porté par legal_proceedings (4-7) vs dérivé (1-3) ? (b) frais huissier/avocat avancés puis refacturés ? (c) déclencheur du contentieux ? Position : RPC record_legal_proceeding (jamais d'INSERT front), stades 4-7 sur la procédure ; frais d'acte = sortie de trésorerie puis refacturation art.10-1 (même route que le trou frais) ; contentieux = geste manuel après MED sans effet.
- **Grain de relance par lot vs lettre par personne (indivision)** — *couvert par* D16, D8/G24-2. *Résiduel :* destinataire de la relance en indivision. Position : relance AMIABLE au seul mandataire is_primary ; MISE EN DEMEURE à CHAQUE indivisaire tenu de la dette (solidarité art.815-17 CC) sinon inopposable.

### C.6 — Factures fournisseurs & banque

- **Lookup du compte de trésorerie (code rigide 512)** — *couvert par* G24-T7, D21. *Résiduel :* (1) défaut intelligent par nature (travaux→512100, courant→512000) ; (2) propagation de p_bank_account_id à TOUTES les RPC de décaissement (409, settle_works_balance…). Position : figer un défaut par charge_nature (éditable) et imposer p_bank_account_id obligatoire sur toutes les RPC de décaissement.
- **Cut-off / verrou de période sur la chaîne facture-banque** — *couvert par* D26, D63, G24-AM8, G24-T6, G24-T11. *Résiduel :* garde serveur spécifique (validate_supplier_invoice et post_supplier_payment refusent-ils une période non ouverte ?). Position : oui — rattachement de la charge à la période de prestation, décaissement sur la période ouverte d'encaissement, garde serveur dans validate ET post (art.14-3).
- **Traçabilité du moyen de paiement réel (chèque, IBAN, SEPA)** — *couvert par* D21, G24-T7. *Résiduel :* champs conditionnels au method vs champ reference fourre-tout, statut « chèque émis non débité ». Position : champs conditionnels au moyen ; le chèque ne change pas la date d'écriture mais accepte un pointage différé ; prévoir un payment_batch nullable pour le lot SEPA (P1).
- **TVA des factures fournisseurs** — *couvert par* D55, D19. *Résiduel :* copro strictement non-assujettie vs régime optionnel avec TVA déductible 44566. Position : V1 = non-assujettie (TVA dans la charge) MAIS fiabiliser HT/TVA/taux par ligne pour Factur-X + flag is_vat_liable au niveau copro pour brancher la TVA déductible en P1 (CGI art.260-2°).
- **Ingestion bancaire automatique + cohérence multi-comptes** — *couvert par* D7, G24-T7, E2-q. *Résiduel :* expiration du consentement DSP2 (90 jours). Position : alerte de ré-consentement à J-7 + import CSV manuel toujours disponible comme filet (DSP2/Open Banking).

### C.7 — Clôture & annexes

- **Complément annexe 1 : régularisation par copropriétaire câblée à 0** — *couvert par* D23, E8-q. *Résiduel :* l'annexe 1 dérive-t-elle de result_allocation agrégé par personne, définition de solde_avant/solde_après. Position : dériver intégralement du GL (mouvement tagué result_allocation), jamais de valeur stockée (art.11 décret 2005-240).
- **Annexe 3 (charges par clé) renvoyée à 0** — *couvert par* D19, D20, D9. *Résiduel :* source unique du lien charge→clé (ligne d'écriture vs budget_line vs défaut compte) + périmètre des colonnes V1. Position : ventiler via account_id→budget_line→repartition_key_id, livrer dès V1 les 3 colonnes (réalisé N + voté N + réalisé N-1) ; trancher la précédence de la clé portée sur la LIGNE (art.10 + annexe 3).
- **Traçabilité AG↔exercice + date d'approbation** — *couvert par* E8-q, D23, D24, G24-AM2. *Résiduel :* ajouter approved_by_ag_id + approved_by_resolution_id sur accounting_periods et faire recevoir held_at par approve/regularize_period. Position : oui sur les deux (date métier des écritures d'affectation = date de tenue de l'AG, art.14-1).
- **Vote du budget par catégorie de charges (art.24 II)** — *couvert par* D9, G24-T8. *Résiduel :* le vote du budget reste-t-il global par défaut, le modèle par clé (D9) ne s'activant que sur charges spéciales ? Position : oui, vote global par défaut mais ne pas figer un modèle mono-clé — réutiliser repartition_key_id (art.24 II, annexe 3).
- **Réouverture interdite mais voie de RÉGULARISATION sur N+1** — *couvert par* E4-q. *Résiduel :* une charge/produit oublié se régularise-t-il via 672/772 datés N+1, avec source_type dédié ? Position : oui, 672/772 datés N+1 tracés par un source_type explicite, entrant dans le résultat N+1 ; ne jamais rouvrir l'exercice approuvé.

### C.8 — Assemblées générales

- **Base de calcul de la majorité art.24 (dénominateur)** — *couvert par* D30, business-rules.md. *Résiduel :* valider que le moteur SQL implémente le seuil floor(tantièmes_présents/2)+1 (abstentions neutres) et NON for>against. Position : auditer empiriquement calculate_resolution_result sur le golden et corriger si for>against subsiste. Point le plus grave (invalide potentiellement chaque AG).
- **Orchestration de la seconde lecture (art.25-1/26-1)** — *couvert par* D31, D30. *Résiduel :* l'ORCHESTRATION UX (bouton « second vote immédiat » assisté par le président, même séance). Position : orchestration assistée (le système propose, le président déclenche), à formaliser comme décision UX du module AG live v2.
- **Majorité calculée sur la clé spéciale (art.24 II)** — *couvert par* D9, D13-bis. *Résiduel :* généraliser calculate_resolution_result, cast_vote ET compute_ag_quorum via coalesce(resolution.repartition_key_id, clé générale) ; cast_vote refuse-t-il les copros hors-clé ? Position : oui aux trois (art.24 II) ; tâche moteur car D9 ne nomme pas cast_vote/compute_ag_quorum.
- **Opposabilité des pièces obligatoires de convocation** — *couvert par* A3, A5/E12-q, D13-bis, D45. *Résiduel :* (1) garde au niveau résolution (devis lié réel) ET AG (5 annexes) ? (2) bloquantes sur le noyau de nullité ? (3) fiche synthétique exigée pour l'AGO ? Position : gardes serveur à deux niveaux, BLOQUANTES sur le noyau de nullité (art.11/11-1 décret 67-223), branchées sur les vrais docs GED ; fiche synthétique obligatoire pour l'AGO.
- **PV : contenu légal, opposants nominatifs, signature, délai** — *couvert par* D64, D46, D31. *Résiduel :* (1) PV généré depuis les données (opposants/défaillants nominatifs) ? (2) signature du bureau = précondition de pv_signed ? (3) notification branchée sur ag_envoi_tracking (délai 2 mois art.42) ? Position : oui aux trois (décret 67-223 art.17/18, loi art.42).
- **Exception au plafond de 3 mandats art.22 (seuil 10 %)** — *couvert par* A3, D30. *Résiduel :* autorise-t-on >3 pouvoirs si total des voix ≤ 10 % ? Position : implémenter la règle exacte art.22 al.3 — save_ag_pouvoir refuse seulement si (mandats > 3 ET total > 10 %) ; un « 3 max » strict bloque illégalement les petites copros.
- **Éligibilité au CS à l'élection (ELECT_COUNCIL)** — *couvert par* D50, D51. *Résiduel :* contrôle d'éligibilité au moment de l'élection. Position : V1 = alerte non bloquante (socle « copropriétaire actif » + avertissement si syndic/proche élu) ; contrôle complet des incompatibilités = P1 (art.21, décret 67-223 art.22).

### C.9 — Maintenance

- **Sinistres & gestion des dommages** — *couvert par* D38. *Résiduel :* entité « sinistre » structurée + flux comptable indemnité/franchise en V1 ou P1 ? Position : entité légère structurée dès V1 (déclenche OS + impacte les comptes), volet comptable en saisie assistée P1 (art.9-1 loi 65-557, convention IRSI).
- **Génération auto des OS récurrents** — *couvert par* E2-q, D15, D38. *Résiduel :* le cron crée-t-il un OS draft puis avance next_planned_intervention, ou simple alerte ? Position : créer l'OS auto en « draft » (jamais « sent », cohérent D15) puis recaler next_planned_intervention — activer la capacité dormante.
- **Contenu légal du carnet d'entretien (décret 2001-477)** — *couvert par* D38, AM1, D45. *Résiduel :* carnet réglementaire généré en V1 comme document agrégé, ou simple journal en repoussant le carnet conforme P1 ? Position : générer le carnet réglementaire en V1 comme VUE AGRÉGÉE piochant l'existant (contrats, assurances, OS clos, PPT), rendu PDF (art.18-1, décret 2001-477).
- **Résiliation de contrat & préavis Chatel (L215-1)** — *couvert par* D45, D70, D64, G24-T11. *Résiduel :* (a) alerte date limite de dénonciation Chatel ? (b) courrier de résiliation via D64 ? (c) status='terminated' via RPC ? acte gestionnaire libre OU vote d'AG ? Position : oui aux trois (LRAR P1) ; résiliation = acte gestionnaire pour un non-renouvellement, mais le CHANGEMENT de prestataire > seuil retombe sous le gate art.21/AG.
- **Cohérence du cycle de statut OS** — *couvert par* Décision #7, business-rules.md, G24-T11. *Résiduel :* garde-t-on les 9 statuts de l'enum SQL comme source canonique avec mapping FR 1:1 ? Position : oui — l'enum SQL + sa machine de transitions est canonique, libellés FR 1:1, aligner business-rules.md dessus.

### C.10 — GED

- **Durée de conservation légale par nature** — *couvert par* D45. *Résiduel :* qui peut outrepasser un blocage de suppression et comment ? Position : aucune suppression hard avant terme ; purge d'un doc à rétention expirée réservée au gestionnaire avec motif tracé ; is_permanent (PV/EDD/RCP, art.8) = bloqué à vie. Confirmer la table document_retention_rules seedée.
- **Auto-classement des pièces générées dans la GED** — *couvert par* D43. *Résiduel :* (a) toute pièce générée s'enregistre via un helper register_generated_document ? (b) sort du système parallèle ag_documents ? Position : un seul référentiel = documents, ag_documents dégradé en journal technique avec document_id obligatoire ; chaque générateur appelle le helper.
- **Checklist de pièces obligatoires de la copropriété** — *couvert par* D56, D70. *Résiduel :* table document_requirements + vue v_copro_document_compliance + liste de référence ? Position : oui, référentiel seedé (RCP + EDD art.8 ; diagnostics ; carnet ; PPT ; fiche synthétique ; assurance ; PV des 3 dernières AG), applicabilité branchée sur D56, en aide non bloquante alimentant les todos D70.
- **Journalisation des accès aux documents (document_access_log)** — *couvert par* D44, G24-T9. *Résiduel :* grain, point d'alimentation, rétention ? (G24-T9 n'a tranché que deux mécanismes ciblés, pas le journal d'accès.) Position : table document_access_log alimentée UNIQUEMENT par la server function délivrant l'URL signée ; ne logguer d'abord que les téléchargements ; purge auto à 1 an (RGPD/CNIL). À confirmer comme 3e mécanisme.

### C.11 — Communication

- **Valeur probante de l'envoi : date et preuve d'expédition** — *couvert par* G24-T9, E8-q, D60, D46. *Résiduel :* faut-il TROIS horodatages (expédition / référence de preuve / réception) et garantir que les 21 jours francs lisent la date d'EXPÉDITION via l'horloge métier (E8-q) ? Position : oui aux 3 horodatages, le délai légal ne se calcule jamais sur un horodatage technique (art.13 décret 67-223).
- **Migration tracking Resend → Brevo** — *couvert par* E3-q, B7. *Résiduel :* modèle de tracking fournisseur-AGNOSTIQUE (provider, provider_message_id, event_type, payload jsonb) ? règles de retour (hard bounce → papier, unsubscribe → coupe non-légales, signature webhook obligatoire) ? Position : modèle normalisé agnostique + hard bounce → repli papier + unsubscribe → coupe non-légales + signature webhook obligatoire.
- **Préférences de communication granulaires** — *couvert par* G24-T10. *Résiduel :* le grain par copro suffit-il à honorer l'opt-out RGPD sur les communications NON légales ? Position : conserver la préférence de canal par copro pour le routage, MAIS prévoir au moins un opt-out individuel sur les catégories non légales (exigence RGPD). À confirmer avec USER vu la simplification G24-T10.
- **Idempotence et reprise des envois en masse** — *couvert par* D22, D32, D7. *Résiduel :* écrit-on la ligne de trace en 'pending' AVANT l'appel provider, avec une clé d'idempotence (ag_id, coproprietaire_id, canal) empêchant la double convocation ? Position : oui — calquer le mécanisme D32 sur le dispatch (trace pré-écrite + clé d'idempotence + rejeu ciblé), enjeu juridique (délai 21 j).
- **Drift de schéma des destinataires (colonnes FR inexistantes)** — *couvert par* principe « un seul chemin par feature », G24-1. *Résiduel :* désigner nommément la source projetée unique des destinataires (ex. v_coproprietaires_overview avec display_name calculé). Position : centraliser sur une vue/RPC de lecture unique, grep des appelants réels avant de figer la signature.
- **Modération du mur et traçabilité** — *couvert par* D47. *Résiduel :* suppression DURE actuelle vs soft-delete auditable (is_hidden + hidden_by + motif) + signalement léger ? Position : minimum V1 = soft-delete + horodatage de l'acte de modération (responsabilité d'hébergeur LCEN, droit à l'effacement RGPD art.17) ; signalement structuré P1.

### C.12 — Ventes & état daté

- **RPC d'opposition art.20 (record_/settle_mutation_opposition) inexistantes** — *couvert par* D36, D33, D34. *Résiduel :* construction technique des deux RPC — (a) record_mutation_opposition fige montant/causes/deadline+15j SANS écriture ; (b) settle réutilise le chemin de paiement standard (D33) ? (c) déclenchement = nudge dès solde > 0 ? Position : construire les deux, settle RÉUTILISE post-paiement standard, record reste hors GL, opposition nudgée jamais bloquante (art.20 loi 65-557).
- **Pré-état daté comme livrable distinct (art.20) / qui déclenche les 15 jours** — *couvert par* D36, E9-q. *Résiduel :* (a) pré-état et état daté = deux contenus ou même pièce à deux dates ? (b) matérialiser l'avis de mutation (déclencheur des 15 j) ? (c) compte à rebours sur opposition_deadline ? Position : garder snapshot_type 'pre'/'final' ; modéliser l'avis de mutation comme événement saisi (avis_mutation_date → deadline +15 j → todo daté) ; distinguer « avis reçu » de « état daté généré » (art.20, art.5 décret 67-223).
- **Répartition vendeur/acquéreur à la date d'effet** — *couvert par* D33, D11, D23. *Résiduel :* confirmer la règle art.6-2 (résultat à l'acquéreur, pas de pro rata temporis auto) et l'AFFICHER sur l'état daté. Position : règle légale art.6-2, pas de pro rata auto (le pro rata conventionnel est du ressort de l'acte notarié) ; rendre ce point explicite sur l'état daté.
- **Clôture du compte vendeur (jalon 6) mockée** — *couvert par* D33, D34, G24-T5. *Résiduel :* que vérifie le jalon, branche-t-on get_lot_balance_45x à l'effective_date, impose-t-on un choix si solde ≠ 0 ? Position : non bloquant (D34) MAIS contrôle réel + issue forcée (opposition/recouvrement/abandon motivé) ; pas de « completed » silencieux sur solde non nul ; découpler du marquage de la signature.
- **Enum mutation_status incohérent** — *couvert par* D24, G24-T11. *Résiduel :* garder 'signed' (acte signé, transfert différé) ou le supprimer ? Position : aligner statut et jalons sur une échelle linéaire, chaque statut posé par une RPC ; CONSERVER 'signed' ≠ 'validated' (transfert consommé) ; documenter la table de transition.
- **Notaire masqué côté copropriétaire + traçabilité envoi (volet traçabilité COUVERT)** — *couvert par* G24-T9, D46, D41, E3, B5, D44. *Résiduel :* le volet RLS — aucune décision n'ÉNONCE « ventes/état daté/opposition = strictement gestionnaire-only en RLS FORCE, aucune policy copro ». Position : acter l'absence de toute policy copro sur ce domaine (FORCE), le notaire n'étant jamais un utilisateur de l'app.

### C.13 — Conseil syndical

- **Tables council_decisions / council_votes : demi-feature orpheline** — *couvert par* D52, G24-T8. *Résiduel :* ajouter linked_service_order_id / linked_contract_id en FK ? avis = vote pondéré (council_votes) ou avis unique gestionnaire ? Position : ajouter les deux FK (RESTRICT) ; avis unique saisi par le gestionnaire en V1, vote pondéré = capacité OPTIONNELLE/P1. À acter dans une décision dédiée.
- **Élection du président du CS** — *couvert par* D50. *Résiduel :* découpler ELECT_COUNCIL (membres) d'une action « Désigner le président » (le président est désigné par les membres, art.22 décret) ; CS sans président actif ? Position : découpler — RPC set_council_president (saisie gestionnaire, ≤1 président actif), cas « pas de président » fonctionnel non bloquant.
- **Droit d'accès du CS aux pièces (GL, devis, contrats)** — *couvert par* D69/VIS-3CERCLES, D44, D65-b/G24-T9. *Résiduel :* (1) vues DÉDIÉES conseil (security_invoker + RLS is_council_member) ? (2) journaliser les consultations du CS sur le GL ? « demande de pièce » V1 ou P1 ? Position : vues dédiées conseil (jamais réutiliser les vues gestionnaire) ; journaliser les accès GL du CS ; « demande de pièce » = P1.
- **Délégation de pouvoir au CS (art.21-1 / 25-a)** — *couvert par* D52, A3. *Résiduel :* modéliser la délégation comme capacité dormante dès maintenant (DELEGATE_TO_COUNCIL + plafond + compte rendu) ? Position : confirmer V1 = consultation/avis uniquement (acquis D52) ; réserver le crochet de la délégation comme capacité dormante non activée ; activation = P1.
- **Annexion de l'avis ponctuel du CS sur un marché (art.21)** — *couvert par* D53, D9/D13-bis, D56. *Résiduel :* lier l'avis (council_decision) à la résolution concernée ; à la génération de convocation, alerter « avis CS manquant » ou bloquer ? Position : étendre la logique d'annexion D53 — une résolution sur un marché > seuil référence l'avis du CS ; ALERTE non bloquante si manquant (cohérent D56).

### C.14 — Conformité légale

- **Journal d'accès/diffusion des actes + audit trail générique** — *couvert par* D65-b, G24-T9, D44. *Résiduel :* corriger l'incohérence de D44 (qui décrit document_access_log comme EXISTANT alors qu'il est absent) — soit le construire, soit aligner D44 sur le report P1. Position : ne pas afficher une traçabilité d'accès fantôme (RGPD art.32, loi art.18, décret 67-223 art.64-9).
- **Immatriculation RNIC : télédéclaration annuelle (pas un simple numéro)** — *couvert par* D65, D70. *Résiduel :* statut d'immatriculation (enum) + date_derniere_declaration_rnic + alerte D70 « déclaration RNIC due ». Position : oui en V1 — statut + date + alerte branchée sur la clôture ; réutiliser les données de la fiche synthétique comme format d'échange ; téléservice automatisé P1 (CCH L711-1 à L711-6, R711-1).
- **DTG confondu avec le PPT** — *couvert par* D54, D39, D45. *Résiduel :* modéliser le DTG comme objet dédié, ou un document technical_documents (type='dtg') suffit ? Position : garder le DTG comme DOCUMENT RÉGLEMENTAIRE (pas une 3e source) mais l'EXPLICITER comme maillon distinct alimentant le PPT ; tracer ses déclencheurs pour nourrir l'applicabilité D56 (CCH L731-1 à L731-5).
- **Factur-X : champs EN 16931 manquants sur le modèle fournisseur** — *couvert par* D55, D19, G24-1. *Résiduel :* traiter ces champs (TVA par taux, SIRET, numéro/date/devise, tiers.siret) comme PRÉ-REQUIS du module Factures avant la session Factur-X ? Position : oui — au build du module Factures, exiger tiers.siret, TVA structurée par taux et activer la ventilation D19, pour que la session Factur-X ne fasse plus que MAPPER (EN 16931, CGI art.289 bis).
- **Coffre-fort numérique / extranet (décret 2019-650)** — *couvert par* D69, D69-bis, D44, A3. *Résiduel :* le portail V1 expose-t-il une CHECK-LIST de complétude des pièces du décret + distinguo collectif/personnel + traçabilité de la dérogation par vote AG ? Position : ajouter (1) check-list présent/manquant des pièces 2019-650 ; (2) cloisonnement via documents.coproprietaire_id + RLS D44 ; (3) trace de la dérogation par vote. Sans la check-list, l'extranet n'est pas opposable.
- **Conservation/archivage légal (valeur probante)** — *couvert par* D45, D43. *Résiduel :* (1) caler les durées sur le droit dans une table éditable ; (2) registre des PV = objet dédié ou vue dérivée de ag_meetings ? Position : barème par catégorie dans une table éditable, registre des PV DÉRIVÉ de ag_meetings (pas un nouveau silo), cohérent numérotation sans trou G24-AM2 (C.com L123-22, CC art.2224).

### C.15 — Portails copro & CS

- **Vote par correspondance en ligne : conformité du formulaire** — *couvert par* D27, D30, D31. *Résiduel :* (a) le formulaire reprend-il le texte EXACT de chaque résolution lié à un form_document_id archivé ? (b) compte authentifié + horodatage serveur suffisent comme preuve ? (c) dépouillement du cas « résolution amendée → vote défaillant » ? Position : texte exact + horodatage serveur + traiter le défaillant dans get_ag_live_results (art.17-1 A, décret art.9 bis).
- **Paiement en ligne des charges** — *couvert par* D7, D58, G24-T5. *Résiduel :* confirme-t-on paiement en ligne = P1 (modèle posé en V1) et SEPA GoCardless plutôt que CB Stripe ? Position : oui P1, SEPA GoCardless (souveraineté FR, déjà intégré), jamais d'INSERT brut (webhook → allocate_payment → D512/C450 + FIFO).
- **Périmètre RGPD du portail** — *couvert par* B7, D44, D65-b, G24-T10, G24-AM7. *Résiduel :* quel RGPD est bloquant au go-live vs reportable ? Position : rendre bloquants politique de confidentialité + bandeau cookies, base légale affichée (art.6.1.b), durées de conservation, self-rectification tracée, journalisation accès docs ; différer le formalisme documentaire (registre/DPO/AIPD = P1).
- **Espace conseil syndical : étanchéité du cran de droits art.21** — *couvert par* D50, D51, D52, D69, G24-T8, G24-T9, A2. *Résiduel :* (1) journalisation spécifique des accès du CS aux données nominatives ? (2) mention de confidentialité/finalité au login conseil ? Position : oui aux deux (le droit de regard art.21 = finalité de contrôle, pas de diffusion — RGPD art.5, décret 67-223 art.26).
- **Multi-copropriété et multi-rôle d'un même compte** — *couvert par* D66, B3, A2, G24-1. *Résiduel :* compte cumulant des rôles hétérogènes (gestionnaire + copropriétaire) — le switcher porte-t-il aussi le RÔLE, ou comptes séparés ? Position : un seul compte auth par personne, le switcher porte contexte ET rôle, le middleware tranche sur les memberships réels (B3) ; tester l'étanchéité inter-cabinet.

### C.16 — Multi-cabinet & pilotage

- **Mandat de syndic : entité contrat, durée, renouvellement, plafond 3 mandats** — *couvert par* G24-META, A3, D30. *Résiduel :* source contradictoire (A3 met le mandat en P1, la reco veut une entité dès V1). Position : OUI, entité minimale syndic_mandate en V1 (sinon le plafond 3 mandats D30 et l'alerte « mandat à renouveler » n'ont aucune donnée fiable, et on émet des actes hors mandat formalisé) ; cérémonie complète (contrat-type) en P1 (art.18/22 loi 65-557).
- **Honoraires de syndic : forfait vs prestations (Novelli)** — *couvert par* A3, D2. *Résiduel :* tension entre report P1 (A3) et la sévérité critique. Position : avancer en V1 un noyau « honoraires de gestion » (forfait annuel au budget poste 621, appelé avec les provisions ; prestations/travaux saisis comme facture du cabinet-tiers via le moteur facture D17-D22, jamais un 2e chemin) ; grille Novelli complète en P1 (art.18-1 A).
- **Transfert de portefeuille / changement de syndic** — *couvert par* D1, G24-AM5, G24-AM7, G24-AM4 (entrée OK). *Résiduel :* la SORTIE d'une copro (fin de mandat). Position : V1 minimal = à l'expiration, la copro passe en inactive/archivée (lecture seule) + export dossier de passation ; NE PAS transférer une copro intra-plateforme en V1 (cohérent D1) ; vrai transfert + passation complète en P1 (art.18-2).
- **Escalade platform_admin : super-admin vs admin cabinet** — *couvert par* E1, B5. *Résiduel :* le MODÈLE CIBLE n'est pas figé. Position : sortir platform_admin des memberships vers un flag profiles.is_platform_admin posé hors flux (seed/console), bypass limité à la lecture + actions de support tracées, AUCUNE écriture comptable silencieuse ; admin_cabinet borné strictement à son cabinet. Cœur de l'étanchéité multi-tenant (B5).
- **KPIs gestionnaire métier au niveau portefeuille** — *couvert par* D66, D68, D70, G24-T5. *Résiduel :* la vue d'AGRÉGAT cabinet (v_cabinet_overview) n'est pas nommée comme livrable, et « mandats à renouveler » dépend de l'entité mandat. Position : créer v_cabinet_overview en sommant les vues par-copro de D68/D70 (jamais un 2e calcul) ; « mandats à renouveler » suit l'arbitrage du mandat ; différenciateur manager-first, à confirmer comme livrable V1.

### C.17 — Transverse

- **Machine à états centralisée vs UPDATE direct du statut** — *couvert par* G24-T11, D24, D18, D32. *Résiduel :* primitive générique `assert_transition(entity, from, to)` adossée à une table de transitions vs RPC dédiées par entité ? Qui pose pv_signed/pv_sent (business-rules.md dit UPDATE front — contredit G24-T11) ? Position : une RPC `set_ag_status` unique pose pv_signed/pv_sent (fait juridique daté, point de départ du délai art.42) ; aucun UPDATE de status depuis le front.
- **Audit trail des ACTIONS (qui/quoi/motif) distinct de l'audit des PARAMÈTRES** — *couvert par* G24-T9, D65-b, E4, D18. *Résiduel :* OÙ est persisté le p_reason de reverse_payment (et le motif des contre-passations E4) ? Aujourd'hui nulle part. Position : persister le motif E4 sur l'écriture de contre-passation elle-même (colonne dédiée reason/reversed_by, jamais le label libre) — rattaché au mécanisme « actes probants » de G24-T9 (art.18).
- **Idempotence des écritures déclenchées par clic OU cron** — *couvert par* D15, D32, 0016, 0026/0070, G24-T5. *Résiduel :* adopte-t-on `p_idempotency_key` comme contrat obligatoire de TOUTE RPC d'écriture (avec REPLAY propre, jamais une 23505 nue), et pour le cron D15 la clé = echeancier_line_id ? Position : oui, indispensable dès que D15 active le cron d'émission ; à trancher avant de câbler l'émission automatique.
- **Horloge métier asOf — injection de la date d'écriture** — *couvert par* E8, business-rules.md, D14/D15. *Résiduel :* la date d'écriture est-elle un paramètre `p_tx_date` obligatoire validé serveur, ou dérivée implicitement ? garde-t-on un DEFAULT current_date ? Position : date métier TOUJOURS paramètre explicite `p_tx_date` validé serveur (refus si période ≠ 'open', sauf régularisation E4) ; SUPPRIMER tout DEFAULT current_date ; created_at reste now() (art.14-3). Contrat de signature des RPC d'écriture.
- **Périmètre et contrat des CRON v2** — *couvert par* E2-q, 0055, D15, D60, D45/D54, D59. *Résiduel :* (a) registre des runs (`cron_runs`) ? (b) politique de rattrapage (par date d'effet) ? (c) quels jobs sont financiers donc idempotents ? Position : registre `cron_runs` (observabilité non négociable, délais légaux), rattrapage par date d'effet, idempotence obligatoire sur tout job financier ; alertes restent informatives. À cadrer avant le premier cron d'écriture.
- **Cohérence des machines à états SQL vs doctrine (enums EN/FR, statuts morts)** — *couvert par* B8, D17, D40, G24-T11. *Résiduel :* généraliser « figer UNE machine à états canonique AVANT de reconstruire l'écran » à toutes les entités ; cas aigu = workflow OS (6 statuts FR vs 9 SQL). Position : enums techniques en anglais, libellés FR à l'affichage ; figer chaque machine AVANT reconstruction d'écran ; purger les valeurs mortes (OS 9→valeurs réelles).
- **Contrat de sécurité des WEBHOOKS v2** — *couvert par* E2-q, D7, E3-q, 0070, G24-T7. *Résiduel :* aucun CONTRAT WEBHOOK commun acté. Position : patron unique imposant (1) vérifier la signature sur le CORPS BRUT avant parsing, (2) résoudre l'objet vers SA copro et refuser si l'appartenance ne colle pas, (3) idempotence par event_id (`webhook_events`), (4) JAMAIS de service_role qui shunte l'appartenance ; un webhook non rattachable → dead-letter (jamais le GL). Risque : sur un webhook auth.uid() est NULL → seule la signature authentifie.
- **Modèle de droit du super-admin platform_admin** — *couvert par* E1, B3, B5, G24-T9/D65-b. *Résiduel :* le PÉRIMÈTRE FONCTIONNEL n'est pas redéfini (user_is_platform_admin court-circuite encore lecture ET écriture). Position : platform_admin = SUPPORT EN LECTURE SEULE par défaut (jamais d'écriture au GL d'un cabinet client, art.18) ; toute écriture exceptionnelle = break-glass tracé et borné ; INTERDIRE le cumul platform_admin + gestionnaire (escalade horizontale). À acter pour que E1 s'appuie dessus.

---

## 🟢 Déjà couvert (COVERED)

Décompte par domaine et décisions citées (sans le détail).

- **C.1 (3)** : Mandat syndic (S7, G24-META, G24-SCOPE, D65, G24-5) ; Import en masse (S5, S6) ; Données extra-comptables art.18-2 (G24-AM5, D45, G24-AM7).
- **C.2 (2)** : Démembrement usufruit/NP (G24-2, D8) ; SCI/personne morale (G24-1, S1, T3).
- **C.3 (5)** : Usufruit/NP qui vote/paie/convocation (G24-2) ; Personne morale SCI (G24-1, D55) ; occupancy_type + occupant (G24-3, D12) ; Lot principal/annexe (G24-4, D56) ; Identité légale syndic (G24-5, G24-SCOPE, D65, G24-META).
- **C.4 (4)** : Appel exceptionnel/hors-budget (D13, D13-bis, E13-q) ; Affectation résultat multi-clés (D23, G24-T12, A5, E12-q) ; Échéancier budget_payment_schedules (D13-bis, D14, D15) ; Appel ALUR versement vs réserve (D67, D70, alur_fonds_travaux_accounting, alur_affectation_model).
- **C.5 (3)** : Source des impayés = GL (E2, D68, D58, D59, D16, G24-T5) ; Opposition art.20-II mutation (D36, D33, D37) ; Échelle de relance v1 (D58, D59, G24-T11, T5/G24-T5).
- **C.6 (1)** : Annulation/contre-passation factures et paiements (E4-q, D18).
- **C.7 (3)** : Cut-off droits constatés 408/486/487 (D26, G24-T6, E4-q) ; Option report/remboursement excédent (D25, G24-AM3) ; Front de clôture mock (D24, D26, D23, G24-T11).
- **C.8 (0)** : aucun.
- **C.9 (3)** : Gate consultation CS art.21 (G24-T8, D52, G24-AM5) ; Lien OS→engagement budgétaire art.18 (D40, D20, D26, G24-T6, G24-T8, D13/D13-bis) ; Persistance réelle du module (D22, D38, règles v2 #2/#4, D60).
- **C.10 (2)** : Validité docs techniques → alerte expiration (D45, D54, D70) ; Modèle confidentialité 4 niveaux vs DB (D44, D69, VIS-3CERCLES).
- **C.11 (2)** : Consentement convocation électronique (G24-T10, D48, D60) ; Identité émetteur/white-label emails (E3-q, D48, D64-bis, B7).
- **C.12 (0)** : aucun.
- **C.13 (2)** : Seuil art.21 mise en concurrence (G24-T8, D52, A3) ; Policy d'écriture council_members (D51, D53, G24-T11).
- **C.14 (0)** : aucun.
- **C.15 (2)** : Consentement exprès horodaté (G24-T10, D46) ; Annexes comptables communiquées / fuite nominative (D69, D69-bis, VIS-3CERCLES, D68, G24-T5).
- **C.16 (1)** : Mentions légales white-label dans les actes (G24-5, D64-bis, G24-SCOPE).
- **C.17 (0)** : aucun.

**Total COVERED : 33.**
