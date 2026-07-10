'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const DISMISS_KEY = 'placementhub_session_ad_dismissed';
const ROTATION_MS = 15 * 60 * 1000;

function showSessionAds() {
  return (
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_SESSION_ADS === 'true'
  );
}

const ADS = [
  {
    id: 'prep',
    title: 'Ace your next technical round',
    body: 'Structured mock interviews and system-design drills built for campus hiring.',
    cta: 'Learn more',
    href: 'https://vercel.com',
    accent: 'var(--primary-600)',
  },
  {
    id: 'resume',
    title: 'Polish your resume in one pass',
    body: 'ATS-friendly templates and recruiter checklists—free for students this month.',
    cta: 'View templates',
    href: 'https://nextjs.org',
    accent: 'var(--success-600, #059669)',
  },
  {
    id: 'employer',
    title: 'Employers: sponsor a drive slot',
    body: 'Reserve premium visibility on PlacementHub and reach top campuses faster.',
    cta: 'Contact sales',
    href: 'https://github.com',
    accent: 'var(--amber-600, #d97706)',
  },
];

function SessionAdBannerInner() {
  const [visible, setVisible] = useState(false);
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    if (dismissed) return;
    const t = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setAdIndex((i) => (i + 1) % ADS.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }, []);

  if (!visible) return null;

  const ad = ADS[adIndex];

  return (
    <>
      <div className="session-ad-banner-spacer" aria-hidden="true" />
      <aside
        className="session-ad-banner"
        role="complementary"
        aria-label="Sponsored message"
      >
        <div
          className="session-ad-banner-accent"
          style={{ background: ad.accent }}
          aria-hidden="true"
        />
        <div className="session-ad-banner-inner">
          <div className="session-ad-banner-copy">
            <span className="session-ad-banner-label">Sponsored</span>
            <h3 className="session-ad-banner-title">{ad.title}</h3>
            <p className="session-ad-banner-body">{ad.body}</p>
          </div>
          <Link href={ad.href} className="btn btn-primary btn-sm session-ad-banner-cta" target="_blank" rel="noopener noreferrer">
            {ad.cta}
          </Link>
        </div>
        <button
          type="button"
          className="session-ad-banner-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dismiss();
          }}
          aria-label="Close advertisement"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </aside>
    </>
  );
}

export default function SessionAdBanner() {
  if (!showSessionAds()) return null;
  return <SessionAdBannerInner />;
}
