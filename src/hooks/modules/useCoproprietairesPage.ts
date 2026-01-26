import { useState, useRef, useEffect, useCallback } from 'react';

export interface Coproprietaire {
  id: string;
  nom: string;
  prenom: string;
  fonction?: string;
  solde: number;
  telephone?: string;
  email: string;
  type: 'COPROPRIETAIRE' | 'LOCATAIRE' | 'ANCIEN';
}

export const INITIAL_COPROPRIETAIRES: Coproprietaire[] = [
  { id: '1', nom: 'DUPONT', prenom: 'Jean', fonction: 'Membre du CS', solde: -73.30, telephone: '+33 6 12 34 56 78', email: 'jean.dupont@email.fr', type: 'COPROPRIETAIRE' },
  { id: '2', nom: 'GONTCHAROV', prenom: 'François', solde: -1372.84, telephone: '+33 6 23 45 67 89', email: 'francois.gontcharov@email.fr', type: 'COPROPRIETAIRE' },
  { id: '3', nom: 'LE GUENNEC', prenom: 'Martine', solde: 106.14, telephone: '+33 6 34 56 78 90', email: 'martine.leguennec@email.fr', type: 'COPROPRIETAIRE' },
  { id: '4', nom: 'MANAN', prenom: 'Ranga', solde: 221.57, telephone: '+33 6 45 67 89 01', email: 'ranga.manan@email.fr', type: 'COPROPRIETAIRE' },
  { id: '5', nom: 'MANDRIN', prenom: 'Sandrine', solde: 407.87, telephone: '+33 6 56 78 90 12', email: 'sandrine.mandrin@email.fr', type: 'COPROPRIETAIRE' },
  { id: '6', nom: 'SCI Dvnis', prenom: '', solde: 322.84, telephone: '+33 1 23 45 67 89', email: 'contact@scidvnis.email.fr', type: 'COPROPRIETAIRE' },
  { id: '7', nom: 'SCI Gerard', prenom: '', solde: 0.00, telephone: '+33 1 34 56 78 90', email: 'contact@scigerard.email.fr', type: 'COPROPRIETAIRE' },
  { id: '8', nom: 'SCI Guillot', prenom: '', solde: -250.50, telephone: '+33 1 45 67 89 01', email: 'contact@sciguillot.email.fr', type: 'COPROPRIETAIRE' },
  { id: '9', nom: 'SLIVET', prenom: 'Mathias', solde: 150.25, telephone: '+33 6 67 89 01 23', email: 'mathias.slivet@email.fr', type: 'COPROPRIETAIRE' },
  { id: '10', nom: 'TRAORE', prenom: 'Victoire', solde: -89.75, telephone: '+33 6 78 90 12 34', email: 'victoire.traore@email.fr', type: 'COPROPRIETAIRE' },
];

const INITIAL_LOCATAIRES: Coproprietaire[] = [
  { id: 'l1', nom: 'MARTIN', prenom: 'Sophie', solde: 0, telephone: '+33 6 11 22 33 44', email: 'sophie.martin@email.fr', type: 'LOCATAIRE' },
];

const INITIAL_ANCIENS: Coproprietaire[] = [
  { id: 'a1', nom: 'DURAND', prenom: 'Pierre', solde: 0, email: 'pierre.durand@email.fr', type: 'ANCIEN' },
];

export function useCoproprietairesPage() {
  const [activeTab, setActiveTab] = useState<'COPROPRIETAIRE' | 'LOCATAIRE' | 'ANCIEN'>('COPROPRIETAIRE');
  const [searchQuery, setSearchQuery] = useState('');
  const [coproprietaires, setCoproprietaires] = useState<Coproprietaire[]>(INITIAL_COPROPRIETAIRES);
  const [locataires, setLocataires] = useState<Coproprietaire[]>(INITIAL_LOCATAIRES);
  const [anciens, setAnciens] = useState<Coproprietaire[]>(INITIAL_ANCIENS);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [editingCopro, setEditingCopro] = useState<Coproprietaire | null>(null);
  const [editForm, setEditForm] = useState<Partial<Coproprietaire>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getDataForTab = useCallback(() => {
    switch (activeTab) {
      case 'COPROPRIETAIRE': return coproprietaires;
      case 'LOCATAIRE': return locataires;
      case 'ANCIEN': return anciens;
    }
  }, [activeTab, coproprietaires, locataires, anciens]);

  const getSetDataForTab = useCallback(() => {
    switch (activeTab) {
      case 'COPROPRIETAIRE': return setCoproprietaires;
      case 'LOCATAIRE': return setLocataires;
      case 'ANCIEN': return setAnciens;
    }
  }, [activeTab]);

  useEffect(() => {
    if (openMenuId && buttonRefs.current[openMenuId]) {
      const button = buttonRefs.current[openMenuId];
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      }
    } else {
      setMenuPosition(null);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleEdit = useCallback((copro: Coproprietaire) => {
    setEditingCopro(copro);
    setEditForm({ nom: copro.nom, prenom: copro.prenom, fonction: copro.fonction, telephone: copro.telephone, email: copro.email });
    setOpenMenuId(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingCopro) return;
    const setData = getSetDataForTab();
    setData(prev => prev.map(c => c.id === editingCopro.id ? { ...c, ...editForm } : c));
    setEditingCopro(null);
    setEditForm({});
  }, [editingCopro, editForm, getSetDataForTab]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce copropriétaire ?')) return;
    const setData = getSetDataForTab();
    setData(prev => prev.filter(c => c.id !== id));
    setOpenMenuId(null);
  }, [getSetDataForTab]);

  const filteredData = getDataForTab().filter(copro => {
    const fullName = `${copro.prenom} ${copro.nom}`.toLowerCase();
    const search = searchQuery.toLowerCase();
    return fullName.includes(search) || copro.email.toLowerCase().includes(search) || (copro.telephone && copro.telephone.includes(search));
  });

  const handleTabChange = useCallback((tab: 'COPROPRIETAIRE' | 'LOCATAIRE' | 'ANCIEN') => {
    setActiveTab(tab);
    setOpenMenuId(null);
    setMenuPosition(null);
  }, []);

  return {
    activeTab,
    handleTabChange,
    searchQuery,
    setSearchQuery,
    filteredData,
    openMenuId,
    setOpenMenuId,
    menuPosition,
    menuRef,
    buttonRefs,
    editingCopro,
    setEditingCopro,
    editForm,
    setEditForm,
    handleEdit,
    handleSave,
    handleDelete,
    getDataForTab,
  };
}
