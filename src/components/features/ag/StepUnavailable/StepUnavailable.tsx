'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './StepUnavailable.module.css';

interface StepUnavailableProps {
    /** Message expliquant pourquoi l'étape est indisponible */
    reason: string;
    /** URL de redirection vers l'étape requise */
    redirectUrl?: string;
    /** Libellé du bouton de redirection */
    redirectLabel?: string;
    /** URL pour retourner en arrière */
    backUrl?: string;
    /** Libellé du bouton retour */
    backLabel?: string;
    /** Indique si une redirection automatique est en cours */
    isRedirecting?: boolean;
}

export function StepUnavailable({
    reason,
    redirectUrl,
    redirectLabel = 'Accéder à l\'étape requise',
    backUrl,
    backLabel = 'Retour',
    isRedirecting = false,
}: StepUnavailableProps) {
    const router = useRouter();

    const handleRedirect = () => {
        if (redirectUrl) {
            router.push(redirectUrl);
        }
    };

    const handleBack = () => {
        if (backUrl) {
            router.push(backUrl);
        } else {
            router.back();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <AlertTriangle size={48} className={styles.icon} aria-hidden="true" />
                </div>

                <h2 className={styles.title}>Étape indisponible</h2>

                <p className={styles.reason}>{reason}</p>

                {isRedirecting && (
                    <p className={styles.redirectingMessage}>
                        Redirection en cours...
                    </p>
                )}

                <div className={styles.actions}>
                    <button
                        onClick={handleBack}
                        className="btn btn-secondary"
                        disabled={isRedirecting}
                    >
                        <ArrowLeft size={18} aria-hidden="true" />
                        {backLabel}
                    </button>

                    {redirectUrl && (
                        <button
                            onClick={handleRedirect}
                            className="btn btn-primary"
                            disabled={isRedirecting}
                        >
                            {redirectLabel}
                            <ArrowRight size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StepUnavailable;
