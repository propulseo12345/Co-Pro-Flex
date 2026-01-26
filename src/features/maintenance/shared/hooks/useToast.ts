'use client';

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
    message: string;
    type: ToastType;
}

export function useToast(autoDismissMs = 4000) {
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
        if (autoDismissMs > 0) {
            setTimeout(() => setToast(null), autoDismissMs);
        }
    }, [autoDismissMs]);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    return { toast, showToast, hideToast };
}
