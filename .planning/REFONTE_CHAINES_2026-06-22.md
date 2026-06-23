Les deux ruptures clés sont confirmées dans le code réel (un seul `attachments` lié à la convocation, `repartition_keys ... limit(1)` à la création de budget). J'ai tout ce qu'il faut. Je consolide la carte.

---

# CARTE DES CHAÎNES INTER-FEATURES — CoProFlex
## Document de travail pour la reconstruction Next → TanStack, écran par écran

**Objet.** Ne RIEN casser pendant la migration en morceaux. Chaque écran migré seul peut sembler fonctionner alors qu'il rompt un contrat avec un écran amont/aval. Ce document liste les colles invisibles, leur état, et le test « de chaîne » qui prouve que la colle tient.

**Règle d'or transverse.** Le **grand livre (GL) est la source de vérité unique**. Le moteur SQL (RPC + triggers d'intégrité) est correct et doit être reconstruit/préservé **À L'IDENTIQUE et EN PREMIER**, l'UI ensuite. Tout écran qui affiche un chiffre doit le **dériver** d'une RPC/vue GL, jamais le recalculer en JS.

**Base de référence.** LIVE `qqfqrcolzmcbsvfaumiq`, migrations jusqu'à `0087`. Tous les chiffres cités ont été mesurés en transaction auto-annulée (rien laissé sur le LIVE).

---

## 0. SCHÉMA D'ENSEMBLE

### 0.1 Qui écrit le grand livre (les seuls « écrivains » légitimes)

```
                    ┌─────────────────────────────────────────────────┐
                    │   create_ledger_transaction (0025)  + triggers   │
                    │   0024 : équilibre / lot_id sur 45x / cff_required│
                    │   = LA SEULE ROUTE D'ÉCRITURE AU GL (auto_post)   │
                    └───────────────────────▲─────────────────────────┘
                                             │ (tous passent par ici)
   ┌──────────────────┬──────────────┬──────┴───────┬───────────────┬─────────────────┐
   │                  │              │              │               │                 │
post_budget_      set_opening_   validate_      validate_       post_alur_      reverse_ledger_
call_for_funds    balance        mutation       supplier_       transfer/       transaction (0071)
(0026)            (0027)         (0031)         invoice (0046)  settle (0037)   + correction (0087)
│                 │              │              │               │
│appel de fonds   │reprise       │mutation      │facture        │ALUR
▼                 ▼              ▼ (lot_owners)  ▼ D6xx/C401      ▼ D105/C705
D450-x / C70x/105 D450-x+471/472  pas d'écriture GL au transfert  réalisé classe 6
```

**Conséquence de migration #0 :** AUCUN écran ne doit écrire `ledger_entries` directement. Tout passe par une RPC. Si un écran TanStack insère une écriture « à la main », il casse les invariants (équilibre, lot_id). À tester avant toute migration finance : **« le front n'a aucun INSERT direct sur ledger_* »**.

### 0.2 Qui lit le grand livre (les « lecteurs » — doivent rester GL-dérivés)

```
GL posté (ledger_entries status='posted')
   │
   ├─► v_trial_balance ───────────────► balance / contrôle carré
   ├─► v_owner_statement_by_lot/_person ► relevé par lot/personne (VÉRITÉ créance)
   ├─► get_lot_balance_45x (0082) ─────► solde lot (= formule état daté)
   ├─► fn_annexe_1..5 (0075) ──────────► 5 annexes légales
   ├─► fn_dashboard_kpis ──────────────► KPIs (tréso/provisions/dettes/réalisé)
   ├─► generate_etat_date_payload (0076)► état daté parties 1-2 (cut-off date)
   └─► v_alur_fund_balance ────────────► solde fonds travaux ALUR

CHAÎNE EXTRA-COMPTABLE PARALLÈLE (NE lit PAS le GL) :
call_for_funds_lines (amount_due − amount_paid)
   │
   ├─► v_unpaid_by_lot (0028) ─────────► impayés (≠ créance GL !)
   ├─► v_unpaid_with_reminders ────────► relances
   ├─► fn_dashboard_kpis.total_impayes ─► KPI « impayés » du dashboard
   ├─► état daté PARTIE 3 (acquéreur) ──► provisions appelées non échues
   └─► FinanceAnnexeStats « Créances » ─► AFFICHE total_impayes sous "Créances" (PIÈGE)
```

**Le clivage central :** deux familles de chiffres « créances » cohabitent — le **solde 45x débiteur du GL** (vérité) et le **relevé d'appel `call_for_funds_lines`** (compteur parallèle). Ils **divergent** dès qu'une créance 45x naît hors appel (à-nouveau, mutation, OD, affectation, reprise). Divergence prouvée : 4950 (GL) vs 4450 (relevé), écart 500.

### 0.3 Les chaînes événementielles (déclencheur → effet)

```
BUDGET voté ──► APPEL de fonds ──► créances 45x GL + produit 70x ──► IMPAYÉS/relances
   │                                                                      │
   └─ submit/validate_budget                                  run_payment_reminders (cron)

AG votée ──► prepare_ag_decisions ──► ag_pending_actions ──► activate_ag_decisions
   │ (action_type)                                              ├─► CREATE_WORK_BUDGET → budgets(works)
   │                                                            ├─► MANAGE_CONTRACT → contracts.active
   │                                                            ├─► APPOINT_SYNDIC → NO-OP (différé)
   resolution_templates.action_type ──(doit transiter)──┘      └─► GRANT_QUITUS → NO-OP

AG ──► ag_send_convocations ──► notifications + email_webhook (tracking 21j)
   └─► (DEVRAIT joindre rapport CS + devis + annexes — NE LE FAIT PAS)

PPT (planned_works) ─X─► résolution travaux ─X─► budget    [CHAÎNE MORTE, jamais reliée]

Maintenance OS ──► LinkInvoice ──► validate_supplier_invoice ──► D6xx/C401 GL
   └─ (lien de référence sans portée comptable ; engagé 408 absent)

MUTATION validée ──► lot_owners (clôt vendeur, ouvre acquéreur) ──► appels/relances futurs suivent le LOT
```

---

## 1. CHAÎNE — Budget voté → Appels de fonds → créances 45x

**Catégories traversées :** Finance>Budgets (budget_lines + clés) · Lots>Clés de répartition · Finance>Appels de fonds · Finance>Grand livre.

**Maillons :**
1. Création budget + lignes (compte de charge × clé × montant) — `mutations.createBudget` / `createLine` (`lib/budget/api.ts`).
2. Machine à état `submit_budget`→`validate_budget` (0026), pré-condition `repartition_key_is_complete`. **Aucune écriture GL au vote.**
3. Wizard `CreateCallWizard` (4 étapes) : ventilation calculée 100 % front (aperçu).
4. Soumission `createCall` (`lib/finance/api.ts:351`) → RPC `post_budget_call_for_funds`.
5. Moteur SQL (0026) : recalcule le total depuis `budget_lines × repartition_key_lines`, plus-grand-reste, 1 ligne par (lot×clé).
6. Écriture GL : D 450-x **par lot** (agrégé) / C 701/702/105 ; triggers `tr_validate_call_total` + `tr_cff_ledger_required` + filet lot_id 0024.

**STATUT : PARTIEL — moteur SQL correct, contrat front↔back rompu.**

**Points de rupture :**
- **RUPTURE PRINCIPALE (faux WYSIWYG).** `src/lib/finance/api.ts:351` `createCall` appelle la RPC SANS `total_amount` ni `repartition_key_id` (`p_fraction` figé à `1.0`). La ventilation postée est **recalculée côté SQL depuis `budget_lines`** ; le montant saisi et la clé choisie au wizard sont **ignorés**. L'aperçu de `StepRecap` (mono-clé, montant libre) ≠ créances 45x réellement écrites.
- **RUPTURE amont (ventilation mono-clé).** Confirmé dans le code : `src/hooks/modules/useBudget.ts:557-564` — un budget créé depuis l'UI pose **UNE seule `budget_line`** avec `repartition_keys … limit(1)`. La ventilation multi-clés légale ne marche que pour le seedé/onboardé (live : front 1 ligne/1 clé ; golden 9 lignes/6 clés).
- **RUPTURE wizard mode multiple.** `useCreateCallWizard.ts:301-321` fabrique ses montants d'échéance mais la RPC refractionne par `i/N` : montants affichés ≠ postés dès que total saisi ≠ total budget.
- **MAILLON MORT.** `handleTransformToAppele` (`:696-703`) et `handleGenerateProchainAppel` (`:710-713`) = `alert()`/TODO non câblés (parcours travaux). Message honnête, feature absente.
- **INCOHÉRENCE saisie.** `StepAmount.tsx` demande un total libre que la RPC dérive du budget → montant divergent silencieux, ou blocage `'budget sans montant à appeler'`.

**ASSERTION DE PARITÉ DE CHAÎNE (test e2e) :** après `post_budget_call_for_funds(budget validé)`, prouver EN BASE :
1. `call_for_funds.total_amount = Σ call_for_funds_lines.amount_due = Σ_clé round(budget_lines.amount × fraction)` au centime ;
2. exactement 1 ligne par (lot, clé) des clés du budget, `weight_snapshot = repartition_key_lines.weight` figé ;
3. par clé : `Σ amount_due lots = cible clé` (plus-grand-reste, 0 centime perdu) ;
4. GL : `Σ débits = Σ crédits = total_amount` ; chaque débit sur 450-x avec `lot_id NOT NULL` (filet 0024) ; débit agrégé par lot = Σ lignes du lot ; crédit unique sur 701/702/105 selon `budget_type` ;
5. `ledger_tx_id NOT NULL`, `status='issued'`.
6. **Anti-régression de la divergence :** prouver que **le montant et la clé saisis au wizard n'influencent PAS le résultat** (poster avec montant volontairement faux → résultat identique au budget).

*Vérifié manuellement sur le live (Appel T4, golden) : 12500,00 = header = Σlignes = GL débit = GL crédit ; 60 lignes = 18 lots × 6 clés ; 18 débits 450-x tous avec lot_id ; crédit 701. PARITÉ SQL OK.*

---

## 2. CHAÎNE — Onboarding / reprise de mandat → soldes d'ouverture → assiette aval

**Catégories traversées :** Onboarding · Grand livre · Budgets&Appels · Impayés&Relances · Périodes/affectation · Ventes&Mutations (état daté) · Dashboard · ALUR.

**Maillons :**
1. `create_copro` (0083, DEFINER) → `provision_copro_chart` (plan comptable canonique).
2. Étapes 2-4 : copropriétaires, lots, clés, comptes 512x (identité jointe par toutes les vues aval).
3. Étape 5 : `getOrCreateOnboardingPeriod` + `createOnboardingBudget`.
4. Étape 6 **POST-AS-YOU-GO** : `postOnboardingCalls` → appels postés AVANT la reprise des soldes.
5. **Étape 7 (MAILLON CENTRAL)** : `setOnboardingOpeningBalance` → RPC `set_opening_balance` (0027). UNE écriture équilibrée atomique, **idempotente par remplacement** (DELETE+repost), résidu d'équilibre en **471/472 non bloquant**.
6. Étape 7-bis : `set_opening_balance_residual_detail` (0077) → `opening_balance_residual_items` (HORS-GL).
7. Étape 8 : `auditOnboardingBooks` puis `finishOnboarding` (`onboarding_step=NULL` → copro « live »).
8. **Aval A (GL)** : relevé par lot/personne, `get_lot_balance_45x`, ALUR, dashboard, état daté, mutation — incluent `opening_onboarding`. **Parité OK avec from-scratch.**
9. **Aval B (relevé)** : `v_unpaid_by_lot`, relances, `v_calls_overview` — **ne lisent PAS le GL d'ouverture**.

**STATUT : PARTIEL — versant GL paritaire, versant impayés divergent par construction.**

**Points de rupture :**
- **DEAD CODE / piège de copie.** `src/lib/onboarding/api.ts:720` `postOnboardingOpeningBalances` poste `source_type='opening_balance'` (collision avec l'à-nouveau `open_next_period`) et a **ZÉRO appelant**. La vraie voie est `set_opening_balance` (`source_type='opening_onboarding'`). Deux fonctions dans le MÊME fichier → risque qu'un futur écran appelle la mauvaise. **À supprimer** (règle « finir les migrations »).
- **DIVERGENCE D'ASSIETTE.** La dette de pré-reprise vit **uniquement en 450-1 GL**. `v_unpaid_by_lot`/`v_unpaid_with_reminders`/`v_calls_overview`/`v_call_lines_detailed` + toute la chaîne de relances lisent `call_for_funds_lines` SEULEMENT. Un copropriétaire débiteur à la reprise **n'apparaît pas dans les impayés/relances**, alors que son solde 450 le montre débiteur (relevé, `get_lot_balance_45x`, état daté). From-scratch a la dette dans les DEUX.
- **DOUBLE EXCLUSION pendant l'onboarding.** (a) `v_unpaid_by_lot` filtre `onboarding_step IS NULL` ; (b) appels Step6 postés AVANT reprise Step7. L'impayé de reprise ne devient visible **nulle part automatiquement**, même après finalisation.
- **NON-BLOCAGE 471/472.** Le résidu reste non soldé sans empêcher la finalisation (liste blanche `audit-rules.ts` = `LEDGER_UNBALANCED` + `LOT_ID_MISSING_45X` seulement). `v_lot_vs_gl_mismatch` exclut `opening_onboarding` (0028 L.317). Une copro peut devenir « live » avec 471/472 ≠ 0. Pas un bug, mais rompt la parité stricte avec from-scratch.
- **FRAGILITÉ résolution de période.** `getOrCreateOnboardingPeriod` s'appuie sur l'unicité de la période `open` + tri `posted_at NULLS LAST` ; double période open (anormal) → la reprise pourrait se poser ailleurs que les appels Step6.

**ASSERTION DE PARITÉ DE CHAÎNE :** construire (1) FROM-SCRATCH (copro + budget + appel + paiements partiels) et (2) REPRISE (`set_opening_balance` posant en 450-1/2/5 par lot le solde net que la from-scratch présente). Prouver :
- **(A) Parité GL positive :** `get_lot_balance_45x(repro) == (scratch)` par lot ; `v_owner_statement_by_lot.balance` identiques ; `v_trial_balance` 45x identique ; dashboard + état daté cohérents.
- **(B) Équilibre :** tx `opening_onboarding` équilibrée ; `audit_finance_integrity` sans `LEDGER_UNBALANCED` ni `LOT_ID_MISSING_45X`.
- **(C) Résidu tracé :** `opening_residual_gl == net 471/472` ; `getRepriseResidual` le retrouve.
- **(D) Idempotence :** rejouer `set_opening_balance` → AU PLUS 1 tx (index unique partiel), solde inchangé.
- **(E) DIVERGENCE ATTENDUE À DOCUMENTER (red flag → décision) :** `v_unpaid_by_lot(repro)` NE remonte PAS la dette de pré-reprise alors que `v_owner_statement_by_lot(repro)` la montre débitrice. Le test **doit asserter cette divergence** et tracer si c'est voulu (dette de reprise ≠ impayé d'appel) ou un trou (le débiteur échappe aux relances).

---

## 3. CHAÎNE — AG → Convocation : pièces obligatoires NON jointes

**Catégories :** AG/Résolutions · GED (ag_documents) · Conseil syndical · Communication/Notifications · Conformité (devis travaux).

**Maillons :** ODJ/résolutions → génération PDF convocation → envoi multi-pièces (rapport CS, fiche synthétique, devis, annexes 1-5).

**STATUT : CASSÉ — un seul fichier joint.** Confirmé dans le code : `ag_send_convocations/index.ts:380` ne construit `payload.attachments` qu'à partir d'**un seul** `getConvocationDocument` (`:204`, filtre `doc_type='convocation'`, `.limit(1).single()`).

**Points de rupture :**
- Le rapport CS publié existe en DB avec `ag_id` (`rapports_activite_cs`, index unique `uq_rapports_cs_ag_publie`) — **lien data présent, jamais consommé**.
- Aucune référence fiche synthétique / devis / annexes dans `ag_send_convocations` ni `ag_generate_document`.
- Memory : « PDF convocation annexe 1 CASSÉE → ne pas envoyer » + « rapport CS / fiche synthétique / devis = obligatoires ».
- **Risque juridique CRITIQUE** : Art. 11 décret 67-223 — convocation sans pièces = risque de **nullité** des décisions.

**ASSERTION DE PARITÉ :** pour une AG dont l'ODJ comporte (a) une résolution travaux avec devis, (b) un rapport CS publié, (c) une approbation des comptes : `payload.attachments.length` doit valoir 1 convocation + 1 rapport CS + 1 devis/résolution travaux + N annexes comptables. Aujourd'hui : toujours `=== 1`.

---

## 4. CHAÎNE — Conseil syndical → rapport → AG (PV/convocation)

**Catégories :** Conseil (council-workflow) · AG · GED.

**Maillons :** décisions CS → `rapports_activite_cs` (`status='publie'`) → annexé convocation/PV.

**STATUT : PARTIEL — persistance OK, restitution absente.** 0053 : tables + FK `ag_id` + « 1 seul rapport publié par AG ». Mais le rapport publié n'est tiré ni dans la convocation (cf. §3) ni dans le PV (`ag_generate_document` ne lit pas `rapports_activite_cs`). Cul-de-sac. Le sens amont CS→AG existe (`council-workflow` `linkedAgId`/`linkedResolutionId`).

**ASSERTION :** pour une AG avec `rapports_activite_cs` `status='publie'` (`ag_id` renseigné), `ag_generate_document(doc_type='pv')` doit incorporer la section rapport CS. Aujourd'hui : absent.

---

## 5. CHAÎNE — PPT / conformité → résolution AG → budget travaux

**Catégories :** Conformité/PPT (planned_works, technical_documents) · AG · Finance>Budgets travaux.

**Maillons :** `planned_works` (PPT) → résolution travaux votée → `voted_amount`/`vote_date`/`status` + `budget_line_id` + exécution.

**STATUT : ABSENT — table morte.** `planned_works` n'apparaît que dans 0021 (création) et 0034 (RLS). `activate_ag_decisions` ne le touche jamais : `CREATE_WORK_BUDGET` crée un budget `works` mais ne crée/maj **aucune** ligne `planned_works`. Colonnes de lien (`ag_id`, `resolution_id`, `budget_line_id`, `voted_amount`, `vote_date`) en `SET NULL`, vides. Idem `technical_documents` (0020) : date de validité mais **aucune chaîne diagnostic expiré → alerte → ODJ**.

**ASSERTION :** voter `CREATE_WORK_BUDGET` portant un `planned_work_id` en variables, activer → la ligne `planned_works` passe `status='voted'`, `voted_amount`/`vote_date` renseignés, `resolution_id` rattaché. Aujourd'hui : aucun effet.

---

## 6. CHAÎNE — Maintenance (OS) → facture fournisseur → GL

**Catégories :** Maintenance (service_orders) · Tiers/Fournisseurs · Finance>Factures · Grand livre.

**Maillons :** `service_order` (`completed`) → `handleLinkInvoice` → `validate_supplier_invoice` (D6xx/C401) → réalisé classe 6.

**STATUT : PARTIEL — segment facture→GL solide, segment OS→facture sans portée comptable.**
- `validate_supplier_invoice` (0046) poste D6xx/C401 via `create_ledger_transaction`, idempotent. **Solide.**
- **Rupture OS↔facture :** `handleLinkInvoice` (`maintenance-workflow/index.ts:345-411`) écrit `service_orders.supplier_invoice_id` + `supplier_invoices.related_service_order_id` + event + copie `actual_amount`. **Aucune écriture GL, aucun contrôle que `actual_amount` OS = total facture postée.**
- **Engagé manquant :** `estimated_amount`/`quoted_amount` de l'OS n'alimentent aucun engagement extra-comptable (pas de 408/486, pas de `budget_expense`). Le palier « engagé » de `compta_engage_realise` (voté→engagé→réalisé→payé) n'est pas matérialisé.

**ASSERTION :** après `LinkInvoice(orderId, invoiceId, actualAmount)` puis `validate_supplier_invoice(invoiceId)` : `service_orders.actual_amount == supplier_invoices.total_amount` postée, et le réalisé GL du domaine reflète le montant. Aujourd'hui : peuvent diverger sans erreur.

---

## 7. CHAÎNE — Mutation / vente → changement de propriétaire → appels/impayés futurs

**Catégories :** Ventes&Mutations · Lots (lot_owners) · Finance>Appels/Impayés · État daté.

**Maillons :** `validate_mutation` → `lot_owners` (clôt vendeur, ouvre acquéreur) → appels futurs débitent le lot → relances sur proprio courant.

**STATUT : CÂBLÉE (par design lot-centric).** `validate_mutation` (0031 L.504-510) clôt les `lot_owners` actifs à la date d'effet et insère l'acquéreur. Moteur strictement lot-centric (`call_for_funds_lines.lot_id`, `payments.lot_id`, jamais de `coproprietaire_id` figé). Aucune écriture GL au transfert (volontaire : « le 450 suit le lot »).

**Maillon manquant connu (différé) :** recouvrement art.20 (opposition notaire sur le prix de vente si vendeur débiteur) explicitement différé (0031 L.280-281). La dette du vendeur reste collée au lot et **bascule sur l'acquéreur** sans mécanisme d'opposition.

**ASSERTION :** générer un appel sur un lot APRÈS sa mutation (effet < date d'appel) → la ligne cible le lot, `get_lot_balance_45x`/relances imputent à l'acquéreur. Et : un impayé du vendeur doit, à terme, déclencher l'opposition notaire (aujourd'hui : ne se produit pas → à documenter comme différé).

---

## 8. CHAÎNE — Templates de résolution → résolution → activation (action_type)

**Catégories :** AG>Banque de résolutions (resolution_templates) · AG>Résolutions · Activation.

**Maillons :** `resolution_templates.action_type` → `ag_resolutions.action_type` → `prepare_ag_decisions` (mappe vers table cible) → `activate_ag_decisions` (effet).

**STATUT : PARTIEL — aval solide, maillon template→résolution à vérifier au peuplement.** L'aval mappe 11 `action_type` (budgets, comptes, appels, conseil, contrat) — 0030 L.1446. MAIS si l'instanciation depuis un template **ne recopie pas `action_type`** vers `ag_resolutions`, la résolution est votée mais **ignorée à l'activation** (`prepare_ag_decisions` ne sélectionne que `action_type IS NOT NULL`) → **échec silencieux (0 décision)**. À vérifier dans le provider/mapper snake→camel (memory `ag_resolutions_bank`).
- **No-op assumés :** `APPOINT_SYNDIC` (0030 L.1914-1915) et `GRANT_QUITUS` (L.1951-1952) ne produisent aucun effet réel (cohérent `syndic_mandate_deferred`), à ne pas oublier en campagne de test.

**ASSERTION :** instancier une résolution depuis un template `action_type='CREATE_WORK_BUDGET'`, voter, clôturer, `prepare_ag_decisions` → exactement **1** `ag_pending_actions` (et non 0). Prouve que `action_type` a transité template → résolution.

---

## 9. CHAÎNE — Communication : relances impayés déclenchées par l'état des impayés

**Catégories :** Finance>Impayés · Communication · Cron.

**Maillons :** soldes 450 par lot → `payment_reminder_rules` (J+15/30/60/90) → `run_payment_reminders` (cron quotidien, 0055) → email + tracking + `stale_cancelled` + `send_manual_payment_reminder`.

**STATUT : CÂBLÉE.** `run_payment_reminders` calcule les relances depuis montants impayés/`days_overdue`/`delay_level`, gère pause + tracking.

**Point d'attention (lien §7) :** le destinataire doit se dériver du `lot_owners` **courant**. Après mutation, vérifier que la relance part à l'acquéreur, pas au vendeur sorti.
**Dette d'assiette (lien §2/§3 source-de-vérité) :** la relance lit `call_for_funds_lines`, donc **ignore la dette de reprise et toute créance 45x hors appel**.

**ASSERTION :** un lot avec impayé de N jours (franchissant un seuil) → exactement 1 relance au niveau attendu, adressée au propriétaire actif courant ; impayé soldé entre-temps → `stale_cancelled`.

---

## 10. CHAÎNE — AG → notifications / délais légaux → tracking

**Catégories :** AG · Communication/Notifications · Tracking livraison.

**Maillons :** envoi convocation → `notifications`/`ag_documents` → `provider_message_id` (`email_webhook`) → contrôle délai 21 j (Art. 64 décret 67-223).

**STATUT : CÂBLÉE (convocation seule).** `ag_send_convocations` calcule `delay_warning`, enregistre 1 notification/destinataire avec `provider_message_id`, gère scopes (`all`/`missing_only`/`selected`) + `dry_run` ; `email_webhook` tracke. Voir 0063 (`ag_envoi_choices`).
**Réserve :** ne tracke que la convocation ; avec §3 réparé, le tracking devrait porter sur le lot complet de pièces.

**ASSERTION :** convoquer à J-10 (< 21 j) → `delay_warning` non nul ET notification quand même tracée ; chaque destinataire « missing » obtient une ligne notification avec `provider_message_id`.

---

## 11. CHAÎNE — Maintenance (contrat) → AG → activation contrat

**Catégories :** Maintenance>Contrats · AG · Activation.

**Maillons :** contrat à voter → résolution `MANAGE_CONTRACT` → activation → `contracts.status='active'` + expiration de l'ancien actif du même domaine.

**STATUT : CÂBLÉE et soignée.** 0030 L.1918-1948 : active le contrat voté, refuse de ressusciter un `terminated`, expire l'ancien actif du même `domain_id` avec `end_date = start_date` du nouveau.
**Maillon amont absent :** `update_contract_status_auto` (0032) ne propose pas automatiquement une résolution `MANAGE_CONTRACT` à l'ODJ (rapprochement humain requis).

**ASSERTION :** activer `MANAGE_CONTRACT(contract_id=X)` → X passe `active`, l'ancien actif du même domaine passe `expired` avec `end_date = start_date` de X.

---

## 12. TABLEAU DE SYNTHÈSE DES CHAÎNES

| # | Chaîne | Statut | Sévérité | Rupture-clé |
|---|--------|--------|----------|-------------|
| 1 | Budget → Appels → 45x | PARTIEL | Élevé | Faux WYSIWYG wizard ; budget mono-clé `limit(1)` |
| 2 | Onboarding → soldes → aval | PARTIEL | Élevé | Divergence d'assiette impayés ; dead code `opening_balance` |
| 3 | AG → pièces convocation | **CASSÉ** | **Juridique CRITIQUE (nullité)** | 1 seule pièce jointe |
| 4 | CS → rapport → AG/PV | PARTIEL | Moyen | Restitution documentaire absente |
| 5 | PPT/conformité → AG → travaux | **ABSENT** | Fonctionnel élevé | Table morte `planned_works` |
| 6 | OS → facture → GL | PARTIEL | Moyen | Lien OS↔facture sans portée GL ; engagé absent |
| 7 | Mutation → appels futurs | CÂBLÉE | OK / différé | Opposition art.20 différée |
| 8 | Template → résolution → activation | PARTIEL | Élevé si non propagé | `action_type` à propager (échec silencieux) |
| 9 | Relances impayés | CÂBLÉE | OK | Assiette ignore créances hors appel |
| 10 | AG notifications/délais/tracking | CÂBLÉE | OK | Tracking convocation seule |
| 11 | Contrat → AG → activation | CÂBLÉE | OK / amélioration | Pont alerte→ODJ absent |

---

## 3 (BIS). RÈGLE SOURCE DE VÉRITÉ — « le grand livre est la seule vérité »

### Ce qui DÉRIVE correctement du GL (à préserver tel quel)
- **5 annexes légales** (`fn_annexe_1..5`, 0075) : lisent uniquement `ledger_entries` (`status='posted'`) + budgets/clés pour les colonnes budgétaires. Recoupent la balance : annexe 1 trésorerie = balance 5x (11050 = 11050) ; annexe 1 créances « 45 » = Σ lots débiteurs GL (4950 = 4950) ; non-compensation correcte ; 450-5 ALUR isolé hors section II.
- **Dashboard** (`fn_dashboard_kpis`) : tréso = 512 hors 5121 ; provisions = créditeur 103+105 ; dettes = créditeur 40x ; réalisé = charges 6x postées. **Bon.**
- **État daté** (`generate_etat_date_payload`, 0076) parties 1-2 : `Σ round(debit−credit)` par compte 45x du lot, `tx_date <= effective_date` (cut-off figé), 450-5 ALUR exclu. Formule **alignée** sur `get_lot_balance_45x` (0082) pour éviter tout écart d'un centime. **La sortie la plus rigoureusement GL-dérivée.**

### Les points de DIVERGENCE possibles (où un faux chiffre légal peut s'afficher)
1. **Impayés (relevé) vs créances (GL).** Toute la chaîne impayés lit `call_for_funds_lines` (`amount_due − amount_paid`) = compteur extra-comptable. `FinanceAnnexeStats.tsx` affiche `total_impayes` sous le libellé **« Créances »**, alors que l'annexe 1 de la même page affiche les créances GL. **Deux « créances » côte à côte, sources différentes, divergence prouvée (500).** C'est la divergence la plus visible pour un syndic. Le filet `v_lot_vs_gl_mismatch`/`LOT_GL_MISMATCH` est **volontairement aveugle** aux créances 45x d'autre `source_type` (à-nouveau, affectation, mutation, manual) — précisément là où le chiffre ment.
2. **Fonds ALUR 105.** Un crédit 105 sans contrepartie 450-5 (encaissement direct) gonfle provisions annexe 1 + `v_alur_fund_balance` — invisible. Aucun contrôle `105 = Σ appels ALUR affectés`.
3. **Comptes d'attente 12 / 478.** Solde résiduel jamais soldé reste dans annexe 1 (provisions) sans alerte. Aucun contrôle « 12/478 → 0 ».
4. **Annexes 4/5.** Réalisé = `Σ ledger_entries.operation_id = budget.id` (GL, bon) MAIS « voté » = `Σ budget_lines` (extra-comptable). Une charge travaux **sans `operation_id`** (chantier E9/0073 non garanti partout) disparaît du réalisé annexe tout en restant au GL.
5. **Annexe 3 + colonnes budgétaires annexe 2.** Annexe 3 : seul `ex_clos_budget_vote` renseigné, réalisé/précédent/BP N+1/N+2 = **« 0 en dur »**. Annexe 2 : « budget voté » des produits forcé à 0, BP N+1/N+2 dépendent d'un budget `draft`/`validated` sur la période suivante. **Des 0 qui peuvent passer pour un solde réel nul.**
6. **Double implémentation dashboard.** Le front (`src/lib/dashboard/api.ts`) appelle `fn_dashboard_kpis` ET la vue `v_dashboard_kpis` (pour `unpaid_lots_count`). La vue recalcule `current_balance`/`unpaid_total` de son côté (code dupliqué) → dérivera si une seule est modifiée.

### Ce que `audit_finance_integrity` garantit / NE garantit PAS
**Garantit (4 contrôles) :** `LEDGER_UNBALANCED` (tx déséquilibrée), `LOT_ID_MISSING_45X`, `LOT_GL_MISMATCH` (restreint `call_for_funds`+`payment`), `CALL_TOTAL_MISMATCH`.
**NE garantit PAS (prouvé : 3 écritures équilibrées aberrantes → `audit_issues = 0`) :** 105 sans contrepartie ; 12/478 résiduels ; cohérence facture fournisseur (6x sans 401, 401 sans facture) ; **équilibre de balance global au niveau copro** (seulement tx par tx) ; cohérences croisées entre sorties (annexe 1 ≠ détail par personne, `total_impayes` > créances GL, annexe 2 ≠ variation 6x/7x).

### Invariants / contrôles à AJOUTER (pour blinder « GL = seule vérité »)
- **A.** Dériver les impayés du GL — ou poser dans `audit_finance_integrity` l'invariant `Σ (amount_due − amount_paid) relevé = Σ solde 450 débiteur appels GL` au niveau copro, **sans** la restriction de `source_type` qui masque les autres créances. Idéalement : un seul chiffre « créances » = solde 45x débiteur.
- **B.** Invariant ALUR : `solde 105 GL = Σ cotisations ALUR appelées et affectées` ; alerter tout mouvement 105 sans contrepartie 450-5/705.
- **C.** Invariant comptes d'attente : alerter si solde 12 ou 478 ≠ 0 (ou non justifié) à la clôture.
- **D.** Rapprochement fournisseurs : `Σ 401 créditeur = Σ factures validées non payées` ; `Σ 6x d'une facture = montant facture` ; charge 6x sans `operation_id` quand budget travaux existe.
- **E.** Équilibre global de balance : `Σ débit = Σ crédit` au niveau copro (balance carrée), pas seulement par tx.
- **F.** Cohérences croisées entre sorties : annexe 1 créances = `v_owner_statement_by_person` Σ soldes positifs ; annexe 2 résultat = variation 6x/7x du GL ; dashboard `total_impayes` ≤ créances GL. **Ce sont ces invariants croisés qui feraient « tomber » une annexe fausse — et qui manquent.**
- **G.** Supprimer la double source dashboard (`fn_dashboard_kpis` et `v_dashboard_kpis` sur le même calcul, ou n'en garder qu'une).

---

## 4 (BIS). IMPLICATIONS SUR L'ORDRE DE CONSTRUCTION

### Principe directeur
**Poser le moteur SQL + les invariants (triggers) EN PREMIER, l'UI ENSUITE, et figer la parité par test AVANT d'ouvrir l'écran aux vrais syndics.** Le GL est la source de vérité ; l'UI ne fait que la dériver.

### Features qui NE PEUVENT PAS être migrées seules (contrat amont↔aval à préserver)

| Écran/zone migré | Ne peut PAS partir seul SANS… | Pourquoi |
|---|---|---|
| **Wizard appels de fonds** | …le moteur `post_budget_call_for_funds` + budget multi-clés posable | L'aperçu front ne décide rien ; la ventilation est SQL. Migrer le wizard seul perpétue le faux WYSIWYG. |
| **Écran budgets** | …correction `limit(1)` → 1 ligne PAR poste avec sa vraie clé | Sinon ventilation mono-clé même avec moteur correct. |
| **Écran impayés / relances** | …**décision tranchée** sur le couplage impayés↔GL | Tant que `v_unpaid_by_lot` lit `call_for_funds_lines`, toute relance ignore la dette de reprise + créances hors appel. Choix (matérialiser un appel d'à-nouveau OU étendre l'assiette à `v_owner_statement_by_lot`) à trancher **TÔT** car il conditionne le schéma des relances. |
| **Page Comptabilité (annexes + bandeau)** | …unification du libellé « Créances » (GL, pas `total_impayes`) | Deux chiffres contradictoires côte à côte = mensonge légal visible. |
| **Onboarding (reprise)** | …plan comptable → identité (lots/lot_owners/clés) → moteur GL → période open, dans CET ordre | `set_opening_balance`, `resolve_lot_tiers_account`, `createOnboardingBudget` échouent si un compte manque ; trigger lot_id ; `create_ledger_transaction` exige période `open`. + supprimer `postOnboardingOpeningBalances` AVANT d'ajouter des écrans de reprise. |
| **Convocation AG** | …câblage des pièces obligatoires (rapport CS, devis, annexes) | Migrer l'envoi seul fige le risque de nullité juridique. |
| **Banque de résolutions / éditeur de résolution** | …garantie de propagation `action_type` template→résolution | Sinon résolution votée mais inerte à l'activation (échec silencieux). |
| **Maintenance OS** | …décision sur l'engagé (408) + contrôle montant OS=facture | Sinon réalisé GL OK mais OS↔facture peut diverger sans alerte. |

### Ordre recommandé (par dépendances réelles observées)
1. **Socle GL d'abord** : `create_ledger_transaction` + triggers 0024 + `provision_copro_chart` + `repartition_keys`/`repartition_key_lines`. (Pré-requis dur de tout le reste.)
2. **Moteur appels** : `repartition_key_is_complete` → `budget_lines` multi-clés → `submit/validate_budget` → `post_budget_call_for_funds` + `tr_validate_call_total`/`tr_cff_ledger_required`.
3. **Lecteurs GL** : `v_trial_balance`, `v_owner_statement_by_lot/_person`, `get_lot_balance_45x`, `fn_annexe_*`, `fn_dashboard_kpis`, `generate_etat_date_payload`.
4. **Décision impayes↔GL** (avant de câbler relances/recouvrement) — bloquant pour §2, §7, §9.
5. **Onboarding/reprise** (appelant de la route canonique) — après 1-3, après suppression du dead code.
6. **AG** : moteur `prepare/activate_ag_decisions` → propagation `action_type` → convocation multi-pièces → notifications/tracking.
7. **Maintenance/contrats/CS** : factures (déjà solides) → décision engagé → restitution rapport CS → PPT (réveiller `planned_works`).

---

## 5. LISTE PRIORISÉE DES « TESTS DE CHAÎNE » À AJOUTER
*(en plus des tests de parité par écran ; ils prouvent que la colle inter-features tient)*

### ROUGE — bloquant migration / risque juridique ou financier
- **R1 — Appel de fonds, anti-faux-WYSIWYG (§1).** Poster un appel avec montant+clé volontairement faux au wizard → résultat GL identique au budget voté. + parité complète (header = Σlignes = GL débit = GL crédit ; 1 ligne/(lot×clé) ; lot_id partout). *Bloque la migration du wizard.*
- **R2 — Budget multi-clés persisté (§1).** Créer un budget depuis l'UI cible → vérifier N `budget_lines` (1/poste, vraie clé), PAS 1 ligne `limit(1)`. *Bloque la migration de l'écran budget.*
- **R3 — Convocation pièces obligatoires (§3).** AG avec devis + rapport CS publié + approbation comptes → `attachments.length > 1` (= toutes les pièces). *Bloque l'envoi en prod (nullité).*
- **R4 — Parité reprise ↔ from-scratch sur le GL (§2).** Soldes par lot, relevé, balance, état daté identiques ; tx équilibrée ; idempotence ; **assertion explicite de la divergence impayés** (red flag tracé).
- **R5 — Source de vérité « Créances » (§3-bis, A/F).** Sur une copro avec une écriture 45x hors appel : prouver que le chiffre « Créances » affiché = solde 45x débiteur GL (PAS `total_impayes`), et que `total_impayes ≤ créances GL`. *Bloque la page Comptabilité.*
- **R6 — Propagation `action_type` (§8).** Résolution instanciée depuis template `CREATE_WORK_BUDGET` → après vote/clôture, exactement 1 `ag_pending_actions` (pas 0). *Bloque la banque de résolutions.*

### ORANGE — divergence d'assiette / cohérence comptable
- **O1 — Invariant ALUR (§3-bis, B).** `solde 105 GL = Σ appels ALUR affectés` ; crédit 105 sans contrepartie 450-5 → 1 issue d'audit.
- **O2 — Comptes d'attente 12/478 (§3-bis, C).** Solde résiduel ≠ 0 à la clôture → alerte.
- **O3 — Balance carrée globale (§3-bis, E).** `Σ débit = Σ crédit` au niveau copro.
- **O4 — Rapprochement fournisseur OS↔facture↔GL (§6, D).** `service_orders.actual_amount = supplier_invoices.total_amount` postée ; `Σ 401 créditeur = Σ factures validées non payées` ; charge 6x sans `operation_id` quand budget travaux existe → alerte.
- **O5 — Mutation → appels/relances suivent le lot (§7, §9).** Appel après mutation imputé à l'acquéreur ; relance adressée au `lot_owners` courant, pas au vendeur sorti.
- **O6 — Cohérences croisées annexes (§3-bis, F).** Annexe 1 créances = `v_owner_statement_by_person` Σ positifs ; annexe 2 résultat = variation 6x/7x GL ; annexes 4/5 réalisé tombe à 0 si `operation_id` manquant (test de garde).

### JAUNE — restitution / hygiène / maillons morts
- **J1 — Rapport CS dans le PV (§4).** AG avec rapport CS publié → section présente dans `ag_generate_document(pv)`.
- **J2 — Réveil PPT (§5).** `CREATE_WORK_BUDGET` portant `planned_work_id` → `planned_works` passe `voted` avec montant/date/résolution. (Test « rouge attendu » tant que non câblé, à transformer en vert au câblage.)
- **J3 — Double source dashboard (§3-bis, G).** `fn_dashboard_kpis` et `v_dashboard_kpis` renvoient les mêmes valeurs sur les champs partagés (détecte la dérive future).
- **J4 — Dead code onboarding (§2).** Test de présence : `postOnboardingOpeningBalances` n'existe plus / a zéro appelant (garde anti-réintroduction).
- **J5 — Délai légal AG (§10).** Convocation J-10 → `delay_warning` non nul + notification tracée avec `provider_message_id`.
- **J6 — Contrat → activation (§11).** `MANAGE_CONTRACT(X)` → X `active`, ancien actif même domaine `expired` (`end_date = start_date` de X).

---

### Fichiers / fonctions de référence
- **Écrivains GL :** `0025_rpc_gl_core.sql` (`create_ledger_transaction`), `0024_triggers_integrite_gl.sql`, `0026_rpc_appels_paiements.sql` (`post_budget_call_for_funds`), `0027_periodes_affectation.sql` (`set_opening_balance`), `0031_rpc_ged_mutations.sql:444` (`validate_mutation`), `0046_validate_supplier_invoice.sql`, `0037_alur_affectation.sql`, `0071_reverse_ledger_transaction.sql`, `0087_rpc_correction_comptable.sql`.
- **Lecteurs GL :** `0028_derives_vues_annexes.sql` (`v_trial_balance`, `v_owner_statement_by_lot/_person`, `v_unpaid_by_lot`, `v_lot_vs_gl_mismatch`, `fn_dashboard_kpis`, `audit_finance_integrity`), `0075_annexes_legales_refonte.sql` (`fn_annexe_1..5`), `0076_etat_date_h2h3.sql`, `0082_get_lot_balance_45x.sql`, vue `v_alur_fund_balance`.
- **AG/Conseil/Contrats :** `0030_rpc_ag_conseil.sql:1446` (mapping `action_type`, L.1914/1951 no-op, L.1918-1948 contrat), `0053_conseil_rapports.sql`, `0042_resolution_templates.sql`/`0043`, `supabase/functions/ag_send_convocations/index.ts:204,380,539`, `ag_generate_document/index.ts`, `email_webhook/index.ts`.
- **Maintenance :** `supabase/functions/maintenance-workflow/index.ts:345-411`, `0021_maintenance.sql:369` (`planned_works`), `0032_rpc_maintenance_comm.sql`.
- **Relances :** `supabase/functions/run_payment_reminders/index.ts`, `0055_cron_payment_reminders.sql`, `src/lib/impayes/api.ts`.
- **Front (ruptures confirmées) :** `src/lib/finance/api.ts:351` (createCall), `src/hooks/modules/useBudget.ts:557-564` (`limit(1)`), `:696-703`/`:710-713` (boutons morts), `src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts:301-321`, `src/lib/onboarding/api.ts:720` (dead code), `src/components/features/finance/FinanceAnnexeStats.tsx` (« Créances » = `total_impayes`), `src/lib/dashboard/api.ts` (double source).
- **Gate existante :** `supabase/tests/gate_0075_annexes_coherence.sql`.
