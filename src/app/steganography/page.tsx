'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import { encodeMessage, decodeMessage, getMaxMessageLength } from '@/lib/steganography';
import styles from './page.module.css';

type Mode = 'encode' | 'decode';

export default function SteganographyPage() {
    const [mode, setMode] = useState<Mode>('encode');
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [decodePassword, setDecodePassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [useEncryption, setUseEncryption] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
    const [needsPassword, setNeedsPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const maxChars = imageDimensions
        ? getMaxMessageLength(imageDimensions.w, imageDimensions.h)
        : null;

    const handleFilesSelect = useCallback((files: File[]) => {
        const file = files[0];
        if (!file || !file.type.startsWith('image/')) return;

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
        setResultUrl(null);
        setDecodedMessage(null);
        setNeedsPassword(false);
        setError(null);

        // Get image dimensions for capacity display
        const img = new Image();
        img.onload = () => {
            setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            URL.revokeObjectURL(url);
        };
        img.src = url;
        setImagePreview(URL.createObjectURL(file));
    }, []);

    const handleEncode = async () => {
        if (!selectedFile || !message.trim()) return;
        if (useEncryption && !password) { setError('Please enter a password for encryption'); return; }

        setIsProcessing(true);
        setError(null);

        try {
            const blob = await encodeMessage(selectedFile, message, useEncryption ? password : undefined);
            setResultUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Encoding failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecode = async (pwd?: string) => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const decoded = await decodeMessage(selectedFile, pwd);
            if (decoded === '__ENCRYPTED__') {
                setNeedsPassword(true);
                setDecodedMessage(null);
            } else if (decoded) {
                setNeedsPassword(false);
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
        setNeedsPassword(false);
        setMessage('');
        setPassword('');
        setDecodePassword('');
        setImageDimensions(null);
        setError(null);
    };

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    useEffect(() => {
        return () => {
            if (resultUrl) URL.revokeObjectURL(resultUrl);
        };
    }, [resultUrl]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Steganography</h1>
                <p>Hide secret messages inside images using LSB encoding. Optionally protect with AES-256 encryption.</p>
            </header>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${mode === 'encode' ? styles.active : ''}`}
                    onClick={() => { setMode('encode'); handleReset(); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                    </svg>
                    Encode
                </button>
                <button className={`${styles.tab} ${mode === 'decode' ? styles.active : ''}`}
                    onClick={() => { setMode('decode'); handleReset(); }}>
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
                        description="PNG recommended for lossless encoding"
                    />
                ) : (
                    <div className={styles.preview}>
                        <img src={imagePreview} alt="Selected" className={styles.image} />
                        {imageDimensions && (
                            <div className={styles.imageInfo}>
                                {imageDimensions.w} × {imageDimensions.h}px
                                {maxChars !== null && (
                                    <span className={styles.capacity}>
                                        &nbsp;· Capacity: ~{maxChars.toLocaleString()} chars
                                    </span>
                                )}
                            </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                            Choose Different Image
                        </Button>
                    </div>
                )}

                {/* ---- Encode mode ---- */}
                {mode === 'encode' && imagePreview && (
                    <div className={styles.encodeSection}>
                        <label htmlFor="message" className={styles.label}>
                            Secret Message
                            {maxChars !== null && (
                                <span className={`${styles.charCount} ${message.length > maxChars ? styles.charCountOver : ''}`}>
                                    {message.length.toLocaleString()} / {maxChars.toLocaleString()}
                                </span>
                            )}
                        </label>
                        <textarea
                            id="message"
                            className={styles.textarea}
                            placeholder="Enter your secret message..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={4}
                        />

                        {/* Feature 7: Password toggle */}
                        <div className={styles.encryptToggle}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={useEncryption}
                                    onChange={e => setUseEncryption(e.target.checked)}
                                    className={styles.toggleCheckbox}
                                />
                                <span className={styles.toggleText}>
                                    🔒 Protect with password (AES-256)
                                </span>
                            </label>
                            <span className={styles.toggleHint}>
                                Only someone with the password can decode the message
                            </span>
                        </div>

                        {useEncryption && (
                            <div className={styles.passwordField}>
                                <label className={styles.label} htmlFor="stego-password">
                                    Encryption Password
                                </label>
                                <div className={styles.passwordWrapper}>
                                    <input
                                        id="stego-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.input}
                                        placeholder="Enter a strong password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button type="button" className={styles.togglePassword}
                                        onClick={() => setShowPassword(v => !v)}>
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleEncode}
                            isLoading={isProcessing}
                            disabled={!message.trim() || (useEncryption && !password)}
                            fullWidth
                        >
                            Hide Message in Image
                        </Button>
                    </div>
                )}

                {/* ---- Decode mode ---- */}
                {mode === 'decode' && imagePreview && (
                    <div className={styles.decodeSection}>
                        <Button onClick={() => handleDecode()} isLoading={isProcessing} fullWidth>
                            Extract Hidden Message
                        </Button>

                        {/* Password required prompt */}
                        {needsPassword && (
                            <div className={styles.passwordPrompt}>
                                <p className={styles.passwordPromptText}>
                                    🔒 This message is password-protected. Enter the password to decode it.
                                </p>
                                <div className={styles.passwordWrapper}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.input}
                                        placeholder="Enter decryption password"
                                        value={decodePassword}
                                        onChange={e => setDecodePassword(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleDecode(decodePassword); }}
                                        autoFocus
                                    />
                                    <button type="button" className={styles.togglePassword}
                                        onClick={() => setShowPassword(v => !v)}>
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                <Button onClick={() => handleDecode(decodePassword)}
                                    isLoading={isProcessing} disabled={!decodePassword} fullWidth>
                                    Decrypt & Reveal
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {error && <ResultsCard title="Error" variant="error"><p>{error}</p></ResultsCard>}

                {resultUrl && (
                    <ResultsCard title="Message Hidden Successfully" variant="success"
                        actions={<Button onClick={handleDownload} size="sm">Download Image</Button>}>
                        <div className={styles.result}>
                            <img src={resultUrl} alt="Result" className={styles.resultImage} />
                            <p className={styles.hint}>
                                {useEncryption
                                    ? '🔒 Message is AES-256 encrypted inside this image. Share both the image AND your password with the recipient.'
                                    : 'The message is now hidden in this image. Share it — only those who look will find your secret.'}
                            </p>
                        </div>
                    </ResultsCard>
                )}

                {decodedMessage && !needsPassword && (
                    <ResultsCard title="Hidden Message Found" variant="success">
                        <div className={styles.decoded}>
                            <pre className={styles.decodedText}>{decodedMessage}</pre>
                        </div>
                    </ResultsCard>
                )}
            </div>
        </div>
    );
}
