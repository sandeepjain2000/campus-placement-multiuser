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
