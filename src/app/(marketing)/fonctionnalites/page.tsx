import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Vote,
  PiggyBank,
  Wrench,
  FolderOpen,
  MessageCircle,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Smartphone,
  FileDown,
  Lock,
  Server,
} from 'lucide-react';
import { PageHero } from '@/components/features/marketing/PageHero';
import { SectionHeader } from '@/components/features/marketing/SectionHeader';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Fonctionnalités',
  description:
    'Découvrez toutes les fonctionnalités de CoProFlex : assemblées générales, finance, maintenance, documents, communication et tableau de bord.',
};

const modules = [
  {
    icon: Vote,
    color: '#FC5F35',
    href: '/fonctionnalites/ag',
    title: 'Assemblées Générales',
    description:
      'Organisez vos AG de A à Z sans stress. Du calcul automatique des majorités à la génération du PV, chaque étape est guidée et conforme à la loi.',
  },
  {
    icon: PiggyBank,
    color: '#55AC63',
    href: '/fonctionnalites/finance',
    title: 'Finance & Comptabilité',
    description:
      'Gardez le contrôle sur les finances de chaque copropriété. Budgets, appels de fonds, relances : tout est automatisé et traçable.',
  },
  {
    icon: Wrench,
    color: '#0081F1',
    href: '/fonctionnalites/maintenance',
    title: 'Maintenance',
    description:
      "Anticipez les interventions au lieu de les subir. Le carnet d'entretien numérique centralise tout l'historique et vous alerte avant qu'il ne soit trop tard.",
  },
  {
    icon: FolderOpen,
    color: '#0081F1',
    href: '/fonctionnalites/documents',
    title: 'Documents (GED)',
    description:
      'Fini les classeurs et les clés USB. Tous les documents de la copropriété sont stockés, classés et accessibles en un clic.',
  },
  {
    icon: MessageCircle,
    color: '#3079FF',
    href: '/fonctionnalites/communication',
    title: 'Communication',
    description:
      'Fluidifiez les échanges entre le syndic, le conseil syndical et les copropriétaires.',
  },
  {
    icon: LayoutDashboard,
    color: '#3079FF',
    href: '/fonctionnalites/dashboard',
    title: 'Tableau de bord',
    description:
      'En un coup d\'œil, vous savez où en est chaque copropriété. Les alertes critiques remontent automatiquement.',
  },
] as const;

const transverseFeatures = [
  {
    icon: Building2,
    title: 'Multi-copropriétés',
    description: 'Gérez toutes vos copropriétés depuis une seule interface, avec une vue consolidée.',
  },
  {
    icon: ShieldCheck,
    title: 'Rôles et permissions',
    description:
      'Attribuez des accès granulaires : gestionnaire, conseil syndical, copropriétaire, prestataire.',
  },
  {
    icon: Smartphone,
    title: 'Responsive mobile',
    description:
      'Travaillez depuis votre ordinateur, tablette ou téléphone. L\'interface s\'adapte à chaque écran.',
  },
  {
    icon: FileDown,
    title: 'Export PDF',
    description:
      'Générez vos PV, convocations, budgets et relances en PDF professionnel en un clic.',
  },
  {
    icon: Lock,
    title: 'Conforme RGPD',
    description:
      'Données chiffrées, droit à l\'oubli, consentement : votre conformité est assurée par défaut.',
  },
  {
    icon: Server,
    title: 'Hébergement en France',
    description:
      'Vos données sont hébergées en France, sur des serveurs certifiés et souverains.',
  },
] as const;

export default function FonctionnalitesPage() {
  return (
    <div className={styles.page}>
      <PageHero
        badge="Plateforme tout-en-un"
        title="Chaque fonctionnalité pensée pour le terrain"
        subtitle="CoProFlex réunit tous les outils dont un syndic a besoin au quotidien. Moins de tableurs, moins de papier, plus de temps pour vos copropriétaires."
      />

      {/* Module Grid */}
      <section className={styles.modulesSection}>
        <div className={styles.modulesGrid}>
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link href={mod.href} key={mod.title} className={styles.moduleCard} style={{ '--module-color': mod.color, '--module-bg': `${mod.color}1a` } as React.CSSProperties}>
                <div className={styles.moduleIconWrapper}>
                  <Icon size={24} />
                </div>
                <h3 className={styles.moduleTitle}>{mod.title}</h3>
                <p className={styles.moduleDescription}>{mod.description}</p>
                <span className={styles.moduleLink}>
                  En savoir plus &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Transverse Features */}
      <section className={styles.transverseSection}>
        <SectionHeader
          label="Et aussi"
          labelColor="#0081F1"
          title="Des fonctionnalités transversales pour tout le quotidien"
          description="Au-delà des modules métier, CoProFlex intègre tout ce dont un syndic a besoin pour travailler sereinement."
          centered
        />
        <div className={styles.transverseGrid}>
          {transverseFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className={styles.transverseItem}>
                <div className={styles.transverseIcon}>
                  <Icon size={20} color="var(--pg-accent)" />
                </div>
                <div>
                  <h4 className={styles.transverseTitle}>{feat.title}</h4>
                  <p className={styles.transverseDescription}>{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CtaBanner
        text="Prêt à simplifier la gestion de vos copropriétés ?"
        buttonText="Demander une démonstration gratuite"
      />
    </div>
  );
}
