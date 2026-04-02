import { NextRequest, NextResponse } from 'next/server';

/**
 * Callback après authentification bancaire.
 * GoCardless redirige ici avec ?ref=xxx
 * On redirige vers l'onboarding avec le requisitionId en query param.
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref') || '';

  // Rediriger vers l'onboarding step 4 avec le ref pour récupérer les comptes
  const redirectUrl = new URL('/onboarding', request.nextUrl.origin);
  redirectUrl.searchParams.set('bank_ref', ref);
  redirectUrl.searchParams.set('step', '4');

  return NextResponse.redirect(redirectUrl);
}
