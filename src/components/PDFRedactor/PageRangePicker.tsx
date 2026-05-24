import { useState, useCallback } from 'react';
import styles from './PageRangePicker.module.css';

interface PageRangePickerProps {
    totalPages: number;
    onConfirm: (pageRange: number[]) => void;
    onCancel: () => void;
    isProcessing: boolean;
}

function parseRangeString(input: string, total: number): number[] | null {
    const pages = new Set<number>();
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr.trim(), 10);
            const end = parseInt(endStr.trim(), 10);
            if (isNaN(start) || isNaN(end) || start < 1 || end > total || start > end) return null;
            for (let i = start; i <= end; i++) pages.add(i);
        } else {
            const n = parseInt(part, 10);
            if (isNaN(n) || n < 1 || n > total) return null;
            pages.add(n);
        }
    }
    return pages.size > 0 ? [...pages].sort((a, b) => a - b) : null;
}

export function PageRangePicker({ totalPages, onConfirm, onCancel, isProcessing }: PageRangePickerProps) {
    const [rangeInput, setRangeInput] = useState(`1-${totalPages}`);
    const [parseError, setParseError] = useState<string | null>(null);
    const [includeAll, setIncludeAll] = useState(true);

    const parsedPages = includeAll
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : parseRangeString(rangeInput, totalPages);

    const handleConfirm = useCallback(() => {
        if (!parsedPages) {
            setParseError(`Invalid range. Use format: 1-5, 7, 10-12`);
            return;
        }
        setParseError(null);
        onConfirm(parsedPages);
    }, [parsedPages, onConfirm]);

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Download Options</h3>
                    <p className={styles.subtitle}>
                        Choose which pages to include in the redacted PDF.
                    </p>
                </div>

                <div className={styles.body}>
                    <label className={styles.option}>
                        <input
                            type="radio"
                            name="range"
                            checked={includeAll}
                            onChange={() => setIncludeAll(true)}
                            className={styles.radio}
                        />
                        <div>
                            <span className={styles.optionLabel}>All {totalPages} pages</span>
                            <span className={styles.optionHint}>Include the complete document</span>
                        </div>
                    </label>

                    <label className={styles.option}>
                        <input
                            type="radio"
                            name="range"
                            checked={!includeAll}
                            onChange={() => setIncludeAll(false)}
                            className={styles.radio}
                        />
                        <div className={styles.optionContent}>
                            <span className={styles.optionLabel}>Custom page range</span>
                            <span className={styles.optionHint}>e.g. 1-3, 5, 8-10</span>
                        </div>
                    </label>

                    {!includeAll && (
                        <div className={styles.rangeInput}>
                            <input
                                type="text"
                                className={`${styles.input} ${parseError ? styles.inputError : ''}`}
                                value={rangeInput}
                                onChange={e => { setRangeInput(e.target.value); setParseError(null); }}
                                placeholder="e.g. 1-5, 7, 10-12"
                                autoFocus
                            />
                            {parsedPages && !parseError && (
                                <p className={styles.preview}>
                                    {parsedPages.length} page{parsedPages.length !== 1 ? 's' : ''}:{' '}
                                    {parsedPages.slice(0, 12).join(', ')}{parsedPages.length > 12 ? '…' : ''}
                                </p>
                            )}
                            {parseError && <p className={styles.error}>{parseError}</p>}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onCancel} disabled={isProcessing}>
                        Cancel
                    </button>
                    <button className={styles.confirmBtn} onClick={handleConfirm} disabled={isProcessing || !parsedPages}>
                        {isProcessing ? 'Processing…' : `Download ${parsedPages ? parsedPages.length : '?'} Page${parsedPages?.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
