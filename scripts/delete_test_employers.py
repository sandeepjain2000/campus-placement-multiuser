#!/usr/bin/env python3
"""
Delete test / extra employer accounts while keeping core demo employers.

Keeps (login emails — same as /demo-accounts and src/lib/demoLogins.js):
  hr@techcorp.com          TechCorp Solutions
  hr@globalsoft.com        GlobalSoft Technologies
  hr@infosys.com           Infosys Limited
  talent@innoventlabs.ai   Innovent Labs
  careers@finedge.io       FinEdge Systems

Removes all other employer_profiles (jobs, drives, approvals, assessments cascade)
and employer-role users without a protected email.

Usage:
  py -3 scripts/delete_test_employers.py --dry-run
  py -3 scripts/delete_test_employers.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent

# Keep in sync with DEMO_LOGINS + SEEDED_EMPLOYER_CREDENTIALS in src/lib/demoLogins.js
PROTECTED_EMPLOYER_EMAILS = frozenset(
    e.lower()
    for e in [
        "hr@techcorp.com",
        "hr@globalsoft.com",
        "hr@infosys.com",
        "talent@innoventlabs.ai",
        "careers@finedge.io",
    ]
)


def load_database_url() -> str:
    env_path = ROOT / ".env.local"
    if not env_path.is_file():
        raise SystemExit(".env.local not found")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("DATABASE_URL missing in .env.local")


def resolve_profiles_to_delete(cur) -> list[tuple[str, str, str, str]]:
    cur.execute(
        """
        SELECT ep.id::text, ep.company_name, u.email, u.id::text
        FROM employer_profiles ep
        INNER JOIN users u ON u.id = ep.user_id
        WHERE LOWER(u.email) <> ALL(%s)
        ORDER BY ep.company_name, u.email
        """,
        (list(PROTECTED_EMPLOYER_EMAILS),),
    )
    return cur.fetchall()


def resolve_orphan_employer_users(cur) -> list[tuple[str, str]]:
    """Employer login rows with no profile (registration tests, abandoned signups)."""
    cur.execute(
        """
        SELECT u.id::text, u.email
        FROM users u
        WHERE u.role = 'employer'
          AND LOWER(u.email) <> ALL(%s)
          AND NOT EXISTS (
            SELECT 1 FROM employer_profiles ep WHERE ep.user_id = u.id
          )
        ORDER BY u.email
        """,
        (list(PROTECTED_EMPLOYER_EMAILS),),
    )
    return cur.fetchall()


def count_profile_related(cur, employer_ids: list[str]) -> dict[str, int]:
    if not employer_ids:
        return {}
    counts: dict[str, int] = {}
    checks = [
        ("job_postings", "employer_id"),
        ("placement_drives", "employer_id"),
        ("employer_approvals", "employer_id"),
        ("offers", "employer_id"),
        ("employer_assessment_uploads", "employer_id"),
        ("employer_ratings", "employer_id"),
    ]
    for table, col in checks:
        cur.execute(
            f"SELECT COUNT(*)::int FROM {table} WHERE {col} = ANY(%s::uuid[])",
            (employer_ids,),
        )
        counts[table] = cur.fetchone()[0]
    return counts


def purge_auxiliary_rows(cur, employer_ids: list[str]) -> dict[str, int]:
    """Rows without ON DELETE CASCADE to employer_profiles."""
    purged: dict[str, int] = {}
    if not employer_ids:
        return purged

    cur.execute(
        """
        DELETE FROM email_template_overrides
        WHERE scope_type = 'employer'
          AND scope_id = ANY(%s::uuid[])
        """,
        (employer_ids,),
    )
    purged["email_template_overrides"] = cur.rowcount

    cur.execute(
        """
        DELETE FROM demo_purge_transactions
        WHERE entity_type IN ('job', 'internship', 'drive')
          AND entity_id IN (
            SELECT id FROM job_postings WHERE employer_id = ANY(%s::uuid[])
            UNION ALL
            SELECT id FROM placement_drives WHERE employer_id = ANY(%s::uuid[])
          )
        """,
        (employer_ids, employer_ids),
    )
    purged["demo_purge_transactions"] = cur.rowcount

    return purged


def list_remaining_employers(cur) -> list[tuple[str, str, str]]:
    cur.execute(
        """
        SELECT ep.company_name, u.email, ep.id::text
        FROM employer_profiles ep
        INNER JOIN users u ON u.id = ep.user_id
        ORDER BY ep.company_name
        """
    )
    return cur.fetchall()


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    url = os.environ.get("DATABASE_URL") or load_database_url()
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    profiles = resolve_profiles_to_delete(cur)
    orphans = resolve_orphan_employer_users(cur)

    if not profiles and not orphans:
        print("No test employers matched — only protected demo accounts remain.")
        remaining = list_remaining_employers(cur)
        print(f"Employers in DB ({len(remaining)}):")
        for name, email, _eid in remaining:
            print(f"  - {name} ({email})")
        return 0

    employer_ids = [row[0] for row in profiles]

    print("Protected demo employer emails:")
    for email in sorted(PROTECTED_EMPLOYER_EMAILS):
        print(f"  + {email}")

    if profiles:
        print(f"\nEmployer profiles to delete ({len(profiles)}):")
        for eid, company, email, uid in profiles:
            print(f"  - {company} ({email}) profile={eid} user={uid}")

        counts = count_profile_related(cur, employer_ids)
        print("\nRelated rows (cascade on profile delete):")
        for k, v in counts.items():
            if v:
                print(f"  {k}: {v}")

    if orphans:
        print(f"\nOrphan employer users to delete ({len(orphans)}):")
        for uid, email in orphans:
            print(f"  - {email} user={uid}")

    if dry_run:
        print("\nDry run — no changes committed.")
        conn.rollback()
        return 0

    if employer_ids:
        aux = purge_auxiliary_rows(cur, employer_ids)
        if any(aux.values()):
            print("\nPre-delete cleanup:")
            for k, v in aux.items():
                if v:
                    print(f"  {k}: {v}")

        cur.execute(
            """
            DELETE FROM employer_profiles
            WHERE id = ANY(%s::uuid[])
            RETURNING id, company_name
            """,
            (employer_ids,),
        )
        deleted_profiles = cur.fetchall()
        print(f"\nDeleted {len(deleted_profiles)} employer profile(s).")

    if orphans:
        orphan_ids = [row[0] for row in orphans]
        cur.execute(
            """
            DELETE FROM users
            WHERE id = ANY(%s::uuid[])
              AND role = 'employer'
            RETURNING email
            """,
            (orphan_ids,),
        )
        deleted_users = cur.fetchall()
        print(f"Deleted {len(deleted_users)} orphan employer user(s).")

    conn.commit()

    remaining = list_remaining_employers(cur)
    print(f"\nRemaining employers ({len(remaining)}):")
    for name, email, _eid in remaining:
        print(f"  - {name} ({email})")

    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
