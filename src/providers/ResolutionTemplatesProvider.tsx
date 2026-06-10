'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { fetchTemplatesForCabinet } from '@/lib/ag/resolutionTemplates/api';
import type { ResolutionTemplateRow } from '@/lib/ag/resolutionTemplates/types';

// ============================================================================
// TYPES
// ============================================================================

interface ResolutionTemplatesContextValue {
  templates: ResolutionTemplateRow[];
  isLoading: boolean;
  error: string | null;
  cabinetId: string | null;
  coproId: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ResolutionTemplatesContext = createContext<ResolutionTemplatesContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function ResolutionTemplatesProvider({ children }: { children: ReactNode }) {
  const { cabinetId, currentCoproId } = useCopro();
  const [templates, setTemplates] = useState<ResolutionTemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchTemplatesForCabinet(cabinetId, currentCoproId);
    if (res.success) {
      setTemplates(res.data);
      setError(null);
    } else {
      setError(res.error); // snapshot précédent conservé
    }
    setIsLoading(false);
  }, [cabinetId, currentCoproId]);

  useEffect(() => {
    void load();
  }, [load]);

  const value: ResolutionTemplatesContextValue = {
    templates,
    isLoading,
    error,
    cabinetId,
    coproId: currentCoproId,
    refresh: load,
  };

  return (
    <ResolutionTemplatesContext.Provider value={value}>
      {children}
    </ResolutionTemplatesContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useResolutionTemplates(): ResolutionTemplatesContextValue {
  const ctx = useContext(ResolutionTemplatesContext);
  if (!ctx) {
    throw new Error('useResolutionTemplates must be used within ResolutionTemplatesProvider');
  }
  return ctx;
}
