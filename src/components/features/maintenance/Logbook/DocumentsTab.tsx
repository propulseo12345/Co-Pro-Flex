'use client';

import { useState } from 'react';
import {
    Search,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    FileCheck,
    ShieldCheck,
    ClipboardList,
    File,
    Download,
    Eye,
    Plus,
    ChevronDown,
    Upload,
    X
} from 'lucide-react';
import clsx from 'clsx';
import type { DocumentsTabProps, DocumentCategory } from './types';
import { getCategorieDocLabel, getTypeDocLabel, isDocumentExpired, isDocumentExpiringSoon } from './utils';
import { generateDocumentTechniquePDF } from '@/lib/pdf/generateDocumentTechniquePDF';
import { useCopro } from '@/providers/CoproContext';
import { autoFileToGED } from '@/lib/services/auto-file-ged.service';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function DocumentsTab({
    filteredDocuments,
    documentsByCategory,
    documentStats,
    searchDocuments,
    categorieDocFilter,
    expandedCategories,
    onSearchChange,
    onCategorieFilterChange,
    onToggleCategory,
    onSelectDocument
}: DocumentsTabProps) {
    const { currentCoproId } = useCopro();
    const [showAddModal, setShowAddModal] = useState(false);
    const categories: DocumentCategory[] = ['DTA', 'DIAGNOSTICS', 'CONTROLES', 'GARANTIES', 'AUTRES'];

    const handleAddDocument = () => {
        // Pour l'instant, afficher un message indiquant que cette fonctionnalité
        // sera disponible avec l'intégration Supabase
        setShowAddModal(true);
    };

    return (
        <div className={styles.documentsSection}>
            <div className={styles.sectionIntro}>
                <p>Diagnostics réglementaires, contrôles périodiques et garanties travaux. Classés par catégorie pour un accès rapide.</p>
            </div>

            {/* Statistiques des documents */}
            <div className={styles.documentStats}>
                <div className={styles.documentStatCard}>
                    <span className={styles.statCount}>{documentStats.total}</span>
                    <span className={styles.statLabel}>Documents total</span>
                </div>
                {documentStats.expired > 0 && (
                    <div className={clsx(styles.documentStatCard, styles.alertStat)}>
                        <AlertCircle size={18} aria-hidden="true" />
                        <span className={styles.statCount}>{documentStats.expired}</span>
                        <span className={styles.statLabel}>Expirés</span>
                    </div>
                )}
                {documentStats.expiring > 0 && (
                    <div className={clsx(styles.documentStatCard, styles.warningStat)}>
                        <Clock size={18} aria-hidden="true" />
                        <span className={styles.statCount}>{documentStats.expiring}</span>
                        <span className={styles.statLabel}>Expirent bientôt</span>
                    </div>
                )}
            </div>

            {/* Filtres */}
            <div className={styles.documentFilters}>
                <div className={styles.documentSearchBox}>
                    <Search size={18} aria-hidden="true" />
                    <input type="text" placeholder="Rechercher un document..." value={searchDocuments} onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <select
                    className={styles.documentFilterSelect}
                    value={categorieDocFilter}
                    onChange={(e) => onCategorieFilterChange(e.target.value)}
                >
                    <option value="TOUS">Toutes les catégories</option>
                    <option value="DTA">DTA (Dossier Technique Amiante)</option>
                    <option value="DIAGNOSTICS">Diagnostics réglementaires</option>
                    <option value="CONTROLES">Rapports de contrôle</option>
                    <option value="GARANTIES">Garanties travaux</option>
                    <option value="AUTRES">Autres documents</option>
                </select>
            </div>

            {/* Accordéons par catégorie */}
            {categories.map(category => {
                const docs = documentsByCategory[category];
                const expiredCount = docs.filter(d => isDocumentExpired(d.dateValidite)).length;
                const expiringCount = docs.filter(d => isDocumentExpiringSoon(d.dateValidite)).length;
                const isExpanded = expandedCategories.includes(category);

                // Ne pas afficher la catégorie si elle est vide et qu'on filtre par catégorie
                if (docs.length === 0 && categorieDocFilter !== 'TOUS') return null;

                return (
                    <div key={category} className={styles.categoryAccordion}>
                        <div
                            className={styles.categoryAccordionHeader}
                            onClick={() => onToggleCategory(category)}
                        >
                            <div className={styles.categoryAccordionTitle}>
                                <div className={clsx(
                                    styles.categoryAccordionIcon,
                                    styles[category.toLowerCase()]
                                )}>
                                    {category === 'DTA' && <AlertTriangle size={18} aria-hidden="true" />}
                                    {category === 'DIAGNOSTICS' && <FileCheck size={18} aria-hidden="true" />}
                                    {category === 'CONTROLES' && <ClipboardList size={18} aria-hidden="true" />}
                                    {category === 'GARANTIES' && <ShieldCheck size={18} aria-hidden="true" />}
                                    {category === 'AUTRES' && <File size={18} aria-hidden="true" />}
                                </div>
                                <span className={styles.categoryAccordionLabel}>
                                    {getCategorieDocLabel(category)}
                                </span>
                                <span className={styles.categoryAccordionCount}>{docs.length}</span>
                            </div>
                            <div className={styles.categoryAccordionRight}>
                                {expiredCount > 0 && (
                                    <span className={styles.categoryAlertBadge}>
                                        <AlertCircle size={12} aria-hidden="true" /> {expiredCount} expiré{expiredCount > 1 ? 's' : ''}
                                    </span>
                                )}
                                {expiringCount > 0 && (
                                    <span className={styles.categoryExpiringBadge}>
                                        <Clock size={12} aria-hidden="true" /> {expiringCount} expire{expiringCount > 1 ? 'nt' : ''} bientôt
                                    </span>
                                )}
                                <ChevronDown size={20}
                                    className={clsx(styles.categoryChevron, isExpanded && styles.expanded)} aria-hidden="true" />
                            </div>
                        </div>

                        <div className={clsx(
                            styles.categoryAccordionContent,
                            !isExpanded && styles.collapsed
                        )}>
                            {docs.length === 0 ? (
                                <div className={styles.categoryEmptyState}>
                                    Aucun document dans cette catégorie
                                </div>
                            ) : (
                                docs.map(doc => {
                                    const expired = isDocumentExpired(doc.dateValidite);
                                    const expiring = isDocumentExpiringSoon(doc.dateValidite);

                                    return (
                                        <div
                                            key={doc.id}
                                            className={clsx(
                                                styles.documentCardEnhanced,
                                                expired && styles.expired,
                                                expiring && styles.expiring
                                            )}
                                            onClick={() => onSelectDocument(doc)}
                                        >
                                            <div className={styles.documentCardIcon}>
                                                <FileText size={22} aria-hidden="true" />
                                            </div>
                                            <div className={styles.documentCardContent}>
                                                <h4 className={styles.documentCardTitle}>{doc.nom}</h4>
                                                <div className={styles.documentCardMeta}>
                                                    <span className={styles.documentCardMetaItem}>
                                                        <Calendar size={12} aria-hidden="true" />
                                                        Ajouté le {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
                                                    </span>
                                                    <span className={styles.documentCardMetaItem}>
                                                        {getTypeDocLabel(doc.type)}
                                                    </span>
                                                </div>
                                                {doc.dateValidite && (
                                                    <span className={clsx(
                                                        styles.validityBadge,
                                                        expired && styles.expired,
                                                        expiring && styles.expiring,
                                                        !expired && !expiring && styles.valid
                                                    )}>
                                                        {expired && <AlertCircle size={12} aria-hidden="true" />}
                                                        {expiring && <Clock size={12} aria-hidden="true" />}
                                                        {!expired && !expiring && <CheckCircle size={12} aria-hidden="true" />}
                                                        {expired
                                                            ? `Expiré le ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                                                            : expiring
                                                                ? `Expire le ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                                                                : `Valide jusqu'au ${new Date(doc.dateValidite).toLocaleDateString('fr-FR')}`
                                                        }
                                                    </span>
                                                )}
                                                {doc.observations && (
                                                    <p className={styles.documentCardObs}>{doc.observations}</p>
                                                )}
                                            </div>
                                            <div className={styles.documentCardActions}>
                                                <button
                                                    className={styles.documentActionBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const pdfDoc = generateDocumentTechniquePDF({ document: doc });
                                                        const fileName = `${doc.nom.replace(/\s+/g, '_')}.pdf`;
                                                        pdfDoc.save(fileName);

                                                        if (currentCoproId) {
                                                            const blob = pdfDoc.output('blob');
                                                            autoFileToGED({
                                                                blob,
                                                                fileName,
                                                                coproId: currentCoproId,
                                                                category: 'diagnostic',
                                                                sourceModule: 'maintenance',
                                                                subFolderName: `Diagnostics ${new Date().getFullYear()}`,
                                                                year: new Date().getFullYear(),
                                                            });
                                                        }
                                                    }}
                                                    title="Télécharger en PDF"
                                                >
                                                    <Download size={16} aria-hidden="true" />
                                                </button>
                                                <button
                                                    className={styles.documentActionBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectDocument(doc);
                                                    }}
                                                    title="Voir"
                                                >
                                                    <Eye size={16} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Bouton ajouter un document */}
                            <button
                                className={styles.addDocumentBtn}
                                onClick={handleAddDocument}
                            >
                                <Plus size={16} aria-hidden="true" /> Ajouter un document
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Message si aucun résultat */}
            {filteredDocuments.length === 0 && (
                <div className={styles.emptyState}>
                    <FileText size={48} aria-hidden="true" />
                    <p>Aucun document ne correspond à votre recherche</p>
                </div>
            )}

            {/* Modal ajout document */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className={styles.modalHeader}>
                            <h3><Upload size={20} aria-hidden="true" /> Ajouter un document</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowAddModal(false)}
                                aria-label="Fermer"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>
                                L&apos;ajout de documents sera disponible avec l&apos;intégration Supabase.
                            </p>
                            <p style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                                Pour l&apos;instant, les documents sont gérés en lecture seule.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
