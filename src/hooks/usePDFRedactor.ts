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
    error: string | null;
}

export interface UsePDFRedactorReturn extends PDFRedactorState {
    loadPDF: (file: File) => Promise<void>;
    setPage: (page: number) => void;
    setScale: (scale: number) => void;
    addRedaction: (redaction: RedactionArea) => void;
    undoRedaction: () => void;
    clearRedactions: () => void;
    clearPageRedactions: (pageIndex: number) => void;
    saveRedactedPDF: () => Promise<void>;
}

export function usePDFRedactor(): UsePDFRedactorReturn {
    const [state, setState] = useState<PDFRedactorState>({
        file: null,
        pdfDocument: null,
        pageCount: 0,
        currentPage: 1,
        scale: 1.0,
        redactions: [],
        isProcessing: false,
        error: null,
    });

    const workerRef = useRef<Worker | null>(null);
    const pdfjsRef = useRef<typeof import('pdfjs-dist') | null>(null);
    const pdfBytesRef = useRef<Uint8Array | null>(null);
    const fileNameRef = useRef<string>('redacted.pdf');

    // Initialize worker once on mount
    useEffect(() => {
        // { type: 'module' } is required for webpack to bundle the worker as ESM
        workerRef.current = new Worker(
            new URL('../workers/redaction.worker.ts', import.meta.url),
            { type: 'module' }
        );

        const handleWorkerMessage = (e: MessageEvent) => {
            const { type, pdfBytes, error } = e.data;
            if (type === 'SUCCESS') {
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = fileNameRef.current;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setState(prev => ({ ...prev, isProcessing: false, error: null }));
            } else if (type === 'ERROR') {
                console.error('Redaction worker error:', error);
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    error: `Redaction failed: ${error}. Please try again.`
                }));
            }
        };

        const handleWorkerError = (e: ErrorEvent) => {
            console.error('Worker script error:', e);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: 'Worker failed to load. Please refresh the page and try again.'
            }));
        };

        workerRef.current.addEventListener('message', handleWorkerMessage);
        workerRef.current.addEventListener('error', handleWorkerError);

        return () => {
            workerRef.current?.removeEventListener('message', handleWorkerMessage);
            workerRef.current?.removeEventListener('error', handleWorkerError);
            workerRef.current?.terminate();
        };
    }, []); // Empty dependency array - only initialize once

    const loadPDF = useCallback(async (file: File) => {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));
        try {
            const pdfjs = pdfjsRef.current ?? await import('pdfjs-dist');
            pdfjsRef.current = pdfjs;
            if (typeof window !== 'undefined' && 'Worker' in window) {
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            }

            const arrayBuffer = await file.arrayBuffer();
            // Read bytes once, then clone for both pdfjs (viewer) and our redaction worker.
            // Never pass the same ArrayBuffer to two consumers — one will get a detached buffer.
            const originalBytes = new Uint8Array(arrayBuffer);
            pdfBytesRef.current = originalBytes.slice(); // clone for the redaction worker
            fileNameRef.current = file.name.replace(/\.pdf$/i, '') + '_redacted.pdf';

            // Give pdfjs a separate clone so it won't conflict with the worker copy
            const loadingTask = pdfjs.getDocument({ data: originalBytes.slice() });
            const pdf = await loadingTask.promise;

            setState(prev => ({
                ...prev,
                file,
                pdfDocument: pdf,
                pageCount: pdf.numPages,
                currentPage: 1,
                redactions: [],
                isProcessing: false,
                error: null,
            }));
        } catch (err) {
            console.error('Error loading PDF:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: 'Failed to load PDF. Please make sure the file is a valid PDF and try again.'
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
        setState(prev => ({
            ...prev,
            redactions: [...prev.redactions, redaction],
        }));
    }, []);

    const undoRedaction = useCallback(() => {
        setState(prev => ({
            ...prev,
            redactions: prev.redactions.slice(0, -1),
        }));
    }, []);

    const clearRedactions = useCallback(() => {
        setState(prev => ({ ...prev, redactions: [] }));
    }, []);

    const clearPageRedactions = useCallback((pageIndex: number) => {
        setState(prev => ({
            ...prev,
            redactions: prev.redactions.filter(r => r.pageIndex !== pageIndex),
        }));
    }, []);

    const saveRedactedPDF = useCallback(async () => {
        if (!pdfBytesRef.current || !workerRef.current) return;

        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        const bytesForWorker = pdfBytesRef.current.slice();
        workerRef.current.postMessage({
            pdfBytes: bytesForWorker,
            redactions: state.redactions,
        }, [bytesForWorker.buffer]);
    }, [state.redactions]);

    return {
        ...state,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        undoRedaction,
        clearRedactions,
        clearPageRedactions,
        saveRedactedPDF,
    };
}
