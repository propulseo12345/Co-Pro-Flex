'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  Copy,
  Check,
  Save,
  Variable,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MAJORITES,
  CATEGORIES_RESOLUTIONS,
  type MajorityType,
} from '@/lib/constants/resolutions';
import {
  type ICustomResolution,
  type CustomVariable,
  type ResolutionScope,
  type ResolutionExport,
  STARTER_TEMPLATES,
  validateResolutionLegal,
} from '@/types/models/custom-resolution';
import styles from './CustomResolutionEditor.module.css';

interface CustomResolutionEditorProps {
  resolution?: ICustomResolution;
  onSave: (resolution: ICustomResolution) => void;
  onCancel: () => void;
  /** @deprecated Inutilisé — le cabinet est géré par le provider ResolutionTemplates. */
  organizationId?: string;
  /** @deprecated Inutilisé — l'utilisateur est géré côté serveur (RLS). */
  userId?: string;
}

const VARIABLE_TYPES: { value: CustomVariable['type']; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'currency', label: 'Montant (€)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste de choix' },
];

const SCOPE_OPTIONS: { value: ResolutionScope; label: string; description: string }[] = [
  { value: 'private', label: 'Privée', description: 'Visible uniquement par vous' },
  { value: 'org', label: 'Organisation', description: 'Partagée avec votre organisation' },
  { value: 'shared', label: 'Publique', description: 'Disponible pour tous les utilisateurs' },
];

export function CustomResolutionEditor({
  resolution,
  onSave,
  onCancel,
  organizationId = '',
  userId = '',
}: CustomResolutionEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(!resolution);
  const [showVariableForm, setShowVariableForm] = useState(false);

  // État du formulaire
  const [titre, setTitre] = useState(resolution?.titre || '');
  const [texte, setTexte] = useState(resolution?.texte || '');
  const [categorie, setCategorie] = useState(resolution?.categorie || 'Autre');
  const [majorite, setMajorite] = useState<MajorityType>(resolution?.majorite || 'ART_24');
  const [scope, setScope] = useState<ResolutionScope>(resolution?.scope || 'org');
  const [variables, setVariables] = useState<CustomVariable[]>(resolution?.variables || []);
  const [tags, setTags] = useState<string[]>(resolution?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [legalRef, setLegalRef] = useState(resolution?.legalRef || '');

  // Nouvelle variable
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [newVarType, setNewVarType] = useState<CustomVariable['type']>('text');
  const [newVarRequired, setNewVarRequired] = useState(true);
  const [newVarOptions, setNewVarOptions] = useState('');

  // Validation juridique
  const legalValidation = useMemo(
    () => validateResolutionLegal(majorite, categorie),
    [majorite, categorie]
  );

  // Détecter les variables dans le texte
  const detectedVariables = useMemo(() => {
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...texte.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  }, [texte]);

  // Variables non définies
  const undefinedVariables = useMemo(() => {
    const definedKeys = variables.map(v => v.key);
    return detectedVariables.filter(v => !definedKeys.includes(v));
  }, [detectedVariables, variables]);

  // Ajouter une variable
  const handleAddVariable = useCallback(() => {
    if (!newVarKey.trim() || !newVarLabel.trim()) return;

    const key = newVarKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (variables.some(v => v.key === key)) return;

    const newVar: CustomVariable = {
      key,
      label: newVarLabel.trim(),
      type: newVarType,
      required: newVarRequired,
      options: newVarType === 'select' ? newVarOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    };

    setVariables([...variables, newVar]);
    setNewVarKey('');
    setNewVarLabel('');
    setNewVarType('text');
    setNewVarRequired(true);
    setNewVarOptions('');
    setShowVariableForm(false);
  }, [newVarKey, newVarLabel, newVarType, newVarRequired, newVarOptions, variables]);

  // Ajouter variable depuis détection
  const handleAddDetectedVariable = useCallback((key: string) => {
    const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const newVar: CustomVariable = {
      key,
      label,
      type: 'text',
      required: true,
    };
    setVariables([...variables, newVar]);
  }, [variables]);

  // Supprimer une variable
  const handleRemoveVariable = useCallback((key: string) => {
    setVariables(variables.filter(v => v.key !== key));
  }, [variables]);

  // Insérer une variable dans le texte
  const handleInsertVariable = useCallback((key: string) => {
    const textarea = document.querySelector('textarea[name="texte"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = texte.slice(0, start) + `{${key}}` + texte.slice(end);
      setTexte(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + key.length + 2, start + key.length + 2);
      }, 0);
    } else {
      setTexte(texte + ` {${key}}`);
    }
  }, [texte]);

  // Ajouter un tag
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  // Supprimer un tag
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  // Charger un template
  const handleLoadTemplate = useCallback((template: Partial<ICustomResolution>) => {
    setTitre(template.titre || '');
    setTexte(template.texte || '');
    setCategorie(template.categorie || 'Autre');
    setMajorite(template.majorite || 'ART_24');
    setVariables(template.variables || []);
    setTags(template.tags || []);
    setShowTemplates(false);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    const exportData: ResolutionExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      resolution: {
        titre,
        texte,
        categorie,
        majorite,
        variables,
        scope,
        isTemplate: false,
        legalRef,
        tags,
        createdAt: resolution?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolution-${titre.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [titre, texte, categorie, majorite, variables, scope, legalRef, tags, resolution]);

  // Import
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ResolutionExport;
        if (data.version !== '1.0' || !data.resolution) {
          alert('Format de fichier invalide');
          return;
        }
        const r = data.resolution;
        setTitre(r.titre);
        setTexte(r.texte);
        setCategorie(r.categorie);
        setMajorite(r.majorite);
        setVariables(r.variables || []);
        setScope(r.scope || 'org');
        setTags(r.tags || []);
        setLegalRef(r.legalRef || '');
      } catch {
        alert('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Sauvegarder
  const handleSave = useCallback(() => {
    if (!titre.trim() || !texte.trim()) {
      alert('Le titre et le texte sont obligatoires');
      return;
    }

    const now = new Date().toISOString();
    const newResolution: ICustomResolution = {
      id: resolution?.id || `custom-${Date.now()}`,
      createdAt: resolution?.createdAt || now,
      updatedAt: now,
      createdBy: resolution?.createdBy || userId,
      organizationId: resolution?.organizationId || organizationId,
      titre: titre.trim(),
      texte: texte.trim(),
      categorie,
      majorite,
      variables,
      scope,
      isTemplate: false,
      legalRef: legalRef.trim() || undefined,
      legalWarnings: legalValidation.warnings.length > 0 ? legalValidation.warnings : undefined,
      usageCount: resolution?.usageCount || 0,
      lastUsedAt: resolution?.lastUsedAt,
      tags,
    };

    onSave(newResolution);
  }, [
    resolution, userId, organizationId, titre, texte, categorie, majorite,
    variables, scope, legalRef, legalValidation.warnings, tags, onSave
  ]);

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <h2>{resolution ? 'Modifier la résolution' : 'Nouvelle résolution personnalisée'}</h2>
        <div className={styles.headerActions}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            className={styles.iconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Importer"
          >
            <Upload size={18} />
          </button>
          {titre && texte && (
            <button className={styles.iconBtn} onClick={handleExport} title="Exporter">
              <Download size={18} />
            </button>
          )}
          <button className={styles.closeBtn} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Templates de départ */}
      {showTemplates && (
        <div className={styles.templatesSection}>
          <div className={styles.templatesSectionHeader}>
            <Sparkles size={18} />
            <span>Commencer avec un modèle</span>
            <button onClick={() => setShowTemplates(false)} className={styles.textBtn}>
              ou partir de zéro
            </button>
          </div>
          <div className={styles.templatesGrid}>
            {STARTER_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                className={styles.templateCard}
                onClick={() => handleLoadTemplate(tpl)}
              >
                <FileText size={20} />
                <span className={styles.templateTitle}>{tpl.titre}</span>
                <span className={styles.templateCategory}>{tpl.categorie}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.form}>
        {/* Titre */}
        <div className={styles.formGroup}>
          <label htmlFor="titre">Titre *</label>
          <input
            id="titre"
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex: Autorisation de travaux privatifs"
            className={styles.input}
          />
        </div>

        {/* Catégorie et Majorité */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="categorie">Catégorie *</label>
            <select
              id="categorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className={styles.select}
            >
              {CATEGORIES_RESOLUTIONS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="majorite">Article de loi *</label>
            <select
              id="majorite"
              value={majorite}
              onChange={(e) => setMajorite(e.target.value as MajorityType)}
              className={styles.select}
            >
              {Object.entries(MAJORITES).map(([key, maj]) => (
                <option key={key} value={key}>{maj.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Warning juridique */}
        {legalValidation.warnings.length > 0 && (
          <div className={styles.legalWarning}>
            <AlertTriangle size={18} />
            <div>
              {legalValidation.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Corps de la résolution */}
        <div className={styles.formGroup}>
          <label htmlFor="texte">
            Texte de la résolution *
            <span className={styles.hint}>Utilisez {'{variable}'} pour insérer des variables</span>
          </label>
          <textarea
            id="texte"
            name="texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="L'Assemblée Générale, après en avoir délibéré, décide de..."
            rows={10}
            className={styles.textarea}
          />
        </div>

        {/* Variables non définies */}
        {undefinedVariables.length > 0 && (
          <div className={styles.undefinedVars}>
            <span>Variables détectées non définies :</span>
            <div className={styles.undefinedVarsList}>
              {undefinedVariables.map(v => (
                <button
                  key={v}
                  className={styles.undefinedVarBtn}
                  onClick={() => handleAddDetectedVariable(v)}
                >
                  <Plus size={14} />
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variables définies */}
        <div className={styles.variablesSection}>
          <div className={styles.sectionHeader}>
            <Variable size={18} />
            <span>Variables ({variables.length})</span>
            <button
              className={styles.addBtn}
              onClick={() => setShowVariableForm(!showVariableForm)}
            >
              {showVariableForm ? <ChevronUp size={16} /> : <Plus size={16} />}
            </button>
          </div>

          {showVariableForm && (
            <div className={styles.variableForm}>
              <div className={styles.varFormRow}>
                <input
                  type="text"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  placeholder="Clé (ex: montant)"
                  className={styles.inputSmall}
                />
                <input
                  type="text"
                  value={newVarLabel}
                  onChange={(e) => setNewVarLabel(e.target.value)}
                  placeholder="Label (ex: Montant TTC)"
                  className={styles.inputSmall}
                />
                <select
                  value={newVarType}
                  onChange={(e) => setNewVarType(e.target.value as CustomVariable['type'])}
                  className={styles.selectSmall}
                >
                  {VARIABLE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newVarRequired}
                    onChange={(e) => setNewVarRequired(e.target.checked)}
                  />
                  Requis
                </label>
              </div>
              {newVarType === 'select' && (
                <input
                  type="text"
                  value={newVarOptions}
                  onChange={(e) => setNewVarOptions(e.target.value)}
                  placeholder="Options (séparées par des virgules)"
                  className={styles.input}
                />
              )}
              <button className={styles.confirmBtn} onClick={handleAddVariable}>
                <Check size={16} />
                Ajouter
              </button>
            </div>
          )}

          {variables.length > 0 && (
            <div className={styles.variablesList}>
              {variables.map(v => (
                <div key={v.key} className={styles.variableItem}>
                  <button
                    className={styles.varInsertBtn}
                    onClick={() => handleInsertVariable(v.key)}
                    title="Insérer dans le texte"
                  >
                    <Copy size={14} />
                  </button>
                  <span className={styles.varKey}>{`{${v.key}}`}</span>
                  <span className={styles.varLabel}>{v.label}</span>
                  <span className={styles.varType}>{VARIABLE_TYPES.find(t => t.value === v.type)?.label}</span>
                  {v.required && <span className={styles.varRequired}>*</span>}
                  <button
                    className={styles.varDeleteBtn}
                    onClick={() => handleRemoveVariable(v.key)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scope */}
        <div className={styles.formGroup}>
          <label>Partage</label>
          <div className={styles.scopeOptions}>
            {SCOPE_OPTIONS.map(opt => (
              <label key={opt.value} className={styles.scopeOption}>
                <input
                  type="radio"
                  name="scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value)}
                />
                <div>
                  <span className={styles.scopeLabel}>{opt.label}</span>
                  <span className={styles.scopeDesc}>{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className={styles.formGroup}>
          <label>Tags</label>
          <div className={styles.tagsInput}>
            <div className={styles.tagsList}>
              {tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Ajouter un tag..."
              className={styles.tagInputField}
            />
          </div>
        </div>

        {/* Référence légale */}
        <div className={styles.formGroup}>
          <label htmlFor="legalRef">Référence légale (optionnel)</label>
          <input
            id="legalRef"
            type="text"
            value={legalRef}
            onChange={(e) => setLegalRef(e.target.value)}
            placeholder="Ex: Loi du 10 juillet 1965, article 24"
            className={styles.input}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={onCancel}>
          Annuler
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={!titre.trim() || !texte.trim()}
        >
          <Save size={18} />
          {resolution ? 'Mettre à jour' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
