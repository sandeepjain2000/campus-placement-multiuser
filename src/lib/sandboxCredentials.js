/**
 * Sandbox default login password (all demo accounts). Production will use per-user random passwords in welcome email.
 */
export const SANDBOX_DEFAULT_PASSWORD = 'Admin@123';

/** bcrypt cost-10 hash of {@link SANDBOX_DEFAULT_PASSWORD} (same as db/migrations/062_reset_all_passwords_admin123.sql). */
export const SANDBOX_PASSWORD_HASH =
  '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82';
