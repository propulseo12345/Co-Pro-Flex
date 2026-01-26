'use client';

import { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import styles from './SignatureCanvas.module.css';

interface SignatureCanvasProps {
    onSave: (signatureData: string) => void;
    onCancel: () => void;
    initialSignature?: string;
}

export default function SignatureCanvas({ onSave, onCancel, initialSignature }: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration du canvas
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Style du stylo
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Charger la signature initiale si elle existe
        if (initialSignature) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                setHasDrawn(true);
            };
            img.src = initialSignature;
        }
    }, [initialSignature]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setHasDrawn(true);

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const signatureData = canvas.toDataURL('image/png');
        onSave(signatureData);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Veuillez signer ci-dessous</h3>
                <p className={styles.subtitle}>
                    Utilisez votre souris, trackpad ou écran tactile pour signer
                </p>
            </div>

            <div className={styles.canvasContainer}>
                <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    aria-label="Zone de signature. Utilisez votre souris ou écran tactile pour signer."
                    role="img"
                />
                {!hasDrawn && (
                    <div className={styles.placeholder}>
                        Signez ici
                    </div>
                )}
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={clearSignature}
                    className="btn btn-secondary"
                    disabled={!hasDrawn}
                >
                    <RotateCcw size={16} aria-hidden="true" />
                    Effacer
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                >
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={saveSignature}
                    className="btn btn-primary"
                    disabled={!hasDrawn}
                >
                    <Check size={16} aria-hidden="true" />
                    Valider la signature
                </button>
            </div>
        </div>
    );
}
