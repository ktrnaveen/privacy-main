# Privacy Toolkit

A collection of **enterprise-grade privacy tools** that run entirely in your browser. No data is ever sent to a server—everything happens client-side using modern Web APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)

🔒 **100% Client-Side** • ⚡ **Zero Data Transmission** • 🚀 **Works Offline**

---

## ✨ Features

### 📦 Image Compression
Reduce image file sizes by up to 80% while preserving visual quality. Perfect for web optimization.
- Adjustable quality settings
- Configurable max width/height
- Supports JPEG, PNG, WebP, and more
- Real-time compression preview

### 🔏 Steganography
Hide secret messages inside images using LSB (Least Significant Bit) encoding. Completely invisible to the naked eye.
- Encode messages in PNG/JPEG images
- Extract hidden messages from images
- Undetectable by visual inspection

### 📋 Metadata Remover
View and strip EXIF, IPTC, and XMP metadata from images. Protect your privacy before sharing photos.
- Display all image metadata (GPS, camera info, timestamps)
- One-click removal of all metadata
- Highlights sensitive information (GPS coordinates, device info)

### 🔐 File Encryption
Securely encrypt any file with military-grade AES-256-GCM encryption.
- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Password never leaves your device
- Encrypt/decrypt any file type

### 📄 PDF Redactor
Permanently redact sensitive information from PDF documents with a visual editor.
- Draw redaction boxes directly on PDF pages
- Multi-page support
- Permanent text removal
- Download redacted PDF instantly

### 🚀 UX & Performance Highlights
- Route-level loading skeletons for faster perceived navigation
- Heavy libraries (`pdfjs-dist`, `exifr`, `browser-image-compression`) lazy-loaded on demand
- Reduced route bundle sizes significantly for tool pages
- Smoother PDF rendering with render cancellation and high-DPI canvas support
- Better touch/mobile redaction drawing via pointer events + RAF-throttled canvas updates

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.17 or later
- **npm** or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ktrnaveen/privacy-toolkit.git
   cd privacy-toolkit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage

### Development Mode

For development with hot-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

To create an optimized production build:

```bash
npm run build
```

The output will be in the `.next` directory.

To run the production server:

```bash
npm start
```

### Linting

To check code quality:

```bash
npm run lint
```

### Changelog

Detailed release notes are maintained in [`CHANGELOG.md`](CHANGELOG.md).

---

## 🛠️ Technologies Used

- **Framework:** [Next.js 14](https://nextjs.org/) with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **PDF Processing:** `pdf-lib`, `pdfjs-dist`
- **Image Compression:** `browser-image-compression`
- **Metadata Handling:** `exifr`
- **Styling:** CSS Modules
- **Encryption:** Web Crypto API (AES-256-GCM)

---

## 🔒 Privacy & Security

- ✅ **100% Client-Side Processing** - All operations happen in your browser using Web APIs
- ✅ **Zero Data Transmission** - Nothing is ever uploaded to any server
- ✅ **Works Offline** - Full functionality available without internet connection (after initial load)
- ✅ **No Tracking** - No cookies, no analytics, no telemetry
- ✅ **No Account Required** - Use immediately without sign-up
- ✅ **Open Source** - Fully transparent and auditable code

---

## 📁 Project Structure

```
privacy-toolkit/
├── src/
│   ├── app/              # Next.js app routes
│   │   ├── compress/     # Image compression page
│   │   ├── encrypt/      # File encryption page
│   │   ├── metadata/     # Metadata removal page
│   │   ├── redact/       # PDF redaction page
│   │   └── steganography/# Steganography page
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core utility libraries
│   │   ├── encryption.ts
│   │   ├── pdf-redaction.ts
│   │   └── steganography.ts
│   └── workers/          # Web Workers for background processing
├── public/               # Static assets
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- PDF processing powered by [pdf-lib](https://pdf-lib.js.org/)
- Image compression using [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- Metadata extraction with [exifr](https://github.com/MikeKovarik/exifr)

---

<div align="center">
  <p>Made with ❤️ for privacy-conscious users</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
