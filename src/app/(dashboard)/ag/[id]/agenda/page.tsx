'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ArrowLeft, ArrowRight, CheckCircle, ListChecks, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { MAJORITES, type MajorityType, type TypeAG } from '@/lib/constants/resolutions';
import Stepper from '@/components/features/ag/Stepper';
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
import styles from './agenda.module.css';

export default function AgendaPage() {
  const params = useParams();
  const agId = params.id as string;
  const page = useAgAgendaPage({ agId });

  // Mise à jour de l'étape courante en DB (étape 2 = Ordre du jour)
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
        <div className={styles.header}>
          <button onClick={page.goBack} className={styles.backButton}><ArrowLeft size={20} /> Retour</button>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Construction de l'ordre du jour</h1>
            <p className={styles.subtitle}>Ajoutez et organisez les résolutions de votre AG</p>
          </div>
        </div>
        <Stepper currentStep={2} agId={agId} />
        <div className={styles.loadingState}><p>Chargement...</p></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <button onClick={page.goBack} className={styles.backButton}><ArrowLeft size={20} /> Retour</button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Construction de l'ordre du jour</h1>
          <p className={styles.subtitle}>Ajoutez et organisez les résolutions de votre AG</p>
        </div>
      </div>
      <Stepper currentStep={2} agId={agId} />

      <div className={styles.layoutWithPreview}>
        <div className={styles.mainContent}>
          <div className={styles.actions}>
            <button
              className="btn btn-primary"
              onClick={page.handlePrefillObligatoires}
              disabled={page.saveState?.isSaving}
            >
              <ListChecks size={16} />
              {page.saveState?.isSaving ? 'Création en cours...' : 'Pré-remplir les résolutions obligatoires'}
            </button>
            <button className="btn btn-secondary" onClick={() => page.setShowBankModal(true)} disabled={page.saveState?.isSaving}>
              <Plus size={16} /> Ajouter une résolution
            </button>
            <button className="btn btn-secondary" onClick={() => page.setShowCustomModal(true)} disabled={page.saveState?.isSaving}>
              <Plus size={16} /> Résolution personnalisée
            </button>
          </div>

          {/* Afficher les erreurs de sauvegarde ou DB */}
          {(page.saveState?.error || page.dbError) && (
            <div className={styles.warningMessage}>
              <AlertTriangle size={20} />
              <span><strong>Erreur:</strong> {page.saveState?.error || page.dbError}</span>
            </div>
          )}

          {/* Debug info si aucune résolution */}
          {!page.isLoading && page.resolutions.length === 0 && !page.meeting && (
            <div className={styles.warningMessage}>
              <AlertTriangle size={20} />
              <span><strong>AG non trouvée</strong> - Vérifiez que l'AG existe dans Supabase (ID: {agId})</span>
            </div>
          )}

          {/* Debug panel - TODO: supprimer après debug */}
          <details className={styles.infoMessage} style={{ cursor: 'pointer' }} open>
            <summary><Info size={16} style={{ display: 'inline', marginRight: '8px' }} /><strong>Debug Info</strong> (cliquer pour fermer)</summary>
            <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.6' }}>
              <p>AG ID: <code>{agId}</code></p>
              <p>Meeting trouvé: {page.meeting ? '✓ Oui' : '✗ Non'}</p>
              <p>Meeting type: {page.meeting?.meeting_type || 'N/A'}</p>
              <p>isManager: {page.isManager ? '✓ Oui' : '✗ Non'}</p>
              <p>Résolutions en DB: {page.resolutions.length}</p>
              <p>Loading: {page.isLoading ? 'Oui' : 'Non'}</p>
              <p>DB Error: <span style={{ color: page.dbError ? 'red' : 'inherit' }}>{page.dbError || 'Aucune'}</span></p>
              <p>Save Error: <span style={{ color: page.saveState?.error ? 'red' : 'inherit' }}>{page.saveState?.error || 'Aucune'}</span></p>
              <p>isSaving: {page.saveState?.isSaving ? 'Oui' : 'Non'}</p>
            </div>
          </details>

          {/* Avertissement si exercice comptable non configuré */}
          {!page.accountingPeriod && (
            <div className={styles.infoMessage}>
              <Info size={20} />
              <span>
                <strong>Exercice comptable non configuré</strong> pour l'année {page.agFormData?.budgetExercice || new Date().getFullYear() + 1}.
                Les dates de l'exercice ne seront pas pré-remplies automatiquement.{' '}
                <Link href="/finance/budgets">Configurer l'exercice dans Finance</Link>
              </span>
            </div>
          )}

          {page.showSuccessMessage && page.successMessageCount > 0 && (
            <div className={styles.successMessage}>
              <CheckCircle size={20} />
              <span><strong>{page.successMessageCount} résolutions</strong> ont été ajoutées automatiquement.</span>
            </div>
          )}

          {page.prefillWarning && (
            <div className={page.prefillWarning.added > 0 ? styles.successMessage : styles.warningMessage}>
              {page.prefillWarning.added > 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              <span>
                {page.prefillWarning.added > 0 ? (
                  <><strong>{page.prefillWarning.added} résolution{page.prefillWarning.added > 1 ? 's' : ''}</strong> ajoutée{page.prefillWarning.added > 1 ? 's' : ''}.
                    {page.prefillWarning.skipped > 0 && <> {page.prefillWarning.skipped} résolution{page.prefillWarning.skipped > 1 ? 's étaient' : ' était'} déjà présente{page.prefillWarning.skipped > 1 ? 's' : ''}.</>}
                  </>
                ) : (
                  <>Toutes les <strong>{page.prefillWarning.total} résolutions obligatoires</strong> sont déjà présentes.</>
                )}
              </span>
            </div>
          )}

          <ResolutionsReorderList
            resolutions={page.resolutions}
            onReorder={page.handleReorder}
            onDelete={page.handleDelete}
            onEdit={page.handleEditResolution}
            renderVariables={renderVariables}
          />

          <div className={styles.footer}>
            <button onClick={page.goBack} className="btn btn-secondary">Retour</button>
            <button onClick={page.handleContinue} className="btn btn-primary" disabled={page.resolutions.length === 0}>
              Continuer <ArrowRight size={16} />
            </button>
          </div>
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

      {page.showCustomModal && <CustomModal onSave={page.handleAddCustom} onClose={() => page.setShowCustomModal(false)} />}

      {/* Modal d'édition inline */}
      {page.editingResolution && (
        <div className={styles.modalOverlay} onClick={page.handleCancelEditResolution}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Modifier la résolution</h2>
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

interface CustomModalProps {
  onSave: (titre: string, texte: string, majorite: MajorityType) => void;
  onClose: () => void;
}

function CustomModal({ onSave, onClose }: CustomModalProps) {
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [majorite, setMajorite] = useState<MajorityType>('ART_24');
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Résolution personnalisée</h2>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre" className={styles.modalInput} />
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Texte" rows={6} className={styles.modalTextarea} />
        <select value={majorite} onChange={(e) => setMajorite(e.target.value as MajorityType)} className={styles.modalSelect}>
          {Object.entries(MAJORITES).map(([key, maj]) => <option key={key} value={key}>{maj.nom}</option>)}
        </select>
        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={() => onSave(titre, texte, majorite)} className="btn btn-primary" disabled={!titre.trim()}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}
