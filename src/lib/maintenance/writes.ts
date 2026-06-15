/**
 * Écritures canoniques de la maintenance — SOURCE UNIQUE.
 *
 * Fonctions PURES (le client Supabase et la copro sont injectés) partagées par :
 *   - le hook `useMaintenanceData` (copro = contexte courant) ;
 *   - l'onboarding (copro = celle en cours de configuration, passée en paramètre).
 *
 * Elles traduisent le contrat legacy du front vers le schéma cible :
 *   providers -> tiers (is_provider) · slugs work_domain -> domain_ids/domain_id ·
 *   title/contract_number/provider_id/description -> label/reference/tiers_id/observations.
 */

import type {
  Provider,
  ProviderInsert,
  Contract,
  LogbookEntry,
  LogbookEntryInsert,
  ProviderCategory,
} from '@/types/domain';

/** Écriture prestataire : colonnes `tiers` + domaines en slugs work_domain. */
export type ProviderWriteInput = Omit<ProviderInsert, 'domain_ids' | 'category'> & {
  category?: ProviderCategory | 'coproflex';
  domains?: string[];
};

/** Écriture contrat : colonnes cibles OU alias legacy encore utilisés par le front. */
export type ContractWriteInput = Partial<Contract> & {
  title?: string;            // -> label
  contract_number?: string;  // -> reference
  contract_type?: string;    // slug work_domain -> domain_id
  provider_id?: string;      // -> tiers_id
  description?: string;      // -> observations
};

/** Traduit des slugs work_domain en UUIDs ; échoue FORT si un slug n'est pas seedé. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveDomainIds(supabase: any, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from('work_domain')
    .select('id, slug')
    .in('slug', slugs);
  if (error) throw error;
  const found = (data || []) as { id: string; slug: string }[];
  const missing = slugs.filter((s) => !found.some((d) => d.slug === s));
  if (missing.length > 0) {
    // Pas de null silencieux : un slug UI non seedé doit échouer FORT.
    throw new Error(`Domaine(s) d'intervention inconnu(s) : ${missing.join(', ')} (référentiel work_domain)`);
  }
  return found.map((d) => d.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function translateProviderWrite(supabase: any, input: Partial<ProviderWriteInput>) {
  const { domains, category, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };
  if (category !== undefined) out.category = category === 'coproflex' ? 'externe' : category;
  // domains: [] est une désélection EXPLICITE -> domain_ids = [] ;
  // domains absent (undefined) -> on ne touche pas à la colonne.
  if (domains !== undefined) out.domain_ids = await resolveDomainIds(supabase, domains);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function translateContractWrite(supabase: any, input: ContractWriteInput) {
  const { title, contract_number, contract_type, provider_id, description, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };
  if (title !== undefined) out.label = title;
  if (contract_number !== undefined) out.reference = contract_number;
  if (provider_id !== undefined) out.tiers_id = provider_id;
  if (description !== undefined) out.observations = description;
  if (contract_type !== undefined) {
    if (!contract_type) {
      throw new Error('Type de contrat manquant (domain_id est obligatoire)');
    }
    const ids = await resolveDomainIds(supabase, [contract_type]);
    out.domain_id = ids[0];
  }
  return out;
}

/** Crée un prestataire (tiers is_provider). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createProvider(supabase: any, coproId: string, input: Omit<ProviderWriteInput, 'copro_id'>): Promise<Provider> {
  const translated = await translateProviderWrite(supabase, input);
  const { data, error } = await supabase
    .from('tiers')
    .insert({ ...translated, copro_id: coproId, is_provider: true })
    .select()
    .single();
  if (error) throw error;
  return data as Provider;
}

/** Crée un contrat de maintenance. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createContract(supabase: any, coproId: string, input: ContractWriteInput): Promise<Contract> {
  const translated = await translateContractWrite(supabase, input);
  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...translated, copro_id: coproId })
    .select()
    .single();
  if (error) throw error;
  return data as Contract;
}

/** Crée une entrée de carnet d'entretien (colonnes cibles attendues, pas de traduction). */
export async function createLogbookEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  coproId: string,
  entry: Omit<LogbookEntryInsert, 'copro_id'>
): Promise<LogbookEntry> {
  const { data, error } = await supabase
    .from('logbook_entries')
    .insert({ ...entry, copro_id: coproId })
    .select()
    .single();
  if (error) throw error;
  return data as LogbookEntry;
}
