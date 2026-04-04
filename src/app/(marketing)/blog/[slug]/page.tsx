import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BLOG_ARTICLES } from '@/data/blog-articles';
import { formatDateLongFR } from '@/lib/dates';
import { CtaBanner } from '@/components/features/marketing/CtaBanner';
import styles from './page.module.css';

const CATEGORY_CLASS: Record<string, string> = {
  Guides: styles.categoryGuides,
  Réglementaire: styles.categoryReglementaire,
  Conseils: styles.categoryConseils,
};

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: 'Article introuvable' };
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const related = BLOG_ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug
  ).slice(0, 3);

  return (
    <>
      <article className={styles.article}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Fil d'ariane">
          <Link href="/" className={styles.breadcrumbLink}>
            Accueil
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            /
          </span>
          <Link href="/blog" className={styles.breadcrumbLink}>
            Blog
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            /
          </span>
          <span className={styles.breadcrumbCurrent}>{article.title}</span>
        </nav>

        {/* Header */}
        <header className={styles.header}>
          <span className={`${styles.categoryBadge} ${CATEGORY_CLASS[article.category]}`}>
            {article.category}
          </span>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.meta}>
            <span>
              {article.author.name}, {article.author.role}
            </span>
            <span className={styles.metaSep} aria-hidden="true" />
            <span>{formatDateLongFR(article.date)}</span>
            <span className={styles.metaSep} aria-hidden="true" />
            <span>{article.readTime} de lecture</span>
          </div>
        </header>

        {/* Body */}
        <div className={styles.body}>
          <p>{article.content}</p>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>Articles similaires</h2>
          <div className={styles.relatedGrid}>
            {related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className={styles.relatedCard}
              >
                <span className={`${styles.categoryBadge} ${CATEGORY_CLASS[rel.category]}`}>
                  {rel.category}
                </span>
                <h3 className={styles.relatedCardTitle}>{rel.title}</h3>
                <p className={styles.relatedCardExcerpt}>{rel.excerpt}</p>
                <div className={styles.meta}>
                  <span>{rel.author.name}</span>
                  <span className={styles.metaSep} aria-hidden="true" />
                  <span>{formatDateLongFR(rel.date)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CtaBanner
        text="Simplifiez votre gestion de copropriété"
        buttonText="Découvrir CoProFlex"
        buttonHref="/#fonctionnalites"
      />
    </>
  );
}
