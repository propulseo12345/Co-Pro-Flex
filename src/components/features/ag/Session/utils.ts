import { VoteData, VoteStats, MajorityResult, Resolution, VoteChoice } from './types';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';

export const getResolutionStats = (votes: VoteData[], resolutionId: string): VoteStats => {
  const resolutionVotes = votes.filter(v => v.resolutionId === resolutionId);

  let pour = 0;
  let contre = 0;
  let abstention = 0;
  let nonVote = 0;

  resolutionVotes.forEach(v => {
    if (v.vote === 'POUR') pour += v.tantiemes;
    else if (v.vote === 'CONTRE') contre += v.tantiemes;
    else if (v.vote === 'ABSTENTION') abstention += v.tantiemes;
    else nonVote += v.tantiemes;
  });

  const total = pour + contre + abstention + nonVote;
  const pourcentagePour = total > 0 ? (pour / total) * 100 : 0;

  return { pour, contre, abstention, nonVote, total, pourcentagePour };
};

export const checkMajority = (resolution: Resolution, stats: VoteStats, votes: VoteData[]): MajorityResult => {
  const majoriteType = resolution.majorite as MajorityType;
  const majoriteInfo = MAJORITES[majoriteType];

  if (!majoriteInfo) {
    return { adopted: false, reason: 'Type de majorité non reconnu' };
  }

  const totalTantiemes = MOCK_COPROPRIETAIRES.reduce((sum, c) => sum + c.tantiemes, 0);
  const voixExprimees = stats.pour + stats.contre + stats.abstention;
  const resolutionVotes = votes.filter(v => v.resolutionId === resolution.id);

  switch (majoriteType) {
    case 'ART_24': {
      const majoriteVoixExprimees = voixExprimees > 0 && stats.pour > (voixExprimees / 2);
      return {
        adopted: majoriteVoixExprimees,
        reason: majoriteVoixExprimees
          ? `Adoptée : ${stats.pour} tantièmes pour sur ${voixExprimees} tantièmes exprimés (majorité simple requise)`
          : `Rejetée : ${stats.pour} tantièmes pour sur ${voixExprimees} tantièmes exprimés (majorité simple requise)`
      };
    }

    case 'ART_25': {
      const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;
      const adoptedArt25 = stats.pour >= seuilArt25;
      const seuilUntiers = Math.ceil(totalTantiemes / 3);
      const passerelle251Eligible = !adoptedArt25 && stats.pour >= seuilUntiers;

      return {
        adopted: adoptedArt25,
        reason: adoptedArt25
          ? `Adoptée : ${stats.pour} tantièmes pour sur ${totalTantiemes} tantièmes totaux (seuil: ${seuilArt25})`
          : `Rejetée : ${stats.pour} tantièmes pour sur ${totalTantiemes} tantièmes totaux (seuil requis: ${seuilArt25})`,
        passerelle251Eligible,
        passerelle251Data: passerelle251Eligible ? {
          pourTantiemes: stats.pour,
          totalTantiemes,
          seuilUntiers
        } : undefined
      };
    }

    case 'ART_25_1': {
      const seuilCopros = Math.floor(MOCK_COPROPRIETAIRES.length / 2) + 1;
      const coprosPour = resolutionVotes.filter(v => v.vote === 'POUR').length;
      const seuilTantiemes = (totalTantiemes * 2) / 3;
      const adoptedArt251 = coprosPour >= seuilCopros && stats.pour >= seuilTantiemes;
      return {
        adopted: adoptedArt251,
        reason: adoptedArt251
          ? `Adoptée : ${coprosPour} copropriétaires pour (seuil: ${seuilCopros}) ET ${stats.pour} tantièmes pour (seuil: ${seuilTantiemes.toFixed(0)})`
          : `Rejetée : ${coprosPour} copropriétaires pour (seuil requis: ${seuilCopros}) ET/OU ${stats.pour} tantièmes pour (seuil requis: ${seuilTantiemes.toFixed(0)})`
      };
    }

    case 'ART_26': {
      const seuilTantiemesArt26 = (totalTantiemes * 2) / 3;
      const coprosPourArt26 = resolutionVotes.filter(v => v.vote === 'POUR').length;
      const seuilCoprosArt26 = Math.floor(MOCK_COPROPRIETAIRES.length / 2) + 1;
      const adoptedArt26 = coprosPourArt26 >= seuilCoprosArt26 && stats.pour >= seuilTantiemesArt26;
      return {
        adopted: adoptedArt26,
        reason: adoptedArt26
          ? `Adoptée : ${coprosPourArt26} copropriétaires pour (seuil: ${seuilCoprosArt26}) ET ${stats.pour} tantièmes pour (seuil: ${seuilTantiemesArt26.toFixed(0)})`
          : `Rejetée : ${coprosPourArt26} copropriétaires pour (seuil requis: ${seuilCoprosArt26}) ET/OU ${stats.pour} tantièmes pour (seuil requis: ${seuilTantiemesArt26.toFixed(0)})`
      };
    }

    case 'UNANIMITE': {
      const tousPour = resolutionVotes.length === MOCK_COPROPRIETAIRES.length && resolutionVotes.every(v => v.vote === 'POUR');
      return {
        adopted: tousPour,
        reason: tousPour
          ? `Adoptée à l'unanimité : tous les copropriétaires ont voté pour`
          : `Rejetée : unanimité requise (tous les copropriétaires doivent voter pour)`
      };
    }

    default:
      return { adopted: false, reason: 'Type de majorité non reconnu' };
  }
};

export const getVoteForCopro = (votes: VoteData[], resolutionId: string, coproId: string): VoteChoice => {
  const voteData = votes.find(
    v => v.resolutionId === resolutionId && v.coproprietaireId === coproId
  );
  return voteData?.vote || null;
};

export const hasVotedByCorrespondance = (votes: VoteData[], resolutionId: string, coproId: string): boolean => {
  const voteData = votes.find(
    v => v.resolutionId === resolutionId && v.coproprietaireId === coproId
  );
  return voteData?.source === 'CORRESPONDANCE';
};

export const validateResolutionVariables = (resolution: Resolution, variableValues: Record<string, string>): string[] => {
  if (!resolution.texte) return [];

  const variablePattern = /\{([^}]+)\}/g;
  const missing: string[] = [];
  let match;

  while ((match = variablePattern.exec(resolution.texte)) !== null) {
    const variableName = match[1];
    if (!variableValues[variableName]) {
      missing.push(variableName);
    }
  }

  return missing;
};

export const isRoleVariable = (name: string): boolean => {
  const roleKeywords = ['president', 'secretaire', 'scrutateur', 'gestionnaire', 'syndic', 'nom', 'prenom'];
  return roleKeywords.some(keyword => name.toLowerCase().includes(keyword));
};

export const generatePasserelleMentionPV = (
  voteInitial: { pour: number; contre: number; abstention: number },
  secondVote: { pour: number; contre: number; abstention: number } | null,
  resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE',
  totalTantiemes: number
): string => {
  let mention = `Conformément à l'article 25-1 de la loi du 10 juillet 1965, `;
  mention += `la résolution n'ayant pas obtenu la majorité de l'article 25 `;
  mention += `(${voteInitial.pour} tantièmes pour, seuil requis: ${Math.floor(totalTantiemes / 2) + 1}), `;
  mention += `mais ayant dépassé le seuil de 1/3 des tantièmes (${Math.ceil(totalTantiemes / 3)}), `;

  if (resultat === 'AJOURNEE') {
    mention += `l'assemblée décide d'ajourner cette résolution à une nouvelle assemblée générale `;
    mention += `convoquée dans un délai de trois mois.`;
  } else if (secondVote) {
    mention += `un second vote a été organisé immédiatement à la majorité de l'article 24. `;
    mention += `Résultat du second vote : ${secondVote.pour} pour, ${secondVote.contre} contre, `;
    mention += `${secondVote.abstention} abstentions. `;
    mention += `La résolution est ${resultat === 'ADOPTEE' ? 'ADOPTÉE' : 'REJETÉE'}.`;
  }

  return mention;
};
