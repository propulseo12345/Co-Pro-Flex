'use client';

import { useState, useCallback } from 'react';
import { useRepartitionKeys, useRepartitionKeyDetail } from '@/hooks/modules/useLotsData';
import { useLots } from '@/hooks/modules/useLotsData';

export function useRepartitionPage() {
  const { keys, isLoading, error, refresh, createKey, deleteKey, isMutating } = useRepartitionKeys();
  const { lots } = useLots();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const detail = useRepartitionKeyDetail(selectedKeyId);

  const handleSelectKey = useCallback((keyId: string) => {
    setSelectedKeyId(prev => prev === keyId ? null : keyId);
  }, []);

  return {
    keys, isLoading, error, refresh,
    createKey, deleteKey, isMutating,
    lots,
    selectedKeyId, handleSelectKey,
    detail,
    showCreateModal, setShowCreateModal,
  };
}
