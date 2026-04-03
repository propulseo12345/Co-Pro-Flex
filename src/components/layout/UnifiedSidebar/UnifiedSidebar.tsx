'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Search, Settings, ChevronDown, ChevronRight,
  Sun, Moon, PanelLeftClose, PanelLeftOpen, Bell, Globe, ArrowLeft,
} from 'lucide-react';
import { MODULES, getActiveModule } from '@/lib/config/navigation';
import { searchRoutes, SearchableRoute } from '@/lib/config/search';
import { useSidebar } from '@/providers/SidebarContext';
import { useTheme } from '@/providers/ThemeProvider';
import { useCopro } from '@/providers/CoproContext';
import styles from './UnifiedSidebar.module.css';

export default function UnifiedSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeModule = getActiveModule(pathname);
  const { collapsed, toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { currentCopro } = useCopro();

  // Expanded modules state — active module starts expanded
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(activeModule?.id ? [activeModule.id] : [])
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableRoute[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Keep active module expanded when navigating
  useEffect(() => {
    if (activeModule?.id) {
      setExpandedModules(prev => {
        const next = new Set(prev);
        next.add(activeModule.id);
        return next;
      });
    }
  }, [activeModule?.id]);

  // Search logic
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

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < searchResults.length - 1 ? prev + 1 : prev);
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

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)} aria-label="Navigation principale">
      {/* Back to Portefeuille */}
      {!collapsed && (
        <Link href="/portefeuille" className={styles.backLink}>
          <ArrowLeft size={14} />
          <span>Portefeuille</span>
        </Link>
      )}
      {collapsed && (
        <Link href="/portefeuille" className={styles.backLinkCollapsed} title="Portefeuille">
          <ArrowLeft size={14} />
        </Link>
      )}

      {/* Logo */}
      <div className={styles.logo}>
        <Link href="/dashboard" className={styles.logoLink}>
          <div className={styles.logoIcon}>CF</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>CoProFlex</span>
              <span className={styles.logoSub}>Gestion de copropriété</span>
            </div>
          )}
        </Link>
        <button className={styles.collapseBtn} onClick={toggle} title={collapsed ? 'Ouvrir' : 'Réduire'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Copro selector */}
      {!collapsed && (
        <div className={styles.coproSelector}>
          <div className={styles.coproName}>
            {currentCopro?.name ?? 'Chargement...'}
            <ChevronDown size={12} className={styles.coproChevron} />
          </div>
          <div className={styles.coproAddress}>
            {currentCopro ? [currentCopro.address, currentCopro.city].filter(Boolean).join(', ') : ''}
          </div>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className={styles.searchWrap} ref={searchRef}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Rechercher..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
          />
          <span className={styles.searchShortcut}>⌘K</span>

          {isSearchOpen && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((result, index) => (
                <button
                  key={result.path}
                  className={clsx(styles.searchResultItem, index === selectedIndex && styles.searchResultSelected)}
                  onClick={() => handleNavigate(result.path)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={styles.searchResultTitle}>{result.title}</div>
                  <div className={styles.searchResultDesc}>{result.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className={styles.nav}>
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule?.id === mod.id;
          const isExpanded = expandedModules.has(mod.id);
          const hasSubPages = mod.subPages.length > 0;

          return (
            <div key={mod.id} className={styles.moduleGroup}>
              {/* Module item */}
              <div
                className={clsx(
                  styles.moduleItem,
                  isActive && styles.moduleItemActive
                )}
              >
                <Link
                  href={mod.href}
                  className={styles.moduleLink}
                  title={collapsed ? mod.label : undefined}
                >
                  <Icon size={18} className={styles.moduleIcon} />
                  {!collapsed && <span className={styles.moduleLabel}>{mod.label}</span>}
                </Link>
                {!collapsed && hasSubPages && (
                  <button
                    className={styles.moduleExpand}
                    onClick={() => toggleModule(mod.id)}
                    aria-label={isExpanded ? 'Réduire' : 'Développer'}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </div>

              {/* Sub pages */}
              {!collapsed && hasSubPages && isExpanded && (
                <div className={styles.subPages}>
                  {mod.subPages.map((page) => {
                    const isSubActive = pathname === page.href || pathname.startsWith(page.href + '/');
                    return (
                      <Link
                        key={page.href}
                        href={page.href}
                        className={clsx(styles.subItem, isSubActive && styles.subItemActive)}
                        aria-current={isSubActive ? 'page' : undefined}
                      >
                        <span className={styles.subDot} />
                        <span>{page.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.footerItem}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</span>}
        </button>
        <Link href="/preview/velorah" className={styles.footerItem} title="Landing Page">
          <Globe size={16} />
          {!collapsed && <span>Landing Page</span>}
        </Link>
        <Link href="/settings" className={styles.footerItem}>
          <Settings size={16} />
          {!collapsed && <span>Paramètres</span>}
        </Link>
        <div className={styles.footerDivider} />
        <div className={styles.userInfo}>
          <div className={styles.avatar}>JD</div>
          {!collapsed && (
            <div className={styles.userText}>
              <div className={styles.userName}>Jean Dupont</div>
              <div className={styles.userRole}>Syndic professionnel</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
