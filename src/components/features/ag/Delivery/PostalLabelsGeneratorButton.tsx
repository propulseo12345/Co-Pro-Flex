'use client';

import { useState, useCallback } from 'react';
import { Printer, FileSpreadsheet, Download, ChevronDown, AlertCircle } from 'lucide-react';
import { PostalSendType } from '@/types/enums';
import {
  generatePostalLabels,
  generatePostalLabelsSheet,
  exportAddressesCSV,
  downloadCSV,
  type PostalRecipient,
} from '@/lib/pdf/generatePostalLabels';
import type { OwnerDeliveryStatus } from '@/hooks/modules/useDeliveryConfig';
import styles from './PostalLabelsGeneratorButton.module.css';

interface PostalLabelsGeneratorButtonProps {
  postalRecipients: OwnerDeliveryStatus[];
  sendType: PostalSendType;
  sender: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
  };
  agTitle?: string;
}

type ExportFormat = 'single' | 'sheet' | 'csv';

export function PostalLabelsGeneratorButton({
  postalRecipients,
  sendType,
  sender,
  agTitle,
}: PostalLabelsGeneratorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const validRecipients = postalRecipients.filter(
    (r) => r.hasAddress && r.adressePostale
  );

  const handleGenerate = useCallback(
    (format: ExportFormat) => {
      if (validRecipients.length === 0) return;

      setIsGenerating(true);
      setIsOpen(false);

      try {
        const recipients: PostalRecipient[] = validRecipients.map((r) => ({
          id: r.id,
          nom: r.nom,
          adresse: r.adressePostale!,
        }));

        if (format === 'csv') {
          const csvContent = exportAddressesCSV(recipients, sendType);
          const date = new Date().toISOString().split('T')[0];
          downloadCSV(csvContent, `adresses-convocation-${date}.csv`);
        } else {
          const generator =
            format === 'single' ? generatePostalLabels : generatePostalLabelsSheet;

          const result = generator({
            recipients,
            sender,
            sendType,
            agTitle,
          });

          // Télécharger le PDF
          const link = document.createElement('a');
          link.href = result.url;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Cleanup URL après un délai
          setTimeout(() => URL.revokeObjectURL(result.url), 1000);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [validRecipients, sendType, sender, agTitle]
  );

  if (validRecipients.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={16} aria-hidden="true" />
        <span>Aucun destinataire postal éligible</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => handleGenerate('sheet')}
          disabled={isGenerating}
          className={styles.mainButton}
        >
          <Printer size={18} aria-hidden="true" />
          <span>
            {isGenerating
              ? 'Génération...'
              : `Générer étiquettes PDF (${validRecipients.length})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isGenerating}
          className={styles.dropdownTrigger}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <button
            type="button"
            onClick={() => handleGenerate('sheet')}
            className={styles.dropdownItem}
          >
            <Printer size={16} aria-hidden="true" />
            <div className={styles.dropdownItemContent}>
              <span className={styles.dropdownItemLabel}>Planche A4</span>
              <span className={styles.dropdownItemDesc}>
                8 étiquettes par page (grille 2×4)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleGenerate('single')}
            className={styles.dropdownItem}
          >
            <Download size={16} aria-hidden="true" />
            <div className={styles.dropdownItemContent}>
              <span className={styles.dropdownItemLabel}>Une étiquette par page</span>
              <span className={styles.dropdownItemDesc}>
                Format 99×67mm, idéal pour étiquettes individuelles
              </span>
            </div>
          </button>

          <div className={styles.dropdownDivider} />

          <button
            type="button"
            onClick={() => handleGenerate('csv')}
            className={styles.dropdownItem}
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            <div className={styles.dropdownItemContent}>
              <span className={styles.dropdownItemLabel}>Export CSV</span>
              <span className={styles.dropdownItemDesc}>
                Liste des adresses pour publipostage
              </span>
            </div>
          </button>
        </div>
      )}

      <p className={styles.hint}>
        {sendType === PostalSendType.LRAR
          ? 'Les étiquettes porteront la mention LRAR'
          : 'Envoi en lettre simple'}
      </p>
    </div>
  );
}
