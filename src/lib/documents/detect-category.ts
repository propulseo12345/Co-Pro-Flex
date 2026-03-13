import type { DocumentCategory } from './api';

interface CategoryRule {
  patterns: RegExp[];
  category: DocumentCategory;
}

const FILENAME_RULES: CategoryRule[] = [
  { patterns: [/facture/i, /invoice/i], category: 'facture' },
  { patterns: [/\bPV\b/i, /proc[eè]s/i], category: 'pv_ag' },
  { patterns: [/contrat/i], category: 'contrat' },
  { patterns: [/devis/i], category: 'devis' },
  { patterns: [/diagnostic/i, /\bDPE\b/i], category: 'diagnostic' },
  { patterns: [/convocation/i], category: 'convocation' },
  { patterns: [/relance/i], category: 'courrier' },
  { patterns: [/assurance/i], category: 'assurance' },
  { patterns: [/budget/i], category: 'budget' },
  { patterns: [/appel.*fonds/i], category: 'appel_fonds' },
];

export function detectCategory(
  fileName: string,
  folderCategoryDefault?: DocumentCategory | null
): DocumentCategory {
  // Priority 1: filename patterns
  for (const rule of FILENAME_RULES) {
    if (rule.patterns.some(p => p.test(fileName))) {
      return rule.category;
    }
  }

  // Priority 2: folder's default category
  if (folderCategoryDefault) {
    return folderCategoryDefault;
  }

  // Fallback
  return 'autre';
}
