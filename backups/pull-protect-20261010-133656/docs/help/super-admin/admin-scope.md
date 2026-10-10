# Platform operations

> **Section:** Super admin  
> **Source:** help  
> **Audience:** super_admin

Scope
Super admins operate the multi-tenant control plane: every college and employer tenant, global users, email, marketplace, and feature configuration.

Dashboard
Cross-tenant overview of health and queues (registrations, feedback, errors).

Colleges and Employers
Create or maintain organization records per your commercial process. Keep names and domains accurate for support.

Onboard colleges & employers
Activate or reject self-signups that require platform approval before login. Communicate outcomes to the requester.

Users
Search across roles, help with lockouts, and avoid silent permission changes without notifying the tenant admin.

Email templates
Edit system templates used across campuses. Publishing keeps a baseline and appends version history so colleges can restore a prior system version without losing the original baseline.

Email logs
Trace outbound messages, statuses, and provider ids (e.g. ZeptoMail request id) when debugging “mail not received.”

Marketplace
Manage providers, services, and orders in the global catalog.

Feedback, audit, error logs
Triage product feedback; use audit/error logs for incident response.

Settings — email and test environment
Configure ZeptoMail/SMTP and related keys. Test environment = Yes redirects outbound mail to configured test inboxes so QA does not email real students/employers. Optional server env: OUTBOUND_EMAIL_OVERRIDE. Set Test environment = No for production recipient delivery and verify with Email logs.

Tip: pair every template change with a test send while Test environment is Yes.
