'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle, FileCheck, ClipboardList, ShieldCheck, File,
  AlertCircle, Clock, CheckCircle, FileText, Calendar,
  ChevronDown, Eye, Download, Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import type { DocumentTechnique, TypeDocumentTechnique } from '@/types';
import styles from '@/app/(dashboard)/documents/ged/ged.module.css';

// ================================
// Types
// ================================

type TechnicalDocCategory = 'DTA' | 'DIAGNOSTICS' | 'CONTROLES' | 'GARANTIES' | 'AUTRES';

interface DocumentsByCategory {
  DTA: DocumentTechnique[];
  DIAGNOSTICS: DocumentTechnique[];
  CONTROLES: DocumentTechnique[];
  GARANTIES: DocumentTechnique[];
  AUTRES: DocumentTechnique[];
}

interface DocumentStats {
  total: number;
  expired: number;
  expiring: number;
  valid: number;
}

// ================================
// Helpers
// ================================

const CATEGORIES_DOCUMENTS: Record<string, TypeDocumentTechnique[]> = {
  DTA: ['DTA'],
  DIAGNOSTICS: ['DIAGNOSTIC_PLOMB', 'DIAGNOSTIC_ELECTRICITE', 'DIAGNOSTIC_GAZ', 'DPE_COLLECTIF'],
  CONTROLES: ['CONTROLE_ASCENSEUR', 'CONTROLE_EXTINCTEURS', 'CONTROLE_CHAUFFERIE', 'RAPPORT_SECURITE'],
  GARANTIES: ['GARANTIE_DECENNALE', 'GARANTIE_PARFAIT_ACHEVEMENT'],
};

function isDocumentExpired(dateValidite?: string): boolean {
  if (!dateValidite) return false;
  return new Date(dateValidite) < new Date();
}

function isDocumentExpiringSoon(dateValidite?: string): boolean {
  if (!dateValidite) return false;
  const validite = new Date(dateValidite);
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  return validite > now && validite <= ninetyDaysFromNow;
}

function getCategorieDocLabel(cat: string): string {
  const labels: Record<string, string> = {
    DTA: 'DTA (Dossier Technique Amiante)',
    DIAGNOSTICS: 'Diagnostics reglementaires',
    CONTROLES: 'Rapports de controle',
    GARANTIES: 'Garanties travaux',
    AUTRES: 'Autres documents',
  };
  return labels[cat] || 'Autres';
}

function getTypeDocLabel(type: TypeDocumentTechnique): string {
  const labels: Record<TypeDocumentTechnique, string> = {
    DTA: 'DTA',
    DIAGNOSTIC_PLOMB: 'Diagnostic plomb',
    DIAGNOSTIC_ELECTRICITE: 'Diagnostic electricite',
    DIAGNOSTIC_GAZ: 'Diagnostic gaz',
    DPE_COLLECTIF: 'DPE collectif',
    CONTROLE_ASCENSEUR: 'Controle ascenseur',
    CONTROLE_EXTINCTEURS: 'Controle extincteurs',
    CONTROLE_CHAUFFERIE: 'Controle chaufferie',
    GARANTIE_DECENNALE: 'Garantie decennale',
    GARANTIE_PARFAIT_ACHEVEMENT: 'Garantie parfait achevement',
    RAPPORT_SECURITE: 'Rapport securite',
    AUTRE: 'Autre',
  };
  return labels[type] || type;
}

function groupByCategory(docs: DocumentTechnique[]): DocumentsByCategory {
  const result: DocumentsByCategory = {
    DTA: [], DIAGNOSTICS: [], CONTROLES: [], GARANTIES: [], AUTRES: [],
  };
  for (const doc of docs) {
    let placed = false;
    for (const [cat, types] of Object.entries(CATEGORIES_DOCUMENTS)) {
      if (types.includes(doc.type)) {
        result[cat as TechnicalDocCategory].push(doc);
        placed = true;
        break;
      }
    }
    if (!placed) {
      result.AUTRES.push(doc);
    }
  }
  return result;
}

function computeStats(docs: DocumentTechnique[]): DocumentStats {
  let expired = 0;
  let expiring = 0;
  let valid = 0;
  for (const doc of docs) {
    if (isDocumentExpired(doc.dateValidite)) expired++;
    else if (isDocumentExpiringSoon(doc.dateValidite)) expiring++;
    else valid++;
  }
  return { total: docs.length, expired, expiring, valid };
}

// ================================
// Mock data
// ================================

const MOCK_TECHNICAL_DOCUMENTS: DocumentTechnique[] = [
  {
    id: 'ged-dt1',
    nom: 'Dossier Technique Amiante (DTA)',
    type: 'DTA',
    dateAjout: '2023-05-15',
    dateValidite: '2026-05-15',
    url: '#',
    observations: 'Presence amiante detectee dans les conduits de vide-ordures (hors d\'usage)',
  },
  {
    id: 'ged-dt2',
    nom: 'Diagnostic Plomb Parties Communes',
    type: 'DIAGNOSTIC_PLOMB',
    dateAjout: '2023-06-10',
    url: '#',
    observations: 'Absence de plomb detectee',
  },
  {
    id: 'ged-dt3',
    nom: 'Diagnostic Electrique Parties Communes',
    type: 'DIAGNOSTIC_ELECTRICITE',
    dateAjout: '2024-10-05',
    dateValidite: '2027-10-05',
    url: '#',
    observations: 'Non-conformites relevees: tableau electrique a moderniser',
  },
  {
    id: 'ged-dt4',
    nom: 'Diagnostic Gaz - Chaudiere collective',
    type: 'DIAGNOSTIC_GAZ',
    dateAjout: '2024-08-20',
    dateValidite: '2027-08-20',
    url: '#',
    observations: 'Installation conforme. Controle annuel a effectuer',
  },
  {
    id: 'ged-dt5',
    nom: 'DPE Collectif',
    type: 'DPE_COLLECTIF',
    dateAjout: '2023-03-12',
    dateValidite: '2033-03-12',
    url: '#',
    observations: 'Classe energetique: D. Amelioration possible avec isolation toiture',
  },
  {
    id: 'ged-dt6',
    nom: 'Rapport Controle Periodique Ascenseur',
    type: 'CONTROLE_ASCENSEUR',
    dateAjout: '2024-11-15',
    dateValidite: '2025-05-15',
    url: '#',
    observations: 'Controle quinquennal satisfaisant. Prochaine visite planifiee',
  },
  {
    id: 'ged-dt7',
    nom: 'Controle Extincteurs',
    type: 'CONTROLE_EXTINCTEURS',
    dateAjout: '2024-09-10',
    dateValidite: '2025-09-10',
    url: '#',
    observations: '6 extincteurs verifies. Tous conformes',
  },
  {
    id: 'ged-dt8',
    nom: 'Controle Chaufferie Annuel',
    type: 'CONTROLE_CHAUFFERIE',
    dateAjout: '2024-09-05',
    dateValidite: '2025-04-05',
    url: '#',
    observations: 'Installation conforme. Rendement combustion: 91%',
  },
  {
    id: 'ged-dt9',
    nom: 'Garantie Decennale - Toiture (Travaux 2022)',
    type: 'GARANTIE_DECENNALE',
    dateAjout: '2022-07-20',
    dateValidite: '2032-07-20',
    url: '#',
    observations: 'Travaux refection partielle toiture. Entreprise: Toiture Expert Lyon',
  },
  {
    id: 'ged-dt10',
    nom: 'Garantie Parfait Achevement - Ravalement Bat. B',
    type: 'GARANTIE_PARFAIT_ACHEVEMENT',
    dateAjout: '2023-06-15',
    dateValidite: '2024-06-15',
    url: '#',
    observations: 'Expiree. Travaux conformes, aucun defaut constate',
  },
  {
    id: 'ged-dt11',
    nom: 'Rapport Securite Incendie',
    type: 'RAPPORT_SECURITE',
    dateAjout: '2024-01-20',
    dateValidite: '2025-01-20',
    url: '#',
    observations: 'Mise en conformite SSI effectuee',
  },
];

// ================================
// Category icon helper
// ================================

function CategoryIcon({ category }: { category: TechnicalDocCategory }) {
  switch (category) {
    case 'DTA': return <AlertTriangle size={18} aria-hidden="true" />;
    case 'DIAGNOSTICS': return <FileCheck size={18} aria-hidden="true" />;
    case 'CONTROLES': return <ClipboardList size={18} aria-hidden="true" />;
    case 'GARANTIES': return <ShieldCheck size={18} aria-hidden="true" />;
    case 'AUTRES': return <File size={18} aria-hidden="true" />;
  }
}

// ================================
// Component
// ================================

export function TechnicalDocumentsSection() {
  const [expandedCategories, setExpandedCategories] = useState<TechnicalDocCategory[]>(['DTA']);
  const [selectedDoc, setSelectedDoc] = useState<DocumentTechnique | null>(null);

  const categories: TechnicalDocCategory[] = ['DTA', 'DIAGNOSTICS', 'CONTROLES', 'GARANTIES', 'AUTRES'];
  const documents = MOCK_TECHNICAL_DOCUMENTS;

  const documentsByCategory = useMemo(() => groupByCategory(documents), [documents]);
  const stats = useMemo(() => computeStats(documents), [documents]);

  const toggleCategory = (cat: TechnicalDocCategory) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className={styles.techDocsSection}>
      {/* Section header */}
      <div className={styles.techDocsHeader}>
        <div className={styles.techDocsHeaderLeft}>
          <Wrench size={20} aria-hidden="true" />
          <h2 className={styles.techDocsTitle}>Documents techniques</h2>
        </div>
        <p className={styles.techDocsSubtitle}>
          Diagnostics reglementaires, controles periodiques et garanties travaux
        </p>
      </div>

      {/* Stats summary */}
      <div className={styles.techDocsStats}>
        <div className={styles.techDocStatCard}>
          <span className={styles.techDocStatCount}>{stats.total}</span>
          <span className={styles.techDocStatLabel}>Total</span>
        </div>
        <div className={clsx(styles.techDocStatCard, styles.techDocStatValid)}>
          <CheckCircle size={16} aria-hidden="true" />
          <span className={styles.techDocStatCount}>{stats.valid}</span>
          <span className={styles.techDocStatLabel}>Valides</span>
        </div>
        {stats.expiring > 0 && (
          <div className={clsx(styles.techDocStatCard, styles.techDocStatWarning)}>
            <Clock size={16} aria-hidden="true" />
            <span className={styles.techDocStatCount}>{stats.expiring}</span>
            <span className={styles.techDocStatLabel}>Expirent bientot</span>
          </div>
        )}
        {stats.expired > 0 && (
          <div className={clsx(styles.techDocStatCard, styles.techDocStatDanger)}>
            <AlertCircle size={16} aria-hidden="true" />
            <span className={styles.techDocStatCount}>{stats.expired}</span>
            <span className={styles.techDocStatLabel}>Expires</span>
          </div>
        )}
      </div>

      {/* Category accordions */}
      {categories.map(category => {
        const docs = documentsByCategory[category];
        if (docs.length === 0) return null;

        const expiredCount = docs.filter(d => isDocumentExpired(d.dateValidite)).length;
        const expiringCount = docs.filter(d => isDocumentExpiringSoon(d.dateValidite)).length;
        const isExpanded = expandedCategories.includes(category);

        return (
          <div key={category} className={styles.techDocAccordion}>
            <button
              className={styles.techDocAccordionHeader}
              onClick={() => toggleCategory(category)}
              type="button"
              aria-expanded={isExpanded}
            >
              <div className={styles.techDocAccordionTitle}>
                <div className={clsx(styles.techDocAccordionIcon, styles[`techDocIcon_${category.toLowerCase()}`])}>
                  <CategoryIcon category={category} />
                </div>
                <span className={styles.techDocAccordionLabel}>
                  {getCategorieDocLabel(category)}
                </span>
                <span className={styles.techDocAccordionCount}>{docs.length}</span>
              </div>
              <div className={styles.techDocAccordionRight}>
                {expiredCount > 0 && (
                  <span className={styles.techDocCatAlertBadge}>
                    <AlertCircle size={12} aria-hidden="true" /> {expiredCount} expire{expiredCount > 1 ? 's' : ''}
                  </span>
                )}
                {expiringCount > 0 && (
                  <span className={styles.techDocCatWarningBadge}>
                    <Clock size={12} aria-hidden="true" /> {expiringCount} expire{expiringCount > 1 ? 'nt' : ''} bientot
                  </span>
                )}
                <ChevronDown
                  size={20}
                  className={clsx(styles.techDocChevron, isExpanded && styles.techDocChevronExpanded)}
                  aria-hidden="true"
                />
              </div>
            </button>

            <div className={clsx(styles.techDocAccordionContent, !isExpanded && styles.techDocAccordionCollapsed)}>
              {docs.map(doc => {
                const expired = isDocumentExpired(doc.dateValidite);
                const expiring = isDocumentExpiringSoon(doc.dateValidite);

                return (
                  <div
                    key={doc.id}
                    className={clsx(
                      styles.techDocCard,
                      expired && styles.techDocCardExpired,
                      expiring && styles.techDocCardExpiring,
                    )}
                  >
                    <div className={styles.techDocCardIcon}>
                      <FileText size={22} aria-hidden="true" />
                    </div>
                    <div className={styles.techDocCardContent}>
                      <h4 className={styles.techDocCardTitle}>{doc.nom}</h4>
                      <div className={styles.techDocCardMeta}>
                        <span className={styles.techDocCardMetaItem}>
                          <Calendar size={12} aria-hidden="true" />
                          Ajoute le {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
                        </span>
                        <span className={styles.techDocCardMetaItem}>
                          {getTypeDocLabel(doc.type)}
                        </span>
                      </div>
                      {doc.dateValidite && (
                        <span className={clsx(
                          styles.techDocValidityBadge,
                          expired && styles.techDocValidityExpired,
                          expiring && styles.techDocValidityExpiring,
                          !expired && !expiring && styles.techDocValidityValid,
                        )}>
                          {expired && <AlertCircle size={12} aria-hidden="true" />}
                          {expiring && <Clock size={12} aria-hidden="true" />}
                          {!expired && !expiring && <CheckCircle size={12} aria-hidden="true" />}
                          {expired
                            ? `Expire le ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                            : expiring
                              ? `Expire le ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                              : `Valide jusqu'au ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                          }
                        </span>
                      )}
                      {doc.observations && (
                        <p className={styles.techDocCardObs}>{doc.observations}</p>
                      )}
                    </div>
                    <div className={styles.techDocCardActions}>
                      <button
                        className={styles.techDocActionBtn}
                        onClick={() => setSelectedDoc(doc)}
                        title="Voir le document"
                        type="button"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button
                        className={styles.techDocActionBtn}
                        title="Telecharger"
                        type="button"
                      >
                        <Download size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Preview panel */}
      {selectedDoc && (
        <div className={styles.techDocPreview}>
          <div className={styles.techDocPreviewHeader}>
            <h3>{selectedDoc.nom}</h3>
            <button
              className={styles.techDocPreviewClose}
              onClick={() => setSelectedDoc(null)}
              type="button"
              aria-label="Fermer"
            >
              &times;
            </button>
          </div>
          <div className={styles.techDocPreviewBody}>
            <div className={styles.techDocPreviewRow}>
              <span className={styles.techDocPreviewLabel}>Type</span>
              <span>{getTypeDocLabel(selectedDoc.type)}</span>
            </div>
            <div className={styles.techDocPreviewRow}>
              <span className={styles.techDocPreviewLabel}>Date d&apos;ajout</span>
              <span>{new Date(selectedDoc.dateAjout).toLocaleDateString('fr-FR')}</span>
            </div>
            {selectedDoc.dateValidite && (
              <div className={styles.techDocPreviewRow}>
                <span className={styles.techDocPreviewLabel}>Date de validite</span>
                <span className={clsx(
                  isDocumentExpired(selectedDoc.dateValidite) && styles.techDocPreviewExpired,
                  isDocumentExpiringSoon(selectedDoc.dateValidite) && styles.techDocPreviewWarning,
                )}>
                  {new Date(selectedDoc.dateValidite).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            {selectedDoc.observations && (
              <div className={styles.techDocPreviewRow}>
                <span className={styles.techDocPreviewLabel}>Observations</span>
                <span>{selectedDoc.observations}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
