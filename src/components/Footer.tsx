import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check, Link2, Mail, Globe, MessageCircle, ExternalLink } from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export const Footer: React.FC = () => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://asfaleieskakalis.com';
  const shareTitle = 'RiskPedia By Asfaleies Kakalis';
  const shareText =
    'Ανακαλύψτε το RiskPedia By Asfaleies Kakalis — Ψηφιακός ασφαλιστικός σύμβουλος 24/7, έλεγχος συμβολαίων & κουίζ γνώσεων.';

  useEffect(() => {
    if (!isShareOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShareOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isShareOpen]);

  const handlePrimaryShareClick = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    setIsShareOpen((prev) => !prev);
  };

  const handleCopyPlatformLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Clipboard write unavailable
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareText} ${shareUrl}`);
  const encodedTitle = encodeURIComponent(shareTitle);

  const socialTargets = [
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      badgeClass: 'bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1877F2]/20 dark:text-[#60a5fa]',
      shortCode: 'f',
      copyOnSelect: false,
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/asfaleieskakalis',
      badgeClass: 'bg-[#E4405F]/10 text-[#E4405F] dark:bg-[#E4405F]/20 dark:text-[#fb7185]',
      icon: <InstagramIcon className="h-3.5 w-3.5" />,
      copyOnSelect: true,
    },
    {
      name: 'TikTok',
      href: 'https://www.tiktok.com/@asfaleieskakalisp',
      badgeClass: 'bg-slate-900/10 text-slate-900 dark:bg-slate-700/50 dark:text-white',
      icon: <TikTokIcon className="h-3.5 w-3.5" />,
      copyOnSelect: true,
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}`,
      badgeClass: 'bg-[#25D366]/10 text-[#128C7E] dark:bg-[#25D366]/20 dark:text-[#4ade80]',
      icon: <MessageCircle className="h-3.5 w-3.5" />,
      copyOnSelect: false,
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      badgeClass: 'bg-[#0A66C2]/10 text-[#0A66C2] dark:bg-[#0A66C2]/20 dark:text-[#60a5fa]',
      shortCode: 'in',
      copyOnSelect: false,
    },
    {
      name: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`,
      badgeClass: 'bg-slate-900/10 text-slate-900 dark:bg-slate-700/40 dark:text-slate-200',
      shortCode: 'X',
      copyOnSelect: false,
    },
    {
      name: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
      badgeClass: 'bg-[#008361]/10 text-[#008361] dark:bg-[#008361]/25 dark:text-[#24d99a]',
      icon: <Mail className="h-3.5 w-3.5" />,
      copyOnSelect: false,
    },
  ];

  return (
    <footer className="border-t border-[#dadce0]/80 bg-white/85 backdrop-blur-xs dark:border-[#1e355b] dark:bg-[#0b1424]/95 transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-6 text-xs text-[#415069] dark:text-slate-400">
        {/* Left: Brand & Official Contact */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5">
          <span className="font-bold text-[#122544] dark:text-white">
            RiskPedia By Asfaleies Kakalis
          </span>
          <span className="hidden sm:inline text-[#dadce0] dark:text-[#1e355b]" aria-hidden="true">
            |
          </span>
          <a
            href="mailto:asfaleieskakalis@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-[#008361] dark:hover:text-[#24d99a] transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>asfaleieskakalis@gmail.com</span>
          </a>
          <a
            href="https://asfaleieskakalis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#008361] dark:hover:text-[#24d99a] transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>asfaleieskakalis.com</span>
          </a>
        </div>

        {/* Right: Official Social Links (Facebook, Instagram, TikTok, LinkedIn) + Share Button */}
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <a
            href="https://www.facebook.com/kakalisasfaleies"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook Ασφάλειες Κακαλής"
            title="Facebook"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] bg-white text-[#1877F2] hover:border-[#1877F2]/50 hover:bg-[#1877F2]/10 dark:border-[#1e355b] dark:bg-[#122544] dark:text-[#60a5fa] transition-colors"
          >
            <FacebookIcon className="h-4 w-4" />
          </a>

          <a
            href="https://www.instagram.com/asfaleieskakalis"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Ασφάλειες Κακαλής"
            title="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] bg-white text-[#E4405F] hover:border-[#E4405F]/50 hover:bg-[#E4405F]/10 dark:border-[#1e355b] dark:bg-[#122544] dark:text-[#fb7185] transition-colors"
          >
            <InstagramIcon className="h-4 w-4" />
          </a>

          <a
            href="https://www.tiktok.com/@asfaleieskakalisp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok Ασφάλειες Κακαλής"
            title="TikTok"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] bg-white text-[#122544] hover:border-[#122544]/40 hover:bg-slate-100 dark:border-[#1e355b] dark:bg-[#122544] dark:text-slate-100 dark:hover:bg-[#1e355b] transition-colors"
          >
            <TikTokIcon className="h-4 w-4" />
          </a>

          <a
            href="https://www.linkedin.com/company/asfaleieskakalis"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Ασφάλειες Κακαλής"
            title="LinkedIn"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dadce0] bg-white text-[#0A66C2] hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/10 dark:border-[#1e355b] dark:bg-[#122544] dark:text-[#60a5fa] transition-colors"
          >
            <LinkedInIcon className="h-4 w-4" />
          </a>

          <div className="relative shrink-0" ref={shareMenuRef}>
            <button
              type="button"
              onClick={handlePrimaryShareClick}
              aria-expanded={isShareOpen}
              aria-haspopup="menu"
              aria-label="Κοινοποίηση Πλατφόρμας"
              title="Κοινοποίηση Πλατφόρμας"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#008361]/40 bg-[#def4f0]/60 text-[#008361] hover:bg-[#008361] hover:text-white dark:border-[#008361]/50 dark:bg-[#008361]/20 dark:text-[#24d99a] dark:hover:bg-[#008361] dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {isShareOpen && (
              <div
                role="menu"
                aria-label="Κοινοποίηση στα κοινωνικά δίκτυα"
                className="absolute right-0 bottom-full mb-2.5 z-40 w-64 rounded-2xl border border-[#dadce0] bg-white p-2 shadow-xl dark:border-[#1e355b] dark:bg-[#0f1d33]"
              >
                <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#727586] dark:text-slate-400">
                  Κοινοποίηση RiskPedia
                </div>

                <div className="mt-1 space-y-1">
                  {socialTargets.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      target={item.name === 'Email' ? undefined : '_blank'}
                      rel={item.name === 'Email' ? undefined : 'noopener noreferrer'}
                      role="menuitem"
                      onClick={() => {
                        if (item.copyOnSelect && navigator.clipboard) {
                          navigator.clipboard.writeText(shareUrl).catch(() => {});
                        }
                        setIsShareOpen(false);
                      }}
                      className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-[#122544] hover:bg-[#f5f3ee] dark:text-slate-200 dark:hover:bg-[#122544] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-extrabold ${item.badgeClass}`}
                        >
                          {item.icon || item.shortCode}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-[#727586] dark:text-slate-500" />
                    </a>
                  ))}
                </div>

                <div className="mt-1.5 border-t border-[#dadce0]/70 pt-1.5 dark:border-[#1e355b]">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyPlatformLink}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-[#008361] hover:bg-[#def4f0]/50 dark:text-[#24d99a] dark:hover:bg-[#008361]/20 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#008361]/10 text-[#008361] dark:bg-[#008361]/25 dark:text-[#24d99a]">
                        {copiedLink ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span>{copiedLink ? 'Ο σύνδεσμος αντιγράφηκε!' : 'Αντιγραφή συνδέσμου'}</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
