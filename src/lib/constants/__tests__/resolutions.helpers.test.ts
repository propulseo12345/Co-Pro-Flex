import { describe, it, expect } from 'vitest';
import {
  RESOLUTIONS_BANK,
  getResolutionsObligatoires,
  getResolutionById,
  getResolutionByTitle,
  getResolutionsByCategorieForAGType,
} from '@/lib/constants/resolutions';

const ALL = RESOLUTIONS_BANK;

describe('helpers purs (liste injectée)', () => {
  it('getResolutionsObligatoires filtre par type', () => {
    const r = getResolutionsObligatoires(ALL, 'ORDINAIRE');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.obligatoire_pour?.includes('ORDINAIRE'))).toBe(true);
  });
  it('getResolutionById', () => {
    expect(getResolutionById(ALL, 'ag-01')?.titre).toContain('président');
  });
  it('getResolutionByTitle', () => {
    const t = getResolutionById(ALL, 'ag-01')!.titre;
    expect(getResolutionByTitle(ALL, t)?.id).toBe('ag-01');
  });
  it('getResolutionsByCategorieForAGType groupe par catégorie', () => {
    const g = getResolutionsByCategorieForAGType(ALL, 'ORDINAIRE');
    expect(Object.keys(g).length).toBeGreaterThan(0);
  });
});
