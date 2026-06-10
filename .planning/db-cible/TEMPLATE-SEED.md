# COPRO-TEMPLATE — seed de référence (test/démo), construit A→Z

> Conçu 2026-06-04. Référence test/démo **qui remplace la boucle d'or live** (décision A1).
> Légalement complète, exerce TOUTE la boucle financière + une mutation. Sous un **cabinet de référence**.
> **Plan de seed = séquence de RPC canoniques** (PAS de SQL final, PAS d'INSERT brut sur le grand livre).
> Toutes les écritures 45x portent un `lot_id` (A2). Audit financier cible = 0 écart.

---

## 1. Composition cible du template

```
Cabinet « Cabinet Démo »  (cabinets, tenant racine — multi-cabinet)
  └─ Copro « Résidence Les Tilleuls »  (copros.cabinet_id = Cabinet Démo)
       ├─ 1 building
       ├─ 6 lots  (A101,A102,A201,A202 appart. ; B001 commerce ; C001 cave)
       ├─ Clés de répartition (repartition_keys + repartition_key_lines, weight = quote-part) :
       │     · Clé GÉNÉRALE  (charges communes générales) — tous les lots, Σ = 1000
       │     · Clé SPÉCIALE « Ascenseur »  — lots étage (A201,A202) + commerce, Σ = 1000
       │     · Clé SPÉCIALE « Eau froide »  — lots habitables, Σ = 1000
       │     · Clé ALUR (art.14-2)  — quote-parts générales, Σ = 1000
       ├─ 5 copropriétaires (1 personne morale = SCI sur le commerce ; 1 copro possède 2 lots)
       ├─ lot_owners (1 primaire actif / lot ; share 100 %)
       └─ membership gestionnaire (rattaché au cabinet) + platform_admin opérateur du seed
```

- **Quote-parts** : portées **uniquement** par `repartition_key_lines.weight` (jamais `lots.tantiemes_*`,
  source dupliquée abandonnée). Chaque clé est `repartition_key_is_complete = true`.
- **Plan comptable** : posé par `provision_copro_chart` (450-1 courant, 450-2 travaux, 450-3 avance,
  450-5 ALUR ; 105 réserve ALUR ; 512 banque ; 401 fournisseurs ; 6x charges ; 7x produits ; 110/120
  report ; **471/472 comptes d'attente de reprise de mandat**, contreparties des à-nouveaux §2 étape 9).
  `450` parent `is_postable=false`.
- **1 exercice ouvert** (`accounting_periods`, `status='open'`) sur l'année courante.

---

## 2. Séquence de seed (ordre + dépendances)

> Opérée par le `platform_admin`. Chaque étape dépend de la précédente. Idempotente (rejouable).

### Phase 0 — Référentiels globaux (une fois pour la base)
1. Seed `work_domain` (~28 slugs) · `email_templates` système (6 modèles, `copro_id NULL`) ·
   1 `platform_admin`. *(Cf. `MIGRATION-DONNEES.md §2.)*

### Phase 1 — Cabinet + socle copro (domaine 01)
2. `cabinets` ← « Cabinet Démo » (tenant racine).
3. `copros` ← « Résidence Les Tilleuls », `cabinet_id` = Cabinet Démo (FK NOT NULL).
4. `buildings`, `coproprietaires` (5, dont 1 SCI), `lots` (6).
5. `repartition_keys` + `repartition_key_lines` (générale + 2 spéciales + ALUR ; weights bouclant).
6. `lot_owners` (primaire actif/lot) · `memberships` (gestionnaire ↔ cabinet) ·
   `create_default_reminder_rules` (relances J+15/30/60).
7. **`provision_copro_chart(copro)`** → plan comptable canonique.
8. `accounting_periods` ← exercice N `open`.

### Phase 2 — À-nouveaux d'ouverture propres (A2)
9. **`set_opening_balance(copro, period_N, as_of, lines)`** → reprise de mandat propre :
   chaque créance/avance 45x ligne **avec `lot_id`** (ex. lot en léger débit 450-1, lot en avance 450-3),
   contrepartie 471/472, `source_type='opening_onboarding'`. Solde initial réaliste, non bloquant.

### Phase 3 — Boucle financière complète de l'exercice N
10. **AG ordinaire** votant le budget : créer `ag_meetings` + `ag_attendance` (tantièmes figés) +
    `ag_resolutions` (CREATE_BUDGET + SCHEDULE_BUDGET_PAYMENTS, modalité trimestrielle) + `ag_votes`,
    puis **`finalize_and_activate_ag(ag, true)`** → budget validé + **appels de fonds agrégés** générés
    (`post_budget_call_for_funds` 10-args, 1 ligne par lot×clé, D450-1/lot · C701).
11. **Encaissements** : pour les lots payeurs (laisser 1-2 lots impayés pour exercer les relances),
    **`post_owner_payment(copro, period, lot, montant, date, …, call_line_ids)`** → D512/C450-1,
    imputation **FIFO cloisonnée par nature** (courant ≠ travaux ≠ ALUR).
12. **Facture fournisseur** : **`post_supplier_invoice(...)`** (D6xx/C401, mono-poste) puis
    **`post_supplier_payment(...)`** (D401/C512). + 1 `budget_expense` validée (`validate_budget_expense`).
13. **Cotisation ALUR (art.14-2)** : résolution ALUR votée en AG → **`finalize_and_activate_ag(ag, true)`**
    → **`generate_calls_from_ag_payload`** (budget_type='alur') ⇒ appel sur clé ALUR **D450-5/lot · C105**
    (réserve art.14-2 II, PAS 701). Encaissement → **`post_owner_payment(...)`** D512/C450-5.
    *(Chemin canonique 03 §5 / 04 §0 ; `create_alur_fund_from_ag` ABANDONNÉE — pas d'appel bespoke hors-GL.)*

### Phase 4 — Clôture + affectation + à-nouveau
14. Approuver/clore l'exercice N puis **`open_next_period(copro, period_N, …)`** → ouvre N+1 et
    reporte les soldes ; **split 110/120** (110 travaux, 120 courant) ; à-nouveaux N+1 par quote-part.
15. **`regularize_period(copro, period_N)`** → affectation du résultat : écriture datée à l'AG,
    D120/C450-1 (courant) · D110/C450-2 (travaux) par quote-part ; l'excédent reste sur le 450, apuré
    sur l'appel T1 de N+1.

### Phase 5 — MUTATION d'un lot (exerce l'état daté, domaine 05)
16. Vendre un lot (ex. A102) : créer la `mutation` (`lot_id`, `seller_owner_id`, `notaire_id → tiers`
    `is_notary`), trigger `initialize_mutation_steps` seede les 6 steps.
17. **État daté 3 parties** (art.5 décret 67-223) : `generate_etat_date_payload` + `create_etat_date_snapshot`
    (`pre` puis `final`) → snapshot **figé depuis le GL** à `effective_date`.
18. **Opposition art.20** : `record_mutation_opposition(mutation, avis_date, causes)` (fige montant + causes,
    créances liquides/exigibles, `deadline = avis + 15 j`) puis `settle_mutation_opposition(opposition_id,
    payment_date, amount)` → **D512/C450-x** (`source_type='mutation'`) **apurant le 450 exigible du LOT**.
19. **`validate_mutation(...)`** : crée l'acquéreur, bascule `lot_owners` (le solde **reste sur le lot**,
    on change le propriétaire) ; le **fonds ALUR (450-5/105) reste attaché au lot** (aucun mouvement) ;
    l'acquéreur **reconstitue l'avance** (nouvel encaissement 450-3 sur le lot). Step `cloture_compte=completed`.

---

## 3. Ce que la MUTATION exerce (cœur de la démo légale)

- **État daté en 3 parties figé depuis le grand livre** à la date de vente : P1 sommes dues par le
  vendeur (provisions exigibles budget + hors budget, impayés, travaux différés, avances exigibles) ;
  P2 méthode quote-part (clés/tantièmes) ; P3 à la charge de l'acquéreur (reconstitution des avances +
  provisions non encore exigibles). Snapshot **immuable** (trigger), comme une écriture du GL.
- **Recouvrement par opposition (art.20)** : avis de mutation → opposition sous 15 j (montant + causes,
  créances liquides/exigibles, privilège), versement notaire sous 3 mois qui **apure le 450 exigible du lot**.
- **Lot-centric** : le solde reste sur le LOT ; on change le titulaire (`lot_owners`), **jamais** de
  transfert personne→personne.
- **Fonds ALUR (art.14-2)** : **reste attaché au lot**, aucun remboursement vendeur, aucun mouvement.
- **Reconstitution des avances** par l'acquéreur : nouvel encaissement sur le lot (450-3).

---

## 4. Invariants de validation (post-seed)

- `audit_finance_integrity(copro)` = **0 écart** ; grand livre équilibré (Σ débits = Σ crédits).
- Toute ligne 45x a un `lot_id` (A2) ; aucune écriture sur 450 parent.
- Σ `weight` = total clé sur les 4 clés ; `repartition_key_is_complete` = true ; 1 primaire actif/lot.
- 1-2 lots impayés → relances déclenchables ; cotisation ALUR en 105 (pas 701) ; report N+1 splitté 110/120.
- Mutation : snapshots `pre`+`final` présents et immuables ; opposition apure le 450 du lot ;
  `lot_owners` bascule sans toucher le solde ; fonds ALUR du lot inchangé.
