'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DevScreenTag from '@/components/DevScreenTag';
import { getDevScreenId } from '@/config/devScreenIds';
import { FORM_FIELD_REGISTRY_META, FORM_FIELD_REGISTRY_SCREENS } from '@/content/formFieldRegistry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FormFieldRegistryPage() {
  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Button render={<Link href="/developer" />} variant="ghost" size="sm" className="mb-3">
            <ArrowLeft data-icon="inline-start" aria-hidden /> Developer notes
          </Button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.35rem' }}>{FORM_FIELD_REGISTRY_META.title}</h1>
          <p className="text-secondary" style={{ margin: 0, maxWidth: 720, lineHeight: 1.6 }}>
            {FORM_FIELD_REGISTRY_META.subtitle}
          </p>
        </div>
        <DevScreenTag screenId="FORM_REGISTRY" />
      </div>

      <Card size="sm" className="mb-5">
        <CardContent>
        <p className="text-sm" style={{ margin: 0, lineHeight: 1.6 }}>
          <strong>Alignment scan:</strong>{' '}
          <code className="text-xs">{FORM_FIELD_REGISTRY_META.scanCommand}</code> — checks that validation
          helpers and registry entries stay in sync. Constraints live in{' '}
          <code className="text-xs">{FORM_FIELD_REGISTRY_META.validationLib}</code>.
        </p>
        </CardContent>
      </Card>

      {FORM_FIELD_REGISTRY_SCREENS.map((screen) => (
        <Card key={screen.id} className="mb-5">
          <CardHeader>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <CardTitle>{screen.formName}</CardTitle>
            <StatusBadge tone="indigo">{screen.role}</StatusBadge>
            <StatusBadge>{getDevScreenId(screen.route) || '—'}</StatusBadge>
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Expected errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screen.fields.map((field) => (
                  <TableRow key={`${screen.id}-${field.key}`}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>
                      <code className="text-xs">{field.key}</code>
                    </TableCell>
                    <TableCell>{field.defaultValue ?? '—'}</TableCell>
                    <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal">
                      {field.validationNotes}
                      {field.fieldId ? (
                        <>
                          <br />
                          <code className="text-xs">{field.fieldId}</code>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                        {field.commonErrors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
