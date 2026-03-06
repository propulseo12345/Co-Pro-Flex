'use client';

import { useCallback } from 'react';
import {
  Paperclip, FileText, Calculator, FileCheck,
  ClipboardList, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import styles from './ConvocationAnnexesSection.module.css';

export interface AnnexeItem {
  id: string;
  label: string;
  description: string;
  obligatoire: boolean;
  included: boolean;
  category: 'legal' | 'comptable' | 'contextuel';
}

interface ConvocationAnnexesSectionProps {
  annexes: AnnexeItem[];
  onToggle: (id: string) => void;
  agType: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
}

const CATEGORY_LABELS: Record<AnnexeItem['category'], string> = {
  legal: 'Documents obligatoires',
  comptable: 'Annexes comptables',
  contextuel: 'Documents complémentaires',
};

const CATEGORY_ICONS: Record<AnnexeItem['category'], typeof FileText> = {
  legal: FileCheck,
  comptable: Calculator,
  contextuel: ClipboardList,
};

export function ConvocationAnnexesSection({
  annexes,
  onToggle,
  agType,
}: ConvocationAnnexesSectionProps) {
  const includedCount = annexes.filter((a) => a.included).length;
  const obligatoiresManquantes = annexes.filter((a) => a.obligatoire && !a.included);

  const groupedByCategory = annexes.reduce<Record<string, AnnexeItem[]>>((acc, annexe) => {
    if (!acc[annexe.category]) acc[annexe.category] = [];
    acc[annexe.category].push(annexe);
    return acc;
  }, {});

  const categoryOrder: AnnexeItem['category'][] = ['legal', 'comptable', 'contextuel'];

  const handleToggle = useCallback((id: string, obligatoire: boolean) => {
    if (obligatoire) return;
    onToggle(id);
  }, [onToggle]);

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Paperclip size={22} aria-hidden="true" />
          Documents annexés
        </h2>
        <span className={styles.count}>
          {includedCount} document{includedCount > 1 ? 's' : ''} joint{includedCount > 1 ? 's' : ''}
        </span>
      </div>

      {obligatoiresManquantes.length > 0 && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {obligatoiresManquantes.length} document{obligatoiresManquantes.length > 1 ? 's' : ''} obligatoire{obligatoiresManquantes.length > 1 ? 's' : ''} non inclus
          </span>
        </div>
      )}

      {categoryOrder.map((category) => {
        const items = groupedByCategory[category];
        if (!items || items.length === 0) return null;

        const CategoryIcon = CATEGORY_ICONS[category];
        return (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>
              <CategoryIcon size={16} aria-hidden="true" />
              {CATEGORY_LABELS[category]}
            </h3>
            <div className={styles.annexeList}>
              {items.map((annexe) => (
                <button
                  key={annexe.id}
                  type="button"
                  className={`${styles.annexeItem} ${annexe.included ? styles.annexeItemIncluded : ''} ${annexe.obligatoire ? styles.annexeItemObligatoire : ''}`}
                  onClick={() => handleToggle(annexe.id, annexe.obligatoire)}
                  disabled={annexe.obligatoire}
                  title={annexe.obligatoire ? 'Document obligatoire (ne peut pas être retiré)' : annexe.description}
                >
                  <div className={styles.annexeCheck}>
                    {annexe.included ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : (
                      <div className={styles.uncheckedCircle} />
                    )}
                  </div>
                  <div className={styles.annexeInfo}>
                    <span className={styles.annexeLabel}>{annexe.label}</span>
                    <span className={styles.annexeDesc}>{annexe.description}</span>
                  </div>
                  {annexe.obligatoire && (
                    <span className={styles.obligatoireBadge}>Obligatoire</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p className={styles.legalNote}>
        Art. 11 du décret du 17 mars 1967 — La convocation doit être accompagnée des documents
        nécessaires à l&apos;information des copropriétaires.
      </p>
    </div>
  );
}
