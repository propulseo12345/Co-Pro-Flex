'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import {
  ensureAccountingPeriod,
  listRepartitionKeys,
  createOnboardingBudget,
} from '@/lib/onboarding/api';
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
}

interface Category {
  name: string;
  lines: LocalLine[];
}

const DEFAULT_CATEGORIES = [
  'Charges courantes',
  'Entretien',
  'Assurances',
  'Honoraires',
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Step5Budget({ coproId, onComplete, onBack }: Step5Props) {
  const [categories, setCategories] = useState<Category[]>([
    {
      name: 'Charges courantes',
      lines: [{ id: makeId(), label: '', amount: '', keyId: '' }],
    },
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [keys, setKeys] = useState<Array<{ id: string; name: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [periodId, setPeriodId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const currentYear = new Date().getFullYear();
      const [keysRes, periodRes] = await Promise.all([
        listRepartitionKeys(coproId),
        ensureAccountingPeriod(coproId, currentYear),
      ]);
      if (keysRes.data) setKeys(keysRes.data);
      if (periodRes.data) setPeriodId(periodRes.data.id);
    }
    load();
  }, [coproId]);

  const total = useMemo(() => {
    return categories.reduce((sum, cat) => {
      return sum + cat.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    }, 0);
  }, [categories]);

  const updateLine = useCallback((catIdx: number, lineId: string, field: keyof LocalLine, value: string) => {
    setCategories(prev => prev.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return {
        ...cat,
        lines: cat.lines.map(l => l.id === lineId ? { ...l, [field]: value } : l),
      };
    }));
  }, []);

  const addLine = useCallback((catIdx: number) => {
    setCategories(prev => prev.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return { ...cat, lines: [...cat.lines, { id: makeId(), label: '', amount: '', keyId: '' }] };
    }));
  }, []);

  const removeLine = useCallback((catIdx: number, lineId: string) => {
    setCategories(prev => prev.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return { ...cat, lines: cat.lines.filter(l => l.id !== lineId) };
    }));
  }, []);

  const addCategory = useCallback(() => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategories(prev => [...prev, { name, lines: [{ id: makeId(), label: '', amount: '', keyId: '' }] }]);
    setNewCategoryName('');
  }, [newCategoryName]);

  const handleSkip = useCallback(async () => {
    if (!periodId) return;
    onComplete(null, periodId);
  }, [periodId, onComplete]);

  const handleSave = useCallback(async () => {
    if (!periodId) return;
    setIsSaving(true);

    // Collect all valid lines
    const allLines: BudgetLineCreate[] = [];
    let order = 0;
    for (const cat of categories) {
      for (const line of cat.lines) {
        const amount = parseFloat(line.amount);
        if (line.label.trim() && amount > 0 && line.keyId) {
          allLines.push({
            label: line.label.trim(),
            amount,
            repartition_key_id: line.keyId,
            category: cat.name,
            sort_order: order++,
          });
        }
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
    onComplete(result.data?.budgetId || null, periodId);
  }, [coproId, periodId, categories, onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Budget prévisionnel"
        description="Saisissez les postes de dépenses prévus pour l'exercice en cours. Chaque poste est rattaché à une clé de répartition."
      />

      <div className={styles.skipBanner}>
        <span className={styles.skipText}>Pas encore de budget voté ? Vous pourrez le créer plus tard.</span>
        <button className={styles.skipBtn} onClick={handleSkip}>Passer cette étape</button>
      </div>

      {categories.map((cat, catIdx) => {
        const catTotal = cat.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
        return (
          <div key={cat.name} className={styles.categorySection}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryName}>{cat.name}</span>
              <span className={styles.categoryTotal}>
                {catTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className={styles.categoryLines}>
              {cat.lines.map(line => (
                <div key={line.id} className={styles.lineRow}>
                  <input
                    className={styles.input}
                    placeholder="Libellé du poste"
                    value={line.label}
                    onChange={e => updateLine(catIdx, line.id, 'label', e.target.value)}
                  />
                  <input
                    className={`${styles.input} ${styles.inputMoney}`}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.amount}
                    onChange={e => updateLine(catIdx, line.id, 'amount', e.target.value)}
                  />
                  <select
                    className={styles.select}
                    value={line.keyId}
                    onChange={e => updateLine(catIdx, line.id, 'keyId', e.target.value)}
                  >
                    <option value="">Clé de répartition</option>
                    {keys.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeLine(catIdx, line.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className={styles.addLineBtn} onClick={() => addLine(catIdx)}>
                <Plus size={14} /> Ajouter un poste
              </button>
            </div>
          </div>
        );
      })}

      <div className={styles.addCategoryRow}>
        <input
          className={styles.addCategoryInput}
          placeholder="Nouvelle catégorie (ex: Eau, Chauffage...)"
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
        />
        <button className={styles.addCategoryBtn} onClick={addCategory}>
          <Plus size={14} /> Catégorie
        </button>
      </div>

      <div className={styles.totalBar}>
        <span className={styles.totalLabel}>Total budget prévisionnel</span>
        <span className={styles.totalAmount}>
          {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </span>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={handleSave}
          disabled={isSaving || !periodId}
        >
          {isSaving ? 'Enregistrement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
