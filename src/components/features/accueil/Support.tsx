'use client';

import Image from 'next/image';
import { Users, MessageCircle, TrendingUp } from 'lucide-react';
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
              src="/velorah/illustrations/illustration-accompagnement.webp"
              alt="Équipe d'experts accompagnant les gestionnaires de copropriété"
              fill
              unoptimized
              className={styles.illustration}
            />
          </div>

          {/* Right: content */}
          <div className={styles.contentRight}>
            <h2 className={styles.title}>
              Un accompagnement humain, de vrais experts
            </h2>
            <p className={styles.description}>
              De la migration de vos données à votre première AG en ligne, notre équipe est à vos côtés à chaque étape. Pas de chatbot, pas de FAQ interminable, des professionnels qui connaissent votre métier.
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

    </section>
  );
}
