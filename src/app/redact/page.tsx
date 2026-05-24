'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import { usePDFRedactor } from '@/hooks/usePDFRedactor';
import { PDFViewer, RedactionOverlay, PDFToolbar } from '@/components/PDFRedactor';
import { FileDropzone } from '@/components/FileDropzone';
import styles from './page.module.css';

export default function RedactPage() {
    const {
        file,
        pdfDocument,
        pageCount,
        currentPage,
        scale,
        redactions,
        isProcessing,
        error,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        undoRedaction,
        clearRedactions,
        saveRedactedPDF
    } = usePDFRedactor();

    // We need to track the current page dimensions to pass to the overlay
    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number; pdfHeightPoints: number } | null>(null);

    // Auto-fit only until the user changes zoom manually.
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasManualScale, setHasManualScale] = useState(false);

    const calculateFitScale = useCallback(async () => {
        if (!pdfDocument || !containerRef.current) return;
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        if (containerWidth <= 0) return;

        const availableWidth = Math.max(containerWidth - 24, 120);
        const scaleToFit = availableWidth / viewport.width;
        const finalScale = Math.min(Math.max(scaleToFit, 0.5), 1.5);
        setScale(finalScale);
    }, [pdfDocument, currentPage, setScale]);

    useEffect(() => {
        if (!pdfDocument || hasManualScale) return;
        calculateFitScale().catch((e) => console.error('Error auto-scaling:', e));
    }, [pdfDocument, currentPage, hasManualScale, calculateFitScale]);

    useEffect(() => {
        if (!pdfDocument || !containerRef.current || hasManualScale) return;
        const observer = new ResizeObserver(() => {
            calculateFitScale().catch((e) => console.error('Error resizing PDF viewport:', e));
        });
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [pdfDocument, hasManualScale, calculateFitScale]);

    // Reset auto-scale flag when file changes
    useEffect(() => {
        setHasManualScale(false);
        setPageDimensions(null);
    }, [file]);

    const handlePageRendered = (viewport: pdfjsLib.PageViewport) => {
        // viewport.height is in CSS pixels (which equals PDF points * scale)
        // We need the original PDF height in points for coordinate conversion
        setPageDimensions({
            width: viewport.width,
            height: viewport.height,
            pdfHeightPoints: viewport.height / scale
        });
    };

    const handleZoomChange = (nextScale: number) => {
        setHasManualScale(true);
        setScale(nextScale);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>PDF Redactor</h1>
                <p>Permanently redact sensitive information from PDFs. Text under black boxes cannot be copied or extracted.</p>
            </header>

            {error && (
                <div style={{
                    margin: '0 0 1.5rem',
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#dc2626',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {!file ? (
                <div className={styles.uploadSection}>
                    <FileDropzone
                        onFilesSelect={(files) => loadPDF(files[0])}
                        accept=".pdf,application/pdf"
                        label="Drop a PDF to redact"
                        description="Click to browse or drag and drop"
                    />
                </div>
            ) : (
                <div className={styles.workspace}>
                    <PDFToolbar
                        currentPage={currentPage}
                        totalPages={pageCount}
                        scale={scale}
                        onPageChange={setPage}
                        onZoomChange={handleZoomChange}
                        onUndo={undoRedaction}
                        onClear={clearRedactions}
                        onDownload={saveRedactedPDF}
                        canUndo={redactions.length > 0}
                        canClear={redactions.length > 0}
                        isProcessing={isProcessing}
                        hasFile={!!file}
                    />

                    <div className={styles.viewport} ref={containerRef}>
                        <div className={styles.canvasWrapper} style={{ width: pageDimensions?.width, height: pageDimensions?.height }}>
                            {pdfDocument && (
                                <>
                                    <PDFViewer
                                        pdfDocument={pdfDocument}
                                        pageIndex={currentPage - 1} // 0-based
                                        scale={scale}
                                        onPageRendered={handlePageRendered}
                                    />
                                    {pageDimensions && (
                                        <RedactionOverlay
                                            width={pageDimensions.width}
                                            height={pageDimensions.height}
                                            scale={scale}
                                            pageIndex={currentPage - 1} // 0-based
                                            redactions={redactions}
                                            onAddRedaction={addRedaction}
                                            pdfHeightPoints={pageDimensions.pdfHeightPoints}
                                        />
                                    )}
                                    {isProcessing && (
                                        <div className={styles.loading}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div className={styles.spinner} style={{ margin: '0 auto 0.75rem' }} />
                                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                                    Applying redactions…
                                                </p>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Rasterizing pages to permanently remove text
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
