'use client';

import { StepUnavailable } from '@/components/features/ag';
import { LoadingState, ErrorState } from './index';

type GuardState = 'loading' | 'allowed' | 'blocked' | 'redirecting' | 'error';

interface PvGuardStatesProps {
  guardState: GuardState;
  blockReason: string | null;
  redirectUrl: string | null;
  agId: string;
  isDataLoading: boolean;
  dataLoadError: string | null;
  hasAgData: boolean;
  onGoBack: () => void;
  onRefresh: () => void;
  onHome: () => void;
}

/**
 * Renders the appropriate guard state UI based on the current state.
 * Returns null if the page should render its main content.
 */
export function PvGuardStates({
  guardState,
  blockReason,
  redirectUrl,
  agId,
  isDataLoading,
  dataLoadError,
  hasAgData,
  onGoBack,
  onRefresh,
  onHome,
}: PvGuardStatesProps): React.ReactElement | null {
  // Guard loading state
  if (guardState === 'loading') {
    return <LoadingState message="Verification des prerequis..." />;
  }

  // Guard redirecting state
  if (guardState === 'redirecting') {
    return (
      <div className="container">
        <StepUnavailable
          reason={blockReason || 'Prerequis non satisfaits'}
          redirectUrl={redirectUrl || undefined}
          redirectLabel="Acceder a l'ordre du jour"
          backUrl={`/ag/${agId}/session`}
          backLabel="Retour a la session"
          isRedirecting
        />
      </div>
    );
  }

  // Guard blocked/error state
  if (guardState === 'blocked' || guardState === 'error') {
    return (
      <div className="container">
        <StepUnavailable
          reason={blockReason || "Cette etape n'est pas accessible."}
          redirectUrl={redirectUrl || `/ag/${agId}/agenda`}
          redirectLabel="Acceder a l'ordre du jour"
          backUrl={`/ag/${agId}/session`}
          backLabel="Retour a la session"
        />
      </div>
    );
  }

  // Data loading state
  if (isDataLoading) {
    return (
      <LoadingState
        message="Chargement des donnees de l'AG..."
        hint="Si le chargement persiste, verifiez vos donnees ou rafraichissez la page."
      />
    );
  }

  // Data load error state
  if (dataLoadError) {
    return (
      <ErrorState
        title="Erreur de chargement"
        message={dataLoadError}
        onRefresh={onRefresh}
        onBack={onGoBack}
      />
    );
  }

  // No AG data state
  if (!hasAgData) {
    return (
      <ErrorState
        title="Assemblee non trouvee"
        message="Les donnees de cette AG n'ont pas ete trouvees. Verifiez que vous avez bien complete les etapes precedentes."
        iconColor="var(--color-warning)"
        onBack={onGoBack}
        onHome={onHome}
      />
    );
  }

  // All guards passed - render main content
  return null;
}
