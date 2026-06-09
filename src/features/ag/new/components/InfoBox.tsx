'use client';

import { FileText } from 'lucide-react';
import { getNombreResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';
import { useResolutionTemplates } from '@/providers/ResolutionTemplatesProvider';
import type { AGFormData } from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface InfoBoxProps {
  type: AGFormData['type'];
}

export function InfoBox({ type }: InfoBoxProps) {
  const { templates } = useResolutionTemplates();
  return (
    <div className={type === 'URGENTE' ? styles.infoBoxUrgent : styles.infoBox}>
      <FileText size={20} aria-hidden="true" />
      <div>
        <strong>Prochaine étape : Construction de l'ordre du jour</strong>
        <p>
          {type === 'URGENTE'
            ? "L'ordre du jour doit se limiter aux seules questions urgentes justifiant cette convocation exceptionnelle."
            : 'Vous pourrez ajouter des résolutions depuis la bibliothèque de résolutions ou créer des résolutions personnalisées.'}
        </p>
        {type === 'ORDINAIRE' && (
          <p style={{ marginTop: '8px', color: 'var(--primary)', fontWeight: 500 }}>
            ✓ {getNombreResolutionsAGOrdinaire(templates)} résolutions standards seront ajoutées automatiquement pour une AG
            Ordinaire
          </p>
        )}
        {type === 'URGENTE' && (
          <p style={{ marginTop: '8px', color: 'var(--warning)', fontWeight: 500 }}>
            ⚡ Les résolutions standards ne seront pas ajoutées automatiquement pour une AG Urgente
          </p>
        )}
      </div>
    </div>
  );
}
