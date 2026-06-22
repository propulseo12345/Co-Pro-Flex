'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import styles from './BuildingsManager.module.css';

export interface BuildingItem {
  id: string;
  name: string;
  floors_count: number | null;
}

interface BuildingsManagerProps {
  buildings: BuildingItem[];
  isMutating: boolean;
  onCreate: (payload: { name: string; floors_count: number | null }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

/**
 * Bloc de gestion des bâtiments d'une copro : ajout rapide (nom + nb d'étages) et liste
 * avec suppression. Présentationnel — l'état vit dans le parent (hook useBuildings).
 * Réutilisé dans l'étape 3 du wizard et dans les paramètres copro.
 */
export function BuildingsManager({ buildings, isMutating, onCreate, onDelete }: BuildingsManagerProps) {
  const [name, setName] = useState('');
  const [floors, setFloors] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), floors_count: floors ? parseInt(floors, 10) : null });
    setName('');
    setFloors('');
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <Building2 size={16} />
        <span className={styles.title}>Bâtiments</span>
        <span className={styles.hint}>Optionnel — rattachez ensuite chaque lot à son bâtiment</span>
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom du bâtiment (ex : Bâtiment A)"
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <input
          className={styles.inputSmall}
          type="number"
          min="1"
          value={floors}
          onChange={e => setFloors(e.target.value)}
          placeholder="Étages"
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={!name.trim() || isMutating}>
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {buildings.length > 0 && (
        <ul className={styles.list}>
          {buildings.map(b => (
            <li key={b.id} className={styles.item}>
              <span className={styles.itemName}>{b.name}</span>
              {b.floors_count != null && (
                <span className={styles.itemMeta}>
                  {b.floors_count} niveau{b.floors_count > 1 ? 'x' : ''}
                </span>
              )}
              <button
                className={styles.delBtn}
                onClick={() => onDelete(b.id)}
                disabled={isMutating}
                title="Supprimer le bâtiment"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
