import { NextRequest, NextResponse } from 'next/server';
import resend from '@/lib/mail/resend';
import { createClient } from '@/lib/supabase/server';

// Adresse expéditrice — à configurer avec un domaine vérifié dans Resend
// En développement, Resend autorise l'envoi depuis onboarding@resend.dev vers le compte propriétaire
const FROM_EMAIL = process.env.MAIL_FROM_ADDRESS ?? 'onboarding@resend.dev';
const FROM_NAME = process.env.MAIL_FROM_NAME ?? 'CoProFlex Syndic';

// ID propriétaire par défaut (profil syndic) — utilisé tant que l'auth n'est pas implémentée
const DEFAULT_OWNER_ID = 'f76855bb-62c3-4040-8fc6-7586080be9fb';

interface MailParticipant {
  name: string;
  email: string;
}

interface SendMailBody {
  to: MailParticipant[];
  cc?: MailParticipant[];
  subject: string;
  body: string;
  coproId: string;
  replyToId?: string;
}

export async function POST(req: NextRequest) {
  const raw: SendMailBody = await req.json();
  const { to, cc, subject, body, coproId, replyToId } = raw;

  if (!to?.length || !subject?.trim() || !body?.trim() || !coproId) {
    return NextResponse.json(
      { error: 'Champs requis manquants (to, subject, body, coproId)' },
      { status: 400 }
    );
  }

  // Envoi via Resend
  const { data: resendData, error: resendError } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: to.map((r) => r.email),
    cc: cc?.length ? cc.map((r) => r.email) : undefined,
    subject,
    text: body,
  });

  if (resendError) {
    return NextResponse.json({ error: resendError.message }, { status: 502 });
  }

  // Sauvegarde dans Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const now = new Date().toISOString();

  const { data: mail, error: dbError } = await supabase
    .from('mails')
    .insert({
      copro_id: coproId,
      owner_id: DEFAULT_OWNER_ID,
      from_email: FROM_EMAIL,
      from_name: FROM_NAME,
      to_emails: to,
      cc_emails: cc ?? [],
      subject,
      body,
      body_html: null,
      attachments: null,
      status: 'sent',
      is_read: true,
      is_starred: false,
      is_archived: false,
      is_deleted: false,
      label_ids: null,
      in_reply_to: replyToId ?? null,
      thread_id: null,
      resend_id: resendData?.id ?? null,
      sent_at: now,
      received_at: null,
      deleted_at: null,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ id: mail.id, resendId: resendData?.id });
}
