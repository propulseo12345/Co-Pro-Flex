import type { Metadata } from 'next';
import {
  Shield,
  MapPin,
  Lock,
  Database,
  Activity,
  KeyRound,
  Users,
  FileSearch,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Sécurité & Conformité',
  description:
    'Hébergement français, chiffrement de bout en bout, conformité RGPD native. Découvrez comment CoProFlex protège vos données de copropriété.',
};

/* ── Data ── */

const badges = [
  { icon: Shield, label: 'Conforme RGPD' },
  { icon: MapPin, label: 'Hébergement en France' },
  { icon: Lock, label: 'Chiffrement des données' },
  { icon: Database, label: 'Sauvegardes quotidiennes' },
  { icon: Activity, label: 'Disponibilité 99,9 %' },
];

const securityCards = [
  {
    icon: Lock,
    title: 'Chiffrement TLS 1.3 & AES-256',
    description:
      'Chaque échange protégé par TLS 1.3. Au repos, chiffrement AES-256.',
  },
  {
    icon: KeyRound,
    title: 'Authentification 2FA',
    description:
      'Seconde vérification à chaque connexion. Peut être rendue obligatoire.',
  },
  {
    icon: Users,
    title: "Contrôle d'accès par rôles",
    description:
      'Syndic, conseil syndical et copropriétaires ont des permissions distinctes.',
  },
  {
    icon: FileSearch,
    title: "Journaux d'audit",
    description:
      'Chaque action horodatée et attribuée. Traçabilité totale.',
  },
  {
    icon: HardDrive,
    title: 'Sauvegardes géo-distribuées',
    description:
      'Quotidiennes, centre de données distinct. Restauration en moins de 4h.',
  },
  {
    icon: RefreshCw,
    title: 'Mises à jour continues',
    description:
      'Correctifs déployés en continu sans interruption de service.',
  },
];

const rgpdRights = [
  "Droit d'accès — consulter l'ensemble de vos données personnelles",
  'Droit de rectification — corriger toute information inexacte',
  'Droit de suppression — demander la suppression de vos données',
  'Droit de portabilité — exporter vos données dans un format standard',
];

/* ── Component ── */

export default function SecuritePage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Sécurité & Conformité"
        title="Vos données de copropriété, protégées comme elles le méritent"
        subtitle="Hébergement français, chiffrement de bout en bout, conformité RGPD native."
      />

      {/* Trust Badges */}
      <section className={styles.badgesSection}>
        <div className={styles.badgesRow}>
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.label} className={styles.badge}>
                <Icon size={18} className={styles.badgeIcon} />
                <span className={styles.badgeLabel}>{badge.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Grid */}
      <section className={styles.gridSection}>
        <div className={styles.grid}>
          {securityCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={styles.card}>
                <div className={styles.cardIconWrapper}>
                  <Icon size={22} className={styles.cardIcon} />
                </div>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDescription}>{card.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Residency */}
      <section className={styles.residencySection}>
        <SectionHeader
          title="Vos données restent en France"
          centered
        />
        <div className={styles.residencyContent}>
          <p>
            Toutes les données de CoProFlex sont hébergées exclusivement en France, dans des centres de données certifiés ISO 27001. Aucun transfert en dehors de l&apos;Union européenne, aucune exception.
          </p>
          <p>
            Nos serveurs sont opérés par des prestataires français soumis à la législation européenne. En cas de litige, c&apos;est la juridiction française qui s&apos;applique — vos données bénéficient de la protection la plus exigeante au monde.
          </p>
          <p>
            L&apos;infrastructure est auditée régulièrement par des tiers indépendants. Les rapports de conformité sont disponibles sur demande pour les clients des plans Professionnel et Entreprise.
          </p>
        </div>
      </section>

      {/* RGPD */}
      <section className={styles.rgpdSection}>
        <SectionHeader
          title="Conformité RGPD native"
          centered
        />
        <div className={styles.rgpdContent}>
          <p>
            CoProFlex a été conçu dès l&apos;origine avec la protection des données personnelles au cœur de son architecture. La conformité RGPD n&apos;est pas un ajout : c&apos;est un principe fondateur.
          </p>
          <ul className={styles.rightsList}>
            {rgpdRights.map((right) => (
              <li key={right} className={styles.rightsItem}>
                {right}
              </li>
            ))}
          </ul>
          <p className={styles.dpoContact}>
            Délégué à la protection des données :{' '}
            <a href="mailto:dpo@coproflex.fr" className={styles.dpoLink}>
              dpo@coproflex.fr
            </a>
          </p>
        </div>
      </section>

      <CtaBanner
        text="La sécurité de vos copropriétés ne devrait jamais être un compromis"
        buttonText="Essayer gratuitement"
        secondaryText="Contacter notre équipe sécurité"
        secondaryHref="/contact"
      />
    </div>
  );
}
