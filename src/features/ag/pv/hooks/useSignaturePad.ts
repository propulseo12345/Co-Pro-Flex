'use client';

import { useEffect, useCallback, RefObject } from 'react';

interface UseSignaturePadProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isOpen: boolean;
  isDrawing: boolean;
  setIsDrawing: (value: boolean) => void;
}

export function useSignaturePad({ canvasRef, isOpen, isDrawing, setIsDrawing }: UseSignaturePadProps) {
  // Initialize canvas when modal opens
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, canvasRef]);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      let x: number, y: number;

      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [canvasRef, setIsDrawing]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      let x: number, y: number;

      if ('touches' in e) {
        e.preventDefault();
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [canvasRef, isDrawing]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, [setIsDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  return {
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
  };
}
