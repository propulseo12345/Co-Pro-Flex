import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { updateTemplate, deleteTemplate } from '@/lib/ag/resolutionTemplates/api';

beforeEach(() => mockFrom.mockReset());

describe('api gardes système', () => {
  it('updateTemplate refuse un modèle système (cabinet_id NULL)', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { cabinet_id: null }, error: null }) }) }),
    });
    const r = await updateTemplate('id-sys', { titre: 'x' });
    expect(r.success).toBe(false);
  });

  it('deleteTemplate refuse un modèle système', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { cabinet_id: null }, error: null }) }) }),
    });
    const r = await deleteTemplate('id-sys');
    expect(r.success).toBe(false);
  });
});
