import styles from './velorah.module.css';
import { LogoCarousel } from './components/LogoCarousel';
import { DiscoverSection } from './components/DiscoverSection';
import { FeatureGrid } from './components/FeatureGrid';
import { InteractiveSlider } from './components/InteractiveSlider';
import { Testimonials } from './components/Testimonials';
import { Sizes } from './components/Sizes';
import { Support } from './components/Support';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { Vote, FileText, PiggyBank, Receipt, Wrench, FolderOpen } from 'lucide-react';

export default function VelorahPage() {
  return (
    <div className={styles.page}>
      {/* Hero Wrapper — contient la vidéo bg, nav et hero */}
      <div className={styles.heroWrapper}>
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
      </div>{/* Fin heroWrapper */}

      <div className={styles.transition} />
      <div className={styles.playgroundSection}>
        <LogoCarousel />
        <DiscoverSection />

        {/* Section 4 — AG */}
        <FeatureGrid
          background="white"
          label="Assemblées Générales"
          labelColor="#FC5F35"
          title="Des AG aussi simples que vos réunions d'équipe"
          description="Votes temps réel, procès-verbaux automatiques, convocations conformes — tout le processus d'AG digitalisé."
          testimonial={{
            quote: "Depuis CoProFlex, nos AG se déroulent en 1h au lieu de 3. Les votes sont instantanés et le PV est prêt à la signature en fin de séance.",
            author: "Marie Dupont",
            role: "Syndic professionnelle, Nexity",
            bgColor: "#FC5F35",
          }}
          cards={[
            { type: 'large', title: 'Votes temps réel', description: 'Résultats instantanés avec calcul automatique des majorités', screenshot: '/velorah/screenshots/screenshot-ag-votes.svg' },
            { type: 'large', title: 'PV automatique', description: 'Procès-verbal généré et prêt à signer en fin de séance', screenshot: '/velorah/screenshots/screenshot-ag-pv.svg' },
            { type: 'small', title: '14 résolutions auto-générées', icon: Vote },
            { type: 'small', title: 'Votes par correspondance', icon: FileText },
          ]}
        />

        {/* Section 5 — Finance */}
        <FeatureGrid
          background="cream"
          label="Finance"
          labelColor="#55AC63"
          title="La vision financière complète de votre copropriété"
          description="Budgets, appels de fonds, impayés et comptabilité — une vue à 360° de vos finances."
          testimonial={{
            quote: "Le suivi des impayés avec relances automatiques nous a fait gagner 15% de taux de recouvrement en 6 mois.",
            author: "Thomas Bernard",
            role: "Gestionnaire, Foncia",
            bgColor: "#55AC63",
          }}
          cards={[
            { type: 'large', title: 'Budgets prévisionnels', description: "Prévisionnel, travaux et ALUR en un coup d'œil", screenshot: '/velorah/screenshots/screenshot-finance-budget.svg' },
            { type: 'large', title: 'Appels de fonds', description: 'Échéanciers automatiques et suivi des paiements', screenshot: '/velorah/screenshots/screenshot-finance-appels.svg' },
            { type: 'small', title: 'Suivi impayés & relances auto', icon: PiggyBank },
            { type: 'small', title: 'Comptabilité : journaux, grand livre, balance', icon: Receipt },
          ]}
        />

        {/* Section 6 — Maintenance & Documents */}
        <FeatureGrid
          background="white"
          label="Maintenance & Documents"
          labelColor="#0081F1"
          title="Maintenance & Documents sous contrôle"
          description="Carnet d'entretien, ordres de service, GED et contrats — tout centralisé et accessible."
          testimonial={{
            quote: "La GED a transformé notre organisation. Plus aucun document perdu, tout est accessible en 2 clics par les copropriétaires.",
            author: "Sophie Laurent",
            role: "Présidente du conseil syndical",
            bgColor: "#0081F1",
          }}
          cards={[
            { type: 'large', title: "Carnet d'entretien", description: 'Suivi des interventions et ordres de service', screenshot: '/velorah/screenshots/screenshot-maintenance.svg' },
            { type: 'large', title: 'Gestion documentaire', description: 'PV, règlements, contrats, diagnostics — tout archivé', screenshot: '/velorah/screenshots/screenshot-documents.svg' },
            { type: 'small', title: 'Contrats & alertes renouvellement', icon: Wrench },
            { type: 'small', title: 'Communication & messagerie', icon: FolderOpen },
          ]}
        />

        {/* Section 7 — Interactive Slider */}
        <InteractiveSlider />

        {/* Section 8 — Testimonials */}
        <Testimonials />

        {/* Section 9 — Sizes */}
        <Sizes />

        {/* Section 10 — Support */}
        <Support />

        {/* Section 11 — CTA */}
        <CtaSection />

        {/* Section 12 — Footer */}
        <Footer />
      </div>
    </div>
  );
}
