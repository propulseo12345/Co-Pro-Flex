# Spec — Avoirs fournisseurs (notes de crédit) · type dédié

> Décision **G5** (DECISIONS.md, 2026-06-10) : modéliser l'avoir comme **entité dédiée**, montant
> **positif**, **sens inverse** au grand livre. Pas de `total_amount` négatif (le `CHECK > 0` reste).
> Cible = **nouvelle base** (G2). **Spec, pas encore codé** — quelques points métier à confirmer.

## Le problème en clair
Un **avoir** = le fournisseur annule/réduit une dette (trop-facturé, retour, geste commercial). Aujourd'hui
le front tente de créer un avoir avec un `total_amount` **négatif** → rejeté par le `CHECK total_amount > 0`
de `supplier_invoices`. Forcer un négatif casserait aussi les invariants comptables (sommes, annexes).

## Modèle proposé (type dédié)

**Option A (recommandée) — colonne discriminante sur `supplier_invoices` :**
- Ajouter `doc_kind` enum `('invoice','credit_note')` (défaut `'invoice'`).
- `total_amount` **reste positif** pour les deux.
- FK optionnelle `original_invoice_id uuid` (l'avoir référence la facture d'origine).
- Avantage : réutilise la table, les lignes de ventilation, le règlement, les vues — **blast radius minimal**.

**Option B — table séparée `supplier_credit_notes` :** plus « pure » mais duplique lignes/règlement/vues.
→ **Reco : Option A** (discriminant), sauf si tu veux un cycle de vie vraiment distinct.

## Écriture comptable (à CONFIRMER avec toi)
Facture normale (rappel) : **D 6xx (charge) / C 401 (dette fournisseur)**.
Avoir = **inverse**, montant positif :

| Mouvement | Débit | Crédit | Effet |
|-----------|-------|--------|-------|
| Avoir comptabilisé | **401** (la dette diminue) | **6xx** (la charge diminue) | annule tout ou partie de la facture |

- L'avoir « posté » fait donc **D401/C6xx** (miroir de la facture).
- **Question métier 1 :** quel compte 6xx créditer ? → celui des **lignes de l'avoir** (même ventilation que la facture d'origine), repris de `original_invoice_id`.
- **Question métier 2 :** un avoir peut-il **dépasser** le solde dû au fournisseur (créer un solde débiteur 401 = le fournisseur nous doit) ? Si oui, prévoir le **remboursement** (D512/C401) ou l'**imputation** sur une facture future.
- **Question métier 3 :** avoir **partiel** (montant < facture) autorisé ? (probablement oui.)

## Garde-fous
- `post_supplier_credit_note(...)` (nouvelle RPC, miroir de `post_supplier_invoice`) : écrit D401/C6xx, montant positif, met à jour le solde fournisseur.
- Le statut facture d'origine peut passer à `cancelled` (avoir total) ou rester `posted` (avoir partiel).
- **Gate de preuve** à ajouter (`db:test`) : facture 1000 → avoir 1000 → solde 401 = 0 et charge 6xx = 0 (annulation propre) ; audit cohérent.

## Plan d'implémentation (sur la nouvelle base G2)
1. Migration : `doc_kind` + `original_invoice_id` sur `supplier_invoices` (ou table dédiée si Option B).
2. RPC `post_supplier_credit_note` (miroir, montant positif, D401/C6xx).
3. Front : bouton « Créer un avoir » → payload positif + `doc_kind='credit_note'` + lien facture.
4. Gate E2E (facture → avoir → soldes à 0).

## Statut
🟢 décidé (type dédié) · ⏳ **3 questions métier ci-dessus à confirmer avant de coder** · cible = re-baseline G2.
