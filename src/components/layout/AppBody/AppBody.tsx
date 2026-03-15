'use client';

import { useSidebar } from '@/providers/SidebarContext';

export function AppBody({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className="app-body"
      style={{ '--sidebar-nav-width': collapsed ? '52px' : '220px' } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
