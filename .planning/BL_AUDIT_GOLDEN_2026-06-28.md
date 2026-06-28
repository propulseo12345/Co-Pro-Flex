# Audit du golden « Domaine des Tilleuls » — incohérences (BL) — 2026-06-28

> Audit exhaustif multi-agents (codes de comptes · arithmétique · clés · écritures GL · cohérence BL). Source : workflow `audit-golden-incoherences`.
> **STATUT 2026-06-28 : TOUS les correctifs APPLIQUÉS au PLAN_GOLDEN** (les 4 arbitrages tranchés par Lyes = les recos : toiture encaissée sauf Hugo · état daté 536,25 reconduit T2 non échu · Otis 614 / nettoyage 611 · §3.4 réécrit en invariants v2).
>
> **Verdict : ossature chiffrée SOLIDE** (totaux recalculés indépendamment et justes : tantièmes 10 000, 7 clés, budget 50 000, ALUR 5 000, ravalement 22 560, toiture 37 600, grand total 115 160, à-nouveau 111 560=111 560, seuils majorité). Résidus ±1 cent = design voulu. **Fiable comme référence APRÈS les correctifs ci-dessous.**

## ✅ Erreurs CERTAINES — correctifs directs (aucun montant ne change, sauf §6.4)
1. **Eau `602→601`** (4 endroits : §4 l.213, §6.1 l.292, §6.3 cut-off/extourne/facture l.368-370). 602=électricité, eau=601.
2. **Chauffage `606→603`** (§6.1 l.292). 606 ≠ énergie ; chauffage/combustibles = 603.
3. **Honoraires syndic `622→621`** (§6.1 l.292). 621 = rémunération ordinaire ; 622 = honoraires exceptionnels.
4. **Frais CS `618→624`** (§6.1 l.292). 618 inexistant en copro ; 624 = frais du conseil syndical (tranché BL-CHART).
5. **Part électricité `606→602`** dans « Nettoyage+élec » (§6.1 l.292). (Nettoyage 615→611 = arbitrage, cf. needsLyes.)
6. **Résidu d'arrondi : K5 ne produit AUCUN résidu** (1,25 €/m² exact). Reformuler §3.2 l.171 / §6.1 l.294 / §9 l.460 : **seul K1** (0,64375/tantième sur tantièmes non multiples de 8) produit un demi-cent.
7. **Liste des lots à résidu K1 incomplète : ajouter A-301** (1 100 × 0,64375 = 708,125/trim). Liste correcte = A-RDC-C1, A-RDC-C2, A-102, A-202, A-301, A-302 + 4 caves + 2 parkings (12 lots).
8. **§3.1 l.145 `validate_budget_expense` périmé** (BL-PE-1/BL-05) : le réalisé classe 6 vient EXCLUSIVEMENT de `validate_supplier_invoice` ; engagé = `commitments` (aucune écriture GL). Retirer/requalifier la ligne.
9. **« Appel annuel unique fraction=1 » périmé** (§3.2 l.171, §6.1 l.327) : contredit D14 trimestriel + BL-09 + la propre résolution du doc (risque #1). Retirer.
10. **Clé K7 ALUR fantôme** : §2.4 colonne K7 + §2.5 checks 2 & 8 traitent K7 comme une 7e clé alors que l.88-90 tranche « K7 n'est PAS une clé » (ALUR via `budget_type`, pas une clé). Aligner : 6 clés réelles, ALUR = assiette informative (= K1).

## 🔴 ERREUR BLOQUANTE — §6.4 attribution de l'impayé (dépend d'un arbitrage)
- §6.4 l.385 : « Impayé GL strict 10 207,50 (Hugo 6 907,50 + Thomas 3 300,00) [CONFIRMÉ] » est **arithmétiquement IMPOSSIBLE** : Thomas (B-101, Bât B → 0 ravalement/0 toiture) a un dû TOTAL 2026 de **2 445** ; 3 300 > son dû max. Le tag [CONFIRMÉ] est **faux**. (Total à-nouveau 111 560 et invariant 478+12 restent justes ; seul le split 512/45x + l'attribution par débiteur sont faux.)
- **Cause racine = un trou de scénario** : le golden ne dit JAMAIS qui encaisse la toiture (37 600) → arbitrage Lyes (cf. needsLyes #1). Sous hypothèse A : impayé = **10 337,50** (Hugo 7 892,50 + Thomas 2 445), 512 = 101 222,50.

## ❓ needsLyes — 4 arbitrages comptables
1. **Toiture encaissée en 2026 ?** (pilote §6.4). Reco A : encaissée par tous sauf Hugo → impayé 10 337,50.
2. **État daté B-101 (§6.5)** : P1 (3 217,50) et P3 (536,25) **double-comptent le T2 2027** ; et base 2027 = budget 2026 (536,25/trim) ou budget 2027 voté (557,70) ? Reco : figer due_dates + montant trim 2027 dans le seed, laisser `generate_etat_date_payload` calculer (supprime l'incohérence à la source) ; à défaut option A (536,25, seul T2 non échu, P1=2 681,25, P3=536,25).
3. **Compte F1 Otis** (contrat entretien ascenseur) : 615 (réparations) ou **614 (contrats de maintenance)** ? + nettoyage 615 ou **611** ? Reco B (fidélité fac-similé annexes).
4. **§3.4 « fonctions à contourner »** + refs migrations v1 (0026/0075/0087…) : périmé par BL-03 + contredit « solutionner jamais contourner ». Reco A : réécrire en « invariants v2 » (FIFO, mapping 450-x) + renvoi aux décisions BL.

## Contradictions internes (résolues par les correctifs ci-dessus)
K7 clé fantôme · trimestriel vs annuel unique · résidu imputé à K1+K5 (faux) · impayé §6.2 (6 337,50) vs §6.4 (10 207,50, faux) · A-301 oublié · état daté double-compte T2 · §3.4 « contourner » vs doctrine.
