'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';

import styles from './communication-hub.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ── Types pour les KPI ────────────────────────────────────────────────────────

interface HubKpis {
  unreadMails: number;
  unreadMessages: number;
  recentPosts: number;
  lastSubjects: string[];
  activeConversations: number;
  lastConvName: string | null;
  lastPinnedTitle: string | null;
}

const EMPTY_KPIS: HubKpis = {
  unreadMails: 0,
  unreadMessages: 0,
  recentPosts: 0,
  lastSubjects: [],
  activeConversations: 0,
  lastConvName: null,
  lastPinnedTitle: null,
};

// ── Hook KPI — lecture Supabase ───────────────────────────────────────────────

function useCommunicationKpis(coproId: string | null): HubKpis {
  const supabase = useMemo(() => createUntypedClient(), []);
  const [kpis, setKpis] = useState<HubKpis>(EMPTY_KPIS);

  useEffect(() => {
    if (!coproId) return;

    async function load() {
      // 1. Mails non lus (boite de reception)
      const { count: unreadMailCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .eq('copro_id', coproId)
        .eq('status', 'received')
        .eq('is_read', false)
        .eq('is_archived', false)
        .eq('is_deleted', false);

      // 2. Derniers sujets non lus
      const { data: unreadMails } = await supabase
        .from('mails')
        .select('subject')
        .eq('copro_id', coproId)
        .eq('status', 'received')
        .eq('is_read', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(2);

      // 3. Conversations actives + non lues
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, subject, is_archived, unread_count, last_message_at')
        .eq('copro_id', coproId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      const convList = (conversations ?? []) as {
        id: string;
        subject: string | null;
        is_archived: boolean;
        unread_count: number;
        last_message_at: string | null;
      }[];

      const activeCount = convList.length;
      const totalUnread = convList.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
      const lastConv = convList[0]?.subject ?? null;

      // 4. Publications recentes (7 jours) + epingle
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count: recentCount } = await supabase
        .from('wall_posts')
        .select('*', { count: 'exact', head: true })
        .eq('copro_id', coproId)
        .gte('created_at', sevenDaysAgo);

      const { data: pinnedPosts } = await supabase
        .from('wall_posts')
        .select('title')
        .eq('copro_id', coproId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1);

      setKpis({
        unreadMails: unreadMailCount ?? 0,
        unreadMessages: totalUnread,
        recentPosts: recentCount ?? 0,
        lastSubjects: (unreadMails ?? []).map((m: { subject: string }) => m.subject),
        activeConversations: activeCount,
        lastConvName: lastConv,
        lastPinnedTitle: (pinnedPosts ?? [])[0]?.title ?? null,
      });
    }

    load();
  }, [coproId, supabase]);

  return kpis;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommunicationHubPage() {
  const { currentCoproId } = useCopro();
  const {
    unreadMails,
    unreadMessages,
    recentPosts,
    lastSubjects,
    activeConversations,
    lastConvName,
    lastPinnedTitle,
  } = useCommunicationKpis(currentCoproId);

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
