# Recherche — Le cycle de la dépense en copropriété & le suivi budgétaire

> Briefing expert produit le 2026-05-30 (droit + pratique comptable + analyse du code réel CoProFlex).
> Sert de base à la fiche **Budget** (rang 3) et tranche la **Q2 grand livre** (`budget_expenses`).
> Fondements : loi 65-557 (art. 14-1, 14-2, 14-3, 18-21, 42), décret 2005-240 + arrêté du 14/03/2005 (plan comptable, annexes 1-5).

## 0. Le principe non négociable

Comptabilité **partie double + droits constatés/engagement** (art. 14-3). Source unique = le **grand livre** (`ledger_entries`). **Un montant qui n'est pas une écriture postée n'est pas une réalité comptable** — au mieux une donnée de pilotage.

## 1. Le cycle de vie d'une dépense : 4 paliers

| Palier | Déclencheur | Trace comptable | Au grand livre ? |
|---|---|---|---|
| **1. Voté** | Vote budget AG (14-1) ou travaux (14-2) | aucune (prévision) | Non — référence |
| **2. Engagé** | Devis signé / contrat couru / bon de commande / OS | aucune tant que non exécuté | **Non — angle mort** |
| **3. Charge comptabilisée** | **Service rendu / fourniture livrée** (facture) | Débit charge 6x / Crédit 401 (ou **408** si facture non parvenue) | **Oui** |
| **4. Payé** | Décaissement | Débit 401/408 / Crédit 512 | **Oui** |

**Point juridique central :** « comptabilité d'engagement » ≠ comptabilité des bons de commande (secteur public). Le **fait générateur de la charge** = l'engagement juridique **précisé en exécution de la prestation** (art. 14-3 + art. 4 décret : rattachement à « l'exercice d'exécution »). En pratique les syndics comptabilisent **à réception de facture** et régularisent en clôture (408). **Un devis/contrat non encore exécuté ne génère AUCUNE écriture.** → Le palier « Engagé » n'est dérivable d'aucune écriture : c'est le vide que `budget_expenses` pourrait légitimement combler.

## 2. Engagé vs Réalisé : la distinction qui structure tout

```
Budget VOTÉ  ≥  ENGAGÉ (contrats + devis acceptés + OS)  ≥  RÉALISÉ (charges classe 6 au ledger)
```
- **Voté** = `budget_lines.amount` (par `account_id` de charge). Saisi à la main, légitime.
- **Engagé** = obligation juridique pas encore une charge. **Notion de gestion, non normée par le décret** (« hors bilan »). Porté aujourd'hui par `contracts.annual_amount`, `service_orders.estimated/quoted_amount`, `planned_works.voted_amount` — jamais agrégé ni confronté au budget.
- **Réalisé/consommé** = **somme des débits classe 6 du grand livre** par compte/période. Seule définition juridiquement défendable.
- **Disponible** = `Voté − Engagé` (prudent) ou `Voté − Réalisé` (comptable).

**Dans le code, DEUX « réalisés » concurrents :**
- ✅ `v_budget_consumption_by_account` : réalisé **correct**, dérivé du grand livre (`budget_lines.account_id` ↔ débits `ledger_entries`). Le bon calcul **existe déjà**.
- ❌ `v_budgets_overview` / `v_budget_lines_overview` : réalisé = `SUM(budget_expenses WHERE status='validated')` = saisie manuelle, sans `account_id`, sans partie double. **Le front (`useBudget`) affiche celui-ci** → consommé sans contrepartie comptable.

## 3. Contrats, interventions & frais supplémentaires (le point de l'expert)

- **Contrats récurrents** (`contracts`, ex. ascenseur/chauffage/assurance) : charges courantes (14-1). `annual_amount` = engagement annuel récurrent → devrait alimenter le palier « engagé ». Chaque échéance facturée = charge (compte 614 / crédit 401). Aujourd'hui **relié ni au budget ni au ledger**.
- **Interventions ponctuelles** (`service_orders`, `contract_id IS NULL` = hors contrat) : la table porte **déjà** `estimated → quoted → actual`, une machine à états horodatée, et un `calculerEcart` (alerte > 10 %) côté front. **C'est exactement la modélisation engagé vs réalisé** — mais `update_service_order_status` **ne crée ni facture ni écriture** (statuts `invoiced`/`paid` déclaratifs), et `getFactureLiee()` renvoie toujours `undefined`.
- **Frais supplémentaires** = écart `actual_amount (réalisé) − quoted_amount (engagé initial)`. Argument fort pour garder une couche d'engagement : le grand livre enregistre la facture finale, mais seul un engagé de référence détecte le dépassement.
- **Dépassement de devis voté** : le syndic ne peut engager au-delà du voté ; supplément = **avenant revoté en AG**. Bonne pratique : **figer l'engagement initial** + historiser l'avenant séparément (preuve du mandat, art. 18-21).
- **Travaux urgents (art. 18)** : le syndic engage seul, la charge entre au grand livre **avant** ratification AG (provision ≤ 1/3 du devis). Prévoir un statut « en attente de ratification ».
- **Piège technique** : `service_orders`/`contracts` pointent `providers`, les factures pointent `suppliers`, **sans FK entre les deux** → rapprochement engagement↔charge impossible automatiquement.

## 4. Cut-off de clôture : comptes 408 et 486 (obligatoire)

- **408 « Factures non parvenues »** : prestation **exécutée** avant clôture, facture non arrivée → Débit charge 6x / Crédit 408, extournée à l'ouverture N+1. **C'est LE vrai engagement comptable** : l'engagé exécuté converge toujours vers le réalisé via 408.
- **486 « Charges constatées d'avance »** : facture reçue/payée sur N mais prestation N+1 (assurance, maintenance à cheval) → Débit 486 / Crédit charge, bascule à l'ouverture N+1.
- ⚠️ Un engagement **non exécuté** (devis signé, échéance future) **ne va PAS en 408** (réservé au réalisé).

## 5. Suivi budgétaire attendu & risque juridique

Le « voté vs réalisé » présenté en AG = **Annexe 2** (compte de gestion général) + **Annexe 3** (charges courantes par poste classe 6), avec contrainte *Annexe 3 = opérations courantes de l'Annexe 2*. Travaux (14-2) = Annexes 4/5. **Ces annexes dérivent des soldes classe 6 du grand livre comparés au budget voté — le réalisé n'est jamais saisi à la main.**

**Risque concret :** imputations hors grand livre = **cause de nullité des comptes** (contestable sous 2 mois, art. 42). Une `budget_expenses` servant de « réalisé » sans `account_id` ni partie double **ne peut pas être la source légale du consommé**.

## 6. Recommandation Q2 — Option C : requalifier, ne pas supprimer

Ne **PAS** garder `budget_expenses` comme « réalisé » (viole source unique + risque de nullité), ne **PAS** la supprimer sèchement (le ledger ne porte ni le voté ni l'engagé) :
1. **Action corrective prioritaire** : retirer à `budget_expenses` tout rôle de « réalisé ». Rebrancher `v_budgets_overview`, `v_budget_lines_overview` et le front `useBudget` sur `v_budget_consumption_by_account` (réalisé = ledger).
2. **Requalifier** `budget_expenses` en table d'**engagements** (ou la fusionner avec `service_orders`), étiquetée *extra-comptable*, reliée en amont à `budget_lines` (poste voté) et en aval à `supplier_invoices` (FK) pour réconciliation dès facturation. Le réalisé reste **toujours** porté par le ledger.

## Modèle cible — Voté / Engagé / Réalisé / Disponible

| Table | Rôle cible | Lien grand livre |
|---|---|---|
| `budgets` + `budget_lines` | **VOTÉ** (`amount` + `account_id` classe 6) | indirect via `account_id` |
| `budget_engagements` (= `budget_expenses` requalifiée OU fusion `service_orders`) | **ENGAGÉ** : contrats, devis, OS, frais sup. `budget_line_id`, `account_id`, `montant_engage`, `montant_vote_initial` figé, statut `engagé→facturé→payé→soldé`, réfs AG/devis. Extra-comptable. | FK `supplier_invoice_id` (réconciliation), jamais d'écriture directe |
| `supplier_invoices` + `_lines` | **CHARGE** (`account_id` NOT NULL ; rendre `budget_line_id` obligatoire) | `ledger_tx_id` → écriture postée |
| `supplier_payments` | **PAYÉ** (classe 5) | `ledger_tx_id` |
| `ledger_entries` | **Source unique RÉALISÉ + PAYÉ** | — |

```
VOTÉ      = budget_lines.amount
ENGAGÉ    = SUM(budget_engagements.montant_engage WHERE statut='engagé')   -- non encore facturé
RÉALISÉ   = SUM(ledger_entries.debit) sur account_id, période              -- = v_budget_consumption_by_account
DISPONIBLE_prudent   = VOTÉ − ENGAGÉ − RÉALISÉ
DISPONIBLE_comptable = VOTÉ − RÉALISÉ                                      -- vision annexe 2/3
```
Quand une intervention est facturée : son `montant_engage` **sort** de l'agrégat engagé (statut → `facturé`) et le réel apparaît au réalisé via le ledger → **pas de double comptage**.

**Exemple (intervention à frais sup) :** OS quoted 800 € (engagé, compte 615) → facture 950 € postée (Débit 615 / Crédit 401, engagement→`facturé`) → dépassement `950−800 = +150 €` (alerte, `calculerEcart`) → paiement (Débit 401 / Crédit 512) → clôture : si exécuté non facturé → 408.

**Vues à corriger :** rebrancher `v_budgets_overview`/`v_budget_lines_overview` sur le réalisé ledger ; **ajouter** une colonne « engagé » ; brancher `useBudget` sur les 3 niveaux.

**Dette technique à solder en parallèle :** réparer/câbler `create_supplier_invoice` + `pay_supplier_invoice` (sinon `ledger_tx_id` reste NULL — idéalement une **fonction DB `post_supplier_invoice`**) ; FK `providers ↔ suppliers` ; `supplier_invoice_lines.budget_line_id` obligatoire ; adosser `alur_transfers` au ledger (compte 105).

## Points à arbitrer — DÉCISIONS (2026-05-30, avec l'expert)

- **C1 → TRANCHÉ** : on **requalifie** `budget_expenses` (pas de suppression). Engagements structurés via `contracts`/`service_orders` **+** une **saisie manuelle** (`budget_expenses`) pour les cas hors-cadre : si pas de justificatif → **prévient sans bloquer**, mais l'écriture comptable est quand même générée (grand livre toujours alimenté). Réalisé = jamais cette table, toujours le ledger.
- **C2 → TRANCHÉ** : on **matérialise le palier « engagé »**, livré au **go-live** (pas phase 2).
- **C3 → TRANCHÉ** : l'engagement naît à la **signature du devis / émission de l'OS** (récurrent : mise en cours du contrat), **pas** au vote d'AG (= le « voté »).
- **C4 → DÉFAUT** (modifiable) : contrat récurrent = **1 ligne d'engagement annuelle** se résorbant facture par facture (échéancier 12 lignes en option ultérieure).
- **C5 → TRANCHÉ** : **figer** le montant engagé/voté initial + **historiser l'avenant séparément** (jamais d'écrasement) — preuve du mandat (art. 18-21) + détection des frais supplémentaires.
- **C6 → DÉFAUT** (modifiable) : seuil d'alerte de dépassement **configurable**, défaut **10 %**, qui **prévient sans bloquer** ; la régularisation légale reste annuelle (art. 24).

## Sources principales
Légifrance (art. 14-1/14-2/14-3 loi 65-557, décret 2005-240, arrêté 14/03/2005) ; ARC (arc-copro.fr : FNP, travaux d'urgence, un compte par fournisseur, budget prévisionnel) ; IRC (comptabilité d'engagement, FNP, annexe 2, budget prévisionnel, travaux urgents) ; compta-online (FNP) ; copriciel (FNP vs CCA, plan comptable, annexes) ; service-public.gouv.fr ; Bellman ; Simonnet Avocat (nullités) ; ANIL.
