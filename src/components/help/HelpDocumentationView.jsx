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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

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
                <Button
                  render={<Link href={backHref} />}
                  variant="outline"
                  size="sm"
                  className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <ArrowLeft data-icon="inline-start" aria-hidden />
                  {backLabel}
                </Button>
              ) : null}
              {showSignInLink ? (
                <Button render={<Link href="/login" />} size="sm">
                  Sign in
                </Button>
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

          <InputGroup className="mx-auto max-w-[600px] bg-background shadow-lg">
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search all topics, articles, and guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documentation"
              name="documentation-search"
              autoComplete="off"
            />
          </InputGroup>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Card size="sm" className="sticky top-8 w-full shrink-0 md:w-[280px]">
            <CardHeader>
              <CardTitle>Table of Contents</CardTitle>
              <CardDescription>Browse help by role or workflow.</CardDescription>
            </CardHeader>
            <CardContent>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id && !searchQuery;
                return (
                  <li key={section.id}>
                    <Button
                      type="button"
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="h-auto w-full justify-between whitespace-normal px-3 py-2 text-left"
                      onClick={() => {
                        setActiveSection(section.id);
                        setSearchQuery('');
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: isActive ? 'var(--primary-600)' : 'var(--text-tertiary)' }}>{section.icon}</span>
                        {section.title}
                      </span>
                      {isActive ? <ChevronRight size={16} /> : null}
                    </Button>
                  </li>
                );
              })}
            </ul>
            </CardContent>
          </Card>

          <div style={{ flex: 1, minWidth: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {filteredSections.length === 0 ? (
              <Card className="border-dashed text-center">
                <CardHeader className="items-center py-12">
                  <Search className="text-muted-foreground" aria-hidden />
                  <CardTitle>No Results Found</CardTitle>
                  <CardDescription>
                  We couldn&apos;t find any documentation matching &quot;<strong>{searchQuery}</strong>&quot;.
                  </CardDescription>
                </CardHeader>
              </Card>
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
                        <Card
                          key={item.id}
                          id={item.id}
                          className="scroll-mt-6"
                        >
                          <CardHeader>
                            <CardTitle>{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {item.diagramId ? <HelpDiagram diagramId={item.diagramId} /> : null}
                            <div className="text-muted-foreground text-base leading-7">
                              {item.content.split('\n').map((line, i) => renderContentLine(line, i))}
                            </div>
                            {item.screenshot ? (
                              <DocScreenshot
                                src={item.screenshot.src}
                                alt={item.screenshot.alt}
                                caption={item.screenshot.caption}
                              />
                            ) : null}
                          </CardContent>
                        </Card>
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
