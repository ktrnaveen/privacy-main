'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import { encryptFile, decryptFile } from '@/lib/encryption';
import styles from './page.module.css';

type Mode = 'encrypt' | 'decrypt';

export default function EncryptPage() {
    const [mode, setMode] = useState<Mode>('encrypt');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultFilename, setResultFilename] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleFilesSelect = useCallback((files: File[]) => {
        setSelectedFile(files[0] || null);
        setResultUrl(null);
        setError(null);
    }, []);

    const handleEncrypt = async () => {
        if (!selectedFile || !password) return;

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const encryptedBlob = await encryptFile(selectedFile, password);
            setResultUrl(URL.createObjectURL(encryptedBlob));
            setResultFilename(selectedFile.name + '.encrypted');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Encryption failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecrypt = async () => {
        if (!selectedFile || !password) return;

        setIsProcessing(true);
        setError(null);

        try {
            const { blob, filename } = await decryptFile(selectedFile, password);
            setResultUrl(URL.createObjectURL(blob));
            setResultFilename(filename);
        } catch (err) {
            if (err instanceof Error && err.message.includes('decrypt')) {
                setError('Wrong password or corrupted file');
            } else {
                setError(err instanceof Error ? err.message : 'Decryption failed');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = resultFilename;
        a.click();
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPassword('');
        setConfirmPassword('');
        setResultUrl(null);
        setError(null);
    };

    // Cleanup URL when resultUrl changes or component unmounts
    useEffect(() => {
        return () => {
            if (resultUrl) {
                URL.revokeObjectURL(resultUrl);
            }
        };
    }, [resultUrl]);

    const isValid = mode === 'encrypt'
        ? selectedFile && password.length >= 8 && password === confirmPassword
        : selectedFile && password.length > 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>File Encryption</h1>
                <p>Encrypt any file with AES-256-GCM. Your password never leaves your device.</p>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${mode === 'encrypt' ? styles.active : ''}`}
                    onClick={() => { setMode('encrypt'); handleReset(); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Encrypt
                </button>
                <button
                    className={`${styles.tab} ${mode === 'decrypt' ? styles.active : ''}`}
                    onClick={() => { setMode('decrypt'); handleReset(); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                    Decrypt
                </button>
            </div>

            <div className={styles.workspace}>
                {!selectedFile ? (
                    <FileDropzone
                        onFilesSelect={handleFilesSelect}
                        accept={mode === 'decrypt' ? '.encrypted' : '*'}
                        label={mode === 'encrypt' ? 'Drop any file to encrypt' : 'Drop encrypted file'}
                        description={mode === 'encrypt' ? 'Any file type supported' : 'Must be a .encrypted file'}
                    />
                ) : (
                    <div className={styles.fileInfo}>
                        <div className={styles.fileIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                <polyline points="13 2 13 9 20 9" />
                            </svg>
                        </div>
                        <div className={styles.fileName}>{selectedFile.name}</div>
                        <div className={styles.fileSize}>
                            {(selectedFile.size / 1024).toFixed(2)} KB
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                            Choose Different File
                        </Button>
                    </div>
                )}

                <div className={styles.passwordSection}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder={mode === 'encrypt' ? 'Enter a strong password' : 'Enter password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {mode === 'encrypt' && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirm" className={styles.label}>
                                Confirm Password
                            </label>
                            <input
                                id="confirm"
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    )}

                    {mode === 'encrypt' && password.length > 0 && password.length < 8 && (
                        <p className={styles.hint}>Password must be at least 8 characters</p>
                    )}
                </div>

                <Button
                    onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                    isLoading={isProcessing}
                    disabled={!isValid}
                    fullWidth
                >
                    {mode === 'encrypt' ? 'Encrypt File' : 'Decrypt File'}
                </Button>

                {error && (
                    <ResultsCard title="Error" variant="error">
                        <p>{error}</p>
                    </ResultsCard>
                )}

                {resultUrl && (
                    <ResultsCard
                        title={mode === 'encrypt' ? 'File Encrypted' : 'File Decrypted'}
                        variant="success"
                        actions={
                            <Button onClick={handleDownload} size="sm">
                                Download
                            </Button>
                        }
                    >
                        <div className={styles.result}>
                            <div className={styles.resultIcon}>
                                {mode === 'encrypt' ? '🔒' : '🔓'}
                            </div>
                            <p className={styles.resultFilename}>{resultFilename}</p>
                            <p className={styles.resultHint}>
                                {mode === 'encrypt'
                                    ? 'Keep your password safe! Without it, the file cannot be recovered.'
                                    : 'Your file has been successfully decrypted.'}
                            </p>
                        </div>
                    </ResultsCard>
                )}
            </div>

            <div className={styles.securityNote}>
                <h4>🔐 Security Info</h4>
                <ul>
                    <li>AES-256-GCM encryption (military grade)</li>
                    <li>PBKDF2 key derivation (100,000 iterations)</li>
                    <li>All processing happens locally in your browser</li>
                    <li>Your password is never transmitted anywhere</li>
                </ul>
            </div>
        </div>
    );
}
