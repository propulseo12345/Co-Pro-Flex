'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getActiveModule } from '@/lib/config/navigation';
import { useSidebar } from '@/providers/SidebarContext';
import styles from './ModuleSidebar.module.css';

export default function ModuleSidebar() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);
  const { collapsed, toggle } = useSidebar();

  if (!activeModule || activeModule.subPages.length === 0) {
    return null;
  }

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)} aria-label="Sous-navigation">
      <div className={styles.topRow}>
        {!collapsed && <div className={styles.title}>{activeModule.label}</div>}
        <button className={styles.toggleBtn} onClick={toggle} title={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {activeModule.subPages.map((page) => {
          const Icon = page.icon;
          const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
          return (
            <Link
              key={page.href}
              href={page.href}
              className={clsx(styles.item, isActive && styles.itemActive)}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? page.label : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {!collapsed && <span>{page.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <Link href="/settings" className={styles.settingsLink} aria-label="Paramètres">
          <Settings size={16} />
        </Link>
      </div>
    </aside>
  );
}
