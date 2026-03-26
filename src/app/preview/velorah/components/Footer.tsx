import styles from './Footer.module.css';

const COLUMNS = [
  {
    heading: 'Produit',
    links: ['Fonctionnalités', 'Tarifs', 'Sécurité', 'Roadmap'],
  },
  {
    heading: 'Ressources',
    links: ['Blog', 'Guides', "Centre d'aide", 'API'],
  },
  {
    heading: 'Entreprise',
    links: ['À propos', 'Contact', 'CGU', 'Confidentialité'],
  },
] as const;

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Brand + description */}
        <div className={styles.brand}>
          <div className={styles.logo}>CoProFlex</div>
          <p className={styles.brandDesc}>
            La plateforme tout-en-un qui simplifie la copropriété pour les syndics et les copropriétaires.
          </p>
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

        {/* Link columns */}
        {COLUMNS.map(({ heading, links }) => (
          <nav key={heading} className={styles.col}>
            <span className={styles.colHeading}>{heading}</span>
            <ul className={styles.linkList}>
              {links.map((link) => (
                <li key={link}>
                  <a href="#" className={styles.link}>{link}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <span className={styles.copyright}>
          © 2026 CoProFlex. Tous droits réservés.
        </span>
      </div>
    </footer>
  );
}
