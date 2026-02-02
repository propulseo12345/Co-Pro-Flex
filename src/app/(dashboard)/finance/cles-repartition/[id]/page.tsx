'use client';

import { useParams } from 'next/navigation';
import {
  useCleDetailPage,
  CleDetailHeader,
  GeneralInfoCard,
  LotsWeightsCard,
  ValidationCard,
  SimulationCard,
} from '@/features/finance';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import styles from './cle-detail.module.css';

export default function CleDetailPage() {
  const params = useParams();
  const page = useCleDetailPage(params.id as string);

  if (!page.currentCoproId || page.isLoading) {
    return (
      <div className={styles.container}>
        <LoadingState message="Chargement de la cle de repartition..." />
      </div>
    );
  }

  if (page.error || !page.cle) {
    return (
      <div className={styles.container}>
        <ErrorState
          message={page.error || 'Cle de repartition non trouvee'}
          onRetry={page.goBack}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CleDetailHeader
        cleNom={page.cle.nom}
        showSimulation={page.showSimulation}
        isManager={page.isManager}
        isSaving={page.isSaving}
        hasChanges={page.hasChanges}
        onBack={page.goBack}
        onToggleSimulation={page.toggleSimulation}
        onSave={page.handleSave}
      />

      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <GeneralInfoCard
            nom={page.nom}
            code={page.code}
            type={page.type}
            description={page.description}
            isManager={page.isManager}
            onNomChange={page.handleNomChange}
            onCodeChange={page.handleCodeChange}
            onTypeChange={page.handleTypeChange}
            onDescriptionChange={page.handleDescriptionChange}
          />

          <LotsWeightsCard
            lotsData={page.lotsData}
            tantiemesEdits={page.tantiemesEdits}
            calculatedTotal={page.calculatedTotal}
            isManager={page.isManager}
            onTantiemesChange={page.handleTantiemesChange}
          />
        </div>

        <div className={styles.sidePanel}>
          <ValidationCard validation={page.validation} />

          <SimulationCard
            showSimulation={page.showSimulation}
            simulationMontant={page.simulationMontant}
            simulationResult={page.simulationResult}
            onMontantChange={page.setSimulationMontant}
          />
        </div>
      </div>
    </div>
  );
}
