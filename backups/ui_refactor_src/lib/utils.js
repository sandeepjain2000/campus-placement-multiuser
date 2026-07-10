/**
 * Shared utility functions for the Campus Placement platform
 */

/**
 * Format currency value (INR)
 */
export function formatCurrency(amount, currency = 'INR') {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format salary range
 */
export function formatSalaryRange(min, max, currency = 'INR') {
  if (!min && !max) return 'Not disclosed';
  if (min && max) return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
  if (min) return `From ${formatCurrency(min, currency)}`;
  return `Up to ${formatCurrency(max, currency)}`;
}

/**
 * Format LPA (Lakhs Per Annum)
 */
export function formatLPA(amount) {
  if (!amount) return '—';
  const lpa = amount / 100000;
  return `₹${lpa.toFixed(1)} LPA`;
}

/**
 * Format date
 */
export function formatDate(date, options = {}) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format relative time
 */
export function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Get status badge color
 */
export function getStatusColor(status) {
  const colors = {
    // Application statuses
    applied: 'blue',
    shortlisted: 'indigo',
    in_progress: 'amber',
    selected: 'green',
    rejected: 'red',
    withdrawn: 'gray',
    on_hold: 'amber',
    // Drive statuses
    requested: 'amber',
    approved: 'blue',
    scheduled: 'indigo',
    completed: 'green',
    cancelled: 'red',
    // Offer statuses
    pending: 'amber',
    accepted: 'green',
    expired: 'gray',
    revoked: 'red',
    // Job statuses
    draft: 'gray',
    published: 'green',
    closed: 'red',
    // Student statuses
    unplaced: 'amber',
    placed: 'green',
    opted_out: 'gray',
    higher_studies: 'blue',
    // Internship (student)
    none: 'gray',
    ongoing: 'indigo',
    // Generic
    active: 'green',
    inactive: 'gray',
    verified: 'green',
    unverified: 'amber',
    blacklisted: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Format status label
 */
export function formatStatus(status) {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate slug from text
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get role-based dashboard path
 */
export function getDashboardPath(role) {
  const paths = {
    super_admin: '/dashboard/admin',
    college_admin: '/dashboard/college',
    employer: '/dashboard/employer',
    student: '/dashboard/student',
  };
  return paths[role] || '/dashboard';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role) {
  const names = {
    super_admin: 'Super Admin',
    college_admin: 'College Admin',
    employer: 'Employer',
    student: 'Student',
  };
  return names[role] || role;
}

/**
 * Build query params string
 */
export function buildQueryString(params) {
  const filtered = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Class name merger
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get a deterministic gradient background for a given entity name.
 * The same name always produces the same gradient.
 * @param {string} name
 * @returns {string} CSS linear-gradient string
 */
export function getGradientForName(name = '') {
  const GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  ];
  if (!name) return GRADIENTS[0];
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}
