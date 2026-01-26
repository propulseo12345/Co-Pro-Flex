'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  MailOnglet,
  MailFiltres,
  BrouillonData,
  PieceJointeMail,
  MailHistorique,
  joursRestantsCorbeille,
} from '@/types/models/mail';
import { mailService } from '@/lib/services/mail.service';
import { useDebounce } from '@/hooks/useDebounce';

interface UseMailOptions {
  coproprieteId?: string;
  ongletInitial?: MailOnglet;
  autoPurge?: boolean;
}

interface UseMailReturn {
  // État
  mails: Mail[];
  mailsCorbeille: Mail[];
  isLoading: boolean;
  error: string | null;

  // Filtres
  filtres: MailFiltres;
  setFiltres: (f: Partial<MailFiltres>) => void;
  setOnglet: (onglet: MailOnglet) => void;
  setRecherche: (recherche: string) => void;

  // Stats
  stats: {
    inbox: number;
    inboxNonLus: number;
    sent: number;
    drafts: number;
    trash: number;
  };

  // Actions
  envoyerMail: (id: string) => Promise<boolean>;
  sauvegarderBrouillon: (data: BrouillonData) => Promise<Mail | null>;
  supprimerMail: (id: string) => Promise<boolean>;
  supprimerPlusieurs: (ids: string[]) => Promise<number>;
  restaurerMail: (id: string) => Promise<boolean>;
  restaurerPlusieurs: (ids: string[]) => Promise<number>;
  supprimerDefinitivement: (id: string) => Promise<boolean>;
  supprimerDefinitivementPlusieurs: (ids: string[]) => Promise<number>;
  viderCorbeille: () => Promise<number>;

  // PJ
  ajouterPJ: (mailId: string, file: File) => Promise<PieceJointeMail | null>;
  supprimerPJ: (mailId: string, pjId: string) => Promise<boolean>;
  telechargerPJ: (pj: PieceJointeMail) => void;
  telechargerToutesPJ: (mail: Mail) => void;

  // Lecture
  marquerCommeLu: (id: string) => void;
  marquerCommeNonLu: (id: string) => void;

  // Historique
  getHistorique: (mailId: string) => MailHistorique[];

  // Utilitaires
  getMailById: (id: string) => Mail | null;
  joursRestantsCorbeille: (dateSuppression: string) => number;
  refresh: () => void;
  clearError: () => void;
}

const DEFAULT_FILTRES: MailFiltres = {
  onglet: 'inbox',
  recherche: '',
};

export function useMail(options: UseMailOptions = {}): UseMailReturn {
  const { coproprieteId = 'copro-1', ongletInitial = 'inbox', autoPurge = true } = options;

  // État
  const [mails, setMails] = useState<Mail[]>([]);
  const [mailsCorbeille, setMailsCorbeille] = useState<Mail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtres, setFiltresState] = useState<MailFiltres>({
    ...DEFAULT_FILTRES,
    onglet: ongletInitial,
  });

  // Debounce recherche
  const rechercheDebouncee = useDebounce(filtres.recherche, 300);

  // Stats
  const [stats, setStats] = useState({
    inbox: 0,
    inboxNonLus: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
  });

  // Charger les mails
  const loadMails = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      const filtresAvecDebounce = { ...filtres, recherche: rechercheDebouncee };
      const mailsLoaded = mailService.getMails(coproprieteId, filtresAvecDebounce);
      const corbeilleLoaded = mailService.getMailsCorbeille(coproprieteId);
      const statsLoaded = mailService.getStats(coproprieteId);

      setMails(mailsLoaded);
      setMailsCorbeille(corbeilleLoaded);
      setStats(statsLoaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des mails');
    } finally {
      setIsLoading(false);
    }
  }, [coproprieteId, filtres.onglet, rechercheDebouncee]);

  // Effet initial + purge auto
  useEffect(() => {
    if (autoPurge) {
      const purged = mailService.purgerMailsExpires(coproprieteId);
      if (purged > 0) {
        console.log(`[Mail] ${purged} mail(s) purgé(s) automatiquement`);
      }
    }
    loadMails();
  }, [loadMails, autoPurge, coproprieteId]);

  // Filtres
  const setFiltres = useCallback((newFiltres: Partial<MailFiltres>) => {
    setFiltresState((prev) => ({ ...prev, ...newFiltres }));
  }, []);

  const setOnglet = useCallback((onglet: MailOnglet) => {
    setFiltres({ onglet });
  }, [setFiltres]);

  const setRecherche = useCallback((recherche: string) => {
    setFiltres({ recherche });
  }, [setFiltres]);

  // Actions
  const envoyerMail = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = mailService.envoyerMail(id);
      if (result) {
        loadMails();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      return false;
    }
  }, [loadMails]);

  const sauvegarderBrouillon = useCallback(async (data: BrouillonData): Promise<Mail | null> => {
    try {
      setError(null);
      let mail: Mail | null;

      if (data.id) {
        mail = mailService.updateMail(data.id, data);
      } else {
        mail = mailService.createMail(data, coproprieteId);
      }

      loadMails();
      return mail;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      return null;
    }
  }, [coproprieteId, loadMails]);

  const supprimerMail = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = mailService.supprimerMail(id);
      if (result) {
        loadMails();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }, [loadMails]);

  const supprimerPlusieurs = useCallback(async (ids: string[]): Promise<number> => {
    try {
      setError(null);
      let count = 0;
      for (const id of ids) {
        if (mailService.supprimerMail(id)) count++;
      }
      loadMails();
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return 0;
    }
  }, [loadMails]);

  const restaurerMail = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = mailService.restaurerMail(id);
      if (result) {
        loadMails();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
      return false;
    }
  }, [loadMails]);

  const restaurerPlusieurs = useCallback(async (ids: string[]): Promise<number> => {
    try {
      setError(null);
      let count = 0;
      for (const id of ids) {
        if (mailService.restaurerMail(id)) count++;
      }
      loadMails();
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
      return 0;
    }
  }, [loadMails]);

  const supprimerDefinitivement = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = mailService.supprimerDefinitivement(id);
      if (result) {
        loadMails();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression définitive');
      return false;
    }
  }, [loadMails]);

  const supprimerDefinitivementPlusieurs = useCallback(async (ids: string[]): Promise<number> => {
    try {
      setError(null);
      let count = 0;
      for (const id of ids) {
        if (mailService.supprimerDefinitivement(id)) count++;
      }
      loadMails();
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression définitive');
      return 0;
    }
  }, [loadMails]);

  const viderCorbeille = useCallback(async (): Promise<number> => {
    try {
      setError(null);
      const count = mailService.viderCorbeille(coproprieteId);
      loadMails();
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du vidage de la corbeille');
      return 0;
    }
  }, [coproprieteId, loadMails]);

  // Pièces jointes
  const ajouterPJ = useCallback(async (mailId: string, file: File): Promise<PieceJointeMail | null> => {
    try {
      setError(null);
      const pj = await mailService.ajouterPJ(mailId, file);
      loadMails();
      return pj;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout de la pièce jointe");
      return null;
    }
  }, [loadMails]);

  const supprimerPJ = useCallback(async (mailId: string, pjId: string): Promise<boolean> => {
    try {
      setError(null);
      const result = mailService.supprimerPJ(mailId, pjId);
      loadMails();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la pièce jointe');
      return false;
    }
  }, [loadMails]);

  const telechargerPJ = useCallback((pj: PieceJointeMail) => {
    mailService.telechargerPJ(pj);
  }, []);

  const telechargerToutesPJ = useCallback((mail: Mail) => {
    mailService.telechargerToutesPJ(mail);
  }, []);

  // Lecture
  const marquerCommeLu = useCallback((id: string) => {
    mailService.marquerCommeLu(id);
    loadMails();
  }, [loadMails]);

  const marquerCommeNonLu = useCallback((id: string) => {
    mailService.marquerCommeNonLu(id);
    loadMails();
  }, [loadMails]);

  // Historique
  const getHistorique = useCallback((mailId: string): MailHistorique[] => {
    return mailService.getHistorique(mailId);
  }, []);

  // Utilitaires
  const getMailById = useCallback((id: string): Mail | null => {
    return mailService.getMailById(id);
  }, []);

  const refresh = useCallback(() => {
    loadMails();
  }, [loadMails]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    mails,
    mailsCorbeille,
    isLoading,
    error,

    // Filtres
    filtres,
    setFiltres,
    setOnglet,
    setRecherche,

    // Stats
    stats,

    // Actions
    envoyerMail,
    sauvegarderBrouillon,
    supprimerMail,
    supprimerPlusieurs,
    restaurerMail,
    restaurerPlusieurs,
    supprimerDefinitivement,
    supprimerDefinitivementPlusieurs,
    viderCorbeille,

    // PJ
    ajouterPJ,
    supprimerPJ,
    telechargerPJ,
    telechargerToutesPJ,

    // Lecture
    marquerCommeLu,
    marquerCommeNonLu,

    // Historique
    getHistorique,

    // Utilitaires
    getMailById,
    joursRestantsCorbeille,
    refresh,
    clearError,
  };
}
