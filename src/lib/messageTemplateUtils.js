/** Normalize message_templates.variables from API / forms. */
export function parseMessageTemplateVariables(variables) {
  if (Array.isArray(variables)) {
    return variables.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof variables === 'string') {
    const trimmed = variables.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    return trimmed
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function variablesToFormText(variables) {
  return parseMessageTemplateVariables(variables).join(', ');
}
