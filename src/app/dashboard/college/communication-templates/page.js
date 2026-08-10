'use client';

import Link from 'next/link';
import CollegeSystemEmailTemplates from '@/components/college/CollegeSystemEmailTemplates';
import { ArrowLeft, FileEdit, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CollegeCommunicationTemplatesPage() {
  return (
    <div className="animate-fadeIn flex flex-col gap-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <Button render={<Link href="/dashboard/college/overview" />} variant="ghost" size="sm" className="mb-1 w-fit">
            <ArrowLeft data-icon="inline-start" />
            Overview
          </Button>
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Mail className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Email templates
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Customize automated sponsorship emails sent from <strong>your campus</strong> after employers pay. For
            reusable interview reminders and other drafts, use{' '}
            <Link href="/dashboard/college/message-templates" className="text-primary">
              custom message templates
            </Link>
            .
          </p>
        </div>
        <Button render={<Link href="/dashboard/college/message-templates" />} variant="outline">
          <FileEdit data-icon="inline-start" />
          Message templates
        </Button>
      </div>

      <CollegeSystemEmailTemplates variant="page" />
    </div>
  );
}
