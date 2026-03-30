import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ID propriétaire par défaut (profil syndic) — utilisé tant que l'auth n'est pas implémentée
const DEFAULT_OWNER_ID = 'f76855bb-62c3-4040-8fc6-7586080be9fb';
const DEFAULT_COPRO_ID = '11111111-aaaa-bbbb-cccc-111111111111';

// Webhook Resend pour les emails entrants
// À configurer dans le dashboard Resend : Settings → Inbound → URL de ce endpoint
export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await req.json();

  // Format Resend inbound : https://resend.com/docs/api-reference/webhooks/inbound-email
  const {
    from,
    to,
    cc,
    subject,
    text,
    html,
  } = payload;

  // Extraire email et nom de l'expéditeur
  const fromEmail: string =
    typeof from === 'string' ? from : (from?.email ?? '');
  const fromName: string =
    typeof from === 'object' ? (from?.name ?? fromEmail) : from;

  // Normaliser les destinataires
  const toEmails = Array.isArray(to)
    ? to.map((r: string | { email: string; name?: string }) =>
        typeof r === 'string' ? { email: r, name: r } : r
      )
    : [{ email: String(to), name: String(to) }];

  const ccEmails = Array.isArray(cc)
    ? cc.map((r: string | { email: string; name?: string }) =>
        typeof r === 'string' ? { email: r, name: r } : r
      )
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { error } = await supabase.from('mails').insert({
    copro_id: DEFAULT_COPRO_ID,
    owner_id: DEFAULT_OWNER_ID,
    from_email: fromEmail,
    from_name: fromName,
    to_emails: toEmails,
    cc_emails: ccEmails,
    subject: subject ?? '(Sans objet)',
    body: text ?? '',
    body_html: html ?? null,
    attachments: null,
    status: 'received',
    is_read: false,
    is_starred: false,
    is_archived: false,
    is_deleted: false,
    label_ids: null,
    in_reply_to: null,
    thread_id: null,
    resend_id: null,
    sent_at: null,
    received_at: new Date().toISOString(),
    deleted_at: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
