'use client';

import { useParams } from 'next/navigation';
import { useRapportCS } from '@/hooks/modules/useRapportCS';
import { useSupabase } from '@/hooks/useSupabase';
import { RapportHeader, RapportEditor, RapportSidebar } from '@/components/features/conseil-syndical';
import styles from '@/components/features/conseil-syndical/RapportCS.module.css';

export default function RapportCSDetailPage() {
  const params = useParams();
  const rapportId = params.id as string;
  const { user } = useSupabase();

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
    valider,
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

  // Fatal UNIQUEMENT si le rapport n'a pas pu être chargé : un échec de
  // sauvegarde ne doit pas remplacer l'éditeur (la saisie serait perdue)
  if (error && !rapport) {
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
      {error && (
        <div className={styles.error} role="alert">
          Erreur de sauvegarde : {error.message} — vos dernières modifications ne sont peut-être pas enregistrées.
        </div>
      )}
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
            onValider={() => valider(user?.id ?? '')}
            onPublier={publier}
            texteResolution={genererTexteResolution()}
          />
        </aside>
      </div>
    </div>
  );
}
