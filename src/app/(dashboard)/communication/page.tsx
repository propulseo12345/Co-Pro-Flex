'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { MOCK_MAILS } from '@/features/communication/mail/domain/mock-data';
import { MOCK_CONVERSATION_PREVIEWS } from '@/features/communication/messagerie/domain/mock-data';
import { MOCK_POSTS } from '@/features/communication/mur/domain/mock-data';

import styles from './communication-hub.module.css';

// ── KPI computations ──────────────────────────────────────────────────────────

function getUnreadMailCount(): number {
  return MOCK_MAILS.filter(
    (m) => m.status === 'unread' && !m.isDraft,
  ).length;
}

function getUnreadMessageCount(): number {
  return MOCK_CONVERSATION_PREVIEWS.reduce((sum, c) => sum + c.unreadCount, 0);
}

function getRecentPostCount(): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return MOCK_POSTS.filter((p) => new Date(p.createdAt).getTime() > sevenDaysAgo).length;
}

// ── Preview helpers ───────────────────────────────────────────────────────────

function getLastMailSubjects(count: number): string[] {
  return MOCK_MAILS
    .filter((m) => m.status === 'unread' && !m.isDraft)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, count)
    .map((m) => m.subject);
}

function getActiveConversationCount(): number {
  return MOCK_CONVERSATION_PREVIEWS.filter((c) => !c.isArchived).length;
}

function getLastConversationName(): string | null {
  const sorted = [...MOCK_CONVERSATION_PREVIEWS]
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return sorted[0]?.title ?? null;
}

function getLastPinnedPostTitle(): string | null {
  const pinned = MOCK_POSTS.filter((p) => p.isPinned);
  return pinned[0]?.title ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommunicationHubPage() {
  const unreadMails = getUnreadMailCount();
  const unreadMessages = getUnreadMessageCount();
  const recentPosts = getRecentPostCount();

  const lastSubjects = getLastMailSubjects(2);
  const activeConversations = getActiveConversationCount();
  const lastConvName = getLastConversationName();
  const lastPinnedTitle = getLastPinnedPostTitle();

  return (
    <div className={styles.hubContainer}>
      {/* TopBar */}
      <div className={styles.topBar}>
        <h1 className={styles.topBarTitle}>Communication</h1>
        <p className={styles.topBarSubtitle}>
          Hub centralisé — mail, messagerie et mur communautaire
        </p>
      </div>

      {/* KPI Strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Mails non lus</p>
          <p className={`${styles.kpiValue} ${unreadMails > 0 ? styles.kpiValueWarning : ''}`}>
            {unreadMails}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Messages non lus</p>
          <p className={`${styles.kpiValue} ${unreadMessages > 0 ? styles.kpiValueInfo : ''}`}>
            {unreadMessages}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Publications récentes</p>
          <p className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>
            {recentPosts}
          </p>
        </div>
      </div>

      {/* Module Cards */}
      <div className={styles.modulesGrid}>
        {/* Mail */}
        <Link href="/communication/mail" className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleEmoji}>📩</span>
            <h2 className={styles.moduleTitle}>Boîte mail</h2>
            {unreadMails > 0 && (
              <span className={`${styles.moduleBadge} ${styles.badgeMail}`}>
                {unreadMails} non lu{unreadMails > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className={styles.modulePreview}>
            {lastSubjects.map((subject, i) => (
              <p key={i} className={styles.previewItem}>
                <span className={styles.previewDot} />
                {subject}
              </p>
            ))}
          </div>
          <div className={styles.moduleFooter}>
            <span className={styles.moduleFooterLabel}>Ouvrir la boîte mail</span>
            <ArrowRight size={16} className={styles.moduleArrow} />
          </div>
        </Link>

        {/* Messagerie */}
        <Link href="/communication/messagerie" className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleEmoji}>💬</span>
            <h2 className={styles.moduleTitle}>Messagerie</h2>
            {activeConversations > 0 && (
              <span className={`${styles.moduleBadge} ${styles.badgeMessaging}`}>
                {activeConversations} active{activeConversations > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className={styles.modulePreview}>
            {lastConvName && (
              <p className={styles.previewItem}>
                <span className={styles.previewDot} />
                {lastConvName}
              </p>
            )}
            {unreadMessages > 0 && (
              <p className={styles.previewItem}>
                <span className={styles.previewDot} />
                {unreadMessages} message{unreadMessages > 1 ? 's' : ''} non lu{unreadMessages > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className={styles.moduleFooter}>
            <span className={styles.moduleFooterLabel}>Ouvrir la messagerie</span>
            <ArrowRight size={16} className={styles.moduleArrow} />
          </div>
        </Link>

        {/* Mur */}
        <Link href="/communication/mur" className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleEmoji}>📋</span>
            <h2 className={styles.moduleTitle}>Mur communautaire</h2>
            {recentPosts > 0 && (
              <span className={`${styles.moduleBadge} ${styles.badgeMur}`}>
                {recentPosts} cette semaine
              </span>
            )}
          </div>
          <div className={styles.modulePreview}>
            {lastPinnedTitle && (
              <p className={styles.previewItem}>
                <span className={styles.previewDot} />
                📌 {lastPinnedTitle}
              </p>
            )}
          </div>
          <div className={styles.moduleFooter}>
            <span className={styles.moduleFooterLabel}>Voir le mur</span>
            <ArrowRight size={16} className={styles.moduleArrow} />
          </div>
        </Link>
      </div>
    </div>
  );
}
