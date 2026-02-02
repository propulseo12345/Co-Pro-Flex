import type { VoteChoice } from '../types';
import type { VoteDirection, MajorityType as DbMajorityType } from '@/lib/ag/types';
import type { MajorityType } from '@/lib/constants/resolutions';

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function toDbVote(vote: VoteChoice): VoteDirection | null {
  if (vote === 'POUR') return 'for';
  if (vote === 'CONTRE') return 'against';
  if (vote === 'ABSTENTION') return 'abstention';
  return null;
}

export function fromDbVote(vote: VoteDirection): VoteChoice {
  if (vote === 'for') return 'POUR';
  if (vote === 'against') return 'CONTRE';
  if (vote === 'abstention') return 'ABSTENTION';
  return null;
}

export function fromDbMajorityType(type: DbMajorityType): MajorityType {
  const map: Record<DbMajorityType, MajorityType> = {
    'art24': 'ART_24',
    'art25': 'ART_25',
    'art25_1': 'ART_25_1',
    'art26': 'ART_26',
    'art26_1': 'ART_26_1',
    'unanimity': 'UNANIMITE',
  };
  return map[type] || 'ART_24';
}
