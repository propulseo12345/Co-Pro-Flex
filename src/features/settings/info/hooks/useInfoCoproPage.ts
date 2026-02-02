'use client';

import { useState, useCallback } from 'react';

export type TypeLot = 'APPARTEMENT' | 'STUDIO' | 'LOCAL_COMMERCIAL' | 'CAVE' | 'PARKING' | 'GARAGE' | 'MAISON' | 'LOGE';

export interface Coproprietaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

export interface Lot {
  id: string;
  numero: string;
  type: TypeLot;
  estPrincipal: boolean;
  coproprietaireId: string;
  tantiemesGeneraux: number;
  autresCles: Record<string, number>;
}

export interface CleRepartition {
  id: string;
  nom: string;
}

const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
  { id: '1', nom: 'Leblanc', prenom: 'Marie', email: 'marie.leblanc@example.fr', telephone: '04 72 11 22 33' },
  { id: '2', nom: 'Moreau', prenom: 'Pierre', email: 'pierre.moreau@example.fr', telephone: '04 72 44 55 66' },
  { id: '3', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@example.fr' },
  { id: '4', nom: 'Bernard', prenom: 'Thomas', email: 'thomas.bernard@example.fr' },
];

export const TYPES_LOT: { value: TypeLot; label: string }[] = [
  { value: 'APPARTEMENT', label: 'Appartement' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'LOCAL_COMMERCIAL', label: 'Local commercial' },
  { value: 'CAVE', label: 'Cave' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'GARAGE', label: 'Garage' },
  { value: 'MAISON', label: 'Maison' },
  { value: 'LOGE', label: 'Loge' },
];

export function useInfoCoproPage() {
  const [lots, setLots] = useState<Lot[]>([
    {
      id: '1',
      numero: 'A1',
      type: 'APPARTEMENT',
      estPrincipal: true,
      coproprietaireId: '1',
      tantiemesGeneraux: 125,
      autresCles: {}
    },
    {
      id: '2',
      numero: 'Cave 1',
      type: 'CAVE',
      estPrincipal: false,
      coproprietaireId: '1',
      tantiemesGeneraux: 5,
      autresCles: {}
    }
  ]);

  const [clesRepartition, setClesRepartition] = useState<CleRepartition[]>([
    { id: '1', nom: 'Charges generales' },
    { id: '2', nom: 'Ascenseur' }
  ]);

  const [nouvelleCle, setNouvelleCle] = useState({ nom: '', visible: false });
  const [coproprietaires] = useState<Coproprietaire[]>(MOCK_COPROPRIETAIRES);
  const [showAddLot, setShowAddLot] = useState(false);
  const [lotEnEdition, setLotEnEdition] = useState<Lot | null>(null);

  const ajouterLot = useCallback(() => {
    const nouveauLot: Lot = {
      id: Date.now().toString(),
      numero: '',
      type: 'APPARTEMENT',
      estPrincipal: false,
      coproprietaireId: coproprietaires[0]?.id || '',
      tantiemesGeneraux: 0,
      autresCles: {}
    };
    setLots([...lots, nouveauLot]);
    setLotEnEdition(nouveauLot);
    setShowAddLot(true);
  }, [lots, coproprietaires]);

  const supprimerLot = useCallback((id: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce lot ?')) {
      setLots(lots.filter(l => l.id !== id));
    }
  }, [lots]);

  const modifierLot = useCallback((lot: Lot) => {
    setLotEnEdition(lot);
    setShowAddLot(true);
  }, []);

  const sauvegarderLot = useCallback((lotModifie: Lot) => {
    setLots(lots.map(l => l.id === lotModifie.id ? lotModifie : l));
    setShowAddLot(false);
    setLotEnEdition(null);
  }, [lots]);

  const annulerEdition = useCallback(() => {
    setShowAddLot(false);
    setLotEnEdition(null);
  }, []);

  const ajouterCleRepartition = useCallback(() => {
    if (nouvelleCle.nom.trim()) {
      const nouvelleCleObj: CleRepartition = {
        id: Date.now().toString(),
        nom: nouvelleCle.nom
      };
      setClesRepartition([...clesRepartition, nouvelleCleObj]);
      setNouvelleCle({ nom: '', visible: false });
    }
  }, [nouvelleCle, clesRepartition]);

  const showNouvelleCleForm = useCallback(() => {
    setNouvelleCle({ nom: '', visible: true });
  }, []);

  const hideNouvelleCleForm = useCallback(() => {
    setNouvelleCle({ nom: '', visible: false });
  }, []);

  const updateNouvelleCleNom = useCallback((nom: string) => {
    setNouvelleCle(prev => ({ ...prev, nom }));
  }, []);

  const getCoproprietaireNom = useCallback((id: string) => {
    const copro = coproprietaires.find(c => c.id === id);
    return copro ? `${copro.prenom} ${copro.nom}` : 'Non assigne';
  }, [coproprietaires]);

  return {
    // Data
    lots,
    clesRepartition,
    coproprietaires,
    // State
    nouvelleCle,
    showAddLot,
    lotEnEdition,
    // Handlers
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
  };
}
