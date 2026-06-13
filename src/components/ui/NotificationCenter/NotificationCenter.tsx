'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  FileText,
  Wallet,
  Users,
  Settings,
  ExternalLink,
} from 'lucide-react';
import styles from './NotificationCenter.module.css';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';
export type NotificationCategory = 'finance' | 'ag' | 'maintenance' | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}

const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case 'error':
      return <AlertCircle size={18} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={18} aria-hidden="true" />;
    case 'info':
      return <Info size={18} aria-hidden="true" />;
    case 'success':
      return <CheckCircle size={18} aria-hidden="true" />;
  }
};

const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'finance':
      return <Wallet size={14} aria-hidden="true" />;
    case 'ag':
      return <Users size={14} aria-hidden="true" />;
    case 'maintenance':
      return <Settings size={14} aria-hidden="true" />;
    case 'general':
      return <FileText size={14} aria-hidden="true" />;
  }
};

const getCategoryLabel = (category: NotificationCategory) => {
  switch (category) {
    case 'finance':
      return 'Finance';
    case 'ag':
      return 'Assemblée Générale';
    case 'maintenance':
      return 'Maintenance';
    case 'general':
      return 'Général';
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
};

// Mock notifications for demo
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'warning',
    category: 'finance',
    title: 'Factures en retard',
    message: '3 factures sont en retard de paiement depuis plus de 30 jours.',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
    link: '/finance/factures',
    actionLabel: 'Voir les factures',
  },
  {
    id: 'notif-2',
    type: 'error',
    category: 'finance',
    title: 'Impayés critiques',
    message: '2 copropriétaires ont des impayés supérieurs à 1 000 €.',
    timestamp: new Date(Date.now() - 7200000),
    read: false,
    link: '/finance/unpaid',
    actionLabel: 'Gérer les impayés',
  },
  {
    id: 'notif-3',
    type: 'info',
    category: 'ag',
    title: 'AG programmée',
    message: "L'assemblée générale ordinaire est prévue dans 15 jours.",
    timestamp: new Date(Date.now() - 86400000),
    read: true,
    link: '/ag',
    actionLabel: 'Voir les détails',
  },
  {
    id: 'notif-4',
    type: 'warning',
    category: 'maintenance',
    title: 'Contrat à renouveler',
    message: 'Le contrat ascenseur expire dans 30 jours.',
    timestamp: new Date(Date.now() - 172800000),
    read: true,
    link: '/maintenance/contracts',
    actionLabel: 'Gérer le contrat',
  },
  {
    id: 'notif-5',
    type: 'success',
    category: 'finance',
    title: 'Clôture comptable réussie',
    message: 'La clôture de décembre 2024 a été validée avec succès.',
    timestamp: new Date(Date.now() - 259200000),
    read: true,
  },
];

export function NotificationCenter({
  notifications: externalNotifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    externalNotifications || MOCK_NOTIFICATIONS
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const drawerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => !n.read);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      onMarkAsRead?.(notification.id);
    }
    onNotificationClick?.(notification);
    if (notification.link) {
      window.location.href = notification.link;
    }
  }, [onNotificationClick, onMarkAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkAllAsRead?.();
  }, [onMarkAllAsRead]);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    onClearAll?.();
  }, [onClearAll]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  return (
    <div className={styles.container} ref={drawerRef}>
      <button
        className={`${styles.bellButton} ${unreadCount > 0 ? styles.hasUnread : ''}`}
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.drawer}>
          <div className={styles.header}>
            <h3 className={styles.title}>Notifications</h3>
            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button
                  className={styles.markAllReadButton}
                  onClick={handleMarkAllAsRead}
                >
                  Tout marquer comme lu
                </button>
              )}
              <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Fermer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setFilter('all')}
            >
              Toutes ({notifications.length})
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'unread' ? styles.filterActive : ''}`}
              onClick={() => setFilter('unread')}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          <div className={styles.content}>
            {filteredNotifications.length === 0 ? (
              <div className={styles.emptyState}>
                <Bell size={40} aria-hidden="true" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {filteredNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`${styles.item} ${!notification.read ? styles.itemUnread : ''} ${styles[`item${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}
                  >
                    <button
                      className={styles.itemButton}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`${styles.itemIcon} ${styles[`icon${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemHeader}>
                          <span className={styles.itemTitle}>{notification.title}</span>
                          <span className={styles.itemTime}>
                            <Clock size={12} aria-hidden="true" />
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className={styles.itemMessage}>{notification.message}</p>
                        <div className={styles.itemMeta}>
                          <span className={styles.categoryBadge}>
                            {getCategoryIcon(notification.category)}
                            {getCategoryLabel(notification.category)}
                          </span>
                          {notification.link && (
                            <span className={styles.itemLink}>
                              <ExternalLink size={12} aria-hidden="true" />
                              {notification.actionLabel || 'Voir'}
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.read && <span className={styles.unreadDot} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className={styles.footer}>
              <button className={styles.clearAllButton} onClick={handleClearAll}>
                Effacer toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
