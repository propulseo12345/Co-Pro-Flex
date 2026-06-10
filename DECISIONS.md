# DECISIONS.md — Journal de décisions CoProFlex

> **À quoi sert ce fichier.** C'est la **mémoire partagée** entre l'expert métier (Lyes),
> le bureau d'études (Claude conversationnel) et l'ouvrier (Claude Code).
> Claude Code ne lit que le dépôt : **toute décision tranchée en discussion doit atterrir ici**,
> sinon elle est perdue et une question déjà réglée sera rouverte.
>
> **Règle de lecture.** Avant de coder une tranche finance (T1→T8), ouvrir ce fichier.
> Chaque entrée porte un **statut** :
> - `🟢 FAIT LOI` = règle juridique établie et sourcée → **non négociable**, à respecter tel quel.
> - `🟢 TRANCHÉ` = décision validée par Lyes (autorité finale métier).
> - `🟡 PROPOSÉ` = position argumentée du bureau d'études → **en attente de validation Lyes**. Ne pas figer dans le code sans son feu vert.
> - `🔴 OUVERT` = question non tranchée, jugement d'expert copro requis.
>
> Dernière mise à jour : 2026-06-08.

---

## A. FAITS JURIDIQUES ÉTABLIS (sourcés — non négociables)

### A1 — Affectation du résultat : courant immédiat, travaux à la clôture d'opération `🟢 FAIT LOI`
**Source : décret n°2005-240 du 14 mars 2005, art. 8.**
- Les excédents/insuffisances sur **opérations courantes** sont répartis **à l'arrêté des comptes**, entre tous les copropriétaires, **selon les quotes-parts de chaque lot dans CHAQUE catégorie de charges**.
- Pour les **travaux art. 14-2 et opérations exceptionnelles**, la répartition se fait selon les **mêmes modalités** mais **ne peut intervenir qu'à la clôture de CHACUNE des opérations** concernées.

**Conséquences code :**
1. Le résultat **courant** se répartit **tout de suite** sur les 450, lot par lot — pas de stockage durable dans un compte interne.
2. La répartition se fait **par clé de répartition** (« dans chaque catégorie de charges »), **pas** sur une clé « générales » unique. → le code actuel qui répartit tout sur la clé générale est une **non-conformité** (cf. C? / tranche T7).
3. Le résultat **travaux** **ne se répartit pas chaque année** : il reste porté jusqu'à la **clôture définitive du chantier**.

### A2 — Compte 12 : le compte légal du résultat travaux non clôturé `🟢 FAIT LOI`
**Source : arrêté du 14 mars 2005, art. 10.**
- « Le compte **12** reçoit le solde des opérations sur travaux ou opérations exceptionnelles qui **ne peuvent pas être clôturées en fin d'exercice**. »
- Le **compte 105 « Fonds de travaux »** est crédité des provisions appelées par le débit du **450 (ou sous-compte 450-5)**, et débité par le crédit du **705 « Affectation du fonds de travaux »**.

**Conséquence code :** le résultat travaux pluriannuel a un **vrai compte légal (12)**. Ce n'est PAS un compte interne « maison ». (Voir B3 sur le sort du 120.)

### A3 — Fonds travaux ALUR : double plancher `🟢 FAIT LOI`
**Source : loi n°65-557, art. 14-2 / 14-2-1 ; loi Climat & Résilience n°2021-1104 du 22 août 2021.**
- Cotisation annuelle minimale = **le PLUS ÉLEVÉ entre** :
  - **5 %** du budget prévisionnel, **et**
  - **2,5 %** du montant des travaux du **PPT adopté** (si un PPT existe).
- Exemple officiel (CLCV) : budget 200 000 € → 5 % = 10 000 € ; PPT 50 000 € → 2,5 % = 1 250 € ; **plancher retenu = 10 000 €** (le plus élevé).
- Art. 14-2 / 14-2-1 = **d'ordre public** : même à l'unanimité, l'AG ne peut ni annuler ni reporter le fonds.
- Cotisation **votée à la majorité art. 25** (majorité absolue) **avec passerelle 25-1**.
- Les cotisations sont **attachées au lot** et **acquises au syndicat** → **non remboursables** à la vente (pas de transfert vendeur→acquéreur en compta ; simple info dans l'état daté).

**Conséquences code :** seuil = `MAX(0.05 × budget_prévisionnel, 0.025 × montant_PPT)`. Cloisonnement strict du 105 (justifié par l'ordre public).

### A4 — Solde disponible du fonds travaux = dérivé du GL, déjà net `🟢 FAIT LOI`
**Source : arrêté 14 mars 2005, art. 10 (mécanique 105 / 705).**
- Solde disponible = **solde créditeur cumulé du compte 105, tous exercices**, **déjà net** des emplois (écritures D 105 / C 705).
- **Ne PAS re-soustraire le 705** (double comptage). Dériver du GL, **abandonner toute table de planification parallèle**.

### A5 — Comptabilité d'engagement / droits constatés `🟢 FAIT LOI`
**Source : décret 2005-240 (art. 14-3 loi 65) ; arrêté 14 mars 2005 (partie double).**
- Enregistrement **à l'engagement** (exigibilité), pas seulement à l'encaissement.
- Partie double obligatoire (Σ débits = Σ crédits sur chaque écriture).

---

## B. DÉCISIONS D'ARCHITECTURE

### B1 — Contrepartie de la balance d'ouverture = compte d'attente 471/472 `🟢 TRANCHÉ`
- La reprise de mandat saisit les soldes de départ **par lot** ; la contrepartie est un **compte d'attente (471/472)**.
- **JAMAIS** un compte de résultat (89x) **ni** le compte interne 120. (Le débat initial 89x/120 est clos.)
- Comportement **volontairement non bloquant** : un solde d'attente résiduel est toléré jusqu'à l'approbation des comptes.
- **⚠️ RISQUE À CORRIGER (tranche T1) :** il existe **deux bouts de code** qui font la reprise **différemment** → à **fusionner**. Sinon une reprise saisie par l'un n'est pas relue par l'autre (une reprise peut « se perdre »).

### B2 — `operation_id` sur les écritures travaux = AJOUT DE SCHÉMA `🟡 PROPOSÉ` (juridiquement obligatoire)
- **Pourquoi obligatoire :** l'annexe 4 (travaux 14-2 réalisés) et l'annexe 5 (travaux votés non clôturés) se présentent **par opération**. Sans cette dimension, l'annexe 5 conforme est **impossible** à produire (cf. A1, A2).
- **Décision :** rattacher chaque écriture de charge/produit travaux à l'**opération votée** (`operation_id`), **en plus** du compte.
- Une **opération** peut **agréger plusieurs résolutions d'AG** (vote initial + avenant / budget complémentaire sur le même chantier).
- **Impact à-nouveau :** la clôture d'exercice doit **reporter les soldes travaux non répartis** d'un exercice sur l'autre (porté par le compte 12, par opération).
- **⚠️ C'est la SEULE vraie migration à enjeu de la série finance → revue adversariale multi-agents obligatoire (convention §9 passation).**
- **Statut :** validation finale Lyes attendue sur le *modèle* (où l'étiquette se pose, déclencheur de clôture d'opération). Le *principe* est imposé par la loi.

### B3 — Sort du compte interne 120 `🟡 PROPOSÉ`
- **Position :** garder 120 est tolérable **UNIQUEMENT** si les trois conditions sont réunies :
  1. il n'apparaît dans **aucune annexe** légale (déjà le cas) ;
  2. il sert **uniquement** au **résultat COURANT** ;
  3. il est **soldé à zéro dans la transaction de clôture** (transit, jamais un solde qui traîne).
- **Le vrai bug à corriger :** le « tout sur 120 » qui fait transiter **aussi le travaux** par le compte courant. Le travaux va au **compte 12 légal, par opération** (cf. A1/A2/B2).
- **Statut :** à valider par Lyes — assumer 120 comme transit courant, ou coller à la lettre du plan légal (répartition directe sans transit) ?

### B4 — Nature « courant vs travaux » = étiquette explicite sur le compte `🟡 PROPOSÉ`
- **Aujourd'hui :** le logiciel **devine** la nature à partir du n° de compte + une **liste écrite en dur** → fragile, avec des **oublis**.
- **Liste actuelle oublie : 661, 662, 671, 677, 703, 704** (oublier **671** = le plus grave).
- **Décision proposée :** colonne `accounts.nature` (2ᵉ dimension sur les 6x/7x, **distincte** de la nature des 45x), seedée explicitement :
  - **Courant** = 60→64 + 701 + 711-718.
  - **Travaux/exceptionnel** = tout le 67 (671…678, dont 677, 678) + 702/703/704/705 + 661.
- **Statut :** à valider par Lyes, + arbitrages C1 (662 et 711-718).

### B5 — Imputation des paiements = cloisonnement par nature `🟡 PROPOSÉ` (juridiquement correcte)
- **Aujourd'hui :** par défaut, le paiement rembourse la **plus vieille dette toutes natures mélangées** (FIFO global). Le cloisonnement n'est activé que sur demande explicite.
- **Décision :** modèle d'imputation =
  1. **override manuel** (si le syndic affecte explicitement) ;
  2. **cloisonnement par nature** (le 105 ALUR est **obligatoirement** cloisonné — ordre public ; reliquat non affecté → **450-3 avance**) ;
  3. **intra-nature :** accessoires (intérêts/frais, art. 1343-1) **puis** FIFO par ancienneté.
- **Contresens à supprimer :** le commentaire de code qui invoque l'art. 1342-10 pour justifier un FIFO multi-nature. Dans ce texte, « la plus ancienne » est un critère de **4ᵉ rang** (après échéance et « le plus d'intérêt à acquitter »).
- **⚠️ Prérequis :** supprimer les appels `budget_id = NULL` (sinon la nature n'est pas fiable).
- **Statut :** principe juridiquement validé ; reste l'arbitrage C4 (strict partout vs ALUR strict + FIFO universel ailleurs).

### B6 — Étendre `audit_finance_integrity` au contrôle de nature `🟡 PROPOSÉ`
- Le contrôle d'intégrité vérifie l'équilibre, le rattachement lot des 450, la cohérence des soldes d'appel — **mais PAS** la cohérence courant/travaux.
- Or la nature devient **porteuse** (elle décide de l'affectation). Risque : le garde-fou protège là où il n'y a plus de risque, et rate le nouveau.
- **Décision proposée :** ajouter un contrôle **« pas de charge travaux sans `operation_id` »** (et plus largement, cohérence nature compte ↔ destination).

### B7 — Trop-perçu (450-3) NON ré-imputé automatiquement = CORRECT, ne pas « corriger » `🟢 TRANCHÉ`
- L'avance reste en 450-3 jusqu'à action manuelle. **C'est de l'argent du copropriétaire** → l'absorber tout seul au prochain appel serait **moins** correct, pas plus. **Ne pas toucher.**

---

## C. QUESTIONS OUVERTES (jugement d'expert copro — Lyes tranche) `🔴 OUVERT`

- **C1 — Nature de 662 (agios/charges financières) et 711-718 (produits divers).**
  Proposition : 662 = *travaux* par défaut, 711-718 = *courant*, **configurables au compte**. À confirmer.
- **C2 — Annexe 1, ligne 450-5 débiteur** (cotisation ALUR appelée mais non versée) :
  ligne de créance dédiée « cotisations fonds travaux à recevoir » (recommandé) **ou** neutralisée ?
- **C3 — Annexe 1, sens des soldes :** un copropriétaire **créditeur = une DETTE du syndicat** (jamais soustraite des créances) ; le 105 ALUR = réserve hors créances. → séparer **par sens de solde, par lot**, isoler le 450-5, ranger 105/103 au bloc « réserves ». **À confirmer par Lyes.**
- **C4 — Cloisonnement travaux :** strict par nature partout (recommandé, plus cohérent) **ou** seulement ALUR strict + FIFO universel pour le reste ?
- **C5 — Numérotation annexe 3 vs 4 :** vérifier **visuellement** sur le PDF officiel des modèles (une source minoritaire les intervertit).
- **C6 — Dénominateur de la majorité art. 24 :** confirmer que le code mesure le 24 sur les **voix exprimées** (hors abstentions/absents) et **non** sur le total des tantièmes du syndicat (qui est la base du 25/26). Mesurer le 24 contre le total = résolutions plus dures à passer que la loi → risque de contestation.
- **C7 — Arrondi du largest-remainder :** confirmer que le centime résiduel est attribué de façon **déterministe et idéalement tournante**, pas systématiquement « au dernier lot du tableau » (un copropriétaire toujours +0,01 € ressort en contentieux).

---

## D. RAPPELS — comportements VOLONTAIRES (ne PAS signaler comme bugs)
- **RLS désactivée** sur ~72/87 tables = voulu en phase **dev** (à activer avant prod, Phase 1).
- **Écarts boucle d'or `22222222`** (+0,16 / −423 / +30) = **artefacts attendus** (une copro fraîche = 0 écart). Copro `11111111` laissée **intacte** (immutabilité GL).
- **`src/types/supabase.ts` périmé** (post_call_for_funds y traîne) = connu, à régénérer (`supabase gen types`) ; **pas** un bug de logique.

---

## E. INVARIANTS (jamais violés)
1. Le **grand livre est la source unique de vérité**. Tout solde se dérive des écritures postées, jamais d'une table parallèle.
2. **Partie double** : chaque écriture équilibrée.
3. **Lot-centric** : l'unité est **LE LOT** (dimension `lot_id` sur chaque ligne 450-x). Le solde d'une personne = somme de ses lots. **Pas un compte par lot** : un seul 450-x par nature + étiquette lot sur la ligne.
4. **Immuabilité** : on ne modifie/supprime jamais une écriture postée ; correction = **contre-passation**.
5. Toute opération se **prouve** : `db reset` + `audit_finance_integrity = 0` + vitest.
