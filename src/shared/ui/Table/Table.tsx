'use client';

import { useState, useMemo, useCallback, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './Table.module.css';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  truncate?: boolean;
  truncateWidth?: number;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  defaultSort?: SortConfig | null;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  stickyHeader?: boolean;
}

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function useTableSort<T>(
  data: T[],
  defaultSort?: SortConfig | null
): {
  sortedData: T[];
  sortConfig: SortConfig | null;
  handleSort: (key: string) => void;
  resetSort: () => void;
} {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);

  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortConfig(null);
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      let comparison = 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'fr-FR', { sensitivity: 'base' });
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'fr-FR');
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return { sortedData, sortConfig, handleSort, resetSort };
}

interface TruncatedCellProps {
  content: string;
  maxWidth?: number;
}

function TruncatedCell({ content, maxWidth = 200 }: TruncatedCellProps) {
  const shouldTruncate = content.length > maxWidth / 8;

  if (!shouldTruncate) {
    return <>{content}</>;
  }

  return (
    <span className={styles.truncated} title={content} style={{ maxWidth }}>
      {content}
    </span>
  );
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  defaultSort,
  className = '',
  emptyMessage = 'Aucune donnée',
  onRowClick,
  rowClassName,
  stickyHeader = false,
}: TableProps<T>) {
  const { sortedData, sortConfig, handleSort } = useTableSort(data, defaultSort);

  const getAlignClass = (align: string = 'left') => {
    return styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`];
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <table className={styles.table}>
        <thead className={stickyHeader ? styles.stickyHeader : ''}>
          <tr>
            {columns.map((column) => {
              const isActive = sortConfig?.key === column.key;
              const direction = isActive ? sortConfig.direction : null;
              const isSortable = column.sortable !== false;

              return (
                <th
                  key={column.key}
                  className={`${isSortable ? styles.sortableHeader : styles.header} ${getAlignClass(column.align)} ${isActive ? styles.active : ''} ${column.headerClassName || ''}`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      className={styles.headerButton}
                      onClick={() => handleSort(column.key)}
                      aria-label={`Trier par ${column.label}`}
                      aria-sort={
                        direction === 'asc'
                          ? 'ascending'
                          : direction === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                    >
                      <span className={styles.headerLabel}>{column.label}</span>
                      <span className={styles.sortIcon} aria-hidden="true">
                        {direction === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : direction === 'desc' ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronsUpDown size={16} />
                        )}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`${styles.row} ${onRowClick ? styles.clickable : ''} ${rowClassName?.(item) || ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => {
                  const value = column.render
                    ? column.render(item, index)
                    : String(getNestedValue(item, column.key) ?? '');

                  const shouldTruncate = column.truncate && typeof value === 'string';

                  return (
                    <td
                      key={column.key}
                      className={`${styles.cell} ${getAlignClass(column.align)} ${column.className || ''}`}
                    >
                      {shouldTruncate ? (
                        <TruncatedCell
                          content={value as string}
                          maxWidth={column.truncateWidth}
                        />
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
