// ─── Derived type aliases for maintenance module ───────────────────────────────
// These provide convenient aliases used across the codebase.
// Kept separate from the auto-generated supabase.ts so they survive regeneration.

import type { Tables, TablesInsert, Enums } from './supabase';

// Table Row types
// Les prestataires vivent dans `tiers` (is_provider = true) depuis la re-baseline.
export type Provider = Tables<'tiers'>;
export type Contract = Tables<'contracts'>;
export type LogbookEntry = Tables<'logbook_entries'>;
export type ServiceOrder = Tables<'service_orders'>;
export type ServiceOrderEvent = Tables<'service_order_events'>;

// Table Insert types
export type ProviderInsert = TablesInsert<'tiers'>;
export type ContractInsert = TablesInsert<'contracts'>;
export type LogbookEntryInsert = TablesInsert<'logbook_entries'>;
export type ServiceOrderInsert = TablesInsert<'service_orders'>;

// View types (overview / alerts)
export type ProviderOverview = Tables<'v_providers_overview'>;
export type ContractOverview = Tables<'v_contracts_overview'>;
export type ContractAlert = Tables<'v_contracts_alerts'>;
export type LogbookOverview = Tables<'v_logbook_overview'>;
export type LogbookAlert = Tables<'v_logbook_alerts'>;
export type ServiceOrderOverview = Tables<'v_service_orders_overview'>;
export type MaintenanceStats = Tables<'v_maintenance_stats'>;

// Enum types
// contract_type / provider_domain ne sont plus des enums SQL : ce sont des slugs
// de la table de référence work_domain (ex. 'plomberie', 'ascenseur').
export type ContractType = string;
export type ProviderCategory = Enums<'tiers_category'>;
export type ProviderDomain = string;
export type ServiceOrderStatus = Enums<'service_order_status'>;
