'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, AlertTriangle, Check, RotateCcw, PenTool, Calendar, User, Shield, Upload } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { VenteDocument, ModeSignature } from '../types';
import styles from '../VenteDetail.module.css';

interface SignDocumentModalProps {
  document: VenteDocument;
  onClose: () => void;
  onSign: (doc: VenteDocument, signatureData: string, signataire: SignataireInfo) => void;
}

interface SignataireInfo {
  nom: string;
  prenom: string;
  role: string;
  lieuSignature: string;
}

type SignatureStep = 'info' | 'signature' | 'confirmation';

export function SignDocumentModal({ document, onClose, onSign }: SignDocumentModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    isActive: true,
    escapeDeactivates: true,
    onEscape: onClose,
  });

  // État du parcours de signature
  const [step, setStep] = useState<SignatureStep>('info');
  const [signataire, setSignataire] = useState<SignataireInfo>({
    nom: '',
    prenom: '',
    role: 'Syndic',
    lieuSignature: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // État du canvas de signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [modeSignature, setModeSignature] = useState<ModeSignature>('electronique');

  // Initialiser le canvas
  useEffect(() => {
    if (step !== 'signature') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration du canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Style du stylo
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [step]);

  // Fonctions de dessin
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureData('');
  }, []);

  // Gestion de l'import de signature
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    // Validation du type
    if (!fichier.type.startsWith('image/')) {
      return;
    }

    // Validation de la taille (max 2 Mo)
    if (fichier.size > 2 * 1024 * 1024) {
      return;
    }

    // Lecture et conversion en base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSignatureData(base64);
      setHasDrawn(true);
    };
    reader.readAsDataURL(fichier);
  }, []);

  const handleModeChange = useCallback((mode: ModeSignature) => {
    setModeSignature(mode);
    setSignatureData('');
    setHasDrawn(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Validation de l'étape 1
  const validateSignataireInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!signataire.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }
    if (!signataire.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }
    if (!signataire.lieuSignature.trim()) {
      newErrors.lieuSignature = 'Le lieu de signature est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Génération de la mention légale
  const genererMention = (): string => {
    if (!signataire.lieuSignature) return '';
    const dateFormatee = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Fait à ${signataire.lieuSignature}, le ${dateFormatee}`;
  };

  // Navigation entre les étapes
  const goToSignature = () => {
    if (validateSignataireInfo()) {
      setStep('signature');
    }
  };

  const goToConfirmation = () => {
    if (modeSignature === 'electronique') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;

      const data = canvas.toDataURL('image/png');
      setSignatureData(data);
    } else {
      // Mode import : la signature est déjà dans signatureData
      if (!signatureData || !hasDrawn) return;
    }
    setStep('confirmation');
  };

  const goBack = () => {
    if (step === 'signature') {
      setStep('info');
    } else if (step === 'confirmation') {
      setStep('signature');
    }
  };

  // Confirmation finale
  const confirmSignature = () => {
    if (signatureData && signataire.nom && signataire.prenom) {
      onSign(document, signatureData, signataire);
    }
  };

  // Formatage de la date actuelle
  const formatCurrentDate = () => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  };

  return (
    <div className={styles.modal}>
      <div ref={focusTrapRef} className={styles.modalLarge} role="dialog" aria-modal="true" aria-labelledby="sign-doc-title">
        <div className={styles.modalHeader}>
          <h3 id="sign-doc-title">
            <PenTool size={20} aria-hidden="true" style={{ marginRight: 8 }} />
            Signature du document
          </h3>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Indicateur d'étapes */}
          <div className={styles.signatureSteps}>
            <div className={`${styles.signatureStep} ${step === 'info' ? styles.signatureStepActive : ''} ${step !== 'info' ? styles.signatureStepCompleted : ''}`}>
              <span className={styles.signatureStepNumber}>1</span>
              <span className={styles.signatureStepLabel}>Identification</span>
            </div>
            <div className={styles.signatureStepConnector} />
            <div className={`${styles.signatureStep} ${step === 'signature' ? styles.signatureStepActive : ''} ${step === 'confirmation' ? styles.signatureStepCompleted : ''}`}>
              <span className={styles.signatureStepNumber}>2</span>
              <span className={styles.signatureStepLabel}>Signature</span>
            </div>
            <div className={styles.signatureStepConnector} />
            <div className={`${styles.signatureStep} ${step === 'confirmation' ? styles.signatureStepActive : ''}`}>
              <span className={styles.signatureStepNumber}>3</span>
              <span className={styles.signatureStepLabel}>Confirmation</span>
            </div>
          </div>

          {/* Document concerné */}
          <div className={styles.docPreview}>
            <FileText size={24} aria-hidden="true" />
            <div>
              <strong>{document.nom}</strong>
              <span className={styles.docPreviewMeta}>Document obligatoire</span>
            </div>
          </div>

          {/* Étape 1: Identification du signataire */}
          {step === 'info' && (
            <div className={styles.signatureSection}>
              <h4 className={styles.signatureSectionTitle}>
                <User size={18} aria-hidden="true" />
                Identification du signataire
              </h4>
              <p className={styles.signatureSectionDesc}>
                Veuillez renseigner vos informations avant de procéder à la signature.
              </p>

              <div className={styles.editGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="signataire-nom">Nom *</label>
                  <input
                    id="signataire-nom"
                    type="text"
                    value={signataire.nom}
                    onChange={e => setSignataire({ ...signataire, nom: e.target.value })}
                    className={errors.nom ? styles.inputError : ''}
                    placeholder="Nom de famille"
                  />
                  {errors.nom && <span className={styles.errorText}>{errors.nom}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="signataire-prenom">Prénom *</label>
                  <input
                    id="signataire-prenom"
                    type="text"
                    value={signataire.prenom}
                    onChange={e => setSignataire({ ...signataire, prenom: e.target.value })}
                    className={errors.prenom ? styles.inputError : ''}
                    placeholder="Prénom"
                  />
                  {errors.prenom && <span className={styles.errorText}>{errors.prenom}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="signataire-role">Qualité / Fonction</label>
                  <select
                    id="signataire-role"
                    value={signataire.role}
                    onChange={e => setSignataire({ ...signataire, role: e.target.value })}
                  >
                    <option value="Syndic">Syndic</option>
                    <option value="Président du conseil syndical">Président du conseil syndical</option>
                    <option value="Gestionnaire">Gestionnaire</option>
                    <option value="Représentant légal">Représentant légal</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="signataire-lieu">Lieu de signature *</label>
                  <input
                    id="signataire-lieu"
                    type="text"
                    value={signataire.lieuSignature}
                    onChange={e => setSignataire({ ...signataire, lieuSignature: e.target.value })}
                    className={errors.lieuSignature ? styles.inputError : ''}
                    placeholder="Ex: Paris"
                  />
                  {errors.lieuSignature && <span className={styles.errorText}>{errors.lieuSignature}</span>}
                </div>
              </div>

              <div className={styles.warning}>
                <AlertTriangle size={16} aria-hidden="true" />
                <span>En signant ce document, vous certifiez l&apos;exactitude des informations qu&apos;il contient.</span>
              </div>
            </div>
          )}

          {/* Étape 2: Signature */}
          {step === 'signature' && (
            <div className={styles.signatureSection}>
              <h4 className={styles.signatureSectionTitle}>
                <PenTool size={18} aria-hidden="true" />
                Apposez votre signature
              </h4>

              {/* Sélecteur de mode */}
              <div className={styles.signatureSteps} style={{ marginBottom: '1rem', padding: '0.75rem', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleModeChange('electronique')}
                  className={`${styles.signatureStep} ${modeSignature === 'electronique' ? styles.signatureStepActive : ''}`}
                  style={{
                    flexDirection: 'row',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    background: modeSignature === 'electronique' ? 'var(--badge-info-bg)' : 'transparent',
                    borderRadius: '6px',
                    border: modeSignature === 'electronique' ? '1px solid var(--primary)' : '1px solid transparent'
                  }}
                >
                  <PenTool size={16} aria-hidden="true" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Dessiner</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('manuscrite')}
                  className={`${styles.signatureStep} ${modeSignature === 'manuscrite' ? styles.signatureStepActive : ''}`}
                  style={{
                    flexDirection: 'row',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    background: modeSignature === 'manuscrite' ? 'var(--badge-info-bg)' : 'transparent',
                    borderRadius: '6px',
                    border: modeSignature === 'manuscrite' ? '1px solid var(--primary)' : '1px solid transparent'
                  }}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Importer</span>
                </button>
              </div>

              {modeSignature === 'electronique' ? (
                <>
                  <p className={styles.signatureSectionDesc}>
                    Utilisez votre souris, trackpad ou écran tactile pour signer dans la zone ci-dessous.
                  </p>

                  <div className={styles.signatureCanvasContainer}>
                    <canvas
                      ref={canvasRef}
                      className={styles.signatureCanvas}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      aria-label="Zone de signature"
                      role="img"
                    />
                    {!hasDrawn && (
                      <div className={styles.signaturePlaceholder}>
                        Signez ici
                      </div>
                    )}
                  </div>

                  <div className={styles.signatureCanvasActions}>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="btn btn-secondary"
                      disabled={!hasDrawn}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Effacer
                    </button>
                    <span className={styles.signatureInfo}>
                      <Calendar size={14} aria-hidden="true" />
                      {formatCurrentDate()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.signatureSectionDesc}>
                    Importez une image de votre signature scannée (PNG ou JPG, max 2 Mo).
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileImport}
                    style={{ display: 'none' }}
                    aria-label="Sélectionner une image de signature"
                  />

                  <div
                    className={styles.signatureCanvasContainer}
                    onClick={() => !signatureData && fileInputRef.current?.click()}
                    style={{
                      cursor: signatureData ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem'
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !signatureData && fileInputRef.current?.click()}
                  >
                    {signatureData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureData}
                        alt="Signature importée"
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                      />
                    ) : (
                      <>
                        <Upload size={32} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
                        <span style={{ fontSize: '0.938rem', color: 'var(--text-tertiary)' }}>
                          Cliquez pour importer une signature
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          PNG ou JPG, max 2 Mo
                        </span>
                      </>
                    )}
                  </div>

                  <div className={styles.signatureCanvasActions}>
                    {signatureData && (
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureData('');
                          setHasDrawn(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="btn btn-secondary"
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        Changer
                      </button>
                    )}
                    <span className={styles.signatureInfo}>
                      <Calendar size={14} aria-hidden="true" />
                      {formatCurrentDate()}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Étape 3: Confirmation */}
          {step === 'confirmation' && (
            <div className={styles.signatureSection}>
              <h4 className={styles.signatureSectionTitle}>
                <Shield size={18} aria-hidden="true" />
                Confirmation de signature
              </h4>
              <p className={styles.signatureSectionDesc}>
                Vérifiez les informations ci-dessous avant de valider définitivement.
              </p>

              <div className={styles.signatureConfirmation}>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Signataire</span>
                  <span className={styles.signatureConfirmValue}>
                    {signataire.prenom} {signataire.nom}
                  </span>
                </div>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Qualité</span>
                  <span className={styles.signatureConfirmValue}>{signataire.role}</span>
                </div>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Date et heure</span>
                  <span className={styles.signatureConfirmValue}>{formatCurrentDate()}</span>
                </div>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Lieu</span>
                  <span className={styles.signatureConfirmValue}>{signataire.lieuSignature}</span>
                </div>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Mention légale</span>
                  <span className={styles.signatureConfirmValue} style={{ fontStyle: 'italic' }}>
                    {genererMention()}
                  </span>
                </div>
                <div className={styles.signatureConfirmItem}>
                  <span className={styles.signatureConfirmLabel}>Signature</span>
                  <div className={styles.signaturePreview}>
                    {signatureData && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={signatureData} alt="Votre signature" className={styles.signaturePreviewImg} />
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.warning}>
                <AlertTriangle size={16} aria-hidden="true" />
                <span>Cette action est irréversible. La signature sera horodatée et associée au document.</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          {step !== 'info' && (
            <button onClick={goBack} className="btn btn-secondary">
              Retour
            </button>
          )}
          {step === 'info' && (
            <button onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
          )}

          {step === 'info' && (
            <button onClick={goToSignature} className="btn btn-primary">
              Continuer
            </button>
          )}
          {step === 'signature' && (
            <button onClick={goToConfirmation} className="btn btn-primary" disabled={!hasDrawn}>
              <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Valider la signature
            </button>
          )}
          {step === 'confirmation' && (
            <button onClick={confirmSignature} className="btn btn-primary">
              <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              Confirmer et signer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
