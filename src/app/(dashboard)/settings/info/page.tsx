'use client';

import { useInfoCoproPage } from '@/features/settings/info/hooks';
import {
  PageHeader,
  ClesRepartitionSection,
  LotsSection,
  GlobalActions,
} from '@/features/settings/info/components';
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

  return (
    <div className="container">
      <PageHeader />

      <div className={styles.content}>
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
