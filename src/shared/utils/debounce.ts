/**
 * Crée une fonction debounced qui retarde l'exécution
 * @param fn - Fonction à debouncer
 * @param delay - Délai en millisecondes (défaut: 300ms)
 * @returns Fonction debounced avec méthode cancel
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number = 300
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T & { cancel: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

/**
 * Crée une fonction throttled qui limite les appels
 * @param fn - Fonction à throttler
 * @param limit - Intervalle minimum en millisecondes
 * @returns Fonction throttled
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  limit: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
      }, limit - timeSinceLastCall);
    }
  }) as T;
}
