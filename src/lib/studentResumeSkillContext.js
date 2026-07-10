import { query } from '@/lib/db';
import { extractTextFromResumeUrl } from '@/lib/extractResumeText';
import { getLlmChatConfig } from '@/lib/llmChatConfig';
import { resolveStudentResumeUrl, resolveStudentResumeFileName } from '@/lib/studentResumeUrl';

function asObject(value) {
  if (value == null) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function linesFromActivities(rows) {
  const out = [];
  for (const row of rows || []) {
    if (!row || typeof row !== 'object') continue;
    const bits = [row.title, row.organization, row.period, row.description].filter(Boolean);
    if (bits.length) out.push(bits.join(' — '));
  }
  return out;
}

function linesFromProjects(rows) {
  const out = [];
  for (const row of rows || []) {
    if (!row) continue;
    const tech = Array.isArray(row.tech_stack) ? row.tech_stack.join(', ') : '';
    const bits = [row.title, row.description, tech].filter(Boolean);
    if (bits.length) out.push(bits.join(' — '));
  }
  return out;
}

/** Build searchable text from profile fields when CV extraction is unavailable. */
export function buildProfileFallbackText({ bio, aux, projects, internships, otherWork, educationDetails, skills }) {
  const parts = [];
  if (bio) parts.push(String(bio));
  for (const line of linesFromProjects(projects)) parts.push(line);
  for (const line of linesFromActivities(internships)) parts.push(line);
  for (const line of linesFromActivities(otherWork)) parts.push(line);
  if (Array.isArray(educationDetails)) {
    for (const ed of educationDetails) {
      if (!ed || typeof ed !== 'object') continue;
      parts.push([ed.institution, ed.degree, ed.field, ed.board].filter(Boolean).join(' — '));
    }
  }
  if (Array.isArray(skills) && skills.length) {
    parts.push(`Existing skills: ${skills.join(', ')}`);
  }
  const legacy = [aux.summary, aux.objective, aux.experience, aux.projects, aux.education]
    .filter(Boolean)
    .join('\n');
  if (legacy.trim()) parts.push(legacy);
  return parts.filter(Boolean).join('\n').trim();
}

/**
 * Load student CV + profile context for skill suggestions.
 * @param {string} studentId
 */
export async function loadStudentResumeSkillContext(studentId) {
  const [profRes, skillsRes, docsRes, projectsRes] = await Promise.all([
    query(
      `SELECT resume_url, bio, aux_profile FROM student_profiles WHERE id = $1::uuid`,
      [studentId],
    ),
    query(
      `SELECT skill_name FROM student_skills WHERE student_id = $1::uuid ORDER BY created_at ASC`,
      [studentId],
    ),
    query(
      `SELECT document_type, document_name, file_url, uploaded_at
       FROM student_documents WHERE student_id = $1::uuid ORDER BY uploaded_at DESC`,
      [studentId],
    ),
    query(
      `SELECT title, description, tech_stack FROM student_projects WHERE student_id = $1::uuid`,
      [studentId],
    ),
  ]);

  const sp = profRes.rows[0] || {};
  const aux = asObject(sp.aux_profile);
  const skills = skillsRes.rows.map((r) => r.skill_name).filter(Boolean);
  const documentRows = docsRes.rows.map((row) => ({
    type: row.document_type,
    name: row.document_name,
    url: row.file_url,
    uploadedAt: row.uploaded_at,
  }));

  const resumeUrl = resolveStudentResumeUrl({ resumeUrl: sp.resume_url, documents: documentRows });
  const cvFileName = resolveStudentResumeFileName({
    resumeUrl,
    documents: documentRows,
    cvFileName: aux.cvFileName,
  });

  let cvExtract = null;
  if (resumeUrl) {
    cvExtract = await extractTextFromResumeUrl(resumeUrl, cvFileName);
  }

  const profileText = buildProfileFallbackText({
    bio: sp.bio,
    aux,
    projects: projectsRes.rows,
    internships: aux.internships,
    otherWork: aux.otherWork,
    educationDetails: aux.educationDetails,
    skills,
  });

  const llm = getLlmChatConfig();
  return {
    skills,
    resumeUrl,
    cvFileName,
    cvExtract,
    profileText,
    aiConfigured: llm.configured,
    aiProvider: llm.provider,
    aiLabel: llm.label,
  };
}
