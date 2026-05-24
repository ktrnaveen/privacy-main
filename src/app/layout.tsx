import '@/lib/polyfills';
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Privacy Toolkit | Secure Client-Side Tools",
  description: "Enterprise-grade privacy tools that run entirely in your browser. Compress images, hide messages with steganography, strip metadata, and encrypt files—all without uploading a single byte.",
  keywords: ["privacy", "encryption", "steganography", "metadata", "security", "client-side", "browser tools"],
  authors: [{ name: "Privacy Toolkit Team" }],
  openGraph: {
    title: "Privacy Toolkit | Secure Client-Side Tools",
    description: "Enterprise-grade privacy tools that run entirely in your browser.",
    type: "website",
  },
};

const navLinks = [
  { href: "/compress", label: "Compress", icon: "📦" },
  { href: "/steganography", label: "Steganography", icon: "🔏" },
  { href: "/metadata", label: "Metadata", icon: "📋" },
  { href: "/encrypt", label: "Encrypt", icon: "🔐" },
  { href: "/redact", label: "Redact", icon: "📄" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className={styles.wrapper}>
          <nav className={styles.nav}>
            <div className={styles.navContainer}>
              <Link href="/" className={styles.logo}>
                <div className={styles.logoIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span className={styles.logoText}>Privacy Toolkit</span>
              </Link>

              <div className={styles.navLinks}>
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.navLink}>
                    <span className={styles.navIcon}>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>

              <div className={styles.navBadge}>
                <span className={styles.statusIndicator}></span>
                <span>100% Client-Side</span>
              </div>
            </div>
          </nav>

          <main className={styles.main}>{children}</main>

          <footer className={styles.footer}>
            <div className={styles.footerContainer}>
              <div className={styles.footerLeft}>
                <div className={styles.footerBrand}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Privacy Toolkit</span>
                </div>
                <p className={styles.footerText}>
                  Your data never leaves your device. Zero tracking. Zero uploads.
                </p>
              </div>
              <div className={styles.footerRight}>
                <div className={styles.footerStats}>
                  <div className={styles.footerStat}>
                    <span className={styles.footerStatValue}>0 bytes</span>
                    <span className={styles.footerStatLabel}>sent to servers</span>
                  </div>
                  <div className={styles.footerStat}>
                    <span className={styles.footerStatValue}>AES-256</span>
                    <span className={styles.footerStatLabel}>encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
