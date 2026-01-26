'use client';

import { useState, useCallback } from 'react';
import { History, ChevronDown, Eye, Calendar, FileText } from 'lucide-react';
import type { ConvocationVersion } from '@/hooks/modules/useConvocationPreview';
import styles from './ConvocationVersionBadge.module.css';

interface ConvocationVersionBadgeProps {
  currentVersion: number;
  versions: ConvocationVersion[];
  onViewVersion: (version: number) => void;
}

export function ConvocationVersionBadge({
  currentVersion,
  versions,
  onViewVersion,
}: ConvocationVersionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleViewVersion = useCallback((version: number) => {
    onViewVersion(version);
    setIsOpen(false);
  }, [onViewVersion]);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={styles.badge}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <FileText size={14} aria-hidden="true" />
        <span className={styles.versionText}>Convocation v{currentVersion}</span>
        {versions.length > 1 && (
          <>
            <span className={styles.historyCount}>({versions.length})</span>
            <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true" />
          </>
        )}
      </button>

      {isOpen && versions.length > 1 && (
        <>
          <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown} role="listbox">
            <div className={styles.dropdownHeader}>
              <History size={14} aria-hidden="true" />
              <span>Historique des versions</span>
            </div>

            <div className={styles.versionList}>
              {versions.slice().reverse().map((version) => (
                <button
                  key={version.version}
                  type="button"
                  onClick={() => handleViewVersion(version.version)}
                  className={`${styles.versionItem} ${version.version === currentVersion ? styles.versionItemCurrent : ''}`}
                  role="option"
                  aria-selected={version.version === currentVersion}
                >
                  <div className={styles.versionInfo}>
                    <span className={styles.versionNumber}>
                      v{version.version}
                      {version.version === currentVersion && (
                        <span className={styles.currentLabel}>actuelle</span>
                      )}
                    </span>
                    <span className={styles.versionDate}>
                      <Calendar size={12} aria-hidden="true" />
                      {formatDate(version.generatedAt)}
                    </span>
                  </div>
                  <div className={styles.versionMeta}>
                    <span>{version.snapshot.resolutions.length} résolution(s)</span>
                  </div>
                  {version.version !== currentVersion && (
                    <Eye size={14} className={styles.viewIcon} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            <div className={styles.dropdownFooter}>
              <span>Les 10 dernières versions sont conservées</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
