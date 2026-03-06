/**
 * Accounting Period Helper
 * Provides utilities for fetching and formatting accounting periods
 */

import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export interface AccountingPeriodInfo {
  id: string;
  start_date: string;
  end_date: string;
  label: string;
  year: number;
  status: 'open' | 'locked' | 'closed';
}

export interface GetAccountingPeriodResult {
  data: AccountingPeriodInfo | null;
  error: string | null;
}

/**
 * Format a date range into a human-readable label
 * @example "01/01/2025 - 31/12/2025" or "Exercice 2025"
 */
function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if it's a full calendar year (Jan 1 to Dec 31)
  const isFullYear =
    start.getMonth() === 0 && start.getDate() === 1 &&
    end.getMonth() === 11 && end.getDate() === 31 &&
    start.getFullYear() === end.getFullYear();

  if (isFullYear) {
    return `Exercice ${start.getFullYear()}`;
  }

  // Format as date range
  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Extract the primary year from a period (uses end date year)
 */
function extractYear(endDate: string): number {
  return new Date(endDate).getFullYear();
}

/**
 * Get the active (open) accounting period for a copropriété
 * Optionally filter by year
 *
 * @param coproId - The copropriété ID
 * @param year - Optional: filter by year (uses end_date year)
 * @returns The active accounting period with formatted label
 */
export async function getActiveAccountingPeriod(
  coproId: string,
  year?: number
): Promise<GetAccountingPeriodResult> {
  const supabase = createUntypedClient();

  try {
    let query = supabase
      .from('accounting_periods')
      .select('id, copro_id, name, start_date, end_date, status')
      .eq('copro_id', coproId)
      .eq('status', 'open');

    // If year is specified, filter by end_date year
    if (year) {
      query = query
        .gte('end_date', `${year}-01-01`)
        .lte('end_date', `${year}-12-31`);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      // PGRST116 = No rows returned
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const periodInfo: AccountingPeriodInfo = {
      id: data.id,
      start_date: data.start_date,
      end_date: data.end_date,
      label: formatPeriodLabel(data.start_date, data.end_date),
      year: extractYear(data.end_date),
      status: data.status,
    };

    return { data: periodInfo, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: message };
  }
}

/**
 * Get the accounting period for a specific year (any status)
 * Useful when you need to find a period even if it's closed
 *
 * @param coproId - The copropriété ID
 * @param year - The year to search for
 * @returns The accounting period for the specified year
 */
export async function getAccountingPeriodByYear(
  coproId: string,
  year: number
): Promise<GetAccountingPeriodResult> {
  const supabase = createUntypedClient();

  try {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('id, copro_id, name, start_date, end_date, status')
      .eq('copro_id', coproId)
      .gte('end_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const periodInfo: AccountingPeriodInfo = {
      id: data.id,
      start_date: data.start_date,
      end_date: data.end_date,
      label: formatPeriodLabel(data.start_date, data.end_date),
      year: extractYear(data.end_date),
      status: data.status,
    };

    return { data: periodInfo, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: message };
  }
}

export interface ClosedPeriodWithResult extends AccountingPeriodInfo {
  totalCredit: number;
  totalDebit: number;
  resultat: number;
}

/**
 * Get a closed accounting period for a copropriété by year, with financial result.
 * If no year is specified, returns the most recent closed period with actual entries.
 */
export async function getClosedPeriodForYear(
  coproId: string,
  year?: number
): Promise<{ data: ClosedPeriodWithResult | null; error: string | null }> {
  const supabase = createUntypedClient();

  try {
    let query = supabase
      .from('accounting_periods')
      .select('id, copro_id, name, start_date, end_date, status')
      .eq('copro_id', coproId)
      .eq('status', 'closed');

    if (year) {
      query = query
        .gte('end_date', `${year}-01-01`)
        .lte('end_date', `${year}-12-31`);
    } else {
      query = query.order('end_date', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Fetch financial totals for this period
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('direction, amount')
      .eq('period_id', data.id);

    let totalCredit = 0;
    let totalDebit = 0;

    if (!entriesError && entries) {
      for (const entry of entries) {
        if (entry.direction === 'credit') {
          totalCredit += Number(entry.amount);
        } else {
          totalDebit += Number(entry.amount);
        }
      }
    }

    return {
      data: {
        id: data.id,
        start_date: data.start_date,
        end_date: data.end_date,
        label: formatPeriodLabel(data.start_date, data.end_date),
        year: extractYear(data.end_date),
        status: data.status,
        totalCredit,
        totalDebit,
        resultat: totalCredit - totalDebit,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: message };
  }
}

/**
 * Get all accounting periods for a copropriété
 *
 * @param coproId - The copropriété ID
 * @returns List of all accounting periods with formatted labels
 */
export async function listAccountingPeriods(
  coproId: string
): Promise<{ data: AccountingPeriodInfo[] | null; error: string | null }> {
  const supabase = createUntypedClient();

  try {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('id, copro_id, name, start_date, end_date, status')
      .eq('copro_id', coproId)
      .order('start_date', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    const periods: AccountingPeriodInfo[] = data.map((period: {
      id: string;
      start_date: string;
      end_date: string;
      status: 'open' | 'locked' | 'closed';
    }) => ({
      id: period.id,
      start_date: period.start_date,
      end_date: period.end_date,
      label: formatPeriodLabel(period.start_date, period.end_date),
      year: extractYear(period.end_date),
      status: period.status,
    }));

    return { data: periods, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: message };
  }
}
