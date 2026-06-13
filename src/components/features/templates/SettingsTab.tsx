'use client';

import { Palette, Layout, Image as ImageIcon, X } from 'lucide-react';
import type { IPVTemplateSpec } from '@/types/models/pv-template';
import styles from '@/app/(dashboard)/settings/templates/[id]/editor.module.css';

interface SettingsTabProps {
  global: IPVTemplateSpec['global'];
  header: IPVTemplateSpec['header'];
  onUpdateGlobal: (updates: Partial<IPVTemplateSpec['global']>) => void;
  onUpdateHeader: (updates: Partial<IPVTemplateSpec['header']>) => void;
}

export function SettingsTab({ global: g, header, onUpdateGlobal, onUpdateHeader }: SettingsTabProps) {
  return (
    <div className={styles.settingsTab}>
      <div className={styles.settingsSection}>
        <h3><Palette size={18} /> Couleurs et polices</h3>
        <div className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <label>Police principale</label>
            <select value={g.fontFamily} onChange={e => onUpdateGlobal({ fontFamily: e.target.value })}>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="Times New Roman, serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
          </div>
          <div className={styles.settingItem}>
            <label>Taille de police</label>
            <select value={g.fontSize} onChange={e => onUpdateGlobal({ fontSize: e.target.value })}>
              <option value="10pt">10pt</option>
              <option value="11pt">11pt</option>
              <option value="12pt">12pt</option>
              <option value="14pt">14pt</option>
            </select>
          </div>
          <div className={styles.settingItem}>
            <label>Couleur principale</label>
            <input type="color" value={g.primaryColor} onChange={e => onUpdateGlobal({ primaryColor: e.target.value })} />
          </div>
          <div className={styles.settingItem}>
            <label>Couleur secondaire</label>
            <input type="color" value={g.secondaryColor} onChange={e => onUpdateGlobal({ secondaryColor: e.target.value })} />
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3><Layout size={18} /> En-tête du document</h3>
        <div className={styles.settingsGrid}>
          <div className={styles.settingItem + ' ' + styles.fullWidth}>
            <label>Titre</label>
            <input type="text" value={header.title} onChange={e => onUpdateHeader({ title: e.target.value })} />
          </div>
          <div className={styles.settingItem + ' ' + styles.fullWidth}>
            <label>Sous-titre</label>
            <input type="text" value={header.subtitle || ''} onChange={e => onUpdateHeader({ subtitle: e.target.value })} />
          </div>
          <div className={styles.settingItem}>
            <label><input type="checkbox" checked={header.showDate} onChange={e => onUpdateHeader({ showDate: e.target.checked })} />Afficher la date</label>
          </div>
          <div className={styles.settingItem}>
            <label><input type="checkbox" checked={header.showCopropriete} onChange={e => onUpdateHeader({ showCopropriete: e.target.checked })} />Afficher la copropriété</label>
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3><ImageIcon size={18} /> Logo</h3>
        <div className={styles.logoUpload}>
          <p className={styles.hint}>Téléchargez votre logo au format PNG ou JPG (max 1Mo)</p>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  onUpdateHeader({ logo: { url: reader.result as string, width: '150px', height: 'auto', position: 'left' } });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          {header.logo?.url && (
            <div className={styles.logoPreview}>
              {/* data-URI dynamique (FileReader) sans dimensions connues : next/image inadapté */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={header.logo.url} alt="Logo" />
              <button onClick={() => onUpdateHeader({ logo: undefined })}><X size={16} /> Supprimer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
