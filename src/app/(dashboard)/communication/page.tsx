'use client';

import {
  Mail,
  MessageSquare,
  Calendar,
  ArrowRight,
  Bell,
  Clock
} from 'lucide-react';
import styles from './communication.module.css';
import Link from 'next/link';
import clsx from 'clsx';

const MODULES = [
  {
    id: 'mail',
    title: 'Mail officiel',
    description: 'Canal privilégié pour toutes les communications officielles avec traçabilité complète et archivage',
    icon: Mail,
    colorClass: 'indigo',
    link: '/communication/mail',
    stats: {
      label: 'mails non lus',
      value: 5
    },
    featured: true
  },
  {
    id: 'mur',
    title: 'Mur de la copropriété',
    description: 'Espace collaboratif pour partager informations, annonces et discussions publiques',
    icon: MessageSquare,
    colorClass: 'blue',
    link: '/communication/mur',
    stats: {
      label: 'publications actives',
      value: 8
    }
  },
  {
    id: 'evenements',
    title: 'Événements',
    description: 'Agenda de la vie de la copropriété - Réunions, fêtes, travaux et plus encore',
    icon: Calendar,
    colorClass: 'amber',
    link: '/communication/evenements',
    stats: {
      label: 'événements à venir',
      value: 5
    }
  }
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'mail',
    title: 'Convocation AG - 15 Décembre 2025',
    time: 'Il y a 2 heures',
    icon: Mail,
    colorClass: 'indigo'
  },
  {
    id: 3,
    type: 'mur',
    title: 'Nouvelle publication : Travaux toiture',
    time: 'Il y a 5 heures',
    icon: MessageSquare,
    colorClass: 'blue'
  },
  {
    id: 4,
    type: 'mail',
    title: 'Rappel : Appel de fonds Q1 2026',
    time: 'Hier',
    icon: Mail,
    colorClass: 'indigo'
  }
];

export default function CommunicationPage() {
  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Communication & Social</h1>
          <p className={styles.subtitle}>
            Hub centralisé pour toutes les communications de votre copropriété
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary">
            <Bell size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Notifications
          </button>
        </div>
      </div>

      {/* Quick Links - En haut */}
      <div className={styles.quickLinks}>
        <div className={styles.quickLinksGrid}>
          <Link href="/communication/mail/nouveau" className={clsx(styles.quickLink, styles.quickLinkPrimary)}>
            <Mail size={20} aria-hidden="true" />
            Envoyer un mail officiel
          </Link>
          <Link href="/communication/mur/nouveau" className={styles.quickLink}>
            <MessageSquare size={20} aria-hidden="true" />
            Nouvelle publication
          </Link>
          <Link href="/communication/evenements/nouveau" className={styles.quickLink}>
            <Calendar size={20} aria-hidden="true" />
            Créer un événement
          </Link>
        </div>
      </div>

      {/* Main Modules */}
      <div className={styles.modulesSection}>
        <h2 className={styles.sectionTitle}>Modules de communication</h2>
        <div className={styles.modulesGrid}>
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id}
                href={module.link}
                className={clsx(styles.moduleCard, styles[`module${module.colorClass.charAt(0).toUpperCase() + module.colorClass.slice(1)}`])} aria-hidden="true">
                <div className={styles.moduleHeader}>
                  <div className={clsx(styles.moduleIcon, styles[`moduleIcon${module.colorClass.charAt(0).toUpperCase() + module.colorClass.slice(1)}`])}>
                    <Icon size={28} aria-hidden="true" />
                  </div>
                  <ArrowRight size={20} className={styles.arrowIcon} aria-hidden="true" />
                </div>

                <h3 className={styles.moduleTitle}>{module.title}</h3>
                <p className={styles.moduleDescription}>{module.description}</p>

                <div className={styles.moduleFooter}>
                  <div className={styles.moduleStat}>
                    <span className={styles.statNumber}>{module.stats.value}</span>
                    <span className={styles.statText}>{module.stats.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.activitySection}>
        <div className={styles.activityHeader}>
          <h2 className={styles.sectionTitle}>Activité récente</h2>
        </div>

        <div className={styles.activityList}>
          {RECENT_ACTIVITY.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className={styles.activityItem}>
                <div className={clsx(styles.activityIcon, styles[`activityIcon${activity.colorClass.charAt(0).toUpperCase() + activity.colorClass.slice(1)}`])}>
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>{activity.title}</p>
                  <span className={styles.activityTime}>
                    <Clock size={12} aria-hidden="true" />
                    {activity.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
