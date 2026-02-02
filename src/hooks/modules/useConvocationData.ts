/**
 * Hook pour charger les données de la page Convocation
 *
 * ÉTAPE 3 - 100% DB-driven
 *
 * Ce fichier est un proxy qui re-exporte depuis le module refactoré
 * pour maintenir la rétrocompatibilité des imports existants.
 *
 * @see src/features/ag/convocation/hooks/useConvocationData.ts
 */

export { useConvocationData } from '@/features/ag/convocation/hooks/useConvocationData';

export type {
  AdressePostale,
  AGData,
  Resolution,
  Coproprietaire,
  CoproprietaireEditable,
  CoproprieteInfo,
  SyndicInfo,
  SendingMethod,
  SendingChoice,
  LoadingStatus,
  ConvocationState,
  UseConvocationDataOptions,
  UseConvocationDataReturn,
} from '@/features/ag/convocation/types';
