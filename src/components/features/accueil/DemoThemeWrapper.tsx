'use client';

import { type ReactNode } from 'react';
import { useDemoTheme } from './DemoThemeContext';

interface DemoThemeWrapperProps {
  children: ReactNode;
  className?: string;
}

export function DemoThemeWrapper({ children, className }: DemoThemeWrapperProps) {
  const { demoTheme } = useDemoTheme();

  return (
    <div className={className} data-demo-theme={demoTheme}>
      {children}
    </div>
  );
}
