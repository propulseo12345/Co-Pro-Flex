'use client';

import { useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { MajorityType, TypeAG } from '@/lib/constants/resolutions';
import {
  VariableEditor,
  BibliothequeResolutions,
  ResolutionsReorderList,
  OrdreDuJourPreview,
  InlineResolutionEditor,
  type Resolution
} from '@/components/features/ag';
import { MOCK_CONTRAT_SYNDIC } from '@/data/mock';
import { useAgAgendaPage } from '@/features/ag/hooks/useAgAgendaPage';
import { updateAgCurrentStep } from '@/lib/ag/api';
import {
  CustomResolutionModal,
  AgendaHeader,
  AgendaActions,
  AgendaMessages,
  AgendaFooter,
} from '@/features/ag/agenda';
import styles from './agenda.module.css';

export default function AgendaPage() {
  const params = useParams();
  const agId = params.id as string;
  const page = useAgAgendaPage({ agId });

  useEffect(() => {
    if (!page.isLoading && page.meeting && agId) {
      updateAgCurrentStep(agId, 2);
    }
  }, [page.isLoading, page.meeting, agId]);

  const renderVariables = useCallback((resolution: Resolution) => {
    const { texte, variables, id, templateId } = resolution;
    if (!variables) return texte;
    const regex = /\{([^}]+)\}/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(texte)) !== null) {
      if (match.index > lastIndex) parts.push(texte.slice(lastIndex, match.index));
      const varName = match[1];
      const varValue = variables[varName] || '';
      const isEditing = page.editingVariable?.resId === id && page.editingVariable?.varName === varName;
      if (isEditing) {
        const template = templateId ? page.getResolutionById(templateId) : undefined;
        parts.push(
          <span key={`${id}-${varName}`} className={styles.variableEditorContainer} ref={page.editorContainerRef}>
            {template ? (
              <VariableEditor
                variableName={varName}
                variableValue={page.tempVariableValue}
                resolution={template}
                onChange={page.setTempVariableValue}
                onClose={page.handleCancelEdit}
                onSave={page.handleSaveVariable}
                coproprietaires={page.coproprietairesForEditor}
                presences={page.presences}
                exercice={page.agFormData?.budgetExercice || (new Date().getFullYear() + 1).toString()}
                gestionnaireNom={MOCK_CONTRAT_SYNDIC.nomSyndic}
              />
            ) : (
              <input
                type="text"
                value={page.tempVariableValue}
                onChange={(e) => page.setTempVariableValue(e.target.value)}
                onBlur={page.handleSaveVariable}
                onKeyDown={(e) => { if (e.key === 'Enter') page.handleSaveVariable(); if (e.key === 'Escape') page.handleCancelEdit(); }}
                className={styles.inlineEditInput}
                placeholder={varName}
                autoFocus
              />
            )}
          </span>
        );
      } else {
        parts.push(
          <span
            key={`${id}-${varName}`}
            className={`${styles.variablePlaceholder} ${varValue ? styles.variableFilled : styles.variableEmpty}`}
            onClick={() => page.handleStartEditVariable(id, varName, varValue, templateId)}
            title={`Cliquer pour modifier: ${varName}`}
          >
            {varValue || `{${varName}}`}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < texte.length) parts.push(texte.slice(lastIndex));
    return parts;
  }, [page]);

  if (page.isLoading) {
    return (
      <div className="container">
        <AgendaHeader agId={agId} onGoBack={page.goBack} />
        <div className={styles.loadingState}><p>Chargement...</p></div>
      </div>
    );
  }

  return (
    <div className="container">
      <AgendaHeader agId={agId} onGoBack={page.goBack} />

      <div className={styles.layoutWithPreview}>
        <div className={styles.mainContent}>
          <AgendaActions
            onPrefillObligatoires={page.handlePrefillObligatoires}
            onOpenBank={() => page.setShowBankModal(true)}
            onOpenCustom={() => page.setShowCustomModal(true)}
            isSaving={page.saveState?.isSaving ?? false}
          />

          <AgendaMessages
            agId={agId}
            meeting={page.meeting}
            agFormData={page.agFormData}
            saveStateError={page.saveState?.error ?? null}
            dbError={page.dbError ?? null}
            isLoading={page.isLoading}
            resolutionsCount={page.resolutions.length}
            accountingPeriod={page.accountingPeriod}
            showSuccessMessage={page.showSuccessMessage}
            successMessageCount={page.successMessageCount}
            prefillWarning={page.prefillWarning}
            isManager={page.isManager}
          />

          <ResolutionsReorderList
            resolutions={page.resolutions}
            onReorder={page.handleReorder}
            onDelete={page.handleDelete}
            onEdit={page.handleEditResolution}
            renderVariables={renderVariables}
          />

          <AgendaFooter
            onGoBack={page.goBack}
            onContinue={page.handleContinue}
            canContinue={page.resolutions.length > 0}
          />
        </div>

        <aside className={styles.previewSidebar}>
          <OrdreDuJourPreview
            resolutions={page.resolutions}
            agTitle={page.agFormData?.type === 'ORDINAIRE' ? 'AG Ordinaire' : 'AG Extraordinaire'}
            agDate={page.agFormData?.date}
          />
        </aside>
      </div>

      {page.showBankModal && (
        <BibliothequeResolutions
          typeAG={(page.agFormData?.type || 'ORDINAIRE') as TypeAG}
          onSelectResolution={page.handleAddFromBank}
          onClose={() => page.setShowBankModal(false)}
          existingTitles={page.existingResolutionTitles}
        />
      )}

      {page.showCustomModal && (
        <CustomResolutionModal
          onSave={page.handleAddCustom}
          onClose={() => page.setShowCustomModal(false)}
        />
      )}

      {page.editingResolution && (
        <div className={styles.modalOverlay} onClick={page.handleCancelEditResolution}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Modifier la resolution</h2>
            <InlineResolutionEditor
              resolution={{
                id: page.editingResolution.id,
                titre: page.editingResolution.titre,
                texte: page.editingResolution.texte,
                majorite: page.editingResolution.majorite,
              }}
              onSave={page.handleUpdateResolution}
              onCancel={page.handleCancelEditResolution}
              isLoading={page.isUpdatingResolution}
              error={page.updateResolutionError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
