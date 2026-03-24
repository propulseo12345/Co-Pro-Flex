'use client';

import Image from 'next/image';
import { Users, MessageCircle, TrendingUp, ThumbsUp, Clock } from 'lucide-react';
import styles from './Support.module.css';

export function Support() {
  return (
    <section className={styles.wrapper}>
      {/* Bloc A — white background */}
      <div className={styles.blocA}>
        <div className={styles.blocAInner}>
          {/* Left: illustration */}
          <div className={styles.illustrationWrap}>
            <Image
              src="/velorah/illustrations/illustration-support.svg"
              alt="Support illustration"
              fill
              className={styles.illustration}
            />
          </div>

          {/* Right: content */}
          <div className={styles.contentRight}>
            <h2 className={styles.title}>
              Un accompagnement humain, de vrais experts
            </h2>
            <p className={styles.description}>
              De la migration de vos données à votre première AG en ligne, notre équipe est à vos côtés à chaque étape. Pas de chatbot, pas de FAQ interminable — des personnes réelles qui connaissent votre métier.
            </p>
            <button className={styles.ctaButton}>Parler à un expert</button>

            {/* 3 sub-columns */}
            <div className={styles.subGrid}>
              <div className={styles.subCol}>
                <div className={styles.subColHeader}>
                  <Users size={14} className={styles.subColIcon} />
                  <h4 className={styles.subColTitle}>Onboarding</h4>
                </div>
                <ul className={styles.subList}>
                  <li>Migration de vos données</li>
                  <li>Formation personnalisée</li>
                  <li>Accompagnement 90 jours</li>
                </ul>
              </div>

              <div className={styles.subCol}>
                <div className={styles.subColHeader}>
                  <MessageCircle size={14} className={styles.subColIcon} />
                  <h4 className={styles.subColTitle}>Support</h4>
                </div>
                <ul className={styles.subList}>
                  <li>Chat en direct</li>
                  <li>{'Réponse < 2h'}</li>
                  <li>Base de connaissances</li>
                </ul>
              </div>

              <div className={styles.subCol}>
                <div className={styles.subColHeader}>
                  <TrendingUp size={14} className={styles.subColIcon} />
                  <h4 className={styles.subColTitle}>Évolution</h4>
                </div>
                <ul className={styles.subList}>
                  <li>Mises à jour mensuelles</li>
                  <li>Roadmap publique</li>
                  <li>Demandes de features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc B — cream background */}
      <div className={styles.blocB}>
        <div className={styles.blocBInner}>
          {/* Left: illustration (decorative) */}
          <div className={styles.blocBIllustrationWrap}>
            <Image
              src="/velorah/illustrations/illustration-support.svg"
              alt=""
              fill
              className={styles.illustration}
              aria-hidden="true"
            />
          </div>

          {/* Right: stats */}
          <div className={styles.statsContent}>
            <h2 className={styles.statsTitle}>
              Un support récompensé par nos utilisateurs
            </h2>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statIconWrap}>
                  <ThumbsUp size={20} className={styles.statIcon} />
                </div>
                <div className={styles.statText}>
                  <span className={styles.statValue}>98%</span>
                  <span className={styles.statLabel}>satisfaction client</span>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIconWrap}>
                  <Clock size={20} className={styles.statIcon} />
                </div>
                <div className={styles.statText}>
                  <span className={styles.statValue}>{'< 2h'}</span>
                  <span className={styles.statLabel}>Temps de réponse moyen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
