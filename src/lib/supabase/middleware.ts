import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  // This is important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // SÉCURITÉ (audit 2026-06-12) : ALLOWLIST, plus de denylist.
  // L'ancienne liste de préfixes « protégés » oubliait /conformite, /contentieux,
  // /conseil-syndical, /dossiers, /legal, /sales, /agenda, /facturation, /modeles,
  // /onboarding, /parametres-cabinet, /prestataires, /reporting — chargés par un
  // anonyme. Désormais : tout est protégé SAUF ce qui est explicitement public.
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/auth');

  const PUBLIC_PREFIXES = [
    '/auth',
    // pages vitrines (groupe (marketing))
    '/a-propos', '/blog', '/cgu', '/comment-ca-marche', '/comparaison',
    '/confidentialite', '/contact', '/faq', '/mentions-legales', '/securite', '/tarifs',
  ];
  const isPublicRoute =
    pathname === '/' ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Les routes /api gèrent leur propre auth (webhooks signés, etc.) : pas de
  // redirection HTML, elles répondent en JSON.
  const isApiRoute = pathname.startsWith('/api');

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/portefeuille';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
