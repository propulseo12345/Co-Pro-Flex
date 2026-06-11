// ============================================================================
// API: Contrat Syndic — Récupère le contrat de type 'syndic' avec infos provider
// ============================================================================

import { createUntypedClient } from './utils';

export interface SyndicContractData {
  id: string;
  title: string;
  contractNumber: string | null;
  startDate: string;
  endDate: string;
  annualAmount: number | null;
  tacitRenewal: boolean;
  noticeMonths: number | null;
  status: string;
  // Provider (syndic) info
  providerName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  siret: string | null;
}

/**
 * Récupère le contrat de type 'syndic' actif pour une copropriété,
 * avec les infos du provider (cabinet syndic).
 */
export async function fetchSyndicContract(coproId: string): Promise<SyndicContractData | null> {
  const supabase = createUntypedClient();

  // Vue de compat 0047 (title/contract_number/contract_type exposés depuis le
  // schéma cible) ; la table `providers` n'existe plus -> coordonnées via `tiers`.
  const { data, error } = await supabase
    .from('v_contracts_overview')
    .select('id, title, contract_number, start_date, end_date, annual_amount, tacit_renewal, notice_months, status, provider_id, provider_name')
    .eq('copro_id', coproId)
    .eq('contract_type', 'syndic')
    .in('status', ['active', 'draft'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[fetchSyndicContract]', error.message);
    return null;
  }

  if (!data) return null;

  let provider: Record<string, unknown> | null = null;
  if (data.provider_id) {
    const { data: tiersData, error: tiersError } = await supabase
      .from('tiers')
      .select('name, contact_name, email, phone, address, postal_code, city, siret')
      .eq('id', data.provider_id)
      .maybeSingle();
    if (tiersError) {
      console.error('[fetchSyndicContract] tiers:', tiersError.message);
    }
    provider = tiersData ?? null;
  }

  return {
    id: data.id,
    title: data.title,
    contractNumber: data.contract_number,
    startDate: data.start_date,
    endDate: data.end_date,
    annualAmount: data.annual_amount,
    tacitRenewal: data.tacit_renewal,
    noticeMonths: data.notice_months,
    status: data.status,
    providerName: (provider?.name as string) || (data.provider_name as string) || '',
    contactName: (provider?.contact_name as string) || null,
    email: (provider?.email as string) || null,
    phone: (provider?.phone as string) || null,
    address: (provider?.address as string) || null,
    postalCode: (provider?.postal_code as string) || null,
    city: (provider?.city as string) || null,
    siret: (provider?.siret as string) || null,
  };
}
