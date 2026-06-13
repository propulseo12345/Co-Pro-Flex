'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
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
          const isModuleActive = pathname === mod.href
            || pathname.startsWith(mod.href + '/')
            || mod.subPages?.some(sp => pathname === sp.href || pathname.startsWith(sp.href + '/'));

          return (
            <div key={mod.id}>
              <Link
                href={mod.href}
                className={clsx(styles.navItem, isModuleActive && styles.navItemActive)}
                title={collapsed ? mod.label : undefined}
              >
                <Icon size={18} className={styles.navIcon} />
                {!collapsed && <span className={styles.navLabel}>{mod.label}</span>}
              </Link>
              {isModuleActive && !collapsed && mod.subPages && mod.subPages.length > 0 && (
                <div className={styles.subPages}>
                  {mod.subPages.map((sp) => {
                    const SubIcon = sp.icon;
                    const isSubActive = pathname === sp.href || pathname.startsWith(sp.href + '/');
                    return (
                      <Link
                        key={sp.href}
                        href={sp.href}
                        className={clsx(styles.subItem, isSubActive && styles.subItemActive)}
                      >
                        {SubIcon && <SubIcon size={14} className={styles.subIcon} />}
                        <span>{sp.label}</span>
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
