'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useConvocationData } from '@/hooks/modules/useConvocationData';
import type { CoproprietaireDelivery } from '@/hooks/modules/useDeliveryConfig';
import { useConvocationPreview } from '@/hooks/modules/useConvocationPreview';
import { useDeliveryConfig } from '@/hooks/modules/useDeliveryConfig';
import { validateResolutionVariables, type VariableValidationResult } from '@/lib/utils/variable-resolution';
import { updateAgCurrentStep } from '@/lib/ag/api';

// ============================================================================
// TYPES
// ============================================================================

export interface SyndicInfo {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

export interface CoproprieteInfo {
  nom: string;
  adresse: string;
}

export type ActiveTab = 'config' | 'tracking';

export interface UseConvocationPageResult {
  // Router and params
  agId: string;
  router: ReturnType<typeof useRouter>;

  // Main data loading state
  status: 'loading' | 'ready' | 'error' | 'degraded';
  error: { code: string; message: string; details?: string } | null;
  degradedMode: {
    agDataFailed: boolean;
    resolutionsFailed: boolean;
    coproprietairesFailed: boolean;
  };
  reload: () => void;

  // AG Data
  agData: ReturnType<typeof useConvocationData>['agData'];
  resolutions: ReturnType<typeof useConvocationData>['resolutions'];
  coproprietaires: ReturnType<typeof useConvocationData>['coproprietaires'];

  // Computed info
  syndicInfo: SyndicInfo;
  coproprieteInfo: CoproprieteInfo;
  variableValidation: VariableValidationResult | null;

  // Preview hook
  preview: ReturnType<typeof useConvocationPreview>;

  // Delivery hook
  delivery: ReturnType<typeof useDeliveryConfig>;

  // Tab state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Actions
  handleContinue: () => Promise<void>;
  handleBack: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useConvocationPage(): UseConvocationPageResult {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');

  // Hook de chargement des données depuis Supabase
  const {
    status,
    agData,
    resolutions,
    coproprietaires,
    copropriete,
    syndic,
    error,
    degradedMode,
    reload,
  } = useConvocationData({ agId, timeoutMs: 10000 });

  // Conversion copropriétaires pour le hook delivery
  const deliveryCopros = useMemo<CoproprietaireDelivery[]>(() => {
    return coproprietaires.map((c) => ({
      id: c.id,
      nom: c.nom,
      lot: c.lot,
      email: c.email,
      adressePostale: c.adressePostale,
      tantiemes: c.tantiemes,
    }));
  }, [coproprietaires]);

  // Hook de gestion des modes d'envoi
  const delivery = useDeliveryConfig({ agId, coproprietaires: deliveryCopros });

  // Infos syndic depuis DB ou valeur par défaut
  const syndicInfo = useMemo<SyndicInfo>(() => {
    if (syndic) {
      return {
        nom: syndic.nom,
        adresse: syndic.adresse,
        codePostal: syndic.codePostal,
        ville: syndic.ville,
      };
    }
    // Valeur par défaut si pas de syndic en DB
    return {
      nom: 'Syndic',
      adresse: '',
      codePostal: '',
      ville: '',
    };
  }, [syndic]);

  // Infos copropriété depuis DB
  const coproprieteInfo = useMemo<CoproprieteInfo>(() => {
    if (copropriete) {
      const adresseComplete = [copropriete.adresse, copropriete.codePostal, copropriete.ville]
        .filter(Boolean)
        .join(', ');
      return {
        nom: copropriete.nom,
        adresse: adresseComplete || copropriete.nom,
      };
    }
    return { nom: 'Copropriété', adresse: '' };
  }, [copropriete]);

  // Hook de prévisualisation PDF - utilise les données DB
  const preview = useConvocationPreview({
    agId,
    agData,
    resolutions,
    copropriete: coproprieteInfo,
    syndic: {
      nom: syndicInfo.nom,
      adresse: `${syndicInfo.adresse}, ${syndicInfo.codePostal} ${syndicInfo.ville}`.trim(),
    },
  });

  // Mise à jour de l'étape courante en DB (étape 3 = Préparation convocations)
  useEffect(() => {
    if (status === 'ready' && agId) {
      updateAgCurrentStep(agId, 3);
    }
  }, [status, agId]);

  // Validation des variables
  const variableValidation = useMemo<VariableValidationResult | null>(() => {
    if (resolutions.length === 0) return null;
    return validateResolutionVariables(resolutions);
  }, [resolutions]);

  // Handle continue action
  const handleContinue = useCallback(async () => {
    // Naviguer vers l'étape suivante (envoi des convocations)
    router.push(`/ag/${agId}/envoi`);
  }, [router, agId]);

  // Handle back action
  const handleBack = useCallback(() => {
    router.push(`/ag/${agId}/agenda`);
  }, [router, agId]);

  return {
    agId,
    router,
    status,
    error,
    degradedMode,
    reload,
    agData,
    resolutions,
    coproprietaires,
    syndicInfo,
    coproprieteInfo,
    variableValidation,
    preview,
    delivery,
    activeTab,
    setActiveTab,
    handleContinue,
    handleBack,
  };
}

// Re-export types from hooks
export type { CoproprietaireDelivery } from '@/hooks/modules/useDeliveryConfig';
export type { VariableValidationResult } from '@/lib/utils/variable-resolution';
