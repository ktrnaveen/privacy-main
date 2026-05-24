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
        processingMessage,
        error,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        undoRedaction,
        clearRedactions,
        saveRedactedPDF,
    } = usePDFRedactor();

    // Track rendered page dimensions for the overlay
    const [pageDimensions, setPageDimensions] = useState<{
        width: number;
        height: number;
        pdfHeightPoints: number;
    } | null>(null);

    // Auto-fit scale until user zooms manually
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasManualScale, setHasManualScale] = useState(false);

    const calculateFitScale = useCallback(async () => {
        if (!pdfDocument || !containerRef.current) return;
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        if (containerWidth <= 0) return;

        const availableWidth = Math.max(containerWidth - 32, 120);
        const scaleToFit = availableWidth / viewport.width;
        const finalScale = Math.min(Math.max(scaleToFit, 0.4), 2.0);
        setScale(finalScale);
    }, [pdfDocument, currentPage, setScale]);

    useEffect(() => {
        if (!pdfDocument || hasManualScale) return;
        calculateFitScale().catch(e => console.error('Auto-scale error:', e));
    }, [pdfDocument, currentPage, hasManualScale, calculateFitScale]);

    useEffect(() => {
        if (!pdfDocument || !containerRef.current || hasManualScale) return;
        const observer = new ResizeObserver(() => {
            calculateFitScale().catch(e => console.error('Resize scale error:', e));
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [pdfDocument, hasManualScale, calculateFitScale]);

    // Reset auto-scale flag and page dims when file changes
    useEffect(() => {
        setHasManualScale(false);
        setPageDimensions(null);
    }, [file]);

    // FIXED: memoized with useCallback to prevent infinite re-render loop in PDFViewer
    const handlePageRendered = useCallback((viewport: pdfjsLib.PageViewport) => {
        setPageDimensions({
            width: viewport.width,    // CSS pixels
            height: viewport.height,  // CSS pixels
            pdfHeightPoints: viewport.height / viewport.scale, // PDF points (unscaled)
        });
    }, []); // stable — setPageDimensions is stable

    const handleZoomChange = useCallback((nextScale: number) => {
        setHasManualScale(true);
        setScale(nextScale);
    }, [setScale]);

    const canDownload = redactions.length > 0 && !isProcessing;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>PDF Redactor</h1>
                <p>
                    Permanently redact sensitive information from PDFs.
                    Text under black boxes cannot be copied or extracted — pages are fully rasterized.
                </p>
            </header>

            {error && (
                <div className={styles.errorBanner}>
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
                        onFilesSelect={files => { if (files[0]) loadPDF(files[0]); }}
                        accept=".pdf,application/pdf"
                        label="Drop a PDF to redact"
                        description="Click to browse or drag and drop"
                        disabled={isProcessing}
                    />
                    <div className={styles.instructions}>
                        <p>
                            <strong>How it works:</strong> Draw rectangles over sensitive text on any page,
                            then click Download. Pages are rasterized to images — redacted content is
                            permanently destroyed and cannot be recovered.
                        </p>
                    </div>
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
                        canDownload={canDownload}
                        isProcessing={isProcessing}
                        hasFile={!!file}
                        redactionCount={redactions.filter(r => r.pageIndex === currentPage - 1).length}
                        totalRedactionCount={redactions.length}
                    />

                    <div className={styles.viewport} ref={containerRef}>
                        <div
                            className={styles.canvasWrapper}
                            style={{
                                width: pageDimensions?.width ?? undefined,
                                height: pageDimensions?.height ?? undefined,
                            }}
                        >
                            {pdfDocument && (
                                <>
                                    <PDFViewer
                                        pdfDocument={pdfDocument}
                                        pageIndex={currentPage - 1}
                                        scale={scale}
                                        onPageRendered={handlePageRendered}
                                    />
                                    {pageDimensions && (
                                        <RedactionOverlay
                                            width={pageDimensions.width}
                                            height={pageDimensions.height}
                                            scale={scale}
                                            pageIndex={currentPage - 1}
                                            redactions={redactions}
                                            onAddRedaction={addRedaction}
                                            pdfHeightPoints={pageDimensions.pdfHeightPoints}
                                        />
                                    )}
                                </>
                            )}

                            {/* Processing overlay */}
                            {isProcessing && (
                                <div className={styles.loadingOverlay}>
                                    <div className={styles.loadingBox}>
                                        <div className={styles.spinner} />
                                        <p className={styles.loadingTitle}>
                                            {processingMessage || 'Processing…'}
                                        </p>
                                        <p className={styles.loadingSubtitle}>
                                            Rasterizing pages to permanently remove text data
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className={styles.statusBar}>
                        <span>
                            Page {currentPage} of {pageCount}
                            {redactions.filter(r => r.pageIndex === currentPage - 1).length > 0 && (
                                <span className={styles.redactBadge}>
                                    {redactions.filter(r => r.pageIndex === currentPage - 1).length} redaction
                                    {redactions.filter(r => r.pageIndex === currentPage - 1).length !== 1 ? 's' : ''} on this page
                                </span>
                            )}
                        </span>
                        <span className={styles.statusHint}>
                            {redactions.length === 0
                                ? '✏️ Draw rectangles over text to redact it'
                                : `${redactions.length} total redaction${redactions.length !== 1 ? 's' : ''} across all pages`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
