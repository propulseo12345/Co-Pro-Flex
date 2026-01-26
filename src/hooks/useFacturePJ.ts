'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  PJFacture,
  UploadPJData,
  validateFile,
  validateUrl,
  generatePJId,
} from '@/components/features/finance/Factures/types';
import { facturePJService } from '@/lib/services/facture-pj.service';

interface UseFacturePJOptions {
  factureId?: string;
  initialPJ?: PJFacture[];
}

interface UseFacturePJReturn {
  piecesJointes: PJFacture[];
  isLoading: boolean;
  error: string | null;
  uploadFichier: (file: File, estPrincipale?: boolean) => Promise<boolean>;
  ajouterLienExterne: (url: string, nom?: string, estPrincipale?: boolean) => Promise<boolean>;
  supprimerPJ: (pjId: string) => Promise<boolean>;
  definirPrincipale: (pjId: string) => Promise<boolean>;
  renommerPJ: (pjId: string, nouveauNom: string) => Promise<boolean>;
  validerFichier: (file: File) => { valid: boolean; error?: string };
  validerUrl: (url: string) => { valid: boolean; error?: string };
  hasUnsavedChanges: boolean;
  getPJPrincipale: () => PJFacture | null;
  clearError: () => void;
}

/**
 * Hook pour gérer les pièces jointes d'une facture
 */
export function useFacturePJ({
  factureId,
  initialPJ = [],
}: UseFacturePJOptions = {}): UseFacturePJReturn {
  const [piecesJointes, setPiecesJointes] = useState<PJFacture[]>(initialPJ);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Charger les PJ existantes si factureId est fourni
  useEffect(() => {
    if (factureId) {
      setIsLoading(true);
      facturePJService
        .getPJParFacture(factureId)
        .then((pj) => {
          setPiecesJointes(pj);
        })
        .catch(() => {
          setError('Erreur lors du chargement des pièces jointes');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [factureId]);

  /**
   * Upload un fichier
   */
  const uploadFichier = useCallback(
    async (file: File, estPrincipale = false): Promise<boolean> => {
      setError(null);
      setIsLoading(true);

      try {
        // Valider d'abord
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(validation.error || 'Fichier invalide');
          return false;
        }

        // Si factureId existe, utiliser le service
        if (factureId) {
          const result = await facturePJService.uploadFichier(factureId, {
            file,
            estPrincipale,
          });

          if (!result.success) {
            setError(result.error || 'Erreur lors de l\'upload');
            return false;
          }

          if (result.pj) {
            setPiecesJointes((prev) => {
              // Si c'est la principale, retirer le flag des autres
              const updated = estPrincipale
                ? prev.map((p) => ({ ...p, estPrincipale: false }))
                : prev;
              return [...updated, result.pj!];
            });
          }
        } else {
          // Mode création: stocker localement sans service
          const nouvellePJ: PJFacture = {
            id: generatePJId(),
            type: 'FICHIER',
            nom: file.name,
            url: URL.createObjectURL(file),
            mimeType: file.type,
            taille: file.size,
            dateAjout: new Date().toISOString(),
            estPrincipale,
          };

          setPiecesJointes((prev) => {
            const updated = estPrincipale
              ? prev.map((p) => ({ ...p, estPrincipale: false }))
              : prev;
            return [...updated, nouvellePJ];
          });
          setHasUnsavedChanges(true);
        }

        return true;
      } catch {
        setError('Erreur lors de l\'upload du fichier');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [factureId]
  );

  /**
   * Ajoute un lien externe
   */
  const ajouterLienExterne = useCallback(
    async (url: string, nom?: string, estPrincipale = false): Promise<boolean> => {
      setError(null);
      setIsLoading(true);

      try {
        // Valider d'abord
        const validation = validateUrl(url);
        if (!validation.valid) {
          setError(validation.error || 'URL invalide');
          return false;
        }

        if (factureId) {
          const result = await facturePJService.ajouterLienExterne(factureId, {
            lienExterne: url,
            nomPersonnalise: nom,
            estPrincipale,
          });

          if (!result.success) {
            setError(result.error || 'Erreur lors de l\'ajout du lien');
            return false;
          }

          if (result.pj) {
            setPiecesJointes((prev) => {
              const updated = estPrincipale
                ? prev.map((p) => ({ ...p, estPrincipale: false }))
                : prev;
              return [...updated, result.pj!];
            });
          }
        } else {
          // Mode création
          const nouvellePJ: PJFacture = {
            id: generatePJId(),
            type: 'LIEN_EXTERNE',
            nom: nom || url,
            url,
            dateAjout: new Date().toISOString(),
            estPrincipale,
          };

          setPiecesJointes((prev) => {
            const updated = estPrincipale
              ? prev.map((p) => ({ ...p, estPrincipale: false }))
              : prev;
            return [...updated, nouvellePJ];
          });
          setHasUnsavedChanges(true);
        }

        return true;
      } catch {
        setError('Erreur lors de l\'ajout du lien');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [factureId]
  );

  /**
   * Supprime une PJ
   */
  const supprimerPJ = useCallback(
    async (pjId: string): Promise<boolean> => {
      setError(null);

      try {
        const pj = piecesJointes.find((p) => p.id === pjId);
        if (!pj) return false;

        // Révoquer l'URL blob si nécessaire
        if (pj.type === 'FICHIER' && pj.url.startsWith('blob:')) {
          URL.revokeObjectURL(pj.url);
        }

        if (factureId) {
          await facturePJService.supprimerPJ(pjId);
        }

        setPiecesJointes((prev) => prev.filter((p) => p.id !== pjId));
        setHasUnsavedChanges(true);

        return true;
      } catch {
        setError('Erreur lors de la suppression');
        return false;
      }
    },
    [factureId, piecesJointes]
  );

  /**
   * Définit une PJ comme principale
   */
  const definirPrincipale = useCallback(
    async (pjId: string): Promise<boolean> => {
      setError(null);

      try {
        if (factureId) {
          await facturePJService.definirPrincipale(factureId, pjId);
        }

        setPiecesJointes((prev) =>
          prev.map((p) => ({
            ...p,
            estPrincipale: p.id === pjId,
          }))
        );
        setHasUnsavedChanges(true);

        return true;
      } catch {
        setError('Erreur lors de la modification');
        return false;
      }
    },
    [factureId]
  );

  /**
   * Renomme une PJ
   */
  const renommerPJ = useCallback(
    async (pjId: string, nouveauNom: string): Promise<boolean> => {
      setError(null);

      if (!nouveauNom.trim()) {
        setError('Le nom ne peut pas être vide');
        return false;
      }

      try {
        if (factureId) {
          await facturePJService.renommerPJ(pjId, nouveauNom);
        }

        setPiecesJointes((prev) =>
          prev.map((p) => (p.id === pjId ? { ...p, nom: nouveauNom } : p))
        );
        setHasUnsavedChanges(true);

        return true;
      } catch {
        setError('Erreur lors du renommage');
        return false;
      }
    },
    [factureId]
  );

  /**
   * Valide un fichier
   */
  const validerFichier = useCallback((file: File) => {
    return validateFile(file);
  }, []);

  /**
   * Valide une URL
   */
  const validerUrl = useCallback((url: string) => {
    return validateUrl(url);
  }, []);

  /**
   * Retourne la PJ principale
   */
  const getPJPrincipale = useCallback((): PJFacture | null => {
    return piecesJointes.find((p) => p.estPrincipale) || piecesJointes[0] || null;
  }, [piecesJointes]);

  /**
   * Efface l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    piecesJointes,
    isLoading,
    error,
    uploadFichier,
    ajouterLienExterne,
    supprimerPJ,
    definirPrincipale,
    renommerPJ,
    validerFichier,
    validerUrl,
    hasUnsavedChanges,
    getPJPrincipale,
    clearError,
  };
}
