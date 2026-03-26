import styles from './velorah.module.css';
import { DiscoverSection } from './components/DiscoverSection';
import { FeatureGrid } from './components/FeatureGrid';
import { Testimonials } from './components/Testimonials';
import { Sizes } from './components/Sizes';
import { Support } from './components/Support';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { Vote, FileText, PiggyBank, Receipt, Wrench, FolderOpen } from 'lucide-react';
import { DemoAgVotes } from './components/demos/DemoAgVotes';
import { DemoAgPv } from './components/demos/DemoAgPv';
import { DemoFinance } from './components/demos/DemoFinance';
import { DemoAppelsFonds } from './components/demos/DemoAppelsFonds';
import { DemoMaintenance } from './components/demos/DemoMaintenance';
import { DemoDocuments } from './components/demos/DemoDocuments';

export default function VelorahPage() {
  return (
    <div className={styles.page}>
      <div className={styles.playgroundSection}>
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

          <button className={styles.navCta}>
            Commencer
          </button>
        </nav>

        <DiscoverSection />

        {/* Section 4 — AG */}
        <FeatureGrid
          background="white"
          label="Assemblées Générales"
          labelColor="#FC5F35"
          title="Des AG aussi simples que vos réunions d'équipe"
          description="Chaque résolution votée en temps réel, chaque résultat visible par tous. Le gestionnaire pilote, les copropriétaires suivent — plus aucune zone d'ombre."
          testimonial={{
            quote: "Plus de recomptage, plus de PV à rédiger après coup. Tout est calculé et généré en direct — mes copropriétaires voient les résultats en même temps que moi.",
            author: "Marie Dupont",
            role: "Syndic professionnelle, Nexity",
            bgColor: "#FC5F35",
          }}
          cards={[
            { type: 'large', title: 'Votes en direct, résultats instantanés', description: 'Résultats instantanés, majorités calculées automatiquement — art. 24, 25, 26. Plus aucune erreur de comptage.', demo: <DemoAgVotes /> },
            { type: 'large', title: 'PV prêt à être généré, signé et partagé', description: "Plus besoin de rédiger après l'AG. Le procès-verbal est prêt, partagé et signable immédiatement.", demo: <DemoAgPv /> },
            { type: 'small', title: 'Résolutions conformes pré-rédigées, personnalisables par chaque gestionnaire', icon: Vote },
            { type: 'small', title: 'Vote à distance & par correspondance intégrés', icon: FileText },
          ]}
        />

        {/* Section 5 — Finance */}
        <FeatureGrid
          background="cream"
          label="Finance"
          labelColor="#55AC63"
          title="Chaque euro suivi, chaque copropriétaire informé"
          description="Budget, appels de fonds, paiements — gestionnaires et copropriétaires accèdent aux mêmes chiffres, en temps réel. Plus d'appels pour savoir où en est son solde."
          testimonial={{
            quote: "Mes copropriétaires consultent leur solde et leurs échéances sans m'appeler. Les relances partent toutes seules. J'ai récupéré des heures chaque semaine.",
            author: "Thomas Bernard",
            role: "Gestionnaire, Foncia",
            bgColor: "#55AC63",
          }}
          cards={[
            { type: 'large', title: 'Budgets lisibles, accessibles à tous', description: 'Prévisionnel, travaux et ALUR — le gestionnaire pilote, les copropriétaires suivent en toute transparence.', demo: <DemoFinance /> },
            { type: 'large', title: 'Appels de fonds & échéanciers automatiques', description: 'Génération, envoi, suivi des paiements et relances — zéro saisie manuelle, zéro oubli.', demo: <DemoAppelsFonds /> },
            { type: 'small', title: 'Impayés détectés, relances automatiques', icon: PiggyBank },
            { type: 'small', title: 'Comptabilité complète, accessible en temps réel', icon: Receipt },
          ]}
        />

        {/* Section 6 — Maintenance & Documents */}
        <FeatureGrid
          background="white"
          label="Maintenance & Documents"
          labelColor="#0081F1"
          title="Votre copropriété sous contrôle, vos documents à portée de clic"
          description="Carnet d'entretien, ordres de service, GED — une seule plateforme pour le gestionnaire et les copropriétaires. Plus aucune information perdue, plus aucun appel pour retrouver un document."
          testimonial={{
            quote: "Avant, les copropriétaires m'appelaient pour chaque document. Maintenant tout est en ligne — ils trouvent, je gagne du temps, tout le monde y voit clair.",
            author: "Sophie Laurent",
            role: "Présidente du conseil syndical",
            bgColor: "#0081F1",
          }}
          cards={[
            { type: 'large', title: 'Maintenance centralisée et traçable', description: 'Historique complet des interventions, accessible au gestionnaire et aux copropriétaires.', demo: <DemoMaintenance /> },
            { type: 'large', title: 'Tous vos documents, un seul endroit', description: 'PV, règlements, contrats, diagnostics — classés, accessibles 24/7, partagés avec les copropriétaires.', demo: <DemoDocuments /> },
            { type: 'small', title: 'Aucun contrat oublié, chaque échéance anticipée', icon: Wrench },
            { type: 'small', title: 'Documents centralisés, toujours retrouvables', icon: FolderOpen },
          ]}
        />

        {/* Section 7 — Testimonials */}
        <Testimonials />

        {/* Section 9 — Sizes */}
        <Sizes />

        {/* Section — Support */}
        <Support />

        {/* Section — CTA */}
        <CtaSection />

        {/* Section 12 — Footer */}
        <Footer />
      </div>
    </div>
  );
}
