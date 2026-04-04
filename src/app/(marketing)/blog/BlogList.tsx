'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { BLOG_ARTICLES, BLOG_CATEGORIES } from '@/data/blog-articles';
import type { IBlogArticle } from '@/data/blog-articles';
import { formatDateLongFR } from '@/lib/dates';
import styles from './page.module.css';

const CATEGORY_CLASS: Record<IBlogArticle['category'], string> = {
  Guides: styles.categoryGuides,
  Réglementaire: styles.categoryReglementaire,
  Conseils: styles.categoryConseils,
};

export function BlogList() {
  const [activeCategory, setActiveCategory] = useState<string>('Tous');

  const filtered = useMemo(() => {
    if (activeCategory === 'Tous') return BLOG_ARTICLES;
    return BLOG_ARTICLES.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <section className={styles.section}>
      <div className={styles.filters}>
        {BLOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ''}`}
            onClick={() => setActiveCategory(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {featured && (
        <Link href={`/blog/${featured.slug}`} className={styles.featuredCard}>
          <span className={`${styles.categoryBadge} ${CATEGORY_CLASS[featured.category]}`}>
            {featured.category}
          </span>
          <h2 className={styles.featuredTitle}>{featured.title}</h2>
          <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
          <div className={styles.meta}>
            <span>{featured.author.name}</span>
            <span className={styles.metaSep} aria-hidden="true" />
            <span>{formatDateLongFR(featured.date)}</span>
            <span className={styles.metaSep} aria-hidden="true" />
            <span>{featured.readTime} de lecture</span>
          </div>
        </Link>
      )}

      <div className={styles.grid}>
        {rest.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className={styles.card}
          >
            <span className={`${styles.categoryBadge} ${CATEGORY_CLASS[article.category]}`}>
              {article.category}
            </span>
            <h3 className={styles.cardTitle}>{article.title}</h3>
            <p className={styles.cardExcerpt}>{article.excerpt}</p>
            <div className={styles.meta}>
              <span>{article.author.name}</span>
              <span className={styles.metaSep} aria-hidden="true" />
              <span>{formatDateLongFR(article.date)}</span>
              <span className={styles.metaSep} aria-hidden="true" />
              <span>{article.readTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
