import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy, PageViewport, RenderTask } from 'pdfjs-dist';

interface PDFViewerProps {
    pdfDocument: PDFDocumentProxy | null;
    pageIndex: number; // 0-based
    scale: number;
    onPageRendered?: (viewport: PageViewport) => void;
}

export function PDFViewer({ pdfDocument, pageIndex, scale, onPageRendered }: PDFViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let isCancelled = false;
        let renderTask: RenderTask | null = null;

        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current) return;

            try {
                const page = await pdfDocument.getPage(pageIndex + 1); // pdfjs uses 1-based indexing
                if (isCancelled || !canvasRef.current) return;

                const viewport = page.getViewport({ scale });
                const dpr = window.devicePixelRatio || 1;

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = Math.floor(viewport.height * dpr);
                canvas.width = Math.floor(viewport.width * dpr);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                const renderContext = {
                    canvasContext: context,
                    viewport,
                    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
                };

                renderTask = page.render(renderContext);
                await renderTask.promise;
                if (isCancelled) return;

                if (onPageRendered) {
                    onPageRendered(viewport);
                }
            } catch (error) {
                const maybeCancelled = error as { name?: string };
                if (maybeCancelled?.name !== 'RenderingCancelledException') {
                    console.error('Error rendering page:', error);
                }
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDocument, pageIndex, scale, onPageRendered]);

    return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
