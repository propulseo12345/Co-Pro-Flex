import { NextRequest, NextResponse } from 'next/server';
import { getRequisitionAccounts } from '@/lib/banking/gocardless';
import { requireAnyManager } from '@/lib/security/authz';

export async function POST(request: NextRequest) {
  // SÉCURITÉ (audit 2026-06-12) : cette route renvoie IBAN + titulaire + soldes.
  // Sans garde, quiconque détenait un requisitionId (UUID qui transite en clair
  // dans les URLs) lisait les données bancaires (IDOR anonyme). Gestionnaire requis.
  // TODO (parqué DECISIONS_AUTONOMIE) : lier requisitionId↔copro en base pour un
  // contrôle d'appartenance fin, pas seulement un contrôle de rôle.
  const authz = await requireAnyManager();
  if (authz.status !== 200) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const body = await request.json();
    const { requisitionId } = body as { requisitionId: string };

    if (!requisitionId) {
      return NextResponse.json(
        { error: 'requisitionId is required' },
        { status: 400 }
      );
    }

    const accounts = await getRequisitionAccounts(requisitionId);

    return NextResponse.json({ accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[banking/accounts]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
