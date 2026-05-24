/**
 * File encryption/decryption using Web Crypto API (AES-GCM)
 * All processing happens client-side
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const FILENAME_LENGTH_BYTES = 2;
const KEY_ITERATIONS = 100000;

/**
 * Derive an AES-GCM key from a password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: KEY_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a file with a password
 */
export async function encryptFile(file: File, password: string): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt the file content
    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        fileBuffer
    );

    // Store original filename in encrypted metadata
    const encoder = new TextEncoder();
    const filenameBytes = encoder.encode(file.name);
    if (filenameBytes.length > 0xffff) {
        throw new Error('Filename is too long to encrypt safely');
    }

    const filenameLength = new Uint8Array(FILENAME_LENGTH_BYTES);
    new DataView(filenameLength.buffer).setUint16(0, filenameBytes.length, true);

    // Combine: salt + iv + filenameLength (uint16) + filename + encrypted content
    const combined = new Uint8Array(
        SALT_LENGTH + IV_LENGTH + FILENAME_LENGTH_BYTES + filenameBytes.length + encryptedContent.byteLength
    );

    let offset = 0;
    combined.set(salt, offset); offset += SALT_LENGTH;
    combined.set(iv, offset); offset += IV_LENGTH;
    combined.set(filenameLength, offset); offset += FILENAME_LENGTH_BYTES;
    combined.set(filenameBytes, offset); offset += filenameBytes.length;
    combined.set(new Uint8Array(encryptedContent), offset);

    return new Blob([combined], { type: 'application/octet-stream' });
}

/**
 * Decrypt a file with a password
 */
export async function decryptFile(
    encryptedBlob: Blob,
    password: string
): Promise<{ blob: Blob; filename: string }> {
    const buffer = await encryptedBlob.arrayBuffer();
    const data = new Uint8Array(buffer);
    const minimumHeaderLength = SALT_LENGTH + IV_LENGTH + FILENAME_LENGTH_BYTES;
    if (data.length < minimumHeaderLength) {
        throw new Error('Invalid encrypted file format');
    }

    // Extract components
    let offset = 0;
    const salt = data.slice(offset, offset + SALT_LENGTH); offset += SALT_LENGTH;
    const iv = data.slice(offset, offset + IV_LENGTH); offset += IV_LENGTH;
    const filenameLength = new DataView(data.buffer, data.byteOffset + offset, FILENAME_LENGTH_BYTES).getUint16(0, true);
    offset += FILENAME_LENGTH_BYTES;
    if (offset + filenameLength > data.length) {
        throw new Error('Invalid encrypted file header');
    }
    const filenameBytes = data.slice(offset, offset + filenameLength); offset += filenameLength;
    const encryptedContent = data.slice(offset);

    // Decode original filename
    const decoder = new TextDecoder();
    const filename = decoder.decode(filenameBytes);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt
    const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedContent
    );

    // Determine MIME type based on filename
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        txt: 'text/plain',
        json: 'application/json',
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        mp3: 'audio/mpeg',
        mp4: 'video/mp4',
    };
    const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';

    return {
        blob: new Blob([decryptedContent], { type: mimeType }),
        filename,
    };
}
