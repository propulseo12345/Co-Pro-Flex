'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import type {
  Provider,
  ProviderInsert,
  ProviderOverview,
  Contract,
  ContractInsert,
  ContractOverview,
  ContractAlert,
  LogbookEntry,
  LogbookEntryInsert,
  LogbookOverview,
  LogbookAlert,
  ServiceOrder,
  ServiceOrderInsert,
  ServiceOrderOverview,
  ServiceOrderEvent,
  MaintenanceStats,
  ProviderCategory,
  ServiceOrderStatus,
} from '@/types/domain';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// ÉCRITURES — traduction du contrat legacy du front vers le schéma cible
// (providers -> tiers, slugs work_domain -> domain_ids/domain_id,
//  title/contract_number/provider_id/description -> label/reference/tiers_id/observations)
// ============================================================================

/** Écriture prestataire : colonnes `tiers` + domaines en slugs work_domain. */
export type ProviderWriteInput = Omit<ProviderInsert, 'domain_ids' | 'category'> & {
  category?: ProviderCategory | 'coproflex';
  domains?: string[];
};

/** Écriture contrat : colonnes cibles OU alias legacy encore utilisés par le front. */
export type ContractWriteInput = Partial<Contract> & {
  title?: string;            // -> label
  contract_number?: string;  // -> reference
  contract_type?: string;    // slug work_domain -> domain_id
  provider_id?: string;      // -> tiers_id
  description?: string;      // -> observations
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveDomainIds(supabase: any, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from('work_domain')
    .select('id, slug')
    .in('slug', slugs);
  if (error) throw error;
  const found = (data || []) as { id: string; slug: string }[];
  const missing = slugs.filter((s) => !found.some((d) => d.slug === s));
  if (missing.length > 0) {
    // Pas de null silencieux : un slug UI non seedé doit échouer FORT.
    throw new Error(`Domaine(s) d'intervention inconnu(s) : ${missing.join(', ')} (référentiel work_domain)`);
  }
  return found.map((d) => d.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function translateProviderWrite(supabase: any, input: Partial<ProviderWriteInput>) {
  const { domains, category, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };
  if (category !== undefined) out.category = category === 'coproflex' ? 'externe' : category;
  // domains: [] est une désélection EXPLICITE -> domain_ids = [] ;
  // domains absent (undefined) -> on ne touche pas à la colonne.
  if (domains !== undefined) out.domain_ids = await resolveDomainIds(supabase, domains);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function translateContractWrite(supabase: any, input: ContractWriteInput) {
  const { title, contract_number, contract_type, provider_id, description, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };
  if (title !== undefined) out.label = title;
  if (contract_number !== undefined) out.reference = contract_number;
  if (provider_id !== undefined) out.tiers_id = provider_id;
  if (description !== undefined) out.observations = description;
  if (contract_type !== undefined) {
    if (!contract_type) {
      throw new Error('Type de contrat manquant (domain_id est obligatoire)');
    }
    const ids = await resolveDomainIds(supabase, [contract_type]);
    out.domain_id = ids[0];
  }
  return out;
}

// ============================================================================
// TYPES
// ============================================================================

interface UseMaintenanceDataOptions {
  autoFetch?: boolean;
}

interface ProviderFilters {
  category?: ProviderCategory | 'coproflex' | 'all';
  domain?: string | 'all';
  search?: string;
  isActive?: boolean;
}

interface ContractFilters {
  status?: Contract['status'] | 'all';
  providerId?: string;
  isRegulatory?: boolean;
  search?: string;
}

interface ServiceOrderFilters {
  status?: ServiceOrderStatus | 'all';
  providerId?: string;
  urgency?: ServiceOrder['urgency'] | 'all';
  orderType?: ServiceOrder['order_type'] | 'all';
  search?: string;
}

interface LogbookFilters {
  entryType?: LogbookEntry['entry_type'] | 'all';
  status?: LogbookEntry['status'] | 'all';
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// HOOK: useProviders
// ============================================================================

export function useProviders(options: UseMaintenanceDataOptions = {}) {
  const { autoFetch = true } = options;
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [providers, setProviders] = useState<ProviderOverview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async (filters?: ProviderFilters) => {
    if (!currentCoproId) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('v_providers_overview')
        .select('*')
        .eq('copro_id', currentCoproId);

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.domain && filters.domain !== 'all') {
        query = query.contains('domains', [filters.domain]);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order('name');

      if (fetchError) throw fetchError;

      setProviders((data || []) as ProviderOverview[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des prestataires');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  const fetchProvidersRef = useRef(fetchProviders);
  fetchProvidersRef.current = fetchProviders;

  const createProvider = useCallback(async (provider: ProviderWriteInput) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const translated = await translateProviderWrite(supabase, provider);
    const { data, error: insertError } = await supabase
      .from('tiers')
      .insert({ ...translated, copro_id: currentCoproId, is_provider: true })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchProvidersRef.current();
    return data as Provider;
  }, [currentCoproId, supabase]);

  const updateProvider = useCallback(async (id: string, updates: Partial<ProviderWriteInput>) => {
    const translated = await translateProviderWrite(supabase, updates);
    const { data, error: updateError } = await supabase
      .from('tiers')
      .update({ ...translated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchProvidersRef.current();
    return data as Provider;
  }, [supabase]);

  const deleteProvider = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('tiers')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchProvidersRef.current();
  }, [supabase]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchProvidersRef.current();
    }
  }, [autoFetch, currentCoproId]);

  // Stats par catégorie
  const stats = useMemo(() => ({
    total: providers.length,
    syndic: providers.filter(p => p.category === 'syndic').length,
    copropriete: providers.filter(p => p.category === 'copropriete').length,
    coproflex: providers.filter(p => p.category === 'coproflex').length,
    active: providers.filter(p => p.is_active).length,
  }), [providers]);

  return {
    providers,
    stats,
    isLoading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
  };
}

// ============================================================================
// HOOK: useContracts
// ============================================================================

export function useContracts(options: UseMaintenanceDataOptions = {}) {
  const { autoFetch = true } = options;
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [contracts, setContracts] = useState<ContractOverview[]>([]);
  const [alerts, setAlerts] = useState<ContractAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async (filters?: ContractFilters) => {
    if (!currentCoproId) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('v_contracts_overview')
        .select('*')
        .eq('copro_id', currentCoproId);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }

      if (filters?.isRegulatory !== undefined) {
        query = query.eq('is_regulatory', filters.isRegulatory);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,contract_number.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order('end_date', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      setContracts((data || []) as ContractOverview[]);

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('v_contracts_alerts')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('days_remaining');

      setAlerts((alertsData || []) as ContractAlert[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des contrats');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  const fetchContractsRef = useRef(fetchContracts);
  fetchContractsRef.current = fetchContracts;

  const createContract = useCallback(async (contract: ContractWriteInput) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const translated = await translateContractWrite(supabase, contract);
    const { data, error: insertError } = await supabase
      .from('contracts')
      .insert({ ...translated, copro_id: currentCoproId })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchContractsRef.current();
    return data as Contract;
  }, [currentCoproId, supabase]);

  const updateContract = useCallback(async (id: string, updates: ContractWriteInput) => {
    const translated = await translateContractWrite(supabase, updates);
    const { data, error: updateError } = await supabase
      .from('contracts')
      .update({ ...translated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchContractsRef.current();
    return data as Contract;
  }, [supabase]);

  const terminateContract = useCallback(async (id: string, reason: string) => {
    const { data, error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchContractsRef.current();
    return data as Contract;
  }, [supabase]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchContractsRef.current();
    }
  }, [autoFetch, currentCoproId]);

  const stats = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    toRenew: contracts.filter(c => c.status === 'to_renew').length,
    expired: contracts.filter(c => c.status === 'expired').length,
    regulatory: contracts.filter(c => c.is_regulatory).length,
    alertsCount: alerts.length,
  }), [contracts, alerts]);

  return {
    contracts,
    alerts,
    stats,
    isLoading,
    error,
    fetchContracts,
    createContract,
    updateContract,
    terminateContract,
  };
}

// ============================================================================
// HOOK: useServiceOrders
// ============================================================================

export function useServiceOrders(options: UseMaintenanceDataOptions = {}) {
  const { autoFetch = true } = options;
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [orders, setOrders] = useState<ServiceOrderOverview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (filters?: ServiceOrderFilters) => {
    if (!currentCoproId) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('v_service_orders_overview')
        .select('*')
        .eq('copro_id', currentCoproId);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }

      if (filters?.urgency && filters.urgency !== 'all') {
        query = query.eq('urgency', filters.urgency);
      }

      if (filters?.orderType && filters.orderType !== 'all') {
        query = query.eq('order_type', filters.orderType);
      }

      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setOrders((data || []) as ServiceOrderOverview[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des ordres de service');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;

  const createOrder = useCallback(async (order: ServiceOrderInsert) => {
    if (!currentCoproId) throw new Error('No copro selected');

    // Générer le numéro d'OS via RPC
    const { data: orderNumber, error: numError } = await supabase.rpc('generate_service_order_number', {
      p_copro_id: currentCoproId,
    });

    if (numError) throw new Error(numError.message || 'Erreur génération numéro OS');

    // Insert direct dans la table
    const { data, error: insertError } = await supabase
      .from('service_orders')
      .insert({
        copro_id: currentCoproId,
        order_number: orderNumber as string,
        tiers_id: order.tiers_id,
        title: order.title,
        description: order.description,
        urgency: order.urgency || 'normal',
        order_type: order.order_type || 'classique',
        origin: order.origin || 'syndic',
        status: order.status || 'draft',
        contract_id: order.contract_id || null,
        building_id: order.building_id || null,
        lot_id: order.lot_id || null,
        estimated_amount: order.estimated_amount || null,
        is_art18_emergency: order.is_art18_emergency || false,
        scheduled_at: order.scheduled_at || null,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message || 'Erreur lors de la création');

    await fetchOrdersRef.current();
    return data as ServiceOrder;
  }, [currentCoproId, supabase]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: ServiceOrderStatus,
    options?: {
      comment?: string;
      refusalReason?: string;
      quotedAmount?: number;
      actualAmount?: number;
      invoiceId?: string;
    }
  ) => {
    const { data, error: rpcError } = await supabase.rpc('update_service_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_comment: options?.comment || null,
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Erreur lors de la mise à jour du statut');
    }

    if (options?.quotedAmount || options?.actualAmount) {
      const updates: Record<string, unknown> = {};
      if (options.quotedAmount) updates.quoted_amount = options.quotedAmount;
      if (options.actualAmount) updates.actual_amount = options.actualAmount;
      if (options.refusalReason) updates.refusal_reason = options.refusalReason;

      await supabase
        .from('service_orders')
        .update(updates)
        .eq('id', orderId);

      // FK inversée depuis la re-baseline : le lien facture->OS vit sur
      // supplier_invoices.service_order_id (plus de colonne côté OS).
      if (options.invoiceId) {
        await supabase
          .from('supplier_invoices')
          .update({ service_order_id: orderId })
          .eq('id', options.invoiceId);
      }
    }

    await fetchOrdersRef.current();
    return data as ServiceOrder;
  }, [supabase]);

  const sendOrderEmail = useCallback(async (
    orderId: string,
    templateType: 'classique' | 'contractuel',
    customMessage?: string
  ) => {
    await supabase.rpc('update_service_order_status', {
      p_order_id: orderId,
      p_new_status: 'sent' as ServiceOrderStatus,
      p_comment: customMessage || `Email ${templateType} envoyé`,
    });

    await fetchOrdersRef.current();
    return { success: true };
  }, [supabase]);

  const linkInvoice = useCallback(async (orderId: string, invoiceId: string, actualAmount: number) => {
    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        actual_amount: actualAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw new Error(updateError.message);

    // FK inversée : on rattache la facture à l'OS côté supplier_invoices.
    const { error: linkError } = await supabase
      .from('supplier_invoices')
      .update({ service_order_id: orderId })
      .eq('id', invoiceId);

    if (linkError) throw new Error(linkError.message);

    await fetchOrdersRef.current();
    return { success: true };
  }, [supabase]);

  const completeAndLog = useCallback(async (orderId: string) => {
    await supabase.rpc('update_service_order_status', {
      p_order_id: orderId,
      p_new_status: 'closed' as ServiceOrderStatus,
      p_comment: 'Clôture et archivage',
    });

    await fetchOrdersRef.current();
    return { success: true };
  }, [supabase]);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    const { error: rpcError } = await supabase.rpc('update_service_order_status', {
      p_order_id: orderId,
      p_new_status: 'cancelled' as ServiceOrderStatus,
      p_comment: reason,
    });

    if (rpcError) throw new Error(rpcError.message);

    await fetchOrdersRef.current();
    return { success: true };
  }, [supabase]);

  const deleteOrder = useCallback(async (orderId: string) => {
    const { error: rpcError } = await supabase.rpc('delete_service_order', {
      p_order_id: orderId,
    });

    if (rpcError) throw new Error(rpcError.message || 'Erreur lors de la suppression');

    await fetchOrdersRef.current();
    return { success: true };
  }, [supabase]);

  const getOrderEvents = useCallback(async (orderId: string): Promise<ServiceOrderEvent[]> => {
    const { data, error: fetchError } = await supabase
      .from('service_order_events')
      .select('*')
      .eq('service_order_id', orderId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    return (data || []) as ServiceOrderEvent[];
  }, [supabase]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchOrdersRef.current();
    }
  }, [autoFetch, currentCoproId]);

  const stats = useMemo(() => ({
    total: orders.length,
    drafts: orders.filter(o => o.status === 'draft').length,
    pending: orders.filter(o => o.status && ['sent', 'awaiting_provider', 'scheduled'].includes(o.status)).length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status && ['completed', 'closed'].includes(o.status)).length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    urgent: orders.filter(o => o.urgency === 'critical' || o.urgency === 'high').length,
  }), [orders]);

  return {
    orders,
    stats,
    isLoading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    sendOrderEmail,
    linkInvoice,
    completeAndLog,
    cancelOrder,
    deleteOrder,
    getOrderEvents,
  };
}

// ============================================================================
// HOOK: useLogbook
// ============================================================================

export function useLogbook(options: UseMaintenanceDataOptions = {}) {
  const { autoFetch = true } = options;
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [entries, setEntries] = useState<LogbookOverview[]>([]);
  const [alerts, setAlerts] = useState<LogbookAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (filters?: LogbookFilters) => {
    if (!currentCoproId) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('v_logbook_overview')
        .select('*')
        .eq('copro_id', currentCoproId);

      if (filters?.entryType && filters.entryType !== 'all') {
        query = query.eq('entry_type', filters.entryType);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }

      if (filters?.dateFrom) {
        query = query.gte('happened_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('happened_at', filters.dateTo);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order('happened_at', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      setEntries((data || []) as LogbookOverview[]);

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('v_logbook_alerts')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('days_overdue', { ascending: false });

      setAlerts((alertsData || []) as LogbookAlert[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du carnet d\'entretien');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  const fetchEntriesRef = useRef(fetchEntries);
  fetchEntriesRef.current = fetchEntries;

  // copro_id est INJECTÉ ici depuis le contexte → l'appelant ne le fournit pas
  // (évite le 'copro_id: '' + cast' trompeur des appelants).
  const createEntry = useCallback(async (entry: Omit<LogbookEntryInsert, 'copro_id'>) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const { data, error: insertError } = await supabase
      .from('logbook_entries')
      .insert({ ...entry, copro_id: currentCoproId })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchEntriesRef.current();
    return data as LogbookEntry;
  }, [currentCoproId, supabase]);

  const updateEntry = useCallback(async (id: string, updates: Partial<LogbookEntry>) => {
    const { data, error: updateError } = await supabase
      .from('logbook_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchEntriesRef.current();
    return data as LogbookEntry;
  }, [supabase]);

  const completeEntry = useCallback(async (id: string, cost?: number) => {
    return updateEntry(id, {
      status: 'terminee',
      completed_at: new Date().toISOString(),
      cost,
    });
  }, [updateEntry]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('logbook_entries')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchEntriesRef.current();
  }, [supabase]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchEntriesRef.current();
    }
  }, [autoFetch, currentCoproId]);

  const stats = useMemo(() => ({
    total: entries.length,
    planned: entries.filter(e => e.status === 'planifiee').length,
    inProgress: entries.filter(e => e.status === 'en_cours').length,
    completed: entries.filter(e => e.status === 'terminee').length,
    overdue: entries.filter(e => e.is_overdue).length, // Now available in view
    alertsCount: alerts.length,
  }), [entries, alerts]);

  return {
    entries,
    alerts,
    stats,
    isLoading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    completeEntry,
    deleteEntry,
  };
}

// ============================================================================
// HOOK: useMaintenanceStats
// ============================================================================

export function useMaintenanceStats() {
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!currentCoproId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('v_maintenance_stats')
        .select('*')
        .eq('copro_id', currentCoproId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      setStats(data as MaintenanceStats | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  const fetchStatsRef = useRef(fetchStats);
  fetchStatsRef.current = fetchStats;

  useEffect(() => {
    if (currentCoproId) {
      fetchStatsRef.current();
    }
  }, [currentCoproId]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
