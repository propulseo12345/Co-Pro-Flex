# Annexes légales — corrections (⚠️ PRÉPARÉ, NON APPLIQUÉ)

> Workflow design + revue adversariale du 2026-06-21 (run `wf_7e6075bf-516`). Verdict synthèse :
> **corrections_mineures** ; mais les 2 revues = **corrections_requises** avec un **désaccord de fond
> non tranché**. Annexes = LECTURE SEULE (aucun risque grand livre), MAIS légalement sensibles
> (annexe fausse → approbation des comptes NULLE, art.11 décret 67-223) et le gate d'équilibre dur
> pourrait **bloquer l'envoi des convocations** s'il est mal calibré → **rien appliqué**.

## ⚖️ Arbitrages MÉTIER à trancher par Lyes (expert copro) AVANT toute application

1. **L'annexe 1 « après répartition » s'équilibre-t-elle vraiment (Total général créances = dettes) ?**
   - Synthèse : OUI (fac-similé `FACSIMILE_ANNEXES_2026-06-15.md` l.105/143 : exemple 15 288 = 15 288, compte 12 rangé côté passif).
   - Revues : DOUTE (le résultat non réparti / 12 / 478 créeraient un écart structurel légitime ; un gate dur `abs(écart)<=0,01` bloquerait quasi toutes les convocations, **y compris la copro de référence**).
   - **Si le gate est posé sans trancher ça → risque de bloquer l'envoi de TOUTES les convocations.** À trancher : équilibre total actif=passif, OU contrôle plus fin (Total 1 trésorerie=provisions, Total 2 créances=dettes), OU pas de gate dur (juste un bandeau d'alerte).
2. **Définition unique du « solde travaux »** : annexe 2 le calculerait `produits_travaux − charges_travaux` ; annexe 4 le calcule `provisions − réalisées`. Rien ne garantit l'égalité (cohérence croisée n°4). Laquelle fait foi ?
3. **Produits par clé (annexe 3)** : prorata du poids budgété, ou clé dédiée ? (laissé à 0 en V1 → « solde affecté » par clé = total charges tant que non tranché).

## Corrections proposées (par annexe)

- **Annexe 1** : (a) **élargir la couverture de comptes** `crea_other`/`det_other` (42/43/44/49 manquants vs fac-similé) — *correction SÛRE, à faire de toute façon* ; (b) exposer un bloc `equilibre` (créances/dettes/écart/ok) — **conditionné à l'arbitrage #1** ; (c) afficher l'écart dans le PDF.
- **Annexe 2** : rendre la ligne **« Solde affecté aux copropriétaires »** (donnée `solde_charges` déjà calculée en SQL, juste **non rendue** côté TS — *correction SÛRE et utile*) + compléter le **bloc travaux** (produits/sous-total/solde/Total 2) côté SQL.
- **Annexe 3** : peupler le **réalisé par clé** (aujourd'hui `ex_clos_realise = 0` en dur) par ventilation au prorata budgété + **pseudo-clé « non ventilé »** pour les comptes réalisés hors budget (sinon cohérence croisée n°3 cassée).

## Garde-fous techniques NON négociables (corrections des revues)

- **PAS de `throw` dur dans la couche PDF** : sinon une annexe 1 déséquilibrée détruit toute la convocation (page de garde, résolutions, annexes 4/5 conformes). Bloquer uniquement à **l'ENVOI** (gate métier UI) + bandeau explicite (jamais silencieux, cf. `no_silent_refusal`). Le PDF reste générable.
- **TOUS les nouveaux champs TS optionnels** + renderer **défensif** (bloc travaux conditionnel, fallback 4 colonnes) : sinon front déployé avant la migration → `TypeError` → **aucune annexe** (même 4/5).
- Helper pur `src/lib/finance/annexe-equilibre.ts` (fourni) qui recalcule l'écart en fallback TS si le SQL n'expose pas encore `equilibre`, et distingue « annexe absente car AGE » de « échec RPC ».

## Barrières avant application
1. **Trancher l'arbitrage #1** (sinon ne PAS poser le gate dur).
2. **Tester sur données** (cloud vierge → impossible aujourd'hui ; DB locale docker `supabase_db_Co-Pro-Flex` où vit la boucle d'or, ou copro seedée).
3. Le SQL fourni = **fragments à insérer dans `0075`** (pas une migration autonome).

## Détail complet
SQL (fragments fn_annexe_1/2/3) + 7 blocs TS (types, helper, generateConvocationPDF, renderAnnexe1/2) + plan de tests (8) + risques (7) : dans la sortie du workflow `wf_7e6075bf-516` (à re-générer si besoin). Les corrections SÛRES (couverture comptes annexe 1, ligne solde annexe 2, fallback défensif) peuvent être appliquées indépendamment du gate ; le **gate d'équilibre attend l'arbitrage #1**.
