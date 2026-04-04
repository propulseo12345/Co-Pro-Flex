import type { MetadataRoute } from 'next';
import { BLOG_ARTICLES } from '@/data/blog-articles';

const BASE_URL = 'https://coproflex.fr';

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingPages = [
    '',
    '/tarifs',
    '/contact',
    '/a-propos',
    '/faq',
    '/securite',
    '/comment-ca-marche',
    '/comparaison',
    '/blog',
    '/mentions-legales',
    '/cgu',
    '/confidentialite',
  ];

  const pages: MetadataRoute.Sitemap = marketingPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/blog' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/tarifs' ? 0.9 : 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...pages, ...blogPages];
}
