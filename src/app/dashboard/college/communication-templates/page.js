'use client';

import Link from 'next/link';
import CollegeSystemEmailTemplates from '@/components/college/CollegeSystemEmailTemplates';
import { ArrowLeft, FileEdit, Mail } from 'lucide-react';

export default function CollegeCommunicationTemplatesPage() {
  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <Link
            href="/dashboard/college/overview"
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', paddingLeft: 0 }}
          >
            <ArrowLeft size={16} />
            Overview
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} className="text-primary" aria-hidden />
            Email templates
          </h1>
          <p>
            Customize automated sponsorship emails sent from <strong>your campus</strong> after employers pay. For
            reusable interview reminders and other drafts, use{' '}
            <Link href="/dashboard/college/message-templates" className="text-primary">
              custom message templates
            </Link>
            .
          </p>
        </div>
        <Link href="/dashboard/college/message-templates" className="btn btn-secondary btn-sm">
          <FileEdit size={14} style={{ marginRight: 6 }} />
          Message templates
        </Link>
      </div>

      <CollegeSystemEmailTemplates variant="page" />
    </div>
  );
}
