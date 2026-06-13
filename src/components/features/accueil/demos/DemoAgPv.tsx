'use client';

import { FileText, Download, Pen } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_AG_PV } from './demoData';

export function DemoAgPv() {
  const { sections, meta } = DEMO_AG_PV;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Procès-Verbal</div>
          <div className={styles.topBarSubtitle}>{meta.ag} — {meta.date}</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnGhost}>
            <Download size={12} />
            PDF
          </button>
          <button className={styles.btnPrimary}>
            <Pen size={12} />
            Signatures
          </button>
        </div>
      </div>

      <div className={styles.twoColumns}>
        {/* Preview document */}
        <div>
          <div className={styles.sectionTitle}>Aperçu du PV</div>
          <div className={styles.kpiCard} style={{ padding: 20 }}>
            {sections.map((s, i) => (
              <div key={s.title} style={{ marginBottom: i < sections.length - 1 ? 16 : 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--demo-secondary)',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontSize: 11, lineHeight: 1.6, color: 'var(--demo-text-secondary)',
                }}>
                  {s.content}
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 16, paddingTop: 12,
              borderTop: '1px solid var(--demo-border)',
              fontSize: 10, color: 'var(--demo-text-muted)', textAlign: 'center',
            }}>
              … suite sur {meta.pages} pages
            </div>
          </div>
        </div>

        {/* Métadonnées */}
        <div>
          <div className={styles.sectionTitle}>Informations</div>
          <div className={styles.cardList}>
            <div className={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} style={{ color: 'var(--demo-primary)' }} />
                <span className={styles.cardTitle}>Statut</span>
              </div>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>{meta.status}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Pages</span>
              <span style={{ fontSize: 12, color: 'var(--demo-text-secondary)' }}>{meta.pages}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Signatures</span>
              <span style={{ fontSize: 12, color: meta.signataires.fait === meta.signataires.total ? 'var(--demo-success-bright)' : 'var(--demo-warning-bright)' }}>
                {meta.signataires.fait} / {meta.signataires.total}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className={styles.sectionTitle}>Signataires</div>
            <div className={styles.cardList}>
              <div className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>M. Martin</div>
                  <div className={styles.cardMeta}>Président de séance</div>
                </div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Signé</span>
              </div>
              <div className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>Mme Duval</div>
                  <div className={styles.cardMeta}>Secrétaire</div>
                </div>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Signé</span>
              </div>
              <div className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>M. Lefèvre</div>
                  <div className={styles.cardMeta}>Scrutateur</div>
                </div>
                <span className={`${styles.badge} ${styles.badgeWarning}`}>En attente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
