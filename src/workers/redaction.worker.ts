// redaction.worker.ts
// TRUE REDACTION via canvas rasterization.
//
// Strategy:
//   1. Load the original PDF with pdfjs-dist (running single-threaded inside this worker).
//   2. For each page, render to an OffscreenCanvas.
//   3. Paint solid black rectangles over the redacted areas.
//   4. Convert the canvas to JPEG and embed it into a new PDF document via pdf-lib.
//   5. Return the new PDF bytes — the text layer no longer exists, so text
//      cannot be selected, copied, or extracted from the output.

import { PDFDocument } from 'pdf-lib';

// Inline type — @/ path aliases are not available in web worker scope
interface RedactionArea {
    pageIndex: number;
    x: number;      // PDF points, measured from left edge
    y: number;      // PDF points, measured from BOTTOM (stored in PDF coordinate space)
    width: number;  // PDF points
    height: number; // PDF points
}

self.onmessage = async (e: MessageEvent) => {
    const { pdfBytes, redactions } = e.data as {
        pdfBytes: Uint8Array;
        redactions: RedactionArea[];
    };

    try {
        const redactedPdfBytes = await applyTrueRedactions(pdfBytes, redactions);
        self.postMessage({ type: 'SUCCESS', pdfBytes: redactedPdfBytes });
    } catch (error) {
        console.error('[RedactionWorker] Error:', error);
        self.postMessage({ type: 'ERROR', error: (error as Error).message });
    }
};

async function applyTrueRedactions(
    pdfBytes: Uint8Array,
    redactions: RedactionArea[]
): Promise<Uint8Array> {
    // Dynamically import pdfjs-dist inside the worker.
    // We disable the external workerSrc so pdfjs runs synchronously
    // in this same worker thread (no nested workers).
    const pdfjsLib = await import('pdfjs-dist');
    // Disable the external PDF.js worker — we're already in a worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    // Load the PDF with pdfjs for high-quality rendering
    const loadingTask = pdfjsLib.getDocument({
        data: pdfBytes,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    });
    const pdfJsDoc = await loadingTask.promise;
    const numPages = pdfJsDoc.numPages;

    // Index redactions by page (0-based)
    const redactionsByPage = new Map<number, RedactionArea[]>();
    redactions.forEach(r => {
        if (!redactionsByPage.has(r.pageIndex)) {
            redactionsByPage.set(r.pageIndex, []);
        }
        redactionsByPage.get(r.pageIndex)!.push(r);
    });

    // Create a brand-new PDF document — this will contain only rasterized images,
    // no text layer, no font data, no metadata from the original.
    const newPdfDoc = await PDFDocument.create();

    // Render at 2x resolution for crisp output
    const RENDER_SCALE = 2.0;

    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
        const pdfJsPage = await pdfJsDoc.getPage(pageIdx + 1); // pdfjs is 1-based

        // Original page size in CSS pixels at 1x scale (equals PDF points)
        const viewport1x = pdfJsPage.getViewport({ scale: 1.0 });
        const viewport = pdfJsPage.getViewport({ scale: RENDER_SCALE });

        const canvasWidth = Math.floor(viewport.width);
        const canvasHeight = Math.floor(viewport.height);

        let jpegBytes: Uint8Array;

        if (typeof OffscreenCanvas !== 'undefined') {
            // Modern path: render using OffscreenCanvas in the worker
            const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Render the PDF page
            await pdfJsPage.render({
                canvasContext: ctx as unknown as CanvasRenderingContext2D,
                viewport,
            }).promise;

            // Paint redaction boxes in solid black
            const pageRedactions = redactionsByPage.get(pageIdx) ?? [];
            for (const r of pageRedactions) {
                // r.y is in PDF coordinates (bottom-left origin, in PDF points at scale=1).
                // Convert to canvas pixels (top-left origin, at RENDER_SCALE).
                const pageHeightPoints = viewport1x.height;
                const canvasX = r.x * RENDER_SCALE;
                const canvasY = (pageHeightPoints - r.y - r.height) * RENDER_SCALE;
                const canvasW = r.width * RENDER_SCALE;
                const canvasH = r.height * RENDER_SCALE;

                ctx.fillStyle = '#000000';
                ctx.fillRect(
                    Math.floor(canvasX),
                    Math.floor(canvasY),
                    Math.ceil(canvasW),
                    Math.ceil(canvasH)
                );
            }

            // Convert to JPEG
            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.93 });
            const buf = await blob.arrayBuffer();
            jpegBytes = new Uint8Array(buf);
        } else {
            // Fallback: OffscreenCanvas not available — use visual-only redaction for this page.
            // This should not happen in any modern browser (Chrome 69+, Firefox 105+, Safari 16.4+).
            throw new Error(
                'OffscreenCanvas is not supported in this browser. ' +
                'Please update to a modern browser (Chrome 69+, Firefox 105+, or Safari 16.4+).'
            );
        }

        // Embed the JPEG image into the new PDF
        const jpegImage = await newPdfDoc.embedJpg(jpegBytes);

        // Add a page with the same dimensions as the original (in PDF points = 72 DPI)
        const newPage = newPdfDoc.addPage([viewport1x.width, viewport1x.height]);

        // Draw the image to fill the full page
        newPage.drawImage(jpegImage, {
            x: 0,
            y: 0,
            width: viewport1x.width,
            height: viewport1x.height,
        });
    }

    // Return the new PDF as bytes
    return await newPdfDoc.save();
}
