'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DevScreenTag from '@/components/DevScreenTag';
import { getDevScreenId } from '@/config/devScreenIds';
import { FORM_FIELD_REGISTRY_META, FORM_FIELD_REGISTRY_SCREENS } from '@/content/formFieldRegistry';

export default function FormFieldRegistryPage() {
  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/developer" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem', paddingLeft: 0 }}>
            <ArrowLeft size={16} aria-hidden /> Developer notes
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.35rem' }}>{FORM_FIELD_REGISTRY_META.title}</h1>
          <p className="text-secondary" style={{ margin: 0, maxWidth: 720, lineHeight: 1.6 }}>
            {FORM_FIELD_REGISTRY_META.subtitle}
          </p>
        </div>
        <DevScreenTag screenId="FORM_REGISTRY" />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <p className="text-sm" style={{ margin: 0, lineHeight: 1.6 }}>
          <strong>Alignment scan:</strong>{' '}
          <code className="text-xs">{FORM_FIELD_REGISTRY_META.scanCommand}</code> — checks that validation
          helpers and registry entries stay in sync. Constraints live in{' '}
          <code className="text-xs">{FORM_FIELD_REGISTRY_META.validationLib}</code>.
        </p>
      </div>

      {FORM_FIELD_REGISTRY_SCREENS.map((screen) => (
        <section key={screen.id} className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 650, margin: 0 }}>{screen.formName}</h2>
            <span className="badge badge-indigo">{screen.role}</span>
            <span className="badge">{getDevScreenId(screen.route) || '—'}</span>
            <code className="text-xs text-secondary">{screen.route}</code>
          </div>
          <p className="text-xs text-secondary" style={{ margin: '0 0 1rem' }}>
            Client: <code>{screen.clientValidation || '—'}</code>
            {screen.apiRoute ? (
              <>
                {' '}
                · API: <code>{screen.apiRoute}</code>
              </>
            ) : null}
          </p>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Key</th>
                  <th>Default</th>
                  <th>Required</th>
                  <th>Validation</th>
                  <th>Expected errors</th>
                </tr>
              </thead>
              <tbody>
                {screen.fields.map((field) => (
                  <tr key={`${screen.id}-${field.key}`}>
                    <td style={{ fontWeight: 600 }}>{field.label}</td>
                    <td>
                      <code className="text-xs">{field.key}</code>
                    </td>
                    <td className="text-sm">{field.defaultValue ?? '—'}</td>
                    <td className="text-sm">{field.required ? 'Yes' : 'No'}</td>
                    <td className="text-sm" style={{ maxWidth: 280, lineHeight: 1.5 }}>
                      {field.validationNotes}
                      {field.fieldId ? (
                        <>
                          <br />
                          <code className="text-xs">{field.fieldId}</code>
                        </>
                      ) : null}
                    </td>
                    <td className="text-sm" style={{ maxWidth: 320 }}>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                        {field.commonErrors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
