'use client';

import { useState, useCallback } from 'react';
import { piecesJustificativesService } from '@/lib/services/pieces-justificatives.service';
import {
  PieceJustificative,
  RoleAccesPJ,
  getDroitsAccesPJ,
  estImage,
  estPDF,
} from '@/types/models/piece-justificative';

interface UsePieceJustificativeOptions {
  role?: RoleAccesPJ;
}

interface UsePieceJustificativeReturn {
  // État
  isLoading: boolean;
  selectedPiece: PieceJustificative | null;
  isModalOpen: boolean;
  error: Error | null;

  // Actions
  ouvrirPiece: (piece: PieceJustificative) => void;
  fermerModal: () => void;
  telechargerPiece: (piece: PieceJustificative) => void;
  ouvrirDansNouvelOnglet: (piece: PieceJustificative) => void;

  // Droits
  peutVoir: (piece: PieceJustificative) => boolean;
  peutTelecharger: (piece: PieceJustificative) => boolean;

  // Helpers
  estImagePiece: (piece: PieceJustificative) => boolean;
  estPDFPiece: (piece: PieceJustificative) => boolean;
}

export function usePieceJustificative({
  role = 'coproprietaire',
}: UsePieceJustificativeOptions = {}): UsePieceJustificativeReturn {
  const [isLoading] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<PieceJustificative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Ouvrir une pièce dans la modal
  const ouvrirPiece = useCallback(
    (piece: PieceJustificative) => {
      if (!piecesJustificativesService.peutVoirPiece(piece, role)) {
        setError(new Error("Vous n'avez pas accès à cette pièce justificative"));
        return;
      }

      setSelectedPiece(piece);
      setIsModalOpen(true);
      setError(null);
    },
    [role]
  );

  // Fermer la modal
  const fermerModal = useCallback(() => {
    setIsModalOpen(false);
    // Petit délai avant de reset pour l'animation
    setTimeout(() => setSelectedPiece(null), 200);
  }, []);

  // Télécharger une pièce
  const telechargerPiece = useCallback(
    (piece: PieceJustificative) => {
      if (!piecesJustificativesService.peutTelechargerPiece(piece, role)) {
        setError(new Error('Vous ne pouvez pas télécharger cette pièce'));
        return;
      }

      const url = piecesJustificativesService.getUrlTelechargement(piece);

      // Créer un lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = piece.nomFichier;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [role]
  );

  // Ouvrir dans un nouvel onglet
  const ouvrirDansNouvelOnglet = useCallback(
    (piece: PieceJustificative) => {
      if (!piecesJustificativesService.peutVoirPiece(piece, role)) {
        setError(new Error("Vous n'avez pas accès à cette pièce"));
        return;
      }

      const url = piecesJustificativesService.getUrlVisualisation(piece);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [role]
  );

  // Vérification des droits
  const peutVoir = useCallback(
    (piece: PieceJustificative) => {
      return piecesJustificativesService.peutVoirPiece(piece, role);
    },
    [role]
  );

  const peutTelecharger = useCallback(
    (piece: PieceJustificative) => {
      return piecesJustificativesService.peutTelechargerPiece(piece, role);
    },
    [role]
  );

  // Helpers
  const estImagePiece = useCallback((piece: PieceJustificative) => {
    return estImage(piece.format);
  }, []);

  const estPDFPiece = useCallback((piece: PieceJustificative) => {
    return estPDF(piece.format);
  }, []);

  return {
    isLoading,
    selectedPiece,
    isModalOpen,
    error,
    ouvrirPiece,
    fermerModal,
    telechargerPiece,
    ouvrirDansNouvelOnglet,
    peutVoir,
    peutTelecharger,
    estImagePiece,
    estPDFPiece,
  };
}
