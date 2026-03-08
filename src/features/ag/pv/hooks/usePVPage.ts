'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createUntypedClient } from '@/lib/ag/api/utils';
import type { AGData, Resolution, VoteData, Signataire, PresenceData } from '../domain/types';
import { INITIAL_SIGNATAIRES, LOAD_TIMEOUT_MS } from '../domain/constants';
import { generatePVText, generatePDFDocument, getResolutionResult, calculatePVStats } from '../domain/utils';
import { useGlobalVariables } from '@/hooks/useGlobalVariables';
import { parseFullName, type ExtractedSignataire } from '@/lib/utils/variable-resolution';
import type { ModeSignature } from '@/types/models/pv-signature';
import { LABELS_MODE_SIGNATURE } from '@/types/models/pv-signature';
import { saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import { logger } from '@/lib/utils/logger';
import { updateAgCurrentStep } from '@/lib/ag/api';

interface UsePVPageProps {
  agId: string;
}

interface PVBundleResponse {
  agData: {
    id: string;
    type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'MIXTE';
    date: string;
    heure: string;
    lieu: string;
    adresse: string;
    title: string;
    status: string;
    coproName: string;
    presidentName?: string;
    secretaryName?: string;
    scrutineer1Name?: string;
    scrutineer2Name?: string;
    openingNotes?: string;
    closingNotes?: string;
  };
  resolutions: Array<{
    id: string;
    titre: string;
    texte: string;
    majorite: string;
    resolution_number: number;
    status: string;
    is_approved: boolean | null;
    variables: Record<string, unknown>;
  }>;
  presences: Array<{
    coproprietaireId: string;
    statut: 'PRESENT' | 'REPRESENTE' | 'CORRESPONDANCE' | 'ABSENT';
    nom: string;
    tantiemes: number;
    mandataireId?: string;
  }>;
  votes: Array<{
    resolutionId: string;
    coproprietaireId: string;
    vote: 'POUR' | 'CONTRE' | 'ABSTENTION' | null;
    tantiemes: number;
    source: 'CORRESPONDANCE' | 'DIRECT';
  }>;
  drafts: {
    session?: unknown;
    variables?: Record<string, string>;
    roles?: {
      presidentSeance?: { nom?: string; coproprietaireId?: string };
      secretaireSeance?: { nom?: string; coproprietaireId?: string; estGestionnaire?: boolean; representeSyndic?: string };
      scrutateur?: { nom?: string; coproprietaireId?: string };
    };
    signataires?: Signataire[];
  };
  totalTantiemes: number;
  loadedAt: string;
}

export function usePVPage({ agId }: UsePVPageProps) {
  const router = useRouter();

  // Data state
  const [agData, setAgData] = useState<AGData | null>(null);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [presences, setPresences] = useState<PresenceData[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Bureau names from AG bundle (for auto-fill button)
  const [bureauFromAG, setBureauFromAG] = useState<{
    presidentName: string;
    secretaryName: string;
    scrutineerName: string;
    secretaireEstGestionnaire?: boolean;
    secretaireRepresenteSyndic?: string;
  } | null>(null);

  // UI state
  const [pvText, setPvText] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isSigned, setIsSigned] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  // Activation recap state
  const [showActivationRecap, setShowActivationRecap] = useState(false);
  const [activationResult, setActivationResult] = useState<{ activated: number; failed: number } | null>(null);

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

  // Load data using bundle RPC
  const loadPVData = useCallback(async () => {
    if (!isValidUUID(agId)) {
      setDataLoadError('ID AG invalide');
      setIsDataLoading(false);
      return;
    }

    const startTime = Date.now();
    logger.debug('PV: Starting data load', { agId, attempt: retryCount + 1 });

    setIsDataLoading(true);
    setDataLoadError(null);

    try {
      const supabase = createClient();

      // Single RPC call for all data
      const { data: bundle, error } = await supabase.rpc('rpc_get_ag_pv_bundle', {
        p_ag_id: agId,
      });

      const duration = Date.now() - startTime;
      logger.debug('PV: Bundle RPC completed', { agId, duration, hasError: !!error });

      if (error) {
        throw new Error(error.message);
      }

      if (!bundle) {
        throw new Error('Aucune donnée reçue');
      }

      const data = bundle as unknown as PVBundleResponse;

      // Set AG data
      setAgData({
        type: data.agData.type,
        date: data.agData.date,
        heure: data.agData.heure,
        lieu: data.agData.lieu,
        adresse: data.agData.adresse,
      });

      // Set resolutions
      if (data.resolutions && data.resolutions.length > 0) {
        setResolutions(data.resolutions.map(r => ({
          id: r.id,
          titre: r.titre,
          texte: r.texte || '',
          majorite: r.majorite,
          variables: r.variables as Record<string, string> || {},
          resultat: r.is_approved === true ? 'ADOPTEE' : r.is_approved === false ? 'REJETEE' : undefined,
        })));
      }

      // Set votes
      if (data.votes) {
        setVotes(data.votes.map(v => ({
          resolutionId: v.resolutionId,
          coproprietaireId: v.coproprietaireId,
          vote: v.vote,
          tantiemes: v.tantiemes,
          source: v.source,
        })));
      }

      // Set presences
      if (data.presences) {
        setPresences(data.presences.map(p => ({
          coproprietaireId: p.coproprietaireId,
          statut: p.statut === 'CORRESPONDANCE' ? 'PRESENT' : p.statut,
          mandataireId: p.mandataireId,
        })));
      }

      // Set variables from drafts
      if (data.drafts?.variables) {
        setVariableValues(data.drafts.variables);
      }

      // Set signataires from drafts roles OR ag_meetings data
      const roles = data.drafts?.roles;
      const parseNom = (nom: string) => {
        if (!nom) return { prenom: '', nomFamille: '' };
        const parts = nom.split(' ');
        return {
          prenom: parts.slice(0, -1).join(' '),
          nomFamille: parts[parts.length - 1] || '',
        };
      };

      // Priority: drafts roles > ag_meetings columns > empty
      const presidentFullName = roles?.presidentSeance?.nom || data.agData.presidentName || '';
      const secretaireFullName = roles?.secretaireSeance?.nom || data.agData.secretaryName || '';
      const scrutateurFullName = roles?.scrutateur?.nom || data.agData.scrutineer1Name || '';

      const presidentNom = parseNom(presidentFullName);
      const secretaireNom = parseNom(secretaireFullName);
      const scrutateurNom = parseNom(scrutateurFullName);

      // Store bureau names for auto-fill button
      setBureauFromAG({
        presidentName: presidentFullName,
        secretaryName: secretaireFullName,
        scrutineerName: scrutateurFullName,
        secretaireEstGestionnaire: roles?.secretaireSeance?.estGestionnaire,
        secretaireRepresenteSyndic: roles?.secretaireSeance?.representeSyndic,
      });

      const hasAnyName = presidentNom.nomFamille || secretaireNom.nomFamille || scrutateurNom.nomFamille;

      if (hasAnyName || roles) {
        setSignataires([
          {
            id: '1',
            role: 'president',
            roleLabel: 'Président de séance',
            nom: presidentNom.nomFamille,
            prenom: presidentNom.prenom,
            email: '',
            telephone: '',
          },
          {
            id: '2',
            role: 'secretaire',
            roleLabel: roles?.secretaireSeance?.estGestionnaire
              ? `Secrétaire de séance (représentant le syndic ${roles.secretaireSeance.representeSyndic || ''})`
              : 'Secrétaire de séance',
            nom: secretaireNom.nomFamille,
            prenom: secretaireNom.prenom,
            email: '',
            telephone: '',
            estGestionnaire: roles?.secretaireSeance?.estGestionnaire,
            representeSyndic: roles?.secretaireSeance?.representeSyndic,
          },
          {
            id: '3',
            role: 'scrutateur',
            roleLabel: 'Scrutateur',
            nom: scrutateurNom.nomFamille,
            prenom: scrutateurNom.prenom,
            email: '',
            telephone: '',
          },
        ]);
      }

      logger.info('PV: Data loaded successfully', { agId, duration, resolutionsCount: data.resolutions?.length });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('PV: Load error', { agId, duration, error: error instanceof Error ? error.message : 'Unknown' });

      if (duration >= LOAD_TIMEOUT_MS) {
        setDataLoadError('Le chargement des données a pris trop de temps. Veuillez réessayer.');
      } else {
        setDataLoadError(error instanceof Error ? error.message : 'Erreur lors du chargement des données');
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [agId, retryCount]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  // Load data effect
  useEffect(() => {
    loadPVData();
  }, [loadPVData]);

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
    try {
      const supabase = createClient();

      // 1. Try ag_meetings columns first (including copro_ids for full contact info)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const untypedSupabase = supabase as any;
      const { data: meeting } = await untypedSupabase
        .from('ag_meetings')
        .select('president_name, secretary_name, scrutineer1_name, president_id, secretary_id, scrutineer1_id')
        .eq('id', agId)
        .single();

      let presidentName = meeting?.president_name || '';
      let secretaryName = meeting?.secretary_name || '';
      let scrutineerName = meeting?.scrutineer1_name || '';
      let estGestionnaire = false;
      let representeSyndic = '';

      // Fetch full contact info from coproprietaires for each role with a copro_id
      interface CoproContact { prenom: string; nom: string; email: string | null; telephone: string | null }
      const coproContacts: Record<string, CoproContact> = {};
      const coproIds = [meeting?.president_id, meeting?.secretary_id, meeting?.scrutineer1_id].filter(Boolean) as string[];
      if (coproIds.length > 0) {
        const { data: copros } = await untypedSupabase
          .from('coproprietaires')
          .select('id, prenom, nom, email, telephone')
          .in('id', coproIds);
        if (copros) {
          for (const c of copros as Array<{ id: string } & CoproContact>) {
            coproContacts[c.id] = c;
          }
        }
      }

      // 2. If not found, try session drafts
      if (!presidentName && !secretaryName && !scrutineerName) {
        const { data: draftData } = await supabase.rpc('get_ag_session_draft', {
          p_ag_id: agId,
          p_draft_type: 'roles',
        });

        const draft = draftData as { draft_data?: Record<string, unknown> } | null;
        if (draft?.draft_data) {
          const roles = draft.draft_data as {
            presidentSeance?: { nom: string };
            secretaireSeance?: { nom: string; estGestionnaire?: boolean; representeSyndic?: string };
            scrutateur?: { nom: string };
          };
          presidentName = roles.presidentSeance?.nom || '';
          secretaryName = roles.secretaireSeance?.nom || '';
          scrutineerName = roles.scrutateur?.nom || '';
          estGestionnaire = roles.secretaireSeance?.estGestionnaire || false;
          representeSyndic = roles.secretaireSeance?.representeSyndic || '';
        }
      }

      // 3. Fallback to bureauFromAG (loaded at mount)
      if (!presidentName && !secretaryName && !scrutineerName && bureauFromAG) {
        presidentName = bureauFromAG.presidentName;
        secretaryName = bureauFromAG.secretaryName;
        scrutineerName = bureauFromAG.scrutineerName;
        estGestionnaire = bureauFromAG.secretaireEstGestionnaire || false;
        representeSyndic = bureauFromAG.secretaireRepresenteSyndic || '';
      }

      // 4. Fallback: session draft 'variables' (nom_president, nom_secretaire, nom_scrutateur)
      if (!presidentName && !secretaryName && !scrutineerName) {
        const { data: varsDraftData } = await supabase.rpc('get_ag_session_draft', {
          p_ag_id: agId,
          p_draft_type: 'variables',
        });
        const varsDraft = varsDraftData as { draft_data?: Record<string, string> } | null;
        if (varsDraft?.draft_data) {
          presidentName = varsDraft.draft_data['nom_president'] || '';
          secretaryName = varsDraft.draft_data['nom_secretaire'] || '';
          scrutineerName = varsDraft.draft_data['nom_scrutateur'] || '';
        }
      }

      if (!presidentName && !secretaryName && !scrutineerName) {
        alert('Aucune donnée de bureau trouvée pour cette AG. Veuillez remplir manuellement.');
        return;
      }

      // Recherche des copropriétaires par nom complet pour récupérer email/téléphone
      // (utile quand les noms viennent du draft variables et qu'on n'a pas les IDs)
      const coproByName: Record<string, { id: string } & CoproContact> = {};
      const namesToSearch = [presidentName, secretaryName, scrutineerName].filter(Boolean);
      if (namesToSearch.length > 0) {
        const { data: allCopros } = await untypedSupabase
          .from('coproprietaires')
          .select('id, prenom, nom, email, telephone');
        if (allCopros) {
          const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          for (const c of allCopros as Array<{ id: string; prenom: string; nom: string; email: string | null; telephone: string | null }>) {
            const fullName = normalize(`${c.prenom} ${c.nom}`);
            const fullNameRev = normalize(`${c.nom} ${c.prenom}`);
            for (const searchName of namesToSearch) {
              const normalizedSearch = normalize(searchName);
              if (fullName === normalizedSearch || fullNameRev === normalizedSearch) {
                coproByName[searchName] = c;
                // Also add to coproContacts by id for buildCoproprietaire
                coproContacts[c.id] = c;
              }
            }
          }
        }
      }

      // Build extracted signataires with copro contact info when available
      const buildCoproprietaire = (coproId: string | undefined | null, fallbackName?: string) => {
        // Try by ID first
        if (coproId && coproContacts[coproId]) {
          const c = coproContacts[coproId];
          return { id: coproId, nom: `${c.prenom} ${c.nom}`, lot: '', email: c.email || '', telephone: c.telephone || '', tantiemes: 0 };
        }
        // Fallback: search by name
        if (fallbackName && coproByName[fallbackName]) {
          const c = coproByName[fallbackName];
          return { id: c.id, nom: `${c.prenom} ${c.nom}`, lot: '', email: c.email || '', telephone: c.telephone || '', tantiemes: 0 };
        }
        return null;
      };

      const extracted: ExtractedSignataire[] = [
        {
          role: 'president',
          roleLabel: 'Président de séance',
          name: presidentName,
          coproprietaire: buildCoproprietaire(meeting?.president_id, presidentName),
        },
        {
          role: 'secretaire',
          roleLabel: estGestionnaire
            ? `Secrétaire de séance (représentant le syndic ${representeSyndic})`
            : 'Secrétaire de séance',
          name: secretaryName,
          coproprietaire: buildCoproprietaire(meeting?.secretary_id, secretaryName),
        },
        {
          role: 'scrutateur',
          roleLabel: 'Scrutateur',
          name: scrutineerName,
          coproprietaire: buildCoproprietaire(meeting?.scrutineer1_id, scrutineerName),
        },
      ];

      const hasExistingData = signataires.some((s) => s.nom || s.prenom || s.email);

      if (hasExistingData) {
        setAutoFillData(extracted);
        setShowAutoFillConfirm(true);
      } else {
        applyAutoFill(extracted);
      }
    } catch (err) {
      logger.error('PV: Auto-fill error', { agId, error: err instanceof Error ? err.message : 'Unknown' });
      alert('Erreur lors de la récupération des données du bureau.');
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

    // Activate AG decisions
    try {
      const supabase = createUntypedClient();
      const { data: result } = await supabase.rpc('activate_ag_decisions', {
        p_ag_id: agId,
      });

      if (result) {
        const typedResult = result as { activated: number; failed: number };
        setActivationResult(typedResult);

        if (typedResult.activated > 0 || typedResult.failed > 0) {
          setShowActivationRecap(true);
        }

        if (typedResult.failed > 0) {
          logger.warn('PV: Activation partielle', { agId, result: typedResult });
        }
      }
    } catch (err) {
      logger.error('PV: Activation error', { agId, error: err instanceof Error ? err.message : 'Unknown' });
    }

    setShowSignatairesModal(false);
    setIsSigned(true);
    await saveDraft(agId, 'milestones', { pvSigned: true }, 'ag-pv-signed-' + agId);

    // Clore la session et créer les ag_pending_actions pour la finalisation
    try {
      const supabase = createUntypedClient();
      await supabase.rpc('finish_ag_session', { p_ag_id: agId });
      await updateAgCurrentStep(agId, 9);
      router.push(`/ag/${agId}/finalisation`);
    } catch (err) {
      logger.error('PV: finish_ag_session error', { agId, error: err instanceof Error ? err.message : 'Unknown' });
      router.push(`/ag/${agId}/finalisation`);
    }
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
    // Navigate to step 9 (finalisation) instead of dashboard
    router.push(`/ag/${agId}/finalisation`);
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

    // Activation
    showActivationRecap,
    activationResult,
    setShowActivationRecap,

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
    handleRetry,
  };
}
