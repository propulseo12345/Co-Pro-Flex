'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@/types/supabase';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

interface UseMaintenanceDataOptions {
  autoFetch?: boolean;
}

interface ProviderFilters {
  category?: ProviderCategory | 'all';
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

  const createProvider = useCallback(async (provider: ProviderInsert) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const { data, error: insertError } = await supabase
      .from('providers')
      .insert({ ...provider, copro_id: currentCoproId })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchProviders();
    return data as Provider;
  }, [currentCoproId, supabase, fetchProviders]);

  const updateProvider = useCallback(async (id: string, updates: Partial<Provider>) => {
    const { data, error: updateError } = await supabase
      .from('providers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchProviders();
    return data as Provider;
  }, [supabase, fetchProviders]);

  const deleteProvider = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchProviders();
  }, [supabase, fetchProviders]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchProviders();
    }
  }, [autoFetch, currentCoproId, fetchProviders]);

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

  const createContract = useCallback(async (contract: ContractInsert) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const { data, error: insertError } = await supabase
      .from('contracts')
      .insert({ ...contract, copro_id: currentCoproId })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchContracts();
    return data as Contract;
  }, [currentCoproId, supabase, fetchContracts]);

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>) => {
    const { data, error: updateError } = await supabase
      .from('contracts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchContracts();
    return data as Contract;
  }, [supabase, fetchContracts]);

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

    await fetchContracts();
    return data as Contract;
  }, [supabase, fetchContracts]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchContracts();
    }
  }, [autoFetch, currentCoproId, fetchContracts]);

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

  const createOrder = useCallback(async (order: ServiceOrderInsert) => {
    if (!currentCoproId) throw new Error('No copro selected');

    // Call edge function for transactional creation
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        coproId: currentCoproId,
        providerId: order.provider_id,
        subject: order.subject,
        description: order.description,
        urgency: order.urgency,
        orderType: order.order_type,
        origin: order.origin,
        contractId: order.contract_id,
        buildingId: order.building_id,
        lotId: order.lot_id,
        estimatedAmount: order.estimated_amount,
        isArt18Emergency: order.is_art18_emergency,
        plannedInterventionDate: order.planned_intervention_date,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la création');
    }

    await fetchOrders();
    return result.order as ServiceOrder;
  }, [currentCoproId, supabase, fetchOrders]);

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
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        orderId,
        newStatus,
        ...options,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la mise à jour');
    }

    await fetchOrders();
    return result.order as ServiceOrder;
  }, [supabase, fetchOrders]);

  const sendOrderEmail = useCallback(async (
    orderId: string,
    templateType: 'classique' | 'contractuel',
    customMessage?: string
  ) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ orderId, templateType, customMessage }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de l\'envoi');
    }

    await fetchOrders();
    return result;
  }, [supabase, fetchOrders]);

  const linkInvoice = useCallback(async (orderId: string, invoiceId: string, actualAmount: number) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/link-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ orderId, invoiceId, actualAmount }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors du lien avec la facture');
    }

    await fetchOrders();
    return result;
  }, [supabase, fetchOrders]);

  const completeAndLog = useCallback(async (orderId: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/complete-and-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la clôture');
    }

    await fetchOrders();
    return result;
  }, [supabase, fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/maintenance-workflow/cancel-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ orderId, reason }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de l\'annulation');
    }

    await fetchOrders();
    return result;
  }, [supabase, fetchOrders]);

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
      fetchOrders();
    }
  }, [autoFetch, currentCoproId, fetchOrders]);

  const stats = useMemo(() => ({
    total: orders.length,
    drafts: orders.filter(o => o.status === 'draft').length,
    pending: orders.filter(o => o.status && ['to_send', 'sent', 'accepted', 'scheduled'].includes(o.status)).length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status && ['completed', 'invoiced', 'paid', 'closed'].includes(o.status)).length,
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

  const createEntry = useCallback(async (entry: LogbookEntryInsert) => {
    if (!currentCoproId) throw new Error('No copro selected');

    const { data, error: insertError } = await supabase
      .from('logbook_entries')
      .insert({ ...entry, copro_id: currentCoproId })
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchEntries();
    return data as LogbookEntry;
  }, [currentCoproId, supabase, fetchEntries]);

  const updateEntry = useCallback(async (id: string, updates: Partial<LogbookEntry>) => {
    const { data, error: updateError } = await supabase
      .from('logbook_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchEntries();
    return data as LogbookEntry;
  }, [supabase, fetchEntries]);

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

    await fetchEntries();
  }, [supabase, fetchEntries]);

  useEffect(() => {
    if (autoFetch && currentCoproId) {
      fetchEntries();
    }
  }, [autoFetch, currentCoproId, fetchEntries]);

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

  useEffect(() => {
    if (currentCoproId) {
      fetchStats();
    }
  }, [currentCoproId, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
