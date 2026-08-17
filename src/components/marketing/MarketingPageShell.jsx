import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function MarketingPageShell({ children, maxWidth = '960px' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <header style={{ borderBottom: '1px solid var(--border-default)', padding: '1rem 1.5rem' }}>
        <div
          style={{
            maxWidth,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link
            href="/"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Home
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/features" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Features
            </Link>
            <Link href="/register" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Register
            </Link>
            <Link href="/login" className={buttonVariants({ size: 'sm' })}>
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main style={{ maxWidth, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>{children}</main>
    </div>
  );
}
