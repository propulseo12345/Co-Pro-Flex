import { createClient } from '@/lib/supabase/client';

const createUntypedClient = () => createClient() as any;

// ═══ COPROPRIETE ═══

export interface CoproCreate {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  nombre_batiments?: number;
  annee_construction?: number;
  siret_syndic?: string;
  exercice_debut?: string;
}

export async function createCopropriete(payload: CoproCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('copros')
    .insert({
      name: payload.name.trim(),
      address: payload.address.trim(),
      city: payload.city.trim(),
      postal_code: payload.postal_code.trim(),
      nombre_batiments: payload.nombre_batiments || 1,
      annee_construction: payload.annee_construction || null,
      siret_syndic: payload.siret_syndic?.trim() || null,
      exercice_debut: payload.exercice_debut || '01-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; name: string }, error: null };
}

// ═══ COPROPRIETAIRES ═══

export interface CoproprietaireCreate {
  copro_id: string;
  last_name: string;
  first_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_resident?: boolean;
  communication_preference?: 'email' | 'courrier' | 'les_deux';
}

export async function createCoproprietaire(payload: CoproprietaireCreate) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('coproprietaires')
    .insert({
      copro_id: payload.copro_id,
      last_name: payload.last_name.trim(),
      first_name: payload.first_name?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      is_resident: payload.is_resident ?? true,
      communication_preference: payload.communication_preference || 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, last_name, first_name')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; last_name: string; first_name: string | null }, error: null };
}

export async function listCoproprietaires(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('coproprietaires')
    .select('id, last_name, first_name, email, phone, is_resident')
    .eq('copro_id', coproId)
    .order('last_name', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; last_name: string; first_name: string | null; email: string | null; phone: string | null; is_resident: boolean }>, error: null };
}

export async function deleteCoproprietaire(id: string) {
  const supabase = createUntypedClient();
  const { error } = await supabase.from('coproprietaires').delete().eq('id', id);
  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

// ═══ COMPTES BANCAIRES ═══

export interface CompteCreate {
  copro_id: string;
  label: string;
  type: 'courant' | 'fonds_travaux';
  banque?: string;
  iban?: string;
  bic?: string;
  solde_initial?: number;
}

export async function createCompteBancaire(payload: CompteCreate) {
  const supabase = createUntypedClient();
  const accountNumber = payload.type === 'courant' ? '512000' : '512100';
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      copro_id: payload.copro_id,
      account_number: accountNumber,
      label: payload.label.trim(),
      account_type: 'bank',
      banque: payload.banque?.trim() || null,
      iban: payload.iban?.trim().replace(/\s/g, '') || null,
      bic: payload.bic?.trim() || null,
      initial_balance: payload.solde_initial || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, label')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string; label: string }, error: null };
}

export async function listComptesBancaires(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, label, account_number, banque, iban, bic, initial_balance')
    .eq('copro_id', coproId)
    .eq('account_type', 'bank')
    .order('account_number', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; label: string; account_number: string; banque: string | null; iban: string | null; bic: string | null; initial_balance: number }>, error: null };
}
