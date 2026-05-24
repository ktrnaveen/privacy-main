import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RedactionArea } from '@/lib/redaction-types';

export interface PDFRedactorState {
    file: File | null;
    pdfDocument: PDFDocumentProxy | null;
    pageCount: number;
    currentPage: number;
    scale: number;
    redactions: RedactionArea[];
    isProcessing: boolean;
    processingMessage: string;
    error: string | null;
}

export interface UsePDFRedactorReturn extends PDFRedactorState {
    loadPDF: (file: File) => Promise<void>;
    setPage: (page: number) => void;
    setScale: (scale: number) => void;
    addRedaction: (redaction: RedactionArea) => void;
    addRedactions: (redactions: RedactionArea[]) => void; // bulk add for auto-redact
    undoRedaction: () => void;
    clearRedactions: () => void;
    clearPageRedactions: (pageIndex: number) => void;
    saveRedactedPDF: (pageRange?: number[]) => Promise<void>;
}

const RENDER_SCALE = 2.5; // Higher = better quality output

export function usePDFRedactor(): UsePDFRedactorReturn {
    const [state, setState] = useState<PDFRedactorState>({
        file: null,
        pdfDocument: null,
        pageCount: 0,
        currentPage: 1,
        scale: 1.0,
        redactions: [],
        isProcessing: false,
        processingMessage: '',
        error: null,
    });

    const pdfjsRef = useRef<typeof import('pdfjs-dist') | null>(null);
    const pdfBytesRef = useRef<Uint8Array | null>(null);
    const fileNameRef = useRef<string>('redacted.pdf');
    // Keep a ref to current redactions so saveRedactedPDF always sees latest without stale closure
    const redactionsRef = useRef<RedactionArea[]>([]);
    const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);

    const loadPDF = useCallback(async (file: File) => {
        setState(prev => ({ ...prev, isProcessing: true, processingMessage: 'Loading PDF…', error: null }));
        try {
            const pdfjs = pdfjsRef.current ?? await import('pdfjs-dist');
            pdfjsRef.current = pdfjs;

            if (typeof window !== 'undefined') {
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            }

            const arrayBuffer = await file.arrayBuffer();
            const originalBytes = new Uint8Array(arrayBuffer);
            // Keep one copy for the viewer, one for the redaction renderer
            pdfBytesRef.current = originalBytes.slice();
            fileNameRef.current = file.name.replace(/\.pdf$/i, '') + '_redacted.pdf';

            const loadingTask = pdfjs.getDocument({ data: originalBytes.slice() });
            const pdf = await loadingTask.promise;
            pdfDocumentRef.current = pdf;

            setState(prev => ({
                ...prev,
                file,
                pdfDocument: pdf,
                pageCount: pdf.numPages,
                currentPage: 1,
                redactions: [],
                isProcessing: false,
                processingMessage: '',
                error: null,
            }));
            redactionsRef.current = [];
        } catch (err) {
            console.error('Error loading PDF:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: 'Failed to load PDF. Please make sure the file is a valid PDF and try again.',
            }));
        }
    }, []);

    const setPage = useCallback((page: number) => {
        setState(prev => {
            if (page < 1 || page > prev.pageCount) return prev;
            return { ...prev, currentPage: page };
        });
    }, []);

    const setScale = useCallback((scale: number) => {
        setState(prev => ({ ...prev, scale }));
    }, []);

    const addRedaction = useCallback((redaction: RedactionArea) => {
        setState(prev => {
            const next = [...prev.redactions, redaction];
            redactionsRef.current = next;
            return { ...prev, redactions: next };
        });
    }, []);

    const addRedactions = useCallback((newRedactions: RedactionArea[]) => {
        setState(prev => {
            const next = [...prev.redactions, ...newRedactions];
            redactionsRef.current = next;
            return { ...prev, redactions: next };
        });
    }, []);

    const undoRedaction = useCallback(() => {
        setState(prev => {
            const next = prev.redactions.slice(0, -1);
            redactionsRef.current = next;
            return { ...prev, redactions: next };
        });
    }, []);

    const clearRedactions = useCallback(() => {
        redactionsRef.current = [];
        setState(prev => ({ ...prev, redactions: [] }));
    }, []);

    const clearPageRedactions = useCallback((pageIndex: number) => {
        setState(prev => {
            const next = prev.redactions.filter(r => r.pageIndex !== pageIndex);
            redactionsRef.current = next;
            return { ...prev, redactions: next };
        });
    }, []);

    /**
     * True redaction via canvas rasterization — runs on the main thread.
     * @param pageRange Optional array of 1-indexed page numbers to include. Default = all pages.
     */
    const saveRedactedPDF = useCallback(async (pageRange?: number[]) => {
        const pdfDoc = pdfDocumentRef.current;
        const pdfBytes = pdfBytesRef.current;

        if (!pdfDoc || !pdfBytes) {
            setState(prev => ({ ...prev, error: 'No PDF loaded. Please load a PDF first.' }));
            return;
        }

        const redactions = redactionsRef.current;

        setState(prev => ({
            ...prev,
            isProcessing: true,
            processingMessage: 'Preparing pages…',
            error: null,
        }));

        try {
            // Load a fresh pdf-lib document for building the output
            const { PDFDocument } = await import('pdf-lib');

            // Load pdfjs fresh instance for rendering (to avoid conflicts with viewer)
            const pdfjs = pdfjsRef.current!;
            const renderDoc = await pdfjs.getDocument({
                data: pdfBytes.slice(),
                useWorkerFetch: false,
                isEvalSupported: false,
                useSystemFonts: true,
            }).promise;

            const numPages = renderDoc.numPages;
            const newPdfDoc = await PDFDocument.create();
            const pagesToRender = pageRange
                ? pageRange.filter(p => p >= 1 && p <= numPages)
                : Array.from({ length: numPages }, (_, i) => i + 1);

            // Index redactions by page for O(1) lookup
            const redactionsByPage = new Map<number, RedactionArea[]>();
            redactions.forEach(r => {
                if (!redactionsByPage.has(r.pageIndex)) redactionsByPage.set(r.pageIndex, []);
                redactionsByPage.get(r.pageIndex)!.push(r);
            });

            for (const pageNum of pagesToRender) {
                const pageIdx = pageNum - 1;
                setState(prev => ({
                    ...prev,
                    processingMessage: `Rasterizing page ${pageNum} of ${pagesToRender.length}…`,
                }));

                const page = await renderDoc.getPage(pageNum);

                // Get native page size in PDF points (72 DPI)
                const viewport1x = page.getViewport({ scale: 1.0 });
                const viewport = page.getViewport({ scale: RENDER_SCALE });

                const canvasWidth = Math.floor(viewport.width);
                const canvasHeight = Math.floor(viewport.height);

                // Create an off-screen canvas
                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) throw new Error('Failed to get 2D canvas context');

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Render the PDF page onto the canvas
                await page.render({
                    canvasContext: ctx,
                    viewport,
                }).promise;

                // Paint solid black over each redacted region
                const pageRedactions = redactionsByPage.get(pageIdx) ?? [];
                for (const r of pageRedactions) {
                    // Convert from PDF point space (bottom-left origin) to canvas pixel space (top-left origin)
                    const pageHeightPoints = viewport1x.height;
                    const canvasX = Math.floor(r.x * RENDER_SCALE);
                    const canvasY = Math.floor((pageHeightPoints - r.y - r.height) * RENDER_SCALE);
                    const canvasW = Math.ceil(r.width * RENDER_SCALE);
                    const canvasH = Math.ceil(r.height * RENDER_SCALE);

                    ctx.fillStyle = '#000000';
                    ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
                }

                // Export canvas as JPEG blob
                const jpegBytes = await new Promise<Uint8Array>((resolve, reject) => {
                    canvas.toBlob(
                        blob => {
                            if (!blob) { reject(new Error('Canvas toBlob returned null')); return; }
                            blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject);
                        },
                        'image/jpeg',
                        0.92
                    );
                });

                // Embed JPEG into the new PDF
                const jpegImage = await newPdfDoc.embedJpg(jpegBytes);
                const newPage = newPdfDoc.addPage([viewport1x.width, viewport1x.height]);
                newPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: viewport1x.width,
                    height: viewport1x.height,
                });
            }

            setState(prev => ({ ...prev, processingMessage: 'Saving PDF…' }));
            const outputBytes = await newPdfDoc.save();

            // Trigger download
            const blob = new Blob([outputBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileNameRef.current;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Delay revoke to ensure download starts
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            setState(prev => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: null,
            }));
        } catch (err) {
            console.error('Redaction error:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: `Redaction failed: ${err instanceof Error ? err.message : String(err)}`,
            }));
        }
    }, []); // No deps — reads from refs

    return {
        ...state,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        addRedactions,
        undoRedaction,
        clearRedactions,
        clearPageRedactions,
        saveRedactedPDF,
    };
}
