'use client';

import { ContratDetaille, ContratSyndic, Prestataire } from '@/types';
import {
  AddContractModal,
  EditContractModal,
  EditSyndicModal,
  ContratDecisionModal,
} from '@/components/features/maintenance/Contracts';
import ResiliationModal from '@/components/features/maintenance/ResiliationModal/ResiliationModal';

interface ContractsModalsProps {
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  prestataires: Prestataire[];
  onAddContrat: (contrat: ContratDetaille) => void;
  contratToEdit: ContratDetaille | null;
  onCloseEditModal: () => void;
  onSaveContrat: (contrat: ContratDetaille) => void;
  isEditSyndicModalOpen: boolean;
  contratSyndic: ContratSyndic | null;
  onSaveSyndic: (contrat: ContratSyndic) => void;
  onCloseEditSyndicModal: () => void;
  contratToResiliate: ContratDetaille | null;
  onCloseResiliationModal: () => void;
  onConfirmResiliation: () => void;
  contratExpireDecision: { contrat: ContratDetaille; joursDepasses: number } | null;
  onCloseDecisionModal: () => void;
  onRenouveler: (contrat: ContratDetaille, nouvelleDateFin: string) => void;
  onResilier: (contrat: ContratDetaille, raison: string, archiver: boolean) => void;
}

export function ContractsModals({
  isAddModalOpen,
  onCloseAddModal,
  prestataires,
  onAddContrat,
  contratToEdit,
  onCloseEditModal,
  onSaveContrat,
  isEditSyndicModalOpen,
  contratSyndic,
  onSaveSyndic,
  onCloseEditSyndicModal,
  contratToResiliate,
  onCloseResiliationModal,
  onConfirmResiliation,
  contratExpireDecision,
  onCloseDecisionModal,
  onRenouveler,
  onResilier,
}: ContractsModalsProps) {
  return (
    <>
      <AddContractModal
        isOpen={isAddModalOpen}
        onClose={onCloseAddModal}
        prestataires={prestataires}
        onAdd={onAddContrat}
      />

      <EditContractModal
        contrat={contratToEdit}
        onClose={onCloseEditModal}
        prestataires={prestataires}
        onSave={onSaveContrat}
      />

      {isEditSyndicModalOpen && contratSyndic && (
        <EditSyndicModal
          contrat={contratSyndic}
          onSave={onSaveSyndic}
          onClose={onCloseEditSyndicModal}
        />
      )}

      {contratToResiliate && (
        <ResiliationModal
          contrat={contratToResiliate}
          onClose={onCloseResiliationModal}
          onConfirm={onConfirmResiliation}
        />
      )}

      {contratExpireDecision && (
        <ContratDecisionModal
          contrat={contratExpireDecision.contrat}
          joursDepasses={contratExpireDecision.joursDepasses}
          onClose={onCloseDecisionModal}
          onRenouveler={onRenouveler}
          onResilier={onResilier}
        />
      )}
    </>
  );
}
