'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ArrowRight, Building2, MapPin } from 'lucide-react';
import { listOnboardingCopros, deleteOnboardingCopro } from '@/lib/onboarding/api';
import { ONBOARDING_STEPS } from '@/hooks/modules/useOnboarding';
import type { OnboardingCopro } from '@/lib/onboarding/api';
import styles from './onboarding.module.css';

export default function OnboardingManagePage() {
  const [copros, setCopros] = useState<OnboardingCopro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCopros = useCallback(async () => {
    setIsLoading(true);
    const { data } = await listOnboardingCopros();
    setCopros(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCopros();
  }, [loadCopros]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Supprimer « ${name} » et toutes ses données ? Cette action est irréversible.`)) return;
    setDeletingId(id);
    await deleteOnboardingCopro(id);
    setCopros(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  }, []);

  const getStepLabel = (step: number) => {
    const s = ONBOARDING_STEPS.find(s => s.id === step);
    return s?.label || `Étape ${step}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Onboarding</h1>
        <p className={styles.subtitle}>Copropriétés en cours de configuration</p>
      </div>

      <div className={styles.topActions}>
        <Link href="/onboarding/create" className={styles.newBtn}>
          <Plus size={18} />
          Nouvelle copropriété
        </Link>
      </div>

      {isLoading && (
        <div className={styles.loading}>Chargement...</div>
      )}

      {!isLoading && copros.length === 0 && (
        <div className={styles.emptyState}>
          <Building2 size={40} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Aucun onboarding en cours</p>
          <p className={styles.emptyDesc}>
            Cliquez sur « Nouvelle copropriété » pour commencer la configuration d&apos;une copropriété.
          </p>
        </div>
      )}

      {!isLoading && copros.length > 0 && (
        <div className={styles.cardGrid}>
          {copros.map(copro => {
            const progress = ((copro.onboarding_step - 1) / (ONBOARDING_STEPS.length - 1)) * 100;
            return (
              <div key={copro.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{copro.name}</h3>
                    {(copro.address || copro.city) && (
                      <div className={styles.cardAddress}>
                        <MapPin size={12} />
                        <span>{[copro.address, copro.postal_code, copro.city].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    <span className={styles.cardDate}>Créée le {formatDate(copro.created_at)}</span>
                  </div>
                </div>

                <div className={styles.cardProgress}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>
                      Étape {copro.onboarding_step} / {ONBOARDING_STEPS.length} — {getStepLabel(copro.onboarding_step)}
                    </span>
                    <span className={styles.progressPct}>{Math.round(progress)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(copro.id, copro.name)}
                    disabled={deletingId === copro.id}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                  <Link href={`/onboarding/${copro.id}`} className={styles.resumeBtn}>
                    Reprendre
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
