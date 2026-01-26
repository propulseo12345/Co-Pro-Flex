'use client';

import { useState, useCallback, useEffect } from 'react';
import { MOCK_COPROPRIETAIRES, type Coproprietaire } from '@/data/mock';
import {
  generateMockDataset,
  getMockDatasetStats,
  MOCK_DATASET_CONFIGS,
  type MockDatasetSize,
} from '@/lib/utils/mock-generator';

const STORAGE_KEY = 'dev-mock-dataset-size';

interface UseDevMockDataReturn {
  coproprietaires: Coproprietaire[];
  datasetSize: MockDatasetSize | 'original';
  stats: {
    count: number;
    totalTantiemes: number;
    avgTantiemes: number;
    minTantiemes: number;
    maxTantiemes: number;
  };
  setDatasetSize: (size: MockDatasetSize | 'original') => void;
  isDevMode: boolean;
  availableDatasets: Array<{ value: MockDatasetSize | 'original'; label: string }>;
}

/**
 * Hook pour utiliser des données mockées de différentes tailles en dev
 * Permet de tester les performances avec 8/50/200 copropriétaires
 */
export function useDevMockData(): UseDevMockDataReturn {
  const [datasetSize, setDatasetSizeState] = useState<MockDatasetSize | 'original'>('original');
  const [coproprietaires, setCoproprietaires] = useState<Coproprietaire[]>(MOCK_COPROPRIETAIRES);

  // Charger la taille depuis localStorage au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'original')) {
        setDatasetSizeState(saved as MockDatasetSize | 'original');
      }
    }
  }, []);

  // Mettre à jour les données quand la taille change
  useEffect(() => {
    if (datasetSize === 'original') {
      setCoproprietaires(MOCK_COPROPRIETAIRES);
    } else {
      setCoproprietaires(generateMockDataset(datasetSize));
    }
  }, [datasetSize]);

  const setDatasetSize = useCallback((size: MockDatasetSize | 'original') => {
    setDatasetSizeState(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, size);
    }
  }, []);

  const stats = getMockDatasetStats(coproprietaires);

  const isDevMode = process.env.NODE_ENV === 'development';

  const availableDatasets: Array<{ value: MockDatasetSize | 'original'; label: string }> = [
    { value: 'original', label: `Données originales (${MOCK_COPROPRIETAIRES.length} copros)` },
    ...Object.values(MOCK_DATASET_CONFIGS).map(config => ({
      value: config.size,
      label: config.label,
    })),
  ];

  return {
    coproprietaires,
    datasetSize,
    stats,
    setDatasetSize,
    isDevMode,
    availableDatasets,
  };
}
