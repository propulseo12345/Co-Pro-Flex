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
 * Net 471/472 d'une copro (débit - crédit). |net| >= 0,01 => reprise incomplète.
 * Source de vérité = grand livre (pas de table brouillon).
 */
export async function getRepriseResidual(coproId: string): Promise<{ data: number | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id)')
    .eq('accounts.copro_id', coproId)
    .in('accounts.code', ['471', '472']);
  if (error) return { data: null, error: new Error(error.message) };

  let net = 0;
  for (const row of (data ?? []) as Array<{ amount: number; direction: string }>) {
    net += row.direction === 'debit' ? Number(row.amount) : -Number(row.amount);
  }
  return { data: net, error: null };
}
