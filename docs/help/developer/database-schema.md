# Database relationships overview

> **Section:** Developer  
> **Source:** developer  
> **Audience:** engineers, QA

This page explains how PlacementHub tables connect in practice. For every column and foreign key, see the [full schema reference](/developer/database-schema).

Regenerate from the live database:

```bash
npm run db:generate-docs
```

## Domain groups

| Area | Hub tables | Purpose |
|------|------------|---------|
| Identity | `tenants`, `users` | Colleges, logins, roles |
| Students | `student_profiles`, `student_skills`, `student_education`, `student_documents`, `student_projects` | Student records and profile data |
| Employers | `employer_profiles`, `employer_approvals` | Companies and campus tie-ups |
| Postings | `job_postings`, `job_posting_visibility` | Jobs, internships, projects; which campuses see each posting |
| Placement drives | `placement_drives`, `drive_rounds`, `applications` | On-campus recruitment drives and student applications |
| Programs | `program_applications` | Internships, projects, hackathons, mentorship (non-drive applications) |
| Offers | `offers` | Placement offers after selection |
| Assessments | `employer_assessment_contexts`, `employer_assessment_uploads`, `employer_assessment_rows` | CSV / online hiring results |
| Academic calendar | `tenant_academic_years`, `tenant_academic_year_semesters` | Per-college academic years |

## Two application paths

**Placement drives** (campus recruitment):

`student_profiles` → `applications` → `placement_drives` → `employer_profiles` + `tenants`

**Programs** (internships, projects, hackathons, etc.):

`student_profiles` → `program_applications` → `job_postings` → `job_posting_visibility` → `tenants`

## Campus ↔ employer visibility

- `employer_approvals` — employer approved (or revoked) at a college
- `job_posting_visibility` — which campuses can see a given `job_postings` row (with college approval status)

## Student college links

`student_profiles` has two tenant references:

- `tenant_id` — home college
- `member_tenant_id` — affiliated institution (group-tenant setups)

## Assessment / hiring results chain

`employer_assessment_contexts` (draft / submitted lock)  
→ `employer_assessment_uploads`  
→ `employer_assessment_rounds` + `employer_assessment_rows`

Each upload targets exactly one opportunity: either `drive_id` or `job_id` (not both).

## Constraints not visible as foreign keys

| Table | Rule |
|-------|------|
| `employer_assessment_uploads` | Exactly one of `drive_id` or `job_id` |
| `employer_assessment_contexts` | Same XOR on `drive_id` / `job_id` |
| `applications` | `UNIQUE(student_id, drive_id)` |
| `program_applications` | `UNIQUE(student_id, job_id)` |

## Optional / legacy links

- `placement_drives.job_id` — optional link to a `job_postings` row; drives also carry their own eligibility fields (`batch_year`, `min_cgpa`, etc.)

---

# Database schema reference

> Auto-generated from the live database on 2026-06-12. Run `npm run db:generate-docs` to refresh.

## Table of contents

- [application_status_log](#application-status-log)
- [applications](#applications)
- [audit_logs](#audit-logs)
- [audit_report_exports](#audit-report-exports)
- [campus_engagement_listings](#campus-engagement-listings)
- [campus_guest_confirmation_sends](#campus-guest-confirmation-sends)
- [clarification_batches](#clarification-batches)
- [clarification_questions](#clarification-questions)
- [college_calendar](#college-calendar)
- [college_facilities](#college-facilities)
- [college_settings](#college-settings)
- [demo_purge_transactions](#demo-purge-transactions)
- [documentation_faq](#documentation-faq)
- [documentation_help_chunks](#documentation-help-chunks)
- [drive_rounds](#drive-rounds)
- [email_template_overrides](#email-template-overrides)
- [employer_approvals](#employer-approvals)
- [employer_assessment_change_log](#employer-assessment-change-log)
- [employer_assessment_contexts](#employer-assessment-contexts)
- [employer_assessment_import_sessions](#employer-assessment-import-sessions)
- [employer_assessment_import_staging_rows](#employer-assessment-import-staging-rows)
- [employer_assessment_round_defaults](#employer-assessment-round-defaults)
- [employer_assessment_rounds](#employer-assessment-rounds)
- [employer_assessment_rows](#employer-assessment-rows)
- [employer_assessment_uploads](#employer-assessment-uploads)
- [employer_profiles](#employer-profiles)
- [employer_ratings](#employer-ratings)
- [job_posting_visibility](#job-posting-visibility)
- [job_postings](#job-postings)
- [mail_delivery_logs](#mail-delivery-logs)
- [message_templates](#message-templates)
- [notifications](#notifications)
- [offers](#offers)
- [password_reset_tokens](#password-reset-tokens)
- [placement_drives](#placement-drives)
- [platform_error_logs](#platform-error-logs)
- [platform_feedback](#platform-feedback)
- [platform_feedback_replies](#platform-feedback-replies)
- [platform_settings](#platform-settings)
- [program_applications](#program-applications)
- [reference_departments](#reference-departments)
- [schema_one_time_actions](#schema-one-time-actions)
- [shard_binding_pairs](#shard-binding-pairs)
- [shortlists](#shortlists)
- [sponsorship_donation_receipt_sends](#sponsorship-donation-receipt-sends)
- [sponsorship_opportunities](#sponsorship-opportunities)
- [sponsorship_payment_error_logs](#sponsorship-payment-error-logs)
- [sponsorship_payments](#sponsorship-payments)
- [startup_funding_opportunities](#startup-funding-opportunities)
- [startup_funding_payments](#startup-funding-payments)
- [startup_funding_receipt_sends](#startup-funding-receipt-sends)
- [student_documents](#student-documents)
- [student_education](#student-education)
- [student_profiles](#student-profiles)
- [student_projects](#student-projects)
- [student_skills](#student-skills)
- [system_email_templates](#system-email-templates)
- [tenant_academic_year_semesters](#tenant-academic-year-semesters)
- [tenant_academic_years](#tenant-academic-years)
- [tenants](#tenants)
- [user_data_exports](#user-data-exports)
- [users](#users)

---

## application_status_log

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `application_id` | uuid | YES |  |
| `from_status` | character varying | YES |  |
| `to_status` | character varying | NO |  |
| `changed_by` | uuid | YES |  |
| `remarks` | text | YES |  |
| `changed_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `application_id` | `applications.id` |
| `changed_by` | `users.id` |

---

## applications

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | YES |  |
| `drive_id` | uuid | YES |  |
| `job_id` | uuid | YES |  |
| `status` | character varying | YES | 'applied'::character varying |
| `current_round` | integer | YES | 0 |
| `applied_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `withdrawal_reason` | text | YES |  |
| `notes` | text | YES |  |
| `is_deleted` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `drive_id` | `placement_drives.id` |
| `job_id` | `job_postings.id` |
| `student_id` | `student_profiles.id` |

---

## audit_logs

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `tenant_id` | uuid | YES |  |
| `action` | character varying | NO |  |
| `entity_type` | character varying | YES |  |
| `entity_id` | uuid | YES |  |
| `old_values` | jsonb | YES |  |
| `new_values` | jsonb | YES |  |
| `ip_address` | character varying | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `user_id` | `users.id` |

---

## audit_report_exports

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `requested_by` | uuid | YES |  |
| `from_date` | date | NO |  |
| `to_date` | date | NO |  |
| `status` | character varying | NO | 'queued'::character varying |
| `s3_key` | text | YES |  |
| `emailed_to` | character varying | YES |  |
| `error_message` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `requested_by` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## campus_engagement_listings

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | NO |  |
| `author_user_id` | uuid | YES |  |
| `kind` | character varying | NO |  |
| `title` | character varying | NO |  |
| `summary` | text | YES |  |
| `requirements` | text | YES |  |
| `time_hint` | text | YES |  |
| `status` | character varying | NO | 'draft'::character varying |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `author_user_id` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## campus_guest_confirmation_sends

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `listing_id` | uuid | NO |  |
| `employer_user_id` | uuid | NO |  |
| `to_email` | text | NO |  |
| `subject` | text | NO |  |
| `body` | text | NO |  |
| `sent_at` | timestamp with time zone | NO | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `employer_user_id` | `users.id` |
| `listing_id` | `campus_engagement_listings.id` |

---

## clarification_batches

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | NO |  |
| `company` | character varying | NO |  |
| `posted_by` | character varying | NO |  |
| `posted_at` | date | NO | CURRENT_DATE |
| `created_by` | uuid | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `created_by` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## clarification_questions

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `batch_id` | uuid | NO |  |
| `question_text` | text | NO |  |
| `answer_text` | text | YES |  |
| `answered_by` | character varying | YES |  |
| `answered_at` | timestamp without time zone | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `batch_id` | `clarification_batches.id` |

---

## college_calendar

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `event_type` | character varying | YES |  |
| `start_date` | date | NO |  |
| `end_date` | date | YES |  |
| `is_blocking` | boolean | YES | false |
| `description` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## college_facilities

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `name` | character varying | NO |  |
| `facility_type` | character varying | YES |  |
| `capacity` | integer | YES |  |
| `has_projector` | boolean | YES | false |
| `has_ac` | boolean | YES | false |
| `has_wifi` | boolean | YES | true |
| `has_video_conf` | boolean | YES | false |
| `is_available` | boolean | YES | true |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## college_settings

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `max_offers_per_student` | integer | YES | 2 |
| `offer_acceptance_window_days` | integer | YES | 7 |
| `min_cgpa_threshold` | numeric | YES | 0 |
| `allow_backlog_students` | boolean | YES | true |
| `max_backlogs_allowed` | integer | YES | 2 |
| `require_ppt_before_apply` | boolean | YES | false |
| `auto_verify_students` | boolean | YES | false |
| `placement_season_start` | date | YES |  |
| `placement_season_end` | date | YES |  |
| `buffer_days_between_drives` | integer | YES | 1 |
| `fcfs_enabled` | boolean | YES | true |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `sponsorship_cheque_payable_to` | character varying | YES |  |
| `sponsorship_bank_account_name` | character varying | YES |  |
| `sponsorship_bank_name` | character varying | YES |  |
| `sponsorship_bank_account_number` | character varying | YES |  |
| `sponsorship_bank_ifsc` | character varying | YES |  |
| `sponsorship_bank_branch` | character varying | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## demo_purge_transactions

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `entity_type` | character varying | NO |  |
| `entity_id` | uuid | NO |  |
| `is_deleted` | boolean | NO | true |
| `cascade_summary` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone | NO | now() |

---

## documentation_faq

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `screen_tag` | character varying | NO |  |
| `question` | text | NO |  |
| `answer` | text | NO |  |
| `sort_order` | integer | NO | 0 |
| `is_active` | boolean | NO | true |
| `created_at` | timestamp with time zone | NO | now() |
| `updated_at` | timestamp with time zone | NO | now() |

---

## documentation_help_chunks

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `chunk_key` | character varying | NO |  |
| `source` | character varying | NO | 'help'::character varying |
| `section_id` | character varying | YES |  |
| `item_id` | character varying | YES |  |
| `section_title` | text | YES |  |
| `item_title` | text | NO |  |
| `content` | text | NO |  |
| `audience` | ARRAY | NO | ARRAY['all'::text] |
| `content_hash` | character varying | NO |  |
| `embedding` | jsonb | YES |  |
| `search_vector` | tsvector | YES |  |
| `sort_order` | integer | NO | 0 |
| `is_active` | boolean | NO | true |
| `created_at` | timestamp with time zone | NO | now() |
| `updated_at` | timestamp with time zone | NO | now() |

---

## drive_rounds

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `drive_id` | uuid | YES |  |
| `round_number` | integer | NO |  |
| `round_type` | character varying | NO |  |
| `title` | character varying | NO |  |
| `description` | text | YES |  |
| `scheduled_date` | date | YES |  |
| `start_time` | time without time zone | YES |  |
| `end_time` | time without time zone | YES |  |
| `venue` | character varying | YES |  |
| `is_eliminatory` | boolean | YES | true |
| `status` | character varying | YES | 'pending'::character varying |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `drive_id` | `placement_drives.id` |

---

## email_template_overrides

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `scope_type` | character varying | NO |  |
| `scope_id` | uuid | NO |  |
| `template_key` | character varying | NO |  |
| `subject_template` | text | NO |  |
| `body_template` | text | NO |  |
| `updated_at` | timestamp with time zone | NO | now() |
| `updated_by` | uuid | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `updated_by` | `users.id` |

---

## employer_approvals

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `employer_id` | uuid | YES |  |
| `status` | character varying | YES | 'pending'::character varying |
| `approved_by` | uuid | YES |  |
| `approved_at` | timestamp without time zone | YES |  |
| `rejection_reason` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `coordination_poc_user_ids` | ARRAY | YES | '{}'::uuid[] |
| `status_before_revoke` | character varying | YES |  |
| `revoked_at` | timestamp without time zone | YES |  |
| `revoked_by` | uuid | YES |  |
| `revoked_by_role` | character varying | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `approved_by` | `users.id` |
| `employer_id` | `employer_profiles.id` |
| `revoked_by` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## employer_assessment_change_log

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `upload_id` | uuid | NO |  |
| `row_id` | uuid | YES |  |
| `actor_user_id` | uuid | YES |  |
| `action` | character varying | NO |  |
| `summary` | text | NO |  |
| `details` | jsonb | YES | '{}'::jsonb |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `actor_user_id` | `users.id` |
| `row_id` | `employer_assessment_rows.id` |
| `upload_id` | `employer_assessment_uploads.id` |

---

## employer_assessment_contexts

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `opportunity_kind` | text | NO |  |
| `drive_id` | uuid | YES |  |
| `job_id` | uuid | YES |  |
| `submission_status` | text | NO | 'draft'::text |
| `submitted_at` | timestamp without time zone | YES |  |
| `submitted_by` | uuid | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `drive_id` | `placement_drives.id` |
| `employer_id` | `employer_profiles.id` |
| `job_id` | `job_postings.id` |
| `submitted_by` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## employer_assessment_import_sessions

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `opportunity_kind` | text | NO |  |
| `drive_id` | uuid | YES |  |
| `job_id` | uuid | YES |  |
| `status` | text | NO | 'pending_review'::text |
| `original_file_name` | text | YES |  |
| `s3_key` | text | YES |  |
| `created_by` | uuid | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `committed_at` | timestamp without time zone | YES |  |
| `rejected_at` | timestamp without time zone | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `created_by` | `users.id` |
| `drive_id` | `placement_drives.id` |
| `employer_id` | `employer_profiles.id` |
| `job_id` | `job_postings.id` |
| `tenant_id` | `tenants.id` |

---

## employer_assessment_import_staging_rows

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `session_id` | uuid | NO |  |
| `row_num` | integer | NO |  |
| `system_id` | text | YES |  |
| `college_roll_no` | text | YES |  |
| `placement_drive_id` | text | YES |  |
| `job_id` | text | YES |  |
| `tenant_id` | text | YES |  |
| `candidate_name` | text | YES |  |
| `hiring_result` | text | YES |  |
| `remarks` | text | YES |  |
| `validation_errors` | jsonb | NO | '[]'::jsonb |
| `is_valid` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `session_id` | `employer_assessment_import_sessions.id` |

---

## employer_assessment_round_defaults

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | NO |  |
| `opportunity_kind` | text | NO |  |
| `round_no` | integer | NO |  |
| `round_label` | character varying | NO |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `employer_id` | `employer_profiles.id` |

---

## employer_assessment_rounds

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `upload_id` | uuid | NO |  |
| `round_no` | integer | NO |  |
| `round_label` | character varying | NO |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `upload_id` | `employer_assessment_uploads.id` |

---

## employer_assessment_rows

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `upload_id` | uuid | NO |  |
| `student_profile_id` | uuid | NO |  |
| `application_id` | uuid | YES |  |
| `roll_number` | character varying | NO |  |
| `is_unregistered_student` | boolean | NO | false |
| `round_1_result` | text | YES |  |
| `round_2_result` | text | YES |  |
| `round_3_result` | text | YES |  |
| `round_4_result` | text | YES |  |
| `round_5_result` | text | YES |  |
| `remarks` | character varying | YES |  |
| `candidate_name` | character varying | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `hiring_result` | text | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `application_id` | `applications.id` |
| `student_profile_id` | `student_profiles.id` |
| `upload_id` | `employer_assessment_uploads.id` |

---

## employer_assessment_uploads

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `drive_id` | uuid | YES |  |
| `job_id` | uuid | YES |  |
| `uploaded_by` | uuid | YES |  |
| `original_file_name` | character varying | NO |  |
| `s3_key` | text | YES |  |
| `total_rows` | integer | NO | 0 |
| `accepted_rows` | integer | NO | 0 |
| `rejected_rows` | integer | NO | 0 |
| `created_at` | timestamp without time zone | YES | now() |
| `is_deleted` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `drive_id` | `placement_drives.id` |
| `employer_id` | `employer_profiles.id` |
| `job_id` | `job_postings.id` |
| `tenant_id` | `tenants.id` |
| `uploaded_by` | `users.id` |

---

## employer_profiles

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `company_name` | character varying | NO |  |
| `company_slug` | character varying | YES |  |
| `industry` | character varying | YES |  |
| `company_type` | character varying | YES |  |
| `company_size` | character varying | YES |  |
| `founded_year` | integer | YES |  |
| `website` | character varying | YES |  |
| `logo_url` | text | YES |  |
| `description` | text | YES |  |
| `headquarters` | character varying | YES |  |
| `locations` | ARRAY | YES |  |
| `linkedin_url` | character varying | YES |  |
| `glassdoor_url` | character varying | YES |  |
| `contact_person` | character varying | YES |  |
| `contact_email` | character varying | YES |  |
| `contact_phone` | character varying | YES |  |
| `is_verified` | boolean | YES | false |
| `is_blacklisted` | boolean | YES | false |
| `blacklist_reason` | text | YES |  |
| `reliability_score` | numeric | YES | 0 |
| `total_hires` | integer | YES | 0 |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `billing_legal_name` | character varying | YES |  |
| `billing_pan` | character varying | YES |  |
| `billing_gst_number` | character varying | YES |  |
| `posting_campus_constraints` | jsonb | NO | '{}'::jsonb |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## employer_ratings

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | YES |  |
| `student_id` | uuid | YES |  |
| `drive_id` | uuid | YES |  |
| `professionalism` | integer | YES |  |
| `transparency` | integer | YES |  |
| `timeliness` | integer | YES |  |
| `overall_rating` | integer | YES |  |
| `feedback` | text | YES |  |
| `is_anonymous` | boolean | YES | true |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `drive_id` | `placement_drives.id` |
| `employer_id` | `employer_profiles.id` |
| `student_id` | `student_profiles.id` |

---

## job_posting_visibility

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `job_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `created_at` | timestamp with time zone | YES | now() |
| `college_status` | character varying | NO | 'pending'::character varying |
| `approved_by` | uuid | YES |  |
| `approved_at` | timestamp with time zone | YES |  |
| `rejection_reason` | text | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `approved_by` | `users.id` |
| `job_id` | `job_postings.id` |
| `tenant_id` | `tenants.id` |

---

## job_postings

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `employer_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `description` | text | YES |  |
| `job_type` | character varying | YES |  |
| `category` | character varying | YES |  |
| `locations` | ARRAY | YES |  |
| `salary_min` | numeric | YES |  |
| `salary_max` | numeric | YES |  |
| `salary_currency` | character varying | YES | 'INR'::character varying |
| `bond_duration_months` | integer | YES | 0 |
| `bond_penalty` | numeric | YES |  |
| `eligible_branches` | ARRAY | YES |  |
| `min_cgpa` | numeric | YES |  |
| `max_backlogs` | integer | YES | 0 |
| `min_tenth_pct` | numeric | YES |  |
| `min_twelfth_pct` | numeric | YES |  |
| `batch_year` | integer | YES |  |
| `skills_required` | ARRAY | YES |  |
| `perks` | ARRAY | YES |  |
| `vacancies` | integer | YES | 1 |
| `status` | character varying | YES | 'draft'::character varying |
| `application_deadline` | timestamp without time zone | YES |  |
| `is_anonymous` | boolean | YES | false |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `academic_year_id` | uuid | YES |  |
| `is_deleted` | boolean | NO | false |
| `min_experience_years` | integer | YES |  |
| `max_experience_years` | integer | YES |  |
| `work_mode` | character varying | YES |  |
| `notice_period_days` | integer | YES |  |
| `seniority_level` | character varying | YES |  |
| `education_level` | character varying | YES |  |
| `is_visible` | boolean | NO | false |
| `published_at` | timestamp with time zone | YES |  |
| `additional_info` | text | YES |  |
| `internship_start_date` | date | YES |  |
| `internship_end_date` | date | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `academic_year_id` | `tenant_academic_years.id` |
| `employer_id` | `employer_profiles.id` |

---

## mail_delivery_logs

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `created_at` | timestamp with time zone | NO | now() |
| `context` | character varying | YES |  |
| `status` | character varying | NO |  |
| `skip_reason` | character varying | YES |  |
| `original_to` | text | YES |  |
| `resolved_to` | text | YES |  |
| `subject_truncated` | character varying | YES |  |
| `error_message` | text | YES |  |
| `error_code` | character varying | YES |  |
| `message_id` | text | YES |  |
| `smtp_response` | text | YES |  |
| `user_id` | uuid | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## message_templates

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `name` | character varying | NO |  |
| `subject` | character varying | YES |  |
| `body` | text | NO |  |
| `template_type` | character varying | YES | 'email'::character varying |
| `variables` | ARRAY | YES |  |
| `is_active` | boolean | YES | true |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## notifications

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `message` | text | NO |  |
| `type` | character varying | YES | 'info'::character varying |
| `link` | character varying | YES |  |
| `is_read` | boolean | YES | false |
| `created_at` | timestamp without time zone | YES | now() |
| `deleted_at` | timestamp without time zone | YES |  |
| `is_starred` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## offers

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `application_id` | uuid | YES |  |
| `student_id` | uuid | YES |  |
| `employer_id` | uuid | YES |  |
| `drive_id` | uuid | YES |  |
| `job_title` | character varying | YES |  |
| `salary` | numeric | YES |  |
| `salary_currency` | character varying | YES | 'INR'::character varying |
| `joining_date` | date | YES |  |
| `location` | character varying | YES |  |
| `offer_letter_url` | text | YES |  |
| `status` | character varying | YES | 'pending'::character varying |
| `deadline` | timestamp without time zone | YES |  |
| `accepted_at` | timestamp without time zone | YES |  |
| `rejected_at` | timestamp without time zone | YES |  |
| `rejection_reason` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `reported_company_name` | character varying | YES |  |
| `is_deleted` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `application_id` | `applications.id` |
| `drive_id` | `placement_drives.id` |
| `employer_id` | `employer_profiles.id` |
| `student_id` | `student_profiles.id` |

---

## password_reset_tokens

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `token` | character varying | NO |  |
| `expires_at` | timestamp without time zone | NO |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## placement_drives

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `employer_id` | uuid | YES |  |
| `job_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `description` | text | YES |  |
| `drive_type` | character varying | YES | 'on_campus'::character varying |
| `drive_date` | date | YES |  |
| `start_time` | time without time zone | YES |  |
| `end_time` | time without time zone | YES |  |
| `venue` | character varying | YES |  |
| `status` | character varying | YES | 'requested'::character varying |
| `max_students` | integer | YES |  |
| `registered_count` | integer | YES | 0 |
| `selected_count` | integer | YES | 0 |
| `approved_by` | uuid | YES |  |
| `approved_at` | timestamp without time zone | YES |  |
| `requires_ppt` | boolean | YES | false |
| `ppt_completed` | boolean | YES | false |
| `notes` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `academic_year_id` | uuid | YES |  |
| `ctc_breakup` | text | YES |  |
| `attached_staff_user_ids` | ARRAY | YES | '{}'::uuid[] |
| `is_deleted` | boolean | NO | false |
| `social_shared` | ARRAY | YES | '{}'::text[] |
| `min_cgpa` | numeric | YES |  |
| `batch_year` | integer | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `academic_year_id` | `tenant_academic_years.id` |
| `approved_by` | `users.id` |
| `employer_id` | `employer_profiles.id` |
| `job_id` | `job_postings.id` |
| `tenant_id` | `tenants.id` |

---

## platform_error_logs

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `created_at` | timestamp with time zone | NO | now() |
| `severity` | character varying | NO | 'error'::character varying |
| `context` | character varying | NO |  |
| `status_code` | integer | YES |  |
| `user_id` | uuid | YES |  |
| `tenant_id` | uuid | YES |  |
| `employer_id` | uuid | YES |  |
| `user_message` | text | YES |  |
| `error_message` | text | NO |  |
| `error_code` | character varying | YES |  |
| `details` | jsonb | YES |  |
| `ip_address` | character varying | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `employer_id` | `employer_profiles.id` |
| `tenant_id` | `tenants.id` |
| `user_id` | `users.id` |

---

## platform_feedback

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `category` | character varying | NO |  |
| `description` | text | NO |  |
| `status` | character varying | NO | 'Submitted'::character varying |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## platform_feedback_replies

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `feedback_id` | uuid | NO |  |
| `author_user_id` | uuid | YES |  |
| `message` | text | NO |  |
| `channel` | character varying | NO | 'dashboard'::character varying |
| `created_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `author_user_id` | `users.id` |
| `feedback_id` | `platform_feedback.id` |

---

## platform_settings

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | smallint | NO | 1 |
| `settings` | jsonb | NO | '{}'::jsonb |
| `updated_at` | timestamp with time zone | YES | now() |

---

## program_applications

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | NO |  |
| `job_id` | uuid | NO |  |
| `status` | character varying | NO | 'applied'::character varying |
| `notes` | text | YES |  |
| `applied_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `is_deleted` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `job_id` | `job_postings.id` |
| `student_id` | `student_profiles.id` |

---

## reference_departments

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `name` | character varying | NO |  |
| `sort_order` | integer | NO | 0 |

---

## schema_one_time_actions

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `action_key` | text | NO |  |
| `applied_at` | timestamp with time zone | NO | now() |

---

## shard_binding_pairs

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `ref_scope_id` | uuid | NO |  |
| `surface_token` | text | NO |  |
| `created_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `ref_scope_id` | `tenants.id` |

---

## shortlists

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `application_id` | uuid | YES |  |
| `round_id` | uuid | YES |  |
| `status` | character varying | YES | 'qualified'::character varying |
| `score` | numeric | YES |  |
| `feedback` | text | YES |  |
| `evaluated_by` | uuid | YES |  |
| `evaluated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `application_id` | `applications.id` |
| `evaluated_by` | `users.id` |
| `round_id` | `drive_rounds.id` |

---

## sponsorship_donation_receipt_sends

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `payment_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `sent_by_user_id` | uuid | YES |  |
| `to_email` | text | NO |  |
| `receipt_number` | character varying | NO |  |
| `subject` | text | YES |  |
| `sent_at` | timestamp with time zone | NO | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `payment_id` | `sponsorship_payments.id` |
| `sent_by_user_id` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## sponsorship_opportunities

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | NO |  |
| `category` | character varying | NO |  |
| `description` | text | YES |  |
| `tier_name` | character varying | NO |  |
| `price_inr` | bigint | NO |  |
| `benefits` | ARRAY | YES | '{}'::text[] |
| `label` | character varying | YES |  |
| `is_active` | boolean | YES | true |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `payments_permitted` | integer | NO | 1 |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## sponsorship_payment_error_logs

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `opportunity_id` | uuid | YES |  |
| `method` | character varying | YES |  |
| `error_code` | text | YES |  |
| `error_message` | text | YES |  |
| `detail` | jsonb | YES |  |
| `created_at` | timestamp with time zone | NO | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## sponsorship_payments

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `opportunity_id` | uuid | NO |  |
| `employer_profile_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `payment_sequence` | integer | NO |  |
| `amount_inr` | bigint | NO |  |
| `method` | character varying | NO |  |
| `status` | character varying | NO | 'recorded'::character varying |
| `gateway_provider` | character varying | YES |  |
| `gateway_reference` | character varying | YES |  |
| `cheque_mailed_at` | timestamp with time zone | YES |  |
| `bank_transfer_confirmed_at` | timestamp with time zone | YES |  |
| `proof_attachment` | text | YES |  |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |
| `billing_legal_name` | character varying | YES |  |
| `billing_pan` | character varying | YES |  |
| `billing_gst_number` | character varying | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `employer_profile_id` | `employer_profiles.id` |
| `opportunity_id` | `sponsorship_opportunities.id` |
| `tenant_id` | `tenants.id` |

---

## startup_funding_opportunities

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | NO |  |
| `category` | character varying | NO |  |
| `description` | text | YES |  |
| `tier_name` | character varying | NO |  |
| `price_inr` | bigint | NO |  |
| `benefits` | ARRAY | YES | '{}'::text[] |
| `label` | character varying | YES |  |
| `is_active` | boolean | YES | true |
| `payments_permitted` | integer | NO | 1 |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## startup_funding_payments

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `opportunity_id` | uuid | NO |  |
| `employer_profile_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `payment_sequence` | integer | NO |  |
| `amount_inr` | bigint | NO |  |
| `method` | character varying | NO |  |
| `status` | character varying | NO | 'recorded'::character varying |
| `gateway_provider` | character varying | YES |  |
| `gateway_reference` | character varying | YES |  |
| `cheque_mailed_at` | timestamp with time zone | YES |  |
| `bank_transfer_confirmed_at` | timestamp with time zone | YES |  |
| `proof_attachment` | text | YES |  |
| `billing_legal_name` | character varying | YES |  |
| `billing_pan` | character varying | YES |  |
| `billing_gst_number` | character varying | YES |  |
| `created_at` | timestamp with time zone | YES | now() |
| `updated_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `employer_profile_id` | `employer_profiles.id` |
| `opportunity_id` | `startup_funding_opportunities.id` |
| `tenant_id` | `tenants.id` |

---

## startup_funding_receipt_sends

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `payment_id` | uuid | NO |  |
| `tenant_id` | uuid | NO |  |
| `sent_by_user_id` | uuid | YES |  |
| `to_email` | text | NO |  |
| `receipt_number` | character varying | NO |  |
| `subject` | text | YES |  |
| `sent_at` | timestamp with time zone | NO | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `payment_id` | `startup_funding_payments.id` |
| `sent_by_user_id` | `users.id` |
| `tenant_id` | `tenants.id` |

---

## student_documents

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | YES |  |
| `document_type` | character varying | NO |  |
| `document_name` | character varying | NO |  |
| `file_url` | text | NO |  |
| `file_size` | integer | YES |  |
| `is_verified` | boolean | YES | false |
| `uploaded_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `student_id` | `student_profiles.id` |

---

## student_education

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | YES |  |
| `institution` | character varying | NO |  |
| `degree` | character varying | NO |  |
| `field_of_study` | character varying | YES |  |
| `start_year` | integer | YES |  |
| `end_year` | integer | YES |  |
| `grade` | character varying | YES |  |
| `description` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `student_id` | `student_profiles.id` |

---

## student_profiles

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES |  |
| `tenant_id` | uuid | YES |  |
| `roll_number` | character varying | YES |  |
| `enrollment_number` | character varying | YES |  |
| `department` | character varying | YES |  |
| `branch` | character varying | YES |  |
| `batch_year` | integer | YES |  |
| `graduation_year` | integer | YES |  |
| `cgpa` | numeric | YES |  |
| `tenth_percentage` | numeric | YES |  |
| `twelfth_percentage` | numeric | YES |  |
| `diploma_percentage` | numeric | YES |  |
| `backlogs_active` | integer | YES | 0 |
| `backlogs_history` | integer | YES | 0 |
| `gender` | character varying | YES |  |
| `date_of_birth` | date | YES |  |
| `category` | character varying | YES |  |
| `linkedin_url` | character varying | YES |  |
| `github_url` | character varying | YES |  |
| `portfolio_url` | character varying | YES |  |
| `expected_salary_min` | numeric | YES |  |
| `expected_salary_max` | numeric | YES |  |
| `preferred_locations` | ARRAY | YES |  |
| `willing_to_relocate` | boolean | YES | true |
| `placement_status` | character varying | YES | 'unplaced'::character varying |
| `offers_count` | integer | YES | 0 |
| `is_verified` | boolean | YES | false |
| `verified_by` | uuid | YES |  |
| `verified_at` | timestamp without time zone | YES |  |
| `resume_url` | text | YES |  |
| `bio` | text | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `member_tenant_id` | uuid | YES |  |
| `aux_profile` | jsonb | NO | '{}'::jsonb |
| `joining_academic_year` | character varying | YES |  |
| `archived_at` | timestamp without time zone | YES |  |
| `archived_by` | uuid | YES |  |
| `is_deleted` | boolean | NO | false |
| `is_alumni` | boolean | NO | false |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `archived_by` | `users.id` |
| `member_tenant_id` | `tenants.id` |
| `tenant_id` | `tenants.id` |
| `user_id` | `users.id` |
| `verified_by` | `users.id` |

---

## student_projects

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | YES |  |
| `title` | character varying | NO |  |
| `description` | text | YES |  |
| `tech_stack` | ARRAY | YES |  |
| `project_url` | character varying | YES |  |
| `github_url` | character varying | YES |  |
| `start_date` | date | YES |  |
| `end_date` | date | YES |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `student_id` | `student_profiles.id` |

---

## student_skills

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `student_id` | uuid | YES |  |
| `skill_name` | character varying | NO |  |
| `proficiency` | character varying | YES | 'intermediate'::character varying |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `student_id` | `student_profiles.id` |

---

## system_email_templates

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `template_key` | character varying | NO |  |
| `description` | text | YES |  |
| `subject_template` | text | NO |  |
| `body_template` | text | NO |  |
| `updated_at` | timestamp with time zone | NO | now() |
| `updated_by` | uuid | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `updated_by` | `users.id` |

---

## tenant_academic_year_semesters

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `academic_year_id` | uuid | NO |  |
| `sequence_number` | integer | NO |  |
| `period_start` | date | NO |  |
| `period_end` | date | NO |  |
| `created_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `academic_year_id` | `tenant_academic_years.id` |

---

## tenant_academic_years

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | NO |  |
| `label` | character varying | NO |  |
| `sequence_number` | integer | NO |  |
| `period_start` | date | NO |  |
| `period_end` | date | NO |  |
| `semester_count` | integer | NO | 2 |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

## tenants

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `name` | character varying | NO |  |
| `slug` | character varying | NO |  |
| `type` | character varying | YES | 'college'::character varying |
| `logo_url` | text | YES |  |
| `website` | character varying | YES |  |
| `address` | text | YES |  |
| `city` | character varying | YES |  |
| `state` | character varying | YES |  |
| `pincode` | character varying | YES |  |
| `phone` | character varying | YES |  |
| `email` | character varying | YES |  |
| `accreditation` | character varying | YES |  |
| `naac_grade` | character varying | YES |  |
| `nirf_rank` | integer | YES |  |
| `established_year` | integer | YES |  |
| `is_active` | boolean | YES | true |
| `settings` | jsonb | YES | '{}'::jsonb |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `short_code` | character varying | YES |  |
| `communication_email` | character varying | YES |  |
| `is_central_university` | boolean | NO | false |
| `is_state_university` | boolean | NO | false |
| `is_deemed_university` | boolean | NO | false |
| `is_private_university` | boolean | NO | false |
| `is_institution_national_importance` | boolean | NO | false |
| `is_institute_state_legislature` | boolean | NO | false |
| `is_affiliated_college` | boolean | NO | false |
| `is_autonomous_college` | boolean | NO | false |
| `is_constituent_college` | boolean | NO | false |
| `is_government_college` | boolean | NO | false |
| `is_private_aided_college` | boolean | NO | false |
| `is_private_unaided_college` | boolean | NO | false |

---

## user_data_exports

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | NO |  |
| `role` | character varying | NO |  |
| `status` | character varying | NO | 'processing'::character varying |
| `format` | character varying | NO | 'json'::character varying |
| `byte_size` | integer | YES |  |
| `section_summary` | jsonb | YES |  |
| `error_message` | text | YES |  |
| `created_at` | timestamp with time zone | YES | now() |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `user_id` | `users.id` |

---

## users

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `tenant_id` | uuid | YES |  |
| `email` | character varying | NO |  |
| `password_hash` | character varying | NO |  |
| `role` | character varying | NO |  |
| `first_name` | character varying | NO |  |
| `last_name` | character varying | YES |  |
| `phone` | character varying | YES |  |
| `avatar_url` | text | YES |  |
| `is_active` | boolean | YES | true |
| `is_verified` | boolean | YES | false |
| `last_login` | timestamp without time zone | YES |  |
| `created_at` | timestamp without time zone | YES | now() |
| `updated_at` | timestamp without time zone | YES | now() |
| `registration_rejected_at` | timestamp with time zone | YES |  |
| `registration_rejection_note` | text | YES |  |
| `communication_email` | character varying | YES |  |
| `email_verified_at` | timestamp with time zone | YES |  |
| `email_verification_token` | character varying | YES |  |
| `email_verification_expires_at` | timestamp with time zone | YES |  |

### Relationships (foreign keys)

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

---

