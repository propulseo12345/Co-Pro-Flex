import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FolderOpen,
  Folder,
  Users,
  Scale,
  FileSignature,
  Receipt,
  ClipboardCheck,
  Map,
  Mail,
  Wrench,
  Calculator,
  ClipboardList,
  Banknote,
  AlertTriangle,
  Home,
  User,
  Link2,
} from 'lucide-react';
import { DOCUMENT_CATEGORIES, CATEGORY_COLORS } from './constants';
import type { SearchFilters, DocumentWithRelevance } from './types';
import type { LinkedEntityType } from '@/lib/services/document-linking.service';

export function fuzzyMatch(text: string, query: string): { matches: boolean; score: number } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  if (textLower.includes(queryLower)) {
    return { matches: true, score: 100 };
  }

  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);
  const textWords = textLower.split(/[\s\-_\.]+/);

  let matchedWords = 0;
  for (const qWord of queryWords) {
    for (const tWord of textWords) {
      if (tWord.includes(qWord) || qWord.includes(tWord)) {
        matchedWords++;
        break;
      }
      if (qWord.length > 3 && tWord.length > 3) {
        const minLen = Math.min(qWord.length, tWord.length);
        let matching = 0;
        for (let i = 0; i < minLen; i++) {
          if (qWord[i] === tWord[i]) matching++;
        }
        if (matching / minLen > 0.7) {
          matchedWords += 0.5;
          break;
        }
      }
    }
  }

  if (matchedWords > 0) {
    return { matches: true, score: (matchedWords / queryWords.length) * 80 };
  }

  return { matches: false, score: 0 };
}

export function calculateRelevanceScore(doc: DocumentWithRelevance, query: string, filters: SearchFilters): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  const nameMatch = fuzzyMatch(doc.nom, query);
  if (nameMatch.matches) {
    score += nameMatch.score;
    if (doc.nom.toLowerCase().startsWith(queryLower)) {
      score += 20;
    }
  }

  const catLabel = getCategoryLabel(doc.categorie).toLowerCase();
  if (catLabel.includes(queryLower)) {
    score += 30;
  }

  const docDate = new Date(doc.dateAjout);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 30) score += 10;
  else if (daysDiff < 90) score += 5;

  if (filters.categories.length > 0 && filters.categories.includes(doc.categorie)) {
    score += 15;
  }

  return score;
}

export function getFileIcon(type: string, nom: string) {
  if (type === 'IMAGE' || nom.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return <ImageIcon size={28} aria-hidden="true" />;
  }
  if (nom.match(/\.(xlsx?|csv)$/i)) {
    return <FileSpreadsheet size={28} aria-hidden="true" />;
  }
  if (nom.match(/\.(zip|rar|7z)$/i)) {
    return <FolderOpen size={28} aria-hidden="true" />;
  }
  return <FileText size={28} aria-hidden="true" />;
}

export function getFolderIcon(iconName?: string, size = 24) {
  const icons: Record<string, React.ReactNode> = {
    Users: <Users size={size} />,
    Scale: <Scale size={size} />,
    FileSignature: <FileSignature size={size} />,
    Receipt: <Receipt size={size} />,
    ClipboardCheck: <ClipboardCheck size={size} />,
    Map: <Map size={size} />,
    Mail: <Mail size={size} />,
    Wrench: <Wrench size={size} />,
    Image: <ImageIcon size={size} />,
    Calculator: <Calculator size={size} />,
  };
  return iconName && icons[iconName] ? icons[iconName] : <Folder size={size} />;
}

export function getCategoryColor(categorie: string): string {
  return CATEGORY_COLORS[categorie] || CATEGORY_COLORS.AUTRE;
}

export function getCategoryLabel(categorie: string): string {
  const category = DOCUMENT_CATEGORIES.find((c) => c.value === categorie);
  return category ? category.label : categorie;
}

export function getLinkedEntityIcon(entityType: LinkedEntityType, size = 14) {
  const icons: Record<LinkedEntityType, React.ReactNode> = {
    FACTURE: <Receipt size={size} />,
    CONTRAT: <FileSignature size={size} />,
    ASSEMBLEE_GENERALE: <Users size={size} />,
    ORDRE_SERVICE: <ClipboardList size={size} />,
    APPEL_FONDS: <Banknote size={size} />,
    IMPAYE: <AlertTriangle size={size} />,
    INTERVENTION: <Wrench size={size} />,
    VENTE: <Home size={size} />,
    COPROPRIETAIRE: <User size={size} />,
  };
  return icons[entityType] || <Link2 size={size} />;
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.categories.length > 0 ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.sizeMin ||
    !!filters.sizeMax ||
    filters.fileTypes.length > 0
  );
}
