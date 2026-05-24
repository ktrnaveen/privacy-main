/**
 * Steganography utilities using LSB (Least Significant Bit) method
 * All processing happens client-side using Canvas API
 *
 * Feature 7: Optional AES-GCM password protection for the hidden message.
 * When a password is provided, the message is encrypted before embedding
 * and decrypted after extraction — so only someone with the password can read it.
 */

// Unique delimiter that won't appear in normal text
const DELIMITER = '\x00\x00\x00END\x00\x00\x00';
// Prefix prepended before the delimiter to distinguish encrypted payloads
const ENC_PREFIX = '\x00ENC\x00';

// ---- AES-GCM helpers ----

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptMessage(plaintext: string, password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));

    // Pack salt + iv + ciphertext into a binary string
    const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    packed.set(salt, 0);
    packed.set(iv, 16);
    packed.set(new Uint8Array(ciphertext), 28);

    // Encode as Latin-1 string so it survives the existing binary encoding
    return Array.from(packed).map(b => String.fromCharCode(b)).join('');
}

async function decryptMessagePayload(payload: string, password: string): Promise<string> {
    const bytes = Uint8Array.from(payload.split('').map(c => c.charCodeAt(0)));
    if (bytes.length < 28) throw new Error('Invalid encrypted payload');

    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ciphertext = bytes.slice(28);
    const key = await deriveKey(password, salt);

    const dec = new TextDecoder();
    try {
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return dec.decode(plaintext);
    } catch {
        throw new Error('Wrong password or corrupted message');
    }
}

// ---- LSB encoding/decoding ----

function textToBinary(text: string): string {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
        binary += text.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return binary;
}

function binaryToText(binary: string): string {
    let text = '';
    const maxBytes = Math.min(Math.floor(binary.length / 8), 200_000);
    for (let i = 0; i < maxBytes; i++) {
        const byte = binary.substring(i * 8, i * 8 + 8);
        if (byte.length < 8) break;
        text += String.fromCharCode(parseInt(byte, 2));
        if (text.endsWith(DELIMITER)) break;
    }
    return text;
}

/**
 * Encode a text message into an image using LSB steganography.
 * If password is provided, the message is AES-256-GCM encrypted first.
 */
export async function encodeMessage(imageFile: File, message: string, password?: string): Promise<Blob> {
    let payload = message;

    if (password) {
        const encrypted = await encryptMessage(message, password);
        payload = ENC_PREFIX + encrypted;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Could not get canvas context')); return; }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                const fullMessage = payload + DELIMITER;
                const binaryMessage = textToBinary(fullMessage);

                const maxBits = Math.floor(data.length * 0.75);
                if (binaryMessage.length > maxBits) {
                    reject(new Error(`Message too long. Maximum ~${Math.floor(maxBits / 8)} bytes.`));
                    return;
                }

                let bitIndex = 0;
                for (let i = 0; i < data.length && bitIndex < binaryMessage.length; i++) {
                    if (i % 4 === 3) continue; // Skip alpha
                    const bit = binaryMessage[bitIndex] === '1' ? 1 : 0;
                    data[i] = (data[i] & 0xFE) | bit;
                    bitIndex++;
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/png');
            } catch (e) { reject(e); }
        };

        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
        img.src = objectUrl;
    });
}

/**
 * Decode a hidden message from an image.
 * If the message was encrypted and a password is provided, it will be decrypted.
 * If encrypted but no password provided, returns a sentinel indicating encryption.
 */
export async function decodeMessage(imageFile: File, password?: string): Promise<string> {
    const raw = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Could not get canvas context')); return; }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let binaryMessage = '';
                for (let i = 0; i < data.length; i++) {
                    if (i % 4 === 3) continue;
                    binaryMessage += (data[i] & 1).toString();
                }
                resolve(binaryToText(binaryMessage));
            } catch (e) { reject(e); }
        };

        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
        img.src = objectUrl;
    });

    const delimIdx = raw.indexOf(DELIMITER);
    if (delimIdx === -1) return '';

    const payload = raw.substring(0, delimIdx);

    if (payload.startsWith(ENC_PREFIX)) {
        const encPayload = payload.slice(ENC_PREFIX.length);
        if (!password) {
            return '__ENCRYPTED__'; // Signal to UI that password is needed
        }
        return await decryptMessagePayload(encPayload, password);
    }

    return payload;
}

/**
 * Calculate maximum message length for an image (unencrypted).
 */
export function getMaxMessageLength(width: number, height: number): number {
    return Math.floor((width * height * 3) / 8) - DELIMITER.length;
}
