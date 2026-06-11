import { NextResponse } from 'next/server';
import { listInstitutions } from '@/lib/banking/gocardless';
import { requireAnyManager } from '@/lib/security/authz';

export async function GET() {
  // SÉCURITÉ (audit 2026-06-12) : sans garde, épuisement anonyme du quota
  // GoCardless (DoS de la connexion bancaire). Gestionnaire requis.
  const authz = await requireAnyManager();
  if (authz.status !== 200) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const institutions = await listInstitutions('FR');

    // Retourner un sous-ensemble utile (nom, logo, bic)
    const result = institutions.map(i => ({
      id: i.id,
      name: i.name,
      logo: i.logo,
      bic: i.bic,
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
