# Super admin — operate the platform

> **Section:** Use case flows  
> **Source:** help  
> **Audience:** all

Goal: onboard tenants safely, keep accounts healthy, and control global email and feature configuration.

Step-by-step
1. Monitor Dashboard for backlog (pending registrations, feedback, health signals).
2. Maintain Colleges and Employers master records as your commercial or pilot process requires.
3. Onboard colleges & employers: activate or reject signups that need platform approval before first productive login.
4. Users: search accounts, unblock lockouts, and correct obvious data issues with an audit trail in mind.
5. Email templates: edit platform system templates carefully. Saves retain baseline + version history so colleges can restore a prior system wording later.
6. Email logs: investigate bounces and delivery using provider request ids (e.g. ZeptoMail) when present.
7. Marketplace: manage providers, services, and orders if the catalog is live.
8. Settings: configure outbound email (ZeptoMail/SMTP). Keep Test environment = Yes during QA so mail is forced to test inboxes; set No (and clear OUTBOUND_EMAIL_OVERRIDE if set) for real recipient delivery. Document major flag changes for ops.

Tip: every Settings change can affect all tenants—prefer staged rollouts and Email logs verification after template edits.
