/**
 * Steganography utilities using LSB (Least Significant Bit) method
 * All processing happens client-side using Canvas API
 */

// Use a unique delimiter that won't appear in normal text
const DELIMITER = '\x00\x00\x00END\x00\x00\x00';

/**
 * Encode a text message into an image using LSB steganography
 */
export async function encodeMessage(
    imageFile: File,
    message: string
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
            // Cleanup object URL as soon as image loads
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Add delimiter to mark end of message
                const fullMessage = message + DELIMITER;
                const binaryMessage = textToBinary(fullMessage);

                // Check if message fits in image
                // Using RGB channels only (not alpha) = 3 bits per pixel
                const maxBits = Math.floor(data.length * 0.75);
                if (binaryMessage.length > maxBits) {
                    reject(new Error(`Message too long. Maximum ${Math.floor(maxBits / 8)} characters.`));
                    return;
                }

                // Embed message in LSB of each color channel
                let bitIndex = 0;
                for (let i = 0; i < data.length && bitIndex < binaryMessage.length; i++) {
                    // Skip alpha channel (every 4th value starting at index 3)
                    if (i % 4 === 3) continue;

                    // Clear LSB and set to message bit
                    const bit = binaryMessage[bitIndex] === '1' ? 1 : 0;
                    data[i] = (data[i] & 0xFE) | bit;
                    bitIndex++;
                }

                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                }, 'image/png');
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
    });
}

/**
 * Decode a hidden message from an image
 */
export async function decodeMessage(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);

        img.onload = () => {
            // Cleanup object URL as soon as image loads
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Extract LSB from each color channel
                let binaryMessage = '';
                for (let i = 0; i < data.length; i++) {
                    // Skip alpha channel
                    if (i % 4 === 3) continue;

                    // Extract LSB and explicitly convert to string
                    binaryMessage += (data[i] & 1).toString();
                }

                // Convert binary to text
                const message = binaryToText(binaryMessage);

                // Find delimiter
                const delimiterIndex = message.indexOf(DELIMITER);

                if (delimiterIndex === -1) {
                    resolve('');
                } else {
                    resolve(message.substring(0, delimiterIndex));
                }
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
    });
}

/**
 * Convert text to binary string
 */
function textToBinary(text: string): string {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        binary += charCode.toString(2).padStart(8, '0');
    }
    return binary;
}

/**
 * Convert binary string to text
 * NOTE: Does NOT stop at null bytes - we need to find the delimiter
 */
function binaryToText(binary: string): string {
    let text = '';
    // Only process enough bytes to find the delimiter (limit for performance)
    const maxBytes = Math.min(binary.length / 8, 100000);

    for (let i = 0; i < maxBytes; i++) {
        const startBit = i * 8;
        const byte = binary.substring(startBit, startBit + 8);
        if (byte.length === 8) {
            const charCode = parseInt(byte, 2);
            text += String.fromCharCode(charCode);

            // Check if we found the delimiter (early exit for performance)
            if (text.endsWith(DELIMITER)) {
                break;
            }
        }
    }
    return text;
}

/**
 * Calculate maximum message length for an image
 */
export function getMaxMessageLength(width: number, height: number): number {
    // 3 channels (RGB) * width * height pixels / 8 bits per char
    return Math.floor((width * height * 3) / 8) - DELIMITER.length;
}
