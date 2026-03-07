'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { getVariableDefinition, type TypeAG } from '@/lib/constants/resolutions';
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
  const [openCoproMenu, setOpenCoproMenu] = useState<string | null>(null);
  const [coproFilter, setCoproFilter] = useState('');

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
      const variableKey = `${id}:${varName}`;
      const template = templateId ? page.getResolutionById(templateId) : undefined;
      const variableType = template ? getVariableDefinition(template, varName).type : null;
      const isCoproVariableType = variableType === 'coproprietaire' || variableType === 'coproprietaire_present';
      const isLikelyCoproVariableName =
        varName.includes('coproprietaire') ||
        varName === 'nom_president' ||
        varName === 'nom_secretaire' ||
        varName === 'nom_scrutateur' ||
        varName === 'nom' ||
        varName === 'nom_ancien' ||
        varName === 'noms';
      const isCoproLinkedVariable = isCoproVariableType || isLikelyCoproVariableName;
      const isEditing = page.editingVariable?.resId === id && page.editingVariable?.varName === varName;
      const isMenuOpen = openCoproMenu === variableKey;
      const filter = coproFilter.trim().toLowerCase();
      const filteredCopros = filter.length > 0
        ? page.coproprietairesForEditor.filter(c =>
          `${c.prenom} ${c.nom}`.toLowerCase().includes(filter) ||
          `${c.nom} ${c.prenom}`.toLowerCase().includes(filter)
        )
        : page.coproprietairesForEditor;

      const handleSelectCopro = async (fullName: string) => {
        const nextValue = varName === 'noms'
          ? Array.from(
            new Set(
              [varValue, fullName]
                .join(',')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
            )
          ).join(', ')
          : fullName;
        await page.handleQuickSetVariable(id, varName, nextValue);
        setOpenCoproMenu(null);
        setCoproFilter('');
      };

      if (isEditing) {
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
                financingSchedule={page.financingSchedule}
                onFinancingScheduleChange={page.onFinancingScheduleChange}
                totalBudget={page.totalBudget}
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
        if (isCoproLinkedVariable) {
          parts.push(
            <span key={`${id}-${varName}`} className={styles.variableMenuContainer}>
              <button
                type="button"
                className={`${styles.variablePlaceholder} ${varValue ? styles.variableFilled : styles.variableEmpty}`}
                onClick={() => {
                  setOpenCoproMenu(isMenuOpen ? null : variableKey);
                  setCoproFilter('');
                }}
                title={`Sélectionner depuis les copropriétaires: ${varName}`}
                aria-label={`Sélectionner une valeur pour ${varName}`}
                aria-expanded={isMenuOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.variablePlaceholderLabel}>{varValue || `{${varName}}`}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {isMenuOpen && (
                <div className={styles.coproMenu} role="listbox" aria-label={`Sélection copropriétaire pour ${varName}`}>
                  <div className={styles.coproMenuFilter}>
                    <input
                      type="text"
                      value={coproFilter}
                      onChange={(e) => setCoproFilter(e.target.value)}
                      className={styles.coproMenuFilterInput}
                      placeholder="Rechercher un copropriétaire..."
                      aria-label="Rechercher un copropriétaire"
                    />
                  </div>
                  <div className={styles.coproMenuList}>
                    {filteredCopros.length === 0 ? (
                      <div className={styles.coproMenuEmpty}>Aucun copropriétaire trouvé</div>
                    ) : (
                      filteredCopros.map(copro => {
                        const fullName = `${copro.prenom} ${copro.nom}`.trim();
                        return (
                          <button
                            key={`${id}-${varName}-${copro.id}`}
                            type="button"
                            className={styles.coproMenuItem}
                            role="option"
                            aria-selected="false"
                            onClick={() => void handleSelectCopro(fullName)}
                          >
                            {fullName}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.coproMenuManual}
                    onClick={() => {
                      setOpenCoproMenu(null);
                      page.handleStartEditVariable(id, varName, varValue, templateId);
                    }}
                  >
                    Saisie manuelle
                  </button>
                </div>
              )}
            </span>
          );
        } else {
          parts.push(
            <button
              key={`${id}-${varName}`}
              type="button"
              className={`${styles.variablePlaceholder} ${varValue ? styles.variableFilled : styles.variableEmpty}`}
              onClick={() => page.handleStartEditVariable(id, varName, varValue, templateId)}
              title={`Modifier: ${varName}`}
              aria-label={`Modifier la valeur pour ${varName}`}
            >
              <span className={styles.variablePlaceholderLabel}>{varValue || `{${varName}}`}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          );
        }
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < texte.length) parts.push(texte.slice(lastIndex));
    return parts;
  }, [page, openCoproMenu, coproFilter]);

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
            variant="cards"
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
