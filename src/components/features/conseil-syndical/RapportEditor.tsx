'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { RapportActiviteCS, SectionRapportCS } from '@/types/models/conseil-syndical';
import styles from './RapportCS.module.css';

interface RapportEditorProps {
  rapport: RapportActiviteCS;
  onUpdateTitre: (titre: string) => void;
  onUpdateIntroduction: (introduction: string) => void;
  onUpdateContenu: (contenu: string) => void;
  onAddSection: (section: Omit<SectionRapportCS, 'id'>) => Promise<void>;
  onUpdateSection: (sectionId: string, updates: Partial<SectionRapportCS>) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onReorderSections: (sectionIds: string[]) => Promise<void>;
  readOnly?: boolean;
}

export function RapportEditor({
  rapport,
  onUpdateTitre,
  onUpdateIntroduction,
  onUpdateContenu,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  readOnly = false,
}: RapportEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    await onAddSection({
      titre: newSectionTitle,
      contenu: '',
      ordre: rapport.sections.length,
    });

    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = rapport.sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= rapport.sections.length) return;

    const newOrder = [...rapport.sections.map(s => s.id)];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    await onReorderSections(newOrder);
  };

  const canEdit = !readOnly && (rapport.statut === 'brouillon' || rapport.statut === 'en_revision');

  return (
    <div className={styles.editorContainer}>
      {/* En-tête du rapport */}
      <section className={styles.headerSection}>
        <div className={styles.field}>
          <label htmlFor="titre" className={styles.label}>Titre du rapport</label>
          <input
            id="titre"
            type="text"
            value={rapport.titre}
            onChange={(e) => onUpdateTitre(e.target.value)}
            placeholder="Rapport d'activité du Conseil Syndical"
            className={styles.titleInput}
            disabled={!canEdit}
          />
        </div>

        <div className={styles.periodeBadge}>
          <span>Période : </span>
          <strong>
            {rapport.periodeDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            {' - '}
            {rapport.periodeFin.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </strong>
        </div>
      </section>

      {/* Introduction / Résumé */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FileText size={18} aria-hidden="true" />
          Introduction / Résumé
        </h2>
        <p className={styles.sectionHelp}>
          Ce texte sera utilisé pour pré-remplir la résolution de l&apos;AG.
        </p>
        <div className={styles.richTextEditor}>
          <textarea
            value={rapport.introduction}
            onChange={(e) => onUpdateIntroduction(e.target.value)}
            placeholder="Résumé des activités du Conseil Syndical durant cette période..."
            disabled={!canEdit}
            rows={5}
          />
        </div>
      </section>

      {/* Contenu principal */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FileText size={18} aria-hidden="true" />
          Rapport détaillé
        </h2>
        <div className={styles.richTextEditor}>
          <textarea
            value={rapport.contenu}
            onChange={(e) => onUpdateContenu(e.target.value)}
            placeholder="Détaillez ici les activités du Conseil Syndical..."
            disabled={!canEdit}
            rows={12}
          />
        </div>
      </section>

      {/* Sections additionnelles */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sections additionnelles</h2>
          {canEdit && (
            <button
              type="button"
              className={styles.addSectionBtn}
              onClick={() => setIsAddingSection(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Ajouter une section
            </button>
          )}
        </div>

        {/* Liste des sections */}
        <div className={styles.sectionsList}>
          {rapport.sections
            .sort((a, b) => a.ordre - b.ordre)
            .map((section, index) => (
              <div key={section.id} className={styles.sectionItem}>
                <div className={styles.sectionItemHeader}>
                  <div className={styles.sectionItemLeft}>
                    {canEdit && (
                      <GripVertical
                        size={16}
                        className={styles.dragHandle}
                        aria-hidden="true"
                      />
                    )}
                    <button
                      type="button"
                      className={styles.sectionToggle}
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={expandedSections.has(section.id)}
                      aria-label={expandedSections.has(section.id) ? 'Réduire' : 'Développer'}
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronUp size={16} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={16} aria-hidden="true" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={section.titre}
                      onChange={(e) => onUpdateSection(section.id, { titre: e.target.value })}
                      className={styles.sectionTitleInput}
                      placeholder="Titre de la section"
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <div className={styles.sectionItemActions}>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(section.id, 'up')}
                        disabled={index === 0}
                        className={styles.moveBtn}
                        aria-label="Monter"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(section.id, 'down')}
                        disabled={index === rapport.sections.length - 1}
                        className={styles.moveBtn}
                        aria-label="Descendre"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSection(section.id)}
                        className={styles.deleteBtn}
                        aria-label="Supprimer la section"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {expandedSections.has(section.id) && (
                  <div className={styles.sectionItemContent}>
                    <div className={styles.richTextEditor}>
                      <textarea
                        value={section.contenu}
                        onChange={(e) => onUpdateSection(section.id, { contenu: e.target.value })}
                        placeholder="Contenu de la section..."
                        disabled={!canEdit}
                        rows={6}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Formulaire nouvelle section */}
        {isAddingSection && (
          <div className={styles.newSectionForm}>
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Titre de la nouvelle section"
              className={styles.newSectionInput}
              autoFocus
            />
            <div className={styles.newSectionActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setIsAddingSection(false);
                  setNewSectionTitle('');
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {rapport.sections.length === 0 && !isAddingSection && (
          <p className={styles.noSections}>
            Aucune section additionnelle. {canEdit && 'Cliquez sur "Ajouter une section" pour structurer votre rapport.'}
          </p>
        )}
      </section>
    </div>
  );
}
