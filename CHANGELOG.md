# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [2026-02-20]

### Added
- Added route-level loading skeletons for all tool routes:
  - `src/app/compress/loading.tsx`
  - `src/app/encrypt/loading.tsx`
  - `src/app/metadata/loading.tsx`
  - `src/app/redact/loading.tsx`
  - `src/app/steganography/loading.tsx`
- Added shared loading UI component:
  - `src/components/RouteLoadingSkeleton.tsx`
  - `src/components/RouteLoadingSkeleton.module.css`
- Added dedicated lightweight redaction type module: `src/lib/redaction-types.ts`.

### Changed
- Reduced initial route bundles by deferring heavy dependencies until user action:
  - `browser-image-compression` is dynamically imported in `src/app/compress/page.tsx`.
  - `exifr` is dynamically imported in `src/app/metadata/page.tsx`.
  - `pdfjs-dist` is dynamically imported in `src/hooks/usePDFRedactor.ts`.
- Decoupled UI-facing redaction type imports from `pdf-lib` runtime by switching to type-only imports via `src/lib/redaction-types.ts`.
- Improved PDF rendering behavior in `src/components/PDFRedactor/PDFViewer.tsx`:
  - render task cancellation on rapid page/zoom changes
  - high-DPI canvas sizing for sharper rendering
- Improved PDF redaction overlay responsiveness in `src/components/PDFRedactor/RedactionOverlay.tsx`:
  - pointer events support (mouse/touch/pen)
  - animation-frame scheduled drawing to reduce jank
- Improved PDF editor responsiveness and layout in:
  - `src/app/redact/page.tsx`
  - `src/app/redact/page.module.css`
  - `src/components/PDFRedactor/PDFToolbar.module.css`
- Minor mobile background performance tweak in `src/app/globals.css`.

### Fixed
- Fixed encrypted filename header truncation/corruption for long filenames in `src/lib/encryption.ts` by:
  - moving filename length from 1 byte to 2 bytes
  - adding encrypted file header validation during decryption
- Fixed metadata page object URL leak during image cleanup flow in `src/app/metadata/page.tsx`.
- Fixed duplicate file input `id` collisions in reusable dropzone by using `useId()` in `src/components/FileDropzone.tsx`.
- Fixed PDF redaction download naming so output uses source-based filename (`*_redacted.pdf`) in `src/hooks/usePDFRedactor.ts`.

### Performance
- Route bundle size improvements observed in production build:
  - `/compress`: `22.8 kB` -> `3.16 kB`
  - `/metadata`: `28.9 kB` -> `3.44 kB`
  - `/redact`: `93.3 kB` -> `4.89 kB`

### Verification
- `npm run lint` passes.
- `npm run build` passes.
