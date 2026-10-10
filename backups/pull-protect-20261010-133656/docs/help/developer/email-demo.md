# Email & demo mail

> **Section:** Developer / QA  
> **Source:** developer  
> **Audience:** all

Disposable inbox for system mail in demos: placementhub@yopmail.com — check at https://yopmail.com/
Super Admin demo credentials: admin@placementhub.com — password Admin@123.
Data Tester seeded users use @placementhub.test (not YOPmail); password Admin@123.
Student reminder / email copy preview (no mail sent): /dashboard/student/reminders after login.
Super admin → Email delivery logs: search by recipient login email, context, or subject. Each row stores original → communication routing → final SMTP.
Mail contexts for QA: student_selection, registration_approved, student_welcome, password_reset, email_verification, audit_report_export, feedback_reply, login_support — see User testing use cases.
CLI: node scripts/query_mail_logs.js <email-or-context> from repo root (reads .env.local DATABASE_URL).
Assessment round updates from CSV or Assessment Update Online appear on Hiring Results Dashboard (employer) and college Hiring Assessment (read-only).
College Audit Reports → Export CSV can email a download link when SMTP is configured.
