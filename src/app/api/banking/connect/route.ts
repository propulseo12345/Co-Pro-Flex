import { NextRequest, NextResponse } from 'next/server';
import { createRequisition } from '@/lib/banking/gocardless';
import { requireAnyManager } from '@/lib/security/authz';

export async function POST(request: NextRequest) {
  // SÉCURITÉ (audit 2026-06-12) : sans garde, un anonyme créait des réquisitions
  // GoCardless (quota limité, redirectUrl libre). Gestionnaire requis.
  const authz = await requireAnyManager();
  if (authz.status !== 200) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const body = await request.json();
    const { institutionId, redirectUrl } = body as {
      institutionId: string;
      redirectUrl: string;
    };

    if (!institutionId || !redirectUrl) {
      return NextResponse.json(
        { error: 'institutionId and redirectUrl are required' },
        { status: 400 }
      );
    }

    const requisition = await createRequisition({
      institutionId,
      redirectUrl,
    });

    return NextResponse.json({
      requisitionId: requisition.id,
      link: requisition.link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[banking/connect]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
