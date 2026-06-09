'use client';

import { useState, useEffect } from 'react';
import { Crown, Users } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { BlocCard } from './BlocCard';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import { listCoproprietaires } from '@/lib/owners/api';
import styles from './BlocConseilSyndical.module.css';

type CSRole = 'president' | 'member';

interface CouncilMember {
  coproprietaire_id: string;
  role: CSRole;
  nom: string;
}

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
  const [members, setMembers] = useState<CouncilMember[]>([]);

  // Source canonique : variables.council_members de la résolution (id + rôle réels),
  // noms résolus depuis l'annuaire des copropriétaires. Indépendant du statut.
  useEffect(() => {
    const raw = (action.resolution?.variables as unknown as {
      council_members?: Array<{ coproprietaire_id: string; role: CSRole }>;
    } | null)?.council_members;

    if (!raw?.length || !currentCoproId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    listCoproprietaires(currentCoproId, { type: 'COPROPRIETAIRE' }).then(({ data }) => {
      if (cancelled) return;
      const nameById = new Map((data || []).map(c => [c.id, c.display_name || '']));
      setMembers(
        raw.map(m => ({
          coproprietaire_id: m.coproprietaire_id,
          role: m.role,
          nom: nameById.get(m.coproprietaire_id) || 'Copropriétaire',
        }))
      );
    });
    return () => { cancelled = true; };
  }, [action.resolution, currentCoproId]);

  return (
    <BlocCard title="Conseil syndical" actionType={action.action_type} status={action.status}>
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}
      {members.length > 0 ? (
        <div className={styles.activatedList}>
          {members.map(m => (
            <div key={m.coproprietaire_id} className={styles.activatedItem}>
              {m.role === 'president' ? <Crown size={14} /> : <Users size={14} />}
              <span>{m.nom}</span>
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
