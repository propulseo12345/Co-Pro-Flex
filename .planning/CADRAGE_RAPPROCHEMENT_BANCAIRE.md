# Cadrage — Rapprochement bancaire (voie d'écriture) — 2026-06-13

> À trancher ENSEMBLE avant de coder (décision Lyes 2026-06-13). Cartographie complète
> faite (agent) ; ce doc isole les **questions comptables** qui décident du modèle.

## Ce qui existe déjà (rien à refaire)

- Tables : `bank_movements` (relevé : bank_date, amount_signed ±, label, bank_ref, status
  unmatched/matched/ignored, account_id→512/502), `bank_matches` (mouvement↔cible :
  target_type payment|supplier_payment|other, amount_matched), `accounts` classe 5.
- Vues : `v_bank_movements_overview` (direction crédit/débit, remaining_to_match),
  `v_account_balances` (solde = initial + Σ mouvements).
- RPC : `refresh_bank_movement_status(movement_id)` (recalcule le statut depuis les matches).
- Front COMPLET (specs 2026-03-16 + 2026-04-03) : 4 onglets Import/Catégorisation/
  Rapprochement/Clôture + matching engine 3 règles — **mais ne persiste PAS** (pas d'edge).
- GoCardless (API bancaire DSP2 lecture seule) : 4 routes /api/banking/* câblées (connexion,
  comptes). Lecture des mouvements PAS encore automatisée (import manuel CSV/OFX/CFONB).

## Ce qui manque (à créer)

- `import_bank_movement` : insérer les lignes du relevé dans `bank_movements` (dédup bank_ref).
- `reconcile_bank_movement` : pointer/écrire (← LE point comptable à trancher).
- `bank_requisitions` (table) : lien copro↔requisitionId GoCardless (sécurité IDOR, audit S3).

## ⚠️ Question comptable CENTRALE (à valider)

**Le compte 512 est-il déjà mouvementé à la SAISIE des opérations ?**
D'après le code : OUI. Appel encaissé → D512/C450 ; facture payée → D401/C512.

→ **Conséquence majeure** : en copropriété (compta d'engagement, partie double), le rapprochement
bancaire est de la **RÉCONCILIATION (pointage)** entre le relevé réel et les écritures 512
DÉJÀ au grand livre — PAS de la re-création d'écritures 512. Reposter une écriture 512 au
rapprochement = **double comptage** (le solde 512 serait faux).

Donc le modèle correct n'est PAS « si rapproché à 100 % → poster une écriture » (ce serait faux),
mais : **pointer** le mouvement bancaire contre l'écriture 512 existante (créer le `bank_match`,
statut → matched), SANS nouvelle écriture. L'écriture n'est créée QUE pour un mouvement bancaire
SANS contrepartie comptable (frais, agios, encaissement non saisi).

## Décisions à trancher (4)

1. **Confirmer le modèle « pointage »** : reconcile_bank_movement lie le mouvement à une écriture
   512 existante (payment/supplier_payment) → bank_match + status, ZÉRO nouvelle écriture.
   ✅/❌ ?

2. **Encaissement bancaire SANS paiement saisi** (le relevé montre un virement copro, mais aucun
   paiement n'a été enregistré en compta) — 3 options :
   - (a) Exiger la saisie du paiement d'abord, puis pointer (le plus rigoureux).
   - (b) Créer le paiement (D512/C450-1 du lot) directement depuis le rapprochement.
   - (c) Compte d'attente 471 (D512/C471) puis affectation manuelle ultérieure.
   → laquelle ?

3. **Frais / agios bancaires** (débit sans contrepartie) : créer l'écriture D627 (services
   bancaires) / C512 directement au rapprochement ? Quel compte exact (627 ? 6278 ?).

4. **bank_requisitions** : table de sécurité simple (copro_id, requisition_id unique, status) +
   durcir les routes /api/banking/* pour vérifier l'appartenance copro. Pas de débat comptable.
   ✅ à faire.

## Périmètre proposé (après validation)

- Migration : `bank_requisitions` + `import_bank_movement` (RPC SQL gardée gestionnaire,
  dédup bank_ref) + `reconcile_bank_movement` (pointage + création conditionnelle selon Q2/Q3) +
  gate (pointage ne double PAS le 512, frais crée bien D627/C512, dédup import).
- Front : brancher les onglets Import/Rapprochement sur les nouvelles RPC (le matching engine
  reste front pour les suggestions).
- Sécurité : durcir /api/banking/* (appartenance copro via bank_requisitions).

## Estimation

Gros chantier finance à enjeu GL (~2-3 sessions). Revue adversariale ultracode obligatoire
(comme les migrations finance). NON bloquant pour la bêta (module en lecture aujourd'hui) ;
important pour la trésorerie réelle.
