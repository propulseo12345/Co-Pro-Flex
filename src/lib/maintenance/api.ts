/**
 * API Supabase pour le module Maintenance
 * Pattern identique à src/lib/onboarding/api.ts
 *
 * Fonctions CRUD pour : providers, contracts, logbook_entries, service_orders
 */

import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDERS (PRESTATAIRES)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProviderCreate {
  copro_id: string;
  name: string;
  category?: 'syndic' | 'copropriete' | 'coproflex';
  domains?: string[];
  contact_name?: string;
  email?: string;
  phone?: string;
  phone_emergency?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  siret?: string;
  description?: string;
  internal_notes?: string;
}

export async function createProvider(payload: ProviderCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('providers')
    .insert({
      copro_id: payload.copro_id,
      name: payload.name.trim(),
      category: payload.category || 'copropriete',
      domains: payload.domains || [],
      contact_name: payload.contact_name?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      phone_emergency: payload.phone_emergency?.trim() || null,
      address: payload.address?.trim() || null,
      postal_code: payload.postal_code?.trim() || null,
      city: payload.city?.trim() || null,
      siret: payload.siret?.trim() || null,
      description: payload.description?.trim() || null,
      internal_notes: payload.internal_notes?.trim() || null,
    })
    .select('id, name, category')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; name: string; category: string }, error: null };
}

export async function listProviders(coproId: string, category?: string) {
  const supabase = createUntypedClient();
  let query = supabase
    .from('v_providers_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('name');

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}

export async function getProvider(providerId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_providers_overview')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>, error: null };
}

export async function updateProvider(providerId: string, updates: Partial<ProviderCreate>) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('providers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', providerId)
    .select('id, name')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; name: string }, error: null };
}

export async function deleteProvider(providerId: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', providerId);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACTS (CONTRATS)
// ═══════════════════════════════════════════════════════════════════════════

export interface ContractCreate {
  copro_id: string;
  provider_id: string;
  title: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  contract_number?: string;
  description?: string;
  annual_amount?: number;
  tacit_renewal?: boolean;
  notice_months?: number;
  is_regulatory?: boolean;
  status?: string;
  notes?: string;
}

export async function createContract(payload: ContractCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      copro_id: payload.copro_id,
      provider_id: payload.provider_id,
      title: payload.title.trim(),
      contract_type: payload.contract_type,
      start_date: payload.start_date,
      end_date: payload.end_date,
      contract_number: payload.contract_number?.trim() || null,
      description: payload.description?.trim() || null,
      annual_amount: payload.annual_amount ?? null,
      tacit_renewal: payload.tacit_renewal ?? false,
      notice_months: payload.notice_months ?? null,
      is_regulatory: payload.is_regulatory ?? false,
      status: payload.status || 'active',
      notes: payload.notes?.trim() || null,
    })
    .select('id, title, contract_type')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; title: string; contract_type: string }, error: null };
}

export async function listContracts(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_contracts_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('end_date', { ascending: true, nullsFirst: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}

export async function getContract(contractId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_contracts_overview')
    .select('*')
    .eq('id', contractId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>, error: null };
}

export async function updateContract(contractId: string, updates: Partial<ContractCreate>) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('contracts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select('id, title')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; title: string }, error: null };
}

export async function deleteContract(contractId: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGBOOK_ENTRIES (CARNET D'ENTRETIEN)
// ═══════════════════════════════════════════════════════════════════════════

export interface LogbookEntryCreate {
  copro_id: string;
  entry_type: string;
  category?: string;
  title: string;
  description?: string;
  provider_id?: string;
  provider_name_snapshot?: string;
  contract_id?: string;
  happened_at: string;
  next_due_at?: string;
  cost?: number;
  status?: string;
  domain?: string;
  equipment_concerned?: string;
  comments?: string;
}

export async function createLogbookEntry(payload: LogbookEntryCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('logbook_entries')
    .insert({
      copro_id: payload.copro_id,
      entry_type: payload.entry_type,
      category: payload.category || 'courante',
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      provider_id: payload.provider_id || null,
      provider_name_snapshot: payload.provider_name_snapshot?.trim() || null,
      contract_id: payload.contract_id || null,
      happened_at: payload.happened_at,
      next_due_at: payload.next_due_at || null,
      cost: payload.cost ?? null,
      status: payload.status || 'planifiee',
      domain: payload.domain || null,
      equipment_concerned: payload.equipment_concerned?.trim() || null,
      comments: payload.comments?.trim() || null,
    })
    .select('id, title')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; title: string }, error: null };
}

export async function listLogbookEntries(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_logbook_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('happened_at', { ascending: false, nullsFirst: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}

export async function updateLogbookEntry(entryId: string, updates: Partial<LogbookEntryCreate>) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('logbook_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', entryId)
    .select('id, title')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; title: string }, error: null };
}

export async function deleteLogbookEntry(entryId: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('logbook_entries')
    .delete()
    .eq('id', entryId);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE_ORDERS (ORDRES DE SERVICE)
// ═══════════════════════════════════════════════════════════════════════════

export interface ServiceOrderCreate {
  copro_id: string;
  provider_id: string;
  subject: string;
  description?: string;
  urgency?: string;
  order_type?: string;
  origin?: string;
  contract_id?: string;
  estimated_amount?: number;
  is_art18_emergency?: boolean;
  planned_intervention_date?: string;
}

export async function createServiceOrder(payload: ServiceOrderCreate) {
  const supabase = createUntypedClient();

  // Générer le numéro d'OS via RPC
  const { data: orderNumber, error: numError } = await supabase.rpc('generate_service_order_number', {
    p_copro_id: payload.copro_id,
  });

  if (numError) return { data: null, error: new Error(numError.message || 'Erreur génération numéro OS') };

  const { data, error } = await supabase
    .from('service_orders')
    .insert({
      copro_id: payload.copro_id,
      order_number: orderNumber as string,
      provider_id: payload.provider_id,
      subject: payload.subject.trim(),
      description: payload.description?.trim() || null,
      urgency: payload.urgency || 'normal',
      order_type: payload.order_type || 'classique',
      origin: payload.origin || 'syndic',
      status: 'draft',
      contract_id: payload.contract_id || null,
      estimated_amount: payload.estimated_amount ?? null,
      is_art18_emergency: payload.is_art18_emergency ?? false,
      planned_intervention_date: payload.planned_intervention_date || null,
    })
    .select('id, order_number, subject')
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; order_number: string; subject: string }, error: null };
}

export async function listServiceOrders(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_service_orders_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}

export async function getServiceOrder(orderId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_service_orders_overview')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>, error: null };
}

export async function getServiceOrderEvents(orderId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('service_order_events')
    .select('*')
    .eq('service_order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIERS (FOURNISSEURS — alias pour le directory page)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Liste les fournisseurs pour l'annuaire (page directory)
 * Retourne tous les prestataires actifs avec leurs domaines
 */
export async function listSuppliers(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_providers_overview')
    .select('id, name, category, domains, email, phone, address, city, postal_code, rating_avg, interventions_count, is_active')
    .eq('copro_id', coproId)
    .eq('is_active', true)
    .order('name');

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Record<string, unknown>[], error: null };
}
