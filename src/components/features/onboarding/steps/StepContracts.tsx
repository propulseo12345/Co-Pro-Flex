'use client';

import { useState, useCallback } from 'react';
import { Wrench, Trash2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { TYPES_CONTRAT } from '@/lib/constants/categories-contrat';
import { createClient } from '@/lib/supabase/client';
import { createProvider, createContract } from '@/lib/maintenance/writes';
import styles from './StepContracts.module.css';

interface StepContractsProps {
  coproId: string;
  onClose: () => void;
}

interface ContractEntry {
  id: string;
  prestataireName: string;
  contractType: string;
  contractTypeLabel: string;
  title: string;
  annualAmount: number;
  startDate: string;
  endDate: string;
}

export function StepContracts({ coproId, onClose }: StepContractsProps) {
  const [contracts, setContracts] = useState<ContractEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [prestataireName, setPrestataireName] = useState('');
  const [contractType, setContractType] = useState('');
  const [title, setTitle] = useState('');
  const [annualAmount, setAnnualAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetForm = useCallback(() => {
    setPrestataireName('');
    setContractType('');
    setTitle('');
    setAnnualAmount('');
    setStartDate('');
    setEndDate('');
  }, []);

  const canAdd = prestataireName.trim() && contractType && title.trim() && startDate && endDate;

  const handleAdd = useCallback(async () => {
    if (!canAdd) return;
    setIsSaving(true);

    const supabase = createClient();
    try {
      // Crée d'abord le prestataire (tiers is_provider), puis le contrat.
      const provider = await createProvider(supabase, coproId, {
        name: prestataireName.trim(),
        category: 'copropriete',
        domains: [],
      });

      // Type de contrat UI -> slug work_domain (référentiel des domaines).
      const typeMap: Record<string, string> = {
        ASCENSEUR: 'ascenseur',
        CHAUFFAGE: 'chauffage',
        MENAGE: 'menage',
        EAU: 'eau',
        ELECTRICITE: 'electricite',
        ASSURANCE: 'assurance',
        ESPACES_VERTS: 'espaces_verts',
        TOITURE: 'toiture',
        FACADE: 'facade',
        INTERPHONE: 'interphone',
        PORTAIL: 'portail',
        JURIDIQUE: 'juridique',
        AUTRE: 'autre',
      };

      await createContract(supabase, coproId, {
        provider_id: provider.id,
        title: title.trim(),
        contract_type: typeMap[contractType] || 'autre',
        start_date: startDate,
        end_date: endDate,
        annual_amount: annualAmount ? parseFloat(annualAmount) : undefined,
        status: 'active',
      });

      const typeLabel = TYPES_CONTRAT.find(t => t.value === contractType)?.label || contractType;

      setContracts(prev => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          prestataireName: prestataireName.trim(),
          contractType,
          contractTypeLabel: typeLabel,
          title: title.trim(),
          annualAmount: parseFloat(annualAmount) || 0,
          startDate,
          endDate,
        },
      ]);

      resetForm();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement : ' + (err instanceof Error ? err.message : 'erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  }, [canAdd, coproId, prestataireName, contractType, title, annualAmount, startDate, endDate, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  }, []);

  const formatAmount = (amount: number) =>
    amount > 0 ? `${amount.toLocaleString('fr-FR')} euros/an` : '-';

  return (
    <div className={styles.container}>
      <StepHeader
        title="Contrats de maintenance"
        description="Renseignez les contrats en cours de votre copropriete (ascenseur, menage, assurance...). Cette etape est facultative, vous pourrez les ajouter plus tard."
      />

      {/* Form */}
      <div className={styles.form}>
        <div className={styles.formTitle}>
          <Wrench size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
          Ajouter un contrat
        </div>

        <div className={styles.fields}>
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Prestataire *</label>
            <input
              className={styles.input}
              value={prestataireName}
              onChange={e => setPrestataireName(e.target.value)}
              placeholder="Nom du prestataire (ex: Schindler, Veolia...)"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Type de contrat *</label>
            <select
              className={styles.select}
              value={contractType}
              onChange={e => setContractType(e.target.value)}
            >
              <option value="">Selectionner...</option>
              {TYPES_CONTRAT.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Montant annuel</label>
            <input
              className={`${styles.input} ${styles.inputMoney}`}
              type="number"
              step="0.01"
              value={annualAmount}
              onChange={e => setAnnualAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Libelle du contrat *</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contrat de maintenance ascenseur"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de debut *</label>
            <input
              className={styles.input}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de fin *</label>
            <input
              className={styles.input}
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <button
          className={styles.btnAdd}
          onClick={handleAdd}
          disabled={!canAdd || isSaving}
        >
          {isSaving ? 'Enregistrement...' : 'Ajouter ce contrat'}
        </button>
      </div>

      {/* Contracts list */}
      {contracts.length > 0 ? (
        <div className={styles.list}>
          {contracts.map(c => (
            <div key={c.id} className={styles.listItem}>
              <div className={styles.listItemInfo}>
                <span className={styles.listItemTitle}>{c.title}</span>
                <span className={styles.listItemMeta}>
                  {c.contractTypeLabel} - {c.prestataireName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.listItemAmount}>{formatAmount(c.annualAmount)}</span>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          Aucun contrat ajoute pour le moment.
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnClose} onClick={onClose}>
          Fermer
        </button>
        <button className={styles.btnDone} onClick={onClose}>
          {contracts.length > 0 ? `Termine (${contracts.length} contrat${contracts.length > 1 ? 's' : ''})` : 'Passer'}
        </button>
      </div>
      <p className={styles.skipNote}>
        Cette etape est optionnelle. Vous pouvez ajouter des contrats plus tard dans le module Maintenance.
      </p>
    </div>
  );
}
