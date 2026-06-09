import type { ResolutionTemplate } from '@/lib/constants/resolutions';

/** Ligne système prête pour le seed (sous-ensemble des colonnes de resolution_templates). */
export interface SeedRow {
  code: string;
  titre: string;
  categorie: string;
  texte: string;
  majorite: string;
  is_information: boolean;
  applicable_ag: string[] | null;
  obligatoire_pour: string[];
  ordre_suggere: number | null;
  tags: string[];
  variables: string[];
  variables_typees: unknown[];
  legal_ref: string | null;
  action_type: string | null;
}

/**
 * Corrections structurelles décidées (spec §4.2). Chaque entrée patche une ligne par `code`.
 * AUCUN nouvel action_type (gel assumé).
 */
const CLEANUPS: Record<string, Partial<SeedRow>> = {
  // (1) Catégorie hors-liste → libellé canonique court.
  'reglement-01': { categorie: 'Modification du règlement' },
  'reglement-02': { categorie: 'Modification du règlement' },
  'reglement-03': { categorie: 'Modification du règlement' },
  'reglement-04': { categorie: 'Modification du règlement' },
  'reglement-05': { categorie: 'Modification du règlement' },
  // (2) Dédoublonnage quitus : fin-10 requalifiée en prise d'acte (le quitus reste porté par ag-05).
  'fin-10': {
    titre: 'Prise d’acte de la situation de trésorerie',
    majorite: 'INFORMATION',
    is_information: true,
    ordre_suggere: null, // lève la collision ordre_suggere=6 avec ag-05
  },
  // (3) Majorités légales (loi 10/07/1965 art. 25 ; passerelle 25-1 gérée au vote).
  'cs-02': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
  'cs-04': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
  'cs-05': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
};

/** Convertit un modèle de la constante en ligne de seed, en appliquant les corrections. */
export function buildSystemSeed(bank: ResolutionTemplate[]): SeedRow[] {
  return bank.map((t) => {
    const base: SeedRow = {
      code: t.id,
      titre: t.titre,
      categorie: t.categorie,
      texte: t.texte,
      majorite: t.majorite,
      is_information: t.isInformation ?? t.majorite === 'INFORMATION',
      applicable_ag: t.applicable_ag ?? null,
      obligatoire_pour: t.obligatoire_pour ?? [],
      ordre_suggere: t.ordre_suggere ?? null,
      tags: t.tags ?? [],
      variables: t.variables ?? [],
      variables_typees: t.variablesTypees ?? [],
      legal_ref: t.legalRef ?? null,
      action_type: t.action_type ?? null,
    };
    return { ...base, ...CLEANUPS[t.id] };
  });
}

/** Échappe une chaîne pour un littéral SQL simple-quote. */
function sql(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Échappe un tableau de texte → littéral array Postgres, ou NULL. */
function sqlArr(a: string[] | null): string {
  if (a === null) return 'NULL';
  return `ARRAY[${a.map(sql).join(',')}]::text[]`;
}

/** Émet les INSERT du seed système (cabinet_id NULL, scope 'system'). */
export function toSeedSql(rows: SeedRow[]): string {
  const values = rows.map((r) =>
    `  (${sql(r.code)}, ${sql(r.titre)}, ${sql(r.categorie)}, ${sql(r.texte)}, ${sql(r.majorite)}, ` +
    `${r.is_information}, ${sqlArr(r.applicable_ag)}, ${sqlArr(r.obligatoire_pour)}, ` +
    `${r.ordre_suggere ?? 'NULL'}, ${sqlArr(r.tags)}, ${sqlArr(r.variables)}, ` +
    `${sql(JSON.stringify(r.variables_typees))}::jsonb, ` +
    `${r.legal_ref ? sql(r.legal_ref) : 'NULL'}, ${r.action_type ? sql(r.action_type) : 'NULL'})`
  ).join(',\n');
  return (
    `-- 0043_seed_resolution_templates.sql — GÉNÉRÉ par seed.ts (ne pas éditer à la main).\n` +
    `insert into public.resolution_templates\n` +
    `  (code, titre, categorie, texte, majorite, is_information, applicable_ag, obligatoire_pour,\n` +
    `   ordre_suggere, tags, variables, variables_typees, legal_ref, action_type)\n` +
    `values\n${values};\n`
  );
}
