import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Anti open-redirect : `${origin}${next}` permettrait `https://app@evil.com` si next='@evil.com'.
  // On n'accepte qu'un chemin INTERNE (commence par '/' mais pas '//' ni '/\'). Sinon -> /dashboard.
  const nextParam = searchParams.get('next') ?? '/dashboard';
  const next = /^\/(?![/\\])/.test(nextParam) ? nextParam : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}
