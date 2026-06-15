# Fac-similés des 5 annexes comptables — référence pour E2/E7/E8 (2026-06-15)

> **But** : source unique pour coder la tranche annexes (refonte `fn_annexe_*` + front `useConvocationAnnexes` + PDF + gates de cohérence).
> Reconstitué à partir des documents du dossier `Document Etat daté Annexe/` (**non committé — contient des données réelles**, ne PAS `git add` ce dossier). Ici on ne retient que la **structure** et les libellés réglementaires (aucune donnée nominative réelle).

## Sources et ce qu'on en tire

| Document | Date | Apport retenu |
|---|---|---|
| `LES ANNEXES COMPTABLES.pdf` (diaporama ARC, L. Vilsalmon) | **31/12/2019** | **Source principale** : 5 annexes propres + nomenclature détaillée + **exemples chiffrés** + tous les points de contrôle / cohérences croisées. A le `105` (post-2017). |
| `1 à 10 5 Annexes comptables 2022...pdf` (guide ARC 2022) | **2022** | Libellés **à jour 20/08/2020** de l'annexe 1 : `106` (délégation CS), `1032` rayé. Complète le diaporama 2019. |
| `conseil_904_j255...pdf` (fiche INC J255) | 2009 | Confirmation de structure (pré-ALUR, sert juste de recoupement). |
| `AnnexeComptable_LOOP.docx` | — | **Gabarit vide, inexploitable.** Ignoré. |

**Base réglementaire** : art. 11 décret 67-223 (annexes jointes à la convocation sous peine de nullité des décisions d'approbation des comptes) · décret 2005-240 + arrêté 14 mars 2005 (nomenclature) · arrêté 20/08/2020 + décret 07/10/2020 (105/106/1032).

---

## ⚠️ Point à trancher (expert) — classification 661/662

Le fac-similé officiel de l'annexe 2 range :
- **661** Remboursement d'annuités d'emprunts → bloc **TRAVAUX / opérations exceptionnelles**.
- **662** Autres charges financières et agios → bloc **OPÉRATIONS COURANTES**.

➡️ La décision de la nuit (`661/662/704 → travaux`, migration 0067) est donc **fausse sur le 662** : les agios sont **courants**. À corriger via `set_account_charge_nature` (0068, réversible). **661 / 704 / 705 → travaux = corrects.** Cf. [[b4_b5_gel_multicles_livre]].

Autre point (mineur) : `68 Dépréciation sur créances douteuses`, `677 Pertes sur créances irrécouvrables`, `678 Charges exceptionnelles` sont placés dans le bloc travaux/exceptionnel par le fac-similé — à confirmer.

---

## Nomenclature des comptes → annexe → `charge_nature`

> `charge_nature` est binaire dans notre modèle (`courant` / `travaux`). Les comptes « contextuels » (produits qui existent des 2 côtés) ne se classent PAS par compte mais par `operation_id` (mécanisme E4).

### Charges — opérations courantes (`charge_nature = courant`)
| Compte | Libellé |
|---|---|
| 601 | Eau (compteur général) |
| 602 | Électricité |
| 603 | Chauffage, énergie et combustible |
| 604 | Achats produits d'entretien et petits équipements |
| 605 | Matériel |
| 606 | Fournitures |
| 610 | Services extérieurs |
| 611 | Nettoyage des locaux |
| 612 | Locations immobilières |
| 613 | Locations mobilières |
| 614 | Contrats de maintenance |
| 615 | Entretien et petites réparations |
| 616 | Primes d'assurances |
| 621 | Frais d'administration / Rémunération du syndic |
| 622 | Autres honoraires du syndic |
| 623 | Rémunérations de tiers intervenants |
| 624 | Frais du conseil syndical |
| 63 / 632 | Impôts et taxes / taxe de balayage |
| **662** | **Autres charges financières et agios** ⚠️ courant (cf. point à trancher) |
| 64 / 641 | Frais de personnel / Rémunérations du personnel |

### Charges — travaux & opérations exceptionnelles (`charge_nature = travaux`)
| Compte | Libellé |
|---|---|
| **661** | Remboursement d'annuités d'emprunts |
| 671 à 673 | Travaux |
| 677 | Pertes sur créances irrécouvrables |
| 678 | Charges exceptionnelles |
| 68 | Dépréciation sur créances douteuses |

### Produits — opérations courantes (`charge_nature = courant`)
| Compte | Libellé |
|---|---|
| 701 | Provisions sur opérations courantes |
| 711 | Subventions sur frais de fonctionnement |
| 713 | Indemnités d'assurances |
| 714 | Produits divers |
| 716 | Produits financiers |

### Produits — travaux & opérations exceptionnelles (`charge_nature = travaux`)
| Compte | Libellé |
|---|---|
| 702 | Provisions sur travaux |
| 703 | Avances versées par copropriétaires |
| 704 | Remboursement d'annuités d'emprunts |
| 705 | Affectation du fonds de travaux |
| 711 | Subventions sur travaux *(contextuel : même n° qu'en courant → distinguer par `operation_id`)* |
| 712 | Emprunts à utiliser sur travaux |
| 713 / 714 / 716 | Indemnités / Produits divers / Produits financiers *(contextuels)* |
| 718 | Produits exceptionnels |

### Comptes de bilan (annexe 1)
- **Trésorerie** : `50` Fonds placés · `51` Banques ou fonds disponibles en banque · `53` Caisse.
- **Provisions & avances** : `102` Provisions pour travaux · `103` Avances [`1031` Avances de trésorerie · `1032` Avances travaux *(rayé arrêté 20/08/2020 — conservé tant que solde ≠ 0)* · `1033` Autres avances] · `105` Fonds travaux (art. 14-2) · `106` Provision travaux délégation conseil syndical *(arrêté 20/08/2020)* · `131` Subventions en instance d'affectation · **`12` Solde en attente sur travaux ou opérations exceptionnelles**.
- **Créances** : `45` Copropriétaires – sommes exigibles · `459` Copropriétaires – créances douteuses · `42 à 44` Autres créances · `46` Débiteurs divers · `47` Compte d'attente · `48` Comptes de régularisation.
- **Dettes** : `45` Copropriétaires – excédents versés · `40` Fournisseurs · `42 à 44` Autres dettes · `46` Créditeurs divers · `47` Compte d'attente · `48` Comptes de régularisation · `49` Dépréciation des comptes de tiers.
- Hors-bilan : « Emprunts : montant restant dû ».

---

## Structure des 5 annexes

### Annexe 1 — État financier après répartition
- Établi **au dernier jour de l'exercice**, **après répartition**.
- 2 colonnes : `Exercice précédent approuvé` / `Exercice clos`.
- **I — Situation financière et trésorerie** : Trésorerie (50/51/53 → *Trésorerie disponible Total 1*) | Provisions et avances (102, 103/1031/1032/1033, 105, 106, 131, 12 → *Total 1*).
- **II — Créances / Dettes** (deux colonnes côte à côte) → *Total 2* de chaque côté.
- **Total général (1)+(2)** des deux côtés → **doivent être égaux** (équilibre débit/crédit).
- Notes de pied : (1) signe « − » = découvert bancaire = dette du syndicat ; (2) liste individualisée (nom + montant) jointe = **annexe 6**.

### Annexe 6 — Liste des soldes des copropriétaires (jointe à l'annexe 1)
Colonnes : `N°` · `Nom` · `Total répartition` · `Solde précédent` · `Annulation appels` · `Solde après répartition débiteur` · `Solde après répartition créditeur`.

### Annexe 2 — Compte de gestion général (réalisé + budget prévisionnel)
- **5 colonnes** : `N-1` (exercice précédent approuvé) · `N` (exercice clos budget voté) · `N` (exercice clos réalisé à approuver) · `N+1` (budget en cours voté) · `N+2` (budget à voter).
- **Partie haute** = opérations courantes : Charges (60→64, 662) | Produits (701, 711, 713, 714, 716) → *Sous-total* → *Solde (excédent/insuffisance) affecté aux copropriétaires* → **Total 1**.
- **Partie basse** = travaux & opérations exceptionnelles : Charges (661, 671-673, 677, 678, 68) | Produits (702, 703, 704, 705, 711, 712, 713, 714, 716, 718) → *Sous-total* → *Solde* → **Total 2**.
- Renseignée **uniquement si** des travaux/op. exceptionnelles sont **terminés** sur l'exercice.

### Annexe 3 — Compte de gestion par clé de répartition (opérations courantes)
- Mêmes 5 colonnes que l'annexe 2.
- **Une section par clé** (ex. `1 GENERALES`, `2 ASCENSEURS`…) ; chaque clé liste ses comptes de charge (format `601000`, `614002 CONTRAT MAINTENANCE ASCENSEUR`…), une ligne `Produits affectés`, puis `Total net pour la clé`.
- Pied : `TOTAL CHARGES NETTES` · `PROVISIONS COPROPRIÉTAIRES` · `SOLDE excédent/insuffisance affecté aux copropriétaires`.
- **Dédiée aux charges courantes uniquement.**

### Annexe 4 — Travaux art. 14-2 & opérations exceptionnelles TERMINÉS
- Colonnes : `Ex. clos dépenses votées (N)` · `Dépenses (N)` · `Provisions appelées, emprunts et subventions reçus, affectation du fonds de travaux (N)` · `Solde excédent/insuffisance (N+1)`.
- Deux sections : `TRAVAUX DE L'ARTICLE 14-2` (ventilés par clé, détaillés par marché : ex. `671002 Réfection cage d'escaliers`) et `OPÉRATIONS EXCEPTIONNELLES` (ex. `673001 Honoraires avocats`).
- Totaux : `Total travaux art. 14-2` + `Total opérations exceptionnelles` + `TOTAL`.
- « Terminés » = tous les appels votés effectués **et** toutes les factures reçues (payées ou non).

### Annexe 5 — Travaux art. 14-2 & op. exceptionnelles votés NON ENCORE CLÔTURÉS
- Une ligne par marché (ex. `TRAVAUX DE RAVALEMENT`, `TRAVAUX DE TOITURE`) + `TOTAL`.
- Colonnes (chacune date + montant sauf E) :
  - **A** Travaux votés
  - **B** Travaux payés
  - **C** Travaux réalisés
  - **D** Provisions appelées, emprunts et subventions reçus, affectation du fonds de travaux
  - **E = D − C** Solde en attente sur travaux *(montant)*
  - **F** Subventions et emprunts à recevoir

---

## Gates de cohérence croisées (à coder)

1. **Annexe 1 équilibrée** : `Total général (1)+(2)` côté Créances = côté Dettes.
2. **Annexe 1 `compte 12` = Annexe 5 `TOTAL colonne E`** (solde travaux en attente).
3. **Annexe 2 (haut) solde courant = Annexe 3 solde** (excédent/insuffisance opérations courantes).
4. **Annexe 2 (bas) solde travaux = Annexe 4 solde** (excédent/insuffisance travaux).
5. **Avance de trésorerie (`1031`) ≤ 1/6 du budget prévisionnel** (art. 35 décret 17/03/1967).
6. Annexe 3 : produits affectés rattachés à la **bonne clé**.
7. Comptes d'attente (`47`) non soldés = à signaler (décision AG requise).

---

## Exemples chiffrés (réutilisables pour les tests / la golden loop)

**Annexe 1 (équilibre = 15 288 / 15 288)** :
- Trésorerie : 50 = 2 200 · 51 = 8 200 → *Total 1 = 10 400*. Provisions/avances : 1031 = 1 500 · 131 = 2 500 · 12 = 1 000 → *Total 1 = 5 000*.
- Créances : 45 = 2 000 · 47 = 630 · 48 = 2 258 → *Total 2 = 4 888*. Dettes : 45 = 2 640 · 40 = 7 000 · 47 = 300 · 48 = 348 → *Total 2 = 10 288*.
- Total général : Créances 10 400 + 4 888 = **15 288** = Dettes 5 000 + 10 288 = **15 288** ✅.

**Annexe 4** : `671002 Réfection cage d'escaliers` (clé générale) → votées 1 000 / dépenses 950 / provisions 1 000 / **solde 50** ; `673001 Honoraires avocats` (op. except.) → 1 500 / 1 490 / 1 500 / **solde 10** ; **TOTAL 2 500 / 2 440 / 2 500 / 60**.

---

## Impact code (rappel pour la tranche)
- Libellés FAUX aujourd'hui dans `src/features/ag/convocation/hooks/useConvocationAnnexes.ts` + `fn_annexe_*` (migration 0028) → à aligner sur ce doc (cf. [[annexes_legales_copro]], [[annexes_drift_readonly]]).
- PDF convocation annexe 1 cassée → réparer en même temps.
- Migrations E2/E7/E8 = **0069+**.
