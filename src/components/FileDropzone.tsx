'use client';

import { useCallback, useState, useEffect, useRef, DragEvent, ChangeEvent, useId } from 'react';
import styles from './FileDropzone.module.css';

export interface FileDropzoneProps {
    onFilesSelect: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export function FileDropzone({
    onFilesSelect,
    accept = '*',
    multiple = false,
    maxSize,
    label = 'Drop files here',
    description = 'or click to browse',
    disabled = false,
}: FileDropzoneProps) {
    const inputId = useId();
    const [isDragging, setIsDragging] = useState(false);
    const [pasteHint, setPasteHint] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const zoneRef = useRef<HTMLDivElement>(null);

    const validateFiles = useCallback(
        (files: File[]): File[] => {
            setError(null);
            if (maxSize) {
                const oversized = files.filter((f) => f.size > maxSize);
                if (oversized.length > 0) {
                    setError(`File(s) exceed maximum size of ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
                    return [];
                }
            }
            return files;
        },
        [maxSize]
    );

    // ---- Clipboard paste support (Feature 6) ----
    useEffect(() => {
        if (disabled) return;
        const handlePaste = (e: ClipboardEvent) => {
            if (!e.clipboardData) return;
            const items = Array.from(e.clipboardData.items);
            const files = items
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFile())
                .filter((f): f is File => f !== null);

            if (files.length === 0) return;
            e.preventDefault();

            const filesToUse = multiple ? files : files.slice(0, 1);
            const valid = validateFiles(filesToUse);
            if (valid.length > 0) {
                // Flash paste hint
                setPasteHint(true);
                setTimeout(() => setPasteHint(false), 1500);
                onFilesSelect(valid);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [disabled, multiple, validateFiles, onFilesSelect]);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (disabled) return;
            const droppedFiles = Array.from(e.dataTransfer.files);
            const filesToUse = multiple ? droppedFiles : droppedFiles.slice(0, 1);
            const validFiles = validateFiles(filesToUse);
            if (validFiles.length > 0) onFilesSelect(validFiles);
        },
        [disabled, multiple, validateFiles, onFilesSelect]
    );

    const handleFileInput = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
            const validFiles = validateFiles(selectedFiles);
            if (validFiles.length > 0) onFilesSelect(validFiles);
            e.target.value = '';
        },
        [validateFiles, onFilesSelect]
    );

    return (
        <div
            ref={zoneRef}
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${error ? styles.error : ''} ${pasteHint ? styles.pasteFlash : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileInput}
                disabled={disabled}
                className={styles.input}
                id={inputId}
            />
            <label htmlFor={inputId} className={styles.label}>
                <div className={styles.iconWrapper}>
                    <div className={styles.iconBg}></div>
                    <svg className={styles.icon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <span className={styles.labelText}>{pasteHint ? '✅ Pasted!' : label}</span>
                <span className={styles.description}>{description}</span>
                <span className={styles.pasteHint}>or paste from clipboard (Ctrl+V)</span>
                {error && <span className={styles.errorText}>{error}</span>}
            </label>
        </div>
    );
}
