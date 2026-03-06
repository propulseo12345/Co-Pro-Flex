'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Settings,
  DollarSign,
  Wrench,
  FileText,
  Users,
  MessageSquare,
  ShoppingCart,
  BarChart3,
  ChevronDown,
  Scale,
  Building2,
  Receipt,
  ArrowLeftRight,
  Calculator,
  LucideIcon,
  AlertTriangle,
  FolderOpen,
  Calendar
} from 'lucide-react';
import clsx from 'clsx';
import styles from './Sidebar.module.css';
import ThemeToggle from '@/ui/ThemeToggle';
import { getRecouvrementAlerts } from '@/lib/utils/alerts';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 260;
const STORAGE_KEY = 'sidebar-width';

interface NavBadge {
  count?: number;
  severity: 'error' | 'warning';
  tooltip?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: NavBadge;
}

interface NavSection {
  name: string;
  icon: LucideIcon;
  items: NavItem[];
}

const TOP_LEVEL_ITEMS: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assemblées Générales', href: '/ag', icon: Users },
];

const NAV_SECTIONS: NavSection[] = [
  {
    name: 'Dossiers en cours',
    icon: FolderOpen,
    items: [
      { name: 'Tous les dossiers', href: '/dossiers', icon: FolderOpen },
    ]
  },
  {
    name: 'Finance & Comptabilité',
    icon: DollarSign,
    items: [
      { name: 'Comptabilité', href: '/finance/comptabilite', icon: Calculator },
      { name: 'Budgets', href: '/finance/budgets', icon: FileText },
      { name: 'Factures', href: '/finance/factures', icon: Receipt },
      { name: 'Appels de fonds', href: '/finance/appels-fonds', icon: DollarSign },
      { name: 'Mouvements bancaires', href: '/finance/mouvements-bancaires', icon: ArrowLeftRight },
      { name: 'Tantièmes', href: '/finance/tantiemes', icon: BarChart3 },
    ]
  },
  {
    name: 'Documents',
    icon: FileText,
    items: [
      { name: 'GED - Mes documents', href: '/documents/ged', icon: FileText },
      { name: 'Annexes comptables', href: '/documents/annexes', icon: Calculator },
      { name: 'Grand livre', href: '/documents/ledger', icon: FileText },
      { name: 'Balance comptable', href: '/documents/balance', icon: FileText },
      { name: 'Dépenses', href: '/documents/expenses', icon: FileText },
    ]
  },
  {
    name: 'Communication & Social',
    icon: MessageSquare,
    items: [
      { name: 'Mur', href: '/communication/mur', icon: MessageSquare },
      { name: 'Calendrier', href: '/communication/evenements', icon: Calendar },
      { name: 'Mail officiel', href: '/communication/mail', icon: MessageSquare },
    ]
  },
  {
    name: 'Ventes & Impayés',
    icon: ShoppingCart,
    items: [
      { name: 'Hub Ventes & Impayés', href: '/ventes-impayes', icon: ShoppingCart },
      { name: 'Gestion des Ventes', href: '/ventes-impayes/ventes', icon: ShoppingCart },
      { name: 'Gestion des Impayés', href: '/ventes-impayes/impayes', icon: ShoppingCart },
    ]
  },
  {
    name: 'Juridique',
    icon: Scale,
    items: [
      { name: 'Litiges', href: '/legal/disputes', icon: Scale },
    ]
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    items: [
      { name: 'Tableau de bord analytique', href: '/analytics', icon: BarChart3 },
    ]
  },
  {
    name: 'Maintenance de la copropriété',
    icon: Wrench,
    items: [
      { name: 'Carnet d\'entretien', href: '/maintenance/logbook', icon: FileText },
      { name: 'Contrats', href: '/maintenance/contracts', icon: FileText },
      { name: 'Prestataires', href: '/maintenance/providers', icon: Users },
      { name: 'Ordres de service', href: '/maintenance/service-orders', icon: Wrench },
    ]
  },
  {
    name: 'Paramètres & Configuration',
    icon: Settings,
    items: [
      { name: 'Paramètres généraux', href: '/settings', icon: Settings },
      { name: 'Copropriétaires', href: '/coproprietaires', icon: Users },
      { name: 'Paramétrage des lots', href: '/settings/info', icon: Building2 },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Calcul des badges d'alerte
  const alertBadges = useMemo(() => {
    const badges: Record<string, NavBadge> = {};

    // Alertes de recouvrement
    const recouvrementAlerts = getRecouvrementAlerts();
    if (recouvrementAlerts.length > 0) {
      const alert = recouvrementAlerts[0];
      badges['/finance/appels-fonds'] = {
        count: 1,
        severity: alert.severity === 'error' ? 'error' : 'warning',
        tooltip: alert.title
      };
    }

    return badges;
  }, []);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(width);
      }
    }
  }, []);

  // Update CSS variable when width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
        localStorage.setItem(STORAGE_KEY, newWidth.toString());
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  // Auto-expand section if current path matches
  const isPathInSection = (section: NavSection) => {
    return section.items.some(item => pathname.startsWith(item.href) && item.href !== '/');
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const isSectionExpanded = (section: NavSection) => {
    return expandedSections.includes(section.name) || isPathInSection(section);
  };

  return (
    <aside
      ref={sidebarRef}
      className={clsx(styles.sidebar, isResizing && styles.isResizing)}
      style={{ width: sidebarWidth }}
      aria-label="Navigation principale"
    >
      <div className={styles.logo}>
        <Link href="/dashboard" aria-label="Retour au tableau de bord">
          <span className={styles.logoText}>CoProFlex</span>
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Menu principal">
        {/* Top level items */}
        {TOP_LEVEL_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href}
              href={item.href}
              className={clsx(styles.navItem, isActive && styles.active)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.name} aria-hidden="true">
              <Icon size={20} aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className={styles.divider} role="separator" />

        {/* Sections with submenus */}
        {NAV_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = isSectionExpanded(section);
          const hasActiveChild = isPathInSection(section);

          return (
            <div key={section.name} className={styles.navSection}>
              <button
                onClick={() => toggleSection(section.name)}
                className={clsx(
                  styles.navSectionHeader,
                  hasActiveChild && styles.hasActiveChild
                )}
                aria-expanded={isExpanded}
                aria-label={`${section.name} - ${isExpanded ? 'réduire' : 'développer'}`}
              >
                <div className={styles.navSectionHeaderContent}>
                  <SectionIcon size={20} aria-hidden="true" />
                  <span>{section.name}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={clsx(styles.chevron, isExpanded && styles.chevronExpanded)}
                  aria-hidden="true"
                />
              </button>

              {isExpanded && (
                <div className={styles.navSubItems} role="group">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const badge = alertBadges[item.href];

                    return (
                      <Link key={item.href}
                        href={item.href}
                        className={clsx(styles.navSubItem, isActive && styles.active)}
                        aria-current={isActive ? 'page' : undefined}
                        title={badge?.tooltip}
                      >
                        <div className={styles.navSubItemWithBadge}>
                          <div className={styles.navSubItemContent}>
                            <span className={styles.navSubItemDot} aria-hidden="true" />
                            <span>{item.name}</span>
                          </div>
                          {badge && (
                            <span
                              className={clsx(
                                styles.alertBadge,
                                badge.severity === 'error' ? styles.alertBadgeError : styles.alertBadgeWarning
                              )}
                              aria-label={badge.tooltip}
                            >
                              <AlertTriangle size={10} />
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.themeToggleWrapper}>
          <ThemeToggle />
        </div>
        <div className={styles.divider} role="separator" />
        <div className={styles.user} role="region" aria-label="Informations utilisateur">
          <div className={styles.avatar} aria-hidden="true">JD</div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>Jean DUPONT</p>
            <p className={styles.userRole}>Président CS</p>
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={styles.resizer}
        onMouseDown={startResizing}
        onDoubleClick={() => {
          setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
          localStorage.setItem(STORAGE_KEY, DEFAULT_SIDEBAR_WIDTH.toString());
        }}
        title="Glisser pour redimensionner, double-clic pour réinitialiser"
        aria-label="Redimensionner la barre latérale"
      />
    </aside>
  );
}
