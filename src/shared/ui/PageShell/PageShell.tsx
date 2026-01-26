'use client';

import { ReactNode } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import styles from './PageShell.module.css';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  actions,
  breadcrumbs,
  children,
  className = '',
}: PageShellProps) {
  return (
    <div className={`${styles.shell} ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs} aria-label="Fil d'Ariane">
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <a href="/dashboard" className={styles.breadcrumbLink}>
                <Home size={14} />
              </a>
            </li>
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className={styles.breadcrumbItem}>
                <ChevronRight size={14} className={styles.breadcrumbSeparator} />
                {crumb.href ? (
                  <a href={crumb.href} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </a>
                ) : (
                  <span className={styles.breadcrumbCurrent} aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
