'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { MODULES, getActiveModule } from '@/lib/config/navigation';
import { searchRoutes, SearchableRoute } from '@/lib/config/search';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { AuthStatus } from '@/components/ui/AuthStatus';
import styles from './HighBar.module.css';

export default function HighBar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeModule = getActiveModule(pathname);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableRoute[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchRoutes(searchQuery);
      setSearchResults(results);
      setIsSearchOpen(results.length > 0);
      setSelectedIndex(-1);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
      setSelectedIndex(-1);
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    router.push(path);
    setSearchQuery('');
    setIsSearchOpen(false);
    setSelectedIndex(-1);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleNavigate(searchResults[selectedIndex].path);
        } else if (searchResults.length > 0) {
          handleNavigate(searchResults[0].path);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isSearchOpen, searchResults, selectedIndex, handleNavigate]);

  return (
    <header className={styles.highbar} role="banner">
      <Link href="/dashboard" className={styles.logo} aria-label="Accueil CoProFlex">
        CoProFlex
      </Link>

      <nav className={styles.tabs} aria-label="Modules">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule?.id === mod.id;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={clsx(styles.tab, isActive && styles.tabActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.search} role="search" ref={searchRef}>
        <label htmlFor="global-search" className="sr-only">
          Rechercher dans l&apos;application
        </label>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          placeholder="Rechercher..."
          className={styles.searchInput}
          aria-label="Rechercher dans l'application"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
        />

        {isSearchOpen && searchResults.length > 0 && (
          <div
            className={styles.searchResults}
            role="listbox"
            aria-label="Résultats de recherche"
          >
            {searchResults.map((result, index) => (
              <button
                key={result.path}
                className={clsx(styles.searchResultItem, index === selectedIndex && styles.selected)}
                onClick={() => handleNavigate(result.path)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className={styles.resultContent}>
                  <div className={styles.resultTitle}>{result.title}</div>
                  <div className={styles.resultDescription}>{result.description}</div>
                </div>
                <div className={styles.resultCategory}>{result.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <AuthStatus />
        <NotificationCenter />
      </div>
    </header>
  );
}
