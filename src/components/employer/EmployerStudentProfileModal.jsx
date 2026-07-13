'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderDot,
  FolderOpen,
  GraduationCap,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { getDegreeTimelineWarning } from '@/lib/degreeTimeline';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'academics', label: 'Academics' },
  { id: 'experience', label: 'Experience' },
  { id: 'activities', label: 'Activities' },
];

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number' && !Number.isNaN(value)) return true;
  return Boolean(value);
}

function formatPercent(value) {
  return hasValue(value) ? `${Number(value).toFixed(2)}%` : '';
}

function formatDocType(type) {
  const t = String(type || '').trim();
  if (!t) return 'Document';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPeriod(start, end) {
  const from = start ? formatDate(start) : '';
  const to = end ? formatDate(end) : '';
  if (!from && !to) return '';
  return `${from || 'Started'} – ${to || 'Present'}`;
}

function formatPlacementStatus(status) {
  const s = String(status || '').trim();
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSalaryRange(min, max) {
  const lo = min != null && min !== '' && Number(min) > 0 ? `₹${Number(min).toLocaleString('en-IN')}` : '';
  const hi = max != null && max !== '' && Number(max) > 0 ? `₹${Number(max).toLocaleString('en-IN')}` : '';
  if (!lo && !hi) return '';
  return `${lo || '—'} – ${hi || '—'}`;
}

function jobTypeLabel(t) {
  if (!t || t === 'placement_drive') return 'Drive';
  return String(t).replace(/_/g, ' ');
}

function InfoBlock({ label, value, mono = false }) {
  if (!hasValue(value)) return null;
  return (
    <div className="employer-student-profile-info">
      <div className="employer-student-profile-label">{label}</div>
      <div
        className="employer-student-profile-value"
        style={mono ? { fontFamily: 'var(--font-mono, ui-monospace, monospace)' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function InfoGrid({ children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [];
  if (!items.length) {
    return <p className="text-sm text-secondary" style={{ margin: 0 }}>No details provided.</p>;
  }
  return <div className="employer-student-profile-grid">{items}</div>;
}

function ProfileSection({ icon: Icon, title, children }) {
  return (
    <section className="employer-student-profile-section">
      <div className="employer-student-profile-section-header">
        <span className="employer-student-profile-section-icon" aria-hidden>
          <Icon size={17} />
        </span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TagList({ items }) {
  const values = asList(items).filter(Boolean);
  if (!values.length) return <p className="text-sm text-secondary" style={{ margin: 0 }}>None listed.</p>;
  return (
    <div className="employer-student-profile-tags">
      {values.map((item, index) => {
        const label = typeof item === 'string' ? item : item.name || item.title;
        const meta = typeof item === 'string' ? '' : item.proficiency;
        return (
          <span key={`${label}-${index}`} className="badge badge-gray">
            {label}
            {meta ? ` · ${meta}` : ''}
          </span>
        );
      })}
    </div>
  );
}

function ActivityList({ items }) {
  const rows = asList(items);
  if (!rows.length) return <p className="text-sm text-secondary" style={{ margin: 0 }}>None listed.</p>;
  return (
    <div className="employer-student-profile-list">
      {rows.map((item, index) => (
        <article key={`${item.title || item.organization || 'activity'}-${index}`} className="employer-student-profile-list-row">
          <div className="employer-student-profile-list-title">{item.title || item.name || 'Activity'}</div>
          <div className="employer-student-profile-list-meta">
            {[item.organization || item.issuer, item.period || item.year].filter(Boolean).join(' · ')}
          </div>
          {item.description ? <p>{item.description}</p> : null}
        </article>
      ))}
    </div>
  );
}

function SchoolingDetails({ details }) {
  if (!details || typeof details !== 'object') return null;
  const levels = [
    { key: 'graduation', label: 'Graduation' },
    { key: 'diploma', label: 'Diploma' },
    { key: 'twelfth', label: 'Class XII' },
    { key: 'tenth', label: 'Class X' },
  ];
  const rows = levels
    .map(({ key, label }) => {
      const row = details[key] || {};
      if (!row.institution && !row.board && !row.year && !row.notes) return null;
      return (
        <article key={key} className="employer-student-profile-list-row">
          <div className="employer-student-profile-list-title">{label}</div>
          <div className="employer-student-profile-list-meta">
            {[row.institution, row.board, row.year].filter(Boolean).join(' · ')}
          </div>
          {row.notes ? <p>{row.notes}</p> : null}
        </article>
      );
    })
    .filter(Boolean);
  if (!rows.length) return null;
  return <div className="employer-student-profile-list">{rows}</div>;
}

function DocumentsPanel({ student, onOpenResume }) {
  const documents = asList(student?.documents);
  const resume = student?.resume;

  return (
    <ProfileSection icon={FolderOpen} title="Resume & documents">
      <div className="employer-student-profile-list">
        {resume?.hasResume ? (
          <article className="employer-student-profile-list-row employer-student-profile-doc-row">
            <div>
              <div className="employer-student-profile-list-title">CV / Resume</div>
              <div className="employer-student-profile-list-meta">{resume.fileName || 'Uploaded by student'}</div>
            </div>
            <CvViewDownloadButtons
              viewUrl={resume.viewUrl}
              downloadUrl={resume.downloadUrl}
              viewLabel="View CV"
            />
          </article>
        ) : (
          <p className="text-sm text-secondary" style={{ margin: 0 }}>No CV uploaded yet.</p>
        )}
        {documents.map((doc) => (
          <article key={doc.id} className="employer-student-profile-list-row employer-student-profile-doc-row">
            <div>
              <div className="employer-student-profile-list-title">{doc.name || formatDocType(doc.type)}</div>
              <div className="employer-student-profile-list-meta">
                {[formatDocType(doc.type), doc.uploadedAt ? formatDate(doc.uploadedAt) : ''].filter(Boolean).join(' · ')}
              </div>
            </div>
            {doc.viewUrl ? (
              <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                <ExternalLink size={14} /> Open
              </a>
            ) : (
              <span className="text-xs text-tertiary">Unavailable</span>
            )}
          </article>
        ))}
      </div>
    </ProfileSection>
  );
}

export default function EmployerStudentProfileModal({
  open,
  profileData,
  profileError,
  profileLoading,
  applicationContext,
  onClose,
  onOpenResume,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!open) return undefined;
    setActiveTab('overview');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const student = profileData?.student;
  const profile = student?.profile || {};
  const avatarPhoto = student?.avatarUrl || profile.avatarUrl || '';

  const profileLinks = asList(profile.profileLinks).filter((link) => link?.url);
  const educationRecords = asList(student?.educationRecords);
  const projects = asList(profile.projects);
  const internships = asList(profile.internships);
  const otherWork = asList(profile.otherWork);
  const workExperience = asList(profile.workExperience);
  const phones = asList(profile.phones).filter((p) => p?.value);
  const emails = asList(profile.emails).filter((e) => e?.value);
  const skillItems = asList(student?.skillsDetailed).length
    ? student.skillsDetailed.map((s) => ({ name: s.name, proficiency: s.proficiency }))
    : asList(profile.skills).map((name) => ({ name }));

  const degreeTimelineWarning = getDegreeTimelineWarning({
    batchYear: profile.batchYear,
    graduationYear: profile.graduationYear,
    joiningAcademicYear: profile.joiningAcademicYear,
    batch: profile.batch,
  });

  const statusTone = applicationContext?.status ? getStatusColor(applicationContext.status) : 'gray';

  return (
    <div
      className="employer-student-profile-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="employer-student-profile-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employer-student-profile-title"
      >
        <header className="employer-student-profile-header">
          <div className="employer-student-profile-identity">
            <StudentListAvatar
              photo={avatarPhoto}
              name={student?.name || 'Student'}
              size={56}
              className="employer-student-profile-avatar employer-student-profile-avatar-img"
            />
            <div className="employer-student-profile-identity-text">
              <h2 id="employer-student-profile-title">{student?.name || 'Student profile'}</h2>
              <p>
                {student?.collegeName || 'College'}
                {student?.systemId ? ` · ${student.systemId}` : ''}
                {student?.rollNumber && !student?.systemId?.includes(student.rollNumber)
                  ? ` · Roll ${student.rollNumber}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="employer-student-profile-header-actions">
            {student?.resume?.hasResume ? (
              <CvViewDownloadButtons
                viewUrl={student.resume.viewUrl}
                downloadUrl={student.resume.downloadUrl}
                viewLabel="View CV"
              />
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close profile">
              <X size={18} />
            </button>
          </div>
        </header>

        {profileLoading ? (
          <div className="employer-student-profile-body">
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>Loading profile…</div>
          </div>
        ) : profileError ? (
          <div className="employer-student-profile-body">
            <div className="card" style={{ padding: '1.5rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}>
              <p style={{ color: 'var(--danger-700)', margin: 0 }}>{profileError.message}</p>
            </div>
          </div>
        ) : student ? (
          <>
            <nav className="employer-student-profile-tabs" aria-label="Profile sections">
              {PROFILE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`employer-student-profile-tab${activeTab === t.id ? ' employer-student-profile-tab--active' : ''}`}
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="employer-student-profile-body">
              {activeTab === 'overview' && (
                <>
                  {applicationContext ? (
                    <section className="employer-student-profile-application-card">
                      <div className="employer-student-profile-application-card-head">
                        <ClipboardList size={18} />
                        <div>
                          <div className="employer-student-profile-label">This application</div>
                          <div className="employer-student-profile-application-title">{applicationContext.openingTitle || 'Opening'}</div>
                        </div>
                        <span className={`badge badge-${statusTone} badge-dot`}>{formatStatus(applicationContext.status)}</span>
                      </div>
                      <div className="employer-student-profile-grid employer-student-profile-grid--compact">
                        <InfoBlock label="Type" value={jobTypeLabel(applicationContext.jobType)} />
                        <InfoBlock label="Applied" value={applicationContext.appliedAt ? formatDate(applicationContext.appliedAt) : ''} />
                        {applicationContext.currentRound ? (
                          <InfoBlock label="Current round" value={String(applicationContext.currentRound)} />
                        ) : null}
                      </div>
                      {applicationContext.notes ? (
                        <p className="employer-student-profile-notes">{applicationContext.notes}</p>
                      ) : null}
                    </section>
                  ) : null}

                  <div className="employer-student-profile-summary">
                    <InfoBlock label="CGPA" value={hasValue(profile.cgpa) ? Number(profile.cgpa).toFixed(2) : ''} />
                    <InfoBlock label="Branch" value={profile.branch || profile.department} />
                    <InfoBlock label="Batch" value={profile.batch || profile.batchYear} />
                    <InfoBlock label="Placement" value={formatPlacementStatus(student.placementStatus)} />
                    <InfoBlock
                      label="Expected CTC"
                      value={formatSalaryRange(
                        profile.expectedSalaryMin ?? student.expectedSalaryMin,
                        profile.expectedSalaryMax ?? student.expectedSalaryMax,
                      )}
                    />
                  </div>

                  <DocumentsPanel student={student} onOpenResume={onOpenResume} />

                  <ProfileSection icon={UserRound} title="Contact">
                    <InfoGrid>
                      <InfoBlock label="Account email" value={student.email} />
                      <InfoBlock label="College email" value={profile.collegeEmail} />
                      <InfoBlock label="Phone" value={phones[0]?.value || student.phone} />
                      <InfoBlock label="Roll number" value={student.rollNumber} mono />
                      <InfoBlock label="Preferred locations" value={profile.preferredLocations} />
                    </InfoGrid>
                    {(phones.length > 1 || emails.length || profileLinks.length) ? (
                      <div className="employer-student-profile-links">
                        {phones.slice(1).map((phone, index) => (
                          <span key={`p-${index}`}>
                            <Phone size={13} /> {phone.label ? `${phone.label}: ` : ''}
                            {phone.value}
                          </span>
                        ))}
                        {emails.map((entry, index) => (
                          <span key={`e-${index}`}>
                            <Mail size={13} /> {entry.value}
                          </span>
                        ))}
                        {profileLinks.map((link) => (
                          <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                            <LinkIcon size={13} /> {link.title || link.kind || 'Link'}
                          </a>
                        ))}
                        {profile.preferredLocations ? (
                          <span>
                            <MapPin size={13} /> {profile.preferredLocations}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </ProfileSection>
                </>
              )}

              {activeTab === 'academics' && (
                <>
                  {degreeTimelineWarning ? (
                    <div className="employer-student-profile-timeline-warning" role="status">
                      <strong>Unusual degree timeline</strong>
                      <p>{degreeTimelineWarning.message}</p>
                    </div>
                  ) : null}
                  <ProfileSection icon={GraduationCap} title="Academics">
                    <InfoGrid>
                      <InfoBlock
                        label="Admission year"
                        value={degreeTimelineWarning?.joiningYear ?? profile.batchYear ?? profile.batch}
                      />
                      <InfoBlock label="Graduation year" value={profile.graduationYear} />
                      <InfoBlock label="Department" value={profile.department} />
                      <InfoBlock label="Class X %" value={formatPercent(profile.tenthPercentage)} />
                      <InfoBlock label="Class XII %" value={formatPercent(profile.twelfthPercentage)} />
                      <InfoBlock label="Diploma %" value={formatPercent(profile.diplomaPercentage)} />
                      <InfoBlock label="Active backlogs" value={hasValue(profile.backlogsActive) ? profile.backlogsActive : ''} />
                      <InfoBlock label="Total backlogs" value={hasValue(profile.backlogsHistory) ? profile.backlogsHistory : ''} />
                    </InfoGrid>
                    <SchoolingDetails details={profile.educationDetails} />
                    {educationRecords.length ? (
                      <div className="employer-student-profile-list" style={{ marginTop: '0.85rem' }}>
                        {educationRecords.map((record, index) => (
                          <article key={`${record.institution}-${record.degree}-${index}`} className="employer-student-profile-list-row">
                            <div className="employer-student-profile-list-title">
                              {record.degree || 'Education'} — {record.fieldOfStudy || 'Field not specified'}
                            </div>
                            <div className="employer-student-profile-list-meta">
                              {[record.institution, [record.startYear, record.endYear].filter(Boolean).join('–'), record.grade]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {record.description ? <p>{record.description}</p> : null}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </ProfileSection>
                  <ProfileSection icon={BookOpen} title="Skills">
                    <TagList items={skillItems} />
                    {(asList(student.languages).length > 0 || asList(student.subjects).length > 0) && (
                      <div className="employer-student-profile-two-col" style={{ marginTop: '0.85rem' }}>
                        <div>
                          <div className="employer-student-profile-label">Languages</div>
                          <TagList items={student.languages} />
                        </div>
                        <div>
                          <div className="employer-student-profile-label">Subjects</div>
                          <TagList items={student.subjects} />
                        </div>
                      </div>
                    )}
                  </ProfileSection>
                </>
              )}

              {activeTab === 'experience' && (
                <>
                  <ProfileSection icon={FolderDot} title="Projects">
                    {projects.length ? (
                      <div className="employer-student-profile-list">
                        {projects.map((project, index) => (
                          <article key={`${project.title}-${index}`} className="employer-student-profile-list-row">
                            <div className="employer-student-profile-list-title">{project.title || 'Project'}</div>
                            <div className="employer-student-profile-list-meta">{formatPeriod(project.startDate, project.endDate)}</div>
                            {project.description ? <p>{project.description}</p> : null}
                            <TagList items={project.techStack} />
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-secondary" style={{ margin: 0 }}>No projects listed.</p>
                    )}
                  </ProfileSection>
                  <div className="employer-student-profile-two-col">
                    <ProfileSection icon={Briefcase} title="Internships">
                      <ActivityList items={internships} />
                    </ProfileSection>
                    <ProfileSection icon={Briefcase} title="Work experience">
                      <ActivityList items={workExperience} />
                    </ProfileSection>
                  </div>
                  {otherWork.length ? (
                    <ProfileSection icon={Briefcase} title="Other work">
                      <ActivityList items={otherWork} />
                    </ProfileSection>
                  ) : null}
                </>
              )}

              {activeTab === 'activities' && (
                <ProfileSection icon={Award} title="Activities & achievements">
                  <div className="employer-student-profile-two-col">
                    <div>
                      <div className="employer-student-profile-label">Responsibilities</div>
                      <ActivityList items={profile.responsibilities} />
                    </div>
                    <div>
                      <div className="employer-student-profile-label">Accomplishments</div>
                      <ActivityList items={profile.accomplishments} />
                    </div>
                    <div>
                      <div className="employer-student-profile-label">Volunteering</div>
                      <ActivityList items={profile.volunteering} />
                    </div>
                    <div>
                      <div className="employer-student-profile-label">Extracurriculars</div>
                      <ActivityList items={profile.extracurriculars} />
                    </div>
                  </div>
                  {profile.bio ? <p className="employer-student-profile-notes">{profile.bio}</p> : null}
                </ProfileSection>
              )}
            </div>
          </>
        ) : (
          <div className="employer-student-profile-body">
            <p className="text-secondary">No profile data available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
