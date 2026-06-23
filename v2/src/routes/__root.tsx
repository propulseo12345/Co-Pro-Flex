import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { ReactNode } from 'react'

// Polices self-hostées (remplacent next/font)
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import '@fontsource/fira-code'

// Tokens du design system (source unique, copiés de l'app actuelle)
import appCss from '@/styles/globals.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var s=window.localStorage.getItem('coproflex-theme');var m=(s==='light'||s==='dark')?s:'dark';var r=document.documentElement;r.setAttribute('data-theme',m);r.style.colorScheme=m;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'CoProFlex' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {/* TODO châssis : envelopper {children} dans les providers (Theme > Copro > Toast > Sidebar) */}
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
