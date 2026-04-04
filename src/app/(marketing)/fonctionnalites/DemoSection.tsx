'use client';

import type { ReactNode } from 'react';
import { DemoThemeProvider } from '@/components/features/accueil/DemoThemeContext';
import { DemoThemeWrapper } from '@/components/features/accueil/DemoThemeWrapper';

export function DemoSection({ children }: { children: ReactNode }) {
  return (
    <DemoThemeProvider>
      <DemoThemeWrapper>
        {children}
      </DemoThemeWrapper>
    </DemoThemeProvider>
  );
}
