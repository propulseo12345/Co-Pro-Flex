'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AGData, Resolution, VoteData, Signataire, PresenceData } from '../domain/types';
import { INITIAL_SIGNATAIRES, LOAD_TIMEOUT_MS } from '../domain/constants';
import { generatePVText, generatePDFDocument, getResolutionResult, calculatePVStats } from '../domain/utils';
import { MOCK_COPROPRIETAIRES, MOCK_ASSEMBLEES } from '@/data/mock';
import { useGlobalVariables } from '@/hooks/useGlobalVariables';
import { parseFullName, type ExtractedSignataire } from '@/lib/utils/variable-resolution';
import type { ModeSignature } from '@/types/models/pv-signature';
import { LABELS_MODE_SIGNATURE } from '@/types/models/pv-signature';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';

interface UsePVPageProps {
  agId: string;
}

export function usePVPage({ agId }: UsePVPageProps) {
  const router = useRouter();

  // Data state
  const [agData, setAgData] = useState<AGData | null>(null);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [presences, setPresences] = useState<PresenceData[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // UI state
  const [pvText, setPvText] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isSigned, setIsSigned] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // Signataires state
  const [showSignatairesModal, setShowSignatairesModal] = useState(false);
  const [signataires, setSignataires] = useState<Signataire[]>(INITIAL_SIGNATAIRES);
  const [modeSignature, setModeSignature] = useState<ModeSignature>('sur_place');

  // Signature pad state
  const [showSignaturePadModal, setShowSignaturePadModal] = useState(false);
  const [currentSignataire, setCurrentSignataire] = useState<Signataire | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Auto-fill state
  const [showAutoFillConfirm, setShowAutoFillConfirm] = useState(false);
  const [autoFillData, setAutoFillData] = useState<ExtractedSignataire[]>([]);
  const [autoFillSuccess, setAutoFillSuccess] = useState<string | null>(null);

  // Global variables hook
  const { mergeVariables } = useGlobalVariables({
    agId,
    userVariables: variableValues,
  });

  const allVariables = useMemo(() => mergeVariables(variableValues), [mergeVariables, variableValues]);

  const modeConfig = LABELS_MODE_SIGNATURE[modeSignature];
  const isEmailObligatoire = modeConfig.emailObligatoire;

  // Computed values
  const stats = useMemo(() => calculatePVStats(resolutions, votes), [resolutions, votes]);

  // Replace variables in text
  const replaceVariables = useCallback(
    (text: string): string => {
      if (!text) return '';
      return text.replace(/\{([^}]+)\}/g, (_, varName) => {
        return allVariables[varName] || `[${varName}]`;
      });
    },
    [allVariables]
  );

  // Load data effect
  useEffect(() => {
    const loadTimeout = setTimeout(() => {
      if (isDataLoading) {
        setIsDataLoading(false);
        setDataLoadError('Le chargement des données a pris trop de temps. Veuillez rafraîchir la page.');
      }
    }, LOAD_TIMEOUT_MS);

    const loadData = async () => {
      try {
        setIsDataLoading(true);
        setDataLoadError(null);

        let agDataLoaded = false;

        // Load AG data - try Supabase draft first, then localStorage fallback
        const { data: draftData } = await loadDraft<AGData>(agId, 'session', 'ag-draft-' + agId);
        if (draftData) {
          setAgData(draftData);
          agDataLoaded = true;
        }

        // Fallback to mock data
        if (!agDataLoaded) {
          const mockAg = MOCK_ASSEMBLEES.find((a: { id: string }) => a.id === agId);
          if (mockAg) {
            setAgData({
              type: (mockAg as { type: string }).type.toUpperCase() as 'ORDINAIRE' | 'EXTRAORDINAIRE',
              date: (mockAg as { date: string }).date,
              heure: '',
              lieu: (mockAg as { lieu?: string }).lieu || '',
              adresse: (mockAg as { lieu?: string }).lieu || '',
            });
            agDataLoaded = true;

            if ((mockAg as { ordreDuJour?: unknown[] }).ordreDuJour && Array.isArray((mockAg as { ordreDuJour?: unknown[] }).ordreDuJour)) {
              setResolutions(
                ((mockAg as { ordreDuJour: { id?: string; titre?: string; description?: string; majorite?: string }[] }).ordreDuJour).map((res, index) => ({
                  id: res.id || `res-${index}-${Date.now()}`,
                  titre: res.titre || `Résolution ${index + 1}`,
                  texte: res.description || res.titre || '',
                  majorite: res.majorite || 'ART_24',
                  variables: {},
                }))
              );
            }
          }
        }

        // Load resolutions from Supabase/localStorage
        const { data: resolutionsData } = await loadDraft<Resolution[]>(agId, 'resolutions', 'ag-resolutions-' + agId);
        if (resolutionsData && Array.isArray(resolutionsData) && resolutionsData.length > 0) {
          setResolutions(resolutionsData);
        }

        // Load votes from Supabase/localStorage
        const { data: votesData } = await loadDraft<VoteData[]>(agId, 'votes', 'ag-votes-' + agId);
        if (votesData) {
          setVotes(votesData);
        }

        // Load presences/session from Supabase/localStorage
        // Try 'attendance' draft type first, then 'session' as fallback
        let presencesLoaded = false;
        const { data: attendanceData } = await loadDraft<PresenceData[] | { presencesEnrichies?: Record<string, { mode?: string; mandataireId?: string }> }>(
          agId, 'attendance', 'ag-presences-' + agId
        );

        if (attendanceData) {
          if (Array.isArray(attendanceData)) {
            setPresences(attendanceData);
            presencesLoaded = true;
          } else if ((attendanceData as { presencesEnrichies?: unknown }).presencesEnrichies) {
            const presencesEnrichies = (attendanceData as { presencesEnrichies: Record<string, { mode?: string; mandataireId?: string }> }).presencesEnrichies;
            const presencesArray: PresenceData[] = [];
            for (const [coproId, data] of Object.entries(presencesEnrichies)) {
              let statut: 'PRESENT' | 'REPRESENTE' | 'ABSENT' | null = null;
              if (data.mode === 'present') statut = 'PRESENT';
              else if (data.mode === 'represente') statut = 'REPRESENTE';

              if (statut !== null) {
                presencesArray.push({
                  coproprietaireId: coproId,
                  statut,
                  mandataireId: data.mandataireId,
                });
              }
            }
            setPresences(presencesArray);
            presencesLoaded = true;
          }
        }

        // Fallback to session draft for presences
        if (!presencesLoaded) {
          const { data: sessionData } = await loadDraft<{ presencesEnrichies?: Record<string, { mode?: string; mandataireId?: string }> }>(
            agId, 'session', 'ag-session-' + agId
          );
          if (sessionData?.presencesEnrichies) {
            const presencesArray: PresenceData[] = [];
            for (const [coproId, data] of Object.entries(sessionData.presencesEnrichies)) {
              let statut: 'PRESENT' | 'REPRESENTE' | 'ABSENT' | null = null;
              if (data.mode === 'present') statut = 'PRESENT';
              else if (data.mode === 'represente') statut = 'REPRESENTE';

              if (statut !== null) {
                presencesArray.push({
                  coproprietaireId: coproId,
                  statut,
                  mandataireId: data.mandataireId,
                });
              }
            }
            setPresences(presencesArray);
          }
        }

        // Load variables from Supabase/localStorage
        const { data: variablesData } = await loadDraft<Record<string, string>>(agId, 'variables', 'ag-variables-' + agId);
        if (variablesData) {
          setVariableValues(variablesData);
        }

        // Load roles for signataires from Supabase/localStorage
        interface RolesData {
          presidentSeance?: { nom?: string; coproprietaireId?: string };
          secretaireSeance?: { nom?: string; coproprietaireId?: string; estGestionnaire?: boolean; representeSyndic?: string };
          scrutateur?: { nom?: string; coproprietaireId?: string };
        }
        const { data: rolesData } = await loadDraft<RolesData>(agId, 'roles', `roles-ag-${agId}`);
        if (rolesData) {
          const roles = rolesData;

          const presidentCopro = roles.presidentSeance?.coproprietaireId
            ? MOCK_COPROPRIETAIRES.find((c) => c.id === roles.presidentSeance?.coproprietaireId)
            : null;
          const secretaireCopro = roles.secretaireSeance?.coproprietaireId
            ? MOCK_COPROPRIETAIRES.find((c) => c.id === roles.secretaireSeance?.coproprietaireId)
            : null;
          const scrutateurCopro = roles.scrutateur?.coproprietaireId
            ? MOCK_COPROPRIETAIRES.find((c) => c.id === roles.scrutateur?.coproprietaireId)
            : null;

          const parseNom = (nom: string) => {
            if (!nom) return { prenom: '', nomFamille: '' };
            const parts = nom.split(' ');
            return {
              prenom: parts.slice(0, -1).join(' '),
              nomFamille: parts[parts.length - 1] || '',
            };
          };

          const presidentNom = parseNom(roles.presidentSeance?.nom || '');
          const secretaireNom = parseNom(roles.secretaireSeance?.nom || '');
          const scrutateurNom = parseNom(roles.scrutateur?.nom || '');

          setSignataires([
            {
              id: '1',
              role: 'president',
              roleLabel: 'Président de séance',
              nom: presidentNom.nomFamille,
              prenom: presidentNom.prenom,
              email: presidentCopro?.email || '',
              telephone: presidentCopro?.telephone || '',
            },
            {
              id: '2',
              role: 'secretaire',
              roleLabel: roles.secretaireSeance?.estGestionnaire
                ? `Secrétaire de séance (représentant le syndic ${roles.secretaireSeance.representeSyndic || ''})`
                : 'Secrétaire de séance',
              nom: secretaireNom.nomFamille,
              prenom: secretaireNom.prenom,
              email: secretaireCopro?.email || '',
              telephone: secretaireCopro?.telephone || '',
              estGestionnaire: roles.secretaireSeance?.estGestionnaire,
              representeSyndic: roles.secretaireSeance?.representeSyndic,
            },
            {
              id: '3',
              role: 'scrutateur',
              roleLabel: 'Scrutateur',
              nom: scrutateurNom.nomFamille,
              prenom: scrutateurNom.prenom,
              email: scrutateurCopro?.email || '',
              telephone: scrutateurCopro?.telephone || '',
            },
          ]);
        }
      } catch (error) {
        setDataLoadError(error instanceof Error ? error.message : 'Erreur lors du chargement des données');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();

    return () => {
      clearTimeout(loadTimeout);
    };
  }, [agId]);

  // Generate PV text effect
  useEffect(() => {
    if (agData && resolutions.length > 0) {
      const text = generatePVText(agData, resolutions, votes, signataires);
      setPvText(text);
    }
  }, [agData, resolutions, votes, signataires]);

  // Get resolution result wrapper
  const getResolutionResultWrapper = useCallback(
    (resolution: Resolution) => getResolutionResult(resolution, votes),
    [votes]
  );

  // PDF handlers
  const handleDownloadPDF = useCallback(async () => {
    if (!agData) {
      setPdfError("Les données de l'AG ne sont pas disponibles.");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const doc = generatePDFDocument(agData, resolutions, votes, presences, signataires, replaceVariables);
      if (doc) {
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`PV_AG_${agId}_${dateStr}.pdf`);
      } else {
        setPdfError('Erreur lors de la génération du PDF.');
      }
    } catch (error) {
      setPdfError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [agData, agId, resolutions, votes, presences, signataires, replaceVariables]);

  const handlePreviewPDF = useCallback(async () => {
    if (!agData) {
      setPdfError("Les données de l'AG ne sont pas disponibles.");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const doc = generatePDFDocument(agData, resolutions, votes, presences, signataires, replaceVariables);
      if (doc) {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } else {
        setPdfError("Erreur lors de la génération de l'aperçu.");
      }
    } catch (error) {
      setPdfError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [agData, resolutions, votes, presences, signataires, replaceVariables, pdfUrl]);

  // Signataires handlers
  const handleOpenSignatairesModal = () => setShowSignatairesModal(true);

  const updateSignataire = (id: string, field: keyof Signataire, value: string) => {
    setSignataires((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleAutoFillFromAG = async () => {
    interface RolesData {
      presidentSeance?: { nom?: string; coproprietaireId?: string };
      secretaireSeance?: { nom?: string; coproprietaireId?: string; estGestionnaire?: boolean; representeSyndic?: string };
      scrutateur?: { nom?: string; coproprietaireId?: string };
    }
    const { data: roles } = await loadDraft<RolesData>(agId, 'roles', `roles-ag-${agId}`);

    if (!roles) {
      alert("Aucun rôle n'a été désigné lors de la session AG.");
      return;
    }
    const extracted: ExtractedSignataire[] = [];

    // Extract president
    const president = roles.presidentSeance;
    if (president?.nom) {
      const copro = president.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find((c) => c.id === president.coproprietaireId)
        : null;
      extracted.push({
        role: 'president',
        roleLabel: 'Président de séance',
        name: president.nom,
        coproprietaire: copro || null,
      });
    } else {
      extracted.push({ role: 'president', roleLabel: 'Président de séance', name: '', coproprietaire: null });
    }

    // Extract secretaire
    const secretaire = roles.secretaireSeance;
    if (secretaire?.nom) {
      const copro = secretaire.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find((c) => c.id === secretaire.coproprietaireId)
        : null;
      extracted.push({
        role: 'secretaire',
        roleLabel: secretaire.estGestionnaire
          ? `Secrétaire de séance (représentant le syndic ${secretaire.representeSyndic || ''})`
          : 'Secrétaire de séance',
        name: secretaire.nom,
        coproprietaire: copro || null,
      });
    } else {
      extracted.push({ role: 'secretaire', roleLabel: 'Secrétaire de séance', name: '', coproprietaire: null });
    }

    // Extract scrutateur
    const scrutateur = roles.scrutateur;
    if (scrutateur?.nom) {
      const copro = scrutateur.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find((c) => c.id === scrutateur.coproprietaireId)
        : null;
      extracted.push({
        role: 'scrutateur',
        roleLabel: 'Scrutateur',
        name: scrutateur.nom,
        coproprietaire: copro || null,
      });
    } else {
      extracted.push({ role: 'scrutateur', roleLabel: 'Scrutateur', name: '', coproprietaire: null });
    }

    const hasExistingData = signataires.some((s) => s.nom || s.prenom || s.email);

    if (hasExistingData) {
      setAutoFillData(extracted);
      setShowAutoFillConfirm(true);
    } else {
      applyAutoFill(extracted);
    }
  };

  const applyAutoFill = (extracted: ExtractedSignataire[]) => {
    let filledCount = 0;

    setSignataires((prev) =>
      prev.map((sig) => {
        const match = extracted.find((e) => e.role === sig.role);

        if (match) {
          const updatedRoleLabel = match.roleLabel || sig.roleLabel;

          if (match.coproprietaire) {
            const copro = match.coproprietaire;
            const { prenom, nom } = parseFullName(copro.nom);
            filledCount++;

            return {
              ...sig,
              roleLabel: updatedRoleLabel,
              prenom,
              nom,
              email: copro.email || '',
              telephone: copro.telephone || '',
            };
          } else if (match.name) {
            const { prenom, nom } = parseFullName(match.name);
            filledCount++;

            return {
              ...sig,
              roleLabel: updatedRoleLabel,
              prenom,
              nom,
              email: sig.email || '',
              telephone: sig.telephone || '',
            };
          }
        }
        return sig;
      })
    );

    if (filledCount > 0) {
      setAutoFillSuccess(`${filledCount} signataire${filledCount > 1 ? 's' : ''} pré-rempli${filledCount > 1 ? 's' : ''}`);
      setTimeout(() => setAutoFillSuccess(null), 5000);
    }

    setShowAutoFillConfirm(false);
  };

  const handleSendSignatureRequests = async () => {
    if (modeSignature === 'electronique') {
      const missingEmails = signataires.filter((s) => !s.email);
      if (missingEmails.length > 0) {
        alert(`Veuillez renseigner l'email pour : ${missingEmails.map((s) => s.roleLabel).join(', ')}`);
        return;
      }

      await saveDraft(agId, 'signataires', signataires, 'ag-signataires-' + agId);
      alert(`Demandes de signature envoyées à :\n${signataires.map((s) => `- ${s.prenom} ${s.nom} (${s.email})`).join('\n')}`);
    } else {
      const incomplets = signataires.filter((s) => !s.nom || !s.prenom);
      if (incomplets.length > 0) {
        alert(`Veuillez renseigner le nom et prénom pour : ${incomplets.map((s) => s.roleLabel).join(', ')}`);
        return;
      }

      await saveDraft(agId, 'signataires', signataires, 'ag-signataires-' + agId);
      alert(`Signatures physiques validées pour :\n${signataires.map((s) => `- ${s.prenom} ${s.nom} (${s.roleLabel})`).join('\n')}`);
    }

    setShowSignatairesModal(false);
    setIsSigned(true);
    await saveDraft(agId, 'milestones', { pvSigned: true }, 'ag-pv-signed-' + agId);
  };

  // Signature pad handlers
  const handleOpenSignaturePad = (signataire: Signataire) => {
    setCurrentSignataire(signataire);
    setShowSignaturePadModal(true);
  };

  const clearSignature = (signataireId: string) => {
    setSignataires((prev) =>
      prev.map((s) => (s.id === signataireId ? { ...s, signature: undefined, signedAt: undefined } : s))
    );
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !currentSignataire) return;

    const signatureData = canvasRef.current.toDataURL('image/png');

    setSignataires((prev) =>
      prev.map((s) => (s.id === currentSignataire.id ? { ...s, signature: signatureData, signedAt: new Date().toISOString() } : s))
    );

    setShowSignaturePadModal(false);
    setCurrentSignataire(null);

    const updatedSignataires = signataires.map((s) => (s.id === currentSignataire.id ? { ...s, signature: signatureData } : s));

    if (updatedSignataires.every((s) => s.signature)) {
      setIsSigned(true);
      await saveDraft(agId, 'milestones', { pvSigned: true }, 'ag-pv-signed-' + agId);
      await saveDraft(agId, 'signataires', updatedSignataires, 'ag-signataires-' + agId);
    }
  };

  // Navigation handlers
  const handleFinish = async () => {
    await saveDraft(agId, 'milestones', { completed: true }, 'ag-completed-' + agId);
    router.push('/ag/dashboard');
  };

  const handleGoBack = () => {
    router.push(`/ag/${agId}/session`);
  };

  return {
    // Refs
    canvasRef,

    // Data
    agId,
    agData,
    resolutions,
    votes,
    pvText,
    signataires,
    stats,

    // UI state
    isPreviewMode,
    isSigned,
    isDataLoading,
    dataLoadError,

    // Modals
    showSignatairesModal,
    showSignaturePadModal,
    currentSignataire,
    showAutoFillConfirm,
    autoFillData,
    autoFillSuccess,

    // Signature mode
    modeSignature,
    modeConfig,
    isEmailObligatoire,

    // PDF state
    pdfUrl,
    isGeneratingPdf,
    pdfError,

    // Drawing state
    isDrawing,

    // Setters
    setIsPreviewMode,
    setShowSignatairesModal,
    setShowSignaturePadModal,
    setShowAutoFillConfirm,
    setModeSignature,
    setPdfUrl,
    setPdfError,
    setIsDrawing,

    // Handlers
    getResolutionResult: getResolutionResultWrapper,
    handleDownloadPDF,
    handlePreviewPDF,
    handleOpenSignatairesModal,
    updateSignataire,
    handleAutoFillFromAG,
    applyAutoFill,
    handleSendSignatureRequests,
    handleOpenSignaturePad,
    clearSignature,
    saveSignature,
    handleFinish,
    handleGoBack,
  };
}
