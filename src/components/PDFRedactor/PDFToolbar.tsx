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
    isProcessing: boolean;
    hasFile: boolean;
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
    isProcessing,
    hasFile
}: PDFToolbarProps) {
    if (!hasFile) return null;

    return (
        <div className={styles.toolbar}>
            <div className={styles.group}>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className={styles.button}
                    title="Previous Page"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className={styles.button}
                    title="Next Page"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>

            <div className={styles.separator} />

            <div className={styles.group}>
                <button
                    onClick={() => onZoomChange(Math.max(0.5, scale - 0.1))}
                    className={styles.button}
                    title="Zoom Out"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </button>
                <span className={styles.zoomInfo}>{Math.round(scale * 100)}%</span>
                <button
                    onClick={() => onZoomChange(Math.min(2.0, scale + 0.1))}
                    className={styles.button}
                    title="Zoom In"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </button>
            </div>

            <div className={styles.separator} />

            <div className={styles.group}>
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={styles.button}
                    title="Undo Last Redaction"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 10h10a5 5 0 0 1 5 5v2" />
                        <path d="M3 10l4-4M3 10l4 4" />
                    </svg>
                </button>
                <button
                    onClick={onClear}
                    disabled={!canClear}
                    className={styles.button}
                    title="Clear All Redactions"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    </svg>
                </button>
            </div>

            <div className={styles.spacer} />

            <button
                onClick={onDownload}
                className={styles.downloadButton}
                disabled={isProcessing}
            >
                {isProcessing ? 'Processing...' : 'Download'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            </button>
        </div>
    );
}
