# Factures fournisseurs — validation & paiement au GL (J2.8) — Plan d'implémentation

> **For agentic workers:** exécution inline (chantier focalisé). Steps en cases à cocher.
> Spec : `docs/superpowers/specs/2026-06-11-factures-fournisseurs-validation-gl-design.md`.

**Goal :** la validation d'un brouillon de facture fournisseur crée l'écriture D6xx/C401, et le paiement crée D401/C512 — au lieu des flips de statut nus actuels.

**Architecture :** 1 migration (RPC `validate_supplier_invoice`), rebranchement de 2 handlers front sur des RPC gardées, 1 gate SQL de preuve. Réutilise `create_ledger_transaction` (route GL canonique) et `post_supplier_payment` (déjà idempotente/gardée).

**Tech Stack :** Postgres/plpgsql (Supabase), Next.js/TS (CSS Modules), gates SQL via `scripts/db-test.mjs`.

**Décisions tranchées** (cf. `.planning/DECISIONS_AUTONOMIE.md`) : brouillon sans ligne autorisé mais non-validable ; paiement via RPC `post_supplier_payment` (pas l'edge) ; **la validation recalcule le total depuis les lignes** (header = estimation, vérité = Σ lignes).

---

## Task 1 : Migration `validate_supplier_invoice` (RPC)

**Files :** Create `supabase/migrations/0046_validate_supplier_invoice.sql`

- [ ] **Step 1 — Écrire la migration.** RPC miroir de la branche posting de `post_supplier_invoice` (0026:823-857) mais sur un brouillon existant + ses lignes persistées. Garde G-MGR (copro dérivée), idempotence par statut, refus brouillon sans ligne, recalcul total depuis lignes.

```sql
-- 0046_validate_supplier_invoice.sql — VALIDATION D'UN BROUILLON DE FACTURE FOURNISSEUR (J2.8)
-- Comptabilise un brouillon existant (draft -> posted) : D 6xx (par ligne) / C 401 (total recalculé
-- depuis les lignes). Comble le trou : post_supplier_invoice ne poste qu'À LA CRÉATION ; aucune route
-- ne postait un brouillon déjà saisi (le front faisait un UPDATE de statut nu, sans écriture GL).
create or replace function public.validate_supplier_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     record;
  v_acct401 uuid;
  v_total   numeric;
  v_nb      integer;
  v_entries jsonb;
  v_ltx     jsonb;
  v_tx_id   uuid;
begin
  select * into v_inv from public.supplier_invoices where id = p_invoice_id;
  if not found then
    raise exception 'validate_supplier_invoice: facture % introuvable', p_invoice_id using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_inv.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_inv.copro_id using errcode = '42501';
  end if;

  if v_inv.doc_kind <> 'invoice' then
    raise exception 'validate_supplier_invoice: seules les factures (doc_kind=invoice) se valident ici (reçu %)', v_inv.doc_kind using errcode = '23514';
  end if;

  -- Idempotence : déjà comptabilisée -> no-op (pas de double écriture).
  if v_inv.status = 'posted' and v_inv.ledger_tx_id is not null then
    return jsonb_build_object('success', true, 'invoice_id', v_inv.id, 'ledger_tx_id', v_inv.ledger_tx_id, 'already_posted', true);
  end if;
  if v_inv.status in ('paid', 'cancelled') then
    raise exception 'validate_supplier_invoice: statut terminal % (ni re-comptabilisation ni modification)', v_inv.status using errcode = '23514';
  end if;

  -- Total recalculé depuis les lignes + refus brouillon sans ligne.
  select coalesce(sum(amount), 0), count(*) into v_total, v_nb
  from public.supplier_invoice_lines where invoice_id = p_invoice_id;
  if v_nb = 0 then
    raise exception 'validate_supplier_invoice: brouillon sans ligne — ajouter au moins un poste de charge avant de comptabiliser' using errcode = '23514';
  end if;
  if v_total <= 0 then
    raise exception 'validate_supplier_invoice: total des lignes nul ou négatif (%)', v_total using errcode = '23514';
  end if;

  select id into v_acct401 from public.accounts where copro_id = v_inv.copro_id and code = '401';
  if v_acct401 is null then
    raise exception 'validate_supplier_invoice: compte 401 (Fournisseurs) introuvable pour la copro %', v_inv.copro_id using errcode = '23503';
  end if;

  -- D 6xx par ligne / C 401 (total).
  select jsonb_agg(jsonb_build_object(
    'account_id', sil.account_id, 'direction', 'debit', 'amount', sil.amount,
    'entry_label', coalesce(sil.label, v_inv.label)
  )) into v_entries
  from public.supplier_invoice_lines sil where sil.invoice_id = p_invoice_id;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct401, 'direction', 'credit', 'amount', v_total,
    'entry_label', 'Dette fournisseur : ' || v_inv.label
  ));

  v_ltx := public.create_ledger_transaction(
    v_inv.copro_id, v_inv.period_id, v_inv.invoice_date,
    'Facture fournisseur : ' || v_inv.label,
    'supplier_invoice', v_inv.id, v_entries, true
  );
  if not (v_ltx->>'success')::boolean then
    raise exception 'validate_supplier_invoice: échec écriture grand livre : %', v_ltx->>'error' using errcode = '23514';
  end if;
  v_tx_id := (v_ltx->>'tx_id')::uuid;

  update public.supplier_invoices
  set status = 'posted', ledger_tx_id = v_tx_id, total_amount = v_total
  where id = v_inv.id;

  return jsonb_build_object('success', true, 'invoice_id', v_inv.id, 'ledger_tx_id', v_tx_id, 'total_amount', v_total);
end;
$$;
revoke execute on function public.validate_supplier_invoice(uuid) from public, anon;
grant  execute on function public.validate_supplier_invoice(uuid) to authenticated, service_role;

comment on function public.validate_supplier_invoice(uuid) is
  'Comptabilise un brouillon de facture fournisseur (draft->posted) : D6xx par ligne / C401 total. Gardée gestionnaire, idempotente, refuse un brouillon sans ligne. J2.8.';
```

- [ ] **Step 2 — Appliquer en local + rejeu :** `cat ... | docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -v ON_ERROR_STOP=1` puis `bash scripts/rebaseline-check.sh` (attendu : 46/46 + smoke audit=0).
- [ ] **Step 3 — Commit** `feat(finance): RPC validate_supplier_invoice (posting brouillon D6xx/C401)`.

## Task 2 : Gate SQL `gate_supplier_invoice_validation.sql`

**Files :** Create `supabase/tests/gate_supplier_invoice_validation.sql` ; Modify `scripts/db-test.mjs` (ajouter à GATES)

- [ ] **Step 1 — Écrire le gate** (auto-rollback, service_role ; valeurs dérivées). Couvre : brouillon sans écriture → validation poste une écriture équilibrée (D616=ΣC=total, C401=total) → idempotence (re-valider = 1 seule tx) → brouillon sans ligne refusé (23514) → garde non-gestionnaire (42501) → paiement D401/C512 (status paid) → audit=0.

```sql
-- GATE E2E — VALIDATION & PAIEMENT FACTURE FOURNISSEUR AU GRAND LIVRE (0046 / J2.8)
-- Brouillon (sans écriture) -> validate_supplier_invoice (D6xx/C401) -> idempotence -> refus
-- brouillon vide -> garde non-gestionnaire -> post_supplier_payment (D401/C512, paid) -> audit=0.
DO $$
DECLARE
  v_copro uuid; v_period uuid; v_tiers uuid; v_acc616 uuid; v_acc401 uuid; v_acc512 uuid;
  v_inv jsonb; v_inv_id uuid; v_res jsonb; v_tx uuid;
  v_debit numeric; v_credit numeric; v_d616 numeric; v_c401 numeric; v_ntx int;
  v_empty_id uuid; v_status text; v_pay jsonb; v_512 numeric; v_audit int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_copro := create_clean_test_copro_seeded('e2e-valid-facture');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_tiers  FROM tiers WHERE copro_id = v_copro AND is_supplier = true LIMIT 1;
  SELECT id INTO v_acc616 FROM accounts WHERE copro_id = v_copro AND code='616';
  SELECT id INTO v_acc401 FROM accounts WHERE copro_id = v_copro AND code='401';
  SELECT id INTO v_acc512 FROM accounts WHERE copro_id = v_copro AND code='512';

  -- BROUILLON (post_immediately=false) : 2 lignes 600 + 400 sur 616, total 1000.
  v_inv := post_supplier_invoice(v_copro, v_period, v_tiers, 'F-VAL-1', current_date, current_date+30,
    'Facture a valider', jsonb_build_array(
      jsonb_build_object('account_id', v_acc616, 'label', 'Part A', 'amount', 600),
      jsonb_build_object('account_id', v_acc616, 'label', 'Part B', 'amount', 400)),
    null, null, false, null, null, null);
  v_inv_id := (v_inv->>'invoice_id')::uuid;

  -- (1) Brouillon : aucune écriture.
  SELECT status::text INTO v_status FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'ASSERT(1a): statut % attendu draft', v_status; END IF;
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE source_type='supplier_invoice' AND source_id=v_inv_id) THEN
    RAISE EXCEPTION 'ASSERT(1b): le brouillon a deja une ecriture'; END IF;

  -- (2) Validation -> posted + ledger_tx + écriture équilibrée.
  v_res := validate_supplier_invoice(v_inv_id);
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT(2a): validation KO %', v_res; END IF;
  v_tx := (v_res->>'ledger_tx_id')::uuid;
  SELECT status::text, ledger_tx_id INTO v_status, v_tx FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'posted' OR v_tx IS NULL THEN RAISE EXCEPTION 'ASSERT(2b): statut/tx KO (%, %)', v_status, v_tx; END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE 0 END),0),
         coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE 0 END),0)
    INTO v_debit, v_credit
  FROM ledger_entries e WHERE e.tx_id = v_tx;
  IF abs(v_debit - v_credit) > 0.01 OR abs(v_debit - 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT(2c): ecriture desequilibree D=% C=%', v_debit, v_credit; END IF;
  SELECT coalesce(sum(amount),0) INTO v_d616 FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_acc616 AND direction='debit';
  SELECT coalesce(sum(amount),0) INTO v_c401 FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_acc401 AND direction='credit';
  IF abs(v_d616-1000)>0.01 OR abs(v_c401-1000)>0.01 THEN
    RAISE EXCEPTION 'ASSERT(2d): D616=% (att.1000) C401=% (att.1000)', v_d616, v_c401; END IF;

  -- (3) Idempotence : re-valider -> already_posted + 1 seule tx.
  v_res := validate_supplier_invoice(v_inv_id);
  IF (v_res->>'already_posted') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'ASSERT(3a): re-validation non idempotente %', v_res; END IF;
  SELECT count(*) INTO v_ntx FROM ledger_transactions WHERE source_type='supplier_invoice' AND source_id=v_inv_id;
  IF v_ntx <> 1 THEN RAISE EXCEPTION 'ASSERT(3b): % ecritures pour la facture (att.1)', v_ntx; END IF;

  -- (4) Brouillon SANS ligne (INSERT direct, comme le quick-create modal liste) -> refus 23514.
  INSERT INTO supplier_invoices (copro_id, period_id, tiers_id, invoice_number, invoice_date, due_date, label, total_amount, status)
  VALUES (v_copro, v_period, v_tiers, 'F-EMPTY', current_date, current_date+30, 'Brouillon vide', 0, 'draft')
  RETURNING id INTO v_empty_id;
  BEGIN
    PERFORM validate_supplier_invoice(v_empty_id);
    RAISE EXCEPTION 'ASSERT(4): brouillon sans ligne accepte (attendu 23514)';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (5) Garde : un non-gestionnaire (uid sans membership) est refusé (42501).
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role','authenticated')::text, true);
  BEGIN
    PERFORM validate_supplier_invoice(v_inv_id);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'ASSERT(5): non-gestionnaire accepte (attendu 42501)';
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  END;

  -- (6) Paiement -> D401/C512, statut paid.
  v_pay := post_supplier_payment(v_copro, v_period, v_inv_id, 1000, current_date, 'transfer', 'PAY-1', 'idem-val-1');
  IF NOT (v_pay->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT(6a): paiement KO %', v_pay; END IF;
  SELECT status::text INTO v_status FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'paid' THEN RAISE EXCEPTION 'ASSERT(6b): statut % attendu paid', v_status; END IF;
  SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) INTO v_512
  FROM ledger_entries WHERE tx_id = (v_pay->>'ledger_tx_id')::uuid AND account_id = v_acc512;
  IF abs(v_512 - 1000) > 0.01 THEN RAISE EXCEPTION 'ASSERT(6c): C512=% attendu 1000', v_512; END IF;

  -- (7) Intégrité globale.
  SELECT count(*) INTO v_audit FROM audit_finance_integrity(v_copro);
  IF v_audit <> 0 THEN RAISE EXCEPTION 'ASSERT(7): audit_finance_integrity=% (attendu 0)', v_audit; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK : validation+paiement facture au GL prouves';
  ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Brancher dans `scripts/db-test.mjs`** : ajouter `'supabase/tests/gate_supplier_invoice_validation.sql'` à la liste GATES.
- [ ] **Step 3 — Lancer** `node scripts/db-test.mjs` (attendu : 12/12 dont le nouveau).
- [ ] **Step 4 — Commit** `test(finance): gate validation+paiement facture fournisseur au GL`.

## Task 3 : Rebranchement front

**Files :** Modify `src/lib/finance/api.ts` (ajouter 2 fonctions), `src/features/finance/invoices/useFacturesPage.ts` (2 handlers)

- [ ] **Step 1 — `api.ts` : ajouter `validateSupplierInvoice` + `postSupplierPayment`** (pattern `getSupabaseClient().rpc(...)`, cf. `createSupplierCreditNote` 0026).

```typescript
export async function validateSupplierInvoice(invoiceId: string): Promise<ApiResult<{ invoice_id: string; ledger_tx_id: string; already_posted?: boolean }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('validate_supplier_invoice', { p_invoice_id: invoiceId });
  if (error) return { data: null, error: error.message };
  return { data: data as { invoice_id: string; ledger_tx_id: string; already_posted?: boolean }, error: null };
}

export interface PostSupplierPaymentPayload {
  copro_id: string;
  period_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  idempotency_key: string;
}

export async function postSupplierPayment(p: PostSupplierPaymentPayload): Promise<ApiResult<{ payment_id: string; ledger_tx_id: string; invoice_status: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('post_supplier_payment', {
    p_copro_id: p.copro_id, p_period_id: p.period_id, p_supplier_invoice_id: p.invoice_id,
    p_amount: p.amount, p_payment_date: p.payment_date,
    p_method: p.method ?? 'transfer', p_reference: p.reference ?? null, p_idempotency_key: p.idempotency_key,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as { payment_id: string; ledger_tx_id: string; invoice_status: string }, error: null };
}
```

- [ ] **Step 2 — `useFacturesPage.ts` : rewire `handleSendToAccounting`** → `validateSupplierInvoice(selectedFacture.id)` (au lieu du flip `posted`), n'appliquer l'état optimiste QUE si `!result.error`, sinon remonter l'erreur (toast/console). (Le `selectedFacture` doit porter `copro_id`/`period_id` — vérifier le mapping ; sinon les lire depuis l'overview.)
- [ ] **Step 3 — `useFacturesPage.ts` : rewire `handlePaymentComplete`** → `postSupplierPayment({copro_id, period_id, invoice_id, amount: montant total restant, payment_date: today, idempotency_key})` (au lieu du flip `paid`). État optimiste conditionné au succès.
- [ ] **Step 4 — Gates front** : `npx tsc --noEmit` (0 nouvelle erreur), `npx eslint` sur les 2 fichiers, `npm test` (97/97).
- [ ] **Step 5 — Commit** `fix(finance): valider/payer une facture écrit le GL (fin des flips de statut nus)`.

## Task 4 : Clôture
- [ ] `node scripts/db-test.mjs` (12/12) + `bash scripts/rebaseline-check.sh` (46/46) verts.
- [ ] Push, ouvrir/mettre à jour la PR, **merger dès CI verte** (mandat autonomie).
- [ ] Mettre à jour `PLAN_MAITRE` (2.8 cochée) + `SESSION.md`.

---

## Self-review
- Spec couverte : validation GL (T1), refus brouillon vide + idempotence + garde (T2), paiement GL (T2+T3), front (T3), gate+audit (T2). ✓
- Pas de placeholder : RPC + gate + fonctions front en entier. ✓
- Cohérence types : `validate_supplier_invoice(p_invoice_id)` / `post_supplier_payment(8 args)` identiques entre RPC, gate et front. ✓
- Point ouvert mineur (non bloquant) : si `selectedFacture` ne porte pas `period_id`, le lire depuis `v_supplier_invoices_overview` dans le handler (résolu en T3 Step 2/3).
