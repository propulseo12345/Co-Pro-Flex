'use client';

import { StepUnavailable } from '@/components/features/ag';

interface PreparationStepUnavailableProps {
  agId: string;
  blockReason: string | null;
  redirectUrl: string | null;
  isRedirecting?: boolean;
}

export function PreparationStepUnavailable({
  agId,
  blockReason,
  redirectUrl,
  isRedirecting = false,
}: PreparationStepUnavailableProps) {
  return (
    <div className="container">
      <StepUnavailable
        reason={blockReason || (isRedirecting ? 'Prerequis non satisfaits' : 'Cette etape n\'est pas accessible.')}
        redirectUrl={redirectUrl || `/ag/${agId}/agenda`}
        redirectLabel="Acceder a l'ordre du jour"
        backUrl={`/ag/${agId}/envoi`}
        backLabel="Retour a l'envoi"
        isRedirecting={isRedirecting}
      />
    </div>
  );
}
