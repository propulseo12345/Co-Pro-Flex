'use client';

import { Star, Lock, Eye, Edit, MoreVertical, Copy, Download, StarOff, Trash2, Check, AlertCircle } from 'lucide-react';
import type { IPVTemplate } from '@/types/models/pv-template';
import styles from '@/app/(dashboard)/settings/templates/templates.module.css';

interface ValidationStatus {
  status: 'valid' | 'warning' | 'error';
  message: string;
}

interface TemplateCardProps {
  template: IPVTemplate;
  activeMenu: string | null;
  onToggleMenu: (id: string | null) => void;
  onPreview: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string, name: string) => void;
  onExport: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  getValidationStatus: (template: IPVTemplate) => ValidationStatus;
  formatDate: (date: Date | string) => string;
}

export function TemplateCard({
  template,
  activeMenu,
  onToggleMenu,
  onPreview,
  onEdit,
  onDuplicate,
  onExport,
  onSetDefault,
  onDelete,
  getValidationStatus,
  formatDate,
}: TemplateCardProps) {
  const validation = getValidationStatus(template);

  return (
    <div className={`${styles.templateCard} ${template.isDefault ? styles.defaultCard : ''} ${template.isSystemTemplate ? styles.systemCard : ''}`}>
      <div className={styles.cardBadges}>
        {template.isSystemTemplate && (<span className={styles.badgeSystem}><Lock size={12} />Système</span>)}
        {template.isDefault && (<span className={styles.badgeDefault}><Star size={12} />Par défaut</span>)}
        {template.status === 'draft' && (<span className={styles.badgeDraft}>Brouillon</span>)}
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{template.name}</h3>
        {template.description && (<p className={styles.cardDescription}>{template.description}</p>)}
        <div className={styles.cardMeta}>
          <span>Modifié le {formatDate(template.updatedAt)}</span>
          <span>•</span>
          <span>{template.usageCount || 0} utilisation(s)</span>
        </div>
        <div className={`${styles.cardValidation} ${styles[`validation${validation.status.charAt(0).toUpperCase() + validation.status.slice(1)}`]}`}>
          {validation.status === 'valid' && <Check size={14} />}
          {validation.status !== 'valid' && <AlertCircle size={14} />}
          <span>{validation.message}</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button className={styles.btnIcon} onClick={() => onPreview(template.id)} title="Aperçu"><Eye size={18} /></button>
        {!template.isSystemTemplate && (<button className={styles.btnIcon} onClick={() => onEdit(template.id)} title="Modifier"><Edit size={18} /></button>)}
        <div className={styles.menuContainer}>
          <button className={styles.btnIcon} onClick={() => onToggleMenu(activeMenu === template.id ? null : template.id)}><MoreVertical size={18} /></button>
          {activeMenu === template.id && (
            <div className={styles.menu}>
              <button onClick={() => onDuplicate(template.id, template.name)}><Copy size={16} />Dupliquer</button>
              <button onClick={() => onExport(template.id)}><Download size={16} />Exporter</button>
              {!template.isDefault && !template.isSystemTemplate && (<button onClick={() => onSetDefault(template.id)}><Star size={16} />Définir par défaut</button>)}
              {template.isDefault && !template.isSystemTemplate && (<button disabled><StarOff size={16} />Retirer par défaut</button>)}
              {!template.isSystemTemplate && (
                <>
                  <hr />
                  <button className={styles.menuDanger} onClick={() => { onDelete(template.id); onToggleMenu(null); }}><Trash2 size={16} />Supprimer</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
