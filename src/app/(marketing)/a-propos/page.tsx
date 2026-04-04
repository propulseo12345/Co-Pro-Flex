import { Eye, Sparkles, Scale, Lightbulb } from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

export const metadata = {
  title: 'À propos',
};

/* ── Data ── */

const VALUES = [
  {
    icon: Eye,
    title: 'Transparence',
    description:
      'Chaque copropriétaire mérite de savoir où va son argent. CoProFlex rend les comptes, les décisions et les documents accessibles à tous.',
  },
  {
    icon: Sparkles,
    title: 'Simplicité',
    description:
      "Un bon outil est un outil qu'on utilise sans y penser. Chaque écran a été conçu pour aller à l'essentiel.",
  },
  {
    icon: Scale,
    title: 'Conformité',
    description:
      'La copropriété est un domaine réglementé. CoProFlex intègre les règles du droit français pour que vous restiez toujours dans les clous.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description:
      'Les syndics méritent des outils aussi performants que ceux des autres secteurs. Vote en temps réel, relances automatisées, tableaux de bord intelligents.',
  },
] as const;

const TEAM = [
  {
    name: 'Lyes Triki',
    role: 'Fondateur et Directeur produit',
    bio: 'Ancien gestionnaire de copropriété, convaincu que le secteur mérite des outils à la hauteur.',
    initials: 'LT',
    color: '#3079FF',
  },
  {
    name: 'Camille Renaud',
    role: 'Responsable technique',
    bio: 'Ingénieure logiciel passée par plusieurs startups SaaS. Obsédée par la performance et la fiabilité.',
    initials: 'CR',
    color: '#55AC63',
  },
  {
    name: 'Mehdi Alaoui',
    role: 'Responsable conformité',
    bio: 'Juriste spécialisé en droit immobilier. Veille à ce que chaque fonctionnalité respecte la législation.',
    initials: 'MA',
    color: '#FC5F35',
  },
  {
    name: 'Sarah Petit',
    role: "Responsable expérience utilisateur",
    bio: "Designer produit convaincue que la simplicité d'usage n'est pas un luxe.",
    initials: 'SP',
    color: '#FFA211',
  },
] as const;

const TIMELINE = [
  {
    year: '2024',
    title: "L'idée naît d'une frustration",
    description:
      "Après des années à jongler entre tableurs et logiciels inadaptés, le constat s'impose.",
  },
  {
    year: '2025',
    title: 'Première version bêta',
    description:
      'Lancement auprès de 15 syndics volontaires. Les retours du terrain façonnent chaque fonctionnalité.',
  },
  {
    year: '2025',
    title: 'Ouverture au public',
    description:
      'CoProFlex devient accessible à tous les syndics.',
  },
  {
    year: '2026',
    title: 'Accélération',
    description:
      "Lancement du module Communication, de l'application mobile et des intégrations comptables.",
  },
  {
    year: '2027',
    title: "Cap sur l'intelligence",
    description:
      'Alertes prédictives, analyse des dépenses, recommandations automatisées.',
  },
] as const;

/* ── Component ── */

export default function AProposPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="La copropriété mérite de meilleurs outils"
        subtitle="CoProFlex est né d'un constat simple : gérer une copropriété en France, c'est encore trop souvent synonyme de tableurs, de papier et de stress. On a décidé de changer ça."
      />

      {/* ── Mission ── */}
      <section className={styles.section}>
        <SectionHeader title="Notre mission" />
        <div className={styles.prose}>
          <p>
            La gestion de copropriété en France repose encore largement sur des
            outils dispersés : un tableur ici, un logiciel comptable là, des
            échanges par email sans fil conducteur, des PV rédigés à la main. Le
            résultat ? Des syndics qui passent plus de temps à se battre avec
            leurs outils qu'à s'occuper de leurs copropriétaires.
          </p>
          <p>
            CoProFlex est né de cette frustration. Notre ambition est de réunir
            dans un seul outil tout ce dont un syndic a besoin au quotidien : la
            comptabilité, les assemblées générales, la maintenance, les
            documents, la communication. Le tout conforme à la législation
            française, accessible depuis n'importe quel appareil.
          </p>
          <p>
            Nous ne sommes pas un syndic. Nous ne remplaçons personne. Nous
            construisons l'outil qui permet aux professionnels de la
            copropriété de travailler mieux, plus vite, et en toute transparence
            avec leurs copropriétaires.
          </p>
        </div>
      </section>

      {/* ── Values ── */}
      <section className={styles.section}>
        <SectionHeader title="Nos valeurs" />
        <div className={styles.valuesGrid}>
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Icon size={24} />
                </div>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDesc}>{value.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Team ── */}
      <section className={styles.section}>
        <SectionHeader title="L'équipe" />
        <p className={styles.teamIntro}>
          CoProFlex est porté par une équipe qui connaît la copropriété de
          l'intérieur.
        </p>
        <div className={styles.teamGrid}>
          {TEAM.map((member) => (
            <div key={member.name} className={styles.memberCard}>
              <div
                className={styles.avatar}
                style={{ '--avatar-color': member.color } as React.CSSProperties}
              >
                {member.initials}
              </div>
              <h3 className={styles.memberName}>{member.name}</h3>
              <p className={styles.memberRole}>{member.role}</p>
              <p className={styles.memberBio}>{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className={styles.section}>
        <SectionHeader title="Notre histoire" />
        <div className={styles.timeline}>
          {TIMELINE.map((item, i) => (
            <div key={i} className={styles.timelineItem}>
              <div className={styles.timelineLine}>
                <div className={styles.timelineDot} />
              </div>
              <div className={styles.timelineContent}>
                <span className={styles.timelineYear}>{item.year}</span>
                <h3 className={styles.timelineTitle}>{item.title}</h3>
                <p className={styles.timelineDesc}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <CtaBanner
        text="Envie de voir CoProFlex en action ?"
        buttonText="Planifier une démonstration"
        secondaryText="Nous contacter"
        secondaryHref="/contact"
      />
    </div>
  );
}
