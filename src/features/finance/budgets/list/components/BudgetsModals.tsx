'use client';

import DocumentViewerModal from '@/ui/DocumentViewerModal';
import {
  TransferModal,
  PosteDetailModal,
  DepenseDetailModal,
  CoproprietaireALURModal,
  CreateBudgetModal,
  TransformBudgetModal,
  TravauxDetailModal,
  NouvelAppelFondsTravauxModal,
  LinkToAGModal,
} from '@/components/features/finance/Budget';
import type {
  PosteBudget,
  PosteBudgetData,
  BudgetTravaux,
  FondsALUR,
  CoproprietaireALUR,
  NouveauBudgetForm,
  NouvelAppelFondsForm,
  ResolutionAG,
} from '@/components/features/finance/Budget/types';
import type { BudgetWithStatus, BudgetN1Data } from '@/hooks/modules/useBudget';
import type { DepenseEtendue } from '@/types/models/finance';

type DetailTab = 'echeancier' | 'documents' | 'historique';

interface BudgetsModalsProps {
  // ALUR Modal
  selectedCoproprietaireALUR: CoproprietaireALUR | null;
  selectedYear: number;
  onCloseCoproprietaireALUR: () => void;

  // Transfer Modal
  showTransferModal: boolean;
  fondsALUR: FondsALUR;
  budgetsTravaux: BudgetTravaux[];
  onCloseTransferModal: () => void;
  onTransferALUR: (montant: number, destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX', budgetId?: string) => void;

  // Poste Detail Modal
  selectedPoste: PosteBudget | null;
  postesBudget: PosteBudgetData[];
  onClosePosteDetail: () => void;
  onSelectDepense: (depense: DepenseEtendue | null) => void;

  // Depense Detail Modal
  selectedDepense: DepenseEtendue | null;
  onCloseDepenseDetail: () => void;
  onViewDocument: (doc: string | null) => void;

  // Document Viewer Modal
  viewingDocument: string | null;
  onCloseDocumentViewer: () => void;

  // Create Budget Modal
  showCreateBudgetModal: boolean;
  budgetN1?: BudgetN1Data | null;
  onCreateBudget: (data: NouveauBudgetForm) => void;
  onCloseCreateBudget: () => void;

  // Transform Budget Modal
  showTransformBudgetModal: boolean;
  selectedBudgetForTransform: BudgetWithStatus | null;
  onCloseTransformBudget: () => void;
  onTransformToAppele: () => void;

  // Travaux Detail Modal
  showTravauxDetailModal: boolean;
  selectedTravauxDetail: BudgetTravaux | null;
  activeDetailTab: DetailTab;
  onDetailTabChange: (tab: DetailTab) => void;
  onCloseTravauxDetail: () => void;

  // Nouvel Appel Fonds Modal
  showNewAppelFondsModal: boolean;
  selectedTravauxForAppel: BudgetTravaux | null;
  onGenerateProchainAppel: (travauxId: string) => void;
  onCloseNewAppelFonds: () => void;

  // Link to AG Modal
  showLinkToAGModal: boolean;
  selectedBudgetForLink: BudgetWithStatus | null;
  resolutionsAG: ResolutionAG[];
  onLinkToAG: (budgetId: string, resolutionId: string) => void | Promise<boolean>;
  onCloseLinkToAG: () => void;
}

export function BudgetsModals({
  selectedCoproprietaireALUR,
  selectedYear,
  onCloseCoproprietaireALUR,
  showTransferModal,
  fondsALUR,
  budgetsTravaux,
  onCloseTransferModal,
  onTransferALUR,
  selectedPoste,
  postesBudget,
  onClosePosteDetail,
  onSelectDepense,
  selectedDepense,
  onCloseDepenseDetail,
  onViewDocument,
  viewingDocument,
  onCloseDocumentViewer,
  showCreateBudgetModal,
  budgetN1,
  onCreateBudget,
  onCloseCreateBudget,
  showTransformBudgetModal,
  selectedBudgetForTransform,
  onCloseTransformBudget,
  onTransformToAppele,
  showTravauxDetailModal,
  selectedTravauxDetail,
  activeDetailTab,
  onDetailTabChange,
  onCloseTravauxDetail,
  showNewAppelFondsModal,
  selectedTravauxForAppel,
  onGenerateProchainAppel,
  onCloseNewAppelFonds,
  showLinkToAGModal,
  selectedBudgetForLink,
  resolutionsAG,
  onLinkToAG,
  onCloseLinkToAG,
}: BudgetsModalsProps) {
  return (
    <>
      {selectedCoproprietaireALUR && (
        <CoproprietaireALURModal
          selectedCoproprietaire={selectedCoproprietaireALUR}
          selectedYear={selectedYear}
          onClose={onCloseCoproprietaireALUR}
        />
      )}

      {showTransferModal && (
        <TransferModal
          fondsALUR={fondsALUR}
          budgetsTravaux={budgetsTravaux}
          onClose={onCloseTransferModal}
          onTransfer={onTransferALUR}
        />
      )}

      {selectedPoste && (
        <PosteDetailModal
          selectedPoste={selectedPoste}
          postesBudget={postesBudget}
          onClose={onClosePosteDetail}
          onSelectDepense={onSelectDepense}
        />
      )}

      {selectedDepense && (
        <DepenseDetailModal
          selectedDepense={selectedDepense}
          postesBudget={postesBudget}
          onClose={onCloseDepenseDetail}
          onViewDocument={onViewDocument}
        />
      )}

      {viewingDocument && (
        <DocumentViewerModal
          document={{
            id: 'temp-doc',
            nom: viewingDocument,
            type: viewingDocument.toLowerCase().endsWith('.pdf') ? 'PDF' : 'AUTRE',
            categorie: 'FACTURE',
            dateAjout: new Date().toISOString(),
            taille: '1.2 Mo',
          }}
          onClose={onCloseDocumentViewer}
        />
      )}

      {showCreateBudgetModal && (
        <CreateBudgetModal
          selectedYear={selectedYear}
          budgetN1={budgetN1 ?? undefined}
          onCreateBudget={onCreateBudget}
          onClose={onCloseCreateBudget}
        />
      )}

      {showTransformBudgetModal && selectedBudgetForTransform && (
        <TransformBudgetModal
          budget={selectedBudgetForTransform}
          onClose={onCloseTransformBudget}
          onTransform={onTransformToAppele}
        />
      )}

      {showTravauxDetailModal && selectedTravauxDetail && (
        <TravauxDetailModal
          travaux={selectedTravauxDetail}
          activeTab={activeDetailTab}
          onTabChange={onDetailTabChange}
          onClose={onCloseTravauxDetail}
        />
      )}

      {showNewAppelFondsModal && selectedTravauxForAppel && (
        <NouvelAppelFondsTravauxModal
          travaux={selectedTravauxForAppel}
          onGenerateAppel={onGenerateProchainAppel}
          onClose={onCloseNewAppelFonds}
        />
      )}

      {showLinkToAGModal && selectedBudgetForLink && (
        <LinkToAGModal
          budget={selectedBudgetForLink}
          availableResolutions={resolutionsAG}
          onLink={onLinkToAG}
          onClose={onCloseLinkToAG}
        />
      )}
    </>
  );
}
