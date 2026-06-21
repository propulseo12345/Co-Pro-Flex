# 0087 — RPC correction comptable : câblage front, tests, risques (PRÉPARÉ, NON APPLIQUÉ)

> Workflow design + revue adversariale du 2026-06-21. Verdict : **corrections_mineures** (design solide,
> 3 corrections F-A/F-B/F-C intégrées). **NON appliqué** : cloud vierge (0 paiement/facture postés) → tests
> impossibles + 1 arbitrage métier à trancher. SQL : `0087_rpc_correction_comptable.sql`.

## 2 barrières AVANT d'appliquer

1. **Tests verts requis** (la revue l'impose) : dérouler T0→T10 en `BEGIN/ROLLBACK` sur des données réelles
   (boucle d'or `22222222` re-seedée, ou scénario monté). Aujourd'hui le cloud n'a aucun paiement posté.
2. **Arbitrage métier (Lyes)** : `reverse_payment` d'un paiement dont l'**appel** est dans une période
   **approuvée** mute `amount_paid` de cet appel clos (GL préservé via extourne 'od'). **Reco : AUTORISER**
   (le relevé suit le réel encaissement). Si tu veux refuser → ajouter une garde « période de l'appel approuvée ».

## Câblage front (à faire AVEC l'application, pas avant — sinon bouton « Contre-passer » cassé)

`src/features/finance/comptabilite/hooks/useComptabilitePage.ts` — `canReverseSelected` (~l.148-155) :
```diff
   if (!op?.txId || op.isReversed || op.reversalOf || !hasOpenPeriod) return false;
-  const REGENERABLE = ['opening_balance', 'closing', 'opening_onboarding', 'result_allocation'];
-  return !REGENERABLE.includes(op.sourceType ?? '');
+  const REGENERABLE = ['opening_balance', 'closing', 'opening_onboarding', 'result_allocation'];
+  // Ces types ont une RPC métier dédiée : la contre-passation GÉNÉRIQUE est interdite (créance fantôme).
+  // NB 'supplier_credit_note' (avoir) GARDE la voie générique (faille F-C) — extourne C6xx/D401 saine.
+  const BUSINESS_REVERSAL = ['payment', 'call_for_funds', 'supplier_invoice'];
+  const src = op.sourceType ?? '';
+  if (REGENERABLE.includes(src)) return false;
+  if (BUSINESS_REVERSAL.includes(src)) return false;
+  return true;
```
+ **Routage** (handler par `op.sourceType`) : `payment`→`rpc('reverse_payment')` · `call_for_funds`→`cancelCallForFunds` (déjà câblé) · `supplier_invoice`→`rpc('cancel_supplier_invoice')` · `supplier_credit_note`/`od`/`manual`/`reclassification`→`reverseLedgerTransaction` (générique).
+ Ajouter `reverse_payment` et `cancel_supplier_invoice` à `src/lib/finance/api.ts` (mapping snake→camel).

## Plan de tests (BEGIN/ROLLBACK, service_role, copro boucle d'or)

- **T0** baseline `v_lot_vs_gl_mismatch = 0`.
- **T1** `reverse_payment` : status→reversed, allocations=0, amount_paid redescend, **mismatch inchangé (=0)**, extourne 'od' existe.
- **T2** idempotence (2e appel → already=true, pas de 2e extourne).
- **T3** atomicité hors période ouverte : lève 23514, allocations INTACTES (DELETE annulé).
- **T4** (sécurité F-A) `unallocate_payment` en `set role authenticated` → **permission denied** (42501 ACL).
- **T5** `cancel_call_for_funds` débloqué : refus strict si imputé → reverse_payment → re-tentative OK.
- **T6** `cancel_supplier_invoice` nominal : status=cancelled, ledger_tx_id conservé, solde 401 inchangé.
- **T7** refus si réglée · **T8** refus si avoir posté lié · **T9** idempotence + refus avoir (F-C).
- **T10** non-régression : mismatch=0 et extourne équilibrée (Σ débit−crédit=0).

## Risques résiduels

1. **F-B fenêtre TOCTOU étroite non 100% fermée** : `FOR UPDATE` sur 0 ligne enfant ne bloque pas un 1er
   INSERT concurrent. Fermeture complète = ajouter `SELECT … FOR SHARE` sur la facture parente DANS
   `post_supplier_payment` + `post_supplier_credit_note` (hors périmètre 0087, session GL dédiée).
   En l'état : fenêtre = 2 managers simultanés sur la même facture, incohérence détectable.
2. **Arbitrage période approuvée** (cf. barrière 2).
3. **Invariant reformulé** : « mismatch INCHANGÉ vs avant le paiement » (= 0 seulement sans trop-perçu/avance 450-3).
4. **Désimputation tout-ou-rien** (par design ; pas de désimputation partielle).
5. **Front** : routage + 2 fn api + `tsc` (couche front, non incluse).
