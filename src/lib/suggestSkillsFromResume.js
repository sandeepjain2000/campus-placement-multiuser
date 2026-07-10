/** Common skills matched case-insensitively in résumé text. */
const SKILL_VOCAB = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift',
  'React', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Angular', 'Vue',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'CI/CD', 'REST API', 'GraphQL', 'Machine Learning', 'Deep Learning', 'Data Analysis',
  'HTML', 'CSS', 'Tailwind', 'Figma', 'Agile', 'Scrum', 'Linux', 'TensorFlow', 'PyTorch',
  'Communication', 'Leadership', 'Problem Solving',
];

/**
 * Suggest skill tags from plain-text résumé content (deterministic; no API key required).
 * @param {string} text
 * @param {string[]} existing
 * @param {number} [max]
 */
export function suggestSkillsFromResumeText(text, existing = [], max = 12) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return [];
  const have = new Set(existing.map((s) => String(s).toLowerCase()));
  const found = [];
  for (const skill of SKILL_VOCAB) {
    if (found.length >= max) break;
    const key = skill.toLowerCase();
    if (have.has(key)) continue;
    if (hay.includes(key) || hay.includes(key.replace(/\./g, ''))) {
      found.push(skill);
      have.add(key);
    }
  }
  return found;
}
