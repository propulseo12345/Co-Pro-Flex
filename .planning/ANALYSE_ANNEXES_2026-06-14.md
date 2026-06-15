# Analyse des 5 annexes comptables légales — croisement loi × web × code (2026-06-14)

> Produit en réponse au cadrage J5 (point 7 / E2-E7-E8). Croise : textes (arrêté du 14 mars 2005 + décret 2005-240),
> sources spécialisées recoupées (ARC, Informations Rapides de la Copropriété, JPM-Copro, Valcompta), et le code réel
> (`fn_annexe_1..5` dans `0028_derives_vues_annexes.sql`) + les types front (`Comptabilite/types.ts`).

## ⚠️ Fiabilité des sources
**Légifrance ne reproduit pas les tableaux** de l'arrêté (modèles annexés en images, non rendus en HTML). Les structures de
colonnes viennent de sources secondaires fiables **recoupées ≥3 fois**. Un seul point reste à confirmer sur le PDF officiel du
JO : le **nombre de colonnes de l'annexe 4** (tranché ci-dessous par le choix « le plus safe »).

## Cadre juridique
Loi 65-557 (art. 14-3) → décret comptable **2005-240 du 14 mars 2005** → **arrêté du 14 mars 2005** (NOR ECOT0500011A) fixant les
5 modèles ; modifié par l'**arrêté du 27 déc. 2016** (refonte travaux) et l'**arrêté du 20 août 2020** (fonds ALUR, compte 105).
Annexes **obligatoires**, jointes à la convocation d'AG d'approbation des comptes.

---

## Croisement par annexe (LOI vs CODE actuel vs FRONT attendu)

### Annexe 1 — État financier après répartition (le bilan)
- **LOI** : 2 parties — (I) trésorerie (50/51/53) + provisions/avances/réserves (102, 103, **105 ALUR**, 106, **12 solde travaux**) ; (II) **créances ET dettes séparées par sens** ; 2 colonnes (N / N-1) ; **équilibre débit = crédit** ; fonds ALUR au passif avec sa trésorerie placée (501/502) à l'actif.
- **CODE** (`fn_annexe_1`) : 4 scalaires plats — trésorerie (= **512 seul**), provisions (**103+105 mélangés**), créances (45x net), dettes (40x). Pas de N-1, pas de détail, **pas de compte 12**, créances/dettes **non séparées**, trésorerie incomplète.
- **FRONT** (`AnnexeData1`) : listes par compte, créances/dettes séparées, N-1. **Déjà au bon format.**
- **Écart** : 🔴 majeur (E7). + **incohérence ALUR** : 105 compté au passif mais 501/502 absents de la trésorerie → bilan déséquilibré. + **compte 12 absent** = contrôle croisé avec annexe 5 impossible.

### Annexe 2 — Compte de gestion général (compte de résultat)
- **LOI** : **5 colonnes** (N-2 approuvé / budget N-1 / réalisé N-1 à approuver / budget en cours N / à voter N+1) ; **2 blocs** : I courant (60-66 / 701), II travaux-exceptionnel (67 / 702-706).
- **CODE** (`fn_annexe_2`) : **2 colonnes** (budget voté, réalisé) ; **un seul bloc** (tout 6x en charges, tout 7x en produits, sans séparer courant/travaux).
- **FRONT** (`Ligne5Colonnes` + `AnnexeData2`) : 5 colonnes + `charges_travaux` séparées. **Déjà au bon format.**
- **Écart** : 🔴 majeur (E8). Lecture de `charge_nature` (E3) requise pour séparer les blocs.

### Annexe 3 — Compte de gestion opérations courantes (ventilation par clé)
- **LOI** : le bloc I **classé par clé de répartition**, 5 colonnes, par clé : charges / produits / **net**.
- **CODE** (`fn_annexe_3`) : **montant budgété par clé** (1 colonne), pas le réalisé, pas charges/produits/net.
- **FRONT** (`CleAnnexe3`) : par clé, lignes 5 colonnes + total charges/produits/net. **Déjà au bon format.**
- **Écart** : 🔴 majeur *(plus pauvre que l'audit initial ne le pensait — annexe 3 est AUSSI à refaire)*.

### Annexe 4 — Travaux art. 14-2 et opérations exceptionnelles VOTÉS ET CLÔTURÉS
- **LOI** : par opération — dépenses votées / réalisées / **financements (appels + emprunts + subventions + affectation fonds)** / solde. **4 vs 6 colonnes : sources divergentes** (Valcompta : le 6 colonnes est une habitude d'éditeurs, pas la règle).
- **CODE** (`fn_annexe_4`) : voté / réalisé / solde (=voté−réalisé), budgets `works` `status='closed'`. **Manque la colonne financement.**
- **FRONT** (`LigneAnnexe4`) : votées / réalisées / **provisions_appelees** / solde.
- **DÉCISION (2026-06-14)** : **6 colonnes** (sur-ensemble safe : votés / payés / réalisés / appels reçus / solde / subventions à recevoir) — couvre le format officiel quel qu'il soit + cohérence avec annexe 5.

### Annexe 5 — Travaux art. 14-2 et opérations exceptionnelles VOTÉS NON CLÔTURÉS
- **LOI** : **6 colonnes A–F** : votés / payés / réalisés / **appels reçus** / **solde en attente (= compte 12)** / subventions à recevoir. **Contrôle légal : Σ colonne E = compte 12 de l'annexe 1.**
- **CODE** (`fn_annexe_5`) : voté / réalisé / **solde = voté−réalisé** (budgets `works` `status='validated'`).
- **FRONT** (`LigneAnnexe5`) : 6 colonnes A–F + date AG + clé. **Déjà au bon format.**
- **Écart** : 🔴 majeur — 4 colonnes manquantes ET **le solde est faux au sens légal** (voté−réalisé au lieu de financé−réalisé = compte 12). + filet « travaux non rattachés » (E9) absent.

---

## Décisions actées (2026-06-14)
1. **Annexe 4 → 6 colonnes** (sur-ensemble safe).
2. **Libellé colonne financement → version en vigueur** (arrêtés 2016/2020) : « Appels de provisions, emprunts et subventions reçus, affectation du fonds de travaux ». *(À recroiser sur le formulaire officiel à jour si un texte de début 2026 l'a retouché — cutoff connaissance = janv. 2026.)*
3. **Sens du solde annexe 5 → aligné automatiquement sur le compte 12 du grand livre** (convention technique, prouvée par le contrôle croisé ; aucune décision métier requise).

## Cohérences croisées à transformer en gate (preuve de justesse)
```
Annexe 2 (résultat)        ──réparti──► comptes 450 de l'annexe 1
Annexe 2 bloc I            = Σ annexe 3
Annexe 2 bloc II           = Σ annexe 4 (clôturés)
Σ annexe 5 colonne E       = compte 12 de l'annexe 1      ◄── contrôle légal majeur
Annexe 1 : Σ débit         = Σ crédit
Fonds ALUR 105             = trésorerie placée 501/502
```

## Conséquence sur le plan
La décision **n°7 s'élargit** : ce n'est pas « annexes 1 & 2 » mais **les 5 annexes** (annexe 3 plus pauvre que cru, annexe 5 avec solde faux). Plus de travail SQL, mais **le front est déjà au bon format** → quasi pas de travail front. Une seule tranche « annexes », **revue adversariale obligatoire** (comptes légaux).

## Nature du problème (important)
Les `fn_annexe_*` sont des fonctions de **LECTURE** (`stable`, `security definer`, dérivées du grand livre posté — cf. en-tête 0028:812). Elles **ne modifient pas** les données : corriger les annexes = **réécrire des fonctions de lecture, sans migration de données, sans toucher au grand livre**.

## Vérification d'innocuité — PROUVÉ (workflow `wvdopagxk`, 6 agents + réfutation adversariale, confiance haute)
- **Aucune régression** : les `fn_annexe_*` n'ont **jamais changé** depuis leur création (commit `24143e8`, 2026-06-05) — corps byte-identiques. La « revue » initiale n'a touché que les **libellés** (E1/E2), jamais la structure (E7/E8 pas commencé).
- **Grand livre intact, zéro donnée corrompue** : les 6 fonctions sont `stable` (lecture seule), uniquement des SELECT dérivés du GL. L'affectation du résultat (`open_next_period`, 0060) calcule par requête **directe** sur le GL et **n'appelle aucune annexe** (grep « annexe » sur 0060 = 0). La réfutation adversariale n'a trouvé **aucune** écriture dépendant d'une annexe. → **Correction = réécriture de fonctions de lecture, sans migration de données.**
- **Mais annexes CASSÉES à l'affichage** (découverte) : (1) PDF de convocation AG + écran « Documents officiels » : annexe 1 plante car le front fait `.map()` sur la trésorerie alors que le SQL renvoie un nombre (`annexe-pdf-tables.ts:228`, `AnnexeTables.tsx:126`) ; (2) annexes 2/3 : le front envoie `p_next_period_id` que la fonction n'accepte pas (`useAnnexeData.ts:71`) → appel en échec. **⚠️ Ne pas envoyer de convocation AG avec annexes avant la refonte.**
- **Sain (lit le GL en direct, pas les annexes)** : dashboard/KPI (`fn_dashboard_kpis`), balance, grand livre, export CSV, état daté.
- **Vide de test total** : aucun gate ne couvre les annexes → ajouter les gates (cohérences croisées) EN MÊME TEMPS que la refonte.
- **À harmoniser** : trésorerie « 512 seul + inclut 5121 travaux » diffère entre annexe (inclut) et dashboard (exclut) ; provisions 103+105 à séparer (E7).

## Sources
Arrêté 14 mars 2005 (Légifrance JORFTEXT000000258165) · Informations Rapides de la Copropriété (annexes 1/2) · ARC (annexes 1/5, PDF formulaires) · JPM-Copro (études 7-5-2-3/4) · Valcompta (mise en garde annexe 4) · plans comptables Coproplus/Copriciel.
