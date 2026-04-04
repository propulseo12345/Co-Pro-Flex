import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/features/marketing/PageHero';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Mentions légales',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHero title="Mentions légales" />

      <div className={styles.content}>
        <p className={styles.updateDate}>Dernière mise à jour : avril 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Éditeur du site</h2>
          <p className={styles.paragraph}>
            Le site CoProFlex est édité par :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Raison sociale : [Nom de la société]</li>
            <li className={styles.listItem}>Forme juridique : [SAS]</li>
            <li className={styles.listItem}>Capital social : [Montant] euros</li>
            <li className={styles.listItem}>Siège social : [Adresse complète]</li>
            <li className={styles.listItem}>RCS : [Ville] [Numéro]</li>
            <li className={styles.listItem}>SIRET : [Numéro SIRET]</li>
            <li className={styles.listItem}>Numéro de TVA intracommunautaire : [Numéro TVA]</li>
            <li className={styles.listItem}>Directeur de la publication : [Prénom Nom]</li>
            <li className={styles.listItem}>Contact : contact@coproflex.fr</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Hébergeur</h2>
          <p className={styles.paragraph}>
            Le site est hébergé par :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Vercel Inc.</li>
            <li className={styles.listItem}>340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
            <li className={styles.listItem}>
              Site web :{' '}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
                https://vercel.com
              </a>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Propriété intellectuelle</h2>
          <p className={styles.paragraph}>
            L&apos;ensemble des contenus présents sur le site CoProFlex (textes, images, graphismes,
            logo, icônes, logiciels, base de données, structure générale) est protégé par les
            dispositions du Code de la propriété intellectuelle et les lois en vigueur relatives à la
            propriété intellectuelle.
          </p>
          <p className={styles.paragraph}>
            Toute reproduction, représentation, modification, publication, adaptation de tout ou
            partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite
            sans autorisation écrite préalable de [Nom de la société].
          </p>
          <p className={styles.paragraph}>
            Toute exploitation non autorisée du site ou de l&apos;un de ses éléments sera considérée
            comme constitutive d&apos;une contrefaçon et poursuivie conformément aux dispositions des
            articles L.335-2 et suivants du Code de la propriété intellectuelle.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Limitation de responsabilité</h2>
          <p className={styles.paragraph}>
            [Nom de la société] s&apos;efforce d&apos;assurer au mieux l&apos;exactitude et la mise à
            jour des informations diffusées sur le site. Toutefois, [Nom de la société] ne peut
            garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à
            disposition.
          </p>
          <p className={styles.paragraph}>
            [Nom de la société] décline toute responsabilité pour toute imprécision, inexactitude ou
            omission portant sur des informations disponibles sur le site, ainsi que pour tout dommage
            résultant d&apos;une intrusion frauduleuse d&apos;un tiers ayant entraîné une modification
            des informations mises à disposition.
          </p>
          <p className={styles.paragraph}>
            Le site peut contenir des liens hypertextes vers d&apos;autres sites. [Nom de la société]
            ne saurait être tenue responsable du contenu de ces sites tiers ni des éventuels dommages
            résultant de leur utilisation.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Données personnelles</h2>
          <p className={styles.paragraph}>
            La collecte et le traitement des données personnelles effectués dans le cadre de
            l&apos;utilisation du site sont décrits dans notre{' '}
            <Link href="/confidentialite">Politique de confidentialité</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Crédits</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>Design et développement : CoProFlex</li>
            <li className={styles.listItem}>Icônes : Lucide React</li>
            <li className={styles.listItem}>Typographie : Inter (Google Fonts)</li>
          </ul>
        </section>
      </div>
    </>
  );
}
