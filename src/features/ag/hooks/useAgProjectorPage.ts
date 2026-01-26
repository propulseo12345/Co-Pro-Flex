'use client';

import { useState, useCallback, useEffect } from 'react';
import { useProjectorSync } from '@/hooks/modules/useProjectorSync';
import type { ProjectorSessionData, ProjectorDisplayState, ProjectorSyncStatus } from '@/types/projector';

interface UseAgProjectorPageParams {
  agId: string;
  token: string;
}

export function useAgProjectorPage({ agId, token }: UseAgProjectorPageParams) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    isFullscreen,
    data,
    syncStatus,
    displayState,
    lastSyncTime,
    error,
    isValidToken,
    toggleFullscreen,
    toggleTheme,
  };
}
