/** Compact two-line labels for /demo-accounts rows. */

export function demoAccountLine1(user) {
  const person = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

  if (user.role === 'employer') {
    return user.company_name || person || 'Employer';
  }
  if (user.role === 'super_admin') {
    return 'Platform Admin';
  }
  if (user.role === 'placement_committee') {
    return user.college_name ? `Placement Committee · ${user.college_name}` : 'Placement Committee';
  }
  if (user.role === 'college_admin') {
    return user.college_name ? `College Admin · ${user.college_name}` : 'College Admin';
  }
  return person || user.email;
}

export const demoAccountRowStyles = {
  link: {
    display: 'block',
    padding: '0.55rem 0.85rem',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    cursor: 'pointer',
  },
  line1: {
    fontWeight: 600,
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  line2: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
    marginTop: '0.1rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
