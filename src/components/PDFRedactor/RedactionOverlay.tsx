import { useRef, useEffect, useCallback, PointerEvent } from 'react';
import type { RedactionArea } from '@/lib/redaction-types';

interface RedactionOverlayProps {
    width: number;   // CSS pixels (== PDFViewer canvas CSS width)
    height: number;  // CSS pixels (== PDFViewer canvas CSS height)
    scale: number;   // current zoom scale
    pageIndex: number;
    redactions: RedactionArea[];
    onAddRedaction: (redaction: RedactionArea) => void;
    pdfHeightPoints: number; // Height of the page in PDF points (unscaled)
}

export function RedactionOverlay({
    width,
    height,
    scale,
    pageIndex,
    redactions,
    onAddRedaction,
    pdfHeightPoints,
}: RedactionOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const isDrawingRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });

    // Keep latest props in refs so event handlers always see fresh values
    const propsRef = useRef({ width, height, scale, pageIndex, redactions, pdfHeightPoints });
    useEffect(() => {
        propsRef.current = { width, height, scale, pageIndex, redactions, pdfHeightPoints };
    });

    // ---- Canvas sizing with DPR ----
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
    }, [width, height]);

    useEffect(() => {
        setupCanvas();
    }, [setupCanvas]);

    // ---- Draw ----
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width: w, height: h, scale: s, pageIndex: pIdx, redactions: rects, pdfHeightPoints: pdfH } = propsRef.current;

        // Reset transform to account for any previous scale, then apply DPR
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Draw committed redactions for this page
        const pageRedactions = rects.filter(r => r.pageIndex === pIdx);
        for (const r of pageRedactions) {
            // Convert from PDF point space (bottom-left origin) → CSS pixel space (top-left origin)
            const x = r.x * s;
            const rh = r.height * s;
            const y = (pdfH - r.y - r.height) * s;
            const rw = r.width * s;

            // Black fill
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(x, y, rw, rh);

            // Red border to make boxes visible on dark content
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.5, y + 0.5, rw - 1, rh - 1);
        }

        // Draw in-progress selection rectangle
        if (isDrawingRef.current) {
            const sx = startPosRef.current.x;
            const sy = startPosRef.current.y;
            const cx = currentPosRef.current.x;
            const cy = currentPosRef.current.y;
            const rx = Math.min(sx, cx);
            const ry = Math.min(sy, cy);
            const rw = Math.abs(cx - sx);
            const rh = Math.abs(cy - sy);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(rx, ry, rw, rh);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
            ctx.setLineDash([]);
        }
    }, []); // stable — reads from refs

    const scheduleDraw = useCallback(() => {
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            draw();
        });
    }, [draw]);

    // Re-draw whenever visual inputs change
    useEffect(() => {
        draw();
    }, [draw, width, height, scale, pageIndex, redactions, pdfHeightPoints]);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // ---- Pointer coordinate helpers ----
    const getCoords = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        const coords = getCoords(e.clientX, e.clientY);
        isDrawingRef.current = true;
        startPosRef.current = coords;
        currentPosRef.current = coords;
        e.currentTarget.setPointerCapture(e.pointerId);
        scheduleDraw();
    };

    const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        currentPosRef.current = getCoords(e.clientX, e.clientY);
        scheduleDraw();
    };

    const finishDrawing = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        const { scale: s, pdfHeightPoints: pdfH, pageIndex: pIdx } = propsRef.current;
        const startPos = startPosRef.current;
        const currentPos = currentPosRef.current;

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x);
        const h = Math.abs(currentPos.y - startPos.y);

        // Minimum 8x8 CSS pixels to avoid accidental tiny boxes
        if (w > 8 && h > 8) {
            const pdfX = x / s;
            const pdfW = w / s;
            const pdfH2 = h / s;
            // Convert canvas top-left y to PDF bottom-left y
            const pdfY = pdfH - (y / s) - pdfH2;

            onAddRedaction({
                pageIndex: pIdx,
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH2,
            });
        }
        scheduleDraw();
    };

    const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
        finishDrawing();
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: 'crosshair',
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={finishDrawing}
            onPointerLeave={finishDrawing}
        />
    );
}
