'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import styles from './page.module.css';

type OutputFormat = 'image/jpeg' | 'image/webp' | 'image/png';

interface ImageDimensions {
    width: number;
    height: number;
}

interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    originalUrl: string;
    compressedUrl: string;
    filename: string;
    originalDimensions: ImageDimensions;
    compressedDimensions: ImageDimensions;
    timeTakenMs: number;
    format: OutputFormat;
}

interface BatchItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: CompressionResult;
    error?: string;
    progress: number;
}

const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/png': 'png',
};

const FORMAT_LABELS: Record<OutputFormat, string> = {
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
    'image/png': 'PNG',
};

function getImageDimensions(url: string): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
    });
}

function BeforeAfterSlider({ originalUrl, compressedUrl }: { originalUrl: string; compressedUrl: string }) {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const updateSlider = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        setSliderPos(pos);
    }, []);

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        updateSlider(e.clientX);
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => { if (isDragging.current) updateSlider(e.clientX); };
        const onUp = () => { isDragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [updateSlider]);

    const onTouchMove = (e: React.TouchEvent) => {
        updateSlider(e.touches[0].clientX);
    };

    // Set container width CSS var for overlay image sizing
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => el.style.setProperty('--slider-container-width', `${el.offsetWidth}px`);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.sliderContainer}
            onMouseDown={onMouseDown}
            onTouchMove={onTouchMove}
            onTouchStart={(e) => updateSlider(e.touches[0].clientX)}
        >
            {/* Compressed (base layer) */}
            <img src={compressedUrl} alt="Compressed" className={styles.sliderImg} draggable={false} />
            {/* Original (clipped overlay) */}
            <div className={styles.sliderOverlay} style={{ width: `${sliderPos}%` }}>
                <img src={originalUrl} alt="Original" className={styles.sliderImg} draggable={false} />
            </div>
            {/* Divider */}
            <div className={styles.sliderHandle} style={{ left: `${sliderPos}%` }}>
                <div className={styles.sliderLine} />
                <div className={styles.sliderKnob}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8 3l-5 9 5 9M16 3l5 9-5 9" />
                    </svg>
                </div>
            </div>
            <span className={styles.sliderLabelLeft}>Original</span>
            <span className={styles.sliderLabelRight}>Compressed</span>
        </div>
    );
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${value}%` }} />
        </div>
    );
}

export default function CompressPage() {
    const [quality, setQuality] = useState(0.7);
    const [maxWidth, setMaxWidth] = useState(1920);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/jpeg');
    const [batch, setBatch] = useState<BatchItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [settingsDirty, setSettingsDirty] = useState(false);
    const blobUrlsRef = useRef<Set<string>>(new Set());

    const trackUrl = (url: string) => { blobUrlsRef.current.add(url); return url; };

    // Cleanup all blob URLs on unmount
    useEffect(() => {
        return () => {
            blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const compressFile = useCallback(async (item: BatchItem, q: number, mw: number, fmt: OutputFormat): Promise<Partial<BatchItem>> => {
        const file = item.file;
        const startTime = performance.now();

        // Revoke old result URLs if re-compressing
        if (item.result) {
            URL.revokeObjectURL(item.result.originalUrl);
            URL.revokeObjectURL(item.result.compressedUrl);
            blobUrlsRef.current.delete(item.result.originalUrl);
            blobUrlsRef.current.delete(item.result.compressedUrl);
        }

        const { default: imageCompression } = await import('browser-image-compression');

        const options = {
            maxSizeMB: 50,
            maxWidthOrHeight: mw,
            useWebWorker: true,
            initialQuality: q,
            fileType: fmt,
            onProgress: (progress: number) => {
                setBatch(prev => prev.map(b => b.id === item.id ? { ...b, progress } : b));
            },
        };

        const compressedFile = await imageCompression(file, options);
        const timeTakenMs = Math.round(performance.now() - startTime);

        const ext = FORMAT_EXTENSIONS[fmt];
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const filename = `${baseName}_compressed.${ext}`;

        const originalUrl = trackUrl(URL.createObjectURL(file));
        const compressedUrl = trackUrl(URL.createObjectURL(compressedFile));

        const [origDims, compDims] = await Promise.all([
            getImageDimensions(originalUrl),
            getImageDimensions(compressedUrl),
        ]);

        const result: CompressionResult = {
            originalSize: file.size,
            compressedSize: compressedFile.size,
            originalUrl,
            compressedUrl,
            filename,
            originalDimensions: origDims,
            compressedDimensions: compDims,
            timeTakenMs,
            format: fmt,
        };

        return { status: 'done', result, progress: 100 };
    }, []);

    const runCompression = useCallback(async (items: BatchItem[], q: number, mw: number, fmt: OutputFormat) => {
        setError(null);
        setSettingsDirty(false);

        for (const item of items) {
            setBatch(prev => prev.map(b => b.id === item.id ? { ...b, status: 'processing', progress: 0 } : b));
            try {
                const update = await compressFile(item, q, mw, fmt);
                setBatch(prev => prev.map(b => b.id === item.id ? { ...b, ...update } : b));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Compression failed';
                setBatch(prev => prev.map(b => b.id === item.id ? { ...b, status: 'error', error: message, progress: 0 } : b));
                setError(`Failed to compress "${item.file.name}": ${message}`);
            }
        }
    }, [compressFile]);

    const handleFilesSelect = useCallback(
        async (files: File[]) => {
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            if (!imageFiles.length) {
                setError('Please select valid image files (JPEG, PNG, WebP, etc.)');
                return;
            }

            const newItems: BatchItem[] = imageFiles.map(f => ({
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
                file: f,
                status: 'pending',
                progress: 0,
            }));

            setBatch(newItems);
            setError(null);
            setSettingsDirty(false);
            await runCompression(newItems, quality, maxWidth, outputFormat);
        },
        [quality, maxWidth, outputFormat, runCompression]
    );

    const handleRecompress = useCallback(async () => {
        if (!batch.length) return;
        const refreshed = batch.map(b => ({ ...b, status: 'pending' as const, progress: 0 }));
        setBatch(refreshed);
        await runCompression(refreshed, quality, maxWidth, outputFormat);
    }, [batch, quality, maxWidth, outputFormat, runCompression]);

    const handleDownload = (result: CompressionResult) => {
        const a = document.createElement('a');
        a.href = result.compressedUrl;
        a.download = result.filename;
        a.click();
    };

    const handleDownloadAll = () => {
        batch.forEach(item => {
            if (item.result) handleDownload(item.result);
        });
    };

    const handleClear = () => {
        batch.forEach(item => {
            if (item.result) {
                URL.revokeObjectURL(item.result.originalUrl);
                URL.revokeObjectURL(item.result.compressedUrl);
                blobUrlsRef.current.delete(item.result.originalUrl);
                blobUrlsRef.current.delete(item.result.compressedUrl);
            }
        });
        setBatch([]);
        setError(null);
        setSettingsDirty(false);
    };

    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        return (bytes / 1024).toFixed(2) + ' KB';
    };

    const isProcessing = batch.some(b => b.status === 'processing' || b.status === 'pending');
    const hasDone = batch.some(b => b.status === 'done');
    const allDone = batch.length > 0 && batch.every(b => b.status === 'done' || b.status === 'error');

    const onSettingChange = () => {
        if (hasDone) setSettingsDirty(true);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Image Compression</h1>
                <p>Reduce image file size while maintaining quality. All processing happens in your browser — nothing is uploaded.</p>
            </header>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.control}>
                    <label htmlFor="quality">
                        Quality <span className={styles.value}>{Math.round(quality * 100)}%</span>
                    </label>
                    <input
                        id="quality"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={quality}
                        onChange={(e) => { setQuality(parseFloat(e.target.value)); onSettingChange(); }}
                    />
                    <div className={styles.rangeLabels}><span>Smaller</span><span>Higher Quality</span></div>
                </div>

                <div className={styles.control}>
                    <label htmlFor="maxWidth">
                        Max Dimension <span className={styles.value}>{maxWidth}px</span>
                    </label>
                    <input
                        id="maxWidth"
                        type="range"
                        min="320"
                        max="4096"
                        step="64"
                        value={maxWidth}
                        onChange={(e) => { setMaxWidth(parseInt(e.target.value)); onSettingChange(); }}
                    />
                    <div className={styles.rangeLabels}><span>320px</span><span>4096px</span></div>
                </div>

                <div className={styles.control}>
                    <label htmlFor="format">Output Format</label>
                    <div className={styles.formatButtons}>
                        {(['image/jpeg', 'image/webp', 'image/png'] as OutputFormat[]).map(fmt => (
                            <button
                                key={fmt}
                                className={`${styles.formatBtn} ${outputFormat === fmt ? styles.formatBtnActive : ''}`}
                                onClick={() => { setOutputFormat(fmt); onSettingChange(); }}
                            >
                                {FORMAT_LABELS[fmt]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Re-compress Banner */}
            {settingsDirty && !isProcessing && (
                <div className={styles.dirtyBanner}>
                    <span>⚙️ Settings changed — click to re-compress with new settings.</span>
                    <Button size="sm" onClick={handleRecompress}>Re-compress</Button>
                </div>
            )}

            {/* Error UI */}
            {error && (
                <div className={styles.errorCard}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                    <button className={styles.errorDismiss} onClick={() => setError(null)}>✕</button>
                </div>
            )}

            <FileDropzone
                onFilesSelect={handleFilesSelect}
                accept="image/*"
                label={isProcessing ? 'Compressing...' : batch.length ? 'Drop more images' : 'Drop images here'}
                description="Supports JPEG, PNG, WebP — multiple files allowed"
                disabled={isProcessing}
            />

            {/* Batch Results */}
            {batch.length > 0 && (
                <div className={styles.batchSection}>
                    <div className={styles.batchHeader}>
                        <span className={styles.batchTitle}>{batch.length} image{batch.length > 1 ? 's' : ''}</span>
                        <div className={styles.batchActions}>
                            {allDone && batch.length > 1 && (
                                <Button size="sm" variant="secondary" onClick={handleDownloadAll}>Download All</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={handleClear}>Clear</Button>
                        </div>
                    </div>

                    {batch.map((item) => {
                        const r = item.result;
                        const ratio = r ? (((r.originalSize - r.compressedSize) / r.originalSize) * 100).toFixed(1) : null;

                        return (
                            <div key={item.id} className={`${styles.batchItem} ${styles[item.status]}`}>
                                {/* Processing state */}
                                {item.status === 'processing' && (
                                    <div className={styles.processingState}>
                                        <div className={styles.processingInfo}>
                                            <span className={styles.fileName}>{item.file.name}</span>
                                            <span className={styles.processingLabel}>Compressing… {item.progress}%</span>
                                        </div>
                                        <ProgressBar value={item.progress} />
                                    </div>
                                )}

                                {/* Pending state */}
                                {item.status === 'pending' && (
                                    <div className={styles.processingState}>
                                        <span className={styles.fileName}>{item.file.name}</span>
                                        <span className={styles.processingLabel}>Waiting…</span>
                                    </div>
                                )}

                                {/* Error state */}
                                {item.status === 'error' && (
                                    <div className={styles.itemError}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{item.file.name}: {item.error}</span>
                                    </div>
                                )}

                                {/* Done state */}
                                {item.status === 'done' && r && (
                                    <ResultsCard
                                        title={item.file.name}
                                        variant="success"
                                        actions={
                                            <Button size="sm" onClick={() => handleDownload(r)}>
                                                Download {FORMAT_LABELS[r.format]}
                                            </Button>
                                        }
                                    >
                                        <div className={styles.resultBody}>
                                            {/* Before/After slider */}
                                            <BeforeAfterSlider
                                                originalUrl={r.originalUrl}
                                                compressedUrl={r.compressedUrl}
                                            />

                                            {/* Stats grid */}
                                            <div className={styles.statsGrid}>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Reduction</span>
                                                    <span className={styles.statValue} style={{ color: 'var(--color-accent-green)' }}>
                                                        {ratio}%
                                                    </span>
                                                </div>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Saved</span>
                                                    <span className={styles.statValue}>
                                                        {formatSize(r.originalSize - r.compressedSize)}
                                                    </span>
                                                </div>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Original</span>
                                                    <span className={styles.statValue}>{formatSize(r.originalSize)}</span>
                                                </div>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Compressed</span>
                                                    <span className={styles.statValue}>{formatSize(r.compressedSize)}</span>
                                                </div>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Dimensions</span>
                                                    <span className={styles.statValue} style={{ fontSize: '1rem' }}>
                                                        {r.compressedDimensions.width}×{r.compressedDimensions.height}
                                                    </span>
                                                </div>
                                                <div className={styles.stat}>
                                                    <span className={styles.statLabel}>Time</span>
                                                    <span className={styles.statValue} style={{ fontSize: '1rem' }}>
                                                        {r.timeTakenMs < 1000 ? `${r.timeTakenMs}ms` : `${(r.timeTakenMs / 1000).toFixed(1)}s`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </ResultsCard>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
