# COPROFLEX — 04. PRICING STRATEGY
_Pricing Strategist · 50+ SaaS companies — avril 2026_

---

## Situation actuelle dans le brief

| Plan | Prix | Cible |
|---|---|---|
| Essentiel | 1,90 €/lot/mois (22,80 €/lot/an) | Syndics bénévoles, max 3 copros |
| Professionnel | 2,90 €/lot/mois (34,80 €/lot/an) | Syndics pros illimités |
| Entreprise | Sur devis | Cabinets multi-gestionnaires |

**Verdict immédiat : ce pricing est mal calibré. Détail ci-dessous.**

---

## Benchmark concurrentiel

### Marché M1 (ton vrai marché)

| Concurrent | Modèle | Prix estimé | Note |
|---|---|---|---|
| Powimo | Devis / cabinet | 150-400 k€/an total | Par siège + fonctions |
| ICS | Licence + maintenance | 20-80 k€/an total | Legacy + cloud Spirit |
| Crypto | Devis | Similaire ICS | Idem |
| Gercop | Licence low-cost | 5-15 k€/an | Le seul vraiment accessible |

**Normalisé en €/lot/an** (estimation) : **8 à 25 €/lot/an** pour un cabinet moyen.

### Marché M2 (pour contexte, pas comparable)

- Matera bénévole : ~30% moins cher qu'un syndic pro → ~100-140 €/lot/an (mais c'est service + soft)
- Syndic pro trad : 150-270 €/lot/an (service complet)

**Ton pricing à 34,80 €/lot/an Pro se situe dans le HAUT de la fourchette M1.** C'est défendable si tu apportes une valeur fonctionnelle supérieure — mais il y a une erreur cachée (voir plus bas).

---

## Analyse Van Westendorp informelle (sur base de benchmark)

Pour un gérant de syndic indépendant (Sylvie, persona 1) :

| Question | Prix/lot/an |
|---|---|
| À quel prix **trop cher** (on arrête net) ? | > 50 € |
| À quel prix **commence à être cher** mais je réfléchis ? | 30-50 € |
| À quel prix **bonne affaire** ? | 15-25 € |
| À quel prix **trop pas cher** (ça fait louche) ? | < 10 € |

**Prix optimal (Optimal Price Point) : ~22-28 €/lot/an**
**Point d'indifférence : ~25 €/lot/an**

Ton plan Pro à 34,80€ est **au-dessus de la zone d'acceptation** pour un syndic indépendant en découverte. Ton plan Essentiel à 22,80€ est dans la bonne zone — mais il est positionné sur la mauvaise cible (bénévoles).

---

## 🔴 Erreur de pricing n°1 (la plus grave)

**Tu factures au lot, mais tes clients pensent au portefeuille (nombre de copropriétés).**

Le syndic indépendant raisonne ainsi :
> *« Combien je paie pour gérer mes 80 copropriétés ? »*

Pas ainsi :
> ~~« Combien je paie par lot ? »~~

**Conséquence :** Quand Sylvie calcule 2,90 × 23 lots moyens × 80 copros = **5 328 €/mois = 64 000 €/an**, elle fait une crise cardiaque. Même si c'est moins cher que Powimo, la présentation est anxiogène.

**Solution :** repositionner le pricing par portefeuille (forfaits par tranches de copros), avec le prix au lot caché en détail.

---

## 🟡 Erreurs de pricing secondaires

2. **3 plans dès le lancement** = trop tôt. Tu ne connais pas encore le comportement d'achat. Lance avec 2 plans max, ajoute Enterprise après 20 clients.
3. **"Sur devis" pour Enterprise** = crédible seulement quand tu as des références. Pour l'instant, annonce un prix plafond ("à partir de X €/mois") pour que les cabinets moyens s'auto-qualifient.
4. **Pas de setup fee** = Erreur. Facture la migration comme une prestation (1 500-5 000 €) → ça qualifie les prospects sérieux ET ça couvre ton effort réel.
5. **Essai 30 jours gratuit sans CB** = bon signal mais risque de trial-tourists. Si tu laisses ça, ajoute un appel onboarding obligatoire (élimine les non-sérieux).

---

## Pricing recommandé (V2 — lance avec ça)

### Tarif plafond affiché : par portefeuille

| Plan | Taille portefeuille | Prix | Équivalent/lot/mois |
|---|---|---|---|
| **STARTER** | Jusqu'à 10 copros (~230 lots) | **79 €/mois** | ~0,34 € |
| **ÉTABLI** ⭐ | Jusqu'à 50 copros (~1 150 lots) | **349 €/mois** | ~0,30 € |
| **CABINET** | Jusqu'à 200 copros (~4 600 lots) | **990 €/mois** | ~0,22 € |
| **SUR MESURE** | > 200 copros | Devis ("à partir de 1 990 €/mois") | - |

**Pourquoi ces prix ?**
- Le plan Établi à 349 €/mois = **4 188 €/an** pour gérer 50 copros. Un syndic indépendant paie aujourd'hui 8-15 k€/an pour Powimo/ICS. **Tu divises par 2-3** tout en étant rentable.
- Le plan Cabinet à 990 €/mois = environ 12 k€/an pour 200 copros. Bon point d'entrée pour concurrencer ICS.
- Le plan Starter à 79 €/mois attire les très petits indépendants + les bénévoles "pro" → pas ton ICP mais un canal d'entrée.

### Setup obligatoire

- Starter : **gratuit** (self-serve)
- Établi : **990 € setup** (migration + formation 1 jour)
- Cabinet : **2 500 € setup** (migration + formation 2 jours)

### Annuel avec remise

- **-15% en annuel** (plus modéré que -17% actuel, ça laisse de la marge)
- Paiement CB ou SEPA mensuel

---

## Gates de features (pour maximiser upgrade)

| Feature | Starter | Établi | Cabinet |
|---|---|---|---|
| AG illimitées | ✅ | ✅ | ✅ |
| Finance / appels de fonds | ✅ | ✅ | ✅ |
| Documents (GED) | 10 Go | 100 Go | Illimité |
| Espace copropriétaire | ✅ | ✅ | ✅ |
| **Open banking (connexion comptes)** | ❌ | ✅ | ✅ |
| **Recommandé digital illimité** | 10/mois | 100/mois | Illimité |
| **Multi-gestionnaires / rôles** | 1 user | 5 users | Illimité |
| **Modules Ventes & Contentieux** | ❌ | ✅ | ✅ |
| **API / exports** | ❌ | ❌ | ✅ |
| **Support prioritaire** | Email 48h | Email 24h | Dédié |

**Principe du gating :** chaque gate correspond à un "moment de friction" identifié chez le client. Le cabinet avec 5 gestionnaires hit le plafond user → upgrade naturel. Le syndic avec beaucoup d'impayés hit la limite recommandé → upgrade naturel.

---

## Revenue model à 12 mois (scénario base)

| Mois | Starter | Établi | Cabinet | MRR | ARR |
|---|---|---|---|---|---|
| M3 | 2 | 1 | 0 | 507 € | 6 k€ |
| M6 | 5 | 4 | 0 | 1 791 € | 21 k€ |
| M9 | 10 | 10 | 1 | 5 270 € | 63 k€ |
| **M12** | 20 | 20 | 3 | **11 540 €** | **138 k€** |

À comparer avec le SOM base du prompt 1 (200-500 k€ à 12 mois). **Le pricing V2 est cohérent avec le scénario base.**

---

## Ce qu'il faut absolument faire AVANT de finaliser le pricing

1. **Interviewer 10 gérants de syndic indépendants** (voir prompt 6) et leur demander leur budget logiciel actuel → validation de la WTP
2. **Tester 2 variantes** de landing page avec deux pricings différents → mesurer le CTR sur "Demander une démo"
3. **Ne pas publier "Sur devis"** sans au moins donner un prix plancher → les prospects partent si c'est opaque

---

## TL;DR

- ❌ Le pricing actuel au lot est psychologiquement anxiogène pour la cible
- ✅ Passer à un pricing par portefeuille (forfait par tranches de copros)
- ✅ Lancer avec 2 plans grand public + 1 enterprise "à partir de", ajouter un 4ème plan après 20 clients
- ✅ Introduire un setup fee (élimine les tourists)
- ✅ Cibler 20-30 €/lot/an effectif (cohérent avec WTP et benchmark)
- ✅ Validation WTP en interview avant freeze du pricing
