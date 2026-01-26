'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect?: (item: T, index: number) => void;
  onEscape?: () => void;
  loop?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'both';
  initialIndex?: number;
}

interface UseKeyboardNavigationReturn<T> {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  activeItem: T | undefined;
  containerProps: {
    role: string;
    tabIndex: number;
    onKeyDown: (event: React.KeyboardEvent) => void;
    'aria-activedescendant': string | undefined;
  };
  getItemProps: (index: number) => {
    id: string;
    role: string;
    tabIndex: number;
    'aria-selected': boolean;
    onMouseEnter: () => void;
    onClick: () => void;
  };
}

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  onEscape,
  loop = true,
  orientation = 'vertical',
  initialIndex = -1,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn<T> {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const idPrefix = useRef(`kbd-nav-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [items.length, activeIndex]);

  const getNextIndex = useCallback(
    (current: number, direction: 1 | -1): number => {
      const length = items.length;
      if (length === 0) return -1;

      if (current === -1) {
        return direction === 1 ? 0 : length - 1;
      }

      const next = current + direction;

      if (loop) {
        return ((next % length) + length) % length;
      }

      return Math.max(0, Math.min(length - 1, next));
    },
    [items.length, loop]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { key } = event;

      const isVerticalNav = orientation === 'vertical' || orientation === 'both';
      const isHorizontalNav = orientation === 'horizontal' || orientation === 'both';

      let handled = false;

      switch (key) {
        case 'ArrowDown':
          if (isVerticalNav) {
            event.preventDefault();
            setActiveIndex((prev) => getNextIndex(prev, 1));
            handled = true;
          }
          break;

        case 'ArrowUp':
          if (isVerticalNav) {
            event.preventDefault();
            setActiveIndex((prev) => getNextIndex(prev, -1));
            handled = true;
          }
          break;

        case 'ArrowRight':
          if (isHorizontalNav) {
            event.preventDefault();
            setActiveIndex((prev) => getNextIndex(prev, 1));
            handled = true;
          }
          break;

        case 'ArrowLeft':
          if (isHorizontalNav) {
            event.preventDefault();
            setActiveIndex((prev) => getNextIndex(prev, -1));
            handled = true;
          }
          break;

        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          handled = true;
          break;

        case 'End':
          event.preventDefault();
          setActiveIndex(items.length - 1);
          handled = true;
          break;

        case 'Enter':
        case ' ':
          if (activeIndex >= 0 && items[activeIndex]) {
            event.preventDefault();
            onSelect?.(items[activeIndex], activeIndex);
            handled = true;
          }
          break;

        case 'Escape':
          event.preventDefault();
          onEscape?.();
          handled = true;
          break;
      }

      if (!handled) {
        return;
      }
    },
    [activeIndex, getNextIndex, items, onEscape, onSelect, orientation]
  );

  const containerProps = {
    role: 'listbox' as const,
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    'aria-activedescendant':
      activeIndex >= 0 ? `${idPrefix.current}-item-${activeIndex}` : undefined,
  };

  const getItemProps = useCallback(
    (index: number) => ({
      id: `${idPrefix.current}-item-${index}`,
      role: 'option' as const,
      tabIndex: -1,
      'aria-selected': index === activeIndex,
      onMouseEnter: () => setActiveIndex(index),
      onClick: () => {
        setActiveIndex(index);
        if (items[index]) {
          onSelect?.(items[index], index);
        }
      },
    }),
    [activeIndex, items, onSelect]
  );

  return {
    activeIndex,
    setActiveIndex,
    activeItem: activeIndex >= 0 ? items[activeIndex] : undefined,
    containerProps,
    getItemProps,
  };
}

export default useKeyboardNavigation;
