import { NextRequest, NextResponse } from 'next/server';
import resend from '@/lib/mail/resend';
import { createClient } from '@/lib/supabase/server';

// Adresse expéditrice — à configurer avec un domaine vérifié dans Resend
// En développement, Resend autorise l'envoi depuis onboarding@resend.dev vers le compte propriétaire
const FROM_EMAIL = process.env.MAIL_FROM_ADDRESS ?? 'onboarding@resend.dev';
const FROM_NAME = process.env.MAIL_FROM_NAME ?? 'CoProFlex Syndic';

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

  // Propriétaire = utilisateur de session (la route porte les cookies d'auth).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAuth = (await createClient()) as any;
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
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

  // Sauvegarde dans Supabase (même client porteur de session que ci-dessus).
  const supabase = supabaseAuth;
  const now = new Date().toISOString();

  const { data: mail, error: dbError } = await supabase
    .from('mails')
    .insert({
      copro_id: coproId,
      owner_id: user.id,
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
