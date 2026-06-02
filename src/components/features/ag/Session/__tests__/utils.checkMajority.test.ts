import { describe, it, expect } from 'vitest';

import { checkMajority, type CheckMajorityOptions } from '@/components/features/ag/Session/utils';
import type { Resolution, VoteStats } from '@/components/features/ag/Session/types';

/**
 * Protège le correctif V0 du calcul de majorité AG :
 * - Art. 24 / Art. 25-1 : majorité simple = `pour > contre`,
 *   les abstentions et les défaillants sont HORS décompte.
 * - Art. 25 : majorité absolue = `pour >= floor(total/2) + 1`.
 *
 * Les objets VoteStats sont construits via le vrai type (jamais `any`).
 */

const makeStats = (pour: number, contre: number, abstention: number, nonVote = 0): VoteStats => {
  const total = pour + contre + abstention + nonVote;
  return {
    pour,
    contre,
    abstention,
    nonVote,
    total,
    pourcentagePour: total > 0 ? (pour / total) * 100 : 0,
  };
};

const makeResolution = (majorite: string): Resolution => ({
  id: 'res-test',
  titre: 'Résolution de test',
  texte: 'Texte de test',
  majorite,
});

// Aucun vote individuel n'est nécessaire pour les majorités testées :
// Art. 24 / 25-1 / 25 ne consultent pas le tableau `votes`.
const noVotes: never[] = [];

describe('checkMajority — ART_24 (majorité simple, abstentions hors décompte)', () => {
  const resolution = makeResolution('ART_24');
  const options: CheckMajorityOptions = { totalTantiemes: 110, totalCoproprietaires: 3 };

  it('adopte quand pour=40 > contre=30 même avec 40 d\'abstention (l\'abstention ne compte PAS au dénominateur)', () => {
    const result = checkMajority(resolution, makeStats(40, 30, 40), noVotes, options);
    expect(result.adopted).toBe(true);
  });

  it('adopte quand pour=60 > contre=40', () => {
    const result = checkMajority(resolution, makeStats(60, 40, 0), noVotes, options);
    expect(result.adopted).toBe(true);
  });

  it('rejette quand pour=40 < contre=60', () => {
    const result = checkMajority(resolution, makeStats(40, 60, 0), noVotes, options);
    expect(result.adopted).toBe(false);
  });

  it('rejette en cas d\'égalité pour=30 = contre=30 (strictement supérieur requis)', () => {
    const result = checkMajority(resolution, makeStats(30, 30, 0), noVotes, options);
    expect(result.adopted).toBe(false);
  });
});

describe('checkMajority — ART_25_1 (passerelle 25→24, majorité simple)', () => {
  const resolution = makeResolution('ART_25_1');
  const options: CheckMajorityOptions = { totalTantiemes: 110, totalCoproprietaires: 3 };

  it('adopte quand pour=40 > contre=30 malgré 40 d\'abstention', () => {
    const result = checkMajority(resolution, makeStats(40, 30, 40), noVotes, options);
    expect(result.adopted).toBe(true);
  });
});

describe('checkMajority — ART_25 (majorité absolue de tous les tantièmes)', () => {
  const resolution = makeResolution('ART_25');
  const options: CheckMajorityOptions = { totalTantiemes: 1000, totalCoproprietaires: 10 };

  it('adopte quand pour=600 atteint le seuil de 501 sur 1000', () => {
    const result = checkMajority(resolution, makeStats(600, 200, 0), noVotes, options);
    expect(result.adopted).toBe(true);
  });

  it('rejette quand pour=400 sous le seuil de 501 sur 1000', () => {
    const result = checkMajority(resolution, makeStats(400, 200, 0), noVotes, options);
    expect(result.adopted).toBe(false);
  });
});
