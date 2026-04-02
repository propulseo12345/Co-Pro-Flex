import { NextRequest, NextResponse } from 'next/server';
import { createRequisition } from '@/lib/banking/gocardless';

export async function POST(request: NextRequest) {
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
