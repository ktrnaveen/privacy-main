'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import styles from './page.module.css';

interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    originalUrl: string;
    compressedUrl: string;
    filename: string;
}

export default function CompressPage() {
    const [quality, setQuality] = useState(0.7);
    const [maxWidth, setMaxWidth] = useState(1920);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<CompressionResult | null>(null);

    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        return (bytes / 1024).toFixed(2) + ' KB';
    };

    const handleFilesSelect = useCallback(
        async (files: File[]) => {
            const file = files[0];
            if (!file || !file.type.startsWith('image/')) {
                return;
            }

            setIsProcessing(true);
            setResult(null);

            try {
                const { default: imageCompression } = await import('browser-image-compression');
                const options = {
                    maxSizeMB: 10,
                    maxWidthOrHeight: maxWidth,
                    useWebWorker: true,
                    initialQuality: quality,
                };

                const compressedFile = await imageCompression(file, options);

                const originalUrl = URL.createObjectURL(file);
                const compressedUrl = URL.createObjectURL(compressedFile);

                setResult({
                    originalSize: file.size,
                    compressedSize: compressedFile.size,
                    originalUrl,
                    compressedUrl,
                    filename: file.name.replace(/\.[^.]+$/, '_compressed.jpg'),
                });
            } catch (error) {
                console.error('Compression failed:', error);
            } finally {
                setIsProcessing(false);
            }
        },
        [quality, maxWidth]
    );

    const handleDownload = () => {
        if (!result) return;
        const a = document.createElement('a');
        a.href = result.compressedUrl;
        a.download = result.filename;
        a.click();
    };

    // Cleanup URLs when result changes or component unmounts
    useEffect(() => {
        return () => {
            if (result) {
                URL.revokeObjectURL(result.originalUrl);
                URL.revokeObjectURL(result.compressedUrl);
            }
        };
    }, [result]);

    const compressionRatio = result
        ? (((result.originalSize - result.compressedSize) / result.originalSize) * 100).toFixed(1)
        : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Image Compression</h1>
                <p>Reduce image file size while maintaining quality. All processing happens in your browser.</p>
            </header>

            <div className={styles.controls}>
                <div className={styles.control}>
                    <label htmlFor="quality">
                        Quality: <span className={styles.value}>{Math.round(quality * 100)}%</span>
                    </label>
                    <input
                        id="quality"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                    />
                </div>
                <div className={styles.control}>
                    <label htmlFor="maxWidth">
                        Max Width: <span className={styles.value}>{maxWidth}px</span>
                    </label>
                    <input
                        id="maxWidth"
                        type="range"
                        min="640"
                        max="4096"
                        step="128"
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                    />
                </div>
            </div>

            <FileDropzone
                onFilesSelect={handleFilesSelect}
                accept="image/*"
                label={isProcessing ? 'Compressing...' : 'Drop an image here'}
                description="Supports JPEG, PNG, WebP, and more"
                disabled={isProcessing}
            />

            {result && (
                <ResultsCard
                    title="Compression Result"
                    variant="success"
                    actions={
                        <Button onClick={handleDownload} size="sm">
                            Download
                        </Button>
                    }
                >
                    <div className={styles.results}>
                        <div className={styles.comparison}>
                            <div className={styles.imageBox}>
                                <span className={styles.imageLabel}>Original</span>
                                <img src={result.originalUrl} alt="Original" />
                                <span className={styles.size}>{formatSize(result.originalSize)}</span>
                            </div>
                            <div className={styles.arrow}>→</div>
                            <div className={styles.imageBox}>
                                <span className={styles.imageLabel}>Compressed</span>
                                <img src={result.compressedUrl} alt="Compressed" />
                                <span className={styles.size}>{formatSize(result.compressedSize)}</span>
                            </div>
                        </div>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Size Reduction</span>
                                <span className={styles.statValue}>{compressionRatio}%</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Saved</span>
                                <span className={styles.statValue}>
                                    {formatSize(result.originalSize - result.compressedSize)}
                                </span>
                            </div>
                        </div>
                    </div>
                </ResultsCard>
            )}
        </div>
    );
}
