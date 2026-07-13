'use client';

import { useCallback, useEffect, useState } from 'react';
import StudentListAvatar from '@/components/student/StudentListAvatar';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CircleAlert,
  FileText,
  Folder,
  GraduationCap,
  Languages,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { formatStatus } from '@/lib/utils';
import CollegeStudentCvsPanel from '@/components/college/CollegeStudentCvsPanel';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import { appendCvDownloadParam } from '@/lib/studentCvApiPaths';
import {
  getCompletedSectionCount,
  getProfileSectionTotal,
  PROFILE_SECTION_TOTAL,
} from '@/lib/studentProfileSections';

export { getCompletedSectionCount } from '@/lib/studentProfileSections';

const SECTION_TOTAL = PROFILE_SECTION_TOTAL;

const PROFILE_SECTION_TABS = [
  { id: 'student-section-basic', label: 'Basic' },
  { id: 'student-section-education', label: 'Education' },
  { id: 'student-section-skills', label: 'Skills' },
  { id: 'student-section-projects', label: 'Projects' },
  { id: 'student-section-documents', label: 'Documents' },
  { id: 'student-section-activities', label: 'Experience' },
];

function StudentProfileSectionNav({ activeId, onSelect }) {
  return (
    <nav className="student-profile-section-nav" aria-label="Profile sections">
      <div className="student-profile-section-nav-inner" role="tablist">
        {PROFILE_SECTION_TABS.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={tab.id}
              className={`student-profile-section-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

function valueOrDash(value) {
  return present(value) ? value : '—';
}

function formatPercent(value) {
  return present(value) ? `${Number(value).toFixed(2)}%` : '—';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatPeriod(start, end) {
  const from = formatDate(start);
  const to = formatDate(end) || 'Present';
  if (!from && !end) return '';
  return `${from || 'Started'} - ${to}`;
}

function InfoItem({ label, value, mono = false }) {
  return (
    <div className="student-detail-info">
      <div className="student-detail-label">{label}</div>
      <div className="student-detail-value" style={mono ? { fontFamily: 'var(--font-mono, monospace)' } : undefined}>
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, description, children }) {
  return (
    <section id={id} className="student-section student-profile-section-anchor">
      <div className="student-section-header">
        <div className="student-section-icon" aria-hidden="true">
          <Icon size={17} />
        </div>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function EmptyState({ children = 'No records added yet.' }) {
  return <div className="student-empty-state">{children}</div>;
}

function TagList({ items, tone = 'indigo' }) {
  const values = list(items).filter(Boolean);
  if (!values.length) return <EmptyState>No tags added yet.</EmptyState>;
  return (
    <div className="student-tag-list">
      {values.map((item) => {
        const label = typeof item === 'string' ? item : item.name || item.title;
        const meta = typeof item === 'string' ? '' : item.proficiency;
        return (
          <span key={`${label}-${meta || ''}`} className={`badge badge-${tone}`} style={{ fontSize: '0.75rem' }}>
            {label}
            {meta ? <span style={{ opacity: 0.75, marginLeft: '0.25rem' }}>· {meta}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function VerificationPill({ verified }) {
  return verified ? (
    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
      <CheckCircle2 size={13} /> Verified
    </span>
  ) : (
    <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
      <CircleAlert size={13} /> Pending verification
    </span>
  );
}

function ActivityList({ items, empty }) {
  const rows = list(items);
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="student-list-stack">
      {rows.map((item, index) => (
        <article key={`${item.title || item.organization || 'activity'}-${index}`} className="student-list-row">
          <div>
            <div className="student-list-title">{item.title || item.name || 'Activity'}</div>
            <div className="student-list-meta">
              {[item.organization || item.issuer, item.period || item.year].filter(Boolean).join(' · ')}
            </div>
          </div>
          {item.description && <p>{item.description}</p>}
        </article>
      ))}
    </div>
  );
}

export default function StudentProfileView({ student, onVerify, readOnly = false }) {
  const [activeSection, setActiveSection] = useState(PROFILE_SECTION_TABS[0].id);

  const scrollToSection = useCallback((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionId);
  }, []);

  useEffect(() => {
    if (!student?.id) return undefined;
    const sectionIds = PROFILE_SECTION_TABS.map((t) => t.id);
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target?.id;
        if (top && sectionIds.includes(top)) setActiveSection(top);
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [student?.id]);

  if (!student) return null;

  const resumeHref =
    (student.resumeViewUrl && String(student.resumeViewUrl).trim()) ||
    (student.resumeUrl && String(student.resumeUrl).trim()) ||
    (student.sections?.documents?.resumeUrl && String(student.sections.documents.resumeUrl).trim()) ||
    '';

  const sections = student.sections || {};
  const basic = sections.basic || {};
  const education = sections.education || {};
  const skills = sections.skills || {};
  const documents = sections.documents || {};
  const activities = sections.activities || {};
  const projects = list(sections.projects);
  const completed = getCompletedSectionCount(student);
  const total = getProfileSectionTotal(student);
  const profileLinks = [
    { label: 'LinkedIn', value: student.linkedinUrl },
    { label: 'GitHub', value: student.githubUrl },
    { label: 'Portfolio', value: student.portfolioUrl },
    ...list(basic.profileLinks).map((link) => ({ label: link.title || link.kind || 'Link', value: link.url })),
  ].filter((link, index, arr) => link.value && arr.findIndex((other) => other.value === link.value) === index);

  return (
    <div className="student-profile-page animate-fadeIn">
      <div
        className="student-profile-toolbar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Link
          href="/dashboard/college/students"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to students
        </Link>
        {!readOnly ? (
          <Link
            href={`/dashboard/college/students/${student.id}/edit`}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Edit student
          </Link>
        ) : null}
      </div>

      <article className="student-profile-shell" aria-labelledby="student-detail-title">
        <header className="student-detail-header surface-dark">
          <div className="student-detail-identity">
            <StudentListAvatar
              photo={student.photo}
              name={student.name}
              size={56}
              className="student-detail-avatar"
            />
            <div>
              <h2 id="student-detail-title">{student.name}</h2>
              <div className="student-detail-subtitle">{student.roll || student.systemId}</div>
              <div className="student-detail-badges">
                <VerificationPill verified={student.verified} />
                <span className="badge badge-indigo" style={{ fontSize: '0.78rem' }}>
                  Sections {completed}/{total}
                </span>
              </div>
            </div>
          </div>
          <div className="student-detail-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {resumeHref ? (
              <CvViewDownloadButtons
                viewUrl={resumeHref}
                downloadUrl={appendCvDownloadParam(resumeHref)}
                viewLabel="View resume"
              />
            ) : (
              <span
                className="badge badge-gray"
                style={{ fontSize: '0.78rem', opacity: 0.85 }}
              >
                No resume uploaded
              </span>
            )}
          </div>
        </header>

        <div className="student-detail-summary" aria-label="Student summary">
          <InfoItem label="Department" value={student.dept} />
          <InfoItem label="Degree pursued" value={student.degreePursued} />
          <InfoItem label="CGPA" value={present(student.cgpa) ? Number(student.cgpa).toFixed(2) : '—'} />
          <InfoItem label="Batch (joining AY)" value={student.batch} />
          <InfoItem label="Admission year" value={student.batchYear} />
          <InfoItem label="Graduation year" value={student.graduationYear} />
        </div>

        <StudentProfileSectionNav activeId={activeSection} onSelect={scrollToSection} />

        <div className="student-detail-body">
          <Section
            id="student-section-basic"
            icon={UserRound}
            title="Basic Details"
            description="Identity, contact, academic context, and profile links."
          >
            <div className="student-detail-grid">
              <InfoItem label="System ID" value={student.systemId} mono />
              <InfoItem label="Roll No." value={student.roll} mono />
              <InfoItem label="Enrollment No." value={student.enrollmentNumber} mono />
              <InfoItem label="Institution" value={basic.institutionName} />
              <InfoItem label="Department" value={student.dept} />
              <InfoItem label="Degree pursued" value={student.degreePursued} />
              <InfoItem label="Specialisation" value={student.specialization} />
              <InfoItem label="Batch (joining academic year)" value={student.batch} mono />
              <InfoItem label="Admission year" value={student.batchYear} />
              <InfoItem label="Graduation year" value={student.graduationYear} />
              <InfoItem label="Email" value={student.email} />
              <InfoItem
                label="Communication Email"
                value={(student.communicationEmail && String(student.communicationEmail).trim()) || student.email}
              />
              <InfoItem label="Phone" value={student.phone} />
              <InfoItem label="Gender" value={student.gender} />
              <InfoItem label="Category" value={student.diversityCategory} />
              <InfoItem label="Preferred Locations" value={list(student.preferredLocations).join(', ')} />
              <InfoItem label="Relocation" value={student.willingToRelocate ? 'Open to relocate' : 'Not open to relocate'} />
            </div>
            {student.bio && <p className="student-bio">{student.bio}</p>}
            <div className="student-link-row">
              {student.email && <span><Mail size={13} /> {student.email}</span>}
              {student.phone && <span><Phone size={13} /> {student.phone}</span>}
              {list(student.preferredLocations).length > 0 && <span><MapPin size={13} /> {student.preferredLocations.join(', ')}</span>}
              {profileLinks.map((link) => (
                <a key={link.value} href={link.value} target="_blank" rel="noreferrer">
                  <LinkIcon size={13} /> {link.label}
                </a>
              ))}
            </div>
          </Section>

          <Section
            id="student-section-education"
            icon={GraduationCap}
            title="Education Details"
            description="Academic records, scores, and backlog status."
          >
            {list(education.records).length ? (
              <div className="student-list-stack">
                {education.records.map((record, index) => (
                  <article key={`${record.institution}-${record.degree}-${index}`} className="student-list-row">
                    <div>
                      <div className="student-list-title">{record.degree} · {record.fieldOfStudy || 'Field not specified'}</div>
                      <div className="student-list-meta">
                        {[record.institution, [record.startYear, record.endYear].filter(Boolean).join('-'), record.grade].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {record.description && <p>{record.description}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No education records added yet.</EmptyState>
            )}
            <div className="student-score-table">
              <div className="student-score-row">
                <span>CGPA</span>
                <strong>{present(student.cgpa) ? Number(student.cgpa).toFixed(2) : '—'}</strong>
              </div>
              <div className="student-score-row">
                <span>Class X</span>
                <strong>{formatPercent(student.tenthPercentage)}</strong>
              </div>
              <div className="student-score-row">
                <span>Class XII</span>
                <strong>{formatPercent(student.twelfthPercentage)}</strong>
              </div>
              <div className="student-score-row">
                <span>Active Backlogs</span>
                <strong>{education.backlogs?.active ?? student.backlogsActive ?? 0}</strong>
              </div>
              <div className="student-score-row">
                <span>Total Backlogs</span>
                <strong>{education.backlogs?.total ?? student.backlogsHistory ?? 0}</strong>
              </div>
            </div>
          </Section>

          <Section
            id="student-section-skills"
            icon={Languages}
            title="Skills, Subjects & Languages"
            description="Technical strengths and communication readiness."
          >
            <div className="student-subsection-title">Technical Skills</div>
            <TagList items={skills.skills} />
            <div className="student-subsection-title">Languages</div>
            <TagList items={skills.languages} tone="blue" />
            <div className="student-subsection-title">Subjects</div>
            <TagList items={skills.subjects} tone="gray" />
          </Section>

          <Section
            id="student-section-projects"
            icon={Folder}
            title="Projects"
            description="Student project evidence, timelines, and technical tags."
          >
            {projects.length ? (
              <div className="student-list-stack">
                {projects.map((project, index) => (
                  <article key={`${project.title}-${index}`} className="student-list-row">
                    <div>
                      <div className="student-list-title">{project.title}</div>
                      <div className="student-list-meta">{formatPeriod(project.startDate, project.endDate)}</div>
                    </div>
                    {project.description && <p>{project.description}</p>}
                    <TagList items={project.techStack} tone="indigo" />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No projects added yet.</EmptyState>
            )}
          </Section>

          <Section
            id="student-section-documents"
            icon={FileText}
            title="Resume, Documents & Write-ups"
            description="Resume and document artifacts available in the student profile."
          >
            <div className="student-list-stack">
              <div className="student-subsection-title" style={{ marginBottom: '0.5rem' }}>
                Uploaded CVs
              </div>
              <CollegeStudentCvsPanel studentId={student.id} />
              {resumeHref ? (
                <article className="student-list-row">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', width: '100%' }}>
                    <div>
                      <div className="student-list-title">Primary Resume</div>
                                            <div className="student-list-meta">
                        {student.resumeFileName || 'Uploaded by student'}
                      </div>
                    </div>
                    <CvViewDownloadButtons
                      viewUrl={resumeHref}
                      downloadUrl={appendCvDownloadParam(resumeHref)}
                      viewLabel="Open resume"
                    />
                  </div>
                </article>
              ) : null}
              {list(documents.documents).map((doc, index) => (
                <article key={`${doc.name}-${index}`} className="student-list-row">
                  <div>
                    <div className="student-list-title">{doc.name}</div>
                    <div className="student-list-meta">
                      {[formatStatus(doc.type), doc.verified ? 'Verified' : 'Pending verification'].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </article>
              ))}
              {!documents.resumeUrl && !student.resumeUrl && !list(documents.documents).length ? (
                <EmptyState>No documents added yet.</EmptyState>
              ) : null}
            </div>
          </Section>

          <Section
            id="student-section-activities"
            icon={Briefcase}
            title="Experience & Activities"
            description="Work experience, responsibilities, achievements, and campus involvement."
          >
            <div className="student-activity-grid">
              <div>
                <div className="student-subsection-title"><Briefcase size={14} /> Internship & Work Ex</div>
                <ActivityList items={activities.workExperience} empty="No internship or work experience added yet." />
              </div>
              <div>
                <div className="student-subsection-title"><Users size={14} /> Positions of Responsibility</div>
                <ActivityList items={activities.responsibilities} empty="No positions of responsibility added yet." />
              </div>
              <div>
                <div className="student-subsection-title"><Award size={14} /> Accomplishments</div>
                <ActivityList items={activities.accomplishments} empty="No accomplishments added yet." />
              </div>
              <div>
                <div className="student-subsection-title"><BookOpen size={14} /> Volunteering & Extra-curricular</div>
                <ActivityList items={[...list(activities.volunteering), ...list(activities.extracurriculars)]} empty="No volunteering or extra-curricular activities added yet." />
              </div>
            </div>
          </Section>
        </div>

        <div className="modal-footer student-detail-footer">
          {onVerify && !readOnly ? (
            student.verified ? (
              <button type="button" className="btn btn-ghost" onClick={() => onVerify(student.id, false)}>Clear Verification</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => onVerify(student.id, true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> Approve & Verify Student
              </button>
            )
          ) : null}
          <Link href="/dashboard/college/students" className="btn btn-secondary">Back to list</Link>
        </div>
      </article>
    </div>
  );
}
