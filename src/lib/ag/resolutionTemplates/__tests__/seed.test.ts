import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { RESOLUTIONS_BANK } from '@/lib/constants/resolutions';
import { buildSystemSeed, toSeedSql } from '@/lib/ag/resolutionTemplates/seed';

describe('buildSystemSeed', () => {
  const seed = buildSystemSeed(RESOLUTIONS_BANK);
  const ALLOWED = new Set([
    'Assemblée Générale','Travaux','Finances','Conseil syndical et syndic','Contrats',
    'Action en justice','Impayés','Modification du règlement','Compteurs',
    'Règles de bonne conduite','Sécurité et conformité','Énergie et environnement',
    'Parking et espaces communs','Assurances','Copropriétaires','Divers',
  ]);

  it('toutes les catégories ∈ liste autorisée (corrige reglement-*)', () => {
    const bad = seed.filter((r) => !ALLOWED.has(r.categorie)).map((r) => r.code);
    expect(bad).toEqual([]);
  });

  it('renomme la catégorie longue des reglement-*', () => {
    expect(seed.find((r) => r.code === 'reglement-01')?.categorie).toBe('Modification du règlement');
  });

  it('applique les majorités légales (D-A)', () => {
    for (const code of ['cs-02', 'cs-04', 'cs-05']) {
      expect(seed.find((r) => r.code === code)?.majorite).toBe('ART_25');
    }
  });

  it('requalifie fin-10 en INFORMATION sans le mot quitus', () => {
    const r = seed.find((x) => x.code === 'fin-10');
    expect(r?.majorite).toBe('INFORMATION');
    expect(r?.titre.toLowerCase()).not.toContain('quitus');
    expect(r?.texte.toLowerCase()).not.toContain('quitus');
  });

  it('cardinalité figée (100 modèles, 0 dédoublonnage de code)', () => {
    expect(seed.length).toBe(100);
    expect(new Set(seed.map((r) => r.code)).size).toBe(100);
  });

  it('parité champ-à-champ avec la constante pour les champs non nettoyés', () => {
    const bankById = new Map(RESOLUTIONS_BANK.map((r) => [r.id, r]));
    const TOUCHED = new Set(['reglement-01','reglement-02','reglement-03','reglement-04','reglement-05','cs-02','cs-04','cs-05','fin-10']);
    for (const row of seed.filter((r) => !TOUCHED.has(r.code!))) {
      const src = bankById.get(row.code!);
      expect(src, `source ${row.code}`).toBeDefined();
      expect(row.titre).toBe(src!.titre);
      expect(row.categorie).toBe(src!.categorie);
      expect(row.majorite).toBe(src!.majorite);
      expect(row.action_type ?? null).toBe(src!.action_type ?? null);
      expect(row.obligatoire_pour ?? []).toEqual(src!.obligatoire_pour ?? []);
    }
  });

  it('émet 0043 (idempotent, source-contrôlé)', () => {
    const sqlText = toSeedSql(buildSystemSeed(RESOLUTIONS_BANK));
    writeFileSync('supabase/migrations/0043_seed_resolution_templates.sql', sqlText, 'utf8');
    expect(sqlText).toContain("insert into public.resolution_templates");
  });
});
