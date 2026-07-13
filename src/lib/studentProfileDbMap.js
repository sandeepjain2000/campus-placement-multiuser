/**
 * Maps between student profile UI state (student profile page) and student_profiles + student_skills + users.phone.
 */
import { SEED_DEMO_STUDENT_USER_IDS } from '@/lib/seedDemoStudentIds';
import { resolveEffectiveStudentBatchYear, resolveStudentBatch } from '@/lib/studentBatch';

function capitalizeGender(g) {
  if (!g || typeof g !== 'string') return '';
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

function extractColumnUrls(profileLinks) {
  let linkedin_url = '';
  let github_url = '';
  let portfolio_url = '';
  for (const l of profileLinks || []) {
    const u = String(l?.url || '').trim();
    if (!u) continue;
    const kind = String(l?.kind || '').toLowerCase();
    if (kind === 'linkedin' && !linkedin_url) linkedin_url = u;
    else if (kind === 'github' && !github_url) github_url = u;
    else if (!portfolio_url && ['website', 'project', 'other'].includes(kind)) portfolio_url = u;
  }
  return { linkedin_url, github_url, portfolio_url };
}

function linksFromColumns(row) {
  const out = [];
  if (row.linkedin_url) {
    out.push({
      id: 'col-linkedin',
      kind: 'linkedin',
      url: row.linkedin_url,
      title: 'LinkedIn',
      description: '',
    });
  }
  if (row.github_url) {
    out.push({
      id: 'col-github',
      kind: 'github',
      url: row.github_url,
      title: 'GitHub',
      description: '',
    });
  }
  if (row.portfolio_url) {
    out.push({
      id: 'col-portfolio',
      kind: 'website',
      url: row.portfolio_url,
      title: 'Portfolio / website',
      description: '',
    });
  }
  return out;
}

function demoAddressFallback(sp) {
  const tid = String(sp?.tenant_id || '');
  if (tid === 'a1000000-0000-0000-0000-000000000001') {
    return {
      line1: 'Velachery Main Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600042',
    };
  }
  if (tid === 'a1000000-0000-0000-0000-000000000002') {
    return {
      line1: 'BHEL Nagar',
      city: 'Trichy',
      state: 'Tamil Nadu',
      pincode: '620014',
    };
  }
  if (tid === 'a1000000-0000-0000-0000-000000000003') {
    return {
      line1: 'Vidya Vihar Road',
      city: 'Pilani',
      state: 'Rajasthan',
      pincode: '333031',
    };
  }
  return {
    line1: 'Campus Area',
    city: '',
    state: '',
    pincode: '',
  };
}

function resumeFileNameFromUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const pathname = new URL(raw).pathname;
    const last = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    return last.replace(/^[0-9a-f-]{36}-/i, '');
  } catch {
    return '';
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEducationDetails(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalizeRow = (row) => {
    const raw = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
    return {
      institution: String(raw.institution || '').trim(),
      board: String(raw.board || '').trim(),
      year: raw.year === '' || raw.year == null ? '' : Number(raw.year),
      notes: String(raw.notes || '').trim(),
    };
  };
  return {
    graduation: normalizeRow(source.graduation),
    diploma: normalizeRow(source.diploma),
    twelfth: normalizeRow(source.twelfth),
    tenth: normalizeRow(source.tenth),
  };
}

function normalizeProjects(value) {
  const dateOnly = (raw) => {
    if (!raw) return null;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
    const text = String(raw || '').trim();
    return text ? text.slice(0, 10) : null;
  };
  return normalizeArray(value)
    .map((project) => ({
      title: String(project?.title || '').trim(),
      description: String(project?.description || '').trim(),
      techStack: normalizeArray(project?.techStack || project?.tech_stack)
        .flatMap((item) => String(item || '').split(','))
        .map((item) => item.trim())
        .filter(Boolean),
      projectUrl: String(project?.projectUrl || project?.project_url || '').trim(),
      githubUrl: String(project?.githubUrl || project?.github_url || '').trim(),
      startDate: dateOnly(project?.startDate || project?.start_date),
      endDate: dateOnly(project?.endDate || project?.end_date),
    }))
    .filter((project) => project.title || project.description || project.techStack.length || project.projectUrl || project.githubUrl)
    .slice(0, 20);
}

function normalizeActivityRows(value) {
  return normalizeArray(value)
    .map((item) => ({
      title: String(item?.title || '').trim(),
      organization: String(item?.organization || item?.issuer || '').trim(),
      period: String(item?.period || item?.year || '').trim(),
      description: String(item?.description || '').trim(),
    }))
    .filter((item) => item.title || item.organization || item.period || item.description)
    .slice(0, 30);
}

/**
 * @param {{ sp: object, skills: { skill_name: string }[], projects?: object[], accountEmail: string, userPhone: string | null, avatarUrl: string | null }}
 */
export function profileFromDb({ sp, skills, projects, accountEmail, userPhone, avatarUrl, communicationEmail }) {
  const aux =
    sp.aux_profile && typeof sp.aux_profile === 'object' && !Array.isArray(sp.aux_profile)
      ? sp.aux_profile
      : {};

  let phones = Array.isArray(aux.phones) ? aux.phones.map((p) => ({ ...p })) : [];
  if (!phones.length && userPhone) {
    phones = [{ label: 'Primary', value: userPhone }];
  }
  if (!phones.length) {
    phones = [{ label: 'Primary', value: '' }];
  }

  const secondary = Array.isArray(aux.emails) ? aux.emails.map((e) => ({ ...e })) : [];
  let emails = [{ label: 'College', value: accountEmail || '' }];
  if (secondary.length) {
    emails = emails.concat(secondary);
  } else if (typeof aux.personalEmail === 'string' && aux.personalEmail.trim()) {
    emails.push({ label: 'Personal', value: aux.personalEmail.trim() });
  } else {
    emails.push({ label: 'Personal', value: '' });
  }

  let profileLinks = Array.isArray(aux.profileLinks) ? aux.profileLinks.map((l) => ({ ...l })) : [];
  if (!profileLinks.length) {
    profileLinks = linksFromColumns(sp);
  }

  const locs = sp.preferred_locations;
  const preferredLocations = Array.isArray(locs) ? locs.join(', ') : '';

  const rawExpectedMin = sp.expected_salary_min != null ? Number(sp.expected_salary_min) : null;
  const rawExpectedMax = sp.expected_salary_max != null ? Number(sp.expected_salary_max) : null;
  const isDemoStudent = SEED_DEMO_STUDENT_USER_IDS.has(sp.user_id);
  const fallbackExpectedMin = 600000;
  const fallbackExpectedMax = 1200000;
  const expectedSalaryMin =
    rawExpectedMin != null && Number.isFinite(rawExpectedMin) && rawExpectedMin > 0
      ? rawExpectedMin
      : isDemoStudent
        ? fallbackExpectedMin
        : 0;
  const expectedSalaryMax =
    rawExpectedMax != null && Number.isFinite(rawExpectedMax) && rawExpectedMax > 0
      ? rawExpectedMax
      : isDemoStudent
        ? fallbackExpectedMax
        : 0;

  const rawAddress =
    aux.address && typeof aux.address === 'object' && !Array.isArray(aux.address) ? aux.address : {};
  const fallbackAddress = isDemoStudent ? demoAddressFallback(sp) : { line1: '', city: '', state: '', pincode: '' };
  const address = {
    line1: String(rawAddress.line1 || '').trim() || fallbackAddress.line1,
    city: String(rawAddress.city || '').trim() || fallbackAddress.city,
    state: String(rawAddress.state || '').trim() || fallbackAddress.state,
    pincode: String(rawAddress.pincode || '').trim() || fallbackAddress.pincode,
  };

  const batchResolved = resolveStudentBatch({
    batchYear: sp.batch_year,
    graduationYear: sp.graduation_year,
    joining_academic_year: sp.joining_academic_year,
    batchLabel: aux.batchLabel,
    joiningAcademicYear: aux.joiningAcademicYear,
  });

  return {
    department: sp.department || '',
    branch: sp.branch || '',
    degreePursued: String(aux.degreePursued || aux.degree_pursued || '').trim(),
    rollNumber: sp.roll_number || '',
    batch: batchResolved.batch,
    joiningAcademicYear: batchResolved.joiningAcademicYear || batchResolved.batch,
    batchYear:
      resolveEffectiveStudentBatchYear({
        batchYear: sp.batch_year,
        graduationYear: sp.graduation_year,
        joining_academic_year: sp.joining_academic_year,
        batchLabel: aux.batchLabel,
        joiningAcademicYear: aux.joiningAcademicYear,
      }) ?? '',
    graduationYear: sp.graduation_year != null ? Number(sp.graduation_year) : '',
    semester:
      sp.semester_number != null
        ? String(sp.semester_number)
        : String(aux.semester || '').trim(),
    cgpa: sp.cgpa != null ? Number(sp.cgpa) : '',
    tenthPercentage: sp.tenth_percentage != null ? Number(sp.tenth_percentage) : '',
    twelfthPercentage: sp.twelfth_percentage != null ? Number(sp.twelfth_percentage) : '',
    diplomaPercentage: sp.diploma_percentage != null ? Number(sp.diploma_percentage) : '',
    backlogsActive: sp.backlogs_active != null ? Number(sp.backlogs_active) : 0,
    backlogsHistory: sp.backlogs_history != null ? Number(sp.backlogs_history) : 0,
    educationDetails: normalizeEducationDetails(aux.educationDetails),
    gender: capitalizeGender(sp.gender),
    collegeEmail: accountEmail || '',
    communicationEmail: (communicationEmail && String(communicationEmail).trim()) || accountEmail || '',
    personalEmail: typeof aux.personalEmail === 'string' ? aux.personalEmail : '',
    phones,
    emails,
    address,
    bio: sp.bio || '',
    skills: (skills || []).map((s) => s.skill_name).filter(Boolean),
    expectedSalaryMin,
    expectedSalaryMax,
    preferredLocations: preferredLocations || (isDemoStudent ? 'Bengaluru, Chennai, Hyderabad' : ''),
    willingToRelocate: sp.willing_to_relocate !== false,
    profileLinks,
    avatarUrl: avatarUrl || '',
    avatarDataUrl: '',
    avatarName: '',
    resumeUrl: sp.resume_url || '',
    cvFileName: typeof aux.cvFileName === 'string' && aux.cvFileName.trim()
      ? aux.cvFileName.trim()
      : resumeFileNameFromUrl(sp.resume_url),
    cvDataUrl: '',
    projects: normalizeProjects(projects || []),
    internships: normalizeActivityRows(aux.internships || aux.workExperience),
    otherWork: normalizeActivityRows(aux.otherWork),
    workExperience: normalizeActivityRows(aux.workExperience),
    responsibilities: normalizeActivityRows(aux.responsibilities),
    accomplishments: normalizeActivityRows(aux.accomplishments),
    volunteering: normalizeActivityRows(aux.volunteering),
    extracurriculars: normalizeActivityRows(aux.extracurriculars),
  };
}

function normalizeAuxFromPayload(body) {
  const phones = Array.isArray(body.phones)
    ? body.phones.map((p) => ({
        label: String(p?.label || '').trim() || 'Other',
        value: String(p?.value || '').trim(),
      }))
    : [];

  const rawEmails = Array.isArray(body.emails) ? body.emails : [];
  const emails = rawEmails
    .filter((e) => e && !String(e.label || '').toLowerCase().includes('college'))
    .map((e) => ({
      label: String(e?.label || '').trim() || 'Other',
      value: String(e?.value || '').trim(),
    }));

  const personalRow = rawEmails.find((e) => String(e?.label || '').toLowerCase().includes('personal'));
  const personalEmail = personalRow ? String(personalRow.value || '').trim() : '';

  const profileLinks = Array.isArray(body.profileLinks)
    ? body.profileLinks.map((l) => ({
        id: String(l?.id || '').trim() || `l-${Math.random().toString(36).slice(2)}`,
        kind: String(l?.kind || 'website').toLowerCase(),
        url: String(l?.url || '').trim(),
        title: String(l?.title || '').trim(),
        description: String(l?.description || '').trim(),
      }))
    : [];

  return {
    phones,
    emails,
    profileLinks,
    address: {
      line1: String(body?.address?.line1 || '').trim(),
      city: String(body?.address?.city || '').trim(),
      state: String(body?.address?.state || '').trim(),
      pincode: String(body?.address?.pincode || '').trim(),
    },
    educationDetails: normalizeEducationDetails(body.educationDetails),
    internships: normalizeActivityRows(body.internships || body.workExperience),
    otherWork: normalizeActivityRows(body.otherWork),
    workExperience: normalizeActivityRows(body.workExperience),
    responsibilities: normalizeActivityRows(body.responsibilities),
    accomplishments: normalizeActivityRows(body.accomplishments),
    volunteering: normalizeActivityRows(body.volunteering),
    extracurriculars: normalizeActivityRows(body.extracurriculars),
    personalEmail: personalEmail || null,
  };
}

/**
 * Build DB update fields from client payload (student self-service).
 * @returns {object} fields for UPDATE student_profiles + aux + user phone + skills list
 */
export function payloadToDbParts(body) {
  const aux = normalizeAuxFromPayload(body);
  const { linkedin_url, github_url, portfolio_url } = extractColumnUrls(aux.profileLinks);

  const dept = String(body.department || '').trim();
  const branch = String(body.branch || '').trim();
  const cgpa = body.cgpa === '' || body.cgpa == null ? null : Number(body.cgpa);
  const tenth = body.tenthPercentage === '' || body.tenthPercentage == null ? null : Number(body.tenthPercentage);
  const twelfth = body.twelfthPercentage === '' || body.twelfthPercentage == null ? null : Number(body.twelfthPercentage);
  const diploma = body.diplomaPercentage === '' || body.diplomaPercentage == null ? null : Number(body.diplomaPercentage);
  const activeBacklogs =
    body.backlogsActive === '' || body.backlogsActive == null ? 0 : Math.max(0, parseInt(body.backlogsActive, 10) || 0);
  const historyBacklogs =
    body.backlogsHistory === '' || body.backlogsHistory == null ? 0 : Math.max(0, parseInt(body.backlogsHistory, 10) || 0);
  const gradYear =
    body.graduationYear === '' || body.graduationYear == null ? null : parseInt(body.graduationYear, 10);
  const batchYear =
    body.batchYear === '' || body.batchYear == null ? (gradYear != null ? gradYear - 4 : null) : parseInt(body.batchYear, 10);

  const genderRaw = String(body.gender || '').trim();
  const gender = genderRaw ? genderRaw.toLowerCase() : null;

  const pref = String(body.preferredLocations || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const minSal =
    body.expectedSalaryMin === '' || body.expectedSalaryMin == null ? null : Number(body.expectedSalaryMin);
  const maxSal =
    body.expectedSalaryMax === '' || body.expectedSalaryMax == null ? null : Number(body.expectedSalaryMax);

  const bio = String(body.bio || '').trim() || null;

  const skills = Array.isArray(body.skills)
    ? [...new Set(body.skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 80)
    : [];

  const primaryPhone = aux.phones.find((p) => p.value)?.value || '';
  const commEmail = String(body.communicationEmail || '').trim() || null;

  return {
    department: dept || null,
    branch: branch || null,
    batch_year: batchYear,
    graduation_year: gradYear,
    cgpa,
    tenth_percentage: tenth,
    twelfth_percentage: twelfth,
    diploma_percentage: diploma,
    backlogs_active: activeBacklogs,
    backlogs_history: historyBacklogs,
    gender,
    bio,
    linkedin_url: linkedin_url || null,
    github_url: github_url || null,
    portfolio_url: portfolio_url || null,
    expected_salary_min: minSal,
    expected_salary_max: maxSal,
    preferred_locations: pref.length ? pref : null,
    willing_to_relocate: Boolean(body.willingToRelocate),
    aux_profile: {
      phones: aux.phones,
      emails: aux.emails,
      profileLinks: aux.profileLinks,
      address: aux.address,
      educationDetails: aux.educationDetails,
      internships: aux.internships,
      otherWork: aux.otherWork,
      workExperience: aux.workExperience,
      responsibilities: aux.responsibilities,
      accomplishments: aux.accomplishments,
      volunteering: aux.volunteering,
      extracurriculars: aux.extracurriculars,
      personalEmail: aux.personalEmail,
    },
    projects: normalizeProjects(body.projects),
    skills,
    user_phone: primaryPhone || null,
    user_communication_email: commEmail,
  };
}
