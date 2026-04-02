import { NextResponse } from 'next/server';
import { listInstitutions } from '@/lib/banking/gocardless';

export async function GET() {
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
