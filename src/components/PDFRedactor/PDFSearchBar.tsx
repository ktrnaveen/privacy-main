import { useState, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RedactionArea } from '@/lib/redaction-types';
import styles from './PDFSearchBar.module.css';

interface PDFSearchBarProps {
    pdfDocument: PDFDocumentProxy;
    onRedactionsFound: (redactions: RedactionArea[]) => void;
}

interface SearchResult {
    pageCount: number;
    matchCount: number;
}

export function PDFSearchBar({ pdfDocument, onRedactionsFound }: PDFSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = useCallback(async () => {
        const term = query.trim();
        if (!term) return;

        setIsSearching(true);
        setResult(null);
        setError(null);

        const foundRedactions: RedactionArea[] = [];

        try {
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });
                const textContent = await page.getTextContent();

                for (const item of textContent.items) {
                    if (!('str' in item) || !item.str) continue;

                    const text = item.str;
                    const lowerText = text.toLowerCase();
                    const lowerTerm = term.toLowerCase();

                    let searchFrom = 0;
                    while (true) {
                        const idx = lowerText.indexOf(lowerTerm, searchFrom);
                        if (idx === -1) break;
                        searchFrom = idx + 1;

                        // item.transform is [scaleX, 0, 0, scaleY, tx, ty] (PDF coordinate space)
                        const [scaleX, , , scaleY, tx, ty] = item.transform as number[];
                        const charWidth = item.width / Math.max(text.length, 1);

                        // Approximate bounding box in PDF points
                        const x = tx + idx * charWidth;
                        const y = ty; // PDF bottom-left origin
                        const w = term.length * charWidth;
                        const h = Math.abs(scaleY) * 1.3; // slightly taller than font size

                        // Add padding
                        const pad = 2;
                        foundRedactions.push({
                            pageIndex: pageNum - 1,
                            x: x - pad,
                            y: y - pad,
                            width: w + pad * 2,
                            height: h + pad * 2,
                        });
                    }
                }
            }

            // Deduplicate overlapping boxes per page
            const pagesHit = new Set(foundRedactions.map(r => r.pageIndex));
            setResult({ pageCount: pagesHit.size, matchCount: foundRedactions.length });
            onRedactionsFound(foundRedactions);
        } catch (err) {
            setError('Search failed: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSearching(false);
        }
    }, [query, pdfDocument, onRedactionsFound]);

    return (
        <div className={styles.searchBar}>
            <div className={styles.inputGroup}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder="Search text to auto-redact…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setResult(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                    disabled={isSearching}
                />
                {query && (
                    <button className={styles.clearBtn} onClick={() => { setQuery(''); setResult(null); inputRef.current?.focus(); }}>
                        ✕
                    </button>
                )}
            </div>
            <button
                className={styles.searchBtn}
                onClick={handleSearch}
                disabled={!query.trim() || isSearching}
                title="Search and mark all occurrences for redaction"
            >
                {isSearching ? (
                    <svg className={styles.spin} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                ) : (
                    <span>Auto-Redact</span>
                )}
            </button>

            {result && (
                <div className={styles.resultInfo}>
                    {result.matchCount === 0 ? (
                        <span className={styles.noMatch}>No matches found</span>
                    ) : (
                        <span className={styles.match}>
                            ✓ {result.matchCount} match{result.matchCount !== 1 ? 'es' : ''} on {result.pageCount} page{result.pageCount !== 1 ? 's' : ''} marked
                        </span>
                    )}
                </div>
            )}
            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
}
