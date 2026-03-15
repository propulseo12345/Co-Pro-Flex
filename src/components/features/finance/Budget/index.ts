// Types
export * from './types';

// Top-level layout
export { BudgetTopBar } from './BudgetTopBar';
export { BudgetNavBar } from './BudgetNavBar';

// Mock data
export { MOCK_POSTES_BUDGET } from './mock-data';

// Components
export { BudgetHeader } from './BudgetHeader';
export { BudgetAlerts } from './BudgetAlerts';
export { BudgetSummaryCards } from './BudgetSummaryCards';
export { BudgetChart } from './BudgetChart';
export { BudgetOverviewHero } from './BudgetOverviewHero';
export { BudgetProjection } from './BudgetProjection';
export { BudgetPostesGrid } from './BudgetPostesGrid';
export { BudgetDepensesTable } from './BudgetDepensesTable';
export { BudgetStatusBadge } from './BudgetStatusBadge';
export { DepenseStatusBadge } from './DepenseStatusBadge';

// Graphique interactif
export { RepartitionChartInteractif } from './RepartitionChartInteractif';
export { FiltrePosteBadge } from './FiltrePosteBadge';

// Liste des budgets
export { BudgetCard } from './BudgetCard';
export type { BudgetCardData } from './BudgetCard';
export { BudgetsList } from './BudgetsList';

// Dépenses - sous-composants
export { InvoiceUploadSection } from './InvoiceUploadSection';
export { DepenseValidationPanel } from './DepenseValidationPanel';

// Pièces justificatives
export { PieceJustificativeCell } from './PieceJustificativeCell';
export { PieceJustificativeModal } from './PieceJustificativeModal';
export { PieceJustificativeViewer } from './PieceJustificativeViewer';

// Travaux
export { TravauxOverview } from './TravauxOverview';
export { TravauxCard } from './TravauxCard';

// ALUR
export { ALURSummary } from './ALURSummary';
export { ALURCoproTable } from './ALURCoproTable';
export { ALURTransfertHistory } from './ALURTransfertHistory';

// Éditeurs de budget
export { PosteEditor, PostesListEditor } from './PosteEditor';
export type { PosteEditorData } from './PosteEditor';
export { AddPosteDropdown } from './AddPosteDropdown';

// Modals
export {
  TransferModal,
  PosteDetailModal,
  DepenseDetailModal,
  CoproprietaireALURModal,
  CreateBudgetModal,
  BudgetEditorModal,
  TransformBudgetModal,
  TravauxDetailModal,
  LinkToAGModal,
  NouvelAppelFondsTravauxModal,
  DepenseEditorModal,
  InvoicePickerModal,
  SimulationRepartitionModal,
} from './modals';
