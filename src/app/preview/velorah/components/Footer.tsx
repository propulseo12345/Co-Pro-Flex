import styles from './Footer.module.css';

const COLUMNS = [
  {
    heading: 'Produit',
    links: ['Fonctionnalités', 'Tarifs', 'Intégrations', 'Sécurité', 'Roadmap'],
  },
  {
    heading: 'Ressources',
    links: ["Blog", 'Guides', 'Webinaires', "Centre d'aide", 'API'],
  },
  {
    heading: 'Entreprise',
    links: ['À propos', 'Contact', 'Carrières', 'Presse', 'Partenaires'],
  },
  {
    heading: 'Légal',
    links: ['CGU', 'Confidentialité', 'Cookies', 'Mentions légales'],
  },
] as const;

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Logo */}
        <div className={styles.logo}>CoProFlex</div>

        {/* Link columns */}
        <nav className={styles.grid} aria-label="Footer navigation">
          {COLUMNS.map(({ heading, links }) => (
            <div key={heading} className={styles.col}>
              <span className={styles.colHeading}>{heading}</span>
              <ul className={styles.linkList}>
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className={styles.link}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © 2026 CoProFlex. Tous droits réservés.
          </span>
          <div className={styles.contact}>
            <a href="mailto:contact@coproflex.fr" className={styles.contactLink}>
              contact@coproflex.fr
            </a>
            <span className={styles.contactSep}>·</span>
            <a href="tel:+33123456789" className={styles.contactLink}>
              +33 1 23 45 67 89
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
