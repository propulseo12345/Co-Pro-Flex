// ============================================================================
// API Utils: Helpers communs pour les modules AG
// ============================================================================

import { createClient } from '@/lib/supabase/client';

/**
 * Helper: Create untyped client for tables/views not yet in generated types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createUntypedClient = () => createClient() as any;

/**
 * Helper pour appeler une edge function via le SDK Supabase
 * Utilise la méthode native functions.invoke qui gère mieux l'authentification
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  payload: object
): Promise<T> {
  const supabase = createUntypedClient();

  console.log(`[invokeEdgeFunction] Appel de ${functionName} via SDK...`);
  console.log(`[invokeEdgeFunction] Payload:`, JSON.stringify(payload).substring(0, 200));

  try {
    // Utiliser la méthode native du SDK Supabase
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`[invokeEdgeFunction] Erreur SDK:`, error);

      // Si c'est une erreur d'auth, suggérer de se reconnecter
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('auth')) {
        throw new Error('Session expirée - veuillez vous déconnecter et vous reconnecter');
      }

      throw new Error(error.message || 'Erreur lors de l\'appel à la fonction');
    }

    console.log(`[invokeEdgeFunction] Résultat:`, data);
    return data as T;

  } catch (err) {
    console.error(`[invokeEdgeFunction] Exception:`, err);

    // Si le SDK échoue, essayer avec fetch direct après refresh de session
    console.log(`[invokeEdgeFunction] Fallback vers fetch direct...`);

    // Rafraîchir la session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error('[invokeEdgeFunction] Impossible de rafraîchir la session:', refreshError.message);
      throw new Error('Session expirée - veuillez vous déconnecter et vous reconnecter');
    }

    const session = refreshData?.session;
    if (!session?.access_token) {
      throw new Error('Non authentifié - veuillez vous reconnecter');
    }

    console.log(`[invokeEdgeFunction] Session rafraîchie, user: ${session.user?.email}`);

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[invokeEdgeFunction] Fallback response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[invokeEdgeFunction] Fallback HTTP Error: ${response.status}`, errorText);
      throw new Error(`Erreur: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[invokeEdgeFunction] Fallback résultat:`, result);
    return result as T;
  }
}
