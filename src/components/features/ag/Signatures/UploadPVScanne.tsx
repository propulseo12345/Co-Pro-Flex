'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';
import styles from './UploadPVScanne.module.css';

interface UploadPVScanneProps {
  pvScanne: { url?: string; nom?: string; taille?: number } | null;
  onUpload: (fichier: File) => Promise<void>;
  disabled?: boolean;
}

export function UploadPVScanne({
  pvScanne,
  onUpload,
  disabled = false,
}: UploadPVScanneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10 Mo
      setError('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const formatTaille = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>
        <FileText size={16} aria-hidden="true" />
        PV signé scanné
      </h4>

      {pvScanne ? (
        <div className={styles.fichierExistant}>
          <div className={styles.fichierInfo}>
            <FileText size={20} aria-hidden="true" />
            <div>
              <span className={styles.fichierNom}>{pvScanne.nom}</span>
              {pvScanne.taille && (
                <span className={styles.fichierTaille}>
                  {formatTaille(pvScanne.taille)}
                </span>
              )}
            </div>
          </div>
          <div className={styles.fichierActions}>
            <a
              href={pvScanne.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.downloadBtn}
            >
              <Download size={16} aria-hidden="true" />
              Télécharger
            </a>
            <button
              type="button"
              className={styles.replaceBtn}
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              Remplacer
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.uploadZone}>
          <Upload size={32} aria-hidden="true" />
          <p>Déposez le PV scanné ici ou cliquez pour sélectionner</p>
          <span className={styles.hint}>PDF uniquement, max 10 Mo</span>
          <button
            type="button"
            className={styles.selectBtn}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                Envoi en cours...
              </>
            ) : (
              'Sélectionner un fichier'
            )}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Sélectionner un fichier PDF"
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
