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

  // Provisionner le plan comptable canonique (82 comptes, 450-1..5, chapeau non-postable).
  // Idempotent côté SQL (ON CONFLICT DO NOTHING).
  if (data) {
    const { error: chartErr } = await supabase.rpc('provision_copro_chart', {
      p_copro_id: (data as { id: string }).id,
    });
    if (chartErr) {
      return { data: null, error: new Error(`Plan comptable non provisionné : ${chartErr.message}`) };
    }

    // provision_copro_chart est idempotent (son entier de retour vaut 0 au re-run) :
    // vérifier un compte sentinelle (450-1) confirme que le plan est réellement présent.
    const { count: sentinel, error: chkErr } = await supabase
      .from('accounts').select('id', { count: 'exact', head: true })
      .eq('copro_id', (data as { id: string }).id).eq('code', '450-1');
    if (chkErr || !sentinel) {
      return { data: null, error: new Error('Plan comptable incomplet après provisionnement (450-1 absent).') };
    }
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

// Défaut codé — destiné à devenir modulable dans les Paramètres (override par copro en base). Source unique.
// Indexé par id de poste (cf. POSTES_BUDGET_PREDEFINIS), valeur = code du compte de charge canonique.
export const DEFAULT_POSTE_CHARGE_ACCOUNT: Record<string, string> = {
  eau: '601',
  electricite: '602',
  chauffage: '603',
  assurance: '616',
  menage: '611',
  ascenseur: '614',
  espaces_verts: '615',
  entretien: '615',
  honoraires_syndic: '621',
  divers: '628',
};

export async function createOnboardingBudget(
  coproId: string,
  periodId: string,
  name: string,
  lines: BudgetLineCreate[]
) {
  const supabase = createUntypedClient();

  const { data: chargeAccounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .like('code', '6%');
  const chargeByCode = new Map<string, string>();
  for (const a of (chargeAccounts || []) as Array<{ id: string; code: string }>) {
    chargeByCode.set(a.code, a.id);
  }

  // Défaut : 628 (charges diverses). Si absent du plan -> erreur explicite (plan non provisionné).
  const defaultChargeId = chargeByCode.get('628');
  if (!defaultChargeId) {
    return { data: null, error: new Error('Plan comptable incomplet : compte 628 absent. La copro a-t-elle été provisionnée (provision_copro_chart) ?') };
  }

  // Résolution par id de poste (ex. 'eau' -> '601') depuis la table par défaut.
  // Une ligne en texte libre (pas d'id de poste prédéfini) ne matche pas -> tombe sur 628 + warning.
  function resolveChargeAccount(posteId: string): { id: string; mappedToDefault: boolean } {
    const targetCode = DEFAULT_POSTE_CHARGE_ACCOUNT[posteId];
    const id = targetCode ? chargeByCode.get(targetCode) : undefined;
    if (id) return { id, mappedToDefault: false };
    return { id: defaultChargeId!, mappedToDefault: true };
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

  // Create budget lines (compte de charge résolu par catégorie, pas un 600 unique)
  const unmappedCategories: string[] = [];
  if (lines.length > 0) {
    const budgetLines = lines.map(l => {
      const { id: accountId, mappedToDefault } = resolveChargeAccount(l.category);
      if (mappedToDefault) unmappedCategories.push(l.category);
      return {
        copro_id: coproId,
        budget_id: budget.id,
        account_id: accountId,
        repartition_key_id: l.repartition_key_id,
        label: l.label.trim(),
        code: l.category,
        amount: l.amount,
        sort_order: l.sort_order,
      };
    });
    const { error: linesErr } = await supabase.from('budget_lines').insert(budgetLines);
    if (linesErr) return { data: null, error: new Error(linesErr.message) };
  }

  return {
    data: {
      budgetId: budget.id as string,
      unmappedCategories: [...new Set(unmappedCategories)],
    },
    error: null,
  };
}

// ═══ CALLS FOR FUNDS (postage canonique, fin de wizard) ═══

export interface OnboardingCallPlan {
  schedule: 'annuel' | 'semestriel' | 'trimestriel';
  alreadyDone: number;        // échéances déjà émises avant l'entrée dans l'outil
  installments: Array<{       // uniquement les échéances RESTANTES
    index: number;            // 1-based, position dans l'exercice
    label: string;
    issueDate: string;        // YYYY-MM-DD
    dueDate: string;          // YYYY-MM-DD
  }>;
}

export async function postOnboardingCalls(
  coproId: string,
  periodId: string,
  budgetId: string,
  plan: OnboardingCallPlan
) {
  const supabase = createUntypedClient();
  const count = plan.schedule === 'annuel' ? 1 : plan.schedule === 'semestriel' ? 2 : 4;

  // Idempotence : si des appels non annulés existent déjà pour ce budget, ne pas reposter
  // (re-clic de finalisation après échec partiel).
  const { data: existing } = await supabase
    .from('call_for_funds')
    .select('id')
    .eq('budget_id', budgetId)
    .neq('status', 'cancelled')
    .limit(1);
  if (existing && existing.length > 0) {
    return { data: { posted: 0, skipped: true }, error: null };
  }

  for (const inst of plan.installments) {
    const { data, error } = await supabase.rpc('post_budget_call_for_funds', {
      p_copro_id: coproId,
      p_period_id: periodId,
      p_budget_id: budgetId,
      p_label: inst.label,
      p_trimester: inst.index,
      p_issue_date: inst.issueDate,
      p_due_date: inst.dueDate,
      p_fraction: 1.0,
      p_installment_index: inst.index,
      p_installment_count: count,
    });
    if (error) {
      return { data: null, error: new Error(`Appel ${inst.label} : ${error.message}`) };
    }
    if (data && (data as { success?: boolean }).success === false) {
      return { data: null, error: new Error(`Appel ${inst.label} : ${(data as { error?: string }).error || 'échec RPC'}`) };
    }
  }

  // Marquer le budget validé
  const { error: budErr } = await supabase
    .from('budgets')
    .update({ status: 'validated', validated_at: new Date().toISOString() })
    .eq('id', budgetId);
  if (budErr) return { data: null, error: new Error(budErr.message) };

  return { data: { posted: plan.installments.length }, error: null };
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

// ═══ REPRISE SOLDES (postage canonique, fin de wizard) ═══

export type SoldeNature = 'current' | 'works' | 'alur';

export interface SoldeOpeningEntry {
  lotId: string;
  nature: SoldeNature;   // 450-1 (current), 450-2 (works), 450-5 (alur)
  amount: number;        // > 0 = le lot doit ; < 0 = avoir
}

export async function postOnboardingOpeningBalances(
  coproId: string,
  periodId: string,
  entries: SoldeOpeningEntry[]
) {
  const supabase = createUntypedClient();
  const nonZero = entries.filter(e => e.amount !== 0);
  if (nonZero.length === 0) return { data: { count: 0 }, error: null };

  // Idempotence : si une reprise d'ouverture existe déjà pour cette période, ne pas reposter.
  const { data: existingTx, error: existTxErr } = await supabase
    .from('ledger_transactions')
    .select('id')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .eq('source_type', 'opening_balance')
    .limit(1);
  if (existTxErr) {
    return { data: null, error: new Error(`Vérification idempotence reprise : ${existTxErr.message}`) };
  }
  if (existingTx && existingTx.length > 0) {
    return { data: { count: 0, skipped: true }, error: null };
  }

  // Résoudre les sous-comptes 450-x par nature présente
  const naturesUsed = [...new Set(nonZero.map(e => e.nature))];
  const tiersAccount: Record<string, string> = {};
  for (const nature of naturesUsed) {
    const { data, error } = await supabase.rpc('resolve_lot_tiers_account', {
      p_copro_id: coproId,
      p_nature: nature,
    });
    if (error || !data) {
      return { data: null, error: new Error(`Compte 450 nature '${nature}' introuvable : ${error?.message || 'plan non provisionné'}`) };
    }
    tiersAccount[nature] = data as string;
  }

  // Comptes d'attente 471 (débiteur) / 472 (créditeur)
  const { data: waitAcc } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .in('code', ['471', '472']);
  const waitById = new Map<string, string>();
  for (const a of (waitAcc || []) as Array<{ id: string; code: string }>) waitById.set(a.code, a.id);
  const acc471 = waitById.get('471');
  const acc472 = waitById.get('472');
  if (!acc471 || !acc472) {
    return { data: null, error: new Error('Comptes d\'attente 471/472 absents (plan non provisionné ?)') };
  }

  // Construire les écritures : D/C 450-x/lot, contrepartie en compte d'attente
  type Entry = { account_id: string; lot_id?: string; direction: 'debit' | 'credit'; amount: number; entry_label: string };
  const ledgerEntries: Entry[] = [];
  let totalDebit = 0;  // somme des soldes dus (450 débité)
  let totalCredit = 0; // somme des avoirs (450 crédité)

  for (const e of nonZero) {
    const acc = tiersAccount[e.nature];
    if (e.amount > 0) {
      ledgerEntries.push({ account_id: acc, lot_id: e.lotId, direction: 'debit', amount: e.amount, entry_label: 'Solde d\'ouverture — dû' });
      totalDebit += e.amount;
    } else {
      ledgerEntries.push({ account_id: acc, lot_id: e.lotId, direction: 'credit', amount: Math.abs(e.amount), entry_label: 'Solde d\'ouverture — avoir' });
      totalCredit += Math.abs(e.amount);
    }
  }

  // Contrepartie en compte d'attente (à solder avant gel)
  if (totalDebit > 0) {
    ledgerEntries.push({ account_id: acc472, direction: 'credit', amount: totalDebit, entry_label: 'Attente reprise — contrepartie débits' });
  }
  if (totalCredit > 0) {
    ledgerEntries.push({ account_id: acc471, direction: 'debit', amount: totalCredit, entry_label: 'Attente reprise — contrepartie crédits' });
  }

  // Une SEULE transaction atomique, auto-postée (équilibre garanti par construction)
  const { data, error } = await supabase.rpc('create_ledger_transaction', {
    p_copro_id: coproId,
    p_period_id: periodId,
    p_tx_date: new Date().toISOString().split('T')[0],
    p_label: 'Reprise des soldes d\'ouverture',
    p_source_type: 'opening_balance',
    p_source_id: periodId,
    p_entries: ledgerEntries,
    p_auto_post: true,
  });
  if (error) return { data: null, error: new Error(error.message) };
  if (data && (data as { success?: boolean }).success === false) {
    return { data: null, error: new Error((data as { error?: string }).error || 'échec reprise') };
  }

  return { data: { count: nonZero.length }, error: null };
}

// ═══ VÉRIFICATION FINALE ═══

export interface OnboardingAuditIssue {
  entity_type: string;
  issue_type: string;
  description: string;
  difference: number | null;
}

export async function auditOnboardingBooks(coproId: string) {
  const supabase = createUntypedClient();

  // 1) Écarts d'intégrité du grand livre
  const { data: issues, error: issuesErr } = await supabase
    .rpc('audit_finance_integrity', { p_copro_id: coproId });
  if (issuesErr) return { data: null, error: new Error(issuesErr.message) };

  // 2) Solde net des comptes d'attente 471/472 (doit être 0 avant gel)
  const { data: waitEntries, error: waitErr } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id)')
    .eq('accounts.copro_id', coproId)
    .in('accounts.code', ['471', '472']);
  if (waitErr) return { data: null, error: new Error(waitErr.message) };

  let waitingBalance = 0;
  for (const e of (waitEntries || []) as Array<{ amount: number; direction: string }>) {
    waitingBalance += e.direction === 'debit' ? Number(e.amount) : -Number(e.amount);
  }

  const issueList = (issues || []) as OnboardingAuditIssue[];
  const clean = issueList.length === 0 && Math.abs(waitingBalance) < 0.01;

  return { data: { clean, issues: issueList, waitingBalance }, error: null };
}
