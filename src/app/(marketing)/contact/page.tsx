import {
  Clock,
  Monitor,
  ArrowRightLeft,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Building2,
  CalendarClock,
} from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { FaqAccordion } from '@/components/features/marketing/FaqAccordion';
import { ContactForm } from './ContactForm';
import styles from './page.module.css';

export const metadata = {
  title: 'Contact',
};

/* ── Static data ── */

const TRUST_ITEMS = [
  {
    icon: Clock,
    title: 'Réponse sous 2h',
  },
  {
    icon: Monitor,
    title: 'Démo personnalisée',
  },
  {
    icon: ArrowRightLeft,
    title: 'Migration incluse',
  },
  {
    icon: ShieldCheck,
    title: 'Sans engagement',
  },
  {
    icon: MapPin,
    title: 'Données en France',
  },
] as const;

const CONTACT_INFO = [
  { icon: Mail, label: 'contact@coproflex.fr' },
  { icon: Phone, label: '01 86 XX XX XX' },
  { icon: Building2, label: '12 rue de la Copropriété, 75009 Paris' },
  { icon: CalendarClock, label: 'Du lundi au vendredi, 9h – 18h' },
] as const;

const FAQ_ITEMS = [
  {
    question: 'Combien de temps dure une démonstration ?',
    answer:
      'Environ 30 minutes. On commence par comprendre votre situation, puis on vous montre les fonctionnalités qui vous concernent. Pas de discours commercial générique.',
  },
  {
    question: "Est-ce que la démo m'engage à quelque chose ?",
    answer:
      "Absolument pas. La démonstration est gratuite et sans engagement. Vous pouvez poser toutes vos questions et prendre votre décision tranquillement. Aucune carte bancaire n'est demandée.",
  },
  {
    question: "Je ne suis pas très à l'aise avec l'informatique. Est-ce un problème ?",
    answer:
      "Pas du tout. CoProFlex a été conçu pour être accessible à tous. L'interface est simple, et notre équipe vous accompagne à chaque étape.",
  },
  {
    question: 'Combien coûte CoProFlex ?',
    answer:
      'À partir de 1,58€/lot/mois en facturation annuelle. Consultez notre page Tarifs pour le détail des plans Essentiel, Professionnel et Entreprise.',
  },
  {
    question: 'Puis-je essayer gratuitement ?',
    answer:
      "Oui, 30 jours d'essai gratuit avec accès à toutes les fonctionnalités du plan Professionnel. Sans carte bancaire.",
  },
  {
    question: 'Comment se passe la migration de mes données ?',
    answer:
      "Notre équipe s'occupe d'importer vos données existantes : copropriétaires, lots, tantièmes, documents. Comptez 48h ouvrables pour une migration standard.",
  },
] as const;

/* ── Component ── */

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Parlons de votre gestion de copropriété"
        subtitle="Que vous soyez syndic professionnel, bénévole ou membre d'un conseil syndical, notre équipe vous répond sous 2 heures ouvrées."
      />

      {/* ── Trust strip ── */}
      <div className={styles.trustStrip}>
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className={styles.trustPill}>
              <Icon size={16} />
              <span>{item.title}</span>
            </div>
          );
        })}
      </div>

      {/* ── Split: FAQ left + Form right ── */}
      <section className={styles.split}>
        {/* Left column — FAQ + coordonnées */}
        <div className={styles.left}>
          <FaqAccordion items={FAQ_ITEMS} title="Questions fréquentes" />

          <div className={styles.contactInfo}>
            <h3 className={styles.contactInfoTitle}>Coordonnées</h3>
            {CONTACT_INFO.map((info) => {
              const Icon = info.icon;
              return (
                <div key={info.label} className={styles.contactRow}>
                  <Icon size={16} className={styles.contactIcon} />
                  <span>{info.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — form */}
        <div className={styles.right}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              Comment pouvons-nous vous aider ?
            </h2>
            <p className={styles.formSubtitle}>
              Décrivez-nous votre situation en quelques mots. Notre équipe vous recontacte pour organiser une démonstration adaptée à vos besoins.
            </p>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
