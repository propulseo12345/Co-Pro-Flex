'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';

export function AgResolutionsLink() {
  return (
    <Link href="/ag/resolutions" className="card" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}
        >
          <BookOpen size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Bibliothèque de résolutions
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Modèles de résolutions pré-définis et personnalisés
          </p>
        </div>
        <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </Link>
  );
}
