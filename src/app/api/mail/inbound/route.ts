import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyHmacSignature } from '@/lib/security/authz';

// Copropriété cible des e-mails entrants, via config (remplace l'ancien hardcode de la copro
// gelée). Le mapping fin adresse destinataire → copro relève de J2.5 (règle métier à figer).
const INBOUND_COPRO_ID = process.env.MAIL_INBOUND_COPRO_ID ?? '';

// Secret de signature du webhook entrant (dashboard Resend → Webhooks → Signing secret).
// SÉCURITÉ (audit 2026-06-12) : sans cette vérification, n'importe qui sur Internet
// pouvait injecter un faux mail (phishing) dans la boîte de la copro, en service_role.
const INBOUND_SECRET = process.env.RESEND_INBOUND_SECRET ?? '';

// Webhook Resend pour les emails entrants
// À configurer dans le dashboard Resend : Settings → Inbound → URL de ce endpoint
export async function POST(req: NextRequest) {
  if (!INBOUND_SECRET) {
    // Refus dur : un webhook non signé ne doit JAMAIS écrire en base.
    return NextResponse.json(
      { error: 'RESEND_INBOUND_SECRET non configurée : webhook entrant désactivé.' },
      { status: 503 }
    );
  }

  // La signature couvre le corps BRUT : lire le texte avant tout parse.
  const rawBody = await req.text();
  const signature = req.headers.get('svix-signature');
  const isValid = await verifyHmacSignature(rawBody, signature, INBOUND_SECRET);
  if (!isValid) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = JSON.parse(rawBody);

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

  if (!INBOUND_COPRO_ID) {
    return NextResponse.json(
      { error: 'MAIL_INBOUND_COPRO_ID non configurée : impossible de router l\'e-mail entrant.' },
      { status: 503 }
    );
  }

  // Webhook = appel machine SANS session → client service_role (l'insert anon serait bloqué par
  // la RLS de `mails`). Propriétaire = un gestionnaire de la copro cible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const { data: manager } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('copro_id', INBOUND_COPRO_ID)
    .eq('role', 'gestionnaire')
    .limit(1)
    .maybeSingle();

  if (!manager?.user_id) {
    return NextResponse.json(
      { error: 'Aucun gestionnaire rattaché à la copro cible de l\'e-mail entrant.' },
      { status: 422 }
    );
  }

  const { error } = await supabase.from('mails').insert({
    copro_id: INBOUND_COPRO_ID,
    owner_id: manager.user_id,
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
