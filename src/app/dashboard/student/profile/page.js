'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { ProfileLinkKindIcon } from '@/components/ProfileLinkKindIcon';
import { defaultStudentProfile } from '@/lib/studentProfileStorage';
import { toSignedViewUrl } from '@/lib/clientAssetUrl';
import { uploadStudentAvatarViaServer } from '@/lib/clientStudentAvatarUpload';
import { studentAvatarAcceptAttr, validateStudentAvatarFileAsync } from '@/lib/studentAvatarUpload';
import StudentProfileAvatar, { withAvatarCacheBust } from '@/components/student/StudentProfileAvatar';
import {
  validateStudentAcademicPayload,
  validateEducationDetailsPayload,
  validateStudentProfileEmailsPayload,
} from '@/lib/apiInputValidation';
import { getPhonesListValidationError, sanitizePhoneInput } from '@/lib/validators';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedTextInput from '@/components/form/ValidatedTextInput';
import ValidatedEmailInput from '@/components/form/ValidatedEmailInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { STUDENT_RESUME_ACCEPT_ATTR, validateStudentResumeFileAsync } from '@/lib/studentDocumentUpload';
import { uploadStudentDocumentViaServer } from '@/lib/clientStudentDocumentUpload';
import TagPicker from '@/components/TagPicker';
import StudentResumeUploadCard from '@/components/student/StudentResumeUploadCard';
import PageLoading from '@/components/PageLoading';
import ProfilePhotoLightbox from '@/components/student/ProfilePhotoLightbox';
import { Pencil } from 'lucide-react';
import { postStudentCvUpload, studentCvViewUrl } from '@/lib/studentCvApiPaths';
import {
  resolveStudentBatchLabel,
  resolveStudentDegreeLabel,
} from '@/lib/studentCollegeControlledFields';

const LINK_KINDS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'website', label: 'Website' },
  { value: 'project', label: 'Project / portfolio' },
  { value: 'other', label: 'Other' },
];

const PROFILE_TABS = [
  { key: 'academics', label: 'Academics' },
  { key: 'contact', label: 'Contact' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'internships', label: 'Internships' },
  { key: 'otherWork', label: 'Other work' },
  { key: 'activities', label: 'Activities' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'links', label: 'Links' },
  { key: 'about', label: 'About' },
];

const PROFILE_EDUCATION_DETAIL_SECTIONS = [
  ['graduation', 'Graduation', 'University / degree', null],
  ['diploma', 'Diploma', 'Diploma board', 'diplomaPercentage'],
  ['twelfth', '12th Standard', 'Class XII board', 'twelfthPercentage'],
  ['tenth', '10th Standard', 'Class X board', 'tenthPercentage'],
];

function formatEducationPercent(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n}%`;
}

function newLinkId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deriveCurrentSemester(profile) {
  const batchYearRaw = profile?.batchYear;
  const gradYearRaw = profile?.graduationYear;
  const batchYear = Number.isFinite(Number(batchYearRaw))
    ? Number(batchYearRaw)
    : Number.isFinite(Number(gradYearRaw))
      ? Number(gradYearRaw) - 4
      : null;
  if (!Number.isFinite(batchYear)) return '—';

  const now = new Date();
  const yearDiff = now.getFullYear() - batchYear;
  const isOddSemesterWindow = now.getMonth() >= 6; // Jul-Dec
  const semester = Math.max(1, Math.min(8, yearDiff * 2 + (isOddSemesterWindow ? 1 : 2)));
  return String(semester);
}

/** Omit college-controlled and local-only fields from API save payload. */
function profilePutBody(p) {
  return {
    tenthPercentage: p.tenthPercentage,
    twelfthPercentage: p.twelfthPercentage,
    diplomaPercentage: p.diplomaPercentage,
    backlogsActive: p.backlogsActive,
    backlogsHistory: p.backlogsHistory,
    educationDetails: p.educationDetails,
    gender: p.gender,
    bio: p.bio,
    skills: p.skills,
    expectedSalaryMin: p.expectedSalaryMin,
    expectedSalaryMax: p.expectedSalaryMax,
    preferredLocations: p.preferredLocations,
    willingToRelocate: p.willingToRelocate,
    profileLinks: p.profileLinks,
    phones: p.phones,
    emails: p.emails,
    communicationEmail: p.communicationEmail,
    address: p.address,
    projects: p.projects,
    internships: p.internships,
    otherWork: p.otherWork,
    workExperience: p.workExperience,
    responsibilities: p.responsibilities,
    accomplishments: p.accomplishments,
    volunteering: p.volunteering,
    extracurriculars: p.extracurriculars,
  };
}

function blankProject() {
  return {
    title: '',
    description: '',
    techStack: [],
    projectUrl: '',
    githubUrl: '',
    startDate: '',
    endDate: '',
  };
}

function blankActivity() {
  return {
    title: '',
    organization: '',
    period: '',
    description: '',
  };
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}


export default function StudentProfilePage() {
  const { data: session, status, update } = useSession();
  const { addToast } = useToast();
  const email = session?.user?.email || '';
  const [activeTab, setActiveTab] = useState('academics');
  const [editingTab, setEditingTab] = useState(null);
  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const [suggestSkillsFeedback, setSuggestSkillsFeedback] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewBlobUrl, setAvatarPreviewBlobUrl] = useState('');
  const [avatarCacheBust, setAvatarCacheBust] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [profile, setProfile] = useState(() => defaultStudentProfile(session?.user));
  const isAlumni = Boolean(profile?.isAlumni ?? session?.user?.isAlumni);
  const currentSemester = deriveCurrentSemester(profile);
  const editingHeader = editingTab === 'header';
  const editing = editingTab === activeTab;

  const calendarFetcher = useCallback(async (url) => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || 'Failed to load calendar');
    return json;
  }, []);
  const { data: placementCalData, isLoading: placementCalLoading } = useSWR(
    isAlumni ? null : '/api/student/calendar',
    calendarFetcher,
  );
  const { data: cvData, mutate: mutateCvs } = useSWR('/api/student/cv-list', async () => {
    let res = await fetch('/api/student/cv-list');
    if (res.status === 404) res = await fetch('/api/student/cvs');
    const json = await res.json().catch(() => ({}));
    if (res.status === 503) return { items: [], legacy: true };
    if (!res.ok) throw new Error(json.error || 'Failed to load CVs');
    return { items: json.items || [], legacy: false };
  });
  const defaultCv = useMemo(() => {
    const items = Array.isArray(cvData?.items) ? cvData.items.filter((c) => !c.archivedAt) : [];
    return items.find((c) => c.isDefault) || items[0] || null;
  }, [cvData]);
  const useCvApi = cvData?.legacy !== true;
  const upcomingPlacementDates = useMemo(() => {
    const events = Array.isArray(placementCalData?.events) ? placementCalData.events : [];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return events
      .map((e) => ({
        id: e.id,
        title: e.title,
        ymd: String(e.date || '').slice(0, 10),
      }))
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.ymd))
      .sort((a, b) => a.ymd.localeCompare(b.ymd))
      .filter((e) => e.ymd >= todayYmd)
      .slice(0, 5);
  }, [placementCalData]);

  const loadProfileFromApi = useCallback(
    async (opts) => {
      const silent = Boolean(opts?.silent);
      if (!email) {
        setProfile(defaultStudentProfile(session?.user));
        if (!silent) setProfileLoading(false);
        return;
      }
      if (!silent) setProfileLoading(true);
      try {
        const res = await fetch('/api/student/profile');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(data.hint ? `${data.error || 'Error'}: ${data.hint}` : data.error || 'Could not load profile', 'warning');
          setProfile(defaultStudentProfile(session?.user));
          return;
        }
        if (data.profile) {
          setProfile({
            ...data.profile,
            isAlumni: Boolean(data.isAlumni ?? data.profile.isAlumni),
          });
        }
      } catch {
        addToast('Could not load profile (network).', 'warning');
        setProfile(defaultStudentProfile(session?.user));
      } finally {
        if (!silent) setProfileLoading(false);
      }
    },
    [addToast, email, session?.user?.id, session?.user?.role]
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.role !== 'student') {
      setProfileLoading(false);
      return;
    }
    loadProfileFromApi();
  }, [status, session?.user?.role, session?.user?.id, loadProfileFromApi]);

  const persist = useCallback((next) => {
    setProfile(next);
  }, []);

  const handleSave = async () => {
    const validationErr = validateStudentAcademicPayload({
      cgpa: profile.cgpa,
      tenthPercentage: profile.tenthPercentage,
      twelfthPercentage: profile.twelfthPercentage,
      diplomaPercentage: profile.diplomaPercentage,
      batchYear: profile.batchYear,
      graduationYear: profile.graduationYear,
      backlogsActive: profile.backlogsActive,
      backlogsHistory: profile.backlogsHistory,
      expectedSalaryMin: profile.expectedSalaryMin,
      expectedSalaryMax: profile.expectedSalaryMax,
      isAlumni,
    });
    if (validationErr) {
      addToast(validationErr, 'warning');
      return;
    }
    const educationErr = validateEducationDetailsPayload(profile.educationDetails);
    if (educationErr) {
      addToast(educationErr, 'warning');
      return;
    }
    const emailErr = validateStudentProfileEmailsPayload({
      communicationEmail: profile.communicationEmail,
      emails: profile.emails,
    });
    if (emailErr) {
      addToast(emailErr, 'warning');
      return;
    }
    const phoneErr = getPhonesListValidationError(profile.phones);
    if (phoneErr) {
      addToast(phoneErr, 'warning');
      return;
    }
    const savedSummary = editingTab === 'header';
    setProfileSaving(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePutBody(profile)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data.hint ? `${data.error || 'Save failed'}: ${data.hint}` : data.error || 'Save failed', 'warning');
        return;
      }
      if (data.profile) {
        setProfile((prev) => ({
          ...data.profile,
          avatarUrl: data.profile.avatarUrl || prev.avatarUrl || '',
          avatarDataUrl: prev.avatarDataUrl || '',
          avatarName: prev.avatarName || data.profile.avatarName || '',
          isAlumni: Boolean(data.isAlumni ?? data.profile.isAlumni ?? isAlumni),
        }));
      }
      setEditingTab(null);
      addToast(savedSummary ? 'Profile summary saved.' : 'Profile saved.', 'success');
    } catch {
      addToast('Save failed (network).', 'warning');
    } finally {
      setProfileSaving(false);
    }
  };

  const addProfileLink = () => {
    const prevLinks = profile.profileLinks || [];
    persist({
      ...profile,
      profileLinks: [...prevLinks, { id: newLinkId(), kind: 'website', url: '', title: '', description: '' }],
    });
  };

  const updateLink = (id, patch) => {
    const prevLinks = profile.profileLinks || [];
    persist({
      ...profile,
      profileLinks: prevLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const removeLink = (id) => {
    const prevLinks = profile.profileLinks || [];
    persist({ ...profile, profileLinks: prevLinks.filter((l) => l.id !== id) });
  };

  const updateEducationDetail = (key, patch) => {
    persist({
      ...profile,
      educationDetails: {
        ...(profile.educationDetails || {}),
        [key]: {
          ...((profile.educationDetails || {})[key] || {}),
          ...patch,
        },
      },
    });
  };

  const addProject = () => {
    persist({ ...profile, projects: [...asList(profile.projects), blankProject()] });
  };

  const updateProject = (index, patch) => {
    const projects = [...asList(profile.projects)];
    projects[index] = { ...projects[index], ...patch };
    persist({ ...profile, projects });
  };

  const removeProject = (index) => {
    const projects = [...asList(profile.projects)];
    projects.splice(index, 1);
    persist({ ...profile, projects });
  };

  const addActivity = (key) => {
    persist({ ...profile, [key]: [...asList(profile[key]), blankActivity()] });
  };

  const updateActivity = (key, index, patch) => {
    const rows = [...asList(profile[key])];
    rows[index] = { ...rows[index], ...patch };
    persist({ ...profile, [key]: rows });
  };

  const removeActivity = (key, index) => {
    const rows = [...asList(profile[key])];
    rows.splice(index, 1);
    persist({ ...profile, [key]: rows });
  };

  const addPhone = () => {
    persist({
      ...profile,
      phones: [...(profile.phones || []), { label: 'Other', value: '' }],
    });
  };

  const updatePhone = (index, patch) => {
    const phones = [...(profile.phones || [])];
    phones[index] = { ...phones[index], ...patch };
    persist({ ...profile, phones });
  };

  const removePhone = (index) => {
    const phones = [...(profile.phones || [])];
    phones.splice(index, 1);
    persist({ ...profile, phones: phones.length ? phones : [{ label: 'Primary', value: '' }] });
  };

  const addEmailRow = () => {
    persist({
      ...profile,
      emails: [...(profile.emails || []), { label: 'Other', value: '' }],
    });
  };

  const updateEmailRow = (index, patch) => {
    const emails = [...(profile.emails || [])];
    emails[index] = { ...emails[index], ...patch };
    persist({ ...profile, emails });
  };

  const removeEmailRow = (index) => {
    const emails = [...(profile.emails || [])];
    emails.splice(index, 1);
    persist({
      ...profile,
      emails: emails.length ? emails : [{ label: 'College', value: email }],
    });
  };

  const persistLocalAvatarDataUrl = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string') {
            addToast('Could not read the image file.', 'warning');
            reject(new Error('invalid read'));
            return;
          }
          if (dataUrl.length > 1_200_000) {
            addToast('Image too large for offline storage. Use a smaller file (~900KB).', 'warning');
            reject(new Error('too large'));
            return;
          }
          setProfile((prev) => ({
            ...prev,
            avatarDataUrl: dataUrl,
            avatarUrl: '',
            avatarName: file.name,
          }));
          addToast('Photo saved in this browser only (cloud upload not available).', 'info');
          resolve();
        };
        reader.onerror = () => {
          addToast('Could not read the image file.', 'warning');
          reject(new Error('read error'));
        };
        reader.readAsDataURL(file);
      }),
    [addToast],
  );

  useEffect(() => {
    return () => {
      if (avatarPreviewBlobUrl) URL.revokeObjectURL(avatarPreviewBlobUrl);
    };
  }, [avatarPreviewBlobUrl]);

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validated = await validateStudentAvatarFileAsync(file);
    if (!validated.ok) {
      addToast(validated.error, 'warning');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localPreview;
    });

    setAvatarUploading(true);
    try {
      const serverResult = await uploadStudentAvatarViaServer(file);
      if (serverResult.ok) {
        const nextAvatarUrl = serverResult.avatar_url || '';
        setProfile((prev) => ({
          ...prev,
          avatarUrl: nextAvatarUrl,
          avatarDataUrl: '',
          avatarName: file.name,
        }));
        setAvatarCacheBust(Date.now());
        try {
          await update({ avatar: nextAvatarUrl });
        } catch {
          // Profile state already has the new URL; session avatar may refresh on next login.
        }
        // Do not reload the full profile while editing — that would wipe unsaved draft fields.
        if (!editingTab) {
          await loadProfileFromApi({ silent: true });
        }
        addToast('Profile photo updated.', 'success');
        setAvatarPreviewBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return '';
        });
        return;
      }

      if (serverResult.error === 'Cloud storage not configured' || serverResult.hint?.includes('S3')) {
        setAvatarPreviewBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return '';
        });
        await persistLocalAvatarDataUrl(file);
        return;
      }

      addToast(serverResult.error + (serverResult.hint ? ` — ${serverResult.hint}` : ''), 'warning');
    } catch (err) {
      if (err?.message !== 'too large' && err?.message !== 'invalid read' && err?.message !== 'read error') {
        addToast('Upload failed (network).', 'warning');
      }
    } finally {
      setAvatarUploading(false);
      setAvatarPreviewBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
          return '';
        }
        return prev;
      });
    }
  };

  const onCvUpload = async ({ file, label, event }) => {
    if (!file) return;

    if (label) {
      setCvUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('label', label);
        fd.append('set_as_default', '1');
        const res = await postStudentCvUpload(fd);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(json.error || 'Upload failed', 'warning');
          return;
        }
        await loadProfileFromApi({ silent: true });
        await mutateCvs?.();
        addToast('CV uploaded and set as default.', 'success');
      } catch {
        addToast('Résumé upload failed (network).', 'warning');
      } finally {
        setCvUploading(false);
      }
      return;
    }

    const validated = await validateStudentResumeFileAsync(file);
    if (!validated.ok) {
      addToast(validated.error, 'warning');
      return;
    }

    setCvUploading(true);
    try {
      const result = await uploadStudentDocumentViaServer(file, {
        documentType: 'resume',
        setAsPrimaryResume: true,
      });
      if (!result.ok) {
        addToast(result.error + (result.hint ? ` — ${result.hint}` : ''), 'warning');
        return;
      }

      await loadProfileFromApi({ silent: true });
      addToast('Primary CV saved. Employers will see this version when you apply.', 'success');
    } catch {
      addToast('Résumé upload failed (network).', 'warning');
    } finally {
      setCvUploading(false);
      if (event?.target) event.target.value = '';
    }
  };

  const displayPhones = profile.phones?.length ? profile.phones : [{ label: 'Primary', value: profile.phone || '' }];
  const displayEmails = profile.emails?.length
    ? profile.emails
    : [
        { label: 'College', value: profile.collegeEmail || email },
        { label: 'Personal', value: profile.personalEmail || '' },
      ];

  const locList = (profile.preferredLocations || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const rawAvatarPhoto = profile.avatarUrl || profile.avatarDataUrl || session?.user?.avatar || '';
  const avatarLightboxSrc =
    rawAvatarPhoto.startsWith('data:') || rawAvatarPhoto.startsWith('blob:')
      ? rawAvatarPhoto
      : withAvatarCacheBust(toSignedViewUrl(rawAvatarPhoto) || rawAvatarPhoto, avatarCacheBust);
  const resumeViewUrl = defaultCv
    ? studentCvViewUrl(defaultCv.id)
    : profile.resumeUrl
      ? '/api/student/resume/view'
      : '';
  const resumeLabel = defaultCv?.label || profile.cvFileName?.trim() || '';
  const headerActionLabelStyle = {
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.3rem 0.55rem',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: 'white',
    margin: 0,
    textAlign: 'center',
  };
  const skillsList = profile.skills || [];
  const linksList = profile.profileLinks || [];
  const projectsList = asList(profile.projects);
  const internshipsList = asList(profile.internships?.length ? profile.internships : profile.workExperience);
  const otherWorkList = asList(profile.otherWork);
  const activitySections = [
    { key: 'responsibilities', title: 'Positions of Responsibility', empty: 'No responsibilities added yet.' },
    { key: 'accomplishments', title: 'Accomplishments', empty: 'No accomplishments added yet.' },
    { key: 'volunteering', title: 'Volunteering', empty: 'No volunteering added yet.' },
    { key: 'extracurriculars', title: 'Extra-curricular Activities', empty: 'No activities added yet.' },
  ];
  const cgpaNum = profile.cgpa === '' || profile.cgpa == null ? NaN : Number(profile.cgpa);
  const degreeLabel = resolveStudentDegreeLabel(profile);
  const batchLabel = resolveStudentBatchLabel(profile);
  const hasSalary =
    (profile.expectedSalaryMin != null && Number(profile.expectedSalaryMin) > 0) ||
    (profile.expectedSalaryMax != null && Number(profile.expectedSalaryMax) > 0);

  if (profileLoading) {
    return <PageLoading message="Loading profile…" />;
  }

  return (
    <div className="animate-fadeIn">
      <div className="profile-header">
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <StudentProfileAvatar
            photo={rawAvatarPhoto}
            name={session?.user?.name}
            previewUrl={avatarPreviewBlobUrl}
            cacheBust={avatarCacheBust}
            clickable={Boolean(rawAvatarPhoto || avatarPreviewBlobUrl)}
            onOpenPreview={() => setAvatarPreviewOpen(true)}
          />
          <label
            aria-label={avatarUploading ? 'Uploading profile photo' : 'Change profile photo'}
            style={{
              ...headerActionLabelStyle,
              cursor: avatarUploading ? 'wait' : 'pointer',
              opacity: avatarUploading ? 0.8 : 1,
            }}
          >
            {avatarUploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept={studentAvatarAcceptAttr()}
              hidden
              disabled={avatarUploading}
              onChange={onAvatarChange}
            />
          </label>
        </div>
        <div className="profile-info" style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{session?.user?.name}</h2>
            <p className="text-xs" style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.75)' }}>
              Name is set by your college and can only be changed by a super admin.
            </p>
            {!editingHeader ? (
              <button
                type="button"
                className="profile-edit-summary-btn"
                onClick={() => setEditingTab('header')}
              >
                <Pencil size={15} aria-hidden />
                Edit summary
              </button>
            ) : (
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                Editing summary
              </span>
            )}
          </div>
          {!editingHeader ? (
            <>
              <p style={{ margin: '0.35rem 0 0' }}>
                {[degreeLabel !== '—' ? degreeLabel : '', batchLabel !== '—' ? `Batch ${batchLabel}` : '']
                  .filter(Boolean)
                  .join(' | ') || '—'}
              </p>
              <div className="profile-meta">
                <div className="profile-meta-item">🎓 {profile.rollNumber || '—'}</div>
                <div className="profile-meta-item">
                  📊 CGPA: {Number.isFinite(cgpaNum) ? `${cgpaNum}` : '—'}
                </div>
                {resumeViewUrl ? (
                  <a
                    href={resumeViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-meta-item profile-resume-link"
                  >
                    📄 {resumeLabel}
                  </a>
                ) : null}
                {displayEmails
                  .filter((x) => x.value)
                  .map((x, i) => (
                    <div key={i} className="profile-meta-item">
                      📧 {x.label}: {x.value}
                    </div>
                  ))}
                <div className="profile-meta-item">
                  ✉️ Notifications:{' '}
                  {(profile.communicationEmail && String(profile.communicationEmail).trim()) || email || '—'}
                </div>
                {displayPhones
                  .filter((x) => x.value)
                  .slice(0, 2)
                  .map((x, i) => (
                    <div key={i} className="profile-meta-item">
                      📱 {x.label}: {x.value}
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
              <div className="drive-info-item" style={{ margin: 0 }}>
                <div className="drive-info-label">Degree / program</div>
                <div className="drive-info-value">{degreeLabel}</div>
              </div>
              <div className="drive-info-item" style={{ margin: 0 }}>
                <div className="drive-info-label">Batch</div>
                <div className="drive-info-value">{batchLabel}</div>
              </div>
              <div className="drive-info-item" style={{ margin: 0 }}>
                <div className="drive-info-label">Roll number</div>
                <div className="drive-info-value">{profile.rollNumber || '—'}</div>
              </div>
              <div className="drive-info-item" style={{ margin: 0 }}>
                <div className="drive-info-label">CGPA</div>
                <div className="drive-info-value">
                  {Number.isFinite(cgpaNum) ? `${cgpaNum} / 10` : '—'}
                </div>
              </div>
              <div>
                <div className="drive-info-label" style={{ marginBottom: '0.35rem' }}>
                  Communication email (notifications)
                </div>
                <ValidatedEmailInput
                  value={profile.communicationEmail || ''}
                  onChange={(value) => persist({ ...profile, communicationEmail: value })}
                  errorMessage="Communication email must be a valid email address (e.g. name@example.com)."
                />
              </div>
              <div>
                <div className="drive-info-label" style={{ marginBottom: '0.35rem' }}>
                  Email addresses
                </div>
                {displayEmails.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="form-input"
                      style={{ maxWidth: '120px' }}
                      placeholder="Label"
                      value={row.label}
                      onChange={(e) => updateEmailRow(i, { label: e.target.value })}
                    />
                    <ValidatedEmailInput
                      style={{ flex: '1 1 180px', minWidth: 0 }}
                      wrapperStyle={{ flex: '1 1 180px', minWidth: 0 }}
                      value={row.value}
                      onChange={(value) => updateEmailRow(i, { value })}
                    />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEmailRow(i)} aria-label="Remove email">
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addEmailRow}>
                  + Add email
                </button>
              </div>
              <div>
                <div className="drive-info-label" style={{ marginBottom: '0.35rem' }}>
                  Phone numbers
                </div>
                {displayPhones.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="form-input"
                      style={{ maxWidth: '120px' }}
                      placeholder="Label"
                      value={row.label}
                      onChange={(e) => updatePhone(i, { label: e.target.value })}
                    />
                    <input
                      className="form-input"
                      style={{ flex: '1 1 180px', minWidth: 0 }}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+91 …"
                      value={row.value}
                      onChange={(e) => updatePhone(i, { value: sanitizePhoneInput(e.target.value) })}
                    />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhone(i)} aria-label="Remove phone">
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPhone}>
                  + Add number
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-default)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={profileSaving}
                  onClick={() => {
                    void loadProfileFromApi({ silent: true });
                    setEditingTab(null);
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={profileSaving} onClick={() => void handleSave()}>
                  {profileSaving ? 'Saving…' : 'Save summary'}
                </button>
              </div>
              <p className="text-xs text-tertiary" style={{ margin: 0 }}>
                Full address and additional labels are under the Contact tab.
              </p>
            </div>
          )}
        </div>
      </div>

      <StudentResumeUploadCard
        resumeViewUrl={resumeViewUrl}
        resumeLabel={resumeLabel}
        cvUploading={cvUploading}
        onCvUpload={onCvUpload}
        useCvApi={useCvApi}
      />

      {!isAlumni ? (
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Upcoming placement dates</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/student/calendar" className="btn btn-secondary btn-sm">
              Full calendar
            </Link>
            <Link href="/dashboard/student/interviews" className="btn btn-ghost btn-sm">
              Interviews
            </Link>
          </div>
        </div>
        {placementCalLoading ? (
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            Loading campus calendar…
          </p>
        ) : upcomingPlacementDates.length === 0 ? (
          <p className="text-sm text-secondary" style={{ margin: 0 }}>
            No upcoming drives on your campus calendar yet.{' '}
            <Link href="/dashboard/student/drives">Browse drives</Link> to find companies and apply.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem' }}>
            {upcomingPlacementDates.map((ev) => (
              <li key={ev.id} style={{ fontSize: '0.9rem' }}>
                <strong>{formatDate(ev.ymd)}</strong> — {ev.title}
              </li>
            ))}
          </ul>
        )}
      </div>
      ) : null}

      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div className="horizontal-scroll" style={{ display: 'flex', gap: '0.35rem', paddingBottom: '0.1rem' }} role="tablist" aria-label="Profile sections">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={activeTab === tab.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => {
                if (editingTab) {
                  void loadProfileFromApi({ silent: true });
                  setEditingTab(null);
                }
                setActiveTab(tab.key);
              }}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {editingHeader ? 'Profile summary' : PROFILE_TABS.find((tab) => tab.key === activeTab)?.label}
          </h3>
          <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0' }}>
            {editingHeader
              ? 'These details appear in the card at the top of your profile.'
              : 'Edit this section independently from the rest of your profile.'}
          </p>
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={profileSaving}
              onClick={() => {
                void loadProfileFromApi({ silent: true });
                setEditingTab(null);
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={profileSaving} onClick={() => void handleSave()}>
              {profileSaving ? 'Saving…' : 'Save section'}
            </button>
          </div>
        ) : !editingHeader ? (
          <button type="button" className="profile-edit-section-btn" onClick={() => setEditingTab(activeTab)}>
            <Pencil size={16} aria-hidden />
            Edit section
          </button>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {activeTab === 'academics' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎓 Academic Information</h3>
          </div>
          <div className="drive-info-grid">
            <div className="drive-info-item">
              <div className="drive-info-label">Degree / program</div>
              <div className="drive-info-value">{degreeLabel}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Department</div>
              <div className="drive-info-value">{profile.department || '—'}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Branch / specialisation</div>
              <div className="drive-info-value">{profile.branch || '—'}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Batch</div>
              <div className="drive-info-value">{batchLabel}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Roll number</div>
              <div className="drive-info-value">{profile.rollNumber || '—'}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">CGPA</div>
              <div
                className="drive-info-value"
                style={{
                  color: Number.isFinite(cgpaNum) && cgpaNum >= 8 ? 'var(--success-600)' : undefined,
                }}
              >
                {Number.isFinite(cgpaNum) ? `${cgpaNum} / 10` : '—'}
              </div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">10th %</div>
              {editing ? (
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.STUDENT_PERCENT}
                  context={{ label: 'Class X %' }}
                  step="0.01"
                  value={profile.tenthPercentage === '' ? '' : profile.tenthPercentage}
                  onChange={(v) => persist({ ...profile, tenthPercentage: v })}
                />
              ) : (
                <div className="drive-info-value">
                  {profile.tenthPercentage === '' || profile.tenthPercentage == null ? '—' : `${profile.tenthPercentage}%`}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">12th %</div>
              {editing ? (
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.STUDENT_PERCENT}
                  context={{ label: 'Class XII %' }}
                  step="0.01"
                  value={profile.twelfthPercentage === '' ? '' : profile.twelfthPercentage}
                  onChange={(v) => persist({ ...profile, twelfthPercentage: v })}
                />
              ) : (
                <div className="drive-info-value">
                  {profile.twelfthPercentage === '' || profile.twelfthPercentage == null ? '—' : `${profile.twelfthPercentage}%`}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Diploma %</div>
              {editing ? (
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.STUDENT_PERCENT}
                  context={{ label: 'Diploma %' }}
                  step="0.01"
                  value={profile.diplomaPercentage === '' ? '' : profile.diplomaPercentage}
                  onChange={(v) => persist({ ...profile, diplomaPercentage: v })}
                />
              ) : (
                <div className="drive-info-value">
                  {profile.diplomaPercentage === '' || profile.diplomaPercentage == null ? '—' : `${profile.diplomaPercentage}%`}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Graduation year</div>
              <div className="drive-info-value">
                {profile.graduationYear === '' || profile.graduationYear == null ? '—' : profile.graduationYear}
              </div>
            </div>
            {!isAlumni ? (
              <>
                <div className="drive-info-item">
                  <div className="drive-info-label">Current semester</div>
                  <div className="drive-info-value">{profile.semester || currentSemester}</div>
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Active Backlogs</div>
                  {editing ? (
                    <ValidatedNumberInput
                      fieldId={FIELD_IDS.STUDENT_BACKLOGS_ACTIVE}
                      value={profile.backlogsActive ?? 0}
                      context={{ backlogsTotal: profile.backlogsHistory ?? 0 }}
                      onChange={(v) => persist({ ...profile, backlogsActive: v === '' ? 0 : v })}
                    />
                  ) : (
                    <div className="drive-info-value">{profile.backlogsActive ?? 0}</div>
                  )}
                </div>
                <div className="drive-info-item">
                  <div className="drive-info-label">Total Backlogs</div>
                  {editing ? (
                    <ValidatedNumberInput
                      fieldId={FIELD_IDS.STUDENT_BACKLOGS_TOTAL}
                      value={profile.backlogsHistory ?? 0}
                      context={{ backlogsActive: profile.backlogsActive ?? 0 }}
                      onChange={(v) => persist({ ...profile, backlogsHistory: v === '' ? 0 : v })}
                    />
                  ) : (
                    <div className="drive-info-value">{profile.backlogsHistory ?? 0}</div>
                  )}
                </div>
              </>
            ) : null}
            <div className="drive-info-item">
              <div className="drive-info-label">Gender</div>
              {editing ? (
                <select className="form-select" value={profile.gender || ''} onChange={(e) => persist({ ...profile, gender: e.target.value })}>
                  <option value="">—</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              ) : (
                <div className="drive-info-value">{profile.gender || '—'}</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.875rem' }}>
            {PROFILE_EDUCATION_DETAIL_SECTIONS.map(([key, label, boardLabel, percentKey]) => {
              const row = (profile.educationDetails || {})[key] || {};
              const percentLabel = formatEducationPercent(percentKey ? profile[percentKey] : '');
              const hasNarrative = Boolean(row.institution || row.board || row.year || row.notes);
              const hasDetails = hasNarrative || Boolean(percentLabel);
              return (
                <div key={key} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.875rem', background: 'var(--bg-secondary)' }}>
                  <div className="drive-info-label" style={{ marginBottom: '0.6rem' }}>{label} Details</div>
                  {editing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                      <input
                        className="form-input"
                        placeholder={key === 'graduation' ? 'College / university' : 'School / institution'}
                        value={row.institution || ''}
                        onChange={(e) => updateEducationDetail(key, { institution: e.target.value })}
                      />
                      <ValidatedTextInput
                        fieldId={FIELD_IDS.EDUCATION_BOARD}
                        context={{ label: boardLabel }}
                        placeholder={key === 'graduation' ? 'Degree / university' : 'Board / university'}
                        value={row.board || ''}
                        onChange={(v) => updateEducationDetail(key, { board: v })}
                      />
                      <input className="form-input" type="number" placeholder="Passing year" value={row.year || ''} onChange={(e) => updateEducationDetail(key, { year: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} />
                      <textarea className="form-textarea" rows={2} style={{ gridColumn: '1 / -1' }} placeholder={key === 'graduation' ? 'Branch, specialisation, achievements, or CGPA notes' : 'Notes, stream, achievements, or subjects'} value={row.notes || ''} onChange={(e) => updateEducationDetail(key, { notes: e.target.value })} />
                    </div>
                  ) : hasDetails ? (
                    <div className="text-sm" style={{ lineHeight: 1.6 }}>
                      {[percentLabel, row.institution, row.board, row.year].filter(Boolean).join(' · ') || '—'}
                      {row.notes && <div className="text-secondary" style={{ marginTop: '0.25rem' }}>{row.notes}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-tertiary">No details added yet.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {activeTab === 'contact' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📇 Contact</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Communication Email
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {editing ? (
                  <ValidatedEmailInput
                    style={{ flex: 1 }}
                    wrapperStyle={{ flex: 1 }}
                    value={profile.communicationEmail || ''}
                    onChange={(value) => persist({ ...profile, communicationEmail: value })}
                    errorMessage="Communication email must be a valid email address (e.g. name@example.com)."
                  />
                ) : (
                  <div className="text-sm">
                    {profile.communicationEmail || '—'}
                    <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                      All platform notifications and alerts will be sent to this address.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Other Email addresses
              </div>
              {displayEmails.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input
                        className="form-input"
                        style={{ maxWidth: '120px' }}
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => updateEmailRow(i, { label: e.target.value })}
                      />
                      <ValidatedEmailInput
                        style={{ flex: 1 }}
                        wrapperStyle={{ flex: 1 }}
                        value={row.value}
                        onChange={(value) => updateEmailRow(i, { value })}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEmailRow(i)} aria-label="Remove email">
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-sm">
                      <strong>{row.label}:</strong> {row.value || '—'}
                    </div>
                  )}
                </div>
              ))}
              {editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addEmailRow}>
                  + Add email
                </button>
              )}
            </div>
            <div>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Mobile numbers
              </div>
              {displayPhones.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input
                        className="form-input"
                        style={{ maxWidth: '120px' }}
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => updatePhone(i, { label: e.target.value })}
                      />
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+91 …"
                        value={row.value}
                        onChange={(e) => updatePhone(i, { value: sanitizePhoneInput(e.target.value) })}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhone(i)} aria-label="Remove phone">
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-sm">
                      <strong>{row.label}:</strong> {row.value || '—'}
                    </div>
                  )}
                </div>
              ))}
              {editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPhone}>
                  + Add number
                </button>
              )}
            </div>
            <div>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Address
              </div>
              {editing ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <input
                    className="form-input"
                    placeholder="Address line"
                    value={profile.address?.line1 || ''}
                    onChange={(e) =>
                      persist({
                        ...profile,
                        address: { ...(profile.address || {}), line1: e.target.value },
                      })
                    }
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      className="form-input"
                      placeholder="City"
                      value={profile.address?.city || ''}
                      onChange={(e) =>
                        persist({
                          ...profile,
                          address: { ...(profile.address || {}), city: e.target.value },
                        })
                      }
                    />
                    <input
                      className="form-input"
                      placeholder="State"
                      value={profile.address?.state || ''}
                      onChange={(e) =>
                        persist({
                          ...profile,
                          address: { ...(profile.address || {}), state: e.target.value },
                        })
                      }
                    />
                  </div>
                  <input
                    className="form-input"
                    placeholder="Pincode"
                    value={profile.address?.pincode || ''}
                    onChange={(e) =>
                      persist({
                        ...profile,
                        address: { ...(profile.address || {}), pincode: e.target.value },
                      })
                    }
                  />
                </div>
              ) : (
                <div className="text-sm">
                  {(profile.address?.line1 || profile.address?.city || profile.address?.state || profile.address?.pincode)
                    ? [profile.address?.line1, profile.address?.city, profile.address?.state, profile.address?.pincode]
                        .filter(Boolean)
                        .join(', ')
                    : '—'}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'skills' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="card-title">💡 Skills</h3>
            {editing ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={suggestingSkills}
                onClick={async () => {
                  setSuggestingSkills(true);
                  setSuggestSkillsFeedback(null);
                  try {
                    const res = await fetch('/api/student/profile/suggest-skills', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({}),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      const msg =
                        json?.failure?.message || json?.error || json?.message || 'Could not suggest skills';
                      setSuggestSkillsFeedback({ type: 'error', message: msg, meta: json?.meta || null });
                      addToast(msg, 'error');
                      return;
                    }

                    if (json.failure || json.ok === false) {
                      const msg = json.failure?.message || 'No skills could be suggested from your CV.';
                      setSuggestSkillsFeedback({
                        type: 'error',
                        message: msg,
                        warnings: json.warnings,
                        meta: json.meta || null,
                      });
                      addToast(msg, 'warning');
                      return;
                    }

                    const next = Array.isArray(json.suggestions) ? json.suggestions : [];
                    if (!next.length) {
                      const msg = json.message || 'No new skills found from your CV.';
                      setSuggestSkillsFeedback({ type: 'error', message: msg, meta: json.meta || null });
                      addToast(msg, 'info');
                      return;
                    }

                    setProfile((p) => {
                      const have = new Set((p.skills || []).map((s) => String(s).toLowerCase()));
                      const merged = [...(p.skills || [])];
                      for (const s of next) {
                        if (!have.has(String(s).toLowerCase())) merged.push(s);
                      }
                      return { ...p, skills: merged };
                    });

                    const warnText = Array.isArray(json.warnings) ? json.warnings.filter(Boolean).join(' ') : '';
                    setSuggestSkillsFeedback({
                      type: warnText ? 'warning' : 'success',
                      message: json.message || `Added ${next.length} skill tag(s) from your CV.`,
                      warnings: json.warnings,
                      meta: json.meta || null,
                    });
                    addToast(json.message || `Added ${next.length} skill tag(s) from your CV.`, warnText ? 'info' : 'success');
                  } catch (err) {
                    const msg = err.message || 'Suggest skills failed';
                    setSuggestSkillsFeedback({ type: 'error', message: msg });
                    addToast(msg, 'error');
                  } finally {
                    setSuggestingSkills(false);
                  }
                }}
              >
                {suggestingSkills ? 'Analyzing…' : 'Suggest from CV'}
              </button>
            ) : null}
          </div>
          {editing ? (
            <>
              <TagPicker
                tags={skillsList}
                onChange={(skills) => setProfile((p) => ({ ...p, skills }))}
                placeholder="Type a skill and press Enter…"
              />
              <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-tertiary)' }}>
                Press Enter or comma to add a tag. Use &quot;Suggest from CV&quot; after uploading a résumé to pull likely skills.
              </p>
              {suggestSkillsFeedback ? (
                <div
                  role="alert"
                  className="text-sm"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid',
                    borderColor:
                      suggestSkillsFeedback.type === 'success'
                        ? 'var(--success-300, #86efac)'
                        : suggestSkillsFeedback.type === 'warning'
                          ? 'var(--warning-300, #fcd34d)'
                          : 'var(--danger-300, #fca5a5)',
                    background:
                      suggestSkillsFeedback.type === 'success'
                        ? 'var(--success-50, #f0fdf4)'
                        : suggestSkillsFeedback.type === 'warning'
                          ? 'var(--warning-50, #fffbeb)'
                          : 'var(--danger-50, #fef2f2)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                    {suggestSkillsFeedback.type === 'success'
                      ? 'Skills suggested'
                      : suggestSkillsFeedback.type === 'warning'
                        ? 'Skills suggested with warnings'
                        : 'Could not suggest skills'}
                  </strong>
                  <span>{suggestSkillsFeedback.message}</span>
                  {Array.isArray(suggestSkillsFeedback.warnings) && suggestSkillsFeedback.warnings.length > 0 ? (
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                      {suggestSkillsFeedback.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                  {suggestSkillsFeedback.meta ? (
                    <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0' }}>
                      {suggestSkillsFeedback.meta.textSource
                        ? `Text source: ${suggestSkillsFeedback.meta.textSource}. `
                        : null}
                      {typeof suggestSkillsFeedback.meta.textLength === 'number'
                        ? `${suggestSkillsFeedback.meta.textLength} characters read. `
                        : null}
                      {typeof suggestSkillsFeedback.meta.totalKeysAvailable === 'number'
                        ? `${suggestSkillsFeedback.meta.nvidiaKeyCount ?? 0} NVIDIA + ${Math.max(0, suggestSkillsFeedback.meta.totalKeysAvailable - (suggestSkillsFeedback.meta.nvidiaKeyCount ?? 0))} fallback key(s) available. `
                        : null}
                      {typeof suggestSkillsFeedback.meta.keysTried === 'number'
                        ? `${suggestSkillsFeedback.meta.keysTried} key(s) used for this request. `
                        : null}
                      {suggestSkillsFeedback.meta.aiConfigured
                        ? suggestSkillsFeedback.meta.aiUsed
                          ? `AI extraction was used (${suggestSkillsFeedback.meta.aiLabel || suggestSkillsFeedback.meta.aiProvider || 'LLM'}). `
                          : `AI is configured (${suggestSkillsFeedback.meta.aiLabel || suggestSkillsFeedback.meta.aiProvider || 'LLM'}) but keyword matching was used. `
                        : 'Smart AI suggestions are not available on this site yet. '}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skillsList.length ? (
                skillsList.map((skill, i) => (
                  <span
                    key={`${skill}-${i}`}
                    className="badge badge-indigo"
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  No skills yet. Edit profile to add some.
                </span>
              )}
            </div>
          )}
        </div>
        )}

        {activeTab === 'projects' && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">🧩 Projects</h3>
            {editing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={addProject}>
                + Add project
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {projectsList.length === 0 && <p className="text-sm text-secondary">No projects added yet.</p>}
            {projectsList.map((project, index) => (
              <div key={index} className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                {editing ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <input className="form-input" placeholder="Project title" value={project.title || ''} onChange={(e) => updateProject(index, { title: e.target.value })} />
                    <textarea className="form-textarea" rows={3} placeholder="What did you build? What problem did it solve?" value={project.description || ''} onChange={(e) => updateProject(index, { description: e.target.value })} />
                    <input
                      className="form-input"
                      placeholder="Tech stack, comma-separated"
                      value={asList(project.techStack).join(', ')}
                      onChange={(e) => updateProject(index, { techStack: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <input className="form-input" type="url" placeholder="Project URL" value={project.projectUrl || ''} onChange={(e) => updateProject(index, { projectUrl: e.target.value })} />
                      <input className="form-input" type="url" placeholder="GitHub URL" value={project.githubUrl || ''} onChange={(e) => updateProject(index, { githubUrl: e.target.value })} />
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_START}
                        value={project.startDate || ''}
                        onChange={(v) => updateProject(index, { startDate: v })}
                        aria-label="Project start date"
                      />
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_END}
                        value={project.endDate || ''}
                        onChange={(v) => updateProject(index, { endDate: v })}
                        aria-label="Project end date"
                      />
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeProject(index)} style={{ justifySelf: 'start' }}>
                      Remove project
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{project.title || 'Untitled project'}</div>
                    {(project.startDate || project.endDate) && (
                      <div className="text-xs text-tertiary" style={{ marginTop: '0.2rem' }}>
                        {[project.startDate, project.endDate || 'Present'].filter(Boolean).join(' - ')}
                      </div>
                    )}
                    {project.description && <p className="text-sm text-secondary" style={{ lineHeight: 1.6, margin: '0.5rem 0' }}>{project.description}</p>}
                    {asList(project.techStack).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {project.techStack.map((tech) => <span key={tech} className="badge badge-indigo">{tech}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {activeTab === 'internships' && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">💼 Internships</h3>
            {editing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => addActivity('internships')}>
                + Add internship
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {internshipsList.length === 0 && <p className="text-sm text-secondary">No internships added yet.</p>}
            {internshipsList.map((row, index) => (
              <div key={index} className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem' }}>
                    <input className="form-input" placeholder="Role / title" value={row.title || ''} onChange={(e) => updateActivity('internships', index, { title: e.target.value })} />
                    <input className="form-input" placeholder="Company / organization" value={row.organization || ''} onChange={(e) => updateActivity('internships', index, { organization: e.target.value })} />
                    <input className="form-input" placeholder="Duration, e.g. May-Jul 2025" value={row.period || ''} onChange={(e) => updateActivity('internships', index, { period: e.target.value })} />
                    <textarea className="form-textarea" rows={4} style={{ gridColumn: '1 / -1' }} placeholder="Describe your work, responsibilities, tools used, and outcomes." value={row.description || ''} onChange={(e) => updateActivity('internships', index, { description: e.target.value })} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeActivity('internships', index)} style={{ justifySelf: 'start' }}>
                      Remove internship
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.title || 'Untitled internship'}</div>
                    <div className="text-xs text-tertiary">{[row.organization, row.period].filter(Boolean).join(' · ')}</div>
                    {row.description && <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', lineHeight: 1.6 }}>{row.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {activeTab === 'otherWork' && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">🛠️ Other Work</h3>
            {editing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => addActivity('otherWork')}>
                + Add work
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {otherWorkList.length === 0 && <p className="text-sm text-secondary">No part-time, freelance, research, or other work added yet.</p>}
            {otherWorkList.map((row, index) => (
              <div key={index} className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem' }}>
                    <input className="form-input" placeholder="Role / work title" value={row.title || ''} onChange={(e) => updateActivity('otherWork', index, { title: e.target.value })} />
                    <input className="form-input" placeholder="Organization / client" value={row.organization || ''} onChange={(e) => updateActivity('otherWork', index, { organization: e.target.value })} />
                    <input className="form-input" placeholder="Duration / year" value={row.period || ''} onChange={(e) => updateActivity('otherWork', index, { period: e.target.value })} />
                    <textarea className="form-textarea" rows={4} style={{ gridColumn: '1 / -1' }} placeholder="Describe the work, scope, contribution, and impact." value={row.description || ''} onChange={(e) => updateActivity('otherWork', index, { description: e.target.value })} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeActivity('otherWork', index)} style={{ justifySelf: 'start' }}>
                      Remove work
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.title || 'Untitled work'}</div>
                    <div className="text-xs text-tertiary">{[row.organization, row.period].filter(Boolean).join(' · ')}</div>
                    {row.description && <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', lineHeight: 1.6 }}>{row.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {activeTab === 'activities' && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">🏅 Activities</h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {activitySections.map((section) => {
              const rows = asList(profile[section.key]);
              return (
                <div key={section.key} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{section.title}</div>
                    {editing && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => addActivity(section.key)}>
                        + Add
                      </button>
                    )}
                  </div>
                  {rows.length === 0 && <p className="text-sm text-secondary" style={{ margin: 0 }}>{section.empty}</p>}
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {rows.map((row, index) => (
                      <div key={index} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border-default)', paddingTop: index === 0 ? 0 : '0.75rem' }}>
                        {editing ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                            <input className="form-input" placeholder="Title" value={row.title || ''} onChange={(e) => updateActivity(section.key, index, { title: e.target.value })} />
                            <input className="form-input" placeholder="Organization / issuer" value={row.organization || ''} onChange={(e) => updateActivity(section.key, index, { organization: e.target.value })} />
                            <input className="form-input" placeholder="Period / year" value={row.period || ''} onChange={(e) => updateActivity(section.key, index, { period: e.target.value })} />
                            <textarea className="form-textarea" rows={2} style={{ gridColumn: '1 / -1' }} placeholder="Details, responsibility, outcome, or impact" value={row.description || ''} onChange={(e) => updateActivity(section.key, index, { description: e.target.value })} />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeActivity(section.key, index)} style={{ justifySelf: 'start' }}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 700 }}>{row.title || 'Untitled'}</div>
                            <div className="text-xs text-tertiary">{[row.organization, row.period].filter(Boolean).join(' · ')}</div>
                            {row.description && <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>{row.description}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {activeTab === 'preferences' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{isAlumni ? '🎯 Job preferences' : '🎯 Placement preferences'}</h3>
          </div>
          <div className="drive-info-grid">
            <div className="drive-info-item" style={{ gridColumn: '1 / -1' }}>
              <div className="drive-info-label">Expected salary (₹ / year)</div>
              {editing ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <ValidatedNumberInput
                    fieldId={FIELD_IDS.STUDENT_SALARY_MIN}
                    placeholder="Min"
                    step={10000}
                    value={profile.expectedSalaryMin === '' || profile.expectedSalaryMin == null ? '' : profile.expectedSalaryMin}
                    onChange={(v) => persist({ ...profile, expectedSalaryMin: v })}
                  />
                  <ValidatedNumberInput
                    fieldId={FIELD_IDS.STUDENT_SALARY_MAX}
                    context={{ salaryMin: profile.expectedSalaryMin }}
                    placeholder="Max"
                    step={10000}
                    value={profile.expectedSalaryMax === '' || profile.expectedSalaryMax == null ? '' : profile.expectedSalaryMax}
                    onChange={(v) => persist({ ...profile, expectedSalaryMax: v })}
                  />
                </div>
              ) : (
                <div className="drive-info-value">
                  {hasSalary ? (
                    <>
                      ₹{(Number(profile.expectedSalaryMin) / 100000).toFixed(1)}L – ₹
                      {(Number(profile.expectedSalaryMax) / 100000).toFixed(1)}L PA
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              )}
            </div>
            <div className="drive-info-item" style={{ gridColumn: '1 / -1' }}>
              <div className="drive-info-label">Preferred locations (comma-separated)</div>
              {editing ? (
                <input
                  className="form-input"
                  value={profile.preferredLocations}
                  onChange={(e) => persist({ ...profile, preferredLocations: e.target.value })}
                  placeholder="Bangalore, Hyderabad, Remote…"
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {locList.map((loc, i) => (
                    <span key={i} className="badge badge-blue">
                      {loc}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Willing to relocate</div>
              {editing ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.willingToRelocate}
                    onChange={(e) => persist({ ...profile, willingToRelocate: e.target.checked })}
                  />
                  Yes
                </label>
              ) : (
                <div className="drive-info-value">{profile.willingToRelocate ? '✅ Yes' : '❌ No'}</div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'links' && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">🔗 Profiles, projects & websites</h3>
            {editing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={addProfileLink}>
                + Add link
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {linksList.length === 0 && (
              <p className="text-sm text-secondary">No links yet. Add LinkedIn, GitHub, a general site, or a project link.</p>
            )}
            {linksList.map((link) => (
              <div key={link.id} className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                {editing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label
                          className="form-label text-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-tertiary)' }}
                        >
                          <ProfileLinkKindIcon kind={link.kind} />
                          Type
                        </label>
                        <select className="form-select" value={link.kind} onChange={(e) => updateLink(link.id, { kind: e.target.value })}>
                          {LINK_KINDS.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-xs">Title / label</label>
                        <input className="form-input" value={link.title} onChange={(e) => updateLink(link.id, { title: e.target.value })} placeholder="e.g. My GitHub" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label text-xs">URL</label>
                        <input className="form-input" value={link.url} onChange={(e) => updateLink(link.id, { url: e.target.value })} placeholder="https://…" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label text-xs">Description</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={link.description}
                          onChange={(e) => updateLink(link.id, { description: e.target.value })}
                          placeholder="What’s on this profile or in this repo? Key projects, stack, etc."
                        />
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLink(link.id)}>
                      Remove link
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', minWidth: 0 }}>
                        <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '2px' }}>
                          <ProfileLinkKindIcon kind={link.kind} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                        <div className="text-xs font-bold text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {LINK_KINDS.find((k) => k.value === link.kind)?.label || link.kind}
                        </div>
                        <a href={link.url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {link.title || link.url || 'Untitled'}
                        </a>
                        {link.description && <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>{link.description}</p>}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {activeTab === 'about' && (
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">📝 About me</h3>
        </div>
        {editing ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label
                className={`btn btn-secondary btn-sm${avatarUploading ? ' disabled' : ''}`}
                style={{ cursor: avatarUploading ? 'wait' : 'pointer', margin: 0, opacity: avatarUploading ? 0.7 : 1 }}
              >
                {avatarUploading ? '⏳ Uploading photo…' : '📷 Update photo'}
                <input
                  type="file"
                  accept={studentAvatarAcceptAttr()}
                  hidden
                  disabled={avatarUploading}
                  onChange={onAvatarChange}
                />
              </label>
              <Link href="/dashboard/student/my-cvs" className="btn btn-secondary btn-sm">
                Manage CVs
              </Link>
            </div>
            <textarea className="form-textarea" value={profile.bio} onChange={(e) => persist({ ...profile, bio: e.target.value })} rows={4} />
          </div>
        ) : (
          <p className="text-sm" style={{ lineHeight: 1.7 }}>
            {profile.bio || '—'}
          </p>
        )}
      </div>
      )}

      {avatarPreviewOpen && (avatarPreviewBlobUrl || avatarLightboxSrc) ? (
        <ProfilePhotoLightbox
          src={avatarPreviewBlobUrl || avatarLightboxSrc}
          alt={session?.user?.name ? `${session.user.name} profile photo` : 'Profile photo'}
          onClose={() => setAvatarPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
