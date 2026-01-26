'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Download, ChevronDown, FileText, Settings, Type, AlertCircle, Loader2 } from 'lucide-react';
import { useTemplateEditor } from '@/hooks/modules/useTemplateEditor';
import { SectionEditor, VariablesPalette, SettingsTab, FormulationsTab, PreviewPanel } from '@/components/features/templates';
import styles from './editor.module.css';

export default function TemplateEditorPage() {
  const params = useParams();
  const templateId = params.id as string;

  const {
    selectedTemplate, isLoading, activeTab, setActiveTab,
    showPreview, setShowPreview, previewHtml, previewErrors,
    expandedSections, editingSection, setEditingSection,
    showVariables, setShowVariables, hasChanges, exportLoading, contentEditorRef,
    updatePreview, handleToggleSection, handleUpdateSectionContent, handleExpandSection,
    handleUpdateGlobal, handleUpdateHeader, handleUpdateFormulations,
    handleInsertVariable, handleExport, goBack,
  } = useTemplateEditor(templateId);

  if (isLoading) {
    return <div className={styles.loadingContainer}><Loader2 className={styles.spinner} size={32} /><p>Chargement du template...</p></div>;
  }

  if (!selectedTemplate) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} /><h2>Template non trouvé</h2>
        <p>Le template demandé n&apos;existe pas ou a été supprimé.</p>
        <button onClick={goBack}><ArrowLeft size={18} />Retour à la liste</button>
      </div>
    );
  }

  if (selectedTemplate.isSystemTemplate) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} /><h2>Template système</h2>
        <p>Les templates système ne peuvent pas être modifiés. Dupliquez-le pour créer votre propre version.</p>
        <button onClick={goBack}><ArrowLeft size={18} />Retour à la liste</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.backBtn} onClick={goBack}><ArrowLeft size={18} />Retour</button>
          <div className={styles.templateInfo}>
            <h1>{selectedTemplate.name}</h1>
            {hasChanges && <span className={styles.unsavedBadge}>Non enregistré</span>}
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <button className={`${styles.toolbarBtn} ${showPreview ? styles.active : ''}`} onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}{showPreview ? 'Masquer' : 'Aperçu'}
          </button>
          <div className={styles.exportDropdown}>
            <button className={styles.toolbarBtn} disabled={exportLoading}>
              {exportLoading ? <Loader2 className={styles.spinner} size={18} /> : <Download size={18} />}Exporter<ChevronDown size={14} />
            </button>
            <div className={styles.exportMenu}>
              <button onClick={() => handleExport('html')}>HTML</button>
              <button onClick={() => handleExport('pdf')}>PDF</button>
              <button onClick={() => handleExport('docx')}>Word (.docx)</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.editorPanel}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'sections' ? styles.activeTab : ''}`} onClick={() => setActiveTab('sections')}><FileText size={16} />Sections</button>
            <button className={`${styles.tab} ${activeTab === 'settings' ? styles.activeTab : ''}`} onClick={() => setActiveTab('settings')}><Settings size={16} />Paramètres</button>
            <button className={`${styles.tab} ${activeTab === 'formulations' ? styles.activeTab : ''}`} onClick={() => setActiveTab('formulations')}><Type size={16} />Formulations</button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'sections' && (
              <div className={styles.sectionsTab}>
                <p className={styles.tabDescription}>Activez, désactivez ou modifiez le contenu des sections du PV.</p>
                <div className={styles.sectionsList}>
                  {selectedTemplate.spec.sections.sort((a, b) => a.order - b.order).map(section => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      isExpanded={expandedSections.has(section.id)}
                      isEditing={editingSection === section.id}
                      contentEditorRef={contentEditorRef}
                      onToggle={handleToggleSection}
                      onExpand={handleExpandSection}
                      onSetEditing={setEditingSection}
                      onUpdateContent={handleUpdateSectionContent}
                      onToggleVariables={() => setShowVariables(!showVariables)}
                    />
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'settings' && <SettingsTab global={selectedTemplate.spec.global} header={selectedTemplate.spec.header} onUpdateGlobal={handleUpdateGlobal} onUpdateHeader={handleUpdateHeader} />}
            {activeTab === 'formulations' && <FormulationsTab formulations={selectedTemplate.spec.formulations} onUpdate={handleUpdateFormulations} />}
          </div>
        </div>

        {showPreview && <PreviewPanel html={previewHtml} errors={previewErrors} onRefresh={updatePreview} />}
      </div>

      {showVariables && editingSection && <VariablesPalette onClose={() => setShowVariables(false)} onInsert={handleInsertVariable} />}
    </div>
  );
}
