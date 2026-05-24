'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import type { RedactionArea } from '@/lib/redaction-types';
import { usePDFRedactor } from '@/hooks/usePDFRedactor';
import { PDFViewer, RedactionOverlay, PDFToolbar, PDFThumbnailStrip, PDFSearchBar, PageRangePicker } from '@/components/PDFRedactor';
import { FileDropzone } from '@/components';
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
        addRedactions,
        undoRedaction,
        clearRedactions,
        saveRedactedPDF,
    } = usePDFRedactor();

    const [pageDimensions, setPageDimensions] = useState<{
        width: number;
        height: number;
        pdfHeightPoints: number;
    } | null>(null);

    // Feature 9: page range picker state
    const [showRangePicker, setShowRangePicker] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const [hasManualScale, setHasManualScale] = useState(false);

    const calculateFitScale = useCallback(async () => {
        if (!pdfDocument || !containerRef.current) return;
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        if (containerWidth <= 0) return;
        const finalScale = Math.min(Math.max((containerWidth - 32) / viewport.width, 0.4), 2.0);
        setScale(finalScale);
    }, [pdfDocument, currentPage, setScale]);

    useEffect(() => {
        if (!pdfDocument || hasManualScale) return;
        calculateFitScale().catch(console.error);
    }, [pdfDocument, currentPage, hasManualScale, calculateFitScale]);

    useEffect(() => {
        if (!pdfDocument || !containerRef.current || hasManualScale) return;
        const observer = new ResizeObserver(() => { calculateFitScale().catch(console.error); });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [pdfDocument, hasManualScale, calculateFitScale]);

    useEffect(() => { setHasManualScale(false); setPageDimensions(null); }, [file]);

    const handlePageRendered = useCallback((viewport: pdfjsLib.PageViewport) => {
        setPageDimensions({
            width: viewport.width,
            height: viewport.height,
            pdfHeightPoints: viewport.height / viewport.scale,
        });
    }, []);

    const handleZoomChange = useCallback((nextScale: number) => {
        setHasManualScale(true);
        setScale(nextScale);
    }, [setScale]);

    // Feature 9: open picker before download
    const handleDownloadRequest = useCallback(() => {
        if (pageCount > 1) {
            setShowRangePicker(true);
        } else {
            saveRedactedPDF();
        }
    }, [pageCount, saveRedactedPDF]);

    const handleRangeConfirm = useCallback((range: number[]) => {
        setShowRangePicker(false);
        saveRedactedPDF(range);
    }, [saveRedactedPDF]);

    const canDownload = redactions.length > 0 && !isProcessing;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>PDF Redactor</h1>
                <p>
                    Permanently redact sensitive information from PDFs.
                    Pages are fully rasterized — no text can be extracted from the output.
                </p>
            </header>

            {error && (
                <div className={styles.errorBanner}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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
                            <strong>How it works:</strong> Draw rectangles over sensitive text, use Search to auto-mark keywords,
                            then click Download. Pages are rasterized — redacted content is permanently destroyed.
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
                        onDownload={handleDownloadRequest}
                        canUndo={redactions.length > 0}
                        canClear={redactions.length > 0}
                        canDownload={canDownload}
                        isProcessing={isProcessing}
                        hasFile={!!file}
                        redactionCount={redactions.filter(r => r.pageIndex === currentPage - 1).length}
                        totalRedactionCount={redactions.length}
                    />

                    {/* Feature 1: Search bar */}
                    {pdfDocument && (
                        <PDFSearchBar
                            pdfDocument={pdfDocument}
                            onRedactionsFound={addRedactions}
                        />
                    )}

                    <div className={styles.editorLayout}>
                        {/* Feature 4: Thumbnail strip */}
                        {pdfDocument && pageCount > 1 && (
                            <PDFThumbnailStrip
                                pdfDocument={pdfDocument}
                                currentPage={currentPage}
                                redactions={redactions}
                                onPageSelect={setPage}
                            />
                        )}

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

                                {isProcessing && (
                                    <div className={styles.loadingOverlay}>
                                        <div className={styles.loadingBox}>
                                            <div className={styles.spinner} />
                                            <p className={styles.loadingTitle}>{processingMessage || 'Processing…'}</p>
                                            <p className={styles.loadingSubtitle}>Rasterizing pages to permanently remove text data</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.statusBar}>
                        <span>
                            Page {currentPage} of {pageCount}
                            {redactions.filter(r => r.pageIndex === currentPage - 1).length > 0 && (
                                <span className={styles.redactBadge}>
                                    {redactions.filter(r => r.pageIndex === currentPage - 1).length} on this page
                                </span>
                            )}
                        </span>
                        <span className={styles.statusHint}>
                            {redactions.length === 0
                                ? '✏️ Draw rectangles or use Search to redact text'
                                : `${redactions.length} total redaction${redactions.length !== 1 ? 's' : ''} across all pages`}
                        </span>
                    </div>
                </div>
            )}

            {/* Feature 9: Page range picker modal */}
            {showRangePicker && (
                <PageRangePicker
                    totalPages={pageCount}
                    onConfirm={handleRangeConfirm}
                    onCancel={() => setShowRangePicker(false)}
                    isProcessing={isProcessing}
                />
            )}
        </div>
    );
}
