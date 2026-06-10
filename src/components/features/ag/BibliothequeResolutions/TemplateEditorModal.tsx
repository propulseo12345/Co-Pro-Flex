'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Save, Plus, AlertTriangle } from 'lucide-react';
import {
  MAJORITES,
  CATEGORIES_RESOLUTIONS,
  type MajorityType,
} from '@/lib/constants/resolutions';
import { validateResolutionLegal } from '@/types/models/custom-resolution';
import type { ResolutionTemplateRow, CreateTemplatePayload } from '@/lib/ag/resolutionTemplates/types';
import styles from './TemplateEditorModal.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface TemplateEditorModalProps {
  /** Si fourni, on est en mode édition. Sinon, création. */
  template?: ResolutionTemplateRow;
  cabinetId: string | null;
  coproId: string | null;
  onSave: (payload: CreateTemplatePayload, pourCopro: boolean) => Promise<void>;
  onCancel: () => void;
  /** Message d'erreur à afficher (ex: « Aucun cabinet »). */
  errorMessage?: string | null;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function TemplateEditorModal({
  template,
  cabinetId,
  coproId,
  onSave,
  onCancel,
  errorMessage,
}: TemplateEditorModalProps) {
  const isEditing = template != null;

  // État du formulaire
  const [titre, setTitre] = useState(template?.titre ?? '');
  const [categorie, setCategorie] = useState(template?.categorie ?? CATEGORIES_RESOLUTIONS[0]);
  const [texte, setTexte] = useState(template?.texte ?? '');
  const [majorite, setMajorite] = useState<MajorityType>(
    (template?.majorite as MajorityType) ?? 'ART_24',
  );
  // Portée : true = pour la copro seulement, false = pour tout le cabinet
  const [pourCopro, setPourCopro] = useState(
    template != null ? template.copro_id != null : false,
  );
  // Variables simples (liste de clés)
  const [variables, setVariables] = useState<string[]>(template?.variables ?? []);
  const [newVar, setNewVar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Validation légale (avertissement non bloquant)
  const legalWarnings = useMemo(
    () => validateResolutionLegal(majorite, categorie).warnings,
    [majorite, categorie],
  );

  // Variables détectées dans le texte (pattern {nom_variable})
  const detectedVars = useMemo(() => {
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const found = [...texte.matchAll(regex)].map(m => m[1]);
    return [...new Set(found)].filter(v => !variables.includes(v));
  }, [texte, variables]);

  const handleAddVar = useCallback(() => {
    const key = newVar.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || variables.includes(key)) return;
    setVariables(prev => [...prev, key]);
    setNewVar('');
  }, [newVar, variables]);

  const handleRemoveVar = useCallback((key: string) => {
    setVariables(prev => prev.filter(v => v !== key));
  }, []);

  const handleAddDetectedVar = useCallback((key: string) => {
    setVariables(prev => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    if (!titre.trim()) { setLocalError('Le titre est obligatoire.'); return; }
    if (!texte.trim()) { setLocalError('Le texte est obligatoire.'); return; }
    if (!cabinetId) {
      setLocalError('Aucun cabinet associé à votre compte. Impossible de créer un modèle.');
      return;
    }

    const payload: CreateTemplatePayload = {
      titre: titre.trim(),
      categorie,
      texte: texte.trim(),
      majorite,
      variables,
    };

    setIsSaving(true);
    try {
      await onSave(payload, pourCopro);
    } catch {
      setLocalError('Une erreur est survenue. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  }, [titre, categorie, texte, majorite, variables, pourCopro, cabinetId, onSave]);

  const displayError = localError ?? errorMessage;

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true">
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditing ? 'Modifier le modèle' : 'Nouveau modèle de résolution'}
          </h2>
          <button className={styles.closeBtn} onClick={onCancel} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Erreur globale */}
        {displayError && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={16} />
            <span>{displayError}</span>
          </div>
        )}

        <div className={styles.body}>
          {/* Titre */}
          <div className={styles.formGroup}>
            <label htmlFor="tpl-titre" className={styles.label}>Titre *</label>
            <input
              id="tpl-titre"
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex : Autorisation de travaux privatifs"
              className={styles.input}
            />
          </div>

          {/* Catégorie + Majorité */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="tpl-categorie" className={styles.label}>Catégorie *</label>
              <select
                id="tpl-categorie"
                value={categorie}
                onChange={e => setCategorie(e.target.value)}
                className={styles.select}
              >
                {CATEGORIES_RESOLUTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="tpl-majorite" className={styles.label}>Majorité *</label>
              <select
                id="tpl-majorite"
                value={majorite}
                onChange={e => setMajorite(e.target.value as MajorityType)}
                className={styles.select}
              >
                {Object.entries(MAJORITES).map(([key, maj]) => (
                  <option key={key} value={key}>{maj.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Avertissement légal */}
          {legalWarnings.length > 0 && (
            <div className={styles.legalWarning}>
              <AlertTriangle size={16} />
              <div>
                {legalWarnings.map((w) => <p key={w}>{w}</p>)}
              </div>
            </div>
          )}

          {/* Texte */}
          <div className={styles.formGroup}>
            <label htmlFor="tpl-texte" className={styles.label}>
              Texte de la résolution *
              <span className={styles.hint}>Utilisez {'{variable}'} pour les champs dynamiques</span>
            </label>
            <textarea
              id="tpl-texte"
              value={texte}
              onChange={e => setTexte(e.target.value)}
              placeholder="L'Assemblée Générale, après en avoir délibéré, décide de..."
              rows={8}
              className={styles.textarea}
            />
          </div>

          {/* Variables détectées non déclarées */}
          {detectedVars.length > 0 && (
            <div className={styles.detectedVars}>
              <span className={styles.detectedVarsLabel}>Variables détectées :</span>
              <div className={styles.detectedVarsList}>
                {detectedVars.map(v => (
                  <button
                    key={v}
                    type="button"
                    className={styles.detectedVarBtn}
                    onClick={() => handleAddDetectedVar(v)}
                  >
                    <Plus size={12} />
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variables déclarées */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Variables déclarées ({variables.length})</label>
            {variables.length > 0 && (
              <div className={styles.varList}>
                {variables.map(v => (
                  <span key={v} className={styles.varChip}>
                    {`{${v}}`}
                    <button
                      type="button"
                      className={styles.varRemoveBtn}
                      onClick={() => handleRemoveVar(v)}
                      aria-label={`Supprimer la variable ${v}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.varAddRow}>
              <input
                type="text"
                value={newVar}
                onChange={e => setNewVar(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVar(); } }}
                placeholder="nom_variable"
                className={styles.inputSmall}
              />
              <button type="button" className={styles.addVarBtn} onClick={handleAddVar}>
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>

          {/* Portée (uniquement en création, ou si la copro est disponible) */}
          {!isEditing && coproId && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Portée</label>
              <div className={styles.scopeOptions}>
                <label className={styles.scopeOption}>
                  <input
                    type="radio"
                    name="tpl-scope"
                    checked={!pourCopro}
                    onChange={() => setPourCopro(false)}
                  />
                  <div>
                    <span className={styles.scopeLabel}>Pour mon cabinet</span>
                    <span className={styles.scopeDesc}>Visible sur toutes les copropriétés du cabinet</span>
                  </div>
                </label>
                <label className={styles.scopeOption}>
                  <input
                    type="radio"
                    name="tpl-scope"
                    checked={pourCopro}
                    onChange={() => setPourCopro(true)}
                  />
                  <div>
                    <span className={styles.scopeLabel}>Pour cette copropriété seulement</span>
                    <span className={styles.scopeDesc}>Visible uniquement sur la copropriété courante</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Pied de modale */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={isSaving || !titre.trim() || !texte.trim()}
          >
            <Save size={16} />
            {isSaving ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer le modèle'}
          </button>
        </div>
      </div>
    </div>
  );
}
