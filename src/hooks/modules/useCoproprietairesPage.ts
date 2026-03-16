/**
 * Hook pour la page Copropriétaires
 * P0#1: Migration Mock → Supabase
 *
 * Utilise les données Supabase via useCoproprietaires
 */

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCoproprietaires, type OwnerType } from './useCoproData';
import type { CoproprietaireOverview, CoproprietaireUpdate } from '@/lib/owners/api';

// ============================================================================
// TYPES (compatibilité avec l'interface existante)
// ============================================================================

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

// Mapper les données Supabase vers l'interface UI existante
function mapToCoproprietaire(data: CoproprietaireOverview): Coproprietaire {
  // Determine council function display
  let fonction: string | undefined;
  if (data.council_role) {
    switch (data.council_role) {
      case 'president':
        fonction = 'Président du CS';
        break;
      case 'secretary':
        fonction = 'Secrétaire du CS';
        break;
      case 'member':
        fonction = 'Membre du CS';
        break;
      default:
        fonction = data.council_role;
    }
  }

  return {
    id: data.id,
    nom: data.is_company ? (data.company_name || '') : (data.last_name || ''),
    prenom: data.is_company ? '' : (data.first_name || ''),
    fonction,
    solde: data.solde || 0,
    telephone: data.mobile || data.phone || undefined,
    email: data.email || '',
    type: data.owner_type === 'ANCIEN' ? 'ANCIEN' : 'COPROPRIETAIRE',
  };
}

// Mapper les données UI vers l'update Supabase
function mapToUpdate(form: Partial<Coproprietaire>): CoproprietaireUpdate {
  return {
    last_name: form.nom,
    first_name: form.prenom,
    mobile: form.telephone,
    email: form.email,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useCoproprietairesPage() {
  // Active tab: COPROPRIETAIRE, LOCATAIRE, ANCIEN
  // Note: LOCATAIRE n'existe pas dans Supabase actuellement, on l'affiche vide
  const [activeTab, setActiveTab] = useState<'COPROPRIETAIRE' | 'LOCATAIRE' | 'ANCIEN'>('COPROPRIETAIRE');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [editingCopro, setEditingCopro] = useState<Coproprietaire | null>(null);
  const [editForm, setEditForm] = useState<Partial<Coproprietaire>>({});
  const [isSaving, setIsSaving] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Fetch data based on active tab
  const supabaseType: OwnerType = activeTab === 'LOCATAIRE' ? 'ALL' : activeTab;
  const { coproprietaires: rawData, isLoading, error, refresh, update, archive } = useCoproprietaires({
    type: supabaseType,
  });

  // Map Supabase data to UI format
  const mappedData = useMemo(() => {
    return rawData.map(mapToCoproprietaire);
  }, [rawData]);

  // Filter by tab and search
  const getDataForTab = useCallback((): Coproprietaire[] => {
    // LOCATAIRE tab: currently not supported in DB, return empty
    if (activeTab === 'LOCATAIRE') {
      return [];
    }
    return mappedData.filter(c => c.type === activeTab);
  }, [activeTab, mappedData]);

  const filteredData = useMemo(() => {
    const data = getDataForTab();
    if (!searchQuery) return data;

    const search = searchQuery.toLowerCase();
    return data.filter(copro => {
      const fullName = `${copro.prenom} ${copro.nom}`.toLowerCase();
      return (
        fullName.includes(search) ||
        copro.email.toLowerCase().includes(search) ||
        (copro.telephone && copro.telephone.includes(search))
      );
    });
  }, [getDataForTab, searchQuery]);

  // Menu position effect
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

  // Handlers
  const handleTabChange = useCallback((tab: 'COPROPRIETAIRE' | 'LOCATAIRE' | 'ANCIEN') => {
    setActiveTab(tab);
    setOpenMenuId(null);
    setMenuPosition(null);
  }, []);

  const handleEdit = useCallback((copro: Coproprietaire) => {
    setEditingCopro(copro);
    setEditForm({
      nom: copro.nom,
      prenom: copro.prenom,
      fonction: copro.fonction,
      telephone: copro.telephone,
      email: copro.email,
    });
    setOpenMenuId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingCopro) return;

    setIsSaving(true);
    const updateData = mapToUpdate(editForm);
    const { success, error: saveError } = await update(editingCopro.id, updateData);
    setIsSaving(false);

    if (!success) {
      alert(`Erreur lors de la sauvegarde: ${saveError}`);
      return;
    }

    setEditingCopro(null);
    setEditForm({});
  }, [editingCopro, editForm, update]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce copropriétaire ? Il sera marqué comme ancien copropriétaire.')) {
      return;
    }

    const { success, error: deleteError } = await archive(id);

    if (!success) {
      alert(`Erreur lors de l'archivage: ${deleteError}`);
      return;
    }

    setOpenMenuId(null);
  }, [archive]);

  return {
    // State
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

    // Handlers
    handleEdit,
    handleSave,
    handleDelete,
    getDataForTab,

    // Supabase state
    isLoading,
    error,
    refresh,
    isSaving,
  };
}
