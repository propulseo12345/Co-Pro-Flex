'use client';

import { Calendar } from 'lucide-react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';

export default function PPTPage() {
  return (
    <div className="container">
      <FinanceTopBar
        title="Plan Pluriannuel de Travaux (PPT)"
        subtitle="Planification des travaux sur 10 ans — Loi Climat et Résilience"
      />
      <div style={{
        background: '#1a1d2e',
        border: '1px solid rgba(148,163,184,0.08)',
        borderRadius: 12,
        padding: '60px 24px',
        textAlign: 'center',
      }}>
        <Calendar size={40} style={{ color: '#64748b', marginBottom: 16 }} aria-hidden="true" />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
          Module PPT en cours de développement
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Le Plan Pluriannuel de Travaux sera disponible prochainement.
        </div>
      </div>
    </div>
  );
}
