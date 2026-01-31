'use client';

import { useState, useCallback, useEffect } from 'react';
import { useProjectorSync } from '@/hooks/modules/useProjectorSync';

interface UseAgProjectorPageParams {
  agId: string;
  token: string;
}

export function useAgProjectorPage({ agId, token }: UseAgProjectorPageParams) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    data,
    syncStatus,
    displayState,
    lastSyncTime,
    error,
    isValidToken,
  } = useProjectorSync({
    agId,
    token,
    pollingInterval: 500,
    staleThreshold: 30000,
  });

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch { /* ignore */ }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return {
    isFullscreen,
    data,
    syncStatus,
    displayState,
    lastSyncTime,
    error,
    isValidToken,
    toggleFullscreen,
  };
}
