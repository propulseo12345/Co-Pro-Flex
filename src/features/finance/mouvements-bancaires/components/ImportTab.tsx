'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import type { MouvementBancaireBase, TypeImport } from '../domain/types';
import { parseCSVBancaire, parseCFONB120, detecterFormatImport } from '../domain/utils';
import styles from './ImportTab.module.css';

interface ImportTabProps {
  onImport: (mouvements: MouvementBancaireBase[]) => void;
  isImporting: boolean;
  accountId: string;
}

export function ImportTab({ onImport, isImporting, accountId }: ImportTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedMouvements, setParsedMouvements] = useState<MouvementBancaireBase[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<TypeImport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setWarnings([]);
    setFileName(file.name);

    try {
      const content = await file.text();
      const format = detecterFormatImport(content, file.name);
      setDetectedFormat(format);

      let mouvements: MouvementBancaireBase[] = [];
      let fileWarnings: string[] = [];

      if (format === 'cfonb') {
        const result = parseCFONB120(content);
        mouvements = result.mouvements;
        fileWarnings = result.warnings;
      } else if (format === 'csv') {
        mouvements = parseCSVBancaire(content);
      } else {
        setParseError('Le format OFX n\'est pas encore supporté. Utilisez CSV ou CFONB.');
        return;
      }

      // Assigner l'accountId
      mouvements = mouvements.map(m => ({ ...m, accountId }));
      setParsedMouvements(mouvements);
      setWarnings(fileWarnings);

      if (mouvements.length === 0) {
        setParseError('Aucun mouvement trouvé dans le fichier.');
      }
    } catch {
      setParseError('Erreur lors de la lecture du fichier.');
    }
  }, [accountId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirmImport = useCallback(() => {
    if (parsedMouvements.length > 0) {
      onImport(parsedMouvements);
      setParsedMouvements([]);
      setFileName(null);
      setDetectedFormat(null);
    }
  }, [parsedMouvements, onImport]);

  const handleClear = useCallback(() => {
    setParsedMouvements([]);
    setFileName(null);
    setDetectedFormat(null);
    setParseError(null);
    setWarnings([]);
  }, []);

  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <div className={styles.container}>
      {/* Drop zone */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.ofx,.qfx,.txt"
          onChange={handleFileInput}
          className={styles.hiddenInput}
        />
        <Upload size={32} className={styles.dropIcon} />
        <p className={styles.dropText}>
          Glissez-déposez un fichier bancaire ou <span className={styles.dropLink}>parcourir</span>
        </p>
        <div className={styles.formats}>
          <span className={styles.formatBadge}>CSV</span>
          <span className={styles.formatBadge}>OFX</span>
          <span className={styles.formatBadge}>CFONB</span>
        </div>
      </div>

      {/* Error */}
      {parseError && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          <span>{parseError}</span>
          <button className={styles.clearBtn} onClick={handleClear}><X size={14} /></button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className={styles.warnings}>
          <AlertCircle size={14} />
          <span>{warnings.length} avertissement{warnings.length > 1 ? 's' : ''} lors du parsing</span>
        </div>
      )}

      {/* Preview */}
      {parsedMouvements.length > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div className={styles.previewInfo}>
              <FileText size={16} />
              <span className={styles.previewFileName}>{fileName}</span>
              <span className={styles.previewFormat}>{detectedFormat?.toUpperCase()}</span>
              <span className={styles.previewCount}>{parsedMouvements.length} mouvements</span>
            </div>
            <div className={styles.previewActions}>
              <button className={styles.cancelBtn} onClick={handleClear}>Annuler</button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirmImport}
                disabled={isImporting}
              >
                {isImporting ? 'Import...' : `Confirmer l'import`}
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th className={styles.alignRight}>Montant</th>
                  <th>Type</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {parsedMouvements.slice(0, 20).map((m) => (
                  <tr key={m.id}>
                    <td className={styles.dateCell}>{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                    <td className={styles.libelleCell}>{m.libelle}</td>
                    <td className={`${styles.alignRight} ${m.montant >= 0 ? styles.montantPositif : styles.montantNegatif}`}>
                      {formatMontant(m.montant)}
                    </td>
                    <td>
                      <span className={m.type === 'ENTREE' ? styles.typeEntree : styles.typeSortie}>
                        {m.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td>
                      {m.categorise ? (
                        <span className={styles.statusCategorise}><CheckCircle size={12} /> Pré-catégorisé</span>
                      ) : (
                        <span className={styles.statusNonCategorise}>À catégoriser</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedMouvements.length > 20 && (
              <p className={styles.moreRows}>+ {parsedMouvements.length - 20} mouvements supplémentaires</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
