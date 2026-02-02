'use client';

import { Plus } from 'lucide-react';
import { ExportDropdown } from '@/components/features/maintenance/Contracts';
import type { ExportFormat } from '@/components/features/maintenance/Contracts/types';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsPageHeaderProps {
  onExport: (format: ExportFormat) => void;
  onAddContract: () => void;
}

export function ContractsPageHeader({ onExport, onAddContract }: ContractsPageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Contrats de la copropriete</h1>
        <p className={styles.subtitle}>
          Gerez vos contrats d&apos;assurance, de maintenance et autres prestations
        </p>
      </div>
      <div className={styles.actions}>
        <ExportDropdown onExport={onExport} />
        <button className="btn btn-primary" onClick={onAddContract}>
          <Plus size={16} aria-hidden="true" /> Ajouter un contrat
        </button>
      </div>
    </div>
  );
}
