import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

// CSS Modules natifs via Vite (aucun Tailwind — décision : CSS Modules only).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tanstackStart(), viteReact()],
})
