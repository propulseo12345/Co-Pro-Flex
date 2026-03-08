'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Loader2, AlertCircle,
  Wallet, TrendingUp, TrendingDown, Users,
  CheckCircle, Search
} from 'lucide-react';
import * as financeApi from '@/lib/finance/api';
import type { CallForFundsOverview, CallLineDetailed } from '@/lib/finance/api';
import { StatutAppelBadge } from '@/components/features/finance/AppelsFonds/StatutAppelBadge';
import styles from './call-detail.module.css';

type ModeEnvoi = 'electronique' | 'email' | 'courrier';

/** Combined copropriétaire data across all keys */
interface CombinedCopro {
  lotId: string;
  lotRef: string;
  ownerName: string;
  totalDue: number;
  totalPaid: number;
  totalRemaining: number;
  status: 'paid' | 'partial' | 'unpaid';
  /** Breakdown by key */
  breakdown: { keyName: string; amount: number }[];
  /** All line IDs for this copro */
  lineIds: string[];
}

const MODE_ENVOI_OPTIONS: { value: ModeEnvoi; label: string }[] = [
  { value: 'electronique', label: 'Électronique' },
  { value: 'email', label: 'Email' },
  { value: 'courrier', label: 'Courrier' },
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function mapCallStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'A_GENERER',
    issued: 'EMIS',
    partially_paid: 'PARTIELLEMENT_PAYE',
    paid: 'SOLDE',
    cancelled: 'ANNULE',
  };
  return map[status] || status;
}

function worstLineStatus(statuses: string[]): 'paid' | 'partial' | 'unpaid' {
  if (statuses.some(s => s === 'unpaid')) return 'unpaid';
  if (statuses.some(s => s === 'partial')) return 'partial';
  return 'paid';
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;

  const [calls, setCalls] = useState<CallForFundsOverview[]>([]);
  const [allLines, setAllLines] = useState<CallLineDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Envoi state
  const [modeEnvois, setModeEnvois] = useState<Record<string, ModeEnvoi>>({});
  const [sentLots, setSentLots] = useState<Set<string>>(new Set());
  const [sendingInProgress, setSendingInProgress] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Load the clicked call to get period_id + trimester
    const callResult = await financeApi.getCallById(callId);
    if (callResult.error || !callResult.data) {
      setError(callResult.error || 'Appel introuvable');
      setIsLoading(false);
      return;
    }

    const mainCall = callResult.data;

    // 2. Load ALL calls for same period + trimester (all keys)
    let siblingCalls: CallForFundsOverview[] = [mainCall];
    if (mainCall.trimester != null) {
      const siblingsResult = await financeApi.getCallsForTrimester(
        mainCall.copro_id,
        mainCall.period_id,
        mainCall.trimester
      );
      if (siblingsResult.data && siblingsResult.data.length > 0) {
        siblingCalls = siblingsResult.data;
      }
    }

    setCalls(siblingCalls);

    // 3. Load lines for ALL calls
    const allCallIds = siblingCalls.map(c => c.id);
    const linesResult = await financeApi.getCombinedCallLines(allCallIds);
    if (linesResult.error) {
      setError(linesResult.error);
      setIsLoading(false);
      return;
    }

    setAllLines(linesResult.data || []);

    // Init envoi modes per lot
    const lots = new Set((linesResult.data || []).map(l => l.lot_id));
    const modes: Record<string, ModeEnvoi> = {};
    lots.forEach(lotId => { modes[lotId] = 'electronique'; });
    setModeEnvois(modes);

    // Mark sent if all calls are issued
    if (siblingCalls.every(c => c.status !== 'draft')) {
      setSentLots(lots);
    }

    setIsLoading(false);
  }, [callId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build key name map from calls
  const keyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach(c => map.set(c.id, c.repartition_key_name));
    return map;
  }, [calls]);

  // Combine lines by lot (copropriétaire)
  const combinedCopros = useMemo<CombinedCopro[]>(() => {
    const lotMap = new Map<string, {
      lotRef: string;
      ownerName: string;
      totalDue: number;
      totalPaid: number;
      statuses: string[];
      breakdown: { keyName: string; amount: number }[];
      lineIds: string[];
    }>();

    allLines.forEach(line => {
      const existing = lotMap.get(line.lot_id);
      const keyName = keyNameMap.get(line.call_id) || 'Inconnu';

      if (existing) {
        existing.totalDue += Number(line.amount_due);
        existing.totalPaid += Number(line.amount_paid);
        existing.statuses.push(line.status);
        existing.breakdown.push({ keyName, amount: Number(line.amount_due) });
        existing.lineIds.push(line.id);
      } else {
        lotMap.set(line.lot_id, {
          lotRef: line.lot_ref,
          ownerName: line.owner_name || 'Propriétaire inconnu',
          totalDue: Number(line.amount_due),
          totalPaid: Number(line.amount_paid),
          statuses: [line.status],
          breakdown: [{ keyName, amount: Number(line.amount_due) }],
          lineIds: [line.id],
        });
      }
    });

    return Array.from(lotMap.entries()).map(([lotId, data]) => ({
      lotId,
      lotRef: data.lotRef,
      ownerName: data.ownerName,
      totalDue: data.totalDue,
      totalPaid: data.totalPaid,
      totalRemaining: data.totalDue - data.totalPaid,
      status: worstLineStatus(data.statuses),
      breakdown: data.breakdown,
      lineIds: data.lineIds,
    })).sort((a, b) => a.lotRef.localeCompare(b.lotRef));
  }, [allLines, keyNameMap]);

  // Filtered
  const filteredCopros = useMemo(() => {
    if (!searchTerm.trim()) return combinedCopros;
    const term = searchTerm.toLowerCase();
    return combinedCopros.filter(c =>
      c.ownerName.toLowerCase().includes(term) ||
      c.lotRef.toLowerCase().includes(term)
    );
  }, [combinedCopros, searchTerm]);

  // Synthèse
  const synthese = useMemo(() => {
    const totalAppele = combinedCopros.reduce((sum, c) => sum + c.totalDue, 0);
    const totalEncaisse = combinedCopros.reduce((sum, c) => sum + c.totalPaid, 0);
    return {
      totalAppele,
      totalEncaisse,
      totalRestant: totalAppele - totalEncaisse,
      tauxRecouvrement: totalAppele > 0 ? (totalEncaisse / totalAppele) * 100 : 0,
      nbSoldes: combinedCopros.filter(c => c.status === 'paid').length,
      nbPartiels: combinedCopros.filter(c => c.status === 'partial').length,
      nbNonPayes: combinedCopros.filter(c => c.status === 'unpaid').length,
    };
  }, [combinedCopros]);

  const handleModeChange = useCallback((lotId: string, mode: ModeEnvoi) => {
    setModeEnvois(prev => ({ ...prev, [lotId]: mode }));
  }, []);

  const handleEnvoyerUn = useCallback(async (lotId: string) => {
    setSendingInProgress(true);
    // TODO: Implement via Supabase Edge Function
    setTimeout(() => {
      setSentLots(prev => new Set(prev).add(lotId));
      setSendingInProgress(false);
    }, 1000);
  }, []);

  const handleEnvoyerTous = useCallback(async () => {
    setSendingInProgress(true);
    // TODO: Implement via Supabase Edge Function
    setTimeout(() => {
      setSentLots(new Set(combinedCopros.map(c => c.lotId)));
      setSendingInProgress(false);
    }, 2000);
  }, [combinedCopros]);

  const handleSelectAllMode = useCallback((mode: ModeEnvoi) => {
    setModeEnvois(prev => {
      const next = { ...prev };
      combinedCopros.forEach(c => { next[c.lotId] = mode; });
      return next;
    });
  }, [combinedCopros]);

  const mainCall = calls[0];
  const isSent = calls.length > 0 && calls.every(c => c.status !== 'draft');

  // Trimester label
  const trimesterLabel = mainCall
    ? `${mainCall.label?.match(/T\d/)?.[0] || 'Trimestre'} — ${calls.map(c => c.repartition_key_name).join(', ')}`
    : '';

  // Loading
  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={48} className={styles.spinner} />
          <h2>Chargement de l&apos;appel de fonds...</h2>
        </div>
      </div>
    );
  }

  // Error
  if (error || !mainCall) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <h2>{error || 'Appel de fonds introuvable'}</h2>
          <button onClick={() => router.back()} className="btn btn-primary">Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} />
          Retour
        </button>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Appel de fonds — {mainCall.label?.match(/T\d\s\d{4}/)?.[0] || mainCall.label}</h1>
            <p className={styles.subtitle}>
              {calls.length} clé{calls.length > 1 ? 's' : ''} : {calls.map(c => c.repartition_key_name).join(' · ')}
              {' · '}Échéance : {formatDate(mainCall.due_date)}
            </p>
          </div>
          <StatutAppelBadge statut={mapCallStatus(mainCall.status)} size="md" />
        </div>
      </div>

      {/* Synthèse cards */}
      <div className={styles.synthese}>
        <div className={styles.syntheseCard}>
          <div className={`${styles.syntheseIcon} ${styles.iconPrimary}`}>
            <Wallet size={20} />
          </div>
          <div className={styles.syntheseContent}>
            <span className={styles.syntheseLabel}>Montant appelé</span>
            <span className={styles.syntheseValue}>{formatCurrency(synthese.totalAppele)}</span>
          </div>
        </div>
        <div className={styles.syntheseCard}>
          <div className={`${styles.syntheseIcon} ${styles.iconSuccess}`}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.syntheseContent}>
            <span className={styles.syntheseLabel}>Encaissé</span>
            <span className={`${styles.syntheseValue} ${styles.valueSuccess}`}>
              {formatCurrency(synthese.totalEncaisse)}
              <span className={styles.synthesePercent}>({synthese.tauxRecouvrement.toFixed(1)}%)</span>
            </span>
          </div>
        </div>
        <div className={styles.syntheseCard}>
          <div className={`${styles.syntheseIcon} ${synthese.totalRestant > 0 ? styles.iconWarning : styles.iconSuccess}`}>
            <TrendingDown size={20} />
          </div>
          <div className={styles.syntheseContent}>
            <span className={styles.syntheseLabel}>Reste à percevoir</span>
            <span className={`${styles.syntheseValue} ${synthese.totalRestant > 0 ? styles.valueWarning : styles.valueSuccess}`}>
              {formatCurrency(synthese.totalRestant)}
            </span>
          </div>
        </div>
        <div className={styles.syntheseCard}>
          <div className={`${styles.syntheseIcon} ${styles.iconNeutral}`}>
            <Users size={20} />
          </div>
          <div className={styles.syntheseContent}>
            <span className={styles.syntheseLabel}>{combinedCopros.length} copropriétaires</span>
            <div className={styles.syntheseStats}>
              <span className={`${styles.statBadge} ${styles.badgeSuccess}`}>{synthese.nbSoldes} soldés</span>
              <span className={`${styles.statBadge} ${styles.badgeWarning}`}>{synthese.nbPartiels} partiels</span>
              <span className={`${styles.statBadge} ${styles.badgeDanger}`}>{synthese.nbNonPayes} impayés</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className={styles.actionBar}>
        <p className={styles.statusText}>
          {combinedCopros.length} copropriétaire(s) · {calls.length} clé(s) de répartition
        </p>
        <button
          className={styles.envoyerTousBtn}
          onClick={handleEnvoyerTous}
          disabled={sendingInProgress || isSent}
        >
          {sendingInProgress ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send size={16} />
              Envoyer à tous
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Rechercher par nom ou lot..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className={styles.filterCount}>
          {filteredCopros.length} / {combinedCopros.length}
        </span>
      </div>

      {/* Table copropriétaires */}
      {combinedCopros.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={32} />
          <p>Aucun copropriétaire trouvé pour cet appel.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thName}>Copropriétaire</th>
                <th>Lot</th>
                <th className={styles.textRight}>Montant dû</th>
                <th className={styles.textRight}>Payé</th>
                <th className={styles.textRight}>Reste</th>
                <th>Statut</th>
                <th className={styles.thMode}>
                  Mode d&apos;envoi
                  <div className={styles.modeQuickActions}>
                    {MODE_ENVOI_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={styles.selectAllBtn}
                        onClick={() => handleSelectAllMode(opt.value)}
                        disabled={isSent}
                      >
                        Tout {opt.label.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </th>
                <th className={styles.textCenter}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCopros.map(copro => {
                const isLotSent = sentLots.has(copro.lotId);

                return (
                  <tr key={copro.lotId} className={isLotSent ? styles.sentRow : ''}>
                    <td className={styles.tdName}>
                      <div>
                        <span>{copro.ownerName}</span>
                        {copro.breakdown.length > 1 && (
                          <div className={styles.breakdownHint}>
                            {copro.breakdown.map((b, i) => (
                              <span key={i} className={styles.breakdownItem}>
                                {b.keyName}: {formatCurrency(b.amount)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={styles.tdLot}>{copro.lotRef}</td>
                    <td className={styles.textRight}>
                      <span className={styles.montant}>{formatCurrency(copro.totalDue)}</span>
                    </td>
                    <td className={styles.textRight}>
                      <span className={copro.totalPaid > 0 ? styles.montantPaye : styles.montantZero}>
                        {formatCurrency(copro.totalPaid)}
                      </span>
                    </td>
                    <td className={styles.textRight}>
                      <span className={copro.totalRemaining > 0 ? styles.montantRestant : styles.montantSolde}>
                        {formatCurrency(copro.totalRemaining)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.paymentBadge} ${styles[`payment_${copro.status}`]}`}>
                        {copro.status === 'paid' ? 'Soldé' : copro.status === 'partial' ? 'Partiel' : 'Non payé'}
                      </span>
                    </td>
                    <td>
                      {!isLotSent ? (
                        <select
                          value={modeEnvois[copro.lotId] || 'electronique'}
                          onChange={(e) => handleModeChange(copro.lotId, e.target.value as ModeEnvoi)}
                          className={styles.modeSelect}
                          disabled={sendingInProgress}
                        >
                          {MODE_ENVOI_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.modeEnvoye}>
                          {MODE_ENVOI_OPTIONS.find(o => o.value === (modeEnvois[copro.lotId] || 'electronique'))?.label}
                        </span>
                      )}
                    </td>
                    <td className={styles.textCenter}>
                      {!isLotSent ? (
                        <button
                          className={styles.envoyerBtn}
                          onClick={() => handleEnvoyerUn(copro.lotId)}
                          disabled={sendingInProgress}
                          title="Envoyer"
                        >
                          <Send size={14} />
                        </button>
                      ) : (
                        <span className={styles.sentLabel}>
                          <CheckCircle size={16} />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button onClick={() => router.back()} className="btn btn-secondary">
          <ArrowLeft size={16} />
          Retour aux appels
        </button>
        <button
          onClick={handleEnvoyerTous}
          className="btn btn-primary"
          disabled={sendingInProgress || isSent}
        >
          <Send size={16} />
          Envoyer à tous les copropriétaires
        </button>
      </div>
    </div>
  );
}
