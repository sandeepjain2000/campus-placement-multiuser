'use client';

import Link from 'next/link';
import { Download, FileUp, ListChecks } from 'lucide-react';

const STEPS = [
  {
    id: 'select',
    icon: ListChecks,
    title: 'Select campus & target',
    body: 'Choose the Drive or Jobs tab, pick campus, then your placement drive or job posting.',
  },
  {
    id: 'export',
    icon: Download,
    title: 'Export CSV template',
    body: 'Download the pre-filled CSV — only students who meet the posting eligibility rules are included; drive/job id columns are set on every row.',
  },
  {
    id: 'upload',
    icon: FileUp,
    title: 'Upload & submit',
    body: 'Fill hiring_result, upload the CSV, fix any row errors, then Submit results when ready.',
  },
];

export default function AssessmentWorkflowStepper() {
  return (
    <div className="directive-panel assessment-workflow-stepper" role="region" aria-label="Assessment upload workflow">
      <p className="directive-panel__title">What to do</p>
      <ol className="assessment-stepper">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className="assessment-stepper__step">
              <div className="assessment-stepper__marker" aria-hidden>
                <span className="assessment-stepper__num">{index + 1}</span>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="assessment-stepper__body">
                <div className="assessment-stepper__title">{step.title}</div>
                <p className="assessment-stepper__text">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="directive-hint">
        <Link href="/dashboard/employer/hiring-assessment" style={{ fontWeight: 600 }}>
          Hiring Results Dashboard
        </Link>{' '}
        is read-only reporting; edit results here or in Assessment update online.
      </p>
    </div>
  );
}
