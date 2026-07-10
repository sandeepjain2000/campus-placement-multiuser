import { initialCollegeStudentForm } from '@/lib/collegeStudentAdminFields';
import { resolveStudentBatch } from '@/lib/studentBatch';

/** Map API student row to add/edit form values. */
export function collegeStudentToFormValues(student) {
  if (!student) return null;
  const category =
    student.diversityCategory && student.diversityCategory !== '—'
      ? student.diversityCategory
      : 'General';
  const gender = student.gender && student.gender !== '—' ? student.gender : '';
  const disability =
    student.disabilityStatus && student.disabilityStatus !== '—'
      ? student.disabilityStatus
      : 'None';

  const academicYear =
    student.academicYear && student.academicYear !== '—'
      ? student.academicYear
      : initialCollegeStudentForm().academic_year;

  return {
    ...initialCollegeStudentForm(),
    name: student.name || '',
    email: student.email || '',
    communication_email: student.communicationEmail || '',
    phone: student.phone || '',
    roll_number: student.roll || '',
    enrollment_number: student.enrollmentNumber || '',
    photo_url: student.photo || '',
    academic_year: academicYear,
    semester: student.semester && student.semester !== '—' ? String(student.semester) : '',
    department: student.dept || '',
    branch: student.specialization || '',
    degree_pursued: student.degreePursued || '',
    batch: resolveStudentBatch({
      batchYear: student.batchYear,
      graduationYear: student.graduationYear,
      batchLabel: student.batch,
      joiningAcademicYear: student.joiningAcademicYear,
    }).batch,
    batch_year: student.batchYear != null ? String(student.batchYear) : '',
    graduation_year: student.graduationYear != null ? String(student.graduationYear) : '',
    cgpa: student.cgpa != null && student.cgpa !== '' ? String(student.cgpa) : '',
    tenth_percentage: student.tenthPercentage != null ? String(student.tenthPercentage) : '',
    twelfth_percentage: student.twelfthPercentage != null ? String(student.twelfthPercentage) : '',
    diploma_percentage: student.diplomaPercentage != null ? String(student.diplomaPercentage) : '',
    backlogs_active: String(student.backlogsActive ?? 0),
    backlogs_history: String(student.backlogsHistory ?? 0),
    gender,
    category,
    disability_status: disability,
    date_of_birth: student.dateOfBirth
      ? String(student.dateOfBirth).slice(0, 10)
      : '',
    placement_status: student.jobStatus || 'unplaced',
    internship_status: student.internshipStatus || 'none',
    verified: Boolean(student.verified),
    skills: Array.isArray(student.skills) ? [...student.skills] : [],
    bio: student.bio || '',
    linkedin_url: student.linkedinUrl || '',
    github_url: student.githubUrl || '',
    portfolio_url: student.portfolioUrl || '',
    resume_url: student.resumeUrl || '',
    expected_salary_min:
      student.expectedSalaryMin != null ? String(student.expectedSalaryMin) : '',
    expected_salary_max:
      student.expectedSalaryMax != null ? String(student.expectedSalaryMax) : '',
    preferred_locations: Array.isArray(student.preferredLocations)
      ? [...student.preferredLocations]
      : [],
    willing_to_relocate: student.willingToRelocate !== false,
  };
}
