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
import { ContactForm } from './ContactForm';
import styles from './page.module.css';

export const metadata = {
  title: 'Contact',
};

/* ── Static data ── */

const TRUST_ITEMS = [
  {
    icon: Clock,
    title: 'Réponse rapide',
    description: 'Notre équipe vous recontacte sous 2 heures ouvrées.',
  },
  {
    icon: Monitor,
    title: 'Démonstration personnalisée',
    description: 'Pas de démo générique. On part de votre situation réelle.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Migration incluse',
    description: "On s'occupe d'importer vos données existantes.",
  },
  {
    icon: ShieldCheck,
    title: 'Sans engagement',
    description: 'Essayez pendant 30 jours, annulez en un clic.',
  },
  {
    icon: MapPin,
    title: 'Données hébergées en France',
    description: 'Conformes RGPD, serveurs français.',
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
      'Environ 30 minutes. On commence par comprendre votre situation, puis on vous montre les fonctionnalités qui vous concernent. Pas de discours commercial générique : on se concentre sur vos besoins réels.',
  },
  {
    question: "Est-ce que la démo m'engage à quelque chose ?",
    answer:
      "Absolument pas. La démonstration est gratuite et sans engagement. Vous pouvez poser toutes vos questions, découvrir la plateforme, et prendre votre décision tranquillement. Aucune carte bancaire n'est demandée.",
  },
  {
    question:
      "Je ne suis pas très à l'aise avec l'informatique. Est-ce un problème ?",
    answer:
      "Pas du tout. CoProFlex a été conçu pour être accessible à tous, y compris aux personnes qui ne sont pas à l'aise avec les outils numériques. L'interface est simple, et notre équipe vous accompagne à chaque étape.",
  },
] as const;

/* ── Component ── */

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Parlons de votre gestion de copropriété"
        subtitle="Que vous soyez syndic professionnel, bénévole ou membre d'un conseil syndical, notre équipe vous répond sous 2 heures ouvrées pour organiser une démonstration personnalisée."
      />

      {/* ── Split layout ── */}
      <section className={styles.split}>
        {/* Left column */}
        <div className={styles.left}>
          <div className={styles.trustList}>
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={styles.trustItem}>
                  <div className={styles.trustIcon}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={styles.trustTitle}>{item.title}</p>
                    <p className={styles.trustDesc}>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

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

        {/* Right column */}
        <div className={styles.right}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              Demandez votre démonstration gratuite
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Questions fréquentes</h2>
        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>{item.question}</summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
