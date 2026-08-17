'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Terminal, Copy, Check, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import DevScreenTag from '@/components/DevScreenTag';
import DemoDataTester from '@/components/demo/DemoDataTester';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import UseCasesTable from '@/components/developer/UseCasesTable';
import { Button } from '@/components/ui/button';
import {
  DEVELOPER_PAGE_META,
  DEVELOPER_PAGE_TOC,
  QUICK_START_STEPS,
  GUIDED_PLAYBOOKS,
  USE_CASE_FLOWS,
  USE_CASES_MORE_NOTES,
  USE_CASES_USER_TESTING_NOTES,
  USE_CASES_BY_ROLE_NOTES,
  VALIDATION_ERROR_CODES_NOTES,
  LOGIN_PAGE_LINKS,
  RUNNER_PANEL_STEPS,
  SCREEN_TAG_STATES,
  SCREEN_TAG_ARMED_CLICKS,
  SCREEN_TAG_STUCK_TIPS,
  SESSION_MARKER_NOTES,
  INTERNSHIP_E2E_ROLES,
  DEMO_LOGINS,
  DEMO_PASSWORD,
  RUNNER_CHANGE_ALERTS,
  DEVELOPER_PENDING_BACKLOG,
  DEVELOPER_PRODUCTION_HARDENING,
  EMAIL_DEMO_NOTES,
  CLEANUP_OVERVIEW,
  CLEANUP_COMMANDS,
  RESTORE_AFTER_CLEANUP,
  LEGACY_RUNNER_COMMANDS,
  DATABASE_SCHEMA_NOTES,
  RELATED_DOCS,
} from '@/content/developerNotes';

function CopyBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <div className="dev-notes-code-wrap">
      <code className="dev-notes-code">{text}</code>
      <Button type="button" variant="ghost" size="sm" className="dev-notes-copy" onClick={onCopy} aria-label="Copy command">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

function Section({ id, title, tone = 'primary', wide = false, children }) {
  return (
    <section id={id} className={`dev-notes-section dev-notes-section--${tone}${wide ? ' dev-notes-section--wide' : ''}`}>
      <h2 className="dev-notes-section-title">{title}</h2>
      <div className="dev-notes-section-body">{children}</div>
    </section>
  );
}

function resolveDemoFocusFromHash(hash) {
  const id = String(hash || '').replace(/^#/, '');
  if (id === 'demo-purge' || id === 'purge') return 'purge';
  if (id === 'demo-apis') return 'apis';
  return null;
}

export default function DeveloperPage() {
  const [demoFocus, setDemoFocus] = useState('apis');

  const onLockDeveloperNotes = useCallback(async () => {
    try {
      await fetch('/api/developer-notes/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.href = '/developer/unlock';
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const focus = resolveDemoFocusFromHash(window.location.hash);
      if (focus) setDemoFocus(focus);
      const id = window.location.hash.replace(/^#/, '');
      if (id === 'demo-apis' || id === 'demo-purge' || id === 'purge') {
        const targetId = id === 'demo-apis' ? 'demo-apis' : 'demo-purge';
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  return (
    <div className="dev-notes-page">
      <div style={{ position: 'fixed', top: '0.65rem', right: '0.75rem', zIndex: 100000 }}>
        <DevScreenTag />
      </div>
      <header className="dev-notes-header">
        <div className="dev-notes-header-inner">
          <Link href="/" className="dev-notes-back">
            <ArrowLeft size={16} aria-hidden /> Landing
          </Link>
          <div className="dev-notes-header-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLockDeveloperNotes}
              title="Lock Developer Notes"
            >
              <LogOut size={14} aria-hidden /> Lock
            </Button>
            <ThemeToggleButton />
            <Button render={<a href="#demo-apis" />} variant="secondary" size="sm">
              Demo APIs
            </Button>
          </div>
        </div>
      </header>

      <main className="dev-notes-main">
        <div className="dev-notes-hero">
          <div className="dev-notes-hero-icon" aria-hidden>
            <BookOpen size={28} strokeWidth={1.5} />
          </div>
          <h1>{DEVELOPER_PAGE_META.title}</h1>
          
          <div className="dev-notes-login-banner">
            <h3 className="dev-notes-login-banner-title">Test Login Page</h3>
            <p className="dev-notes-login-banner-text">
              <Link href="/login" className="dev-notes-login-banner-link">
                Old Login Page (Demo Accounts)
              </Link>{' '}
              — Use this for internal testing.
              {' · '}
              <Link href="/sign-in" className="dev-notes-login-banner-link">
                New Sign In Page
              </Link>
            </p>
          </div>

          <p className="dev-notes-kicker">{DEVELOPER_PAGE_META.notesTitle}</p>
          <p className="dev-notes-lead">{DEVELOPER_PAGE_META.subtitle}</p>
          <p className="dev-notes-meta">
            App folder: <code>{DEVELOPER_PAGE_META.repoPath}</code> · Terminal:{' '}
            <code>{DEVELOPER_PAGE_META.terminalHelp}</code>
          </p>
        </div>

        <nav id="toc" className="dev-notes-toc-card" aria-labelledby="dev-notes-toc-heading">
          <h2 id="dev-notes-toc-heading" className="dev-notes-toc-title">
            Table of contents
          </h2>
          <ol className="dev-notes-toc-list">
            {DEVELOPER_PAGE_TOC.map((item, index) => (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="dev-notes-toc-link">
                    <span className="dev-notes-toc-num">{index + 1}</span>
                    <span className="dev-notes-toc-text">
                      <span className="dev-notes-toc-label">{item.label}</span>
                      {item.hint ? <span className="dev-notes-toc-hint">{item.hint}</span> : null}
                    </span>
                  </Link>
                ) : (
                  <a href={`#${item.id}`} className="dev-notes-toc-link">
                    <span className="dev-notes-toc-num">{index + 1}</span>
                    <span className="dev-notes-toc-text">
                      <span className="dev-notes-toc-label">{item.label}</span>
                      {item.hint ? <span className="dev-notes-toc-hint">{item.hint}</span> : null}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <Section id="quick-start" title="Three commands" tone="primary">
          <ol className="dev-notes-steps">
            {QUICK_START_STEPS.map((row) => (
              <li key={row.step}>
                <span className="dev-notes-step-num">{row.step}</span>
                <div>
                  <CopyBlock text={row.command} />
                  <p className="dev-notes-detail">{row.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="playbooks" title="Guided playbooks (partial flows)" tone="info" wide>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table dev-notes-table--commands">
              <colgroup>
                <col className="dev-notes-col-task" />
                <col className="dev-notes-col-command" />
                <col className="dev-notes-col-when" />
              </colgroup>
              <thead>
                <tr>
                  <th>When you want to test…</th>
                  <th>Command</th>
                  <th>Focus</th>
                </tr>
              </thead>
              <tbody>
                {GUIDED_PLAYBOOKS.map((row) => (
                  <tr key={row.command}>
                    <td>{row.goal}</td>
                    <td>
                      <code className="dev-notes-inline-code">{row.command}</code>
                    </td>
                    <td className="dev-notes-muted">{row.focus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="use-cases" title="Use cases (step-by-step)" tone="success" wide>
          <UseCasesTable
            flows={USE_CASE_FLOWS}
            intro="Five end-to-end flows across employer, college, and student roles. Each row lists the voice runner commands (npm + .bat) — not the Guided playbooks table above."
          />
          <p style={{ margin: '1.25rem 0 0', display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <Button render={<Link href={USE_CASES_BY_ROLE_NOTES.href} />} variant="secondary">
              {USE_CASES_BY_ROLE_NOTES.label}
            </Button>
            <Button render={<Link href={USE_CASES_MORE_NOTES.href} />} variant="secondary">
              {USE_CASES_MORE_NOTES.label}
            </Button>
            <Button render={<Link href={USE_CASES_USER_TESTING_NOTES.href} />} variant="secondary">
              {USE_CASES_USER_TESTING_NOTES.label}
            </Button>
          </p>
          <p className="dev-notes-muted" style={{ margin: '1rem 0 0', fontSize: '0.875rem' }}>
            Headless runner: <code className="dev-notes-inline-code">npm run qa:uc -- &lt;slug&gt;</code>
            {' · '}
            Validation errors use <code className="dev-notes-inline-code">{VALIDATION_ERROR_CODES_NOTES.format}</code>
            {' · '}
            API errors use <code className="dev-notes-inline-code">[Ref: …]</code>
            {' · '}
            QA login:{' '}
            <Link href={LOGIN_PAGE_LINKS.oldWithDemoAccounts} style={{ fontWeight: 600 }}>
              Old Login Page (Demo accounts)
            </Link>
            {' · '}
            <Link href={LOGIN_PAGE_LINKS.newSignIn} style={{ fontWeight: 600 }}>New Sign In Page</Link>
          </p>
        </Section>

        <Section id="runner-alerts" title="Runner alerts (recent UI changes)" tone="warning">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            Update guided focus-area steps and manual tests when these change. Rebuild routes after menu edits:{' '}
            <code className="dev-notes-inline-code">npm run qa:sync-routes</code>
          </p>
          {RUNNER_CHANGE_ALERTS.map((block) => (
            <div key={block.date} className="dev-notes-callout dev-notes-callout--warning dev-notes-callout--stacked">
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
                {block.date}
                {block.title ? ` — ${block.title}` : ''}
              </p>
              <ul className="dev-notes-bullets" style={{ margin: 0 }}>
                {block.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section id="pending" title="Pending backlog" tone="warning">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            {DEVELOPER_PENDING_BACKLOG.intro}
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Detail</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {DEVELOPER_PENDING_BACKLOG.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="dev-notes-inline-code">{item.category}</code>
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.decision ? (
                        <p className="dev-notes-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>
                          Decision: {item.decision}
                        </p>
                      ) : null}
                    </td>
                    <td>{item.detail}</td>
                    <td className="dev-notes-muted" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {item.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="production-hardening" title="Production hardening" tone="warning">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            {DEVELOPER_PRODUCTION_HARDENING.intro}
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Detail</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {DEVELOPER_PRODUCTION_HARDENING.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="dev-notes-inline-code">{item.category}</code>
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>{item.detail}</td>
                    <td className="dev-notes-muted" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {item.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="email-demo" title="Email &amp; demo mail" tone="info">
          <ul className="dev-notes-bullets">
            {EMAIL_DEMO_NOTES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section id="e2e-roles" title="Internship full cycle (by role)" tone="primary" wide>
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            One command runs all roles in order: <code className="dev-notes-inline-code">npm run test:guided:playbook-e2e</code>
            . Password for every account: <code className="dev-notes-inline-code">{DEMO_PASSWORD}</code>.
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>What happens</th>
                  <th>Login</th>
                </tr>
              </thead>
              <tbody>
                {INTERNSHIP_E2E_ROLES.map((row) => (
                  <tr key={`${row.role}-${row.account}`}>
                    <td>
                      <strong>{row.role}</strong>
                    </td>
                    <td>{row.steps}</td>
                    <td>
                      <code className="dev-notes-inline-code">{row.account}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="panel" title="How the Next button works" tone="warning">
          <ol className="dev-notes-ordered">
            {RUNNER_PANEL_STEPS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="dev-notes-callout dev-notes-callout--info">
            <Terminal size={16} className="dev-notes-callout-icon" aria-hidden />
            Steps do <strong>not</strong> auto-run. Read each step in the <strong>terminal</strong>, then click{' '}
            <strong>S-xx</strong> — screen tag top-right turns blue when a test step is ready; click it (or Alt+Enter).
          </p>
        </Section>

        <Section id="screen-tag" title="Screen tag states" tone="primary">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            The screen tag (S-xx, LANDING, or LOGIN) in the top-right is your <strong>Next</strong> control during guided
            tests — not a normal app button. When it is blinking/pulsing, it is armed and waiting for you.
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table">
              <thead>
                <tr>
                  <th>Look</th>
                  <th>State</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {SCREEN_TAG_STATES.map((row) => (
                  <tr key={row.state}>
                    <td>
                      <span className={`dev-notes-tag-preview ${row.previewClass}`} aria-hidden>
                        S-xx
                      </span>
                      <span className="dev-notes-muted" style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.8125rem' }}>
                        {row.look}
                      </span>
                    </td>
                    <td>
                      <strong>{row.state}</strong>
                    </td>
                    <td>{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="dev-notes-subtitle">One click per step</h3>
          <ol className="dev-notes-ordered">
            {SCREEN_TAG_ARMED_CLICKS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>

          <h3 className="dev-notes-subtitle">What to do if it still feels stuck</h3>
          <ul className="dev-notes-bullets">
            {SCREEN_TAG_STUCK_TIPS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section id="marker" title="Session marker (links publish → apply)" tone="info">
          <ul className="dev-notes-bullets">
            {SESSION_MARKER_NOTES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section id="logins" title="Demo logins" tone="success">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            Password for all: <code className="dev-notes-inline-code">{DEMO_PASSWORD}</code>
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LOGINS.map((row) => (
                  <tr key={row.email}>
                    <td>{row.role}</td>
                    <td>
                      <code className="dev-notes-inline-code">{row.email}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="demo-apis" title="Demo APIs &amp; cleanup" tone="danger" wide>
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            Seed sandbox data, restore tie-ups, soft-delete test rows, or bulk-delete jobs and internships. Password{' '}
            <code className="dev-notes-inline-code">Admin@123</code> · demo users{' '}
            <code className="dev-notes-inline-code">@placementhub.test</code>. Full-page copy also at{' '}
            <Link href="/data-entry">/data-entry</Link>.
          </p>
          <div className="dev-notes-demo-panel">
            <DemoDataTester variant="embed" compactHeader hideHeader focusSection={demoFocus} />
          </div>
        </Section>

        {/* Legacy anchors */}
        <span id="purge" className="dev-notes-anchor" aria-hidden />
        <Section id="cleanup" title="Clean up &amp; restore test data" tone="danger" wide>
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            {CLEANUP_OVERVIEW} Use the <a href="#demo-apis">Demo APIs</a> section above or the commands below from the app
            folder.
          </p>

          <h3 className="dev-notes-subtitle">Wipe &amp; selective cleanup</h3>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table dev-notes-table--commands">
              <colgroup>
                <col className="dev-notes-col-task" />
                <col className="dev-notes-col-command" />
                <col className="dev-notes-col-when" />
              </colgroup>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Command</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {CLEANUP_COMMANDS.map((row) => (
                  <tr key={row.command}>
                    <td>
                      <strong>{row.title}</strong>
                      <p className="dev-notes-detail" style={{ margin: '0.35rem 0 0' }}>
                        {row.detail}
                      </p>
                      {row.alt ? (
                        <p className="dev-notes-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>
                          Alt: <code className="dev-notes-inline-code">{row.alt}</code>
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <CopyBlock text={row.command} />
                    </td>
                    <td className="dev-notes-muted">{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 id="restore" className="dev-notes-subtitle">
            Restore after cleanup
          </h3>
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            Run these after <code className="dev-notes-inline-code">npm run db:clear-placement</code> so employers can
            publish again.
          </p>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table dev-notes-table--commands dev-notes-table--two-col">
              <colgroup>
                <col className="dev-notes-col-task" />
                <col className="dev-notes-col-command" />
              </colgroup>
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Command</th>
                </tr>
              </thead>
              <tbody>
                {RESTORE_AFTER_CLEANUP.map((row) => (
                  <tr key={row.command}>
                    <td>
                      <strong>{row.title}</strong>
                      <p className="dev-notes-detail" style={{ margin: '0.35rem 0 0' }}>
                        {row.detail}
                      </p>
                      {row.alt ? (
                        <p className="dev-notes-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>
                          Alt: <code className="dev-notes-inline-code">{row.alt}</code>
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <code className="dev-notes-inline-code">{row.command}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="dev-notes-callout dev-notes-callout--success">
            Interactive tools are in <a href="#demo-apis">Demo APIs &amp; cleanup</a> above. Same UI at{' '}
            <Link href="/data-entry">/data-entry</Link>.
          </p>
        </Section>

        <Section id="legacy" title="Legacy runner modes" tone="neutral" wide>
          <div className="dev-notes-table-wrap">
            <table className="dev-notes-table dev-notes-table--commands dev-notes-table--two-col">
              <colgroup>
                <col className="dev-notes-col-command" />
                <col className="dev-notes-col-when" />
              </colgroup>
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Use when</th>
                </tr>
              </thead>
              <tbody>
                {LEGACY_RUNNER_COMMANDS.map((row) => (
                  <tr key={row.command}>
                    <td>
                      <code className="dev-notes-inline-code">{row.command}</code>
                    </td>
                    <td className="dev-notes-muted">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="database-schema" title="Database schema & relationships" tone="info">
          <p className="dev-notes-detail" style={{ marginTop: 0 }}>
            Per-table columns and foreign keys from the live database, plus a domain relationship overview (two
            application paths, campus tie-ups, assessment chain).
          </p>
          <p style={{ margin: '0 0 1rem' }}>
            <Button render={<Link href={DATABASE_SCHEMA_NOTES.href} />} variant="secondary">
              Open database schema
            </Button>
          </p>
          <p className="dev-notes-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            Repo: <code className="dev-notes-inline-code">{DATABASE_SCHEMA_NOTES.repoPath}</code> · Refresh:{' '}
            <code className="dev-notes-inline-code">{DATABASE_SCHEMA_NOTES.regenerateCommand}</code>
          </p>
        </Section>

        <Section id="related" title="Related files in the repo" tone="neutral">
          <ul className="dev-notes-bullets">
            {RELATED_DOCS.map((doc) => (
              <li key={doc.path}>
                <strong>
                  {doc.href ? (
                    <Link href={doc.href} style={{ color: 'inherit' }}>
                      {doc.label}
                    </Link>
                  ) : (
                    doc.label
                  )}
                </strong>{' '}
                — <code className="dev-notes-inline-code">{doc.path}</code>
                {doc.hint ? <span className="dev-notes-muted"> ({doc.hint})</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
