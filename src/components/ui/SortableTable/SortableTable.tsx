'use client';

import { useState, useMemo, useCallback, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './SortableTable.module.css';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableColumnHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function SortableColumnHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left',
  className = '',
}: SortableColumnHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      className={`${styles.sortableHeader} ${styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`]} ${isActive ? styles.active : ''} ${className}`}
    >
      <button
        type="button"
        className={styles.headerButton}
        onClick={handleClick}
        aria-label={`Trier par ${label}`}
        aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
      >
        <span className={styles.headerLabel}>{label}</span>
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
    </th>
  );
}

// Hook for managing sort state
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
        // Cycle through: asc -> desc -> null
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return null;
        }
      }
      // New sort key or was null
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

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Compare values
      let comparison = 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'fr-FR', { sensitivity: 'base' });
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        // Try to compare as strings
        comparison = String(aValue).localeCompare(String(bValue), 'fr-FR');
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return { sortedData, sortConfig, handleSort, resetSort };
}

// Helper to get nested object values using dot notation
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Visual sort indicator component
interface SortIndicatorProps {
  direction: SortDirection;
  size?: number;
}

export function SortIndicator({ direction, size = 16 }: SortIndicatorProps) {
  if (direction === 'asc') {
    return <ChevronUp size={size} className={styles.indicatorActive} />;
  }
  if (direction === 'desc') {
    return <ChevronDown size={size} className={styles.indicatorActive} />;
  }
  return <ChevronsUpDown size={size} className={styles.indicatorInactive} />;
}

// Utility component for table with sorting capability
interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  defaultSort?: SortConfig | null;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

export function SortableTable<T>({
  data,
  columns,
  keyExtractor,
  defaultSort,
  className = '',
  emptyMessage = 'Aucune donnée',
  onRowClick,
  rowClassName,
}: SortableTableProps<T>) {
  const { sortedData, sortConfig, handleSort } = useTableSort(data, defaultSort);

  return (
    <div className={`${styles.tableContainer} ${className}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) =>
              column.sortable !== false ? (
                <SortableColumnHeader
                  key={column.key}
                  label={column.label}
                  sortKey={column.key}
                  currentSort={sortConfig}
                  onSort={handleSort}
                  align={column.align}
                  className={column.headerClassName}
                />
              ) : (
                <th
                  key={column.key}
                  className={`${styles.header} ${styles[`align${(column.align || 'left').charAt(0).toUpperCase() + (column.align || 'left').slice(1)}`]} ${column.headerClassName || ''}`}
                >
                  {column.label}
                </th>
              )
            )}
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
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${styles.cell} ${styles[`align${(column.align || 'left').charAt(0).toUpperCase() + (column.align || 'left').slice(1)}`]} ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item, index)
                      : String(getNestedValue(item, column.key) ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
