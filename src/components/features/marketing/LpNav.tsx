'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './LpNav.module.css';

const NAV_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Fonctionnalités', href: '/#fonctionnalites' },
  { label: 'Tarifs', href: '/tarifs' },
  { label: 'Comment ça marche', href: '/comment-ca-marche' },
  { label: 'Contact', href: '/contact' },
] as const;

export function LpNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/CoProFlex_logo_transparent.png"
            alt="CoProFlex"
            width={300}
            height={200}
            priority
            className={styles.logoImage}
          />
        </Link>

        <div className={styles.navLinks}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${isActive(href) ? styles.navLinkActive : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className={styles.navActions}>
          <Link href="/auth/login" className={styles.navCtaSecondary}>
            Se connecter
          </Link>
          <Link href="/contact" className={styles.navCtaPrimary}>
            Demander une démo
          </Link>
          <button
            className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ''}`}>
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.mobileLink} ${isActive(href) ? styles.mobileLinkActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/contact"
          className={styles.mobileCta}
          onClick={() => setMobileOpen(false)}
        >
          Demander une démo
        </Link>
      </div>
    </>
  );
}
