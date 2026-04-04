import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
};

export default function ConfidentialitePage() {
  return (
    <>
      <PageHero title="Politique de confidentialité" />

      <div className={styles.content}>
        <p className={styles.updateDate}>Dernière mise à jour : avril 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Responsable du traitement</h2>
          <p className={styles.paragraph}>
            Le responsable du traitement des données personnelles collectées via le Service CoProFlex
            est :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Raison sociale : [Nom de la société]</li>
            <li className={styles.listItem}>Siège social : [Adresse complète]</li>
            <li className={styles.listItem}>Contact : contact@coproflex.fr</li>
            <li className={styles.listItem}>Délégué à la protection des données : dpo@coproflex.fr</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Données collectées</h2>

          <h3 className={styles.subsectionTitle}>2.1 Données fournies par l&apos;Utilisateur</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Catégorie</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Exemples</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Finalité</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableCell}>Identification</td>
                  <td className={styles.tableCell}>Nom, prénom, e-mail, téléphone</td>
                  <td className={styles.tableCell}>Gestion du compte et communication</td>
                  <td className={styles.tableCell}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Copropriété</td>
                  <td className={styles.tableCell}>Lots, tantièmes, adresse de l&apos;immeuble</td>
                  <td className={styles.tableCell}>Gestion de la copropriété</td>
                  <td className={styles.tableCell}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Financières</td>
                  <td className={styles.tableCell}>Appels de fonds, paiements, soldes</td>
                  <td className={styles.tableCell}>Comptabilité et suivi financier</td>
                  <td className={styles.tableCell}>Obligation légale</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Documents</td>
                  <td className={styles.tableCell}>PV d&apos;AG, contrats, diagnostics</td>
                  <td className={styles.tableCell}>Archivage et mise à disposition</td>
                  <td className={styles.tableCell}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Communications</td>
                  <td className={styles.tableCell}>Messages, signalements, commentaires</td>
                  <td className={styles.tableCell}>Échanges entre copropriétaires et syndic</td>
                  <td className={styles.tableCell}>Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className={styles.subsectionTitle}>2.2 Données collectées automatiquement</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Catégorie</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Exemples</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Finalité</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableCell}>Connexion</td>
                  <td className={styles.tableCell}>Adresse IP, navigateur, système d&apos;exploitation</td>
                  <td className={styles.tableCell}>Sécurité et diagnostic technique</td>
                  <td className={styles.tableCell}>Intérêt légitime</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Utilisation</td>
                  <td className={styles.tableCell}>Pages visitées, actions effectuées, durée</td>
                  <td className={styles.tableCell}>Amélioration du Service</td>
                  <td className={styles.tableCell}>Intérêt légitime</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Cookies</td>
                  <td className={styles.tableCell}>Identifiants de session, préférences</td>
                  <td className={styles.tableCell}>Fonctionnement et personnalisation</td>
                  <td className={styles.tableCell}>Consentement</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Destinataires des données</h2>
          <p className={styles.paragraph}>Les données personnelles peuvent être communiquées à :</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Équipe CoProFlex</strong> : membres habilités de [Nom de la société], dans la
              limite de leurs attributions.
            </li>
            <li className={styles.listItem}>
              <strong>Sous-traitants techniques</strong> : Vercel Inc. (hébergement), Supabase Inc.
              (base de données), agissant pour le compte de [Nom de la société] dans le cadre de
              contrats conformes au RGPD.
            </li>
            <li className={styles.listItem}>
              <strong>Autorités compétentes</strong> : sur réquisition judiciaire ou obligation légale.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Durée de conservation</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Type de données</th>
                  <th className={`${styles.tableCell} ${styles.tableHeader}`}>Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableCell}>Données du compte</td>
                  <td className={styles.tableCell}>3 ans après la dernière activité</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Données comptables</td>
                  <td className={styles.tableCell}>10 ans (obligation légale)</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Documents archivés</td>
                  <td className={styles.tableCell}>5 ans après clôture du dossier</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Logs de connexion</td>
                  <td className={styles.tableCell}>12 mois</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>Cookies</td>
                  <td className={styles.tableCell}>13 mois maximum</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Droits des personnes</h2>
          <p className={styles.paragraph}>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
            Informatique et Libertés, vous disposez des droits suivants :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Droit d&apos;accès</strong> : obtenir la confirmation que vos données sont
              traitées et en recevoir une copie.
            </li>
            <li className={styles.listItem}>
              <strong>Droit de rectification</strong> : faire corriger des données inexactes ou
              incomplètes.
            </li>
            <li className={styles.listItem}>
              <strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données,
              sous réserve des obligations légales de conservation.
            </li>
            <li className={styles.listItem}>
              <strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré
              et couramment utilisé.
            </li>
            <li className={styles.listItem}>
              <strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données
              pour des motifs légitimes.
            </li>
            <li className={styles.listItem}>
              <strong>Droit à la limitation</strong> : demander la suspension du traitement dans
              certains cas prévus par la loi.
            </li>
            <li className={styles.listItem}>
              <strong>Directives post-mortem</strong> : définir des directives relatives à la
              conservation, l&apos;effacement et la communication de vos données après votre décès.
            </li>
          </ul>
          <p className={styles.paragraph}>
            Pour exercer ces droits, contactez-nous à dpo@coproflex.fr. Vous pouvez également
            introduire une réclamation auprès de la CNIL (www.cnil.fr).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Cookies</h2>

          <h3 className={styles.subsectionTitle}>6.1 Cookies essentiels</h3>
          <p className={styles.paragraph}>
            Ces cookies sont nécessaires au fonctionnement du Service et ne peuvent pas être
            désactivés :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Session</strong> : maintien de votre connexion lors de la navigation.
            </li>
            <li className={styles.listItem}>
              <strong>Sécurité</strong> : protection contre les attaques CSRF et détection des
              activités suspectes.
            </li>
            <li className={styles.listItem}>
              <strong>Préférences</strong> : sauvegarde de vos choix (langue, thème d&apos;affichage).
            </li>
          </ul>

          <h3 className={styles.subsectionTitle}>6.2 Cookies non essentiels</h3>
          <p className={styles.paragraph}>
            Ces cookies ne sont déposés qu&apos;après votre consentement :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Analyse</strong> : mesure d&apos;audience et statistiques d&apos;utilisation pour
              améliorer le Service.
            </li>
            <li className={styles.listItem}>
              <strong>Performance</strong> : suivi des performances techniques et détection des
              anomalies.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Transferts hors Union européenne</h2>
          <p className={styles.paragraph}>
            Certains de nos sous-traitants (Vercel Inc., Supabase Inc.) sont situés aux États-Unis.
            Ces transferts sont encadrés par des Clauses Contractuelles Types (CCT) approuvées par la
            Commission européenne, garantissant un niveau de protection adéquat de vos données
            personnelles.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Sécurité</h2>
          <p className={styles.paragraph}>
            [Nom de la société] met en œuvre des mesures techniques et organisationnelles appropriées
            pour protéger vos données :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Chiffrement</strong> : communications sécurisées par TLS, données sensibles
              chiffrées au repos.
            </li>
            <li className={styles.listItem}>
              <strong>Authentification</strong> : mots de passe hashés, possibilité
              d&apos;authentification à deux facteurs.
            </li>
            <li className={styles.listItem}>
              <strong>Contrôle d&apos;accès</strong> : gestion des rôles et permissions (RBAC) pour
              limiter l&apos;accès aux données.
            </li>
            <li className={styles.listItem}>
              <strong>Sauvegardes</strong> : sauvegardes régulières et automatisées des données.
            </li>
            <li className={styles.listItem}>
              <strong>Journalisation</strong> : enregistrement des accès et des actions sensibles à
              des fins d&apos;audit.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Contact — Délégué à la protection des données</h2>
          <p className={styles.paragraph}>
            Pour toute question relative à la protection de vos données personnelles, vous pouvez
            contacter notre Délégué à la Protection des Données (DPO) :
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>E-mail : dpo@coproflex.fr</li>
            <li className={styles.listItem}>Adresse : [Nom de la société] — [Adresse complète]</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Modification de la politique</h2>
          <p className={styles.paragraph}>
            [Nom de la société] se réserve le droit de modifier la présente Politique de
            confidentialité à tout moment. En cas de modification substantielle, les Utilisateurs
            seront informés par notification sur le Service ou par e-mail. La date de dernière mise à
            jour est indiquée en haut de cette page.
          </p>
          <p className={styles.paragraph}>
            La poursuite de l&apos;utilisation du Service après notification vaut acceptation de la
            politique modifiée.
          </p>
        </section>
      </div>
    </>
  );
}
