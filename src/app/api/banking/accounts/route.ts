import { NextRequest, NextResponse } from 'next/server';
import { getRequisitionAccounts } from '@/lib/banking/gocardless';

export async function POST(request: NextRequest) {
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
