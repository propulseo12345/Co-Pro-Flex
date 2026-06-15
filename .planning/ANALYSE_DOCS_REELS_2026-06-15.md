# Analyse des documents de référence fournis (2026-06-15)

> Source : dossier `Document Etat daté Annexe/` (non suivi par git). **Le PDF d'état daté
> contient des données personnelles réelles** (vendeur/acquéreur/notaire) → à anonymiser
> avant tout partage ; ne PAS committer ce dossier. Ici on ne retient que la STRUCTURE.

## Les 3 documents

| Fichier | Nature réelle | Valeur pour nous |
|---|---|---|
| `1 à 10 5 Annexes comptables 2022...pdf` | **Guide ARC 2022** « Savoir lire et exploiter les 5 annexes » (à jour arrêté 20/08/2020 + décret 07/10/2020) | Libellés réglementaires des comptes. **MAIS l'extrait s'arrête à l'Annexe 1** (intro + annexe 1, pages 1–19 du guide). Annexes 2 à 5 absentes. |
| `f6d9…` (sans extension, PDF 14 p.) | **État daté — modèle officiel CSN** (Conseil Supérieur du Notariat), rempli (cas réel) | Référence COMPLÈTE de l'état daté : 3 parties + annexe 3e partie + certificat art.20 + Partie II « renseignements complémentaires ». |
| `pre-etat-date-modele.doc` | **Pré-état daté Loi ALUR** (art. L721-2 CCH), version simplifiée | Modèle du document remis AVANT la promesse de vente. Structure financière proche de l'état daté + récap des pièces à annexer. |

## A. Annexe 1 (état financier) — libellés confirmés par le guide ARC 2022
- **Trésorerie** : `50` Fonds placés · `51` Banques/fonds disponibles · `53` Caisse.
- **Provisions et avances** : `102` Provisions travaux · `103` Avances [`1031` Avance trésorerie · `1032` Avance travaux *(rayée, arrêté 20/08/2020 — conservée tant que solde)* · `1033` Autres avances] · `105` Fonds travaux art.14-2 · `106` Provision travaux délégation conseil syndical *(nouveau)* · `131` Subventions en instance d'affectation · **`12` Solde en attente sur travaux ou opérations exceptionnelles**.
- **Créances** : `45` Copropriétaires sommes exigibles · `459` Créances douteuses · `42-44` Autres créances · `46` Débiteurs divers · `47` Comptes d'attente · `48` Comptes de régularisation.
- **Dettes** : `45` Copropriétaires excédents versés · `40` Fournisseurs · `42-44` Autres dettes · `46` Créditeurs divers · `47` Compte d'attente · `48` Compte de régularisation · `49` Dépréciation comptes de tiers · + mention « Emprunts : montant restant dû ».
- Cohérences croisées citées : le « solde en attente sur travaux » (12) doit = solde de l'**annexe 5**.

➡️ **Confirme notre renommage `110→12`** (B3). Le `1032` rayé-mais-conservé et le `106` (nouveau) sont à vérifier dans notre nomenclature.

## B. État daté (modèle CSN) — structure officielle complète
- **En-tête** : immeuble · copropriétaire cédant · n° lots · mutation (onéreuse/gratuite) · date envisagée · acquéreur (pour certificat art.20) · demande/délivrance syndic · office notarial.
- **1ʳᵉ partie — Sommes dues PAR le cédant** : A/ au syndicat → 1) provisions exigibles [budget D.5.1°a / hors budget 1°b] · 2) charges impayées exercices antérieurs (1°c) · 3) sommes exigibles du fait de la vente, art.33 (1°d) · 4) avances exigibles (1°e) [4.1 réserve art.35.1° · 4.2 provisions spéciales · 4.3 emprunt art.45-1] · 5) cotisations fonds de travaux · 6) autres sommes (prêt quote-part, condamnations) · 7) frais de délivrance de l'état daté. B/ à des tiers (emprunts gérés par le syndic). SOUS-TOTAL · TOTAL (A+B).
- **2ᵉ partie — Sommes dont le syndicat est débiteur ENVERS le cédant** : A/ avances perçues (réserve / provisions spéciales / emprunt) · B/ provisions encaissées au-delà de la période (déchéance terme art.19-2) · C/ solde créditeur exercice antérieur non imputé · TOTAL. + **Avances : modalités de remboursement** (Solution 1 = acquéreur rembourse le vendeur / Solution 2 = versement au syndic).
- **3ᵉ partie — Sommes incombant à l'ACQUÉREUR** : 1) reconstitution des avances (réserve / provisions spéciales / emprunt) · 2) provisions non encore exigibles [budget 3°b avec dates d'exigibilité · hors budget 3°c].
- **Annexe à la 3ᵉ partie** : quote-part (budget/hors budget, appelée vs réelle, N-1/N-2) · procédures en cours · **fonds de travaux** (part rattachée au lot + dernière cotisation, art. L721-2 2°d) · événements après questionnaire avant-contrat (nouvelle AG, travaux votés).
- **Sommes exigibles → certificat art.20** (report total) + **Certificat de l'article 20** (à jour / pas à jour, opposition).
- **Partie II — Renseignements complémentaires** : A) vie de la copro (assurances, modif règlement, AG, syndic, AFUL, état des travaux A6, patrimoine, contrats, emprunts A9, copro en difficulté, droit de priorité stationnement/surélévation, immatriculation) · B) dossier technique/environnemental (amiante, plomb, termites, DPE/audit, ascenseur, piscine, mesures administratives, ICPE).

## C. Pré-état daté ALUR (L721-2) — version simplifiée
- Structure financière calquée sur l'état daté (1ʳᵉ/2ᵉ/3ᵉ parties) MAIS allégée, avec notamment :
  - 2ᵉ partie : une rubrique **« D/ Trop perçus : sommes trop perçues »** explicite (en plus du solde créditeur).
  - 3ᵉ partie : provisions non exigibles par **échéances trimestrielles** (01/01, 01/04, 01/07, 01/10) + bloc **fonds de travaux** (% voté, budget, quote-part lot, déjà appelé).
- + **Récapitulatif des pièces à annexer** (règlement, EDD, PV 3 dernières AG, le pré-état daté lui-même, carnet d'entretien).

➡️ Le **trop-perçu** apparaît noir sur blanc dans ces documents officiels → cohérent avec la décision « c'est son argent, déduit du prochain appel / restitué à la vente ».

## D. Écarts avec CoProFlex (à traiter en J5)
- Notre état daté (`generate_etat_date_payload`, migration 0031) = version **simplifiée 3 parties**. Le modèle CSN est bien plus détaillé : **sous-rubriques par article du décret** (1°a…1°e, 4.1/4.2/4.3…) probablement incomplètes, **Partie II « renseignements complémentaires » quasi sûrement absente** (surtout déclaratif/formulaire), **certificat art.20** à modéliser.
- **Pré-état daté** (L721-2) = document distinct **probablement pas encore dans l'app** → à créer (réutilise une grande partie de la logique état daté).
- **Annexe 1** : caler `fn_annexe_1` sur les libellés ci-dessus (compte 12, 106, 1032 rayé).

## E. Ce qui me manque encore
- **Fac-similés des annexes 2, 3, 4, 5** (le PDF guide s'arrête à l'annexe 1). Idéal = un jeu réel anonymisé, ou les pages 31–77 du guide ARC.
- Point de vigilance juridique : le pré-état daté cite « Loi art. 18 alinéa 6 » là où l'état daté CSN cite « alinéa 15 » pour les provisions spéciales → vérifier la bonne référence d'alinéa en vigueur (à trancher côté expert).
