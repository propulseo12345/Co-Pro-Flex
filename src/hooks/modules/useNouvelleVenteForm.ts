import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVentes } from './useVentes';

export interface NouvelleVenteFormData {
  lotId: string;
  lotType: 'appartement' | 'cave' | 'parking' | 'studio' | 'local_commercial' | '';
  vendeurId: string;
  acquereurId: string;
  acquereurNom: string;
  acquereurEmail: string;
  acquereurTelephone: string;
  acquereurAdresse: string;
  notaireId: string;
  notaireNom: string;
  notaireEmail: string;
  notaireTelephone: string;
  notaireAdresse: string;
  dateCompromis: string;
  dateActeAuthentique: string;
  dateNotificationArticle6: string;
  observations: string;
  ordresService: string[];
  notesInternes: string;
  documentsAGenerer: string[];
}

const INITIAL_FORM_DATA: NouvelleVenteFormData = {
  lotId: '',
  lotType: '',
  vendeurId: '',
  acquereurId: '',
  acquereurNom: '',
  acquereurEmail: '',
  acquereurTelephone: '',
  acquereurAdresse: '',
  notaireId: '',
  notaireNom: '',
  notaireEmail: '',
  notaireTelephone: '',
  notaireAdresse: '',
  dateCompromis: '',
  dateActeAuthentique: '',
  dateNotificationArticle6: '',
  observations: '',
  ordresService: [],
  notesInternes: '',
  documentsAGenerer: ['pre_etat_date', 'etat_date', 'certificat_art20']
};

export function useNouvelleVenteForm() {
  const router = useRouter();
  const { createVente } = useVentes();

  const [formData, setFormData] = useState<NouvelleVenteFormData>(INITIAL_FORM_DATA);
  const [acquereurMode, setAcquereurMode] = useState<'selection' | 'saisie'>('saisie');
  const [notaireMode, setNotaireMode] = useState<'selection' | 'saisie'>('selection');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    documents: true,
    ordresService: false
  });

  const updateFormData = useCallback((updates: Partial<NouvelleVenteFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleSection = useCallback((section: 'documents' | 'ordresService') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const toggleDocument = useCallback((docId: string, isObligatoire: boolean) => {
    if (isObligatoire) return;
    setFormData(prev => ({
      ...prev,
      documentsAGenerer: prev.documentsAGenerer.includes(docId)
        ? prev.documentsAGenerer.filter(id => id !== docId)
        : [...prev.documentsAGenerer, docId]
    }));
  }, []);

  const toggleOrdreService = useCallback((osId: string) => {
    setFormData(prev => ({
      ...prev,
      ordresService: prev.ordresService.includes(osId)
        ? prev.ordresService.filter(id => id !== osId)
        : [...prev.ordresService, osId]
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.lotId) newErrors.lotId = 'Le lot est obligatoire';
    if (!formData.vendeurId) newErrors.vendeurId = 'Le vendeur est obligatoire';
    if (!formData.dateCompromis) newErrors.dateCompromis = 'La date de compromis est obligatoire';

    if (acquereurMode === 'saisie') {
      if (!formData.acquereurNom) newErrors.acquereurNom = 'Le nom de l\'acquéreur est obligatoire';
    } else {
      if (!formData.acquereurId) newErrors.acquereurId = 'L\'acquéreur est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, acquereurMode]);

  const handlePreSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  }, [validateForm]);

  const handleConfirmSubmit = useCallback(async (
    getLotInfo: () => { type: string } | null,
    getVendeurInfo: () => { nom: string } | null,
    getCoproprietaires: () => { id: string; nom: string }[]
  ) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lot = getLotInfo();
    const vendeur = getVendeurInfo();
    const acquereurNom = acquereurMode === 'saisie'
      ? formData.acquereurNom
      : getCoproprietaires().find(c => c.id === formData.acquereurId)?.nom;

    createVente({
      lotIds: [formData.lotId],
      lotTypes: lot ? [lot.type.charAt(0).toUpperCase() + lot.type.slice(1)] : [],
      vendeur: vendeur?.nom || '',
      vendeurId: formData.vendeurId,
      acquereur: acquereurNom,
      acquereurId: acquereurMode === 'selection' ? formData.acquereurId : undefined,
      notaire: formData.notaireNom || undefined,
      dateCompromis: formData.dateCompromis || undefined,
      observations: formData.observations || undefined,
    });

    setIsSubmitting(false);
    setSubmitSuccess(true);

    setTimeout(() => {
      router.push('/ventes-impayes/ventes');
    }, 2000);
  }, [formData, acquereurMode, createVente, router]);

  return {
    formData,
    updateFormData,
    acquereurMode,
    setAcquereurMode,
    notaireMode,
    setNotaireMode,
    errors,
    showConfirmModal,
    setShowConfirmModal,
    isSubmitting,
    submitSuccess,
    expandedSections,
    toggleSection,
    toggleDocument,
    toggleOrdreService,
    validateForm,
    handlePreSubmit,
    handleConfirmSubmit,
  };
}

export const formatLotType = (type: string) => {
  const types: Record<string, string> = {
    'appartement': 'Appartement',
    'cave': 'Cave',
    'parking': 'Parking',
    'studio': 'Studio',
    'local_commercial': 'Local commercial'
  };
  return types[type] || type;
};
