'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { formatStatus, getStatusColor } from '@/lib/utils';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import StudentDegreeSpecializationCell from './StudentDegreeSpecializationCell';

function Field({ label, value, children }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      {children || (
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{value || '—'}</div>
      )}
    </div>
  );
}

export default function StudentQuickViewModal({ student, onClose, onVerify, readOnly = false }) {
  if (!student) return null;

  const commEmail =
    (student.communicationEmail && String(student.communicationEmail).trim()) || student.email;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      style={{ overflowY: 'auto', alignItems: 'flex-start' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-quick-view-title"
        style={{ borderRadius: 'var(--radius-xl)', margin: '2rem auto', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="surface-dark"
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <StudentListAvatar photo={student.photo} name={student.name} size={48} />
            <div style={{ minWidth: 0 }}>
              <h2 id="student-quick-view-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                {student.name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.2rem', fontFamily: 'var(--font-mono, monospace)' }}>
                {student.systemId || student.roll}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: 'white',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
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
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Skills">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(student.skills || []).length ? (
                    student.skills.map((sk) => (
                      <span key={sk} className="badge badge-indigo" style={{ fontSize: '0.8rem' }}>
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No skills listed.</span>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Job Status">
              <span className={`badge badge-${getStatusColor(student.jobStatus)} badge-dot`}>
                {formatStatus(student.jobStatus)}
              </span>
            </Field>
            <Field label="Internship Status">
              <span className={`badge badge-${getStatusColor(student.internshipStatus)} badge-dot`}>
                {formatStatus(student.internshipStatus)}
              </span>
            </Field>
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            padding: '1.1rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          {onVerify && !readOnly ? (
            student.verified ? (
              <button type="button" className="btn btn-ghost" onClick={() => onVerify(student.id, false)}>
                Clear Verification
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onVerify(student.id, true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CheckCircle2 size={16} /> Approve & Verify
              </button>
            )
          ) : null}
          <Link
            href={`/dashboard/college/students/${student.id}`}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={onClose}
          >
            Open full profile
            <ExternalLink size={14} aria-hidden />
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
