'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserPlus, X, Crown, Users, ChevronDown } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { BlocCard } from './BlocCard';
import { electCouncilFromAg } from '@/lib/ag/api/finalisation.api';
import { listCoproprietaires, type CoproprietaireOverview } from '@/lib/owners/api';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import { createClient } from '@/lib/supabase/client';
import styles from './BlocConseilSyndical.module.css';

type CSRole = 'president' | 'member';

interface SelectedMembre {
  copro_id: string;
  nom: string;
  role: CSRole;
}

const ROLE_LABELS: Record<CSRole, string> = {
  president: 'Président du CS',
  member: 'Membre du CS',
};

interface BlocConseilSyndicalProps {
  agId: string;
  action: PendingAction;
  onActivated: () => void;
}

/** Load elected CS members from AG data (resolution variables + session draft fallback) */
async function loadElectedNames(agId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // 1. Try resolution variables (elected_copro_id + noms)
  const { data: resolutions } = await supabase
    .from('ag_resolutions')
    .select('variables')
    .eq('ag_id', agId)
    .eq('action_type', 'ELECT_COUNCIL')
    .eq('is_approved', true);

  const names: string[] = [];
  if (resolutions?.length) {
    for (const res of resolutions as Array<{ variables: Record<string, string> | null }>) {
      const nom = res.variables?.noms;
      if (nom && nom.trim()) names.push(nom.trim());
    }
  }

  // 2. Fallback: check global variables draft (noms might be stored there)
  if (names.length === 0) {
    const { data: drafts } = await supabase
      .from('ag_session_drafts')
      .select('draft_data')
      .eq('ag_id', agId)
      .eq('draft_type', 'variables');

    if (drafts?.length) {
      const draftData = (drafts[0] as { draft_data: Record<string, string> }).draft_data;
      const nom = draftData?.noms;
      if (nom && nom.trim()) names.push(nom.trim());
    }
  }

  return names;
}

/** Load elected copro_ids from resolution variables (new format with elected_copro_id) */
async function loadElectedIds(agId: string): Promise<Array<{ copro_id: string; nom: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('ag_resolutions')
    .select('variables')
    .eq('ag_id', agId)
    .eq('action_type', 'ELECT_COUNCIL')
    .eq('is_approved', true);

  if (!data?.length) return [];

  const elected: Array<{ copro_id: string; nom: string }> = [];
  for (const res of data as Array<{ variables: Record<string, string> | null }>) {
    const vars = res.variables;
    if (!vars) continue;
    const coproId = vars.elected_copro_id;
    const nom = vars.noms;
    if (coproId && nom) {
      elected.push({ copro_id: coproId, nom });
    }
  }
  return elected;
}

export function BlocConseilSyndical({ agId, action, onActivated }: BlocConseilSyndicalProps) {
  const { currentCoproId } = useCopro();
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);

  // Copropriétaires list (for dropdown)
  const [copros, setCopros] = useState<CoproprietaireOverview[]>([]);
  const [loadingCopros, setLoadingCopros] = useState(false);

  // Selected members (pre-filled from AG + user additions)
  const [membres, setMembres] = useState<SelectedMembre[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');

  // Load copropriétaires list + pre-fill elected from AG resolutions
  useEffect(() => {
    if (!currentCoproId || status === 'activated') return;

    setLoadingCopros(true);

    Promise.all([
      listCoproprietaires(currentCoproId, { type: 'COPROPRIETAIRE' }),
      loadElectedIds(agId),
      loadElectedNames(agId),
    ]).then(([{ data: coproList }, electedById, electedNames]) => {
      if (coproList) setCopros(coproList);

      if (!initialized) {
        const prefilled: SelectedMembre[] = [];

        // Priority 1: structured copro_ids (new AG sessions)
        if (electedById.length > 0) {
          for (const e of electedById) {
            prefilled.push({ copro_id: e.copro_id, nom: e.nom, role: 'member' });
          }
        }
        // Priority 2: match names against copropriétaires list (old AG sessions)
        else if (electedNames.length > 0 && coproList) {
          for (const name of electedNames) {
            const match = coproList.find(c => {
              const dn = (c.display_name || '').toLowerCase();
              return dn === name.toLowerCase();
            });
            if (match) {
              prefilled.push({
                copro_id: match.id,
                nom: match.display_name || name,
                role: 'member',
              });
            }
          }
        }

        if (prefilled.length > 0) setMembres(prefilled);
      }
      setInitialized(true);
    }).finally(() => setLoadingCopros(false));
  }, [currentCoproId, agId, status, initialized]);

  const getDisplayName = (c: CoproprietaireOverview) =>
    c.display_name || (c.is_company ? c.company_name : `${c.first_name} ${c.last_name}`) || '';

  const filteredCopros = copros.filter(c => {
    const name = getDisplayName(c).toLowerCase();
    const isSelected = membres.some(m => m.copro_id === c.id);
    return !isSelected && name.includes(search.toLowerCase());
  });

  const addMembre = useCallback((copro: CoproprietaireOverview) => {
    setMembres(prev => [
      ...prev,
      { copro_id: copro.id, nom: getDisplayName(copro), role: 'member' },
    ]);
    setSearch('');
    setShowDropdown(false);
  }, []);

  const removeMembre = useCallback((coproId: string) => {
    setMembres(prev => prev.filter(m => m.copro_id !== coproId));
  }, []);

  const changeRole = useCallback((coproId: string, role: CSRole) => {
    setMembres(prev => prev.map(m => m.copro_id === coproId ? { ...m, role } : m));
  }, []);

  const hasPresident = membres.some(m => m.role === 'president');

  const handleConfirm = useCallback(async () => {
    if (membres.length === 0) {
      setError('Sélectionnez au moins un membre du conseil syndical.');
      return;
    }

    setStatus('loading');
    setError(null);

    const result = await electCouncilFromAg(agId, membres);
    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur lors de l\'élection du conseil syndical');
    }
  }, [agId, membres, onActivated]);

  return (
    <BlocCard
      title="Conseil syndical"
      actionType={action.action_type}
      status={status}
      error={error}
      onConfirm={handleConfirm}
      confirmLabel={`Élire le conseil (${membres.length} membre${membres.length > 1 ? 's' : ''})`}
      confirmDisabled={membres.length === 0}
    >
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}

      {status !== 'activated' && (
        <>
          {/* Selected members */}
          {membres.length > 0 && (
            <div className={styles.selectedList}>
              {membres.map(m => (
                <div key={m.copro_id} className={styles.selectedItem}>
                  <div className={styles.selectedInfo}>
                    {m.role === 'president' ? (
                      <Crown size={16} className={styles.iconPresident} />
                    ) : (
                      <Users size={16} className={styles.iconMember} />
                    )}
                    <span className={styles.selectedName}>{m.nom}</span>
                    <select
                      className={styles.roleSelect}
                      value={m.role}
                      onChange={e => changeRole(m.copro_id, e.target.value as CSRole)}
                    >
                      <option value="member">Membre</option>
                      <option value="president" disabled={hasPresident && m.role !== 'president'}>
                        Président
                      </option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeMembre(m.copro_id)}
                    title="Retirer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {membres.length === 0 && !loadingCopros && (
            <p className={styles.emptyText}>Aucun membre désigné en AG. Ajoutez-les ci-dessous.</p>
          )}

          {/* Dropdown to add more */}
          <div className={styles.addSection}>
            <button
              type="button"
              className={styles.addToggle}
              onClick={() => setShowDropdown(v => !v)}
            >
              <UserPlus size={14} />
              Ajouter un copropriétaire
              <ChevronDown size={14} className={showDropdown ? styles.chevronOpen : ''} />
            </button>

            {showDropdown && (
              <div className={styles.dropdown}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className={styles.coproList}>
                  {loadingCopros ? (
                    <p className={styles.loadingText}>Chargement…</p>
                  ) : (
                    <>
                      {filteredCopros.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className={styles.coproItem}
                          onClick={() => addMembre(c)}
                        >
                          <div className={styles.avatar}>
                            {getDisplayName(c).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className={styles.coproItemInfo}>
                            <span className={styles.coproName}>{getDisplayName(c)}</span>
                            {c.council_role && (
                              <span className={styles.currentRole}>
                                {c.council_role === 'president' ? 'Président CS actuel' : 'Membre CS actuel'}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredCopros.length === 0 && (
                        <p className={styles.emptyDropdown}>
                          {search ? 'Aucun résultat.' : 'Tous sélectionnés.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {status === 'activated' && membres.length > 0 && (
        <div className={styles.activatedList}>
          {membres.map(m => (
            <div key={m.copro_id} className={styles.activatedItem}>
              {m.role === 'president' ? <Crown size={14} /> : <Users size={14} />}
              <span>{m.nom}</span>
              <span className={styles.roleBadge}>{ROLE_LABELS[m.role]}</span>
            </div>
          ))}
        </div>
      )}
    </BlocCard>
  );
}
