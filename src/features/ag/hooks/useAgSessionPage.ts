/**
 * Proxy hook for backwards compatibility
 *
 * This file re-exports from the refactored module structure.
 * The actual implementation is now in src/features/ag/session/
 *
 * @see src/features/ag/session/hooks/useAgSessionPage.ts
 */

export { useAgSessionPage } from '../session/hooks/useAgSessionPage';
