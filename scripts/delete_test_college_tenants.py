#!/usr/bin/env python3
"""
Delete test college tenants (and cascaded data) while keeping core demo campuses.

Keeps: iit-madras, nit-trichy, bits-pilani (+ their users/students/employers elsewhere).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent

PROTECTED_SLUGS = frozenset({"iit-madras", "nit-trichy", "bits-pilani"})

# College admins from QA / registration tests (not core demo logins).
TEST_ADMIN_EMAILS = frozenset(
    e.lower()
    for e in [
        "aetv@gmail.com",
        "ajk@hello.com",
        "arjun.verma.qa+01@example.com",
        "ayushjha073@gmail.com",
        "college@gmail.com",
        "john.doe@example.com",
        "abc_123@gmail.com",
        "aditya@gmail.com",
        "admin@jadavpur.edu",
        "amarsingh1@gmail.com",
        "arushi.sharma@gmail.com",
        "avcs@gmail.com",
        "dharmavaramtanushree@gmail.com",
        "gaurvi.jain@mitwpu.edu.in",
        "hh@gmail.com",
        "iitmadras_new_admin@placementhub.com",
        "tpo@sbssugsp.ac.in",
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


def resolve_delete_ids(cur) -> list[tuple[str, str, str]]:
    cur.execute(
        """
        SELECT DISTINCT t.id::text, t.slug, t.name
        FROM tenants t
        INNER JOIN users u ON u.tenant_id = t.id
        WHERE t.type = 'college'
          AND t.slug <> ALL(%s)
          AND LOWER(u.email) = ANY(%s)
        ORDER BY t.name
        """,
        (list(PROTECTED_SLUGS), list(TEST_ADMIN_EMAILS)),
    )
    return cur.fetchall()


def purge_blocking_rows(cur, tenant_ids: list[str]) -> dict[str, int]:
    """Remove rows that block ON DELETE RESTRICT before tenant delete."""
    purged: dict[str, int] = {}

    cur.execute(
        """
        DELETE FROM employer_assessment_rows ear
        USING student_profiles sp
        WHERE ear.student_profile_id = sp.id
          AND sp.tenant_id = ANY(%s::uuid[])
        """,
        (tenant_ids,),
    )
    purged["employer_assessment_rows"] = cur.rowcount

    cur.execute(
        """
        DELETE FROM employer_assessment_contexts
        WHERE tenant_id = ANY(%s::uuid[])
        """,
        (tenant_ids,),
    )
    purged["employer_assessment_contexts"] = cur.rowcount

    cur.execute(
        """
        DELETE FROM employer_assessment_import_sessions
        WHERE tenant_id = ANY(%s::uuid[])
        """,
        (tenant_ids,),
    )
    purged["employer_assessment_import_sessions"] = cur.rowcount

    cur.execute(
        """
        DELETE FROM employer_assessment_uploads
        WHERE tenant_id = ANY(%s::uuid[])
        """,
        (tenant_ids,),
    )
    purged["employer_assessment_uploads"] = cur.rowcount

    return purged


def count_related(cur, tenant_ids: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    checks = [
        ("users", "tenant_id"),
        ("student_profiles", "tenant_id"),
        ("employer_approvals", "tenant_id"),
        ("job_posting_visibility", "tenant_id"),
        ("placement_drives", "tenant_id"),
    ]
    for table, col in checks:
        cur.execute(
            f"SELECT COUNT(*)::int FROM {table} WHERE {col} = ANY(%s::uuid[])",
            (tenant_ids,),
        )
        counts[table] = cur.fetchone()[0]
    return counts


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    url = os.environ.get("DATABASE_URL") or load_database_url()
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    rows = resolve_delete_ids(cur)
    if not rows:
        print("No test college tenants matched.")
        return 0

    tenant_ids = [r[0] for r in rows]
    print(f"Tenants to delete ({len(rows)}):")
    for tid, slug, name in rows:
        print(f"  - {name} ({slug}) {tid}")

    counts = count_related(cur, tenant_ids)
    print("Related rows (will cascade):")
    for k, v in counts.items():
        print(f"  {k}: {v}")

    if dry_run:
        print("Dry run — no changes committed.")
        conn.rollback()
        return 0

    purged = purge_blocking_rows(cur, tenant_ids)
    if any(purged.values()):
        print("Pre-delete purge:")
        for k, v in purged.items():
            if v:
                print(f"  {k}: {v}")

    cur.execute(
        """
        DELETE FROM tenants
        WHERE id = ANY(%s::uuid[])
          AND slug <> ALL(%s)
        RETURNING id, slug, name
        """,
        (tenant_ids, list(PROTECTED_SLUGS)),
    )
    deleted = cur.fetchall()
    conn.commit()
    print(f"Deleted {len(deleted)} tenant(s).")
    for tid, slug, name in deleted:
        print(f"  OK {name} ({slug})")

    cur.execute(
        """
        SELECT slug, name FROM tenants
        WHERE type = 'college' AND is_active = true
        ORDER BY name
        """
    )
    print("Remaining colleges:")
    for slug, name in cur.fetchall():
        print(f"  - {name} ({slug})")

    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
