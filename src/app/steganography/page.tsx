'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import { encodeMessage, decodeMessage } from '@/lib/steganography';
import styles from './page.module.css';

type Mode = 'encode' | 'decode';

export default function SteganographyPage() {
    const [mode, setMode] = useState<Mode>('encode');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFilesSelect = useCallback((files: File[]) => {
        const file = files[0];
        if (!file || !file.type.startsWith('image/')) return;

        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(file));
        setResultUrl(null);
        setDecodedMessage(null);
        setError(null);
    }, []);

    const handleEncode = async () => {
        if (!selectedFile || !message.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            const resultBlob = await encodeMessage(selectedFile, message);
            setResultUrl(URL.createObjectURL(resultBlob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Encoding failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecode = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const decoded = await decodeMessage(selectedFile);
            if (decoded) {
                setDecodedMessage(decoded);
            } else {
                setDecodedMessage('No hidden message found in this image.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Decoding failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = 'stego_image.png';
        a.click();
    };

    const handleReset = () => {
        setSelectedFile(null);
        setImagePreview(null);
        setResultUrl(null);
        setDecodedMessage(null);
        setMessage('');
        setError(null);
    };

    // Cleanup URLs when they change or component unmounts
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        return () => {
            if (resultUrl) {
                URL.revokeObjectURL(resultUrl);
            }
        };
    }, [resultUrl]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Steganography</h1>
                <p>Hide secret messages inside images using LSB encoding. Completely invisible to the naked eye.</p>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${mode === 'encode' ? styles.active : ''}`}
                    onClick={() => { setMode('encode'); handleReset(); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                    </svg>
                    Encode
                </button>
                <button
                    className={`${styles.tab} ${mode === 'decode' ? styles.active : ''}`}
                    onClick={() => { setMode('decode'); handleReset(); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Decode
                </button>
            </div>

            <div className={styles.workspace}>
                {!imagePreview ? (
                    <FileDropzone
                        onFilesSelect={handleFilesSelect}
                        accept="image/png,image/jpeg,image/webp"
                        label="Drop an image here"
                        description="PNG recommended for best quality"
                    />
                ) : (
                    <div className={styles.preview}>
                        <img src={imagePreview} alt="Selected" className={styles.image} />
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                            Choose Different Image
                        </Button>
                    </div>
                )}

                {mode === 'encode' && imagePreview && (
                    <div className={styles.encodeSection}>
                        <label htmlFor="message" className={styles.label}>
                            Secret Message
                        </label>
                        <textarea
                            id="message"
                            className={styles.textarea}
                            placeholder="Enter your secret message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                        />
                        <Button
                            onClick={handleEncode}
                            isLoading={isProcessing}
                            disabled={!message.trim()}
                            fullWidth
                        >
                            Hide Message in Image
                        </Button>
                    </div>
                )}

                {mode === 'decode' && imagePreview && (
                    <Button
                        onClick={handleDecode}
                        isLoading={isProcessing}
                        fullWidth
                    >
                        Extract Hidden Message
                    </Button>
                )}

                {error && (
                    <ResultsCard title="Error" variant="error">
                        <p>{error}</p>
                    </ResultsCard>
                )}

                {resultUrl && (
                    <ResultsCard
                        title="Message Hidden Successfully"
                        variant="success"
                        actions={
                            <Button onClick={handleDownload} size="sm">
                                Download Image
                            </Button>
                        }
                    >
                        <div className={styles.result}>
                            <img src={resultUrl} alt="Result" className={styles.resultImage} />
                            <p className={styles.hint}>
                                The message is now hidden in this image. Share it with anyone,
                                and only those who know to look will find your secret.
                            </p>
                        </div>
                    </ResultsCard>
                )}

                {decodedMessage && (
                    <ResultsCard
                        title="Hidden Message Found"
                        variant="success"
                    >
                        <div className={styles.decoded}>
                            <pre className={styles.decodedText}>{decodedMessage}</pre>
                        </div>
                    </ResultsCard>
                )}
            </div>
        </div>
    );
}
