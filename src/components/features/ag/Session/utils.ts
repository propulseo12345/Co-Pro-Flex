import { VoteData, VoteStats, MajorityResult, Resolution, VoteChoice } from './types';
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

export interface CheckMajorityOptions {
  totalTantiemes: number;
  totalCoproprietaires: number;
}

export const checkMajority = (
  resolution: Resolution,
  stats: VoteStats,
  votes: VoteData[],
  options?: CheckMajorityOptions
): MajorityResult => {
  const majoriteType = resolution.majorite as MajorityType;
  const majoriteInfo = MAJORITES[majoriteType];

  if (!majoriteInfo) {
    return { adopted: false, reason: 'Type de majorité non reconnu' };
  }

  // Use provided totals or compute from votes
  const totalTantiemes = options?.totalTantiemes ?? stats.total;
  const totalCoproprietaires = options?.totalCoproprietaires ?? 0;
  const resolutionVotes = votes.filter(v => v.resolutionId === resolution.id);

  switch (majoriteType) {
    case 'ART_24': {
      // Art. 24 : majorité simple = pour > contre (abstentions et défaillants hors décompte) — aligné sur la RPC calculate_resolution_result
      const majoriteSimple = stats.pour > stats.contre;
      return {
        adopted: majoriteSimple,
        reason: majoriteSimple
          ? `Adoptée : ${stats.pour} tantièmes pour contre ${stats.contre} (majorité simple, abstentions exclues)`
          : `Rejetée : ${stats.pour} tantièmes pour contre ${stats.contre} (majorité simple, abstentions exclues)`
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
      // Passerelle 25→24 : second vote à la majorité simple de l'Art. 24 = pour > contre (abstentions exclues)
      const adoptedArt251 = stats.pour > stats.contre;
      return {
        adopted: adoptedArt251,
        reason: adoptedArt251
          ? `Adoptée (passerelle 25-1) : ${stats.pour} tantièmes pour contre ${stats.contre} (majorité simple, abstentions exclues)`
          : `Rejetée (passerelle 25-1) : ${stats.pour} tantièmes pour contre ${stats.contre} (majorité simple, abstentions exclues)`
      };
    }

    case 'ART_26': {
      const seuilTantiemesArt26 = Math.floor(totalTantiemes * 2 / 3) + 1;
      const coprosPourArt26 = resolutionVotes.filter(v => v.vote === 'POUR').length;
      const seuilCoprosArt26 = Math.floor(totalCoproprietaires / 2) + 1;
      const adoptedArt26 = coprosPourArt26 >= seuilCoprosArt26 && stats.pour >= seuilTantiemesArt26;

      // Passerelle 26-1: si échec mais au moins 1/2 des tantièmes
      const seuilDemiPourPasserelle261 = Math.floor(totalTantiemes / 2) + 1;
      const passerelle261Eligible = !adoptedArt26 && stats.pour >= seuilDemiPourPasserelle261;

      return {
        adopted: adoptedArt26,
        reason: adoptedArt26
          ? `Adoptée : ${coprosPourArt26} copropriétaires pour (seuil: ${seuilCoprosArt26}) ET ${stats.pour} tantièmes pour (seuil: ${seuilTantiemesArt26})`
          : `Rejetée : ${coprosPourArt26} copropriétaires pour (seuil requis: ${seuilCoprosArt26}) ET/OU ${stats.pour} tantièmes pour (seuil requis: ${seuilTantiemesArt26})`,
        passerelle261Eligible,
        passerelle261Data: passerelle261Eligible ? {
          pourTantiemes: stats.pour,
          totalTantiemes,
          seuilDemiTantiemes: seuilDemiPourPasserelle261,
          coprosPour: coprosPourArt26,
          totalCoproprietaires
        } : undefined
      };
    }

    case 'ART_26_1': {
      // Second vote à la majorité de l'article 25 (majorité absolue)
      const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;
      const adopted261 = stats.pour >= seuilArt25;
      return {
        adopted: adopted261,
        reason: adopted261
          ? `Adoptée (passerelle 26-1) : ${stats.pour} tantièmes pour (seuil: ${seuilArt25})`
          : `Rejetée (passerelle 26-1) : ${stats.pour} tantièmes pour (seuil requis: ${seuilArt25})`
      };
    }

    case 'UNANIMITE': {
      const tousPour = totalCoproprietaires > 0 && resolutionVotes.length === totalCoproprietaires && resolutionVotes.every(v => v.vote === 'POUR');
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
    const value = resolution.variables?.[variableName] || variableValues[variableName];
    if (!value) {
      missing.push(variableName);
    }
  }

  // Dédupliqué : un même placeholder peut apparaître plusieurs fois dans le texte
  // d'une résolution, mais ne doit être signalé qu'une fois (et garantit des clés
  // React uniques côté UI — cf. ValidationWarningModal).
  return [...new Set(missing)];
};

export const isRoleVariable = (name: string): boolean => {
  // Seuls les rôles de séance AG qui correspondent à des copropriétaires
  const roleNames = ['nom_president', 'nom_secretaire', 'nom_scrutateur', 'noms'];
  const n = name.toLowerCase();
  return roleNames.includes(n) || n.startsWith('nom_membre') || n.startsWith('nom_ancien');
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
