'use client';

import { useState, useCallback } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createLogbookEntry, type LogbookEntryCreate } from '@/lib/maintenance/api';
import styles from './StepCarnetEntretien.module.css';

interface StepCarnetEntretienProps {
  coproId: string;
  onClose: () => void;
}

interface LogbookEntry {
  id: string;
  title: string;
  entryType: string;
  entryTypeLabel: string;
  happenedAt: string;
  cost: number;
}

const ENTRY_TYPES: { value: string; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance courante' },
  { value: 'reparation', label: 'Réparation' },
  { value: 'remplacement', label: 'Remplacement équipement' },
  { value: 'diagnostic', label: 'Diagnostic / Contrôle' },
  { value: 'ravalement', label: 'Ravalement / Façade' },
  { value: 'toiture', label: 'Toiture' },
  { value: 'ascenseur', label: 'Ascenseur' },
  { value: 'chauffage', label: 'Chauffage / Chaudière' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'parties_communes', label: 'Parties communes' },
  { value: 'autre', label: 'Autre' },
];

export function StepCarnetEntretien({ coproId, onClose }: StepCarnetEntretienProps) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState('');
  const [happenedAt, setHappenedAt] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setEntryType('');
    setHappenedAt('');
    setCost('');
    setDescription('');
  }, []);

  const canAdd = title.trim() && entryType && happenedAt;

  const handleAdd = useCallback(async () => {
    if (!canAdd) return;
    setIsSaving(true);

    try {
      const payload: LogbookEntryCreate = {
        copro_id: coproId,
        entry_type: entryType,
        category: 'courante',
        title: title.trim(),
        description: description.trim() || undefined,
        happened_at: happenedAt,
        cost: cost ? parseFloat(cost) : undefined,
        status: 'realisee',
      };

      const { data, error } = await createLogbookEntry(payload);

      if (error || !data) {
        alert('Erreur lors de l\'ajout: ' + (error?.message || 'erreur inconnue'));
        setIsSaving(false);
        return;
      }

      const typeLabel = ENTRY_TYPES.find(t => t.value === entryType)?.label || entryType;

      setEntries(prev => [
        ...prev,
        {
          id: data.id,
          title: title.trim(),
          entryType,
          entryTypeLabel: typeLabel,
          happenedAt,
          cost: parseFloat(cost) || 0,
        },
      ]);

      resetForm();
    } catch (err) {
      alert('Erreur inattendue');
    } finally {
      setIsSaving(false);
    }
  }, [canAdd, coproId, title, entryType, happenedAt, cost, description, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const formatAmount = (amount: number) =>
    amount > 0 ? `${amount.toLocaleString('fr-FR')} euros` : '-';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <StepHeader
        title="Carnet d'entretien"
        description="Renseignez les interventions passées de votre copropriété (ravalement, remplacement chaudière, diagnostics...). Cette étape est facultative, vous pourrez les ajouter plus tard dans le module Maintenance."
      />

      {/* Form */}
      <div className={styles.form}>
        <div className={styles.formTitle}>
          <BookOpen size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
          Ajouter une intervention passée
        </div>

        <div className={styles.fields}>
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Libellé de l&apos;intervention *</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Ravalement façade côté rue"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Type *</label>
            <select
              className={styles.select}
              value={entryType}
              onChange={e => setEntryType(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {ENTRY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de réalisation *</label>
            <input
              className={styles.input}
              type="date"
              value={happenedAt}
              onChange={e => setHappenedAt(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Coût (euros)</label>
            <input
              className={`${styles.input} ${styles.inputMoney}`}
              type="number"
              step="0.01"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Description (optionnel)</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Détails de l'intervention, prestataire, observations..."
              rows={2}
            />
          </div>
        </div>

        <button
          className={styles.btnAdd}
          onClick={handleAdd}
          disabled={!canAdd || isSaving}
        >
          {isSaving ? 'Enregistrement...' : 'Ajouter cette intervention'}
        </button>
      </div>

      {/* Entries list */}
      {entries.length > 0 ? (
        <div className={styles.list}>
          {entries.map(e => (
            <div key={e.id} className={styles.listItem}>
              <div className={styles.listItemInfo}>
                <span className={styles.listItemTitle}>{e.title}</span>
                <span className={styles.listItemMeta}>
                  {e.entryTypeLabel} — {formatDate(e.happenedAt)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.listItemAmount}>{formatAmount(e.cost)}</span>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          Aucune intervention ajoutée pour le moment.
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnClose} onClick={onClose}>
          Fermer
        </button>
        <button className={styles.btnDone} onClick={onClose}>
          {entries.length > 0 ? `Terminé (${entries.length} intervention${entries.length > 1 ? 's' : ''})` : 'Passer'}
        </button>
      </div>
      <p className={styles.skipNote}>
        Cette étape est optionnelle. Vous pouvez ajouter des interventions plus tard dans le module Maintenance.
      </p>
    </div>
  );
}
