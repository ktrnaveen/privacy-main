'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import styles from './page.module.css';

interface MetadataInfo {
    [key: string]: unknown;
}

const SENSITIVE_KEYS = [
    'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSSpeed', 'GPSDateStamp',
    'Make', 'Model', 'Software', 'Artist', 'Copyright', 'SerialNumber',
    'LensSerialNumber', 'OwnerName', 'CameraSerialNumber',
];

function isSensitive(key: string) {
    return SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()));
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
        if (value instanceof Date) return value.toLocaleString();
        if (Array.isArray(value)) return value.join(', ');
        return JSON.stringify(value);
    }
    return String(value);
}

function extractGPS(metadata: MetadataInfo): { lat: number; lon: number } | null {
    const lat = metadata['latitude'] ?? metadata['GPSLatitude'];
    const lon = metadata['longitude'] ?? metadata['GPSLongitude'];
    if (lat !== undefined && lon !== undefined) {
        const latN = typeof lat === 'number' ? lat : parseFloat(String(lat));
        const lonN = typeof lon === 'number' ? lon : parseFloat(String(lon));
        if (!isNaN(latN) && !isNaN(lonN)) return { lat: latN, lon: lonN };
    }
    return null;
}

export default function MetadataPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
    const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Feature 8: selected keys for removal
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    const handleFilesSelect = useCallback(async (files: File[]) => {
        const file = files[0];
        if (!file) return;

        setIsProcessing(true);
        setMetadata(null);
        setCleanedUrl(null);
        setError(null);
        setOriginalFile(file);
        setSelectedKeys(new Set());
        setSelectionMode(false);

        try {
            const { default: exifr } = await import('exifr');
            const data = await exifr.parse(file, {
                tiff: true, xmp: true, icc: true, iptc: true, jfif: true,
                translateValues: true, translateKeys: true,
            });
            setMetadata(data && Object.keys(data).length > 0 ? data : {});
        } catch {
            setMetadata({});
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const stripMetadata = useCallback(async (keysToRemove?: Set<string>) => {
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
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), 'image/png');
            });

            setCleanedUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clean metadata');
        } finally {
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
            setIsProcessing(false);
        }
    }, [originalFile]);

    const handleNukeAll = () => stripMetadata();

    const handleRemoveSelected = () => {
        if (selectedKeys.size === 0) return;
        stripMetadata(selectedKeys);
    };

    const handleSelectAllSensitive = () => {
        if (!metadata) return;
        const sensKeys = Object.keys(metadata).filter(k => isSensitive(k));
        setSelectedKeys(new Set(sensKeys));
    };

    const toggleKey = (key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const handleDownload = () => {
        if (!cleanedUrl || !originalFile) return;
        const a = document.createElement('a');
        a.href = cleanedUrl;
        a.download = originalFile.name.replace(/\.[^.]+$/, '_clean.png');
        a.click();
    };

    useEffect(() => {
        return () => { if (cleanedUrl) URL.revokeObjectURL(cleanedUrl); };
    }, [cleanedUrl]);

    const metadataEntries = metadata
        ? Object.entries(metadata).filter(([k]) => !k.startsWith('_') && !['thumbnail', 'ThumbnailImage'].includes(k))
        : [];

    const gps = metadata ? extractGPS(metadata) : null;
    const sensitiveCount = metadataEntries.filter(([k]) => isSensitive(k)).length;

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

            {error && <ResultsCard title="Error" variant="error"><p>{error}</p></ResultsCard>}

            {/* Feature 3: GPS Map Preview */}
            {gps && (
                <div className={styles.gpsCard}>
                    <div className={styles.gpsHeader}>
                        <span className={styles.gpsWarning}>
                            ⚠️ GPS Location Detected — This image reveals your exact location!
                        </span>
                        <span className={styles.gpsCoords}>
                            {gps.lat.toFixed(6)}°, {gps.lon.toFixed(6)}°
                        </span>
                    </div>
                    <iframe
                        className={styles.gpsMap}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${gps.lon - 0.01},${gps.lat - 0.01},${gps.lon + 0.01},${gps.lat + 0.01}&layer=mapnik&marker=${gps.lat},${gps.lon}`}
                        title="GPS Location"
                        loading="lazy"
                    />
                    <a
                        href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=15/${gps.lat}/${gps.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.gpsLink}
                    >
                        Open in OpenStreetMap ↗
                    </a>
                </div>
            )}

            {metadata !== null && (
                <ResultsCard
                    title={metadataEntries.length > 0 ? `${metadataEntries.length} Metadata Fields Found` : 'No Metadata Found'}
                    variant={metadataEntries.length > 0 ? 'warning' : 'success'}
                    actions={
                        metadataEntries.length > 0 ? (
                            <div className={styles.actionGroup}>
                                {!selectionMode ? (
                                    <>
                                        <Button variant="secondary" size="sm" onClick={() => setSelectionMode(true)}>
                                            ✓ Select Fields
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={handleNukeAll} isLoading={isProcessing}>
                                            🔥 Nuke All
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={handleSelectAllSensitive}>
                                            Select Sensitive ({sensitiveCount})
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set(metadataEntries.map(([k]) => k)))}>
                                            Select All
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => { setSelectionMode(false); setSelectedKeys(new Set()); }}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="danger" size="sm"
                                            onClick={handleRemoveSelected}
                                            disabled={selectedKeys.size === 0}
                                            isLoading={isProcessing}
                                        >
                                            Remove {selectedKeys.size > 0 ? `(${selectedKeys.size})` : 'Selected'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : undefined
                    }
                >
                    {metadataEntries.length > 0 ? (
                        <div className={styles.metadataList}>
                            {metadataEntries.map(([key, value]) => (
                                <div
                                    key={key}
                                    className={`${styles.metadataItem} ${isSensitive(key) ? styles.sensitive : ''} ${selectionMode ? styles.selectable : ''} ${selectedKeys.has(key) ? styles.selected : ''}`}
                                    onClick={selectionMode ? () => toggleKey(key) : undefined}
                                >
                                    {selectionMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedKeys.has(key)}
                                            onChange={() => toggleKey(key)}
                                            className={styles.checkbox}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    )}
                                    <span className={styles.key}>{key}</span>
                                    <span className={styles.value}>{formatValue(value)}</span>
                                    {isSensitive(key) && <span className={styles.sensitiveTag}>⚠ Sensitive</span>}
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
                    actions={<Button onClick={handleDownload} size="sm">Download Clean Image</Button>}
                >
                    <div className={styles.cleanResult}>
                        <p>All selected metadata has been stripped. The clean version is ready for download.</p>
                        <img src={cleanedUrl} alt="Cleaned" className={styles.preview} />
                    </div>
                </ResultsCard>
            )}
        </div>
    );
}
