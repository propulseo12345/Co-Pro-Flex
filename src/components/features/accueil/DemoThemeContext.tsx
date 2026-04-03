'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type DemoTheme = 'dark' | 'light';

const DemoThemeContext = createContext<{
  demoTheme: DemoTheme;
  toggleDemoTheme: () => void;
}>({
  demoTheme: 'dark',
  toggleDemoTheme: () => {},
});

export function DemoThemeProvider({ children }: { children: ReactNode }) {
  const [demoTheme, setDemoTheme] = useState<DemoTheme>('light');
  const toggleDemoTheme = () => setDemoTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <DemoThemeContext.Provider value={{ demoTheme, toggleDemoTheme }}>
      {children}
    </DemoThemeContext.Provider>
  );
}

export function useDemoTheme() {
  return useContext(DemoThemeContext);
}
