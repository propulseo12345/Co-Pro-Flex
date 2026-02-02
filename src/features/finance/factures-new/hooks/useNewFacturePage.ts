'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type StatutFacture = 'A_PAYER' | 'EN_ATTENTE' | 'PAYEE';

export interface FactureForm {
  date: string;
  fournisseur: string;
  reference: string;
  montant: string;
  statut: StatutFacture;
  fichier?: File | null;
}

export type FactureFormErrors = Partial<Record<keyof FactureForm, string>>;

export function useNewFacturePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FactureForm>({
    date: new Date().toISOString().split('T')[0],
    fournisseur: '',
    reference: '',
    montant: '',
    statut: 'A_PAYER',
    fichier: null
  });
  const [errors, setErrors] = useState<FactureFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof FactureForm, value: string | StatutFacture | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleChange('fichier', file);
  }, [handleChange]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FactureFormErrors = {};

    if (!formData.date) newErrors.date = 'La date est requise';
    if (!formData.fournisseur.trim()) newErrors.fournisseur = 'Le fournisseur est requis';
    if (!formData.reference.trim()) newErrors.reference = 'La référence est requise';
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simuler l'envoi au serveur
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/finance/factures');
    }, 1000);
  }, [validateForm, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleBack,
  };
}
