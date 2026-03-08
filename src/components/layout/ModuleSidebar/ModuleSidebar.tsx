'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Settings } from 'lucide-react';
import { getActiveModule } from '@/lib/config/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import styles from './ModuleSidebar.module.css';

export default function ModuleSidebar() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  if (!activeModule || activeModule.subPages.length === 0) {
    return null;
  }

  return (
    <aside className={styles.sidebar} aria-label="Sous-navigation">
      <div className={styles.title}>{activeModule.label}</div>

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
            >
              <Icon size={16} aria-hidden="true" />
              <span>{page.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle />
        <Link href="/settings" className={styles.settingsLink} aria-label="Paramètres">
          <Settings size={16} />
        </Link>
      </div>
    </aside>
  );
}
