'use client';

import { Mail } from 'lucide-react';
import type { EmailTemplate } from '@/hooks/modules/useFinanceData';
import styles from '@/app/(dashboard)/settings/reminders/reminders-settings.module.css';

interface TemplatesGridProps {
  templates: EmailTemplate[];
  isManager: boolean;
  onEdit: (template: EmailTemplate) => void;
}

export function TemplatesGrid({ templates, isManager, onEdit }: TemplatesGridProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Mail size={20} />
          Templates d&apos;email
        </h2>
      </div>

      <div className={styles.templatesGrid}>
        {templates.map((template) => (
          <div key={template.id} className={styles.templateCard}>
            <div className={styles.templateCardHeader}>
              <span className={styles.templateName}>{template.name}</span>
              <span className={styles.templateCode}>{template.code}</span>
            </div>
            <p className={styles.templateDescription}>
              {template.description || 'Aucune description'}
            </p>
            <p className={styles.templateSubject}>
              <strong>Sujet:</strong> {template.subject}
            </p>
            {isManager && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={() => onEdit(template)}
              >
                Modifier
              </button>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>Aucun template de relance configure</p>
      )}
    </div>
  );
}
