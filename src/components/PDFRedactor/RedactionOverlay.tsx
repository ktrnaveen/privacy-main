import { useRef, useEffect, PointerEvent } from 'react';
import type { RedactionArea } from '@/lib/redaction-types';

interface RedactionOverlayProps {
    width: number;
    height: number;
    scale: number;
    pageIndex: number;
    redactions: RedactionArea[];
    onAddRedaction: (redaction: RedactionArea) => void;
    pdfHeightPoints: number; // Height of the page in PDF points (72 DPI)
}

export function RedactionOverlay({
    width,
    height,
    scale,
    pageIndex,
    redactions,
    onAddRedaction,
    pdfHeightPoints
}: RedactionOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const isDrawingRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const pageRedactions = redactions.filter(r => r.pageIndex === pageIndex);
        pageRedactions.forEach((r) => {
            const x = r.x * scale;
            const h = r.height * scale;
            const y = (pdfHeightPoints - r.y) * scale - h;
            const w = r.width * scale;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        });

        if (isDrawingRef.current) {
            const startPos = startPosRef.current;
            const currentPos = currentPosRef.current;
            const rectX = Math.min(startPos.x, currentPos.x);
            const rectY = Math.min(startPos.y, currentPos.y);
            const rectW = Math.abs(currentPos.x - startPos.x);
            const rectH = Math.abs(currentPos.y - startPos.y);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(rectX, rectY, rectW, rectH);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
            ctx.setLineDash([]);
        }
    };

    const scheduleDraw = () => {
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            draw();
        });
    };

    // Render existing redactions
    useEffect(() => {
        draw();
    }, [width, height, scale, pageIndex, redactions, pdfHeightPoints]);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    const getCoords = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
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

        const startPos = startPosRef.current;
        const currentPos = currentPosRef.current;
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x);
        const h = Math.abs(currentPos.y - startPos.y);

        if (w > 5 && h > 5) {
            const pdfX = x / scale;
            const pdfW = w / scale;
            const pdfH = h / scale;
            const pdfY = pdfHeightPoints - (y / scale) - pdfH;

            onAddRedaction({
                pageIndex,
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH
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
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: 'crosshair',
                touchAction: 'none'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={finishDrawing}
            onPointerLeave={finishDrawing}
        />
    );
}
