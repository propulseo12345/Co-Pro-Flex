'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import {
  getOrCreateOnboardingPeriod,
  listRepartitionKeys,
  createOnboardingBudget,
} from '@/lib/onboarding/api';
import { POSTES_BUDGET_ORDONNES, isPostePredefini } from '@/lib/constants/budget-postes';
import type { BudgetLineCreate } from '@/lib/onboarding/api';
import styles from './Step5Budget.module.css';

interface Step5Props {
  coproId: string;
  onComplete: (budgetId: string | null, periodId: string) => void;
  onBack: () => void;
}

interface LocalLine {
  id: string;
  label: string;
  amount: string;
  keyId: string;
  color?: string;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Step5Budget({ coproId, onComplete, onBack }: Step5Props) {
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [keys, setKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [savedBudgetId, setSavedBudgetId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [defaultKeyId, setDefaultKeyId] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      // Période d'onboarding canonique : réutilise la période portant la reprise / l'unique
      // période ouverte, sinon crée l'exercice CONTENANT aujourd'hui (dérivé de exercice_debut).
      // Évite que budget et reprise atterrissent sur des périodes différentes (exercice décalé,
      // onboarding à cheval sur l'année).
      const [keysRes, periodRes] = await Promise.all([
        listRepartitionKeys(coproId),
        getOrCreateOnboardingPeriod(coproId),
      ]);

      const loadedKeys = keysRes.data || [];
      setKeys(loadedKeys);
      if (periodRes.data) setPeriodId(periodRes.data.id);

      const generalKey = loadedKeys.find(k =>
        k.name.toLowerCase().includes('charges générales') ||
        k.name.toLowerCase().includes('charges generales') ||
        k.name.toLowerCase().includes('généraux') ||
        k.name.toLowerCase().includes('général')
      );
      setDefaultKeyId(generalKey?.id || loadedKeys[0]?.id || '');
    }
    load();
  }, [coproId]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Postes déjà ajoutés (par id prédéfini)
  const addedPosteIds = useMemo(() => new Set(lines.map(l => l.id)), [lines]);

  // Postes disponibles dans le dropdown (pas encore ajoutés)
  const availablePostes = useMemo(() =>
    POSTES_BUDGET_ORDONNES.filter(p => !addedPosteIds.has(p.id)),
  [addedPosteIds]);

  const total = useMemo(() =>
    lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0),
  [lines]);

  const addPredefini = useCallback((posteId: string) => {
    const poste = POSTES_BUDGET_ORDONNES.find(p => p.id === posteId);
    if (!poste) return;
    setLines(prev => [...prev, {
      id: poste.id,
      label: poste.label,
      amount: '',
      keyId: defaultKeyId,
      color: poste.color,
    }]);
    setShowDropdown(false);
  }, [defaultKeyId]);

  const addCustom = useCallback(() => {
    setLines(prev => [...prev, {
      id: makeId(),
      label: '',
      amount: '',
      keyId: defaultKeyId,
    }]);
    setShowDropdown(false);
  }, [defaultKeyId]);

  const updateLine = useCallback((id: string, field: 'amount' | 'keyId' | 'label', value: string) => {
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, [field]: value } : l
    ));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  }, []);

  const handleSkip = useCallback(async () => {
    if (!periodId) return;
    onComplete(null, periodId);
  }, [periodId, onComplete]);

  const handleSave = useCallback(async () => {
    if (!periodId) return;

    // Budget déjà créé (1er clic) + warning affiché : 2e clic = poursuivre malgré le 628.
    if (savedBudgetId) {
      onComplete(savedBudgetId, periodId);
      return;
    }

    setIsSaving(true);
    setWarning(null);

    const allLines: BudgetLineCreate[] = [];
    let order = 0;
    for (const line of lines) {
      const amount = parseFloat(line.amount);
      if (line.label.trim() && amount > 0 && line.keyId) {
        // Poste prédéfini : line.id EST l'id de poste (ex. 'eau') -> mapping vers le compte de charge.
        // Poste personnalisé (texte libre) : on envoie le libellé, qui tombera sur 628 + warning.
        const category = isPostePredefini(line.id) ? line.id : line.label.trim();
        allLines.push({
          label: line.label.trim(),
          amount,
          repartition_key_id: line.keyId,
          category,
          sort_order: order++,
        });
      }
    }

    if (allLines.length === 0) {
      setIsSaving(false);
      onComplete(null, periodId);
      return;
    }

    const year = new Date().getFullYear();
    const result = await createOnboardingBudget(
      coproId,
      periodId,
      `Budget prévisionnel ${year}`,
      allLines
    );

    setIsSaving(false);

    const newBudgetId = result.data?.budgetId || null;

    // Postes tombés sur le compte par défaut 628 (Divers) : avertir sans bloquer.
    // On affiche le bandeau et on attend un second clic « Continuer » pour avancer
    // (sinon l'étape se ferme et l'avertissement ne serait jamais vu).
    const unmapped = result.data?.unmappedCategories ?? [];
    if (unmapped.length > 0 && newBudgetId) {
      const labels = unmapped.map(cat => {
        const matched = lines.find(l => (isPostePredefini(l.id) ? l.id : l.label.trim()) === cat);
        return matched?.label.trim() || cat;
      });
      setWarning(
        `Postes sans compte de charge dédié, imputés en 628 (Divers) : ${labels.join(', ')}. Modifiable plus tard dans les Paramètres.`
      );
      setSavedBudgetId(newBudgetId);
      return;
    }

    onComplete(newBudgetId, periodId);
  }, [coproId, periodId, lines, onComplete, savedBudgetId]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Budget prévisionnel"
        description="Ajoutez les postes de dépenses prévus pour l'exercice. Chaque poste est rattaché à une clé de répartition."
      />

      <div className={styles.skipBanner}>
        <span className={styles.skipText}>Pas encore de budget voté ? Vous pourrez le créer plus tard.</span>
        <button className={styles.skipBtn} onClick={handleSkip}>Passer cette étape</button>
      </div>

      {warning && (
        <div className={styles.warningBanner} role="alert">
          {warning}
        </div>
      )}

      {/* Liste des postes ajoutés */}
      {lines.length > 0 && (
        <div className={styles.linesList}>
          {lines.map(line => {
            const isPredefini = POSTES_BUDGET_ORDONNES.some(p => p.id === line.id);
            return (
              <div key={line.id} className={styles.lineCard}>
                <div className={styles.lineHeader}>
                  {line.color && (
                    <span className={styles.lineDot} style={{ background: line.color }} />
                  )}
                  {isPredefini ? (
                    <span className={styles.lineLabel}>{line.label}</span>
                  ) : (
                    <input
                      className={styles.lineLabelInput}
                      value={line.label}
                      onChange={e => updateLine(line.id, 'label', e.target.value)}
                      placeholder="Nom du poste"
                    />
                  )}
                  <button className={styles.lineRemove} onClick={() => removeLine(line.id)} title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className={styles.lineFields}>
                  <div className={styles.amountWrapper}>
                    <input
                      className={styles.amountInput}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.amount}
                      onChange={e => updateLine(line.id, 'amount', e.target.value)}
                    />
                    <span className={styles.amountSuffix}>€ / an</span>
                  </div>
                  <select
                    className={styles.keySelect}
                    value={line.keyId}
                    onChange={e => updateLine(line.id, 'keyId', e.target.value)}
                  >
                    <option value="">Clé</option>
                    {keys.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {lines.length === 0 && (
        <div className={styles.emptyState}>
          Aucun poste ajouté. Cliquez sur le bouton ci-dessous pour commencer.
        </div>
      )}

      {/* Bouton ajouter + dropdown */}
      <div className={styles.addWrapper} ref={dropdownRef}>
        <button
          className={styles.addBtn}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Plus size={16} />
          Ajouter un poste
          <ChevronDown size={14} className={showDropdown ? styles.chevronOpen : ''} />
        </button>

        {showDropdown && (
          <div className={styles.dropdown}>
            {availablePostes.map(poste => (
              <button
                key={poste.id}
                className={styles.dropdownItem}
                onClick={() => addPredefini(poste.id)}
              >
                <span className={styles.dropdownDot} style={{ background: poste.color }} />
                <span>{poste.label}</span>
              </button>
            ))}
            {availablePostes.length > 0 && <div className={styles.dropdownDivider} />}
            <button className={styles.dropdownItem} onClick={addCustom}>
              <Plus size={14} className={styles.dropdownCustomIcon} />
              <span>Poste personnalisé</span>
            </button>
          </div>
        )}
      </div>

      {/* Total */}
      {lines.length > 0 && (
        <div className={styles.totalBar}>
          <div className={styles.totalLeft}>
            <span className={styles.totalLabel}>Total budget prévisionnel</span>
            <span className={styles.totalCount}>
              {lines.length} poste{lines.length > 1 ? 's' : ''}
            </span>
          </div>
          <span className={styles.totalAmount}>
            {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={handleSave}
          disabled={isSaving || !periodId}
        >
          {isSaving ? 'Enregistrement...' : warning ? 'Continuer malgré tout' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
