'use client';

import { useCallback } from 'react';
import { useEtatsDate } from '@/hooks/modules/useEtatsDate';
import type { TypeEtatDate } from '@/types/models/etat-date';

export function useEtatsDatePage() {
  const {
    lots,
    coproprietaires,
    selectedLotId,
    selectedCoproprietaireId,
    dateReference,
    typeDocument,
    etatGenere,
    isGenerating,
    error,
    setSelectedLotId,
    setDateReference,
    setTypeDocument,
    genererEtatDate,
    resetForm,
    exportHTML,
  } = useEtatsDate();

  const selectedLot = lots.find(l => l.id === selectedLotId);
  const selectedCopro = coproprietaires.find(c => c.id === selectedCoproprietaireId);

  const handleExportHTML = useCallback(() => {
    const html = exportHTML();
    if (!html) return;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeDocument === 'PRE_ETAT_DATE' ? 'pre-etat-date' : 'etat-date'}-lot-${etatGenere?.lot.numero || 'x'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportHTML, typeDocument, etatGenere]);

  const handlePrint = useCallback(() => {
    const html = exportHTML();
    if (!html) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [exportHTML]);

  const handleTypeChange = useCallback((type: TypeEtatDate) => {
    setTypeDocument(type);
  }, [setTypeDocument]);

  const handleLotChange = useCallback((lotId: string | null) => {
    setSelectedLotId(lotId);
  }, [setSelectedLotId]);

  const handleDateChange = useCallback((date: string) => {
    setDateReference(date);
  }, [setDateReference]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const formatMontant = (m: number) => m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return {
    lots,
    coproprietaires,
    selectedLotId,
    selectedLot,
    selectedCopro,
    dateReference,
    typeDocument,
    etatGenere,
    isGenerating,
    error,
    handleTypeChange,
    handleLotChange,
    handleDateChange,
    genererEtatDate,
    resetForm,
    handleExportHTML,
    handlePrint,
    formatDate,
    formatMontant,
  };
}
