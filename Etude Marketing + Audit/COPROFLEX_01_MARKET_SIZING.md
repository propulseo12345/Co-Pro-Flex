# COPROFLEX — 01. MARKET SIZING (TAM / SAM / SOM)
_Analyste : Senior McKinsey · Market Research — avril 2026_

---

## ⚠️ Mise au point préalable (importante)

Le brief produit place CoProFlex dans la "gestion de copropriété". C'est flou. Il faut distinguer **deux marchés radicalement différents** :

| Marché | Business model | Cible | Acteurs |
|---|---|---|---|
| **M1 — Logiciels SaaS pour syndics pro** | B2B SaaS (licence/lot) | Cabinets et syndics indépendants | Powimo, ICS, Crypto, SEIITRA/Spirit, Gercop, Vilogi, Sof-Copro |
| **M2 — Syndics-en-ligne / désintermédiation** | B2C2B (service + logiciel) | Conseils syndicaux de copropriétaires | Matera, Cotoit, Manda, Homeland |

**CoProFlex est positionné sur M1.** C'est sur ce marché qu'on calcule TAM/SAM/SOM. M2 est traité comme un signal de contraction du marché (voir prompt 5 — Intelligence Brief).

---

## TAM — Total Addressable Market (France, logiciels syndic pro)

### Approche top-down

| Hypothèse | Valeur | Source | Confiance |
|---|---|---|---|
| Nombre de copropriétés gérées par syndic pro en France | ~460 000 | ANAH Coproff 2023-2025 / ANIL (~51% de 850k copros immatriculées) | **Haute** |
| Nombre moyen de lots par copropriété | ~23 | ANAH, médian 21 | **Haute** |
| Total de lots en copropriété gérés par syndic pro | **~10,5 M lots** | Calcul | Haute |
| Coût logiciel moyen par lot/an (benchmark M1) | ~10-15 € | Triangulation via devis Powimo/ICS/Crypto | Moyenne |
| **TAM annuel France (logiciels syndic pro)** | **~110-160 M€/an** | Top-down | Moyenne |

### Approche bottom-up

| Hypothèse | Valeur |
|---|---|
| Nombre de syndics pro (entités juridiques actives) | ~4 400 (actes.immo Q1 2025) |
| Nombre moyen de copropriétés gérées par syndic | ~72 (médiane 39) |
| Coût logiciel moyen par cabinet/an | 12 000-35 000 € (estimation usage multi-portefeuille) |
| **TAM bottom-up** | **~85-150 M€/an** |

### 🎯 TAM consolidé France : **100-150 M€/an**

Les deux approches convergent. C'est un marché **de niche mature**, pas un océan.

---

## SAM — Serviceable Addressable Market

**Filtres de CoProFlex :**
- Exclusion des très gros réseaux (Foncia, Citya, Nexity, Oralia) qui utilisent des systèmes propriétaires ou custom → ~40% du parc pro
- Focus sur syndics indépendants + petits cabinets (1-20 gestionnaires)
- Exclusion des copros gérées sans syndic (42,7%) et par bénévoles (6,2%)

| Hypothèse | Valeur |
|---|---|
| Parc adressable après exclusion des gros réseaux | ~60% du TAM |
| Syndics pro indépendants | ~3 500 entités |
| Copropriétés adressables | ~275 000 |
| Lots adressables | ~6,3 M |
| **SAM France** | **~60-95 M€/an** |

---

## SOM — Serviceable Obtainable Market (réaliste 3 ans)

**Hypothèses solo-founder, pré-lancement, sans fonds levés :**

| Scénario | Clients à 3 ans | Lots gérés | MRR | ARR |
|---|---|---|---|---|
| **Bear** (échec GTM) | 15 syndics | 4 500 lots | 13 050 € | **157 k€** |
| **Base** (GTM qui marche) | 60 syndics | 20 000 lots | 58 000 € | **696 k€** |
| **Bull** (effet boule de neige) | 180 syndics | 70 000 lots | 203 000 € | **2,4 M€** |

*Hypothèses : 2,90 €/lot/mois en moyenne après ramp. Taille moyenne client = 300-400 lots.*

### 🎯 SOM 3 ans réaliste : **150 k€ → 700 k€ ARR**

---

## Comparaison avec les attentes typiques d'un fondateur

Si tu espérais "1 M€ ARR en 18 mois", **ce n'est pas impossible mais c'est le scénario bull** — et ça suppose que tu attrapes 100+ syndics en ~18 mois avec un produit qui n'a encore aucun client.

**Référence Matera** (pour perspective, bien qu'ils soient sur M2) : 4 ans pour atteindre 3 000 copros clientes, avec 55 M€ levés. Tu joues à un autre jeu avec d'autres moyens.

---

## Hypothèses les plus faibles (à stress-tester)

1. 🟡 **Coût moyen logiciel / lot / an (10-15€)** — Les vrais prix de Powimo/ICS sont opaques. Ils vendent par cabinet, sur devis, avec setup + maintenance. Le chiffre est une triangulation — il peut être 2× plus élevé ou plus bas.
2. 🟡 **Taux de churn** — Non modélisé, mais sur un marché où les migrations sont DOULOUREUSES (comptabilité, historique AG, formation), le churn est probablement <5%/an. À favorable, mais ça joue contre toi à l'acquisition (personne ne veut migrer).
3. 🔴 **Taille de syndic indépendant adressable** — 3 500 entités, mais combien sont vraiment insatisfaits + prêts à migrer + solvables ? Probablement 500-1 000 en réalité.
4. 🔴 **Contraction M2 du marché** — Matera capture 10k+ copros, soit ~2% du marché pro. Chaque copro qui passe en auto-gestion est un lot perdu pour un syndic et donc pour CoProFlex. Tendance structurelle baissière.

---

## Si ce chiffre te paraît trop petit, dis-le maintenant

**Le marché français des logiciels de syndic est ~100-150 M€/an.** C'est un *niche market*, pas un marché de masse. À 2,90€/lot/mois, pour atteindre 5 M€ ARR il te faut ~145 000 lots sous gestion = ~500 syndics clients = ~14% de ton SAM. C'est faisable en 5-7 ans avec exécution impeccable.

**Si tu vises 10 M€ ARR+ → il faut impérativement :**
- Soit sortir de France (ES, IT, BE — comptabilités différentes, gros effort)
- Soit descendre vers M2 (concurrencer Matera, ce qui nécessite 5-15 M€ de capital)
- Soit remonter vers les gros réseaux (vente enterprise, cycles 6-18 mois)

**Verdict honnête :** CoProFlex est un *lifestyle business profitable* (1-3 M€ ARR) crédible à 5 ans, mais probablement pas une startup licorne. Ajuste l'ambition en conséquence.
