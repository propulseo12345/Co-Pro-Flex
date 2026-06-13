'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Calculator, Key, Users, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useRepartitionKeys, useLots } from '@/hooks/modules/useLotsData';
import * as lotsApi from '@/lib/lots/api';
import { useCopro } from '@/providers/CoproContext';
import type { PosteEditorData } from '../PosteEditor/PosteEditor';
import styles from './SimulationRepartitionModal.module.css';

interface RepartitionLigne {
  lotId: string;
  lotNumero: string;
  lotType: string;
  coproprietaireId: string;
  coproprietaireNom: string;
  tantiemes: number;
  pourcentage: number;
  montant: number;
}

interface PosteRepartition {
  posteId: string;
  posteLibelle: string;
  cleId: string;
  cleNom: string;
  montant: number;
  lignes: RepartitionLigne[];
}

interface CoproprietaireTotal {
  coproprietaireId: string;
  coproprietaireNom: string;
  lots: string[];
  totalMontant: number;
  detailParPoste: Array<{ posteLibelle: string; montant: number }>;
}

interface SimulationRepartitionModalProps {
  postes: PosteEditorData[];
  onClose: () => void;
}

export function SimulationRepartitionModal({ postes, onClose }: SimulationRepartitionModalProps) {
  const { currentCoproId } = useCopro();
  const { keys: clesRepartition, isLoading: isLoadingCles } = useRepartitionKeys();
  const { lots, isLoading: isLoadingLots } = useLots();
  const [repartitions, setRepartitions] = useState<PosteRepartition[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [viewMode, setViewMode] = useState<'by-poste' | 'by-copro'>('by-copro');
  const [expandedPostes, setExpandedPostes] = useState<Set<string>>(new Set());

  const budgetTotal = useMemo(() => postes.reduce((sum, p) => sum + p.montant, 0), [postes]);

  // Create a map of lot info for quick lookup
  const lotsMap = useMemo(() => {
    const map = new Map<string, { ref: string; type: string; ownerId: string; ownerName: string }>();
    (lots || []).forEach(lot => {
      map.set(lot.id, {
        ref: lot.ref,
        type: lot.type || 'autre',
        ownerId: lot.coproprietaire_id || 'unknown',
        ownerName: lot.owner_display_name || 'Propriétaire inconnu',
      });
    });
    return map;
  }, [lots]);

  // Calculate répartition from key lines
  const calculerRepartition = useCallback(async (cleId: string, montant: number, _cleNom: string): Promise<RepartitionLigne[]> => {
    if (!currentCoproId) return [];

    const { data: lines, error } = await lotsApi.listRepartitionKeyLines(currentCoproId, cleId);
    if (error || !lines || lines.length === 0) return [];

    // Calculate total weight
    const totalWeight = lines.reduce((sum, l) => sum + l.weight, 0);
    if (totalWeight === 0) return [];

    return lines.map(line => {
      const lotInfo = lotsMap.get(line.lot_id);
      const pourcentage = (line.weight / totalWeight) * 100;
      const montantLigne = (line.weight / totalWeight) * montant;

      return {
        lotId: line.lot_id,
        lotNumero: lotInfo?.ref || line.lot_ref,
        lotType: lotInfo?.type || (line.lot_type || 'autre'),
        coproprietaireId: lotInfo?.ownerId || 'unknown',
        coproprietaireNom: lotInfo?.ownerName || 'Propriétaire inconnu',
        tantiemes: line.weight,
        pourcentage,
        montant: Math.round(montantLigne * 100) / 100,
      };
    });
  }, [currentCoproId, lotsMap]);

  // Load répartitions when data is ready
  useEffect(() => {
    const loadRepartitions = async () => {
      if (isLoadingCles || isLoadingLots || !clesRepartition || !lots) return;

      setIsCalculating(true);
      try {
        const postesWithCle = postes.filter(p => p.cleRepartitionId);
        const results: PosteRepartition[] = [];

        for (const poste of postesWithCle) {
          const cle = clesRepartition.find(c => c.key_id === poste.cleRepartitionId);
          if (!cle) continue;

          const lignes = await calculerRepartition(poste.cleRepartitionId!, poste.montant, cle.name);
          if (lignes.length > 0) {
            results.push({
              posteId: poste.id,
              posteLibelle: poste.libelle,
              cleId: poste.cleRepartitionId!,
              cleNom: cle.name,
              montant: poste.montant,
              lignes,
            });
          }
        }

        setRepartitions(results);
      } catch (err) {
        console.error('Erreur lors du calcul de la répartition:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    loadRepartitions();
  }, [postes, clesRepartition, lots, isLoadingCles, isLoadingLots, calculerRepartition]);

  const isLoading = isLoadingCles || isLoadingLots || isCalculating;

  // Aggregate by copropriétaire
  const coproprietairesTotals = useMemo(() => {
    const map = new Map<string, CoproprietaireTotal>();

    repartitions.forEach(rep => {
      rep.lignes.forEach(ligne => {
        const existing = map.get(ligne.coproprietaireId);
        if (existing) {
          existing.totalMontant += ligne.montant;
          existing.detailParPoste.push({ posteLibelle: rep.posteLibelle, montant: ligne.montant });
          if (!existing.lots.includes(ligne.lotNumero)) {
            existing.lots.push(ligne.lotNumero);
          }
        } else {
          map.set(ligne.coproprietaireId, {
            coproprietaireId: ligne.coproprietaireId,
            coproprietaireNom: ligne.coproprietaireNom,
            lots: [ligne.lotNumero],
            totalMontant: ligne.montant,
            detailParPoste: [{ posteLibelle: rep.posteLibelle, montant: ligne.montant }],
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalMontant - a.totalMontant);
  }, [repartitions]);

  const postesWithoutCle = postes.filter(p => !p.cleRepartitionId && p.montant > 0);
  const totalWithCle = repartitions.reduce((sum, r) => sum + r.montant, 0);
  const totalWithoutCle = postesWithoutCle.reduce((sum, p) => sum + p.montant, 0);

  const togglePosteExpand = (posteId: string) => {
    setExpandedPostes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(posteId)) {
        newSet.delete(posteId);
      } else {
        newSet.add(posteId);
      }
      return newSet;
    });
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>
              <Calculator size={24} />
              Simulation de répartition
            </h2>
            <p className={styles.subtitle}>
              Estimation des charges par copropriétaire avant validation
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Budget total</span>
            <span className={styles.summaryValue}>{budgetTotal.toLocaleString('fr-FR')} €</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Avec clé assignée</span>
            <span className={styles.summaryValue}>{totalWithCle.toLocaleString('fr-FR')} €</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Copropriétaires</span>
            <span className={styles.summaryValue}>{coproprietairesTotals.length}</span>
          </div>
        </div>

        {postesWithoutCle.length > 0 && (
          <div className={styles.warningBanner}>
            <AlertTriangle size={16} />
            <span>
              {postesWithoutCle.length} poste(s) sans clé de répartition ({totalWithoutCle.toLocaleString('fr-FR')} €) :
              {' '}{postesWithoutCle.map(p => p.libelle).join(', ')}
            </span>
          </div>
        )}

        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'by-copro' ? styles.active : ''}`}
            onClick={() => setViewMode('by-copro')}
          >
            <Users size={16} />
            Par copropriétaire
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'by-poste' ? styles.active : ''}`}
            onClick={() => setViewMode('by-poste')}
          >
            <Key size={16} />
            Par poste
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Calcul de la répartition...</span>
            </div>
          ) : viewMode === 'by-copro' ? (
            <div className={styles.coproList}>
              <div className={styles.tableHeader}>
                <span>Copropriétaire</span>
                <span>Lot(s)</span>
                <span className={styles.textRight}>Montant estimé</span>
              </div>
              {coproprietairesTotals.map(copro => (
                <div key={copro.coproprietaireId} className={styles.coproRow}>
                  <span className={styles.coproNom}>{copro.coproprietaireNom}</span>
                  <span className={styles.coproLots}>{copro.lots.join(', ')}</span>
                  <span className={styles.coproMontant}>
                    {copro.totalMontant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              ))}
              <div className={styles.totalRow}>
                <span>Total</span>
                <span></span>
                <span className={styles.textRight}>
                  {coproprietairesTotals.reduce((sum, c) => sum + c.totalMontant, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.posteList}>
              {repartitions.map(rep => (
                <div key={rep.posteId} className={styles.posteSection}>
                  <button
                    className={styles.posteHeader}
                    onClick={() => togglePosteExpand(rep.posteId)}
                  >
                    {expandedPostes.has(rep.posteId) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className={styles.posteLibelle}>{rep.posteLibelle}</span>
                    <span className={styles.posteCle}>{rep.cleNom}</span>
                    <span className={styles.posteMontant}>{rep.montant.toLocaleString('fr-FR')} €</span>
                  </button>
                  {expandedPostes.has(rep.posteId) && (
                    <div className={styles.posteDetail}>
                      <div className={styles.detailHeader}>
                        <span>Lot</span>
                        <span>Copropriétaire</span>
                        <span className={styles.textRight}>Tantièmes</span>
                        <span className={styles.textRight}>%</span>
                        <span className={styles.textRight}>Montant</span>
                      </div>
                      {rep.lignes.map(ligne => (
                        <div key={ligne.lotId} className={styles.detailRow}>
                          <span>{ligne.lotNumero}</span>
                          <span>{ligne.coproprietaireNom}</span>
                          <span className={styles.textRight}>{ligne.tantiemes.toLocaleString('fr-FR')}</span>
                          <span className={styles.textRight}>{ligne.pourcentage.toFixed(2)}%</span>
                          <span className={styles.textRight}>
                            {ligne.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
