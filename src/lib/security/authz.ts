import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Garde-fous d'autorisation pour les routes API (audit sécurité 2026-06-12).
 * La RLS protège la BASE ; ces helpers protègent les ACTIONS qui partent
 * vers l'extérieur (envoi d'emails, appels GoCardless) ou qui s'exécutent
 * en service_role — là où la RLS ne peut rien.
 */

export interface AuthzResult {
  user: User | null;
  /** Code HTTP à renvoyer si user est null ou non autorisé (401/403). */
  status: 401 | 403 | 200;
  error: string | null;
}

/** Session requise (peu importe le rôle). */
export async function requireUser(): Promise<AuthzResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, status: 401, error: 'Non authentifié' };
  }
  return { user, status: 200, error: null };
}

/**
 * Session + rôle gestionnaire (ou admin plateforme) SUR LA COPRO donnée.
 * S'appuie sur memberships via le client de session : la RLS ne laisse voir
 * à l'utilisateur que ses propres rattachements — pas d'énumération possible.
 */
export async function requireCoproManager(coproId: string): Promise<AuthzResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, status: 401, error: 'Non authentifié' };
  }

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('copro_id', coproId)
    .in('role', ['gestionnaire', 'platform_admin'])
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    return {
      user,
      status: 403,
      error: 'Accès refusé : vous ne gérez pas cette copropriété.',
    };
  }
  return { user, status: 200, error: null };
}

/**
 * Session + au moins UN rattachement gestionnaire (pour les routes sans copro
 * explicite, ex. connexion bancaire : on exige d'être un gestionnaire du
 * cabinet, pas un simple copropriétaire).
 */
export async function requireAnyManager(): Promise<AuthzResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, status: 401, error: 'Non authentifié' };
  }

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['gestionnaire', 'platform_admin'])
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    return { user, status: 403, error: 'Accès réservé aux gestionnaires.' };
  }
  return { user, status: 200, error: null };
}

/**
 * Vérification de signature HMAC SHA-256 (webhooks Resend/svix).
 * La signature couvre le corps BRUT de la requête — toujours vérifier
 * AVANT de parser le JSON.
 */
export async function verifyHmacSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    const hexMatch = signature.match(/.{1,2}/g);
    if (!hexMatch) return false;
    const signatureBuffer = new Uint8Array(hexMatch.map((byte) => parseInt(byte, 16)));
    return await crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(rawBody));
  } catch {
    return false;
  }
}
