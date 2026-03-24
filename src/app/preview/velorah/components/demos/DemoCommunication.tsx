'use client';

import { MessageCircle, Mail } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_COMMUNICATION } from './demoData';

export function DemoCommunication() {
  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Communication</div>
          <div className={styles.topBarSubtitle}>Messagerie & annonces</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrimary}>
            <MessageCircle size={12} />
            Nouveau message
          </button>
        </div>
      </div>

      <div className={styles.kpiStrip} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Messages</div>
          <div className={styles.kpiValue} style={{ color: '#e2e8f0', fontSize: 18 }}>47</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Non lus</div>
          <div className={styles.kpiValue} style={{ color: '#3b82f6', fontSize: 18 }}>3</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Annonces</div>
          <div className={styles.kpiValue} style={{ color: '#f59e0b', fontSize: 18 }}>2</div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Boîte de réception</div>
      <div className={styles.cardList}>
        {DEMO_COMMUNICATION.messages.map((msg) => (
          <div key={msg.subject} className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Mail size={14} color={msg.unread ? '#3b82f6' : '#64748b'} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={styles.cardTitle} style={{ fontWeight: msg.unread ? 700 : 500 }}>
                    {msg.from}
                  </span>
                  {msg.unread && (
                    <span className={styles.priorityDot} style={{ background: '#3b82f6', width: 6, height: 6 }} />
                  )}
                </div>
                <div className={styles.cardMeta}>{msg.subject}</div>
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>{msg.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
