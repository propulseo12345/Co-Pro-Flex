/**
 * Shared Module
 * API mockable layer with localStorage persistence
 *
 * Usage:
 *   import { useFinanceStats, useBudgets } from '@/shared/hooks/useFinance';
 *   import { financeApi } from '@/shared/services';
 *   import { PageShell, DataState, Table, Modal, Drawer, FiltersBar } from '@/shared/ui';
 *   import { formatDate, formatMoney, debounce } from '@/shared/utils';
 *
 * Architecture:
 *   - /mock: Static seed data (temporally coherent for 2024/2025)
 *   - /services: CRUD + filters + pagination + localStorage persistence
 *   - /hooks: useQuery-like patterns with loading/error/empty states
 *   - /ui: Reusable UI components (PageShell, DataState, Table, Modal, Drawer, FiltersBar)
 *   - /utils: Formatting and utility functions (debounce, formatDate, formatMoney)
 *
 * To swap with real API:
 *   Replace implementations in /services without touching hooks or components
 */

// Mock data
export * from './mock';

// Services
export * from './services';

// Hooks
export * from './hooks';
// Note: useFinance is already exported from ./hooks/index.ts

// UI Components
export * from './ui';

// Utils
export * from './utils';
