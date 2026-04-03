import { createClient } from '@/lib/supabase/client';

const createUntypedClient = () => createClient() as any;

// ═══ COPROPRIETE ═══

export interface CoproCreate {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  buildings_count?: number;
  annee_construction?: string;
  siret?: string;
  exercice_debut?: string;
}

export async function createCopropriete(payload: CoproCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('copros')
    .insert({
      name: payload.name.trim(),
      address: payload.address.trim(),
      city: payload.city.trim(),
      postal_code: payload.postal_code.trim(),
      buildings_count: payload.buildings_count || 1,
      annee_construction: payload.annee_construction || null,
      siret: payload.siret?.trim() || null,
      exercice_debut: payload.exercice_debut || '01-01',
      onboarding_step: 2,
      onboarding_max_step: 2,
    })
    .select('id, name')
    .single();
  if (error) return { data: null, error: new Error(error.message) };

  // Créer le membership admin pour le gestionnaire qui crée la copro
  const { data: { user } } = await supabase.auth.getUser();
  if (user && data) {
    await supabase.from('memberships').insert({
      user_id: user.id,
      copro_id: (data as { id: string }).id,
      role: 'admin',
    });
  }

  return { data: data as { id: string; name: string }, error: null };
}

// ═══ ONBOARDING STATE ═══

export interface OnboardingCopro {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  onboarding_step: number;
  onboarding_max_step: number;
  created_at: string;
}

export async function listOnboardingCopros() {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('copros')
    .select('id, name, address, city, postal_code, onboarding_step, onboarding_max_step, created_at')
    .not('onboarding_step', 'is', null)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as OnboardingCopro[], error: null };
}

export async function getOnboardingState(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('copros')
    .select('id, name, onboarding_step, onboarding_max_step')
    .eq('id', coproId)
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return {
    data: data as { id: string; name: string; onboarding_step: number | null; onboarding_max_step: number | null },
    error: null,
  };
}

export async function updateOnboardingStep(coproId: string, step: number, maxStep: number) {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('copros')
    .update({ onboarding_step: step, onboarding_max_step: maxStep })
    .eq('id', coproId);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

export async function completeOnboarding(coproId: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('copros')
    .update({ onboarding_step: null, onboarding_max_step: null })
    .eq('id', coproId);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

export async function deleteOnboardingCopro(coproId: string) {
  const supabase = createUntypedClient();
  // Vérifier que c'est bien un onboarding en cours
  const { data: copro } = await supabase
    .from('copros')
    .select('onboarding_step')
    .eq('id', coproId)
    .single();
  if (!copro || copro.onboarding_step === null) {
    return { success: false, error: new Error('Cette copropriété n\'est pas en cours d\'onboarding') };
  }
  const { error } = await supabase.from('copros').delete().eq('id', coproId);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

// ═══ COPROPRIETAIRES ═══

export interface CoproprietaireCreate {
  copro_id: string;
  last_name: string;
  first_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_resident?: boolean;
  communication_preference?: 'email' | 'courrier' | 'les_deux';
}

export async function createCoproprietaire(payload: CoproprietaireCreate) {
  const supabase = createUntypedClient();

  // Mapper communication_preference vers les 2 booléens de la DB
  const prefersEmail = !payload.communication_preference || payload.communication_preference !== 'courrier';
  const prefersPaper = payload.communication_preference === 'courrier' || payload.communication_preference === 'les_deux';

  const { data, error } = await supabase
    .from('coproprietaires')
    .insert({
      copro_id: payload.copro_id,
      last_name: payload.last_name.trim(),
      first_name: payload.first_name?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address_line1: payload.address?.trim() || null,
      is_resident: payload.is_resident ?? true,
      prefers_email: prefersEmail,
      prefers_paper: prefersPaper,
    })
    .select('id, last_name, first_name')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; last_name: string; first_name: string | null }, error: null };
}

export async function listCoproprietaires(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('coproprietaires')
    .select('id, last_name, first_name, email, phone, is_resident')
    .eq('copro_id', coproId)
    .order('last_name', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; last_name: string; first_name: string | null; email: string | null; phone: string | null; is_resident: boolean }>, error: null };
}

export async function deleteCoproprietaire(id: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase.from('coproprietaires').delete().eq('id', id);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

// ═══ COMPTES BANCAIRES ═══

export interface CompteCreate {
  copro_id: string;
  label: string;
  type: 'courant' | 'fonds_travaux';
  banque?: string;
  iban?: string;
  bic?: string;
  solde_initial?: number;
}

export async function createCompteBancaire(payload: CompteCreate) {
  const supabase = createUntypedClient();
  const code = payload.type === 'courant' ? '512000' : '512100';
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      copro_id: payload.copro_id,
      code,
      name: payload.label.trim(),
      account_type: 'asset',
      banque: payload.banque?.trim() || null,
      iban: payload.iban?.trim().replace(/\s/g, '') || null,
      bic: payload.bic?.trim() || null,
      initial_balance: payload.solde_initial || 0,
    })
    .select('id, name')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; name: string }, error: null };
}

export async function listComptesBancaires(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, code, banque, iban, bic, initial_balance')
    .eq('copro_id', coproId)
    .eq('account_type', 'bank')
    .order('code', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; name: string; code: string; banque: string | null; iban: string | null; bic: string | null; initial_balance: number }>, error: null };
}

// ═══ ACCOUNTING PERIOD ═══

export async function ensureAccountingPeriod(coproId: string, year: number) {
  const supabase = createUntypedClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Check if period already exists
  const { data: existing } = await supabase
    .from('accounting_periods')
    .select('id')
    .eq('copro_id', coproId)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .maybeSingle();

  if (existing) return { data: { id: existing.id as string }, error: null };

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert({
      copro_id: coproId,
      name: `Exercice ${year}`,
      start_date: startDate,
      end_date: endDate,
      status: 'open',
    })
    .select('id')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: { id: data.id as string }, error: null };
}

// ═══ REPARTITION KEYS ═══

export async function listRepartitionKeys(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('repartition_keys')
    .select('id, name')
    .eq('copro_id', coproId)
    .order('name');
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; name: string }>, error: null };
}

export async function listRepartitionKeyLines(keyId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('repartition_key_lines')
    .select('lot_id, weight')
    .eq('key_id', keyId);
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ lot_id: string; weight: number }>, error: null };
}

// ═══ BUDGET (STEP 5) ═══

export interface BudgetLineCreate {
  label: string;
  amount: number;
  repartition_key_id: string;
  category: string;
  sort_order: number;
}

export async function createOnboardingBudget(
  coproId: string,
  periodId: string,
  name: string,
  lines: BudgetLineCreate[]
) {
  const supabase = createUntypedClient();

  // Ensure a default expense account exists (code 6xx)
  let accountId: string;
  const { data: existingAcc } = await supabase
    .from('accounts')
    .select('id')
    .eq('copro_id', coproId)
    .eq('code', '600')
    .maybeSingle();

  if (existingAcc) {
    accountId = existingAcc.id as string;
  } else {
    const { data: newAcc, error: accErr } = await supabase
      .from('accounts')
      .insert({
        copro_id: coproId,
        code: '600',
        name: 'Charges de copropriété',
        account_type: 'expense',
        is_active: true,
      })
      .select('id')
      .single();
    if (accErr) return { data: null, error: new Error(accErr.message) };
    accountId = newAcc.id as string;
  }

  // Create budget
  const { data: budget, error: budgetErr } = await supabase
    .from('budgets')
    .insert({
      copro_id: coproId,
      period_id: periodId,
      budget_type: 'current',
      name,
      status: 'draft',
      version: 1,
    })
    .select('id')
    .single();
  if (budgetErr) return { data: null, error: new Error(budgetErr.message) };

  // Create budget lines
  if (lines.length > 0) {
    const budgetLines = lines.map(l => ({
      copro_id: coproId,
      budget_id: budget.id,
      account_id: accountId,
      repartition_key_id: l.repartition_key_id,
      label: l.label.trim(),
      code: l.category,
      amount: l.amount,
      sort_order: l.sort_order,
    }));
    const { error: linesErr } = await supabase.from('budget_lines').insert(budgetLines);
    if (linesErr) return { data: null, error: new Error(linesErr.message) };
  }

  return { data: { budgetId: budget.id as string }, error: null };
}

// ═══ CALLS FOR FUNDS (STEP 6) ═══

export interface GenerateCallsPayload {
  coproId: string;
  periodId: string;
  budgetId: string;
  schedule: 'annuel' | 'semestriel' | 'trimestriel';
  agDate: string;
}

export async function generateCallsFromBudget(payload: GenerateCallsPayload) {
  const supabase = createUntypedClient();
  const { coproId, periodId, budgetId, schedule, agDate } = payload;

  // Get budget lines with their repartition key
  const { data: budgetLines, error: blErr } = await supabase
    .from('budget_lines')
    .select('id, amount, repartition_key_id')
    .eq('budget_id', budgetId);
  if (blErr) return { data: null, error: new Error(blErr.message) };
  if (!budgetLines?.length) return { data: null, error: new Error('Aucune ligne de budget trouvée') };

  // Group budget lines by repartition key (keyId → total amount)
  const keyTotals = new Map<string, number>();
  for (const line of budgetLines as Array<{ amount: number; repartition_key_id: string }>) {
    const amt = Number(line.amount) || 0;
    keyTotals.set(line.repartition_key_id, (keyTotals.get(line.repartition_key_id) || 0) + amt);
  }

  // Determine number of calls and dates
  const nbAppels = schedule === 'annuel' ? 1 : schedule === 'semestriel' ? 2 : 4;
  const year = new Date(agDate).getFullYear();

  // Ensure accounts 450 and 701 exist
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .in('code', ['450', '701']);

  let acc450Id: string;
  let acc701Id: string;
  const accountsList = (accounts || []) as Array<{ id: string; code: string }>;
  const found450 = accountsList.find(a => a.code === '450');
  const found701 = accountsList.find(a => a.code === '701');

  if (!found450) {
    const { data: n450, error: e450 } = await supabase
      .from('accounts')
      .insert({ copro_id: coproId, code: '450', name: 'Copropriétaires', account_type: 'asset', is_active: true })
      .select('id').single();
    if (e450) return { data: null, error: new Error(e450.message) };
    acc450Id = n450.id as string;
  } else {
    acc450Id = found450.id;
  }

  if (!found701) {
    const { data: n701, error: e701 } = await supabase
      .from('accounts')
      .insert({ copro_id: coproId, code: '701', name: 'Provisions pour charges', account_type: 'income', is_active: true })
      .select('id').single();
    if (e701) return { data: null, error: new Error(e701.message) };
    acc701Id = n701.id as string;
  } else {
    acc701Id = found701.id;
  }

  // Récupérer les noms des clés pour le détail
  const keyIds = [...keyTotals.keys()];
  const { data: keyNames } = await supabase
    .from('repartition_keys')
    .select('id, name')
    .in('id', keyIds);
  const keyNameMap: Record<string, string> = {};
  for (const k of (keyNames || []) as Array<{ id: string; name: string }>) {
    keyNameMap[k.id] = k.name;
  }

  let totalCallsCreated = 0;
  let totalLinesCreated = 0;
  const callDetails: Array<{ label: string; trimester: number; keyName: string; amount: number; lotsCount: number }> = [];

  for (let t = 1; t <= nbAppels; t++) {
    const issueMonth = schedule === 'annuel' ? 0 : schedule === 'semestriel' ? (t - 1) * 6 : (t - 1) * 3;
    const issueDate = new Date(year, issueMonth, 1).toISOString().split('T')[0];
    const dueDate = new Date(year, issueMonth + 1, 0).toISOString().split('T')[0];
    const labelSuffix = nbAppels === 1 ? '' : schedule === 'semestriel' ? ` - S${t}` : ` - T${t}`;

    for (const [keyId, totalAmount] of Array.from(keyTotals.entries())) {
      const callAmount = Math.round((totalAmount / nbAppels) * 100) / 100;

      // Get lots for this key
      const { data: keyLines } = await supabase
        .from('repartition_key_lines')
        .select('lot_id, weight')
        .eq('key_id', keyId);
      if (!keyLines?.length) continue;

      const totalWeight = (keyLines as Array<{ weight: number }>).reduce((s, l) => s + Number(l.weight), 0);

      // Create ledger transaction
      const { data: ltx, error: ltxErr } = await supabase
        .from('ledger_transactions')
        .insert({
          copro_id: coproId,
          period_id: periodId,
          tx_date: issueDate,
          label: `Appel de fonds${labelSuffix}`,
          source_type: 'call_for_funds',
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (ltxErr) continue;

      // Create ledger entries (debit 450, credit 701)
      await supabase.from('ledger_entries').insert([
        { copro_id: coproId, period_id: periodId, tx_id: ltx.id, account_id: acc450Id, direction: 'debit', amount: callAmount, entry_label: `Appel${labelSuffix}` },
        { copro_id: coproId, period_id: periodId, tx_id: ltx.id, account_id: acc701Id, direction: 'credit', amount: callAmount, entry_label: `Appel${labelSuffix}` },
      ]);

      // Create call_for_funds
      const { data: call, error: callErr } = await supabase
        .from('call_for_funds')
        .insert({
          copro_id: coproId,
          period_id: periodId,
          budget_id: budgetId,
          repartition_key_id: keyId,
          label: `Appel de fonds${labelSuffix}`,
          trimester: t,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: callAmount,
          status: 'draft',
          ledger_tx_id: ltx.id,
        })
        .select('id')
        .single();
      if (callErr) continue;

      // Create call lines per lot
      const lines = (keyLines as Array<{ lot_id: string; weight: number }>).map(l => ({
        copro_id: coproId,
        call_id: call.id,
        lot_id: l.lot_id,
        amount_due: Math.round((callAmount * Number(l.weight) / totalWeight) * 100) / 100,
      }));

      // Fix rounding
      const linesTotal = lines.reduce((s, l) => s + l.amount_due, 0);
      const delta = Math.round((callAmount - linesTotal) * 100) / 100;
      if (lines.length > 0 && delta !== 0) {
        lines[lines.length - 1].amount_due += delta;
      }

      const { error: clErr } = await supabase.from('call_for_funds_lines').insert(lines);
      if (!clErr) {
        totalCallsCreated++;
        totalLinesCreated += lines.length;
        callDetails.push({
          label: `Appel de fonds${labelSuffix}`,
          trimester: t,
          keyName: keyNameMap[String(keyId)] || 'Charges générales',
          amount: callAmount,
          lotsCount: lines.length,
        });
      }
    }
  }

  // Mark budget as validated
  await supabase.from('budgets').update({ status: 'validated', validated_at: new Date().toISOString() }).eq('id', budgetId);

  return {
    data: {
      callsCreated: totalCallsCreated,
      linesCreated: totalLinesCreated,
      details: callDetails,
      totalAmount: callDetails.reduce((s, d) => s + d.amount, 0),
    },
    error: null,
  };
}

// ═══ LOTS LIST (for Step 7) ═══

export async function listLots(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_lots_with_owners')
    .select('id, ref, type, owner_display_name')
    .eq('copro_id', coproId)
    .order('ref');
  if (error) return { data: null, error: new Error(error.message) };
  return {
    data: (data || []).map((l: Record<string, unknown>) => ({
      id: l.id as string,
      ref: l.ref as string,
      type: l.type as string | null,
      ownerName: (l.owner_display_name as string | null) || null,
    })),
    error: null,
  };
}

// ═══ REPRISE SOLDES (STEP 7) ═══

export interface SoldeInitialEntry {
  lotId: string;
  amount: number;
}

export async function saveRepriseSoldes(
  coproId: string,
  periodId: string,
  entries: SoldeInitialEntry[]
) {
  const supabase = createUntypedClient();

  // Ensure accounts 450 (copropriétaires) and 120 (report à nouveau)
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .in('code', ['450', '120']);

  const accountsList = (accounts || []) as Array<{ id: string; code: string }>;
  let acc450Id: string;
  let acc120Id: string;

  const found450 = accountsList.find(a => a.code === '450');
  const found120 = accountsList.find(a => a.code === '120');

  if (!found450) {
    const { data: n, error: e } = await supabase
      .from('accounts')
      .insert({ copro_id: coproId, code: '450', name: 'Copropriétaires', account_type: 'asset', is_active: true })
      .select('id').single();
    if (e) return { data: null, error: new Error(e.message) };
    acc450Id = n.id as string;
  } else {
    acc450Id = found450.id;
  }

  if (!found120) {
    const { data: n, error: e } = await supabase
      .from('accounts')
      .insert({ copro_id: coproId, code: '120', name: 'Report à nouveau', account_type: 'equity', is_active: true })
      .select('id').single();
    if (e) return { data: null, error: new Error(e.message) };
    acc120Id = n.id as string;
  } else {
    acc120Id = found120.id;
  }

  const nonZeroEntries = entries.filter(e => e.amount !== 0);
  if (nonZeroEntries.length === 0) return { data: { count: 0 }, error: null };

  const totalAmount = nonZeroEntries.reduce((s, e) => s + Math.abs(e.amount), 0);

  // Create one ledger transaction for the opening balance
  const { data: ltx, error: ltxErr } = await supabase
    .from('ledger_transactions')
    .insert({
      copro_id: coproId,
      period_id: periodId,
      tx_date: new Date().toISOString().split('T')[0],
      label: 'Reprise de soldes — Soldes initiaux',
      source_type: 'opening',
      status: 'draft',
    })
    .select('id')
    .single();
  if (ltxErr) return { data: null, error: new Error(ltxErr.message) };

  // Create ledger entries per lot
  const ledgerEntries: Array<Record<string, unknown>> = [];

  for (const entry of nonZeroEntries) {
    // Positive amount = lot owes money (debit 450 for receivable)
    // Negative amount = lot has credit (credit 450)
    if (entry.amount > 0) {
      ledgerEntries.push({
        copro_id: coproId,
        period_id: periodId,
        tx_id: ltx.id,
        account_id: acc450Id,
        direction: 'debit',
        amount: entry.amount,
        lot_id: entry.lotId,
        entry_label: 'Solde initial — dû',
      });
    } else {
      ledgerEntries.push({
        copro_id: coproId,
        period_id: periodId,
        tx_id: ltx.id,
        account_id: acc450Id,
        direction: 'credit',
        amount: Math.abs(entry.amount),
        lot_id: entry.lotId,
        entry_label: 'Solde initial — avoir',
      });
    }
  }

  // Counterpart entry on 120 (report à nouveau)
  const totalDebit = nonZeroEntries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalCredit = nonZeroEntries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  if (totalDebit > 0) {
    ledgerEntries.push({
      copro_id: coproId,
      period_id: periodId,
      tx_id: ltx.id,
      account_id: acc120Id,
      direction: 'credit',
      amount: totalDebit,
      entry_label: 'Report à nouveau — contrepartie débits',
    });
  }
  if (totalCredit > 0) {
    ledgerEntries.push({
      copro_id: coproId,
      period_id: periodId,
      tx_id: ltx.id,
      account_id: acc120Id,
      direction: 'debit',
      amount: totalCredit,
      entry_label: 'Report à nouveau — contrepartie crédits',
    });
  }

  const { error: entErr } = await supabase.from('ledger_entries').insert(ledgerEntries);
  if (entErr) return { data: null, error: new Error(entErr.message) };

  // Passer la transaction en posted maintenant que les écritures sont créées
  const { error: postErr } = await supabase
    .from('ledger_transactions')
    .update({ status: 'posted', posted_at: new Date().toISOString() })
    .eq('id', ltx.id as string);
  if (postErr) return { data: null, error: new Error(postErr.message) };

  return { data: { count: nonZeroEntries.length }, error: null };
}
