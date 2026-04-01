'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  NoteJournal,
  CategorieNote,
  PieceJointeNote,
} from '@/types/models/impaye';
// TODO: Replace with Supabase query
function getNotesJournalByImpayeId(_impayeId: number): NoteJournal[] { return []; }

interface UseJournalRecouvrementOptions {
  impayeId: number;
}

interface NouvelleNoteData {
  categorie: CategorieNote;
  contenu: string;
  important?: boolean;
  confidentiel?: boolean;
}

interface UseJournalRecouvrementReturn {
  // Données
  notes: NoteJournal[];
  isLoading: boolean;
  error: string | null;

  // Filtres
  filtreCategorie: CategorieNote | null;
  setFiltreCategorie: (categorie: CategorieNote | null) => void;
  afficherConfidentiels: boolean;
  setAfficherConfidentiels: (afficher: boolean) => void;

  // Actions
  ajouterNote: (data: NouvelleNoteData) => Promise<NoteJournal>;
  modifierNote: (id: string, contenu: string) => Promise<void>;
  supprimerNote: (id: string) => Promise<void>;
  ajouterPieceJointe: (noteId: string, fichier: File) => Promise<PieceJointeNote>;
  supprimerPieceJointe: (noteId: string, pieceId: string) => Promise<void>;

  // Statistiques
  stats: {
    total: number;
    parCategorie: Record<CategorieNote, number>;
    notesImportantes: number;
    notesConfidentielles: number;
  };
}

/**
 * Hook de gestion du journal de recouvrement pour un impayé
 */
export function useJournalRecouvrement({
  impayeId,
}: UseJournalRecouvrementOptions): UseJournalRecouvrementReturn {
  const [notes, setNotes] = useState<NoteJournal[]>(() =>
    getNotesJournalByImpayeId(impayeId)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtreCategorie, setFiltreCategorie] = useState<CategorieNote | null>(null);
  const [afficherConfidentiels, setAfficherConfidentiels] = useState(false);

  // Notes filtrées
  const notesFiltrees = useMemo(() => {
    let result = notes;

    if (filtreCategorie) {
      result = result.filter((note) => note.categorie === filtreCategorie);
    }

    if (!afficherConfidentiels) {
      result = result.filter((note) => !note.confidentiel);
    }

    // Tri par date décroissante (plus récent en premier)
    return result.sort(
      (a, b) =>
        new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
    );
  }, [notes, filtreCategorie, afficherConfidentiels]);

  // Statistiques
  const stats = useMemo(() => {
    const parCategorie = notes.reduce(
      (acc, note) => {
        acc[note.categorie] = (acc[note.categorie] || 0) + 1;
        return acc;
      },
      {} as Record<CategorieNote, number>
    );

    return {
      total: notes.length,
      parCategorie,
      notesImportantes: notes.filter((n) => n.important).length,
      notesConfidentielles: notes.filter((n) => n.confidentiel).length,
    };
  }, [notes]);

  // Ajouter une note
  const ajouterNote = useCallback(
    async (data: NouvelleNoteData): Promise<NoteJournal> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulation API - en production, appel Supabase
        await new Promise((resolve) => setTimeout(resolve, 300));

        const nouvelleNote: NoteJournal = {
          id: `note-${Date.now()}`,
          impayeId,
          categorie: data.categorie,
          contenu: data.contenu,
          auteurId: 'gest-001', // TODO: Récupérer depuis contexte utilisateur
          auteurNom: 'Claire DURAND',
          auteurRole: 'gestionnaire',
          dateCreation: new Date().toISOString(),
          piecesJointes: [],
          important: data.important ?? false,
          confidentiel: data.confidentiel ?? false,
        };

        setNotes((prev) => [nouvelleNote, ...prev]);
        return nouvelleNote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajout';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [impayeId]
  );

  // Modifier une note
  const modifierNote = useCallback(async (id: string, contenu: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                contenu,
                dateModification: new Date().toISOString(),
              }
            : note
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Supprimer une note
  const supprimerNote = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ajouter une pièce jointe
  const ajouterPieceJointe = useCallback(
    async (noteId: string, fichier: File): Promise<PieceJointeNote> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const nouvellePJ: PieceJointeNote = {
          id: `pj-${Date.now()}`,
          nom: fichier.name,
          type: fichier.type,
          taille: fichier.size,
          url: URL.createObjectURL(fichier), // Temporaire - en prod: URL Supabase
          dateUpload: new Date().toISOString(),
        };

        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  piecesJointes: [...note.piecesJointes, nouvellePJ],
                }
              : note
          )
        );

        return nouvellePJ;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Supprimer une pièce jointe
  const supprimerPieceJointe = useCallback(
    async (noteId: string, pieceId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 200));

        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  piecesJointes: note.piecesJointes.filter((pj) => pj.id !== pieceId),
                }
              : note
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    notes: notesFiltrees,
    isLoading,
    error,
    filtreCategorie,
    setFiltreCategorie,
    afficherConfidentiels,
    setAfficherConfidentiels,
    ajouterNote,
    modifierNote,
    supprimerNote,
    ajouterPieceJointe,
    supprimerPieceJointe,
    stats,
  };
}
