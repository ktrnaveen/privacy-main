import styles from './PDFToolbar.module.css';

interface PDFToolbarProps {
    currentPage: number;
    totalPages: number;
    scale: number;
    onPageChange: (page: number) => void;
    onZoomChange: (scale: number) => void;
    onUndo: () => void;
    onClear: () => void;
    onDownload: () => void;
    canUndo: boolean;
    canClear: boolean;
    canDownload: boolean;
    isProcessing: boolean;
    hasFile: boolean;
    redactionCount: number;
    totalRedactionCount: number;
}

export function PDFToolbar({
    currentPage,
    totalPages,
    scale,
    onPageChange,
    onZoomChange,
    onUndo,
    onClear,
    onDownload,
    canUndo,
    canClear,
    canDownload,
    isProcessing,
    hasFile,
    redactionCount,
    totalRedactionCount,
}: PDFToolbarProps) {
    if (!hasFile) return null;

    const ZOOM_STEP = 0.15;
    const MIN_ZOOM = 0.4;
    const MAX_ZOOM = 2.5;

    return (
        <div className={styles.toolbar}>
            {/* Page navigation */}
            <div className={styles.group}>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className={styles.button}
                    title="Previous Page (←)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span className={styles.pageInfo}>
                    {currentPage} <span className={styles.pageSep}>/</span> {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className={styles.button}
                    title="Next Page (→)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>

            <div className={styles.separator} />

            {/* Zoom controls */}
            <div className={styles.group}>
                <button
                    onClick={() => onZoomChange(Math.max(MIN_ZOOM, parseFloat((scale - ZOOM_STEP).toFixed(2))))}
                    disabled={scale <= MIN_ZOOM}
                    className={styles.button}
                    title="Zoom Out"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
                <span className={styles.zoomInfo}>{Math.round(scale * 100)}%</span>
                <button
                    onClick={() => onZoomChange(Math.min(MAX_ZOOM, parseFloat((scale + ZOOM_STEP).toFixed(2))))}
                    disabled={scale >= MAX_ZOOM}
                    className={styles.button}
                    title="Zoom In"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
            </div>

            <div className={styles.separator} />

            {/* Edit controls */}
            <div className={styles.group}>
                <button
                    onClick={onUndo}
                    disabled={!canUndo || isProcessing}
                    className={styles.button}
                    title="Undo Last Redaction (Ctrl+Z)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 10h10a5 5 0 0 1 5 5v2" />
                        <path d="M3 10l4-4M3 10l4 4" />
                    </svg>
                </button>
                <button
                    onClick={onClear}
                    disabled={!canClear || isProcessing}
                    className={`${styles.button} ${canClear ? styles.danger : ''}`}
                    title="Clear All Redactions on All Pages"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    </svg>
                </button>
            </div>

            {/* Redaction count badge */}
            {totalRedactionCount > 0 && (
                <div className={styles.badge} title={`${totalRedactionCount} total redaction${totalRedactionCount !== 1 ? 's' : ''}`}>
                    {totalRedactionCount}
                </div>
            )}

            <div className={styles.spacer} />

            {/* Download */}
            <button
                onClick={onDownload}
                className={`${styles.downloadButton} ${!canDownload ? styles.downloadDisabled : ''}`}
                disabled={!canDownload}
                title={
                    isProcessing
                        ? 'Processing…'
                        : totalRedactionCount === 0
                            ? 'Draw at least one redaction box first'
                            : 'Download Redacted PDF'
                }
            >
                {isProcessing ? (
                    <>
                        <svg className={styles.spin} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Processing…
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Redacted PDF
                    </>
                )}
            </button>
        </div>
    );
}
