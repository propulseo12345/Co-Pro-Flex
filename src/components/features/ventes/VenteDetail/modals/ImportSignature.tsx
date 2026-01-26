'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, Image, AlertCircle, Check } from 'lucide-react';
import styles from '../VenteDetail.module.css';

interface ImportSignatureProps {
  onImport: (signatureData: string) => void;
  onCancel: () => void;
}

/**
 * Composant d'import d'une signature manuscrite scannée
 * Permet d'uploader une image PNG/JPG de signature
 */
export function ImportSignature({ onImport, onCancel }: ImportSignatureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setErreur(null);
    setIsLoading(true);

    // Validation du type
    if (!fichier.type.startsWith('image/')) {
      setErreur('Veuillez sélectionner une image (PNG, JPG)');
      setIsLoading(false);
      return;
    }

    // Validation de la taille (max 2 Mo)
    if (fichier.size > 2 * 1024 * 1024) {
      setErreur('L\'image ne doit pas dépasser 2 Mo');
      setIsLoading(false);
      return;
    }

    // Lecture et conversion en base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setErreur('Erreur lors de la lecture du fichier');
      setIsLoading(false);
    };
    reader.readAsDataURL(fichier);
  }, []);

  const handleValider = useCallback(() => {
    if (!preview) return;
    onImport(preview);
  }, [preview, onImport]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setErreur(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  return (
    <div className={styles.signatureSection}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Sélectionner une image de signature"
      />

      {!preview ? (
        <div
          className={styles.signatureCanvasContainer}
          onClick={() => inputRef.current?.click()}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Cliquer pour importer une signature scannée"
        >
          <Upload size={32} style={{ color: '#9ca3af' }} aria-hidden="true" />
          <span style={{ fontSize: '0.938rem', color: '#6b7280' }}>
            Cliquez pour importer une signature scannée
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            PNG ou JPG, max 2 Mo
          </span>
        </div>
      ) : (
        <div className={styles.signatureCanvasContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Signature importée"
            style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
          />
        </div>
      )}

      {erreur && (
        <div className={styles.warning} style={{ marginTop: '1rem', background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      <div className={styles.signatureCanvasActions} style={{ marginTop: '1rem' }}>
        {preview ? (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
            >
              <Image size={16} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
              Changer l&apos;image
            </button>
            <button
              type="button"
              onClick={handleValider}
              className="btn btn-primary"
            >
              <Check size={16} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
              Utiliser cette signature
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-primary"
              disabled={isLoading}
            >
              <Upload size={16} aria-hidden="true" style={{ marginRight: '0.5rem' }} />
              {isLoading ? 'Chargement...' : 'Sélectionner un fichier'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ImportSignature;
