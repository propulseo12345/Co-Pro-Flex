import { createClient } from '@/lib/supabase/client';

// Vues/jointures hors types générés (ledger_entries -> accounts) : client non typé,
// même pattern que le reste de src/lib/onboarding/api.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export interface RepriseAlert {
  coproId: string;
  residual: number; // net 471/472 (signé)
}

/**
 * Résidu 471/472 d'une REPRISE D'ONBOARDING (débit - crédit), pas le suspens opérationnel.
 *
 * FIX 2a — on ne somme QUE les écritures dont la transaction porte
 * source_type='opening_onboarding'. Sommer tout le 471/472 de la copro produisait un faux
 * positif « reprise à terminer » dès qu'un virement non identifié (suspens opérationnel)
 * existait sur une copro déjà en prod (le portefeuille appelle cette fonction pour TOUTES
 * les copros). S'il n'existe aucune tx opening_onboarding -> résidu 0 (pas d'alerte).
 *
 * |net| >= 0,01 => reprise d'onboarding incomplète. Source de vérité = grand livre.
 */
export async function getRepriseResidual(coproId: string): Promise<{ data: number | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id), ledger_transactions!inner(source_type, copro_id)')
    .eq('accounts.copro_id', coproId)
    .eq('ledger_transactions.copro_id', coproId)
    .eq('ledger_transactions.source_type', 'opening_onboarding')
    .in('accounts.code', ['471', '472']);
  if (error) return { data: null, error: new Error(error.message) };

  // Aucune écriture opening_onboarding -> pas de reprise -> résidu 0 (jamais d'alerte).
  let net = 0;
  for (const row of (data ?? []) as Array<{ amount: number; direction: string }>) {
    net += row.direction === 'debit' ? Number(row.amount) : -Number(row.amount);
  }
  return { data: net, error: null };
}
