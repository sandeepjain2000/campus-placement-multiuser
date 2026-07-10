/**
 * Maps between student profile UI state (student profile page) and student_profiles + student_skills + users.phone.
 */

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

/**
 * @param {{ sp: object, skills: { skill_name: string }[], accountEmail: string, userPhone: string | null, avatarUrl: string | null }}
 */
export function profileFromDb({ sp, skills, accountEmail, userPhone, avatarUrl }) {
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

  return {
    department: sp.department || '',
    branch: sp.branch || '',
    rollNumber: sp.roll_number || '',
    batchYear: sp.batch_year != null ? Number(sp.batch_year) : '',
    graduationYear: sp.graduation_year != null ? Number(sp.graduation_year) : '',
    cgpa: sp.cgpa != null ? Number(sp.cgpa) : '',
    tenthPercentage: sp.tenth_percentage != null ? Number(sp.tenth_percentage) : '',
    twelfthPercentage: sp.twelfth_percentage != null ? Number(sp.twelfth_percentage) : '',
    gender: capitalizeGender(sp.gender),
    collegeEmail: accountEmail || '',
    personalEmail: typeof aux.personalEmail === 'string' ? aux.personalEmail : '',
    phones,
    emails,
    bio: sp.bio || '',
    skills: (skills || []).map((s) => s.skill_name).filter(Boolean),
    expectedSalaryMin: sp.expected_salary_min != null ? Number(sp.expected_salary_min) : 0,
    expectedSalaryMax: sp.expected_salary_max != null ? Number(sp.expected_salary_max) : 0,
    preferredLocations,
    willingToRelocate: sp.willing_to_relocate !== false,
    profileLinks,
    avatarUrl: avatarUrl || '',
    avatarDataUrl: '',
    avatarName: '',
    cvFileName: '',
    cvDataUrl: '',
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

  return {
    department: dept || null,
    branch: branch || null,
    batch_year: batchYear,
    graduation_year: gradYear,
    cgpa,
    tenth_percentage: tenth,
    twelfth_percentage: twelfth,
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
      personalEmail: aux.personalEmail,
    },
    skills,
    user_phone: primaryPhone || null,
  };
}
