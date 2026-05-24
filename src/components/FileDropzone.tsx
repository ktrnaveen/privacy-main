'use client';

import { useCallback, useState, DragEvent, ChangeEvent, useId } from 'react';
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
    const [error, setError] = useState<string | null>(null);

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
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${error ? styles.error : ''}`}
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
                <span className={styles.labelText}>{label}</span>
                <span className={styles.description}>{description}</span>
                {error && <span className={styles.errorText}>{error}</span>}
            </label>
        </div>
    );
}
