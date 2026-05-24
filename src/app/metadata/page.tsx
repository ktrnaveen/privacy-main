'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import styles from './page.module.css';

interface MetadataInfo {
    [key: string]: unknown;
}

export default function MetadataPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
    const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'object') {
            if (value instanceof Date) return value.toLocaleString();
            if (Array.isArray(value)) return value.join(', ');
            return JSON.stringify(value);
        }
        return String(value);
    };

    const handleFilesSelect = useCallback(async (files: File[]) => {
        const file = files[0];
        if (!file) return;

        setIsProcessing(true);
        setMetadata(null);
        setCleanedUrl(null);
        setError(null);
        setOriginalFile(file);

        try {
            const { default: exifr } = await import('exifr');
            const data = await exifr.parse(file, {
                tiff: true,
                xmp: true,
                icc: true,
                iptc: true,
                jfif: true,
                translateValues: true,
                translateKeys: true,
            });

            if (data && Object.keys(data).length > 0) {
                setMetadata(data);
            } else {
                setMetadata({});
            }
        } catch (err) {
            // Some files may not have metadata
            setMetadata({});
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleNukeMetadata = async () => {
        if (!originalFile) return;

        setIsProcessing(true);
        setError(null);

        let sourceUrl: string | null = null;
        try {
            const img = new Image();
            sourceUrl = URL.createObjectURL(originalFile);

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = sourceUrl as string;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            ctx.drawImage(img, 0, 0);

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create clean image'));
                }, 'image/png');
            });

            setCleanedUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clean metadata');
        } finally {
            if (sourceUrl) {
                URL.revokeObjectURL(sourceUrl);
            }
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!cleanedUrl || !originalFile) return;
        const a = document.createElement('a');
        a.href = cleanedUrl;
        a.download = originalFile.name.replace(/\.[^.]+$/, '_clean.png');
        a.click();
    };

    // Cleanup URL when cleanedUrl changes or component unmounts
    useEffect(() => {
        return () => {
            if (cleanedUrl) {
                URL.revokeObjectURL(cleanedUrl);
            }
        };
    }, [cleanedUrl]);

    const metadataEntries = metadata ? Object.entries(metadata).filter(
        ([key]) => !key.startsWith('_') && !['thumbnail', 'ThumbnailImage'].includes(key)
    ) : [];

    const sensitiveKeys = ['GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'Software', 'Artist', 'Copyright'];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Metadata Viewer & Remover</h1>
                <p>View and strip EXIF/IPTC metadata from images. Protect your privacy before sharing photos.</p>
            </header>

            <FileDropzone
                onFilesSelect={handleFilesSelect}
                accept="image/*"
                label={isProcessing ? 'Analyzing...' : 'Drop an image to analyze'}
                description="Supports JPEG, PNG, TIFF, HEIC, and more"
                disabled={isProcessing}
            />

            {error && (
                <ResultsCard title="Error" variant="error">
                    <p>{error}</p>
                </ResultsCard>
            )}

            {metadata !== null && (
                <ResultsCard
                    title={metadataEntries.length > 0 ? 'Metadata Found' : 'No Metadata Found'}
                    variant={metadataEntries.length > 0 ? 'warning' : 'success'}
                    actions={
                        metadataEntries.length > 0 && (
                            <Button
                                onClick={handleNukeMetadata}
                                variant="danger"
                                size="sm"
                                isLoading={isProcessing}
                            >
                                🔥 Nuke All Metadata
                            </Button>
                        )
                    }
                >
                    {metadataEntries.length > 0 ? (
                        <div className={styles.metadataList}>
                            {metadataEntries.map(([key, value]) => (
                                <div
                                    key={key}
                                    className={`${styles.metadataItem} ${sensitiveKeys.some(k => key.includes(k)) ? styles.sensitive : ''
                                        }`}
                                >
                                    <span className={styles.key}>{key}</span>
                                    <span className={styles.value}>{formatValue(value)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noData}>This image contains no extractable metadata. It&apos;s clean!</p>
                    )}
                </ResultsCard>
            )}

            {cleanedUrl && (
                <ResultsCard
                    title="Metadata Removed Successfully"
                    variant="success"
                    actions={
                        <Button onClick={handleDownload} size="sm">
                            Download Clean Image
                        </Button>
                    }
                >
                    <div className={styles.cleanResult}>
                        <p>All metadata has been stripped from your image. The clean version is ready for download.</p>
                        <img src={cleanedUrl} alt="Cleaned" className={styles.preview} />
                    </div>
                </ResultsCard>
            )}
        </div>
    );
}
