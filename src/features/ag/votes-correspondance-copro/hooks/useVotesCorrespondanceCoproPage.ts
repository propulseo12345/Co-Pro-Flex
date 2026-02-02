'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export type VoteChoice = 'POUR' | 'CONTRE' | 'ABSTENTION' | 'NON_VOTE';

export interface Resolution {
  id: string;
  titre: string;
  texte: string;
  numero: number;
}

export interface CoproprietaireData {
  id: string;
  full_name: string;
  email: string | null;
  tantiemes: number;
}

export interface VoteState {
  resolutionId: string;
  choix: VoteChoice;
  dateVote: string;
}

const mapVoteFromDB = (vote: string): VoteChoice => {
  const mapping: Record<string, VoteChoice> = {
    'for': 'POUR',
    'against': 'CONTRE',
    'abstention': 'ABSTENTION',
  };
  return mapping[vote] || 'NON_VOTE';
};

const mapVoteToDB = (choix: VoteChoice): string | null => {
  const mapping: Record<string, string> = {
    'POUR': 'for',
    'CONTRE': 'against',
    'ABSTENTION': 'abstention',
  };
  return mapping[choix] || null;
};

export function useVotesCorrespondanceCoproPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;
  const coproprietaireId = params.coproId as string;

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [copro, setCopro] = useState<CoproprietaireData | null>(null);
  const [votes, setVotes] = useState<VoteState[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    if (!isValidUUID(agId) || !isValidUUID(coproprietaireId)) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      try {
        const supabase = createUntypedClient();

        // 1. Load coproprietaire from view (has display_name and total_tantiemes)
        const { data: coproData, error: coproError } = await supabase
          .from('v_coproprietaires_overview')
          .select('id, display_name, email, total_tantiemes')
          .eq('id', coproprietaireId)
          .limit(1)
          .single();

        if (coproError || !coproData) {
          console.error('[VotesCorrespondanceCoproPage] Coproprietaire not found:', coproError);
          setIsLoading(false);
          return;
        }

        // Map view result to expected format
        setCopro({
          id: coproData.id,
          full_name: coproData.display_name,
          email: coproData.email,
          tantiemes: coproData.total_tantiemes,
        });

        // 2. Load resolutions for this AG
        const { data: resolutionsData, error: resError } = await supabase
          .from('ag_resolutions')
          .select('id, title, description, resolution_number')
          .eq('ag_id', agId)
          .order('resolution_number', { ascending: true });

        if (resError) {
          console.error('[VotesCorrespondanceCoproPage] Error loading resolutions:', resError);
        }

        const mappedResolutions: Resolution[] = (resolutionsData || []).map((r: {
          id: string;
          title: string;
          description: string | null;
          resolution_number: number;
        }) => ({
          id: r.id,
          titre: r.title,
          texte: r.description || '',
          numero: r.resolution_number,
        }));
        setResolutions(mappedResolutions);

        // 3. Load existing votes for this coproprietaire
        const { data: existingVotes, error: votesError } = await supabase
          .from('ag_votes')
          .select('resolution_id, vote, updated_at')
          .eq('coproprietaire_id', coproprietaireId)
          .eq('vote_source', 'correspondence');

        if (votesError) {
          console.error('[VotesCorrespondanceCoproPage] Error loading votes:', votesError);
        }

        // Map votes from DB
        const voteMap: Record<string, { choix: VoteChoice; dateVote: string }> = {};
        (existingVotes || []).forEach((v: { resolution_id: string; vote: string; updated_at: string }) => {
          const choix = mapVoteFromDB(v.vote);
          voteMap[v.resolution_id] = {
            choix,
            dateVote: v.updated_at,
          };
        });

        // Build initial votes state
        const initialVotes: VoteState[] = mappedResolutions.map(res => ({
          resolutionId: res.id,
          choix: voteMap[res.id]?.choix || 'NON_VOTE',
          dateVote: voteMap[res.id]?.dateVote || '',
        }));

        setVotes(initialVotes);

        // Check if already validated (all votes cast)
        const allVoted = initialVotes.every(v => v.choix !== 'NON_VOTE');
        setIsValidated(allVoted && initialVotes.length > 0);

      } catch (err) {
        console.error('[VotesCorrespondanceCoproPage] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [agId, coproprietaireId]);

  const handleVoteChange = useCallback((resolutionId: string, choix: VoteChoice) => {
    if (isValidated) return;

    setVotes(prev =>
      prev.map(vote =>
        vote.resolutionId === resolutionId
          ? { ...vote, choix, dateVote: new Date().toISOString() }
          : vote
      )
    );
  }, [isValidated]);

  const handleSave = useCallback(async () => {
    if (!isValidUUID(agId) || !copro) return;

    setIsSaving(true);

    try {
      const supabase = createUntypedClient();

      // Build votes array for RPC
      const votesToSave = votes
        .filter(v => v.choix !== 'NON_VOTE')
        .map(v => ({
          resolution_id: v.resolutionId,
          vote: mapVoteToDB(v.choix),
          tantiemes: copro.tantiemes,
        }));

      const { data, error } = await supabase.rpc('save_votes_correspondance', {
        p_ag_id: agId,
        p_coproprietaire_id: coproprietaireId,
        p_votes: votesToSave,
        p_status: 'draft',
      });

      if (error) {
        console.error('[VotesCorrespondanceCoproPage] Error saving:', error);
        alert('Erreur lors de la sauvegarde');
      } else if (data?.success) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      console.error('[VotesCorrespondanceCoproPage] Save error:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [agId, coproprietaireId, copro, votes]);

  const handleValider = useCallback(async () => {
    if (!isValidUUID(agId) || !copro) return;

    // Check incomplete votes
    const votesNonRenseignes = votes.filter(v => v.choix === 'NON_VOTE').length;
    if (votesNonRenseignes > 0) {
      if (!confirm(`${votesNonRenseignes} vote(s) n'est/ne sont pas renseigne(s). Voulez-vous quand meme valider ?`)) {
        return;
      }
    }

    setIsSaving(true);

    try {
      const supabase = createUntypedClient();

      // Build votes array for RPC
      const votesToSave = votes
        .filter(v => v.choix !== 'NON_VOTE')
        .map(v => ({
          resolution_id: v.resolutionId,
          vote: mapVoteToDB(v.choix),
          tantiemes: copro.tantiemes,
        }));

      const { data, error } = await supabase.rpc('save_votes_correspondance', {
        p_ag_id: agId,
        p_coproprietaire_id: coproprietaireId,
        p_votes: votesToSave,
        p_status: 'validated',
      });

      if (error) {
        console.error('[VotesCorrespondanceCoproPage] Error validating:', error);
        alert('Erreur lors de la validation');
      } else if (data?.success) {
        setIsValidated(true);
        alert('Vote par correspondance valide avec succes !');
        router.back();
      }
    } catch (err) {
      console.error('[VotesCorrespondanceCoproPage] Validate error:', err);
      alert('Erreur lors de la validation');
    } finally {
      setIsSaving(false);
    }
  }, [agId, coproprietaireId, copro, votes, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const votesComplets = votes.filter(v => v.choix !== 'NON_VOTE').length;
  const totalVotes = resolutions.length;
  const progression = totalVotes > 0 ? Math.round((votesComplets / totalVotes) * 100) : 0;

  return {
    // Data
    copro,
    resolutions,
    votes,
    // State
    isLoading,
    isSaving,
    isValidated,
    savedMessage,
    // Computed
    votesComplets,
    totalVotes,
    progression,
    // Handlers
    handleVoteChange,
    handleSave,
    handleValider,
    handleBack,
  };
}
