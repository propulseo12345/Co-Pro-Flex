/**
 * Finance API Service - Mock implementation with localStorage persistence
 * Ready to be swapped with real API calls without touching UI components
 */

import type { ID, PaginatedResponse, SearchFilters } from '@/types/common';
import { LigneAppelStatut } from '@/types/enums';
import {
  getInitialFinanceData,
  type FinanceDataStore,
  type MockCopropriete,
  type MockCoproprietaire,
  type MockLot,
  type MockCleRepartition,
  type TantiemeLot,
  type MockExercice,
  type MockBudget,
  type MockAppelFonds,
  type MockLigneAppel,
  type MockPaiement,
  type MockFacture,
  type MockMouvementBancaire,
  type MockEcritureComptable,
  type MockCompteComptable,
  type MockFournisseur,
} from '@/shared/mock/finance';

// ============================================
// STORAGE LAYER
// ============================================

const STORAGE_KEY = 'coproflex-finance-data';

class FinanceStorage {
  private data: FinanceDataStore | null = null;
  private isInitialized = false;

  private getFromStorage(): FinanceDataStore | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[FinanceStorage] Error reading from localStorage:', e);
    }
    return null;
  }

  private saveToStorage(data: FinanceDataStore): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[FinanceStorage] Error saving to localStorage:', e);
    }
  }

  getData(): FinanceDataStore {
    if (!this.isInitialized) {
      this.data = this.getFromStorage() || getInitialFinanceData();
      this.isInitialized = true;
      // Save initial data if not already in storage
      if (!this.getFromStorage()) {
        this.saveToStorage(this.data);
      }
    }
    return this.data!;
  }

  updateData(updater: (data: FinanceDataStore) => FinanceDataStore): FinanceDataStore {
    this.data = updater(this.getData());
    this.saveToStorage(this.data);
    return this.data;
  }

  reset(): void {
    this.data = getInitialFinanceData();
    this.saveToStorage(this.data);
  }
}

const storage = new FinanceStorage();

// ============================================
// HELPERS
// ============================================

const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface QueryOptions<T> extends SearchFilters {
  filter?: Partial<T> | ((item: T) => boolean);
}

function applyFiltersAndPagination<T extends { id: ID }>(
  items: T[],
  options: QueryOptions<T> = {}
): PaginatedResponse<T> {
  let filtered = [...items];

  // Apply filter
  if (options.filter) {
    if (typeof options.filter === 'function') {
      filtered = filtered.filter(options.filter);
    } else {
      const filterObj = options.filter;
      filtered = filtered.filter(item => {
        return Object.entries(filterObj).every(([key, value]) => {
          if (value === undefined) return true;
          return (item as Record<string, unknown>)[key] === value;
        });
      });
    }
  }

  // Apply search query
  if (options.query) {
    const query = options.query.toLowerCase();
    filtered = filtered.filter(item => {
      return Object.values(item).some((val: unknown) => {
        if (typeof val === 'string') {
          return val.toLowerCase().includes(query);
        }
        if (typeof val === 'number') {
          return String(val).includes(query);
        }
        return false;
      });
    });
  }

  // Apply sorting
  if (options.sortBy) {
    const sortKey = options.sortBy;
    const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortOrder;
      }
      return ((aVal as number) - (bVal as number)) * sortOrder;
    });
  }

  const total = filtered.length;
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const totalPages = Math.ceil(total / pageSize);

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const data = filtered.slice(startIndex, startIndex + pageSize);

  return { data, total, page, pageSize, totalPages };
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// COPROPRIETE API
// ============================================

export const coproprieteApi = {
  async get(): Promise<ApiResult<MockCopropriete>> {
    await delay();
    return { success: true, data: storage.getData().copropriete };
  },

  async update(updates: Partial<MockCopropriete>): Promise<ApiResult<MockCopropriete>> {
    await delay();
    const data = storage.updateData(store => ({
      ...store,
      copropriete: { ...store.copropriete, ...updates },
    }));
    return { success: true, data: data.copropriete };
  },
};

// ============================================
// COPROPRIETAIRES API
// ============================================

export const coproprietairesApi = {
  async list(options?: QueryOptions<MockCoproprietaire>): Promise<ApiResult<PaginatedResponse<MockCoproprietaire>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().coproprietaires, options);
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockCoproprietaire>> {
    await delay();
    const item = storage.getData().coproprietaires.find(c => c.id === id);
    if (!item) return { success: false, error: 'Coproprietaire not found' };
    return { success: true, data: item };
  },

  async create(data: Omit<MockCoproprietaire, 'id'>): Promise<ApiResult<MockCoproprietaire>> {
    await delay();
    const newItem: MockCoproprietaire = { ...data, id: generateId('copro-owner') };
    storage.updateData(store => ({
      ...store,
      coproprietaires: [...store.coproprietaires, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockCoproprietaire>): Promise<ApiResult<MockCoproprietaire>> {
    await delay();
    let updated: MockCoproprietaire | undefined;
    storage.updateData(store => ({
      ...store,
      coproprietaires: store.coproprietaires.map(c => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      }),
    }));
    if (!updated) return { success: false, error: 'Coproprietaire not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      coproprietaires: store.coproprietaires.filter(c => c.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// LOTS API
// ============================================

export const lotsApi = {
  async list(options?: QueryOptions<MockLot>): Promise<ApiResult<PaginatedResponse<MockLot>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().lots, options);
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockLot>> {
    await delay();
    const item = storage.getData().lots.find(l => l.id === id);
    if (!item) return { success: false, error: 'Lot not found' };
    return { success: true, data: item };
  },

  async getByCoproprietaire(coproprietaireId: ID): Promise<ApiResult<MockLot[]>> {
    await delay();
    const lots = storage.getData().lots.filter(l => l.coproprietaireId === coproprietaireId);
    return { success: true, data: lots };
  },

  async create(data: Omit<MockLot, 'id'>): Promise<ApiResult<MockLot>> {
    await delay();
    const newItem: MockLot = { ...data, id: generateId('lot') };
    storage.updateData(store => ({
      ...store,
      lots: [...store.lots, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockLot>): Promise<ApiResult<MockLot>> {
    await delay();
    let updated: MockLot | undefined;
    storage.updateData(store => ({
      ...store,
      lots: store.lots.map(l => {
        if (l.id === id) {
          updated = { ...l, ...updates };
          return updated;
        }
        return l;
      }),
    }));
    if (!updated) return { success: false, error: 'Lot not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      lots: store.lots.filter(l => l.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// CLES REPARTITION API
// ============================================

export interface RepartitionLigne {
  lotId: ID;
  lotNumero: string;
  lotType: string;
  coproprietaireId: ID;
  coproprietaireNom: string;
  tantiemes: number;
  pourcentage: number;
  montant: number;
}

export interface RepartitionResult {
  cleId: ID;
  cleNom: string;
  montantTotal: number;
  totalTantiemes: number;
  lignes: RepartitionLigne[];
}

export interface ValidationResult {
  isValid: boolean;
  totalCalcule: number;
  totalAttendu: number;
  ecart: number;
  warnings: string[];
}

export const clesRepartitionApi = {
  async list(options?: QueryOptions<MockCleRepartition>): Promise<ApiResult<PaginatedResponse<MockCleRepartition>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().clesRepartition, options);
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockCleRepartition>> {
    await delay();
    const item = storage.getData().clesRepartition.find(c => c.id === id);
    if (!item) return { success: false, error: 'Clé de répartition non trouvée' };
    return { success: true, data: item };
  },

  async create(data: Omit<MockCleRepartition, 'id'>): Promise<ApiResult<MockCleRepartition>> {
    await delay();
    const newItem: MockCleRepartition = { ...data, id: generateId('cle') };
    storage.updateData(store => ({
      ...store,
      clesRepartition: [...store.clesRepartition, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockCleRepartition>): Promise<ApiResult<MockCleRepartition>> {
    await delay();
    let updated: MockCleRepartition | undefined;
    storage.updateData(store => ({
      ...store,
      clesRepartition: store.clesRepartition.map(c => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      }),
    }));
    if (!updated) return { success: false, error: 'Clé de répartition non trouvée' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    const store = storage.getData();
    // Check if key is used by any budget
    const usedByBudget = store.budgets.some(b => b.cleRepartitionId === id);
    if (usedByBudget) {
      return { success: false, error: 'Cette clé est utilisée par un ou plusieurs budgets' };
    }
    storage.updateData(s => ({
      ...s,
      clesRepartition: s.clesRepartition.filter(c => c.id !== id),
    }));
    return { success: true };
  },

  async calculerRepartition(cleId: ID, montant: number): Promise<ApiResult<RepartitionResult>> {
    await delay();
    const store = storage.getData();
    const cle = store.clesRepartition.find(c => c.id === cleId);
    if (!cle) return { success: false, error: 'Clé de répartition non trouvée' };

    const lignes: RepartitionLigne[] = [];
    let totalMontant = 0;

    for (const tantiemeLot of cle.tantiemesParLot) {
      const lot = store.lots.find(l => l.id === tantiemeLot.lotId);
      if (!lot) continue;
      const copro = store.coproprietaires.find(c => c.id === lot.coproprietaireId);
      if (!copro) continue;

      const pourcentage = (tantiemeLot.tantiemes / cle.totalTantiemes) * 100;
      const montantLot = Math.round((montant * tantiemeLot.tantiemes / cle.totalTantiemes) * 100) / 100;
      totalMontant += montantLot;

      lignes.push({
        lotId: lot.id,
        lotNumero: lot.numero,
        lotType: lot.type,
        coproprietaireId: copro.id,
        coproprietaireNom: `${copro.nom} ${copro.prenom}`,
        tantiemes: tantiemeLot.tantiemes,
        pourcentage: Math.round(pourcentage * 100) / 100,
        montant: montantLot,
      });
    }

    // Adjust for rounding errors
    const diff = Math.round((montant - totalMontant) * 100) / 100;
    if (diff !== 0 && lignes.length > 0) {
      lignes[0].montant = Math.round((lignes[0].montant + diff) * 100) / 100;
    }

    return {
      success: true,
      data: {
        cleId: cle.id,
        cleNom: cle.nom,
        montantTotal: montant,
        totalTantiemes: cle.totalTantiemes,
        lignes: lignes.sort((a, b) => a.lotNumero.localeCompare(b.lotNumero)),
      },
    };
  },

  async validerTantiemes(cleId: ID): Promise<ApiResult<ValidationResult>> {
    await delay();
    const store = storage.getData();
    const cle = store.clesRepartition.find(c => c.id === cleId);
    if (!cle) return { success: false, error: 'Clé de répartition non trouvée' };

    const totalCalcule = cle.tantiemesParLot.reduce((sum, t) => sum + t.tantiemes, 0);
    const ecart = totalCalcule - cle.totalTantiemes;
    const warnings: string[] = [];

    if (ecart !== 0) {
      warnings.push(`Écart de ${ecart} tantièmes (calculé: ${totalCalcule}, attendu: ${cle.totalTantiemes})`);
    }

    // Check for lots without tantiemes
    const lotsWithTantiemes = new Set(cle.tantiemesParLot.map(t => t.lotId));
    const lotsManquants = store.lots.filter(l => !lotsWithTantiemes.has(l.id));
    if (lotsManquants.length > 0 && cle.type === 'GENERALE') {
      warnings.push(`${lotsManquants.length} lot(s) sans tantièmes pour cette clé générale`);
    }

    // Check for zero tantiemes
    const lotsSansTantiemes = cle.tantiemesParLot.filter(t => t.tantiemes === 0);
    if (lotsSansTantiemes.length > 0) {
      warnings.push(`${lotsSansTantiemes.length} lot(s) avec 0 tantièmes`);
    }

    return {
      success: true,
      data: {
        isValid: ecart === 0 && warnings.length === 0,
        totalCalcule,
        totalAttendu: cle.totalTantiemes,
        ecart,
        warnings,
      },
    };
  },

  async getLotsAvecTantiemes(cleId: ID): Promise<ApiResult<Array<{
    lot: MockLot;
    coproprietaire: MockCoproprietaire;
    tantiemes: number;
  }>>> {
    await delay();
    const store = storage.getData();
    const cle = store.clesRepartition.find(c => c.id === cleId);
    if (!cle) return { success: false, error: 'Clé de répartition non trouvée' };

    const result = store.lots.map(lot => {
      const copro = store.coproprietaires.find(c => c.id === lot.coproprietaireId);
      const tantiemeLot = cle.tantiemesParLot.find(t => t.lotId === lot.id);
      return {
        lot,
        coproprietaire: copro!,
        tantiemes: tantiemeLot?.tantiemes ?? 0,
      };
    }).filter(item => item.coproprietaire);

    return {
      success: true,
      data: result.sort((a, b) => a.lot.numero.localeCompare(b.lot.numero)),
    };
  },

  async updateTantiemesLot(cleId: ID, lotId: ID, tantiemes: number): Promise<ApiResult<MockCleRepartition>> {
    await delay();
    let updated: MockCleRepartition | undefined;
    storage.updateData(store => ({
      ...store,
      clesRepartition: store.clesRepartition.map(c => {
        if (c.id === cleId) {
          const existingIndex = c.tantiemesParLot.findIndex(t => t.lotId === lotId);
          let newTantiemesParLot = [...c.tantiemesParLot];

          if (tantiemes === 0) {
            // Remove if zero
            newTantiemesParLot = newTantiemesParLot.filter(t => t.lotId !== lotId);
          } else if (existingIndex >= 0) {
            // Update existing
            newTantiemesParLot[existingIndex] = { lotId, tantiemes };
          } else {
            // Add new
            newTantiemesParLot.push({ lotId, tantiemes });
          }

          // Recalculate total
          const newTotal = newTantiemesParLot.reduce((sum, t) => sum + t.tantiemes, 0);
          updated = { ...c, tantiemesParLot: newTantiemesParLot, totalTantiemes: newTotal };
          return updated;
        }
        return c;
      }),
    }));
    if (!updated) return { success: false, error: 'Clé de répartition non trouvée' };
    return { success: true, data: updated };
  },

  async recalculerTotal(cleId: ID): Promise<ApiResult<MockCleRepartition>> {
    await delay();
    let updated: MockCleRepartition | undefined;
    storage.updateData(store => ({
      ...store,
      clesRepartition: store.clesRepartition.map(c => {
        if (c.id === cleId) {
          const newTotal = c.tantiemesParLot.reduce((sum, t) => sum + t.tantiemes, 0);
          updated = { ...c, totalTantiemes: newTotal };
          return updated;
        }
        return c;
      }),
    }));
    if (!updated) return { success: false, error: 'Clé de répartition non trouvée' };
    return { success: true, data: updated };
  },
};

// ============================================
// EXERCICES API
// ============================================

export const exercicesApi = {
  async list(options?: QueryOptions<MockExercice>): Promise<ApiResult<PaginatedResponse<MockExercice>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().exercices, {
      ...options,
      sortBy: options?.sortBy || 'annee',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockExercice>> {
    await delay();
    const item = storage.getData().exercices.find(e => e.id === id);
    if (!item) return { success: false, error: 'Exercice not found' };
    return { success: true, data: item };
  },

  async getCurrent(): Promise<ApiResult<MockExercice>> {
    await delay();
    const current = storage.getData().exercices.find(e => e.statut === 'EN_COURS');
    if (!current) return { success: false, error: 'No current exercice' };
    return { success: true, data: current };
  },

  async create(data: Omit<MockExercice, 'id'>): Promise<ApiResult<MockExercice>> {
    await delay();
    const newItem: MockExercice = { ...data, id: generateId('ex') };
    storage.updateData(store => ({
      ...store,
      exercices: [...store.exercices, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockExercice>): Promise<ApiResult<MockExercice>> {
    await delay();
    let updated: MockExercice | undefined;
    storage.updateData(store => ({
      ...store,
      exercices: store.exercices.map(e => {
        if (e.id === id) {
          updated = { ...e, ...updates };
          return updated;
        }
        return e;
      }),
    }));
    if (!updated) return { success: false, error: 'Exercice not found' };
    return { success: true, data: updated };
  },
};

// ============================================
// BUDGETS API
// ============================================

export const budgetsApi = {
  async list(options?: QueryOptions<MockBudget>): Promise<ApiResult<PaginatedResponse<MockBudget>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().budgets, options);
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockBudget>> {
    await delay();
    const item = storage.getData().budgets.find(b => b.id === id);
    if (!item) return { success: false, error: 'Budget not found' };
    return { success: true, data: item };
  },

  async getByExercice(exerciceId: ID): Promise<ApiResult<MockBudget[]>> {
    await delay();
    const budgets = storage.getData().budgets.filter(b => b.exerciceId === exerciceId);
    return { success: true, data: budgets };
  },

  async getByYear(annee: number): Promise<ApiResult<MockBudget[]>> {
    await delay();
    const budgets = storage.getData().budgets.filter(b => b.annee === annee);
    return { success: true, data: budgets };
  },

  async create(data: Omit<MockBudget, 'id'>): Promise<ApiResult<MockBudget>> {
    await delay();
    const newItem: MockBudget = { ...data, id: generateId('budget') };
    storage.updateData(store => ({
      ...store,
      budgets: [...store.budgets, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockBudget>): Promise<ApiResult<MockBudget>> {
    await delay();
    let updated: MockBudget | undefined;
    storage.updateData(store => ({
      ...store,
      budgets: store.budgets.map(b => {
        if (b.id === id) {
          updated = { ...b, ...updates };
          return updated;
        }
        return b;
      }),
    }));
    if (!updated) return { success: false, error: 'Budget not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      budgets: store.budgets.filter(b => b.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// APPELS DE FONDS API
// ============================================

export const appelsFondsApi = {
  async list(options?: QueryOptions<MockAppelFonds>): Promise<ApiResult<PaginatedResponse<MockAppelFonds>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().appelsFonds, {
      ...options,
      sortBy: options?.sortBy || 'dateEcheance',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockAppelFonds>> {
    await delay();
    const item = storage.getData().appelsFonds.find(a => a.id === id);
    if (!item) return { success: false, error: 'Appel de fonds not found' };
    return { success: true, data: item };
  },

  async getByBudget(budgetId: ID): Promise<ApiResult<MockAppelFonds[]>> {
    await delay();
    const appels = storage.getData().appelsFonds.filter(a => a.budgetId === budgetId);
    return { success: true, data: appels };
  },

  async getByExercice(exerciceId: ID): Promise<ApiResult<MockAppelFonds[]>> {
    await delay();
    const appels = storage.getData().appelsFonds.filter(a => a.exerciceId === exerciceId);
    return { success: true, data: appels };
  },

  async create(data: Omit<MockAppelFonds, 'id' | 'lignes'>): Promise<ApiResult<MockAppelFonds>> {
    await delay();
    const store = storage.getData();
    const budget = store.budgets.find(b => b.id === data.budgetId);
    if (!budget) return { success: false, error: 'Budget not found' };

    // Generate lignes for each coproprietaire
    const totalTantiemes = store.lots.reduce((sum, l) => sum + l.tantiemesGeneraux, 0);
    const lignes: MockLigneAppel[] = store.coproprietaires.map((owner) => {
      const ownerLots = store.lots.filter(l => l.coproprietaireId === owner.id);
      const ownerTantiemes = ownerLots.reduce((sum, l) => sum + l.tantiemesGeneraux, 0);
      const montantDu = Math.round((data.montantTotal * ownerTantiemes / totalTantiemes) * 100) / 100;
      return {
        id: generateId('ligne'),
        appelFondsId: '', // Will be set below
        coproprietaireId: owner.id,
        lotId: ownerLots[0]?.id || '',
        montantDu,
        montantPaye: 0,
        statut: LigneAppelStatut.A_PAYER,
      };
    });

    const newItem: MockAppelFonds = {
      ...data,
      id: generateId('appel'),
      lignes: lignes.map(l => ({ ...l, appelFondsId: '' })),
    };
    newItem.lignes = newItem.lignes.map(l => ({ ...l, appelFondsId: newItem.id }));

    storage.updateData(s => ({
      ...s,
      appelsFonds: [...s.appelsFonds, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockAppelFonds>): Promise<ApiResult<MockAppelFonds>> {
    await delay();
    let updated: MockAppelFonds | undefined;
    storage.updateData(store => ({
      ...store,
      appelsFonds: store.appelsFonds.map(a => {
        if (a.id === id) {
          updated = { ...a, ...updates };
          return updated;
        }
        return a;
      }),
    }));
    if (!updated) return { success: false, error: 'Appel de fonds not found' };
    return { success: true, data: updated };
  },

  async updateLigne(appelId: ID, ligneId: ID, updates: Partial<MockLigneAppel>): Promise<ApiResult<MockAppelFonds>> {
    await delay();
    let updated: MockAppelFonds | undefined;
    storage.updateData(store => ({
      ...store,
      appelsFonds: store.appelsFonds.map(a => {
        if (a.id === appelId) {
          updated = {
            ...a,
            lignes: a.lignes.map(l => (l.id === ligneId ? { ...l, ...updates } : l)),
          };
          return updated;
        }
        return a;
      }),
    }));
    if (!updated) return { success: false, error: 'Appel de fonds not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      appelsFonds: store.appelsFonds.filter(a => a.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// PAIEMENTS API
// ============================================

export const paiementsApi = {
  async list(options?: QueryOptions<MockPaiement>): Promise<ApiResult<PaginatedResponse<MockPaiement>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().paiements, {
      ...options,
      sortBy: options?.sortBy || 'datePaiement',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockPaiement>> {
    await delay();
    const item = storage.getData().paiements.find(p => p.id === id);
    if (!item) return { success: false, error: 'Paiement not found' };
    return { success: true, data: item };
  },

  async getByCoproprietaire(coproprietaireId: ID): Promise<ApiResult<MockPaiement[]>> {
    await delay();
    const paiements = storage.getData().paiements.filter(p => p.coproprietaireId === coproprietaireId);
    return { success: true, data: paiements };
  },

  async getByAppel(appelFondsId: ID): Promise<ApiResult<MockPaiement[]>> {
    await delay();
    const paiements = storage.getData().paiements.filter(p => p.appelFondsId === appelFondsId);
    return { success: true, data: paiements };
  },

  async create(data: Omit<MockPaiement, 'id'>): Promise<ApiResult<MockPaiement>> {
    await delay();
    const newItem: MockPaiement = { ...data, id: generateId('pmt') };
    storage.updateData(store => ({
      ...store,
      paiements: [...store.paiements, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockPaiement>): Promise<ApiResult<MockPaiement>> {
    await delay();
    let updated: MockPaiement | undefined;
    storage.updateData(store => ({
      ...store,
      paiements: store.paiements.map(p => {
        if (p.id === id) {
          updated = { ...p, ...updates };
          return updated;
        }
        return p;
      }),
    }));
    if (!updated) return { success: false, error: 'Paiement not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      paiements: store.paiements.filter(p => p.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// FACTURES API
// ============================================

export const facturesApi = {
  async list(options?: QueryOptions<MockFacture>): Promise<ApiResult<PaginatedResponse<MockFacture>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().factures, {
      ...options,
      sortBy: options?.sortBy || 'dateFacture',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockFacture>> {
    await delay();
    const item = storage.getData().factures.find(f => f.id === id);
    if (!item) return { success: false, error: 'Facture not found' };
    return { success: true, data: item };
  },

  async getByFournisseur(fournisseurId: ID): Promise<ApiResult<MockFacture[]>> {
    await delay();
    const factures = storage.getData().factures.filter(f => f.fournisseurId === fournisseurId);
    return { success: true, data: factures };
  },

  async getByStatut(statut: MockFacture['statut']): Promise<ApiResult<MockFacture[]>> {
    await delay();
    const factures = storage.getData().factures.filter(f => f.statut === statut);
    return { success: true, data: factures };
  },

  async create(data: Omit<MockFacture, 'id'>): Promise<ApiResult<MockFacture>> {
    await delay();
    const newItem: MockFacture = { ...data, id: generateId('fact') };
    storage.updateData(store => ({
      ...store,
      factures: [...store.factures, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockFacture>): Promise<ApiResult<MockFacture>> {
    await delay();
    let updated: MockFacture | undefined;
    storage.updateData(store => ({
      ...store,
      factures: store.factures.map(f => {
        if (f.id === id) {
          updated = { ...f, ...updates };
          return updated;
        }
        return f;
      }),
    }));
    if (!updated) return { success: false, error: 'Facture not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      factures: store.factures.filter(f => f.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// FOURNISSEURS API
// ============================================

export const fournisseursApi = {
  async list(options?: QueryOptions<MockFournisseur>): Promise<ApiResult<PaginatedResponse<MockFournisseur>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().fournisseurs, options);
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockFournisseur>> {
    await delay();
    const item = storage.getData().fournisseurs.find(f => f.id === id);
    if (!item) return { success: false, error: 'Fournisseur not found' };
    return { success: true, data: item };
  },

  async create(data: Omit<MockFournisseur, 'id'>): Promise<ApiResult<MockFournisseur>> {
    await delay();
    const newItem: MockFournisseur = { ...data, id: generateId('fourn') };
    storage.updateData(store => ({
      ...store,
      fournisseurs: [...store.fournisseurs, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockFournisseur>): Promise<ApiResult<MockFournisseur>> {
    await delay();
    let updated: MockFournisseur | undefined;
    storage.updateData(store => ({
      ...store,
      fournisseurs: store.fournisseurs.map(f => {
        if (f.id === id) {
          updated = { ...f, ...updates };
          return updated;
        }
        return f;
      }),
    }));
    if (!updated) return { success: false, error: 'Fournisseur not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      fournisseurs: store.fournisseurs.filter(f => f.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// MOUVEMENTS BANCAIRES API
// ============================================

export const mouvementsBancairesApi = {
  async list(options?: QueryOptions<MockMouvementBancaire>): Promise<ApiResult<PaginatedResponse<MockMouvementBancaire>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().mouvementsBancaires, {
      ...options,
      sortBy: options?.sortBy || 'dateOperation',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockMouvementBancaire>> {
    await delay();
    const item = storage.getData().mouvementsBancaires.find(m => m.id === id);
    if (!item) return { success: false, error: 'Mouvement bancaire not found' };
    return { success: true, data: item };
  },

  async getByStatut(statut: MockMouvementBancaire['statut']): Promise<ApiResult<MockMouvementBancaire[]>> {
    await delay();
    const mouvements = storage.getData().mouvementsBancaires.filter(m => m.statut === statut);
    return { success: true, data: mouvements };
  },

  async create(data: Omit<MockMouvementBancaire, 'id'>): Promise<ApiResult<MockMouvementBancaire>> {
    await delay();
    const newItem: MockMouvementBancaire = { ...data, id: generateId('mvt') };
    storage.updateData(store => ({
      ...store,
      mouvementsBancaires: [...store.mouvementsBancaires, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockMouvementBancaire>): Promise<ApiResult<MockMouvementBancaire>> {
    await delay();
    let updated: MockMouvementBancaire | undefined;
    storage.updateData(store => ({
      ...store,
      mouvementsBancaires: store.mouvementsBancaires.map(m => {
        if (m.id === id) {
          updated = { ...m, ...updates };
          return updated;
        }
        return m;
      }),
    }));
    if (!updated) return { success: false, error: 'Mouvement bancaire not found' };
    return { success: true, data: updated };
  },

  async rapprocher(id: ID, ecritureId: ID): Promise<ApiResult<MockMouvementBancaire>> {
    return this.update(id, { statut: 'RAPPROCHE', ecritureId });
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      mouvementsBancaires: store.mouvementsBancaires.filter(m => m.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// ECRITURES COMPTABLES API
// ============================================

export const ecrituresApi = {
  async list(options?: QueryOptions<MockEcritureComptable>): Promise<ApiResult<PaginatedResponse<MockEcritureComptable>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().ecritures, {
      ...options,
      sortBy: options?.sortBy || 'dateEcriture',
      sortOrder: options?.sortOrder || 'desc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockEcritureComptable>> {
    await delay();
    const item = storage.getData().ecritures.find(e => e.id === id);
    if (!item) return { success: false, error: 'Ecriture not found' };
    return { success: true, data: item };
  },

  async getByExercice(exerciceId: ID): Promise<ApiResult<MockEcritureComptable[]>> {
    await delay();
    const ecritures = storage.getData().ecritures.filter(e => e.exerciceId === exerciceId);
    return { success: true, data: ecritures };
  },

  async getByJournal(journalCode: string): Promise<ApiResult<MockEcritureComptable[]>> {
    await delay();
    const ecritures = storage.getData().ecritures.filter(e => e.journalCode === journalCode);
    return { success: true, data: ecritures };
  },

  async getByCompte(compteNumero: string): Promise<ApiResult<MockEcritureComptable[]>> {
    await delay();
    const ecritures = storage.getData().ecritures.filter(
      e => e.compteDebit === compteNumero || e.compteCredit === compteNumero
    );
    return { success: true, data: ecritures };
  },

  async create(data: Omit<MockEcritureComptable, 'id'>): Promise<ApiResult<MockEcritureComptable>> {
    await delay();
    const newItem: MockEcritureComptable = { ...data, id: generateId('ecr') };
    storage.updateData(store => ({
      ...store,
      ecritures: [...store.ecritures, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockEcritureComptable>): Promise<ApiResult<MockEcritureComptable>> {
    await delay();
    let updated: MockEcritureComptable | undefined;
    storage.updateData(store => ({
      ...store,
      ecritures: store.ecritures.map(e => {
        if (e.id === id) {
          updated = { ...e, ...updates };
          return updated;
        }
        return e;
      }),
    }));
    if (!updated) return { success: false, error: 'Ecriture not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      ecritures: store.ecritures.filter(e => e.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// COMPTES COMPTABLES API
// ============================================

export const comptesComptablesApi = {
  async list(options?: QueryOptions<MockCompteComptable>): Promise<ApiResult<PaginatedResponse<MockCompteComptable>>> {
    await delay();
    const result = applyFiltersAndPagination(storage.getData().comptesComptables, {
      ...options,
      sortBy: options?.sortBy || 'numero',
      sortOrder: options?.sortOrder || 'asc',
    });
    return { success: true, data: result };
  },

  async getById(id: ID): Promise<ApiResult<MockCompteComptable>> {
    await delay();
    const item = storage.getData().comptesComptables.find(c => c.id === id);
    if (!item) return { success: false, error: 'Compte not found' };
    return { success: true, data: item };
  },

  async getByNumero(numero: string): Promise<ApiResult<MockCompteComptable>> {
    await delay();
    const item = storage.getData().comptesComptables.find(c => c.numero === numero);
    if (!item) return { success: false, error: 'Compte not found' };
    return { success: true, data: item };
  },

  async getByType(type: MockCompteComptable['type']): Promise<ApiResult<MockCompteComptable[]>> {
    await delay();
    const comptes = storage.getData().comptesComptables.filter(c => c.type === type);
    return { success: true, data: comptes };
  },

  async create(data: Omit<MockCompteComptable, 'id'>): Promise<ApiResult<MockCompteComptable>> {
    await delay();
    const newItem: MockCompteComptable = { ...data, id: generateId('cpt') };
    storage.updateData(store => ({
      ...store,
      comptesComptables: [...store.comptesComptables, newItem],
    }));
    return { success: true, data: newItem };
  },

  async update(id: ID, updates: Partial<MockCompteComptable>): Promise<ApiResult<MockCompteComptable>> {
    await delay();
    let updated: MockCompteComptable | undefined;
    storage.updateData(store => ({
      ...store,
      comptesComptables: store.comptesComptables.map(c => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      }),
    }));
    if (!updated) return { success: false, error: 'Compte not found' };
    return { success: true, data: updated };
  },

  async delete(id: ID): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(store => ({
      ...store,
      comptesComptables: store.comptesComptables.filter(c => c.id !== id),
    }));
    return { success: true };
  },
};

// ============================================
// AGGREGATES & STATS API
// ============================================

export interface FinanceStats {
  soldeCompteBancaire: number;
  totalAppelsEmis: number;
  totalAppelesPaye: number;
  totalImpayes: number;
  nombreImpayes: number;
  tauxRecouvrement: number;
  facturesAPayer: number;
  nombreFacturesAPayer: number;
}

export const financeStatsApi = {
  async getStats(): Promise<ApiResult<FinanceStats>> {
    await delay();
    const store = storage.getData();

    // Solde banque
    const compteBanque = store.comptesComptables.find(c => c.numero === '512');
    const soldeCompteBancaire = compteBanque ? compteBanque.soldeDebit - compteBanque.soldeCredit : 0;

    // Appels de fonds
    const totalAppelsEmis = store.appelsFonds.reduce((sum, a) => sum + a.montantTotal, 0);
    const totalAppelesPaye = store.appelsFonds.reduce((sum, a) => {
      return sum + a.lignes.reduce((s, l) => s + l.montantPaye, 0);
    }, 0);

    // Impayes
    const lignesImpayes = store.appelsFonds.flatMap(a => a.lignes).filter(l => l.montantPaye < l.montantDu);
    const totalImpayes = lignesImpayes.reduce((sum, l) => sum + (l.montantDu - l.montantPaye), 0);
    const nombreImpayes = lignesImpayes.length;

    // Taux recouvrement
    const tauxRecouvrement = totalAppelsEmis > 0 ? (totalAppelesPaye / totalAppelsEmis) * 100 : 100;

    // Factures a payer
    const facturesAPayerList = store.factures.filter(f => f.statut === 'A_PAYER');
    const facturesAPayer = facturesAPayerList.reduce((sum, f) => sum + f.montantTTC, 0);
    const nombreFacturesAPayer = facturesAPayerList.length;

    return {
      success: true,
      data: {
        soldeCompteBancaire,
        totalAppelsEmis,
        totalAppelesPaye,
        totalImpayes,
        nombreImpayes,
        tauxRecouvrement: Math.round(tauxRecouvrement * 100) / 100,
        facturesAPayer,
        nombreFacturesAPayer,
      },
    };
  },
};

// ============================================
// ADMIN / RESET
// ============================================

export const financeAdminApi = {
  async resetData(): Promise<ApiResult<void>> {
    await delay();
    storage.reset();
    return { success: true };
  },

  async exportData(): Promise<ApiResult<FinanceDataStore>> {
    await delay();
    return { success: true, data: storage.getData() };
  },

  async importData(data: FinanceDataStore): Promise<ApiResult<void>> {
    await delay();
    storage.updateData(() => data);
    return { success: true };
  },
};

// ============================================
// UNIFIED FINANCE API OBJECT
// ============================================

export const financeApi = {
  copropriete: coproprieteApi,
  coproprietaires: coproprietairesApi,
  lots: lotsApi,
  clesRepartition: clesRepartitionApi,
  exercices: exercicesApi,
  budgets: budgetsApi,
  appelsFonds: appelsFondsApi,
  paiements: paiementsApi,
  factures: facturesApi,
  fournisseurs: fournisseursApi,
  mouvementsBancaires: mouvementsBancairesApi,
  ecritures: ecrituresApi,
  comptesComptables: comptesComptablesApi,
  stats: financeStatsApi,
  admin: financeAdminApi,
};

export default financeApi;
