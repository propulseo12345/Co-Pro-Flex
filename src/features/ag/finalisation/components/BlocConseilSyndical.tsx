'use client';

import { useState, useEffect, useMemo } from 'react';
import { Crown, Users } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { BlocCard } from './BlocCard';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import { listCoproprietaires } from '@/lib/owners/api';
import styles from './BlocConseilSyndical.module.css';

type CSRole = 'president' | 'member';

const ROLE_LABELS: Record<CSRole, string> = {
  president: 'Président du CS',
  member: 'Membre du CS',
};

interface BlocConseilSyndicalProps {
  action: PendingAction;
}

/** Revue lecture seule du conseil syndical élu (renouvelé à l'étape PV). */
export function BlocConseilSyndical({ action }: BlocConseilSyndicalProps) {
  const { currentCoproId } = useCopro();

  // Membres élus (id + rôle réels) dérivés de la résolution — valeur calculée, sans état.
  const elected = useMemo<Array<{ coproprietaire_id: string; role: CSRole }>>(() => {
    const raw = (action.resolution?.variables as unknown as {
      council_members?: Array<{ coproprietaire_id: string; role: CSRole }>;
    } | null)?.council_members;
    return raw ?? [];
  }, [action.resolution]);

  // Noms résolus depuis l'annuaire — setState UNIQUEMENT dans le callback async (jamais synchrone).
  const [namesById, setNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!elected.length || !currentCoproId) return;
    let cancelled = false;
    listCoproprietaires(currentCoproId, { type: 'COPROPRIETAIRE' }).then(({ data }) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const c of data || []) map[c.id] = c.display_name || '';
      setNamesById(map);
    });
    return () => { cancelled = true; };
  }, [elected, currentCoproId]);

  return (
    <BlocCard title="Conseil syndical" actionType={action.action_type} status={action.status}>
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}
      {elected.length > 0 ? (
        <div className={styles.activatedList}>
          {elected.map(m => (
            <div key={m.coproprietaire_id} className={styles.activatedItem}>
              {m.role === 'president' ? <Crown size={14} /> : <Users size={14} />}
              <span>{namesById[m.coproprietaire_id] || 'Copropriétaire'}</span>
              <span className={styles.roleBadge}>{ROLE_LABELS[m.role]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>Conseil syndical renouvelé.</p>
      )}
    </BlocCard>
  );
}
