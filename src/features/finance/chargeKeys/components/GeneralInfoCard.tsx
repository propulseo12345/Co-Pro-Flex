'use client';

import { Key, MoreVertical } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/cles-repartition/[id]/cle-detail.module.css';

type CleType = 'GENERALE' | 'PERSONNALISEE';

const TYPE_OPTIONS: Array<{ value: CleType; label: string; icon: React.ReactNode }> = [
  { value: 'GENERALE', label: 'Tantiemes generaux', icon: <Key size={16} /> },
  { value: 'PERSONNALISEE', label: 'Personnalisee', icon: <MoreVertical size={16} /> },
];

interface GeneralInfoCardProps {
  nom: string;
  code: string;
  type: CleType;
  description: string;
  isManager: boolean;
  onNomChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onTypeChange: (value: CleType) => void;
  onDescriptionChange: (value: string) => void;
}

export function GeneralInfoCard({
  nom,
  code,
  type,
  description,
  isManager,
  onNomChange,
  onCodeChange,
  onTypeChange,
  onDescriptionChange,
}: GeneralInfoCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Informations generales</h2>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Nom de la cle</label>
          <input
            type="text"
            value={nom}
            onChange={e => onNomChange(e.target.value)}
            placeholder="Ex: Charges generales"
            disabled={!isManager}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Code</label>
          <input
            type="text"
            value={code}
            onChange={e => onCodeChange(e.target.value)}
            placeholder="Ex: CLE-GEN"
            className={styles.codeInput}
            disabled
          />
        </div>
        <div className={styles.formGroup}>
          <label>Type</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value as CleType)}
            disabled={!isManager}
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="Description optionnelle..."
            rows={2}
            disabled={!isManager}
          />
        </div>
      </div>
    </div>
  );
}
