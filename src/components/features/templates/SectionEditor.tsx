'use client';

import { ChevronDown, ChevronRight, Grip, ToggleLeft, ToggleRight, Code, Plus } from 'lucide-react';
import type { IPVSection } from '@/types/models/pv-template';
import styles from '@/app/(dashboard)/settings/templates/[id]/editor.module.css';
import type { RefObject } from 'react';

interface SectionEditorProps {
  section: IPVSection;
  isExpanded: boolean;
  isEditing: boolean;
  contentEditorRef: RefObject<HTMLTextAreaElement | null>;
  onToggle: (id: string, enabled: boolean) => void;
  onExpand: (id: string) => void;
  onSetEditing: (id: string | null) => void;
  onUpdateContent: (id: string, content: string) => void;
  onToggleVariables: () => void;
}

export function SectionEditor({
  section,
  isExpanded,
  isEditing,
  contentEditorRef,
  onToggle,
  onExpand,
  onSetEditing,
  onUpdateContent,
  onToggleVariables,
}: SectionEditorProps) {
  return (
    <div className={`${styles.sectionItem} ${!section.enabled ? styles.sectionDisabled : ''}`}>
      <div className={styles.sectionHeader}>
        <button className={styles.sectionExpandBtn} onClick={() => onExpand(section.id)}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Grip size={16} className={styles.sectionGrip} />
        <div className={styles.sectionInfo}>
          <span className={styles.sectionLabel}>{section.label}</span>
          <span className={styles.sectionType}>{section.type}</span>
        </div>
        <button
          className={`${styles.sectionToggle} ${section.enabled ? styles.toggleOn : ''}`}
          onClick={() => onToggle(section.id, !section.enabled)}
          disabled={section.required}
          title={section.required ? 'Section obligatoire' : 'Activer/Désactiver'}
        >
          {section.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.sectionContent}>
          <div className={styles.editorToolbar}>
            <button className={`${styles.toolbarBtn} ${isEditing ? styles.active : ''}`} onClick={() => onSetEditing(isEditing ? null : section.id)}>
              <Code size={16} />{isEditing ? 'Fermer l\'éditeur' : 'Modifier le contenu'}
            </button>
            <button className={styles.toolbarBtn} onClick={onToggleVariables}><Plus size={16} />Variables</button>
          </div>

          {isEditing && (
            <div className={styles.contentEditor}>
              <textarea
                ref={contentEditorRef}
                value={section.content}
                onChange={e => onUpdateContent(section.id, e.target.value)}
                className={styles.codeTextarea}
                placeholder="Contenu HTML de la section..."
                rows={15}
              />
            </div>
          )}

          {!isEditing && (
            <div className={styles.sectionPreview}>
              <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: section.content.substring(0, 500) + '...' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
