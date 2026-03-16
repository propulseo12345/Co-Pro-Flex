'use client';

import { useMemo } from 'react';
import { Lock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { MouvementBancaire, EcritureComptable, WorkflowTab } from '../domain/types';
import styles from './ClotureTab.module.css';

interface ClotureTabProps {
  mouvements: MouvementBancaire[];
  ecritures: EcritureComptable[];
  onTabChange: (tab: WorkflowTab) => void;
}

interface MoisData {
  label: string;
  mois: number;
  annee: number;
  totalMouvements: number;
  categorises: number;
  rapproches: number;
  ecart: number;
  status: 'cloture' | 'pret' | 'bloque';
}

export function ClotureTab({ mouvements, ecritures, onTabChange }: ClotureTabProps) {
  const moisData = useMemo(() => {
    const now = new Date();
    const result: MoisData[] = [];
    const nomsMois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mois = d.getMonth();
      const annee = d.getFullYear();

      const mouvementsMois = mouvements.filter(m => {
        const date = new Date(m.date);
        return date.getMonth() === mois && date.getFullYear() === annee;
      });

      const total = mouvementsMois.length;
      const categorises = mouvementsMois.filter(m => m.categorise).length;

      const rapproches = mouvementsMois.filter(m => {
        return ecritures.some(ec => ec.mouvementRapproche === m.id);
      }).length;

      const ecart = total > 0 ? 0 : 0; // Simplified — real calculation from ecartSoldes

      const allCategorised = total > 0 && categorises === total;
      const allRapproches = total > 0 && rapproches === total;

      let status: MoisData['status'] = 'bloque';
      if (total === 0) status = 'pret';
      else if (allCategorised && allRapproches && ecart === 0) status = 'pret';

      result.push({
        label: `${nomsMois[mois]} ${annee}`,
        mois,
        annee,
        totalMouvements: total,
        categorises,
        rapproches,
        ecart,
        status,
      });
    }

    return result;
  }, [mouvements, ecritures]);

  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {moisData.map((mois) => (
          <div key={`${mois.mois}-${mois.annee}`} className={`${styles.card} ${styles[`card_${mois.status}`]}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{mois.label}</h3>
              <span className={`${styles.statusBadge} ${styles[`status_${mois.status}`]}`}>
                {mois.status === 'cloture' && <><Lock size={12} /> Clôturé</>}
                {mois.status === 'pret' && <><CheckCircle size={12} /> Prêt</>}
                {mois.status === 'bloque' && <><AlertTriangle size={12} /> En cours</>}
              </span>
            </div>

            <div className={styles.checklist}>
              <div className={styles.checkItem}>
                <span className={mois.categorises === mois.totalMouvements ? styles.checkOk : styles.checkKo}>
                  {mois.categorises === mois.totalMouvements ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                </span>
                <span>Catégorisés {mois.categorises}/{mois.totalMouvements}</span>
                {mois.categorises < mois.totalMouvements && (
                  <button className={styles.linkBtn} onClick={() => onTabChange('categorisation')}>
                    Traiter <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div className={styles.checkItem}>
                <span className={mois.rapproches === mois.totalMouvements ? styles.checkOk : styles.checkKo}>
                  {mois.rapproches === mois.totalMouvements ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                </span>
                <span>Rapprochés {mois.rapproches}/{mois.totalMouvements}</span>
                {mois.rapproches < mois.totalMouvements && (
                  <button className={styles.linkBtn} onClick={() => onTabChange('rapprochement')}>
                    Traiter <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div className={styles.checkItem}>
                <span className={mois.ecart === 0 ? styles.checkOk : styles.checkKo}>
                  {mois.ecart === 0 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                </span>
                <span>Écart : {formatMontant(mois.ecart)}</span>
              </div>
            </div>

            {mois.status === 'pret' && mois.totalMouvements > 0 && (
              <button className={styles.clotureBtn}>
                <Lock size={14} />
                Clôturer {mois.label}
              </button>
            )}

            {mois.totalMouvements === 0 && (
              <p className={styles.noData}>Aucun mouvement ce mois</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
