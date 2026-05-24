'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileDropzone, ResultsCard, Button } from '@/components';
import { encryptFile, decryptFile } from '@/lib/encryption';
import styles from './page.module.css';

type Mode = 'encrypt' | 'decrypt';

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

interface StrengthResult {
    level: StrengthLevel;
    score: number; // 0-100
    label: string;
    color: string;
    suggestions: string[];
}

function measurePasswordStrength(password: string): StrengthResult {
    if (!password) return { level: 'weak', score: 0, label: '', color: 'transparent', suggestions: [] };

    let score = 0;
    const suggestions: string[] = [];

    // Length
    if (password.length >= 8) score += 15;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    else suggestions.push('Use 16+ characters');

    // Character variety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (hasLower) score += 10;
    if (hasUpper) { score += 10; } else suggestions.push('Add uppercase letters');
    if (hasDigit) { score += 15; } else suggestions.push('Add numbers');
    if (hasSymbol) { score += 20; } else suggestions.push('Add symbols (!@#$...)');

    // Entropy bonus for length
    if (password.length >= 20) score += 5;

    // Penalize repeated chars
    if (/(.)\1{2,}/.test(password)) { score -= 10; suggestions.push('Avoid repeated characters'); }

    // Penalize common patterns
    if (/^(123|abc|qwerty|password|admin)/i.test(password)) { score -= 20; suggestions.push('Avoid common patterns'); }

    score = Math.min(100, Math.max(0, score));

    if (score < 25) return { level: 'weak', score, label: 'Weak', color: '#ef4444', suggestions };
    if (score < 50) return { level: 'fair', score, label: 'Fair', color: '#f97316', suggestions };
    if (score < 70) return { level: 'good', score, label: 'Good', color: '#eab308', suggestions };
    if (score < 88) return { level: 'strong', score, label: 'Strong', color: '#22c55e', suggestions };
    return { level: 'very-strong', score, label: 'Very Strong', color: '#059669', suggestions: [] };
}

function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
}

function calculateEntropy(password: string): number {
    const hasLower = /[a-z]/.test(password) ? 26 : 0;
    const hasUpper = /[A-Z]/.test(password) ? 26 : 0;
    const hasDigit = /\d/.test(password) ? 10 : 0;
    const hasSymbol = /[^a-zA-Z0-9]/.test(password) ? 32 : 0;
    const pool = hasLower + hasUpper + hasDigit + hasSymbol || 1;
    return Math.round(password.length * Math.log2(pool));
}

export default function EncryptPage() {
    const [mode, setMode] = useState<Mode>('encrypt');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultFilename, setResultFilename] = useState<string>('');
    const [resultSize, setResultSize] = useState<number>(0);
    const [processingTime, setProcessingTime] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const strength = useMemo(() => measurePasswordStrength(password), [password]);
    const entropy = useMemo(() => calculateEntropy(password), [password]);

    const handleFilesSelect = useCallback((files: File[]) => {
        setSelectedFile(files[0] || null);
        setResultUrl(null);
        setResultBlob(null);
        setError(null);
    }, []);

    const handleEncrypt = async () => {
        if (!selectedFile || !password) return;
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

        setIsProcessing(true);
        setError(null);
        const start = performance.now();

        try {
            const blob = await encryptFile(selectedFile, password);
            setProcessingTime(Math.round(performance.now() - start));
            setResultBlob(blob);
            setResultUrl(URL.createObjectURL(blob));
            setResultSize(blob.size);
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
        const start = performance.now();

        try {
            const { blob, filename } = await decryptFile(selectedFile, password);
            setProcessingTime(Math.round(performance.now() - start));
            setResultBlob(blob);
            setResultUrl(URL.createObjectURL(blob));
            setResultSize(blob.size);
            setResultFilename(filename);
        } catch (err) {
            setError(err instanceof Error && err.message.includes('decrypt')
                ? 'Wrong password or corrupted file'
                : err instanceof Error ? err.message : 'Decryption failed'
            );
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
        setResultBlob(null);
        setError(null);
    };

    useEffect(() => {
        return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
    }, [resultUrl]);

    const isValid = mode === 'encrypt'
        ? selectedFile && password.length >= 8 && password === confirmPassword
        : selectedFile && password.length > 0;

    const overheadBytes = resultBlob && selectedFile ? resultBlob.size - selectedFile.size : null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>File Encryption</h1>
                <p>Encrypt any file with AES-256-GCM. Your password never leaves your device.</p>
            </header>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${mode === 'encrypt' ? styles.active : ''}`}
                    onClick={() => { setMode('encrypt'); handleReset(); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Encrypt
                </button>
                <button className={`${styles.tab} ${mode === 'decrypt' ? styles.active : ''}`}
                    onClick={() => { setMode('decrypt'); handleReset(); }}>
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
                        <div className={styles.fileSize}>{formatFileSize(selectedFile.size)}</div>
                        <Button variant="ghost" size="sm" onClick={handleReset}>Choose Different File</Button>
                    </div>
                )}

                <div className={styles.passwordSection}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder={mode === 'encrypt' ? 'Enter a strong password' : 'Enter password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="button" className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {/* Password Strength Meter (Feature 2) */}
                        {mode === 'encrypt' && password.length > 0 && (
                            <div className={styles.strengthMeter}>
                                <div className={styles.strengthBar}>
                                    <div
                                        className={styles.strengthFill}
                                        style={{ width: `${strength.score}%`, background: strength.color }}
                                    />
                                </div>
                                <div className={styles.strengthRow}>
                                    <span className={styles.strengthLabel} style={{ color: strength.color }}>
                                        {strength.label}
                                    </span>
                                    <span className={styles.entropyLabel}>
                                        {entropy} bits entropy
                                    </span>
                                </div>
                                {strength.suggestions.length > 0 && (
                                    <ul className={styles.suggestions}>
                                        {strength.suggestions.map(s => (
                                            <li key={s}>↑ {s}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {mode === 'encrypt' && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirm" className={styles.label}>Confirm Password</label>
                            <input
                                id="confirm"
                                type={showPassword ? 'text' : 'password'}
                                className={`${styles.input} ${confirmPassword && confirmPassword !== password ? styles.inputError : ''}`}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            {confirmPassword && confirmPassword !== password && (
                                <p className={styles.hint} style={{ color: 'var(--color-accent-rose)' }}>
                                    Passwords do not match
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <Button onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                    isLoading={isProcessing} disabled={!isValid} fullWidth>
                    {mode === 'encrypt' ? 'Encrypt File' : 'Decrypt File'}
                </Button>

                {error && (
                    <ResultsCard title="Error" variant="error"><p>{error}</p></ResultsCard>
                )}

                {resultUrl && (
                    <ResultsCard
                        title={mode === 'encrypt' ? '🔒 File Encrypted' : '🔓 File Decrypted'}
                        variant="success"
                        actions={<Button onClick={handleDownload} size="sm">Download</Button>}
                    >
                        <div className={styles.result}>
                            {/* Feature 10: File Size + Format Info */}
                            <div className={styles.resultStats}>
                                <div className={styles.resultStat}>
                                    <span className={styles.resultStatLabel}>Original</span>
                                    <span className={styles.resultStatValue}>{selectedFile ? formatFileSize(selectedFile.size) : '—'}</span>
                                </div>
                                <div className={styles.resultStatArrow}>→</div>
                                <div className={styles.resultStat}>
                                    <span className={styles.resultStatLabel}>{mode === 'encrypt' ? 'Encrypted' : 'Decrypted'}</span>
                                    <span className={styles.resultStatValue}>{formatFileSize(resultSize)}</span>
                                </div>
                                {overheadBytes !== null && mode === 'encrypt' && (
                                    <div className={styles.resultStat}>
                                        <span className={styles.resultStatLabel}>Overhead</span>
                                        <span className={styles.resultStatValue}>+{formatFileSize(overheadBytes)}</span>
                                    </div>
                                )}
                                <div className={styles.resultStat}>
                                    <span className={styles.resultStatLabel}>Time</span>
                                    <span className={styles.resultStatValue}>
                                        {processingTime < 1000 ? `${processingTime}ms` : `${(processingTime / 1000).toFixed(1)}s`}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.algoInfo}>
                                <span>AES-256-GCM</span>
                                <span>·</span>
                                <span>PBKDF2 · 100k iterations</span>
                                <span>·</span>
                                <span>{entropy} bit key entropy</span>
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
