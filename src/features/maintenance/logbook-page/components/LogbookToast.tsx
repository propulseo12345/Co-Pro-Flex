'use client';

import { ToastCreation } from '@/components/features/maintenance/Logbook';
import type { ToastState } from '../hooks/useLogbookPage';

export interface LogbookToastProps {
    toast: ToastState;
}

export function LogbookToast({ toast }: LogbookToastProps) {
    if (!toast.toastCreation) {
        return null;
    }

    return (
        <ToastCreation
            visible={toast.toastCreation.visible}
            type={toast.toastCreation.type}
            titre={toast.toastCreation.titre}
            message={toast.toastCreation.message}
            intervention={toast.toastCreation.intervention}
            estVisibleAvecFiltre={toast.toastCreation.estVisibleAvecFiltre}
            labelFiltre={toast.toastCreation.labelFiltre}
            onClose={toast.fermerToastCreation}
            onAfficherTout={toast.voirInterventionCreee}
        />
    );
}
