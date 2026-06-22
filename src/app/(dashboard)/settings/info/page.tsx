'use client';

import { useInfoCoproPage } from '@/features/settings/info/hooks';
import {
  PageHeader,
  ClesRepartitionSection,
  LotsSection,
  GlobalActions,
} from '@/features/settings/info/components';
import { useCopro } from '@/providers/CoproContext';
import { useBuildings } from '@/hooks/modules/useBuildings';
import { BuildingsManager } from '@/components/features/lots';
import styles from './info.module.css';

export default function InfoCoproPage() {
  const {
    lots,
    clesRepartition,
    coproprietaires,
    nouvelleCle,
    showAddLot,
    lotEnEdition,
    ajouterLot,
    supprimerLot,
    modifierLot,
    sauvegarderLot,
    annulerEdition,
    setLotEnEdition,
    ajouterCleRepartition,
    showNouvelleCleForm,
    hideNouvelleCleForm,
    updateNouvelleCleNom,
    getCoproprietaireNom,
  } = useInfoCoproPage();

  const { currentCoproId } = useCopro();
  const {
    buildings,
    isMutating: buildingsMutating,
    create: createBuilding,
    remove: removeBuilding,
  } = useBuildings(currentCoproId ?? '');

  return (
    <div className="container">
      <PageHeader />

      <div className={styles.content}>
        <BuildingsManager
          buildings={buildings.map(b => ({ id: b.id, name: b.name, floors_count: b.floors_count }))}
          isMutating={buildingsMutating}
          onCreate={createBuilding}
          onDelete={removeBuilding}
        />

        <ClesRepartitionSection
          clesRepartition={clesRepartition}
          nouvelleCle={nouvelleCle}
          onShowForm={showNouvelleCleForm}
          onHideForm={hideNouvelleCleForm}
          onUpdateNom={updateNouvelleCleNom}
          onAjouter={ajouterCleRepartition}
        />

        <LotsSection
          lots={lots}
          coproprietaires={coproprietaires}
          clesRepartition={clesRepartition}
          showAddLot={showAddLot}
          lotEnEdition={lotEnEdition}
          getCoproprietaireNom={getCoproprietaireNom}
          onAjouterLot={ajouterLot}
          onModifierLot={modifierLot}
          onSupprimerLot={supprimerLot}
          onSauvegarderLot={sauvegarderLot}
          onAnnulerEdition={annulerEdition}
          onLotEnEditionChange={setLotEnEdition}
        />

        <GlobalActions />
      </div>
    </div>
  );
}
