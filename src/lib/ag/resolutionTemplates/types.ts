import type { ResolutionTemplate } from '@/lib/constants/resolutions';

/** Ligne telle que stockée (sur-ensemble runtime de ResolutionTemplate + dimensions de tenance). */
export interface ResolutionTemplateRow extends ResolutionTemplate {
  cabinet_id: string | null;
  copro_id: string | null;
}

export interface CreateTemplatePayload {
  titre: string;
  categorie: string;
  texte: string;
  majorite: string;
  applicable_ag?: string[] | null;
  obligatoire_pour?: string[];
  tags?: string[];
  variables?: string[];
  variables_typees?: unknown[];
  is_information?: boolean;
}

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
