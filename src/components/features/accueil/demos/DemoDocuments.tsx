'use client';

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_DOCUMENTS } from './demoData';

export function DemoDocuments() {
  const [activeFolder, setActiveFolder] = useState(0);

  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Gestion documentaire</div>
          <div className={styles.topBarSubtitle}>43 documents · 5 dossiers</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrimary}>
            <Upload size={12} />
            Importer
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
        {/* Sidebar dossiers */}
        <div>
          <div className={styles.sectionTitle}>Dossiers</div>
          {DEMO_DOCUMENTS.folders.map((folder, i) => (
            <div
              key={folder.name}
              className={`${styles.folderItem} ${i === activeFolder ? styles.folderItemActive : ''}`}
              onClick={() => setActiveFolder(i)}
            >
              <span>{folder.icon}</span>
              <span>{folder.name}</span>
              <span className={styles.folderCount}>{folder.count}</span>
            </div>
          ))}
        </div>

        {/* Liste fichiers */}
        <div>
          <div className={styles.sectionTitle}>Fichiers récents</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>Nom</th>
                <th className={styles.tableHeader}>Catégorie</th>
                <th className={styles.tableHeader}>Date</th>
                <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Taille</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DOCUMENTS.files.map((file) => (
                <tr key={file.name} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} style={{ color: 'var(--demo-primary)' }} />
                      {file.name}
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>{file.category}</span>
                  </td>
                  <td className={styles.tableCell} style={{ color: 'var(--demo-text-tertiary)' }}>{file.date}</td>
                  <td className={styles.tableCell} style={{ textAlign: 'right', color: 'var(--demo-text-tertiary)' }}>{file.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
