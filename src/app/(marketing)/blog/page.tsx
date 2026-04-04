import type { Metadata } from 'next';
import { PageHero } from '@/components/features/marketing/PageHero';
import { BlogList } from './BlogList';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides, conseils et actualités pour mieux gérer votre copropriété.',
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        badge="Blog"
        title="Blog CoProFlex"
        subtitle="Guides, conseils et actualités pour mieux gérer votre copropriété."
      />

      <BlogList />
    </>
  );
}
