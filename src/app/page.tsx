import Link from 'next/link';
import styles from './page.module.css';

const tools = [
  {
    id: 'compress',
    title: 'Image Compression',
    description: 'Reduce file sizes by up to 80% while preserving visual quality. Perfect for web optimization.',
    href: '/compress',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    stats: 'Up to 80% smaller',
    gradient: 'var(--color-accent-green)',
  },
  {
    id: 'steganography',
    title: 'Steganography',
    description: 'Hide secret messages inside images using advanced LSB encoding. Invisible to detection.',
    href: '/steganography',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
      </svg>
    ),
    stats: 'Undetectable encoding',
    gradient: 'var(--color-accent-cyan)',
  },
  {
    id: 'metadata',
    title: 'Metadata Remover',
    description: 'View and strip EXIF, IPTC, and XMP data. Remove GPS coordinates, camera info, and more.',
    href: '/metadata',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    stats: 'Complete wipe',
    gradient: 'var(--color-accent-purple)',
  },
  {
    id: 'encrypt',
    title: 'File Encryption',
    description: 'Military-grade AES-256-GCM encryption with PBKDF2 key derivation. Unbreakable security.',
    href: '/encrypt',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    stats: 'AES-256-GCM',
    gradient: 'var(--color-accent-amber)',
  },
  {
    id: 'redact',
    title: 'PDF Redactor',
    description: 'Permanently redact sensitive information from PDF documents. Draw black boxes to hide text.',
    href: '/redact',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    stats: 'Permanent removal',
    gradient: 'var(--color-accent-red)',
  },
];

const features = [
  {
    icon: '🔒',
    title: 'Zero Data Transmission',
    description: 'Every operation runs locally in your browser using Web APIs. Nothing is ever uploaded.',
  },
  {
    icon: '⚡',
    title: 'Instant Processing',
    description: 'No server round-trips. Files process instantly using your device\'s computing power.',
  },
  {
    icon: '🌐',
    title: 'Works Offline',
    description: 'Load once, use forever. Full functionality without internet connection.',
  },
  {
    icon: '🚫',
    title: 'No Account Required',
    description: 'No sign-ups, no tracking, no cookies. Just open and use immediately.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot}></span>
            <span>Enterprise-Grade Privacy Tools</span>
          </div>

          <h1 className={styles.heroTitle}>
            Privacy Tools That{' '}
            <span className={styles.heroHighlight}>Never Leave</span>{' '}
            Your Device
          </h1>

          <p className={styles.heroDescription}>
            Professional security utilities running 100% client-side.
            Your files never touch our servers—because there are no servers.
          </p>

          <div className={styles.heroActions}>
            <Link href="/compress" className={styles.primaryButton}>
              <span>Get Started</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="#tools" className={styles.secondaryButton}>
              <span>View All Tools</span>
            </a>
          </div>

          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 12 15 16 10" />
              </svg>
              <span>100% Client-Side</span>
            </div>
            <div className={styles.trustBadge}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>AES-256 Encryption</span>
            </div>
            <div className={styles.trustBadge}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Works Offline</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualContainer}>
            <div className={styles.visualOrb}></div>
            <div className={styles.visualRing}></div>
            <div className={styles.visualIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className={styles.tools}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Privacy Toolkit</h2>
          <p className={styles.sectionDescription}>
            Four essential tools for digital privacy. Each one designed with security-first principles.
          </p>
        </div>

        <div className={styles.toolsGrid}>
          {tools.map((tool, index) => (
            <Link
              key={tool.id}
              href={tool.href}
              className={styles.toolCard}
              style={{ '--tool-color': tool.gradient, '--delay': `${index * 100}ms` } as React.CSSProperties}
            >
              <div className={styles.toolHeader}>
                <div className={styles.toolIcon}>{tool.icon}</div>
                <span className={styles.toolStat}>{tool.stats}</span>
              </div>
              <h3 className={styles.toolTitle}>{tool.title}</h3>
              <p className={styles.toolDescription}>{tool.description}</p>
              <div className={styles.toolArrow}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Privacy Toolkit?</h2>
          <p className={styles.sectionDescription}>
            Built with uncompromising privacy principles for users who take data security seriously.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to protect your privacy?</h2>
          <p className={styles.ctaDescription}>
            Start using enterprise-grade security tools right now. No downloads, no installations, no accounts.
          </p>
          <Link href="/compress" className={styles.ctaButton}>
            <span>Launch Privacy Toolkit</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
