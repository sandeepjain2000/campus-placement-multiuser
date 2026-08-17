'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import StudentDegreeSpecializationCell from './StudentDegreeSpecializationCell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';

function Field({ label, value, children }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children || (
        <div className="break-words font-medium text-foreground">{value || '—'}</div>
      )}
    </div>
  );
}

export default function StudentQuickViewModal({ student, onClose, onVerify, readOnly = false }) {
  if (!student) return null;

  const commEmail =
    (student.communicationEmail && String(student.communicationEmail).trim()) || student.email;

  return (
    <Dialog open={Boolean(student)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-10">
          <div className="flex min-w-0 items-center gap-4">
            <StudentListAvatar photo={student.photo} name={student.name} size={48} />
            <div className="min-w-0">
              <DialogTitle id="student-quick-view-title" className="truncate text-xl">{student.name}</DialogTitle>
              <DialogDescription className="mt-1 font-mono">
                {student.systemId || student.roll}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="System ID" value={student.systemId} />
            <Field label="Roll No." value={student.roll} />
            <Field label="Login email" value={student.email} />
            <Field label="Communication email" value={commEmail} />
            <Field label="Department" value={student.dept} />
            <Field label="Degree / Specialisation">
              <StudentDegreeSpecializationCell
                degree={student.degreePursued}
                specialization={student.specialization}
                compact
              />
            </Field>
            <Field label="CGPA" value={student.cgpa != null ? String(student.cgpa) : ''} />
            <Field label="Semester" value={student.semester} />
            <Field label="Academic Year" value={student.academicYear} />
            <Field label="Gender" value={student.gender} />
            <Field label="Diversity Category" value={student.diversityCategory} />
            <div className="sm:col-span-2">
              <Field label="Skills">
                <div className="flex flex-wrap gap-2">
                  {(student.skills || []).length ? (
                    student.skills.map((sk) => (
                      <Badge key={sk} variant="secondary">{sk}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No skills listed.</span>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Job Status">
              <StatusBadge tone={getStatusColor(student.jobStatus)} showDot>{formatStatus(student.jobStatus) || '—'}</StatusBadge>
            </Field>
            <Field label="Internship Status">
              <StatusBadge tone={getStatusColor(student.internshipStatus)} showDot>{formatStatus(student.internshipStatus) || '—'}</StatusBadge>
            </Field>
        </div>
        <DialogFooter className="flex-wrap border-t pt-4">
          {onVerify ? (
            student.verified ? (
              <Button type="button" variant="ghost" onClick={() => onVerify(student.id, false)}>
                Clear Verification
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onVerify(student.id, true)}
              >
                <CheckCircle2 data-icon="inline-start" /> Mark Verified
              </Button>
            )
          ) : null}
          <Button variant="outline" render={<Link href={`/dashboard/college/students/${student.id}`} onClick={onClose} />}>
            Open full profile <ExternalLink data-icon="inline-end" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
