import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RedactionArea } from '@/lib/redaction-types';
import styles from './PDFThumbnailStrip.module.css';

interface PDFThumbnailStripProps {
    pdfDocument: PDFDocumentProxy;
    currentPage: number;
    redactions: RedactionArea[];
    onPageSelect: (page: number) => void;
}

const THUMB_SCALE = 0.18; // Small render scale for thumbnails

export function PDFThumbnailStrip({ pdfDocument, currentPage, redactions, onPageSelect }: PDFThumbnailStripProps) {
    const [thumbs, setThumbs] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderingRef = useRef(false);

    // Count redactions per page
    const redactionCounts = new Map<number, number>();
    redactions.forEach(r => {
        redactionCounts.set(r.pageIndex, (redactionCounts.get(r.pageIndex) ?? 0) + 1);
    });

    const renderThumbs = useCallback(async () => {
        if (renderingRef.current) return;
        renderingRef.current = true;
        const numPages = pdfDocument.numPages;
        const urls: string[] = [];

        for (let i = 1; i <= numPages; i++) {
            try {
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: THUMB_SCALE });
                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) { urls.push(''); continue; }
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport }).promise;
                urls.push(canvas.toDataURL('image/jpeg', 0.7));
            } catch {
                urls.push('');
            }
        }
        setThumbs(urls);
        renderingRef.current = false;
    }, [pdfDocument]);

    useEffect(() => {
        setThumbs([]);
        renderThumbs();
    }, [renderThumbs]);

    // Scroll active thumb into view
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const active = container.querySelector(`.${styles.active}`) as HTMLElement | null;
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [currentPage]);

    return (
        <div className={styles.strip} ref={containerRef}>
            {Array.from({ length: pdfDocument.numPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const count = redactionCounts.get(idx) ?? 0;
                const isActive = pageNum === currentPage;

                return (
                    <button
                        key={pageNum}
                        className={`${styles.thumb} ${isActive ? styles.active : ''}`}
                        onClick={() => onPageSelect(pageNum)}
                        title={`Page ${pageNum}${count > 0 ? ` — ${count} redaction${count !== 1 ? 's' : ''}` : ''}`}
                    >
                        <div className={styles.thumbInner}>
                            {thumbs[idx] ? (
                                <img src={thumbs[idx]} alt={`Page ${pageNum}`} className={styles.thumbImg} />
                            ) : (
                                <div className={styles.thumbPlaceholder}>
                                    <div className={styles.thumbSpinner} />
                                </div>
                            )}
                            {count > 0 && (
                                <span className={styles.badge}>{count}</span>
                            )}
                        </div>
                        <span className={styles.pageNum}>{pageNum}</span>
                    </button>
                );
            })}
        </div>
    );
}
