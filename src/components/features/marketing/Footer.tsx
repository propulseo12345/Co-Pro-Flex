import Link from 'next/link';
import styles from './Footer.module.css';

const COLUMNS = [
  {
    heading: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/#fonctionnalites' },
      { label: 'Tarifs', href: '/tarifs' },
      { label: 'Sécurité', href: '/securite' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    heading: 'Ressources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: "Centre d'aide", href: '#' },
      { label: 'API', href: '#' },
    ],
  },
  {
    heading: 'Entreprise',
    links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Contact', href: '/contact' },
      { label: 'CGU', href: '/cgu' },
      { label: 'Confidentialité', href: '/confidentialite' },
    ],
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
            <a href="tel:+33186000000" className={styles.contactLink}>
              01 86 XX XX XX
            </a>
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map(({ heading, links }) => (
          <nav key={heading} className={styles.col}>
            <span className={styles.colHeading}>{heading}</span>
            <ul className={styles.linkList}>
              {links.map(({ label, href }) => (
                <li key={label}>
                  {href === '#' ? (
                    <span className={styles.linkDisabled}>{label}</span>
                  ) : (
                    <Link href={href} className={styles.link}>{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copyright}>
            © 2026 CoProFlex. Tous droits réservés.
          </span>
          <div className={styles.legalLinks}>
            <Link href="/mentions-legales" className={styles.legalLink}>Mentions légales</Link>
            <Link href="/cgu" className={styles.legalLink}>CGU</Link>
            <Link href="/confidentialite" className={styles.legalLink}>Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
