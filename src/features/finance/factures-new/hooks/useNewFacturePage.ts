'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSuppliers, useOpenPeriod, useAccounts, useCreateSupplierInvoice } from '@/hooks/modules/useFinanceData';

export interface FactureForm {
  date: string;
  dateEcheance: string;
  supplierId: string;
  accountId: string;
  reference: string;
  libelle: string;
  montant: string;
}

export type FactureFormErrors = Partial<Record<keyof FactureForm, string>>;

export function useNewFacturePage() {
  const router = useRouter();
  const suppliers = useSuppliers();
  const accounts = useAccounts();
  const openPeriod = useOpenPeriod();
  const createInvoice = useCreateSupplierInvoice();

  const [formData, setFormData] = useState<FactureForm>({
    date: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    supplierId: '',
    accountId: '',
    reference: '',
    libelle: '',
    montant: '',
  });
  const [errors, setErrors] = useState<FactureFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mono-poste : la charge s'impute sur UN compte 6xx (modèle facture fournisseur validé).
  const chargeAccounts = useMemo(
    () => (accounts.data ?? []).filter(account => account.code.startsWith('6')),
    [accounts.data]
  );

  const isLoadingRefs = suppliers.isLoading || accounts.isLoading || openPeriod.isLoading;

  // Préconditions réelles de saisie — affichées en clair plutôt qu'un formulaire qui plantera.
  const blockingError = useMemo(() => {
    if (isLoadingRefs) return null;
    if (!openPeriod.data) {
      return 'Aucune période comptable ouverte : ouvrez un exercice avant de saisir une facture.';
    }
    if (!suppliers.data || suppliers.data.length === 0) {
      return "Aucun fournisseur actif sur cette copropriété : créez d'abord le fournisseur dans l'annuaire des tiers.";
    }
    if (chargeAccounts.length === 0) {
      return 'Aucun compte de charge (6xx) actif : le plan comptable de la copropriété est incomplet.';
    }
    return null;
  }, [isLoadingRefs, openPeriod.data, suppliers.data, chargeAccounts.length]);

  const handleChange = useCallback((field: keyof FactureForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FactureFormErrors = {};

    if (!formData.date) newErrors.date = 'La date est requise';
    if (!formData.supplierId) newErrors.supplierId = 'Le fournisseur est requis';
    if (!formData.accountId) newErrors.accountId = 'Le compte de charge est requis';
    if (!formData.libelle.trim()) newErrors.libelle = 'Le libellé est requis';
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }
    if (formData.dateEcheance && formData.date && formData.dateEcheance < formData.date) {
      newErrors.dateEcheance = "L'échéance ne peut pas précéder la date de facture";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!openPeriod.data) {
      setSubmitError('Aucune période comptable ouverte.');
      return;
    }
    setSubmitError(null);

    const montant = parseFloat(formData.montant);
    const result = await createInvoice.mutate({
      period_id: openPeriod.data.id,
      supplier_id: formData.supplierId,
      invoice_number: formData.reference.trim() || undefined,
      invoice_date: formData.date,
      due_date: formData.dateEcheance || undefined,
      label: formData.libelle.trim(),
      // Mono-poste : une ligne TTC sur le compte choisi (TVA non récupérable en copro).
      lines: [{ account_id: formData.accountId, label: formData.libelle.trim(), amount: montant }],
      // Saisie + comptabilisation en un geste (décision « validée = posted ») : la RPC écrit
      // D 6xx / C 401. Le 2-temps brouillon → validation arrive avec la RPC de validation (LOT 1.2).
      post_immediately: true,
    });

    if (result.error || !result.data) {
      setSubmitError(result.error ?? 'La création de la facture a échoué.');
      return;
    }

    router.push(`/finance/factures/${result.data.invoice_id}`);
  }, [validateForm, openPeriod.data, formData, createInvoice, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    formData,
    errors,
    suppliers: suppliers.data ?? [],
    chargeAccounts,
    isLoadingRefs,
    blockingError,
    submitError,
    isSubmitting: createInvoice.isLoading,
    handleChange,
    handleSubmit,
    handleBack,
  };
}
