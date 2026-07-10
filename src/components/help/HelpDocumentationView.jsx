'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Book,
  Shield,
  Briefcase,
  GraduationCap,
  Building2,
  LayoutDashboard,
  KeyRound,
  LifeBuoy,
  Bell,
  Download,
  MessageSquare,
  Workflow,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { HELP_SECTIONS } from '@/content/helpDocumentation';
import HelpDiagram from '@/components/help/HelpDiagram';

function DocScreenshot({ src, alt, caption }) {
  return (
    <figure style={{ margin: '1.5rem 0 0' }}>
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-inset)',
          lineHeight: 0,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={675}
          sizes="(max-width: 900px) 100vw, min(880px, 90vw)"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      {caption ? (
        <figcaption
          style={{
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const SECTION_ICONS = {
  'platform-basics': <Book className="w-5 h-5" aria-hidden />,
  'use-case-flows': <Workflow className="w-5 h-5" aria-hidden />,
  students: <GraduationCap className="w-5 h-5" aria-hidden />,
  employers: <Briefcase className="w-5 h-5" aria-hidden />,
  'college-admins': <Building2 className="w-5 h-5" aria-hidden />,
  'super-admin': <Shield className="w-5 h-5" aria-hidden />,
  'accounts-security': <KeyRound className="w-5 h-5" aria-hidden />,
  troubleshooting: <LifeBuoy className="w-5 h-5" aria-hidden />,
};

const SECTIONS = HELP_SECTIONS.map((section) => ({
  ...section,
  icon: SECTION_ICONS[section.id],
}));

function renderContentLine(line, i) {
  const isStructured =
    line.match(/^[0-9]+\./) || line.startsWith('Tip:') || line.startsWith('Goal:');
  if (!line) return null;
  if (isStructured) {
    const colon = line.indexOf(':');
    return (
      <p key={i} style={{ margin: '0 0 0.75rem' }}>
        <strong>{line.slice(0, colon + 1)}</strong>
        {line.slice(colon + 1)}
      </p>
    );
  }
  return (
    <p key={i} style={{ margin: '0 0 0.75rem' }}>
      {line}
    </p>
  );
}

/**
 * @param {{ backHref?: string, backLabel?: string, showSignInLink?: boolean }} props
 */
export default function HelpDocumentationView({
  backHref,
  backLabel = 'Back',
  showSignInLink = false,
}) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.toLowerCase().trim();
  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.screenshot?.caption && item.screenshot.caption.toLowerCase().includes(q)) ||
        (item.screenshot?.alt && item.screenshot.alt.toLowerCase().includes(q))
      );
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '0 0 4rem' }}>
      <div
        className="gradient-banner"
        style={{
          padding: '4rem 2rem 5rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '-3rem',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-5%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {(backHref || showSignInLink) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1.25rem',
              }}
            >
              {backHref ? (
                <Link
                  href={backHref}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.25)',
                    color: 'white',
                  }}
                >
                  <ArrowLeft size={14} aria-hidden />
                  {backLabel}
                </Link>
              ) : null}
              {showSignInLink ? (
                <Link
                  href="/login"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          )}
          <h1
            className="gradient-banner-title"
            style={{
              fontSize: '2.75rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 1rem',
              textShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
          >
            Help & Documentation
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--banner-fg-muted)',
              maxWidth: '720px',
              margin: '0 auto 2rem',
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            Guides for every role: students, employers, college placement teams, and platform administrators.
            Includes step-by-step flows and use-case diagrams.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} /> Alerts
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> Exports
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={16} /> Feedback
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Workflow size={16} /> Flowcharts
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LayoutDashboard size={16} /> Role hub
            </span>
          </div>

          <div
            style={{
              position: 'relative',
              maxWidth: '600px',
              margin: '0 auto',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              borderRadius: '999px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
            }}
          >
            <Search size={24} style={{ color: 'var(--primary-600)', marginLeft: '0.5rem' }} aria-hidden />
            <input
              type="search"
              placeholder="Search all topics, articles, and guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documentation"
              style={{
                width: '100%',
                padding: '1rem',
                border: 'none',
                background: 'transparent',
                fontSize: '1.1rem',
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 'min(100%, 280px)',
              flexShrink: 0,
              position: 'sticky',
              top: '2rem',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem 1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-tertiary)',
                margin: '0 0 1rem 1rem',
              }}
            >
              Table of contents
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id && !searchQuery;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(section.id);
                        setSearchQuery('');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        border: 'none',
                        background: isActive ? 'var(--primary-50)' : 'transparent',
                        color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: isActive ? 'var(--primary-600)' : 'var(--text-tertiary)' }}>{section.icon}</span>
                        {section.title}
                      </span>
                      {isActive ? <ChevronRight size={16} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ flex: 1, minWidth: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {filteredSections.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '5rem 2rem',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px dashed var(--border-default)',
                }}
              >
                <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--text-tertiary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No results found</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  We couldn&apos;t find any documentation matching &quot;<strong>{searchQuery}</strong>&quot;.
                </p>
              </div>
            ) : (
              filteredSections.map((section) => {
                if (!searchQuery && section.id !== activeSection) return null;
                return (
                  <div key={section.id}>
                    <h2
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: '0 0 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.5rem',
                          background: 'var(--primary-50)',
                          color: 'var(--primary-600)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        {section.icon}
                      </span>
                      {section.title}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {section.items.map((item) => (
                        <article
                          key={item.id}
                          id={item.id}
                          className="card"
                          style={{
                            padding: '2rem',
                            transition: 'background 0.15s ease-out',
                          }}
                        >
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                            {item.title}
                          </h3>
                          {item.diagramId ? <HelpDiagram diagramId={item.diagramId} /> : null}
                          <div style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            {item.content.split('\n').map((line, i) => renderContentLine(line, i))}
                          </div>
                          {item.screenshot ? (
                            <DocScreenshot
                              src={item.screenshot.src}
                              alt={item.screenshot.alt}
                              caption={item.screenshot.caption}
                            />
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showSignInLink ? (
          <p
            style={{
              textAlign: 'center',
              marginTop: '3rem',
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
            }}
          >
            Ready to continue?{' '}
            <Link href="/login" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in to PlacementHub
            </Link>
            {' '}
            or{' '}
            <Link href="/register" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
              create an account
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
