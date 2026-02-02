/**
 * Façade useConvocationData - API publique IDENTIQUE à l'original
 *
 * Cette façade compose useConvocationCore et expose
 * exactement le même shape qu'avant le refactoring.
 */

import type {
  UseConvocationDataOptions,
  UseConvocationDataReturn,
} from '../types';
import { useConvocationCore } from './useConvocationCore';

export function useConvocationData(
  options: UseConvocationDataOptions
): UseConvocationDataReturn {
  const {
    state,
    reload,
    setCoproprietaires,
    setSendingChoices,
    saveCoproprietaires,
    saveSendingChoices,
  } = useConvocationCore(options);

  return {
    ...state,
    reload,
    setCoproprietaires,
    setSendingChoices,
    saveCoproprietaires,
    saveSendingChoices,
  };
}
