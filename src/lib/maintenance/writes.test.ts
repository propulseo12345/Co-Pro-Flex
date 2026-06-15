/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  createProvider,
  createContract,
  createLogbookEntry,
  resolveDomainIds,
} from './writes';

/**
 * Mock minimal d'un client Supabase qui :
 *  - résout `work_domain` (slug -> id) selon `domains` ;
 *  - capture les `insert(...)` pour qu'on vérifie le payload cible.
 */
function makeSupabaseMock(opts: { domains?: Record<string, string> } = {}) {
  const domains = opts.domains ?? {};
  const inserts: { table: string; payload: any }[] = [];

  const client = {
    from(table: string) {
      if (table === 'work_domain') {
        return {
          select() {
            return this;
          },
          in(_col: string, slugs: string[]) {
            const data = slugs
              .filter((s) => s in domains)
              .map((s) => ({ id: domains[s], slug: s }));
            return Promise.resolve({ data, error: null });
          },
        };
      }
      return {
        insert(payload: any) {
          inserts.push({ table, payload });
          return {
            select() {
              return this;
            },
            single() {
              return Promise.resolve({ data: { id: 'new-id', ...payload }, error: null });
            },
          };
        },
      };
    },
  };

  return { client, inserts };
}

describe('maintenance/writes — traduction legacy -> schéma cible', () => {
  it('createProvider insère dans `tiers` (is_provider) et traduit category + domaines', async () => {
    const { client, inserts } = makeSupabaseMock({ domains: { ascenseur: 'dom-asc' } });

    await createProvider(client, 'copro-1', {
      name: 'Schindler',
      category: 'coproflex',
      domains: ['ascenseur'],
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('tiers');
    expect(inserts[0].payload).toMatchObject({
      copro_id: 'copro-1',
      is_provider: true,
      name: 'Schindler',
      category: 'externe', // coproflex -> externe
      domain_ids: ['dom-asc'], // slug -> id
    });
  });

  it('createContract traduit provider_id/title/contract_type/description vers les colonnes cibles', async () => {
    const { client, inserts } = makeSupabaseMock({ domains: { chauffage: 'dom-chauff' } });

    await createContract(client, 'copro-1', {
      provider_id: 'tiers-9',
      title: 'Contrat chaudière',
      contract_type: 'chauffage',
      description: 'Entretien annuel',
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      status: 'active',
    });

    expect(inserts[0].table).toBe('contracts');
    expect(inserts[0].payload).toMatchObject({
      copro_id: 'copro-1',
      tiers_id: 'tiers-9', // provider_id -> tiers_id
      label: 'Contrat chaudière', // title -> label
      domain_id: 'dom-chauff', // contract_type slug -> domain_id
      observations: 'Entretien annuel', // description -> observations
      start_date: '2026-01-01',
      status: 'active',
    });
    // Les alias legacy ne doivent PAS fuiter vers la base.
    expect(inserts[0].payload).not.toHaveProperty('title');
    expect(inserts[0].payload).not.toHaveProperty('provider_id');
    expect(inserts[0].payload).not.toHaveProperty('contract_type');
    expect(inserts[0].payload).not.toHaveProperty('description');
  });

  it('createLogbookEntry insère dans `logbook_entries` avec la copro injectée', async () => {
    const { client, inserts } = makeSupabaseMock();

    await createLogbookEntry(client, 'copro-1', {
      entry_type: 'maintenance',
      category: 'courante',
      title: 'Révision chaudière',
      happened_at: '2026-06-01',
      status: 'terminee',
    } as any);

    expect(inserts[0].table).toBe('logbook_entries');
    expect(inserts[0].payload).toMatchObject({
      copro_id: 'copro-1',
      entry_type: 'maintenance',
      status: 'terminee',
    });
  });

  it('resolveDomainIds échoue FORT sur un slug non seedé (pas de null silencieux)', async () => {
    const { client } = makeSupabaseMock({ domains: { ascenseur: 'dom-asc' } });
    await expect(resolveDomainIds(client, ['slug_inexistant'])).rejects.toThrow(/slug_inexistant/);
  });
});
