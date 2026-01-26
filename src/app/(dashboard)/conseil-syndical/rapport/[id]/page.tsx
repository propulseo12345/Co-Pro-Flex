'use client';

import { useParams } from 'next/navigation';
import { useRapportCS } from '@/hooks/modules/useRapportCS';
import { RapportHeader, RapportEditor, RapportSidebar } from '@/components/features/conseil-syndical';
import styles from '@/components/features/conseil-syndical/RapportCS.module.css';

export default function RapportCSDetailPage() {
  const params = useParams();
  const rapportId = params.id as string;

  const {
    rapport,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
    updateTitre,
    updateIntroduction,
    updateContenu,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    addAnnexe,
    deleteAnnexe,
    soumettrePourRevision,
    publier,
    save,
    genererTexteResolution,
  } = useRapportCS({ rapportId });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        Chargement du rapport...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Erreur</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!rapport) {
    return (
      <div className={styles.notFound}>
        Rapport non trouvé. Ce rapport n&apos;existe pas ou vous n&apos;avez pas les droits pour y accéder.
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <RapportHeader
        rapport={rapport}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={save}
        onSoumettre={soumettrePourRevision}
      />

      <div className={styles.pageContent}>
        <main className={styles.mainContent}>
          <RapportEditor
            rapport={rapport}
            onUpdateTitre={updateTitre}
            onUpdateIntroduction={updateIntroduction}
            onUpdateContenu={updateContenu}
            onAddSection={addSection}
            onUpdateSection={updateSection}
            onDeleteSection={deleteSection}
            onReorderSections={reorderSections}
          />
        </main>

        <aside className={styles.sidebar}>
          <RapportSidebar
            rapport={rapport}
            onAddAnnexe={addAnnexe}
            onDeleteAnnexe={deleteAnnexe}
            onPublier={publier}
            texteResolution={genererTexteResolution()}
          />
        </aside>
      </div>
    </div>
  );
}
