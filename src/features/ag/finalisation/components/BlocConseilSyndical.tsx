'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { BlocCard } from './BlocCard';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import { createClient } from '@/lib/supabase/client';
import styles from './BlocConseilSyndical.module.css';

interface BlocConseilSyndicalProps {
  agId: string;
  action: PendingAction;
}

/** Noms des membres élus, lus depuis les résolutions ELECT_COUNCIL approuvées (variable `noms`). */
async function loadElectedNames(agId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('ag_resolutions')
    .select('variables')
    .eq('ag_id', agId)
    .eq('action_type', 'ELECT_COUNCIL')
    .eq('is_approved', true);

  const names: string[] = [];
  if (data?.length) {
    for (const res of data as Array<{ variables: Record<string, string> | null }>) {
      const nom = res.variables?.noms;
      if (nom && nom.trim()) names.push(nom.trim());
    }
  }
  return names;
}

/** Revue lecture seule du conseil syndical élu (renouvelé à l'étape PV). */
export function BlocConseilSyndical({ agId, action }: BlocConseilSyndicalProps) {
  const [names, setNames] = useState<string[]>([]);

  // Chargement indépendant du statut (l'élection est déjà activée à l'étape PV).
  useEffect(() => {
    let cancelled = false;
    loadElectedNames(agId).then(n => { if (!cancelled) setNames(n); });
    return () => { cancelled = true; };
  }, [agId]);

  return (
    <BlocCard title="Conseil syndical" actionType={action.action_type} status={action.status}>
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}
      {names.length > 0 ? (
        <div className={styles.activatedList}>
          {names.map((nom, i) => (
            <div key={i} className={styles.activatedItem}>
              <Users size={14} />
              <span>{nom}</span>
              <span className={styles.roleBadge}>Membre du CS</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>Conseil syndical renouvelé.</p>
      )}
    </BlocCard>
  );
}
