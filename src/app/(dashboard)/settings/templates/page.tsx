'use client';

import { FileText, Plus, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useTemplatesPage } from '@/hooks/modules/useTemplatesPage';
import { TemplateCard, CreateTemplateModal, DeleteTemplateModal, ImportTemplateModal } from '@/components/features/templates';
import styles from './templates.module.css';

export default function TemplatesPage() {
  const {
    templates, isLoading, error,
    showCreateModal, setShowCreateModal,
    showDeleteModal, setShowDeleteModal,
    showImportModal, setShowImportModal,
    activeMenu, setActiveMenu,
    newTemplateName, setNewTemplateName,
    newTemplateDesc, setNewTemplateDesc,
    importJson, setImportJson,
    handleCreate, handleDuplicate, handleDelete,
    handleExport, handleImport, handleSetDefault,
    handleEdit, handlePreview, getValidationStatus, formatDate,
  } = useTemplatesPage();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}><Loader2 className={styles.spinner} size={32} /><p>Chargement des templates...</p></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}><FileText size={28} />Templates de Procès-Verbal</h1>
          <p className={styles.subtitle}>Personnalisez les modèles de génération des PV d&apos;assemblée générale</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setShowImportModal(true)}><Upload size={18} />Importer</button>
          <button className={styles.btnPrimary} onClick={() => setShowCreateModal(true)}><Plus size={18} />Nouveau template</button>
        </div>
      </div>

      {error && (<div className={styles.errorBanner}><AlertCircle size={18} />{error}</div>)}

      <div className={styles.templateGrid}>
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            activeMenu={activeMenu}
            onToggleMenu={setActiveMenu}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onExport={handleExport}
            onSetDefault={handleSetDefault}
            onDelete={setShowDeleteModal}
            getValidationStatus={getValidationStatus}
            formatDate={formatDate}
          />
        ))}
        <button className={styles.newTemplateCard} onClick={() => setShowCreateModal(true)}><Plus size={32} /><span>Créer un nouveau template</span></button>
      </div>

      {showCreateModal && (
        <CreateTemplateModal
          name={newTemplateName}
          description={newTemplateDesc}
          onNameChange={setNewTemplateName}
          onDescChange={setNewTemplateDesc}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {showDeleteModal && (
        <DeleteTemplateModal onClose={() => setShowDeleteModal(null)} onDelete={handleDelete} />
      )}

      {showImportModal && (
        <ImportTemplateModal json={importJson} onJsonChange={setImportJson} onClose={() => setShowImportModal(false)} onImport={handleImport} />
      )}

      {activeMenu && (<div className={styles.menuBackdrop} onClick={() => setActiveMenu(null)} />)}
    </div>
  );
}
