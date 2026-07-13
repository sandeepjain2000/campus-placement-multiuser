import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { profileFromDb } from '@/lib/studentProfileDbMap';
import {



  canEmployerAccessStudent,
  getEmployerProfileId,
} from '@/lib/employerApplicationAccess';
import {
  filterDisplayDocuments,
  resolveStudentResumeFileName,
} from '@/lib/studentResumeUrl';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { resolveStudentPhotoDisplayUrl } from '@/lib/clientAssetUrl';
import { buildEmployerResumeApiUrl, buildEmployerResumeDownloadUrl, resolveEmployerApplicationResume } from '@/lib/employerApplicationResume';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;



async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const params = new URL(request.url).searchParams;
    const studentId = String(params.get('studentId') || '').trim();
    const applicationId = String(params.get('applicationId') || '').trim() || null;
    const sourceKind = String(params.get('source') || '').trim() || null;
    if (!userId || !studentId) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 });
    }

    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const allowed = await canEmployerAccessStudent(employerId, studentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Profile not available for this employer' }, { status: 403 });
    }

    const profileRow = await query(
      `SELECT
         sp.*,
         u.first_name,
         u.last_name,
         u.email AS account_email,
         u.communication_email,
         u.phone AS user_phone,
         u.avatar_url,
         t.name AS college_name,
         t.short_code
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.id = $1::uuid`,
      [studentId],
    );

    const sp = profileRow.rows[0];
    if (!sp) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const [skillsRes, projectsRes, educationRecordsRes, documentsRes] = await Promise.all([
      query(
        `SELECT skill_name, proficiency FROM student_skills WHERE student_id = $1::uuid ORDER BY created_at ASC`,
        [studentId],
      ),
      query(
        `SELECT title, description, tech_stack, project_url, github_url, start_date, end_date
         FROM student_projects
         WHERE student_id = $1::uuid
         ORDER BY COALESCE(end_date, start_date) DESC NULLS LAST, created_at DESC`,
        [studentId],
      ),
      query(
        `SELECT institution, degree, field_of_study, start_year, end_year, grade, description
         FROM student_education
         WHERE student_id = $1::uuid
         ORDER BY start_year DESC NULLS LAST, created_at DESC`,
        [studentId],
      ),
      query(
        `SELECT id, document_type, document_name, file_url, file_size, is_verified, uploaded_at
         FROM student_documents
         WHERE student_id = $1::uuid
         ORDER BY uploaded_at DESC`,
        [studentId],
      ),
    ]);

    const aux =
      sp.aux_profile && typeof sp.aux_profile === 'object' && !Array.isArray(sp.aux_profile)
        ? sp.aux_profile
        : {};
    const languages = Array.isArray(aux.languages) ? aux.languages : [];
    const subjects = Array.isArray(aux.subjects) ? aux.subjects : [];

    const rawDocuments = documentsRes.rows.map((row) => ({
      id: row.id,
      type: row.document_type,
      name: row.document_name,
      url: row.file_url,
      fileSize: row.file_size,
      verified: row.is_verified,
      uploadedAt: row.uploaded_at,
    }));
    const displayDocuments = filterDisplayDocuments(rawDocuments).map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        fileSize: doc.fileSize,
        verified: Boolean(doc.verified),
        uploadedAt: doc.uploadedAt,
        viewUrl: `/api/employer/applications/documents/view?studentId=${encodeURIComponent(studentId)}&documentId=${encodeURIComponent(doc.id)}`,
      }));

    const profile = profileFromDb({
      sp,
      skills: skillsRes.rows,
      projects: projectsRes.rows,
      accountEmail: sp.account_email,
      communicationEmail: sp.communication_email,
      userPhone: sp.user_phone,
      avatarUrl: sp.avatar_url,
    });

    const resolvedResume = await resolveEmployerApplicationResume({ studentId, applicationId, sourceKind });
    const hasResume = Boolean(resolvedResume?.fileUrl);
    const resumeUrl = hasResume
      ? buildEmployerResumeApiUrl({ studentId, applicationId, sourceKind })
      : '';
    const resumeDownloadUrl = hasResume
      ? buildEmployerResumeDownloadUrl({ studentId, applicationId, sourceKind })
      : '';
    const primaryResumeFileName =
      resolvedResume?.cvLabel ||
      resolveStudentResumeFileName({
        resumeUrl: sp.resume_url,
        documents: rawDocuments,
        cvFileName: profile.cvFileName,
      });

    return NextResponse.json({
      student: {
        id: sp.id,
        name: `${sp.first_name || ''} ${sp.last_name || ''}`.trim() || sp.account_email || 'Student',
        email: sp.account_email || '',
        collegeName: sp.college_name || '',
        rollNumber: sp.roll_number || '',
        systemId: formatStudentSystemId(sp.short_code, sp.roll_number),
        enrollmentNumber: sp.enrollment_number || '',
        profile: {
          ...profile,
          resumeUrl,
          cvFileName: primaryResumeFileName || profile.cvFileName,
        },
        avatarUrl: resolveStudentPhotoDisplayUrl(sp.avatar_url || profile.avatarUrl || '') || '',
        dateOfBirth: sp.date_of_birth || null,
        category: sp.category || '',
        placementStatus: sp.placement_status || '',
        affiliatedInstitution: sp.affiliated_institution_name || '',
        skillsDetailed: skillsRes.rows.map((row) => ({
          name: row.skill_name,
          proficiency: row.proficiency || '',
        })),
        educationRecords: educationRecordsRes.rows.map((row) => ({
          institution: row.institution,
          degree: row.degree,
          fieldOfStudy: row.field_of_study,
          startYear: row.start_year,
          endYear: row.end_year,
          grade: row.grade,
          description: row.description,
        })),
        resume: {
          hasResume,
          fileName: primaryResumeFileName,
          viewUrl: resumeUrl,
          downloadUrl: resumeDownloadUrl,
        },
        documents: displayDocuments,
        languages,
        subjects,
        gender: profile.gender || '',
        address: profile.address || null,
        expectedSalaryMin: profile.expectedSalaryMin,
        expectedSalaryMax: profile.expectedSalaryMax,
      },
    });
  } catch (e) {
    console.error('GET /api/employer/applications/student-profile', e);
    return NextResponse.json({ error: 'Failed to load student profile' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_applications_student_profile' });
export const GET = __platformApiHandlers.GET;
