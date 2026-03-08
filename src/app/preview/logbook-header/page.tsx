'use client';

import { useState } from 'react';
import {
  Download, Plus, Activity, Briefcase, TrendingUp,
  ShieldCheck, FileCheck, ClipboardList, ChevronRight,
} from 'lucide-react';
import styles from './preview.module.css';

type Variant = 'A' | 'B' | 'C';
type FiltreKpi = 'contrats' | 'en_cours' | 'travaux_prevus' | 'assurances' | 'documents_valides' | 'tous';

const MOCK_KPIS = {
  contratsActifs: 3,
  interventionsEnCours: 4,
  travauxPrevus: 6,
  assurancesActives: 2,
  documentsValides: 6,
  totalInterventions: 11,
};

const FILTERS: Array<{ id: FiltreKpi; label: string; value: number; color: string; icon: React.ElementType }> = [
  { id: 'en_cours', label: 'En cours', value: MOCK_KPIS.interventionsEnCours, color: '#FBBF24', icon: Activity },
  { id: 'contrats', label: 'Contrats', value: MOCK_KPIS.contratsActifs, color: '#2563eb', icon: Briefcase },
  { id: 'travaux_prevus', label: 'Travaux', value: MOCK_KPIS.travauxPrevus, color: '#60A5FA', icon: TrendingUp },
  { id: 'assurances', label: 'Assurances', value: MOCK_KPIS.assurancesActives, color: '#34D399', icon: ShieldCheck },
  { id: 'documents_valides', label: 'Documents', value: MOCK_KPIS.documentsValides, color: '#A78BFA', icon: FileCheck },
  { id: 'tous', label: 'Total', value: MOCK_KPIS.totalInterventions, color: '#8892a4', icon: ClipboardList },
];

// =====================================================
// VARIANTE A — Condensé essentiel (3 KPIs)
// =====================================================
function VariantA() {
  const [filtre, setFiltre] = useState<FiltreKpi>('tous');
  const essentials = FILTERS.filter(f => ['en_cours', 'contrats', 'tous'].includes(f.id));

  return (
    <div className={styles.header}>
      <div className={styles.aTop}>
        <div className={styles.aLeft}>
          <h1 className={styles.aTitle}>Carnet d&apos;entretien</h1>
          <p className={styles.aSubtitle}>Résidence Les Jardins — 25 avenue Victor Hugo, 69003 Lyon</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
          <button className={styles.btnPrimary}><Plus size={15} /> Nouvelle intervention</button>
        </div>
      </div>
      <div className={styles.aKpis}>
        {essentials.map(f => {
          const Icon = f.icon;
          const active = filtre === f.id;
          return (
            <button
              key={f.id}
              className={`${styles.aKpiCard} ${active ? styles.aKpiActive : ''}`}
              onClick={() => setFiltre(f.id)}
              style={active ? { borderColor: f.color } : undefined}
            >
              <div className={styles.aKpiIcon} style={{ background: f.color + '20', color: f.color }}>
                <Icon size={18} />
              </div>
              <span className={styles.aKpiValue}>{f.value}</span>
              <span className={styles.aKpiLabel}>{f.label}</span>
              {f.id === 'en_cours' && f.value > 0 && (
                <span className={styles.aPulse} style={{ background: f.color }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// VARIANTE B — Barre de progression segmentée
// =====================================================
function VariantB() {
  const [filtre, setFiltre] = useState<FiltreKpi | null>(null);
  const total = MOCK_KPIS.totalInterventions;
  const segments = FILTERS.filter(f => f.id !== 'tous');

  return (
    <div className={styles.header}>
      <div className={styles.bTop}>
        <div className={styles.bLeft}>
          <h1 className={styles.bTitle}>Carnet d&apos;entretien</h1>
          <p className={styles.bSubtitle}>Résidence Les Jardins — 25 avenue Victor Hugo, 69003 Lyon</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
          <button className={styles.btnPrimary}><Plus size={15} /> Nouvelle intervention</button>
        </div>
      </div>

      <div className={styles.bBarSection}>
        <div className={styles.bBarLabel}>
          <span className={styles.bBarTotal}>{total}</span>
          <span className={styles.bBarTotalLabel}>interventions</span>
        </div>
        <div className={styles.bBarTrack}>
          {segments.map(seg => {
            const pct = Math.max((seg.value / total) * 100, 4);
            const active = filtre === seg.id;
            return (
              <button
                key={seg.id}
                className={`${styles.bSegment} ${active ? styles.bSegmentActive : ''}`}
                style={{
                  width: `${pct}%`,
                  background: active ? seg.color : seg.color + '60',
                }}
                onClick={() => setFiltre(filtre === seg.id ? null : seg.id)}
                title={`${seg.label}: ${seg.value}`}
              />
            );
          })}
        </div>
        <div className={styles.bLegend}>
          {segments.map(seg => {
            const active = filtre === seg.id;
            return (
              <button
                key={seg.id}
                className={`${styles.bLegendItem} ${active ? styles.bLegendActive : ''}`}
                onClick={() => setFiltre(filtre === seg.id ? null : seg.id)}
              >
                <span className={styles.bDot} style={{ background: seg.color }} />
                <span>{seg.label}</span>
                <span className={styles.bLegendValue}>{seg.value}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// VARIANTE C — Résumé intelligent (pills)
// =====================================================
function VariantC() {
  const [filtre, setFiltre] = useState<FiltreKpi>('tous');

  return (
    <div className={styles.header}>
      <div className={styles.cTop}>
        <div className={styles.cLeft}>
          <h1 className={styles.cTitle}>Carnet d&apos;entretien</h1>
          <p className={styles.cSubtitle}>Résidence Les Jardins — 25 avenue Victor Hugo, 69003 Lyon</p>
        </div>
        <div className={styles.cRight}>
          <div className={styles.cHighlight}>
            <Activity size={18} className={styles.cHighlightIcon} />
            <span className={styles.cHighlightValue}>{MOCK_KPIS.interventionsEnCours}</span>
            <span className={styles.cHighlightLabel}>en cours</span>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
            <button className={styles.btnPrimary}><Plus size={15} /> Nouvelle intervention</button>
          </div>
        </div>
      </div>

      <div className={styles.cPills}>
        {FILTERS.map(f => {
          const active = filtre === f.id;
          return (
            <button
              key={f.id}
              className={`${styles.cPill} ${active ? styles.cPillActive : ''}`}
              onClick={() => setFiltre(f.id)}
              style={active ? { background: f.color + '20', color: f.color, borderColor: f.color + '40' } : undefined}
            >
              <span className={styles.cPillValue}>{f.value}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// PAGE PREVIEW
// =====================================================
export default function LogbookHeaderPreview() {
  const [variant, setVariant] = useState<Variant>('A');

  return (
    <div className={styles.page}>
      <div className={styles.selector}>
        <h1 className={styles.pageTitle}>Logbook Header Preview</h1>
        <div className={styles.tabs}>
          {(['A', 'B', 'C'] as Variant[]).map(v => (
            <button
              key={v}
              className={`${styles.tab} ${variant === v ? styles.tabActive : ''}`}
              onClick={() => setVariant(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <p className={styles.variantDesc}>
          {variant === 'A' && 'Condensé essentiel — 3 KPIs clés'}
          {variant === 'B' && 'Barre de progression — segments cliquables'}
          {variant === 'C' && 'Résumé intelligent — pills de filtre'}
        </p>
      </div>
      <div className={styles.preview}>
        {variant === 'A' && <VariantA />}
        {variant === 'B' && <VariantB />}
        {variant === 'C' && <VariantC />}
      </div>
    </div>
  );
}
