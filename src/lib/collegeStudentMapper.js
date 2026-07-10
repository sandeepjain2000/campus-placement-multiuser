import { normalizeInternshipStatus } from '@/lib/collegeStudentsCsv';
import { resolveStudentPhotoDisplayUrl } from '@/lib/clientAssetUrl';
import { resolveStudentBatch } from '@/lib/studentBatch';
import {
  filterDisplayDocuments,
  resolveStudentResumeFileName,
  resolveStudentResumeUrl,
} from '@/lib/studentResumeUrl';

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

const DEGREE_LIKE_PATTERN =
  /\b(b\.?\s*tech|m\.?\s*tech|b\.?\s*e\.?|m\.?\s*e\.?|mba|m\.?\s*sc|b\.?\s*sc|dual\s+degree|integrated|ph\.?\s*d|b\.?\s*arch|b\.?\s*pharm|b\.?\s*com|bca|mca)\b/i;

/** Program level pursued (B.Tech, M.Tech, Dual Degree, etc.) for college student lists. */
export function resolveDegreePursued({ auxProfile, branch, department, educationRecords } = {}) {
  const aux = asObject(auxProfile);
  const fromAux = String(aux.degreePursued || aux.degree_pursued || '').trim();
  if (fromAux) return fromAux;

  const records = asArray(educationRecords);
  for (const record of records) {
    const degree = String(record?.degree || '').trim();
    if (degree) return degree;
  }

  const branchValue = String(branch || '').trim();
  if (!branchValue) return '';

  const dept = String(department || '').trim();
  if (DEGREE_LIKE_PATTERN.test(branchValue)) return branchValue;
  if (dept && branchValue.toLowerCase() !== dept.toLowerCase()) return branchValue;

  return '';
}

export const COLLEGE_STUDENT_SELECT_SQL = `
  sp.id,
  sp.user_id,
  sp.roll_number,
  sp.enrollment_number,
  sp.department,
  sp.branch,
  sp.batch_year,
  sp.graduation_year,
  sp.joining_academic_year,
  sp.semester_number,
  sp.program_duration_years,
  sp.cgpa,
  sp.tenth_percentage,
  sp.twelfth_percentage,
  sp.diploma_percentage,
  sp.backlogs_active,
  sp.backlogs_history,
  sp.placement_status,
  sp.is_verified,
  sp.verified_at,
  sp.gender,
  sp.date_of_birth,
  sp.category,
  sp.linkedin_url,
  sp.github_url,
  sp.portfolio_url,
  sp.expected_salary_min,
  sp.expected_salary_max,
  sp.preferred_locations,
  sp.willing_to_relocate,
  sp.resume_url,
  sp.bio,
  sp.aux_profile,
  u.first_name,
  u.last_name,
  u.email,
  u.communication_email,
  u.phone,
  u.avatar_url,
  t.short_code,
  t.name AS institution_name,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'name', ss.skill_name,
        'proficiency', ss.proficiency
      )
      ORDER BY ss.created_at ASC
    )
    FROM student_skills ss
    WHERE ss.student_id = sp.id
  ), '[]'::json) AS skills_detail,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'institution', se.institution,
        'degree', se.degree,
        'fieldOfStudy', se.field_of_study,
        'startYear', se.start_year,
        'endYear', se.end_year,
        'grade', se.grade,
        'description', se.description
      )
      ORDER BY se.start_year DESC NULLS LAST, se.created_at DESC
    )
    FROM student_education se
    WHERE se.student_id = sp.id
  ), '[]'::json) AS education_records,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'title', pr.title,
        'description', pr.description,
        'techStack', pr.tech_stack,
        'projectUrl', pr.project_url,
        'githubUrl', pr.github_url,
        'startDate', pr.start_date,
        'endDate', pr.end_date
      )
      ORDER BY COALESCE(pr.end_date, pr.start_date) DESC NULLS LAST, pr.created_at DESC
    )
    FROM student_projects pr
    WHERE pr.student_id = sp.id
  ), '[]'::json) AS projects,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'type', sd.document_type,
        'name', sd.document_name,
        'url', sd.file_url,
        'fileSize', sd.file_size,
        'verified', sd.is_verified,
        'uploadedAt', sd.uploaded_at
      )
      ORDER BY sd.uploaded_at DESC
    )
    FROM student_documents sd
    WHERE sd.student_id = sp.id
  ), '[]'::json) AS documents`;

export function mapCollegeStudentRow(row, { semesterDisplay = '' } = {}) {
  const shortCode = row.short_code || '';
  const rollNo = row.roll_number || '';
  const systemId = shortCode && rollNo ? `${shortCode}-${rollNo}` : rollNo;
  const aux = asObject(row.aux_profile);
  const skillsDetail = asArray(row.skills_detail);
  const educationRecords = asArray(row.education_records);
  const projects = asArray(row.projects);
  const documents = asArray(row.documents);
  const resolvedResumeUrl = resolveStudentResumeUrl({
    resumeUrl: row.resume_url,
    documents,
  });
  const displayDocuments = filterDisplayDocuments(documents);
  const resumeViewUrl = resolvedResumeUrl ? `/api/college/students/${row.id}/resume` : '';
  const languages = asArray(aux.languages);
  const subjects = asArray(aux.subjects);
  const workExperience = asArray(aux.workExperience);
  const responsibilities = asArray(aux.responsibilities);
  const accomplishments = asArray(aux.accomplishments);
  const volunteering = asArray(aux.volunteering);
  const extracurriculars = asArray(aux.extracurriculars);
  const profileLinks = asArray(aux.profileLinks);
  const preferredLocations = asArray(row.preferred_locations);
  const completedSections = [
    row.email || row.phone || row.bio,
    educationRecords.length || row.cgpa || row.tenth_percentage || row.twelfth_percentage,
    skillsDetail.length || languages.length || subjects.length,
    projects.length,
    displayDocuments.length || resolvedResumeUrl,
    workExperience.length ||
      responsibilities.length ||
      accomplishments.length ||
      volunteering.length ||
      extracurriculars.length,
  ].filter(Boolean).length;

  return {
    id: row.id,
    userId: row.user_id,
    systemId,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    email: row.email || '',
    communicationEmail: row.communication_email || '',
    phone: row.phone || '',
    photo: resolveStudentPhotoDisplayUrl(row.avatar_url),
    roll: rollNo,
    enrollmentNumber: row.enrollment_number || '',
    dept: row.department || '',
    specialization: row.branch || '',
    degreePursued: resolveDegreePursued({
      auxProfile: aux,
      branch: row.branch,
      department: row.department,
      educationRecords,
    }),
    semester:
      row.semester_number != null
        ? String(row.semester_number)
        : aux.semester || semesterDisplay,
    ...(() => {
      const batchResolved = resolveStudentBatch({
        batchYear: row.batch_year,
        graduationYear: row.graduation_year,
        joining_academic_year: row.joining_academic_year,
        batchLabel: aux.batchLabel,
        joiningAcademicYear: aux.joiningAcademicYear,
      });
      return {
        batch: batchResolved.batch,
        joiningAcademicYear: batchResolved.joiningAcademicYear,
        batchYear: batchResolved.batchYear,
        graduationYear: batchResolved.graduationYear,
      };
    })(),
    academicYear: aux.academicYearLabel || '',
    cgpa: row.cgpa !== null ? Number(row.cgpa) : null,
    tenthPercentage: row.tenth_percentage !== null ? Number(row.tenth_percentage) : null,
    twelfthPercentage: row.twelfth_percentage !== null ? Number(row.twelfth_percentage) : null,
    diplomaPercentage: row.diploma_percentage !== null ? Number(row.diploma_percentage) : null,
    backlogsActive: row.backlogs_active ?? 0,
    backlogsHistory: row.backlogs_history ?? 0,
    jobStatus: row.placement_status || 'unplaced',
    internshipStatus: normalizeInternshipStatus(aux.internshipStatus) || 'none',
    verified: Boolean(row.is_verified),
    verifiedAt: row.verified_at,
    skills: skillsDetail.map((skill) => skill.name).filter(Boolean),
    skillsDetail,
    gender: row.gender || '—',
    dateOfBirth: row.date_of_birth,
    disabilityStatus: aux.disabilityStatus || '—',
    diversityCategory: row.category || '—',
    bio: row.bio || '',
    linkedinUrl: row.linkedin_url || '',
    githubUrl: row.github_url || '',
    portfolioUrl: row.portfolio_url || '',
    expectedSalaryMin: row.expected_salary_min !== null ? Number(row.expected_salary_min) : null,
    expectedSalaryMax: row.expected_salary_max !== null ? Number(row.expected_salary_max) : null,
    preferredLocations,
    willingToRelocate: row.willing_to_relocate !== false,
    resumeUrl: resolvedResumeUrl,
    resumeViewUrl,
    resumeFileName: resolveStudentResumeFileName({
      resumeUrl: row.resume_url,
      documents,
      cvFileName: aux.cvFileName,
    }),
    sectionCompletion: {
      completed: completedSections,
      total: 6,
    },
    sections: {
      basic: {
        institutionName: row.institution_name || '',
        email: row.email || '',
        communicationEmail: row.communication_email || '',
        phone: row.phone || '',
        profileLinks,
      },
      education: {
        records: educationRecords,
        scores: [
          { label: 'CGPA', value: row.cgpa !== null ? Number(row.cgpa) : null },
          { label: 'Class X', value: row.tenth_percentage !== null ? Number(row.tenth_percentage) : null },
          { label: 'Class XII', value: row.twelfth_percentage !== null ? Number(row.twelfth_percentage) : null },
          { label: 'Diploma', value: row.diploma_percentage !== null ? Number(row.diploma_percentage) : null },
        ],
        backlogs: {
          active: row.backlogs_active ?? 0,
          total: row.backlogs_history ?? 0,
        },
      },
      skills: {
        skills: skillsDetail,
        languages,
        subjects,
      },
      projects,
      documents: {
        resumeUrl: resolvedResumeUrl,
        documents: displayDocuments,
      },
      activities: {
        workExperience,
        responsibilities,
        accomplishments,
        volunteering,
        extracurriculars,
      },
    },
  };
}
