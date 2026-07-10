/**
 * Input validation helpers for the Campus Placement platform
 */

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  // Min 8 chars, at least one uppercase, one lowercase, one number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(password);
}

/** E.164: leading +, country code, 8–15 digits total (spaces/dashes stripped). */
export function validatePhone(phone) {
  if (phone == null || String(phone).trim() === '') return true;
  const compact = String(phone).replace(/[\s-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(compact);
}

export function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateCGPA(cgpa) {
  const num = parseFloat(cgpa);
  return !isNaN(num) && num >= 0 && num <= 10;
}

export function validatePercentage(pct) {
  const num = parseFloat(pct);
  return !isNaN(num) && num >= 0 && num <= 100;
}

export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

export function validateRequired(obj, fields) {
  const missing = [];
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      missing.push(field);
    }
  }
  return missing;
}

export function validateRegistration(data) {
  const errors = {};
  
  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Valid email is required';
  }
  if (!data.password || !validatePassword(data.password)) {
    errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
  }
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = 'First name is required (min 2 characters)';
  }
  if (!data.role || !['student', 'employer', 'college_admin'].includes(data.role)) {
    errors.role = 'Valid role is required';
  }

  if (data.role === 'student') {
    const key =
      typeof data.campusBindingToken === 'string'
        ? data.campusBindingToken.trim().replace(/\s+/g, '')
        : '';
    if (key.length < 16) {
      errors.campusBindingToken =
        'Campus enrollment key is too short — paste the full code from your placement office';
    }
    if (!data.department || String(data.department).trim().length < 2) {
      errors.department = 'Department is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateJobPosting(data) {
  const errors = {};
  
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Job title is required (min 3 characters)';
  }
  if (!data.job_type || !['full_time', 'internship', 'contract', 'ppo'].includes(data.job_type)) {
    errors.job_type = 'Valid job type is required';
  }
  if (data.salary_min && data.salary_max && parseFloat(data.salary_min) > parseFloat(data.salary_max)) {
    errors.salary = 'Minimum salary cannot exceed maximum salary';
  }
  if (data.min_cgpa && !validateCGPA(data.min_cgpa)) {
    errors.min_cgpa = 'CGPA must be between 0 and 10';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
