'use client';

import { useState, useEffect, useCallback } from 'react';

// Types de notifications
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationModule = 'budget' | 'finance' | 'ag' | 'maintenance' | 'ventes' | 'coproprietaires' | 'documents' | 'communication';

export interface Notification {
  id: string;
  type: NotificationType;
  module: NotificationModule;
  titre: string;
  message: string;
  dateCreation: string;
  lu: boolean;
  actionUrl?: string;
  // Pour le mail
  mailEnvoye?: boolean;
  destinataires?: string[];
}

// Clé localStorage
const STORAGE_KEY = 'coproflex-notifications';

// Destinataires par défaut pour les mails (simulation)
const DEFAULT_MAIL_RECIPIENTS = [
  'syndic@coproflex.fr',
  'conseil.syndical@coproflex.fr'
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les notifications depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erreur lors du chargement des notifications:', e);
    }
    setIsLoading(false);
  }, []);

  // Sauvegarder dans localStorage
  const saveNotifications = useCallback((notifs: Notification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des notifications:', e);
    }
  }, []);

  // Ajouter une notification
  const addNotification = useCallback((
    params: Omit<Notification, 'id' | 'dateCreation' | 'lu' | 'mailEnvoye'>
  ): Notification => {
    const newNotification: Notification = {
      ...params,
      id: `notif-${Date.now()}`,
      dateCreation: new Date().toISOString(),
      lu: false,
      mailEnvoye: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });

    return newNotification;
  }, [saveNotifications]);

  // Simuler l'envoi de mail
  const sendMailNotification = useCallback(async (
    notification: Notification,
    destinataires: string[] = DEFAULT_MAIL_RECIPIENTS
  ): Promise<boolean> => {
    // Simulation d'envoi de mail (délai artificiel)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Marquer le mail comme envoyé
        setNotifications(prev => {
          const updated = prev.map(n =>
            n.id === notification.id
              ? { ...n, mailEnvoye: true, destinataires }
              : n
          );
          saveNotifications(updated);
          return updated;
        });

        // Log pour la simulation
        console.log(`[MAIL SIMULE] Envoyé à: ${destinataires.join(', ')}`);
        console.log(`[MAIL SIMULE] Sujet: ${notification.titre}`);
        console.log(`[MAIL SIMULE] Message: ${notification.message}`);

        resolve(true);
      }, 500);
    });
  }, [saveNotifications]);

  // Créer une notification avec envoi de mail
  const createNotificationWithMail = useCallback(async (
    params: Omit<Notification, 'id' | 'dateCreation' | 'lu' | 'mailEnvoye'>,
    destinataires?: string[]
  ): Promise<{ notification: Notification; mailSent: boolean }> => {
    const notification = addNotification(params);
    const mailSent = await sendMailNotification(notification, destinataires);
    return { notification, mailSent };
  }, [addNotification, sendMailNotification]);

  // Marquer une notification comme lue
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, lu: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, lu: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Supprimer une notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Supprimer toutes les notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, [saveNotifications]);

  // Notifications non lues
  const unreadNotifications = notifications.filter(n => !n.lu);
  const unreadCount = unreadNotifications.length;

  // Notifications par module
  const getNotificationsByModule = useCallback((module: NotificationModule) => {
    return notifications.filter(n => n.module === module);
  }, [notifications]);

  // Notifications récentes (dernières 24h)
  const recentNotifications = notifications.filter(n => {
    const notifDate = new Date(n.dateCreation);
    const now = new Date();
    const diffHours = (now.getTime() - notifDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    recentNotifications,
    isLoading,
    addNotification,
    createNotificationWithMail,
    sendMailNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getNotificationsByModule,
  };
}

// Fonctions utilitaires pour créer des notifications spécifiques
export const NotificationHelpers = {
  budgetModifie: (budgetNom: string, montant: number) => ({
    type: 'warning' as NotificationType,
    module: 'budget' as NotificationModule,
    titre: 'Budget modifié',
    message: `Le budget "${budgetNom}" a été modifié. Nouveau montant total : ${montant.toLocaleString('fr-FR')} EUR`,
    actionUrl: '/finance/budgets',
  }),

  budgetApprouve: (budgetNom: string) => ({
    type: 'success' as NotificationType,
    module: 'budget' as NotificationModule,
    titre: 'Budget approuvé',
    message: `Le budget "${budgetNom}" a été approuvé en Assemblée Générale.`,
    actionUrl: '/finance/budgets',
  }),

  budgetCree: (budgetNom: string) => ({
    type: 'info' as NotificationType,
    module: 'budget' as NotificationModule,
    titre: 'Nouveau budget créé',
    message: `Un nouveau budget "${budgetNom}" a été créé.`,
    actionUrl: '/finance/budgets',
  }),
};
