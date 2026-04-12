'use client';

import { useState } from 'react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { PPTGestionnaireGrid } from '@/components/features/conformite/ppt/PPTGestionnaireGrid';
import { PPTYearSelector } from '@/components/features/conformite/ppt/PPTYearSelector';
import { PPTKanban } from '@/components/features/conformite/ppt/PPTKanban';
import { PPTCardDetail } from '@/components/features/conformite/ppt/PPTCardDetail';
import { PPTTravailModal } from '@/components/features/conformite/ppt/PPTTravailModal';
import { usePPT, type PPTFilter } from '@/hooks/usePPT';
import { useCopro } from '@/providers/CoproContext';
import { useToast } from '@/providers/ToastProvider';
import type { ITravauxPPT } from '@/types';
import styles from './ppt.module.css';

const FILTERS: { value: PPTFilter; label: string }[] = [
  { value: 'TOUTES', label: 'Toutes' },
  { value: 'A_JOUR', label: 'À jour' },
  { value: 'EN_RETARD', label: 'En retard' },
  { value: 'A_COMPLETER', label: 'À compléter' },
];

export default function PPTGestionnairePage() {
  const { currentCoproId } = useCopro();
  const { showToast } = useToast();

  const {
    coproprietes,
    filter,
    setFilter,
    selectedCopro,
    travauxByStatut,
    selectedYear,
    setYear,
    years,
    selectedTravail,
    openTravailDetail,
    closeTravailDetail,
    addTravail,
    updateTravail,
    deleteTravail,
  } = usePPT({ coproprieteId: currentCoproId ?? undefined });

  const [travailModal, setTravailModal] = useState<{
    open: boolean;
    travail: ITravauxPPT | null;
  }>({ open: false, travail: null });

  function openCreateModal() {
    setTravailModal({ open: true, travail: null });
  }

  function openEditModal(t: ITravauxPPT) {
    closeTravailDetail();
    setTravailModal({ open: true, travail: t });
  }

  function closeModal() {
    setTravailModal({ open: false, travail: null });
  }

  function handleSave(data: Omit<ITravauxPPT, 'id' | 'etapes'>) {
    const coproId = currentCoproId ?? (coproprietes[0]?.coproprieteId ?? '');
    if (travailModal.travail) {
      updateTravail(coproId, travailModal.travail.id, data);
      showToast({ type: 'success', message: `Travail "${data.titre}" mis à jour` });
    } else {
      addTravail(coproId, data);
      showToast({ type: 'success', message: `Travail "${data.titre}" ajouté au PPT` });
    }
  }

  function handleDelete() {
    if (!travailModal.travail) return;
    const coproId = currentCoproId ?? (coproprietes[0]?.coproprieteId ?? '');
    deleteTravail(coproId, travailModal.travail.id);
    showToast({ type: 'info', message: `Travail "${travailModal.travail.titre}" supprimé` });
    closeModal();
  }

  // Vue copropriété spécifique (CoproContext actif)
  if (currentCoproId && selectedCopro) {
    return (
      <div className="container">
        <FinanceTopBar
          title="Plan Pluriannuel de Travaux"
          subtitle={`${selectedCopro.nom} · ${selectedCopro.nbLots} lots · ${selectedCopro.travaux.length} travaux planifiés`}
          actions={
            <button type="button" className={styles.btnAdd} onClick={openCreateModal}>
              + Ajouter un travail
            </button>
          }
        />
        <div className={styles.yearRow}>
          <span className={styles.yearLabel}>Filtrer par année :</span>
          <PPTYearSelector years={years} selectedYear={selectedYear} onSelect={setYear} />
        </div>
        <PPTKanban travauxByStatut={travauxByStatut} onCardClick={openTravailDetail} />
        {selectedTravail && (
          <PPTCardDetail
            travail={selectedTravail}
            onClose={closeTravailDetail}
            onEdit={() => openEditModal(selectedTravail)}
            onDelete={() => {
              const coproId = currentCoproId ?? '';
              deleteTravail(coproId, selectedTravail.id);
              showToast({ type: 'info', message: `Travail "${selectedTravail.titre}" supprimé` });
              closeTravailDetail();
            }}
          />
        )}
        {travailModal.open && (
          <PPTTravailModal
            travail={travailModal.travail}
            onSave={handleSave}
            onDelete={travailModal.travail ? handleDelete : undefined}
            onClose={closeModal}
          />
        )}
      </div>
    );
  }

  // Vue gestionnaire (toutes copropriétés)
  return (
    <div className="container">
      <FinanceTopBar
        title="Plan Pluriannuel de Travaux"
        subtitle="Suivi des PPT sur l'ensemble de votre portefeuille"
        actions={
          <div className={styles.filters}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                className={filter === f.value ? styles.filterActive : styles.filter}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <PPTGestionnaireGrid coproprietes={coproprietes} />
    </div>
  );
}
