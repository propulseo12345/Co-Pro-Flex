import styles from './velorah.module.css';
import { LogoCarousel } from './components/LogoCarousel';
import { DiscoverSection } from './components/DiscoverSection';

export default function VelorahPage() {
  return (
    <div className={styles.page}>
      {/* Video Background */}
      <video
        className={styles.videoBg}
        autoPlay
        loop
        muted
        playsInline
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          CoProFlex
        </div>

        <div className={styles.navLinks}>
          <a className={`${styles.navLink} ${styles.navLinkActive}`} href="#">
            Home
          </a>
          <a className={styles.navLink} href="#">
            Copropriétés
          </a>
          <a className={styles.navLink} href="#">
            Fonctionnalités
          </a>
          <a className={styles.navLink} href="#">
            Tarifs
          </a>
          <a className={styles.navLink} href="#">
            Contact
          </a>
        </div>

        <button className={`${styles.liquidGlass} ${styles.navCta}`}>
          Commencer
        </button>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={`${styles.heroTitle} ${styles.animateFadeRise}`}>
          Où la gestion d&rsquo;immeuble devient{' '}
          <em className={styles.heroMuted}>une évidence.</em>
        </h1>

        <p className={`${styles.heroSubtext} ${styles.animateFadeRiseDelay}`}>
          Nous concevons l&rsquo;outil qui simplifie la copropriété pour les
          syndics exigeants, les gestionnaires débordés et les copropriétaires
          impliqués. Au cœur du quotidien, un espace digital pensé pour la
          clarté et l&rsquo;efficacité.
        </p>

        <button
          className={`${styles.liquidGlass} ${styles.heroCta} ${styles.animateFadeRiseDelay2}`}
        >
          Découvrir CoProFlex
        </button>
      </section>

      <div className={styles.transition} />
      <div className={styles.playgroundSection}>
        <LogoCarousel />
        <DiscoverSection />
        {/* More sections will be added here */}
      </div>
    </div>
  );
}
