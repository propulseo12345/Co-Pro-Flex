'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Settings } from 'lucide-react';
import { GESTIONNAIRE_MODULES } from '@/lib/config/navigationGestionnaire';
import { useSidebar } from '@/providers/SidebarContext';
import { useTheme } from '@/providers/ThemeProvider';
import styles from './GestionnaireSidebar.module.css';

export default function GestionnaireSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)} aria-label="Navigation gestionnaire">
      {/* Logo */}
      <div className={styles.logo}>
        <Link href="/portefeuille" className={styles.logoLink}>
          <div className={styles.logoIcon}>CF</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>Mon Cabinet</span>
              <span className={styles.logoSub}>Gestionnaire</span>
            </div>
          )}
        </Link>
        <button className={styles.collapseBtn} onClick={toggle} title={collapsed ? 'Ouvrir' : 'Réduire'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {GESTIONNAIRE_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = pathname === mod.href || pathname.startsWith(mod.href + '/');

          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={clsx(styles.navItem, isActive && styles.navItemActive)}
              title={collapsed ? mod.label : undefined}
            >
              <Icon size={18} className={styles.navIcon} />
              {!collapsed && <span className={styles.navLabel}>{mod.label}</span>}
            </Link>
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
