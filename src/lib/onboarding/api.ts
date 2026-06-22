import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { hasBlockingIssue, splitAuditIssues } from '@/lib/onboarding/audit-rules';

// Client « non typé » : accès aux tables/vues pas encore dans les types générés.
const createUntypedClient = () => createClient() as unknown as SupabaseClient;

// ═══ COPROPRIETE ═══

export interface CoproCreate {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  annee_construction?: number; // millésime (ex 1987) ; int2 en base (contrôle 1700..année+5)
  siret?: string;
  previous_syndic_name?: string; // nom du syndic sortant (reprise de mandat) — copros.previous_syndic_name
  exercice_debut?: number; // mois de début d'exercice (1..12), défaut 1 = janvier (exercice civil)
}

export async function createCopropriete(payload: CoproCreate) {
  const supabase = createUntypedClient();

  // Création TRANSACTIONNELLE côté serveur via la RPC create_copro (SECURITY DEFINER, migration 0083) :
  // crée la copro (cabinet = celui du gestionnaire connecté) + la membership 'gestionnaire' + le plan
  // comptable canonique, EN UNE SEULE TRANSACTION, en contournant proprement la RLS. L'insertion
  // directe est impossible (la policy copros exige une membership 'gestionnaire' qui n'existe pas
  // encore au moment de l'INSERT — amorçage poule & œuf). L'autorisation (authentifié + rattaché à
  // un cabinet) est vérifiée DANS la RPC ; toute erreur annule l'ensemble (plus de nettoyage manuel).
  const { data, error } = await supabase.rpc('create_copro', {
    p_name: payload.name,
    p_address: payload.address,
    p_city: payload.city,
    p_postal_code: payload.postal_code,
    p_annee_construction: payload.annee_construction ?? null,
    p_siret: payload.siret ?? null,
    p_previous_syndic_name: payload.previous_syndic_name ?? null,
    p_exercice_debut: payload.exercice_debut ?? 1,
  });
  if (error) return { data: null, error: new Error(error.message) };

  const result = data as { id: string; name: string } | null;
  if (!result?.id) {
    return { data: null, error: new Error('Création de la copropriété échouée : réponse inattendue du serveur.') };
  }
  return { data: { id: result.id, name: result.name }, error: null };
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
  // Suppression côté serveur (RPC delete_onboarding_copro, SECURITY DEFINER, migration 0084) :
  // purge les enfants RESTRICT (plan comptable, périodes, écritures…) dans l'ordre FK-safe puis la
  // copro. Une suppression directe échouait sur la FK accounts→copros (RESTRICT). La RPC vérifie
  // que la copro est bien EN ONBOARDING (jamais une compta live).
  const { error } = await supabase.rpc('delete_onboarding_copro', { p_copro_id: coproId });
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
      bank_name: payload.banque?.trim() || null,
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
  // Comptes bancaires = comptes d'actif de trésorerie (512x banque, 502x livret travaux).
  // L'enum account_type N'A PAS de valeur 'bank' -> on filtre par account_type='asset' + code.
  // On EXCLUT les codes nus '512' (« Banque ») et '502' (« Livret A ») créés par
  // provision_copro_chart : ce sont des comptes chapeau génériques, pas de vrais comptes
  // bancaires. Seuls les comptes ouverts à l'étape 4 (512000/512100…) doivent apparaître,
  // sinon BalanceEntreeForm affiche des lignes banque fantômes / risque de postage erroné.
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, code, banque:bank_name, iban, bic, initial_balance')
    .eq('copro_id', coproId)
    .eq('account_type', 'asset')
    .or('code.like.512%,code.like.502%')
    .neq('code', '512')
    .neq('code', '502')
    .order('code', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; name: string; code: string; banque: string | null; iban: string | null; bic: string | null; initial_balance: number }>, error: null };
}

// ═══ ACCOUNTING PERIOD ═══

/** Bornes d'un exercice : start = 1er jour du mois de début (exercice_debut 1..12) de `year`, end = +1 an - 1 jour. */
export function deriveExercicePeriod(exerciceDebut: number | null, year: number): { start: string; end: string; name: string } {
  // exerciceDebut = MOIS de début (int2 1..12, schéma cible) ; jour implicite = 1er. Défaut janvier = exercice civil.
  const mm = exerciceDebut != null && exerciceDebut >= 1 && exerciceDebut <= 12 ? exerciceDebut : 1;
  const start = new Date(Date.UTC(year, mm - 1, 1));
  const end = new Date(Date.UTC(year + 1, mm - 1, 1));
  end.setUTCDate(end.getUTCDate() - 1); // start + 1 an - 1 jour
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = mm === 1 ? `Exercice ${year}` : `Exercice ${iso(start)} → ${iso(end)}`;
  return { start: iso(start), end: iso(end), name: label };
}

/**
 * Année d'exercice CONTENANT la date `today`, dérivée de `exercice_debut` (mois 1..12).
 * Pour un exercice civil (1 = janvier) c'est l'année de `today`. Pour un exercice décalé
 * (ex. 7 = juillet), si today est en janvier on vise l'exercice ouvert l'année PRÉCÉDENTE
 * (juil. N-1 → juin N) — JAMAIS getFullYear() brut, qui ciblerait juil. N → juin N+1.
 */
export function deriveExerciceYearForDate(exerciceDebut: number | null, today: Date): number {
  const mm = exerciceDebut != null && exerciceDebut >= 1 && exerciceDebut <= 12 ? exerciceDebut : 1;
  const y = today.getUTCFullYear();
  // Début d'exercice (1er du mois mm) de l'année civile courante, en UTC.
  const startThisYear = Date.UTC(y, mm - 1, 1);
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  // Si today est AVANT le début d'exercice de l'année courante -> exercice ouvert l'année précédente.
  return todayUTC < startThisYear ? y - 1 : y;
}

export async function ensureAccountingPeriod(coproId: string, year: number) {
  const supabase = createUntypedClient();

  // Dériver les bornes de l'exercice de CETTE copro (pas l'année civile en dur).
  const { data: copro, error: coproErr } = await supabase
    .from('copros').select('exercice_debut').eq('id', coproId).single();
  if (coproErr) return { data: null, error: new Error(coproErr.message) };
  const { start, end, name } = deriveExercicePeriod(
    (copro as { exercice_debut: number | null }).exercice_debut, year
  );

  // Période déjà existante ?
  const { data: existing } = await supabase
    .from('accounting_periods')
    .select('id, start_date, end_date')
    .eq('copro_id', coproId)
    .eq('start_date', start)
    .eq('end_date', end)
    .maybeSingle();
  if (existing) {
    return { data: { id: existing.id as string, start, end }, error: null };
  }

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert({ copro_id: coproId, name, start_date: start, end_date: end, status: 'open' })
    .select('id')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: { id: data.id as string, start, end }, error: null };
}

/** Garantit qu'une date de reprise tombe dans l'exercice ; sinon la borne à start/end. */
export function clampAsOfDate(asOf: string, start: string, end: string): string {
  if (asOf < start) return start;
  if (asOf > end) return end;
  return asOf;
}

export interface ResolvedPeriod {
  id: string;
  start: string;
  end: string;
}

/**
 * Lecture SEULE de la période d'onboarding (aucune création), partagée par
 * resolveOnboardingPeriod et getOrCreateOnboardingPeriod. Ordre (spec P1) :
 *   1) la période portant déjà une tx source_type='opening_onboarding' (la reprise existe) ;
 *   2) sinon, l'unique période status='open' de la copro ;
 *   3) sinon -> null (pas de période d'onboarding identifiable).
 */
async function readOnboardingPeriod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  coproId: string
): Promise<{ data: ResolvedPeriod | null; error: Error | null }> {
  // 1) Période d'une reprise d'onboarding déjà postée
  const { data: openingTx, error: txErr } = await supabase
    .from('ledger_transactions')
    .select('period_id')
    .eq('copro_id', coproId)
    .eq('source_type', 'opening_onboarding')
    // ledger_transactions n'a PAS de colonne created_at (drift schéma) -> 400 PostgREST qui faisait
    // échouer toute la résolution de période (onboarding BLOQUÉ à l'étape Budget). posted_at = la
    // colonne horodatée réelle (timestamptz), sémantiquement correcte pour « la tx la plus récente ».
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (txErr) return { data: null, error: new Error(txErr.message) };

  if (openingTx?.period_id) {
    const { data: p, error: pErr } = await supabase
      .from('accounting_periods')
      .select('id, start_date, end_date')
      .eq('id', (openingTx as { period_id: string }).period_id)
      .single();
    if (pErr) return { data: null, error: new Error(pErr.message) };
    return {
      data: { id: p.id as string, start: p.start_date as string, end: p.end_date as string },
      error: null,
    };
  }

  // 2) Unique période ouverte de la copro
  const { data: openPeriods, error: openErr } = await supabase
    .from('accounting_periods')
    .select('id, start_date, end_date')
    .eq('copro_id', coproId)
    .eq('status', 'open')
    .order('start_date', { ascending: false });
  if (openErr) return { data: null, error: new Error(openErr.message) };

  if (openPeriods && openPeriods.length > 0) {
    // S'il y en a plusieurs (cas anormal), on prend la plus récente — déterministe.
    const p = openPeriods[0] as { id: string; start_date: string; end_date: string };
    return { data: { id: p.id, start: p.start_date, end: p.end_date }, error: null };
  }

  // 3) Aucune période d'onboarding identifiable.
  return { data: null, error: null };
}

/**
 * RÉSOLUTION SEULE (FIX 2b) : cible LA période d'onboarding existante SANS jamais en créer.
 * Renvoie null si aucune tx opening_onboarding ET aucune période open. Destinée au chemin
 * alerte/modal : on ne doit JAMAIS créer une période parasite en effet de bord d'un clic
 * sur l'alerte. La CRÉATION reste réservée au wizard via getOrCreateOnboardingPeriod.
 */
export async function resolveOnboardingPeriod(
  coproId: string
): Promise<{ data: ResolvedPeriod | null; error: Error | null }> {
  const supabase = createUntypedClient();
  return readOnboardingPeriod(supabase, coproId);
}

/**
 * CRÉATION canonique (FIX 3) : la SEULE voie autorisée à créer la période d'onboarding.
 * (1) période portant une tx opening_onboarding, sinon (2) l'unique période open, sinon
 * (3) CRÉE la période de l'exercice CONTENANT AUJOURD'HUI — année dérivée de
 * copros.exercice_debut (deriveExerciceYearForDate), PAS getFullYear() brut. Garantit
 * une période d'onboarding unique et cohérente entre budget, appels et reprise.
 */
export async function getOrCreateOnboardingPeriod(
  coproId: string
): Promise<{ data: ResolvedPeriod | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // 1-2) Lecture seule (réutilise exactement la logique du chemin résolution).
  const read = await readOnboardingPeriod(supabase, coproId);
  if (read.error) return read;
  if (read.data) return read;

  // 3) Création : exercice contenant aujourd'hui, dérivé de exercice_debut.
  const { data: copro, error: coproErr } = await supabase
    .from('copros').select('exercice_debut').eq('id', coproId).single();
  if (coproErr) return { data: null, error: new Error(coproErr.message) };

  const year = deriveExerciceYearForDate(
    (copro as { exercice_debut: number | null }).exercice_debut, new Date()
  );
  const { data: created, error: createErr } = await ensureAccountingPeriod(coproId, year);
  if (createErr || !created) {
    return { data: null, error: createErr ?? new Error('Impossible de résoudre la période de reprise.') };
  }
  return { data: { id: created.id, start: created.start, end: created.end }, error: null };
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

  // I6 — Au plus UN budget 'current' par (copro, période). Si un budget existe déjà :
  //   - s'il est référencé par des appels émis (verrouillé) -> on le RÉUTILISE tel quel
  //     (et on ne recrée pas de lignes : retour anticipé pour éviter les doublons) ;
  //   - sinon (draft sans appel) -> on le réutilise et on remplace ses lignes.
  const { data: existingBudget, error: existBudgetErr } = await supabase
    .from('budgets')
    .select('id, status')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .eq('budget_type', 'current')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existBudgetErr) return { data: null, error: new Error(existBudgetErr.message) };

  let budget: { id: string };
  if (existingBudget) {
    // Le budget est-il verrouillé (des appels non annulés le référencent) ?
    const { count: callCount, error: callErr } = await supabase
      .from('call_for_funds')
      .select('id', { count: 'exact', head: true })
      .eq('budget_id', (existingBudget as { id: string }).id)
      .neq('status', 'cancelled');
    if (callErr) return { data: null, error: new Error(callErr.message) };
    budget = { id: (existingBudget as { id: string }).id };
    if ((callCount ?? 0) > 0) {
      // Verrouillé : on ne touche plus aux lignes -> retour idempotent.
      return { data: { budgetId: budget.id, unmappedCategories: [] }, error: null };
    }
    // Draft non verrouillé : on purge les anciennes lignes avant de réinsérer.
    const { error: delErr } = await supabase.from('budget_lines').delete().eq('budget_id', budget.id);
    if (delErr) return { data: null, error: new Error(delErr.message) };
  } else {
    const { data: created, error: budgetErr } = await supabase
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
    budget = { id: (created as { id: string }).id };
  }

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

  // Pré-validation : toutes les clés de répartition du budget doivent être complètes
  // AVANT de poster quoi que ce soit (sinon post_budget_call_for_funds RAISE en cours de
  // boucle et laisse un état partiel). On vérifie chaque clé distincte via la RPC.
  const { data: budgetLineKeys, error: keysErr } = await supabase
    .from('budget_lines')
    .select('repartition_key_id')
    .eq('budget_id', budgetId);
  if (keysErr) {
    return { data: null, error: new Error(`Vérification des clés de répartition : ${keysErr.message}`) };
  }
  const distinctKeyIds = [
    ...new Set(
      ((budgetLineKeys || []) as Array<{ repartition_key_id: string | null }>)
        .map(l => l.repartition_key_id)
        .filter((id): id is string => !!id)
    ),
  ];
  for (const keyId of distinctKeyIds) {
    const { data: isComplete, error: completeErr } = await supabase.rpc('repartition_key_is_complete', {
      p_key_id: keyId,
    });
    if (completeErr) {
      return { data: null, error: new Error(`Vérification clé de répartition : ${completeErr.message}`) };
    }
    if (isComplete !== true) {
      return {
        data: null,
        error: new Error('Clé de répartition incomplète — complétez la répartition avant d\'émettre les appels.'),
      };
    }
  }

  // Idempotence PAR ÉCHÉANCE : on lit les appels non annulés déjà postés pour ce budget avec
  // leur trimestre, puis on ne reposte que les échéances manquantes (re-clic après échec partiel).
  const { data: existing, error: existErr } = await supabase
    .from('call_for_funds')
    .select('trimester')
    .eq('budget_id', budgetId)
    .neq('status', 'cancelled');
  if (existErr) {
    return { data: null, error: new Error(`Vérification idempotence appels : ${existErr.message}`) };
  }
  const postedTrimesters = new Set<number>(
    ((existing || []) as Array<{ trimester: number | null }>)
      .map(c => c.trimester)
      .filter((t): t is number => t !== null && t !== undefined)
  );

  let posted = 0;
  for (const inst of plan.installments) {
    // L'index 1-based de l'échéance correspond au trimester du call_for_funds.
    if (postedTrimesters.has(inst.index)) {
      continue;
    }
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
    posted += 1;
  }

  // Marquer le budget validé (même si tout était déjà posté : re-clic après échec partiel)
  const { error: budErr } = await supabase
    .from('budgets')
    .update({ status: 'validated', validated_at: new Date().toISOString() })
    .eq('id', budgetId);
  if (budErr) return { data: null, error: new Error(budErr.message) };

  return { data: { posted }, error: null };
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

// ═══ REPRISE SOLDES — MOTEUR set/get_opening_balance (canonique) ═══

export type OpeningBalanceNature = 'current' | 'works' | 'advance' | 'loan' | 'alur';

export interface OpeningBalanceLine {
  accountCode: string;            // '450' (+nature), '450-1', '103', '105', '401', '12', '478', '512000', '601', '701'…
  lotId?: string | null;          // requis pour 450-x et 103 ; absent pour les comptes globaux
  amount: number;                 // signé : > 0 = au débit (l'actif/tiers doit) ; < 0 = au crédit
  nature?: OpeningBalanceNature;  // requis si accountCode === '450' (nu)
}

export interface OpeningBalanceResult {
  success: boolean;
  residual: number;
  linesCount: number;
  asOfDate: string;
}

export async function setOnboardingOpeningBalance(
  coproId: string,
  periodId: string,
  asOfDate: string,            // YYYY-MM-DD, garanti ∈ [start,end] par ensureAccountingPeriod
  lines: OpeningBalanceLine[]
): Promise<{ data: OpeningBalanceResult | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const payload = lines
    .filter(l => l.amount !== 0)
    .map(l => ({
      account_code: l.accountCode,
      lot_id: l.lotId ?? null,
      amount: l.amount,
      nature: l.nature ?? null,
    }));

  const { data, error } = await supabase.rpc('set_opening_balance', {
    p_copro_id: coproId,
    p_period_id: periodId,
    p_as_of_date: asOfDate,
    p_lines: payload,
  });
  if (error) return { data: null, error: new Error(error.message) };

  const res = data as { success?: boolean; error?: string; residual?: number; lines_count?: number; as_of_date?: string };
  if (!res?.success) {
    return { data: null, error: new Error(res?.error || 'Échec de la reprise des soldes') };
  }
  return {
    data: {
      success: true,
      residual: Number(res.residual ?? 0),
      linesCount: Number(res.lines_count ?? 0),
      asOfDate: res.as_of_date ?? asOfDate,
    },
    error: null,
  };
}

export interface OpeningBalanceSnapshot {
  lines: OpeningBalanceLine[];
  residual: number;
  asOfDate: string | null;
}

export async function getOnboardingOpeningBalance(
  coproId: string,
  periodId: string
): Promise<{ data: OpeningBalanceSnapshot | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('get_opening_balance', {
    p_copro_id: coproId,
    p_period_id: periodId,
  });
  if (error) return { data: null, error: new Error(error.message) };

  const res = data as {
    lines?: Array<{ account_code: string; lot_id: string | null; amount: number; nature: string | null }>;
    residual?: number;
    as_of_date?: string | null;
  };
  return {
    data: {
      lines: (res?.lines ?? []).map(l => ({
        accountCode: l.account_code,
        lotId: l.lot_id,
        amount: Number(l.amount),
        nature: (l.nature as OpeningBalanceNature | null) ?? undefined,
      })),
      residual: Number(res?.residual ?? 0),
      asOfDate: res?.as_of_date ?? null,
    },
    error: null,
  };
}

export interface ComptePlanItem {
  id: string;
  code: string;
  name: string;
}

/** Comptes imputables des classes 1 à 5 (hors 450-x et 471/472, déjà couverts par l'Essentiel/résidu).
 *  Sert à la section repliable « Autres comptes » de l'écran de reprise. */
export async function listComptesPlan(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('copro_id', coproId)
    .eq('is_postable', true)
    .or('code.like.1%,code.like.2%,code.like.3%,code.like.4%,code.like.5%')
    .not('code', 'like', '450%')
    .not('code', 'in', '("471","472")')
    .order('code', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as ComptePlanItem[], error: null };
}

// ═══ VÉRIFICATION FINALE ═══

export interface OnboardingAuditIssue {
  entity_type: string;
  issue_type: string;
  description: string;
  difference: number | null;
}

export interface OnboardingAuditResult {
  /** clean = aucune faute de la liste blanche (spec §6). N'inclut PAS la preuve positive (cf. Step8). */
  clean: boolean;
  /** Anomalies bloquantes (liste blanche) — empêchent la finalisation. */
  blockingIssues: OnboardingAuditIssue[];
  /** Anomalies non bloquantes (LOT_GL_MISMATCH, CALL_VS_BUDGET_MISMATCH…) — affichées en avertissement. */
  warningIssues: OnboardingAuditIssue[];
  /** Solde net des comptes d'attente 471/472. ≠ 0 = avertissement persistant « reprise à terminer ». */
  waitingBalance: number;
}

export async function auditOnboardingBooks(
  coproId: string
): Promise<{ data: OnboardingAuditResult | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // 1) Écarts d'intégrité du grand livre
  const { data: issues, error: issuesErr } = await supabase
    .rpc('audit_finance_integrity', { p_copro_id: coproId });
  if (issuesErr) return { data: null, error: new Error(issuesErr.message) };

  // 2) Solde net des comptes d'attente 471/472 (avertissement, jamais bloquant — spec §5/§6)
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
  const { blocking, warnings } = splitAuditIssues(issueList);

  // clean = AUCUNE faute de la liste blanche. Le 471/472 et les mismatches NE comptent PAS.
  const clean = !hasBlockingIssue(issueList);

  return {
    data: { clean, blockingIssues: blocking, warningIssues: warnings, waitingBalance },
    error: null,
  };
}

/**
 * Preuve positive (spec §6 / I7) : compte les appels RÉELLEMENT émis (status ∉ draft/cancelled)
 * pour le dernier budget 'validated' de la copro, lu EN BASE (pas la mémoire React).
 * Retour :
 *  - hasValidatedBudget : un budget 'validated' existe-t-il ?
 *  - issuedCallCount    : nombre d'appels émis rattachés à ce budget.
 * La DÉCISION de bloquer (plan vide vs plan non vide) est prise par l'appelant (Step8).
 */
export async function getValidatedBudgetCallProof(
  coproId: string
): Promise<{ data: { hasValidatedBudget: boolean; budgetId: string | null; issuedCallCount: number } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data: budget, error: budgetErr } = await supabase
    .from('budgets')
    .select('id')
    .eq('copro_id', coproId)
    .eq('budget_type', 'current')
    .eq('status', 'validated')
    .order('validated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (budgetErr) return { data: null, error: new Error(budgetErr.message) };

  if (!budget) {
    return { data: { hasValidatedBudget: false, budgetId: null, issuedCallCount: 0 }, error: null };
  }

  const budgetId = (budget as { id: string }).id;
  const { count, error: callErr } = await supabase
    .from('call_for_funds')
    .select('id', { count: 'exact', head: true })
    .eq('budget_id', budgetId)
    .not('status', 'in', '(draft,cancelled)');
  if (callErr) return { data: null, error: new Error(callErr.message) };

  return {
    data: { hasValidatedBudget: true, budgetId, issuedCallCount: count ?? 0 },
    error: null,
  };
}

/**
 * Garde de pré-validation AG (spec §7) : appelée AVANT activate_ag_decisions.
 * Détecte si l'AG `agId` comporte une action APPROVE_ACCOUNTS en attente (arrêté des
 * comptes) et calcule le solde net 471/472 de la copro. La décision finale de bloquer
 * est prise par shouldBlockAccountClosure (règle pure).
 */
export async function checkAgWaitingBalanceGuard(
  agId: string,
  coproId: string
): Promise<{ data: { hasAccountClosure: boolean; waitingBalance: number } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // 1) L'AG comporte-t-elle un arrêté des comptes en attente d'activation ?
  const { count: closureCount, error: actErr } = await supabase
    .from('ag_pending_actions')
    .select('id', { count: 'exact', head: true })
    .eq('ag_id', agId)
    .eq('action_type', 'APPROVE_ACCOUNTS')
    .eq('status', 'pending');
  if (actErr) return { data: null, error: new Error(actErr.message) };

  // 2) Solde net 471/472 de la copro
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

  return {
    data: { hasAccountClosure: (closureCount ?? 0) > 0, waitingBalance },
    error: null,
  };
}

/**
 * Résout le copro_id propriétaire d'une AG (depuis ag_meetings). Utilisé en repli fail-closed
 * (FIX 4) quand le contexte React (currentCoproId) est vide : la garde 471/472 ne doit JAMAIS
 * être contournée en silence faute de coproId.
 */
export async function resolveCoproIdForAg(
  agId: string
): Promise<{ data: string | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('ag_meetings')
    .select('copro_id')
    .eq('id', agId)
    .maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as { copro_id: string | null } | null)?.copro_id ?? null, error: null };
}

/**
 * L'AG comporte-t-elle un arrêté des comptes (APPROVE_ACCOUNTS) en attente d'activation ?
 * Détection par agId SEUL (sans coproId) : permet de bloquer fail-closed (FIX 4) même quand
 * le coproId reste indéterminable.
 */
export async function agHasPendingAccountClosure(
  agId: string
): Promise<{ data: boolean | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { count, error } = await supabase
    .from('ag_pending_actions')
    .select('id', { count: 'exact', head: true })
    .eq('ag_id', agId)
    .eq('action_type', 'APPROVE_ACCOUNTS')
    .eq('status', 'pending');
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (count ?? 0) > 0, error: null };
}
