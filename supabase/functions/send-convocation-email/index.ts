import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { log } from '../_shared/log.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'convocations@coproflex.fr';

interface RequestBody {
  to: string;
  subject: string;
  recipientName: string;
  pdfBase64: string;
  fileName: string;
  agId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { to, subject, recipientName, pdfBase64, fileName } = body;

    if (!to || !pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      // Mode stub : pas de cle API configuree
      log.info("[STUB] Email convocation", { to, fileName });
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `stub-${Date.now()}`,
          stub: true,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Envoi reel via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `
          <p>Madame, Monsieur ${recipientName},</p>
          <p>Veuillez trouver ci-joint la convocation a l'Assemblee Generale de votre copropriete.</p>
          <p>Nous vous prions de bien vouloir en prendre connaissance et de vous presenter a la date et l'heure indiquees, ou de vous faire representer par un mandataire muni d'un pouvoir.</p>
          <p>Cordialement,<br/>Le Syndic</p>
          <hr/>
          <p style="font-size: 0.8em; color: #666;">Ce message a ete envoye automatiquement par CoProFlex.</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'Resend error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
