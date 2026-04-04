import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/features/marketing/PageHero';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation',
};

export default function CGUPage() {
  return (
    <>
      <PageHero title="Conditions Générales d'Utilisation" />

      <div className={styles.content}>
        <p className={styles.updateDate}>Dernière mise à jour : avril 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 1 — Objet</h2>
          <p className={styles.paragraph}>
            Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de
            définir les modalités et conditions d&apos;utilisation de la plateforme CoProFlex
            (ci-après « le Service »), éditée par [Nom de la société], ainsi que les droits et
            obligations des utilisateurs.
          </p>
          <p className={styles.paragraph}>
            L&apos;accès et l&apos;utilisation du Service sont subordonnés à l&apos;acceptation et au
            respect des présentes CGU. En accédant au Service, l&apos;Utilisateur reconnaît avoir pris
            connaissance des présentes CGU et les accepte sans réserve.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 2 — Définitions</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Service</strong> : la plateforme CoProFlex, accessible via le site web et ses
              applications, permettant la gestion de copropriété.
            </li>
            <li className={styles.listItem}>
              <strong>Utilisateur</strong> : toute personne physique ou morale accédant au Service,
              qu&apos;elle soit inscrite ou non.
            </li>
            <li className={styles.listItem}>
              <strong>Compte</strong> : l&apos;espace personnel créé par l&apos;Utilisateur lors de
              son inscription, lui permettant d&apos;accéder aux fonctionnalités du Service.
            </li>
            <li className={styles.listItem}>
              <strong>Contenu</strong> : tout texte, document, donnée, image ou fichier publié ou
              téléversé par l&apos;Utilisateur sur le Service.
            </li>
            <li className={styles.listItem}>
              <strong>Syndic</strong> : professionnel ou bénévole en charge de la gestion d&apos;une
              copropriété, utilisant le Service dans ce cadre.
            </li>
            <li className={styles.listItem}>
              <strong>Copropriétaire</strong> : personne détenant un ou plusieurs lots au sein
              d&apos;une copropriété gérée via le Service.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 3 — Accès au Service</h2>
          <p className={styles.paragraph}>
            Le Service est accessible en ligne depuis tout navigateur web compatible. [Nom de la
            société] met en œuvre les moyens raisonnables pour assurer un accès continu au Service,
            mais ne saurait garantir une disponibilité permanente. Des interruptions pour maintenance,
            mise à jour ou cas de force majeure peuvent survenir.
          </p>
          <p className={styles.paragraph}>
            L&apos;Utilisateur est responsable de son équipement informatique et de son accès à
            Internet. [Nom de la société] ne saurait être tenue responsable des dysfonctionnements
            liés à l&apos;environnement technique de l&apos;Utilisateur.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 4 — Inscription et compte</h2>

          <h3 className={styles.subsectionTitle}>4.1 Création de compte</h3>
          <p className={styles.paragraph}>
            L&apos;accès à certaines fonctionnalités du Service nécessite la création d&apos;un
            Compte. L&apos;Utilisateur s&apos;engage à fournir des informations exactes, complètes et
            à jour lors de son inscription.
          </p>

          <h3 className={styles.subsectionTitle}>4.2 Identifiants</h3>
          <p className={styles.paragraph}>
            L&apos;Utilisateur est seul responsable de la confidentialité de ses identifiants de
            connexion (adresse e-mail et mot de passe). Toute utilisation du Service effectuée depuis
            son Compte est réputée avoir été faite par l&apos;Utilisateur lui-même.
          </p>

          <h3 className={styles.subsectionTitle}>4.3 Sécurité</h3>
          <p className={styles.paragraph}>
            En cas de suspicion d&apos;utilisation non autorisée de son Compte, l&apos;Utilisateur
            s&apos;engage à en informer immédiatement [Nom de la société] à l&apos;adresse
            contact@coproflex.fr. [Nom de la société] se réserve le droit de suspendre tout Compte en
            cas d&apos;activité suspecte.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 5 — Obligations de l&apos;Utilisateur</h2>
          <p className={styles.paragraph}>L&apos;Utilisateur s&apos;engage à :</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              Utiliser le Service conformément à sa destination et aux présentes CGU.
            </li>
            <li className={styles.listItem}>
              Ne pas porter atteinte au fonctionnement du Service ni tenter d&apos;accéder de manière
              non autorisée à ses systèmes.
            </li>
            <li className={styles.listItem}>
              Ne pas publier de contenu illicite, diffamatoire, injurieux ou contraire aux bonnes
              mœurs.
            </li>
            <li className={styles.listItem}>
              Respecter les droits de propriété intellectuelle de [Nom de la société] et des tiers.
            </li>
            <li className={styles.listItem}>
              Ne pas collecter ou exploiter les données personnelles des autres Utilisateurs.
            </li>
            <li className={styles.listItem}>
              Maintenir à jour les informations de son Compte.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 6 — Propriété intellectuelle</h2>
          <p className={styles.paragraph}>
            L&apos;ensemble des éléments constituant le Service (logiciel, interface, textes, base de
            données, structure, design) est la propriété exclusive de [Nom de la société] et est
            protégé par les lois relatives à la propriété intellectuelle.
          </p>
          <p className={styles.paragraph}>
            L&apos;Utilisateur conserve la propriété des Contenus qu&apos;il publie sur le Service. En
            publiant du Contenu, l&apos;Utilisateur accorde à [Nom de la société] une licence non
            exclusive, gratuite et limitée à l&apos;exploitation technique nécessaire au
            fonctionnement du Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 7 — Données personnelles</h2>
          <p className={styles.paragraph}>
            Le traitement des données personnelles des Utilisateurs est décrit dans notre{' '}
            <Link href="/confidentialite">Politique de confidentialité</Link>, qui fait partie intégrante
            des présentes CGU. L&apos;Utilisateur est invité à en prendre connaissance.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 8 — Responsabilité</h2>

          <h3 className={styles.subsectionTitle}>8.1 Responsabilité de l&apos;éditeur</h3>
          <p className={styles.paragraph}>
            [Nom de la société] s&apos;engage à fournir le Service avec diligence et selon les règles
            de l&apos;art. Sa responsabilité est limitée à une obligation de moyens. [Nom de la
            société] ne saurait être tenue responsable des dommages indirects, tels que la perte de
            données, le manque à gagner ou le préjudice commercial.
          </p>

          <h3 className={styles.subsectionTitle}>8.2 Responsabilité de l&apos;Utilisateur</h3>
          <p className={styles.paragraph}>
            L&apos;Utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait du Service
            et des Contenus qu&apos;il y publie. Il garantit [Nom de la société] contre toute
            réclamation de tiers liée à son utilisation du Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 9 — Résiliation</h2>

          <h3 className={styles.subsectionTitle}>9.1 Par l&apos;Utilisateur</h3>
          <p className={styles.paragraph}>
            L&apos;Utilisateur peut résilier son Compte à tout moment depuis les paramètres de son
            espace personnel ou en adressant une demande à contact@coproflex.fr.
          </p>

          <h3 className={styles.subsectionTitle}>9.2 Par l&apos;éditeur</h3>
          <p className={styles.paragraph}>
            [Nom de la société] se réserve le droit de suspendre ou supprimer un Compte en cas de
            manquement aux présentes CGU, sans préavis ni indemnité. L&apos;Utilisateur en sera
            informé par e-mail.
          </p>

          <h3 className={styles.subsectionTitle}>9.3 Conséquences</h3>
          <p className={styles.paragraph}>
            En cas de résiliation, l&apos;Utilisateur dispose d&apos;un délai de 30 jours pour
            exporter ses données depuis le Service. Passé ce délai, les données associées au Compte
            seront supprimées, sous réserve des obligations légales de conservation.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 10 — Modification des CGU</h2>
          <p className={styles.paragraph}>
            [Nom de la société] se réserve le droit de modifier les présentes CGU à tout moment. Les
            Utilisateurs seront informés de toute modification substantielle par notification sur le
            Service ou par e-mail. La poursuite de l&apos;utilisation du Service après notification
            vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Article 11 — Droit applicable et juridiction</h2>
          <p className={styles.paragraph}>
            Les présentes CGU sont régies par le droit français. En cas de litige relatif à
            l&apos;interprétation ou à l&apos;exécution des présentes, les parties s&apos;efforceront
            de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents
            du ressort du siège social de [Nom de la société].
          </p>
        </section>
      </div>
    </>
  );
}
