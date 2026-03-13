'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, Plus, Check, X } from 'lucide-react';
import clsx from 'clsx';
import type { GEDFolder } from '../domain/types';
import styles from './FolderTreeSelect.module.css';

interface FolderTreeSelectProps {
  folders: GEDFolder[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreateFolder?: (name: string, parentId: string | null) => Promise<void>;
  placeholder?: string;
}

export function FolderTreeSelect({
  folders,
  value,
  onChange,
  onCreateFolder,
  placeholder = 'Sélectionner un dossier...',
}: FolderTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [creatingInParent, setCreatingInParent] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCreatingInParent(undefined);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Focus new folder input
  useEffect(() => {
    if (creatingInParent !== undefined && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingInParent]);

  // Build tree: root folders with their children
  const rootFolders = useMemo(
    () => folders.filter(f => !f.parentId).sort((a, b) => a.ordre - b.ordre),
    [folders]
  );

  const childrenMap = useMemo(() => {
    const map = new Map<string, GEDFolder[]>();
    folders.forEach(f => {
      if (f.parentId) {
        if (!map.has(f.parentId)) map.set(f.parentId, []);
        map.get(f.parentId)!.push(f);
      }
    });
    // Sort children
    map.forEach(children => children.sort((a, b) => a.ordre - b.ordre));
    return map;
  }, [folders]);

  const selectedFolder = useMemo(
    () => (value ? folders.find(f => f.id === value) : null),
    [value, folders]
  );

  const handleCreate = async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    await onCreateFolder(newFolderName.trim(), creatingInParent ?? null);
    setNewFolderName('');
    setCreatingInParent(undefined);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Folder size={14} className={styles.triggerIcon} />
        <span className={selectedFolder ? styles.triggerValue : styles.triggerPlaceholder}>
          {selectedFolder ? selectedFolder.nom : placeholder}
        </span>
        <ChevronRight
          size={14}
          className={clsx(styles.triggerChev, isOpen && styles.triggerChevOpen)}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown}>
          {/* Option: Racine */}
          <button
            type="button"
            className={clsx(styles.folderItem, value === null && styles.folderItemActive)}
            onClick={() => { onChange(null); setIsOpen(false); }}
          >
            <Folder size={14} />
            <span>Racine (sans dossier)</span>
            {value === null && <Check size={12} className={styles.checkIcon} />}
          </button>

          {/* Root folders */}
          {rootFolders.map(folder => {
            const children = childrenMap.get(folder.id) || [];
            const color = folder.color || '#2563eb';
            return (
              <div key={folder.id}>
                <button
                  type="button"
                  className={clsx(styles.folderItem, value === folder.id && styles.folderItemActive)}
                  onClick={() => { onChange(folder.id); setIsOpen(false); }}
                >
                  <div className={styles.folderIconBox} style={{ color }}>
                    <FolderOpen size={14} />
                  </div>
                  <span>{folder.nom}</span>
                  {value === folder.id && <Check size={12} className={styles.checkIcon} />}
                </button>
                {/* Sub-folders */}
                {children.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    className={clsx(styles.folderItem, styles.subFolder, value === sub.id && styles.folderItemActive)}
                    onClick={() => { onChange(sub.id); setIsOpen(false); }}
                  >
                    <Folder size={12} />
                    <span>{sub.nom}</span>
                    {value === sub.id && <Check size={12} className={styles.checkIcon} />}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Create folder */}
          {onCreateFolder && (
            <>
              <div className={styles.divider} />
              {creatingInParent !== undefined ? (
                <div className={styles.createRow}>
                  <input
                    ref={inputRef}
                    className={styles.createInput}
                    placeholder="Nom du dossier..."
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') { setCreatingInParent(undefined); setNewFolderName(''); }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.createConfirm}
                    onClick={handleCreate}
                    disabled={!newFolderName.trim()}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.createCancel}
                    onClick={() => { setCreatingInParent(undefined); setNewFolderName(''); }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.createBtn}
                  onClick={() => setCreatingInParent(null)}
                >
                  <Plus size={14} />
                  <span>Créer un dossier</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
