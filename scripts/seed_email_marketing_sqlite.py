#!/usr/bin/env python3
"""
Create/update a SQLite table for email-marketing website sources.

Usage:
  python scripts/seed_email_marketing_sqlite.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


URLS = [
    "http://cuo.ac.in/",
    "http://evisitors.nic.in/",
    "http://rusa.nic.in/",
    "http://www.amu.ac.in/",
    "http://www.aus.ac.in/",
    "http://www.bbau.ac.in/",
    "http://www.bhu.ac.in/",
    "http://www.cuh.ac.in/",
    "http://www.cuhimachal.ac.in/",
    "http://www.cuj.ac.in/",
    "http://www.cujammu.ac.in/",
    "http://www.cuk.ac.in/",
    "http://www.cukashmir.ac.in/",
    "http://www.cup.ac.in/",
    "http://www.curaj.ac.in/",
    "http://www.nvsp.in/",
    "http://www.sanskrit.nic.in/",
    "https://cau.ac.in/",
    "https://cutn.ac.in/",
    "https://dhsgsu.edu.in/",
    "https://gsv.ac.in/",
    "https://parichay.nic.in/",
    "https://scholarship.canarabank.in/",
    "https://www.aicte-india.org/",
    "https://www.cug.ac.in/",
    "https://www.cukerala.ac.in/",
    "https://www.cusb.ac.in/",
    "https://www.efluniversity.ac.in/",
    "https://www.nta.ac.in/",
    "https://www.rpcau.ac.in/",
]


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    sqlite_dir = repo_root / "db" / "sqlite"
    sqlite_dir.mkdir(parents=True, exist_ok=True)

    db_path = sqlite_dir / "email_marketing.sqlite"
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL;")

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS email_marketing_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_url TEXT NOT NULL UNIQUE,
            channel TEXT NOT NULL DEFAULT 'email_marketing',
            source_label TEXT NOT NULL DEFAULT 'manual_seed_apr_2026',
            segment TEXT NOT NULL DEFAULT 'education',
            is_active INTEGER NOT NULL DEFAULT 1,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        """
    )

    for url in URLS:
        conn.execute(
            """
            INSERT INTO email_marketing_sources
                (website_url, channel, source_label, segment, is_active)
            VALUES
                (?, 'email_marketing', 'manual_seed_apr_2026', 'education', 1)
            ON CONFLICT(website_url) DO UPDATE SET
                is_active = 1,
                updated_at = datetime('now')
            """,
            (url,),
        )

    conn.commit()

    total_count = conn.execute("SELECT COUNT(*) FROM email_marketing_sources").fetchone()[0]
    active_count = conn.execute(
        "SELECT COUNT(*) FROM email_marketing_sources WHERE is_active = 1"
    ).fetchone()[0]

    conn.close()

    print(f"SQLite DB: {db_path}")
    print(f"Rows in email_marketing_sources: {total_count} (active: {active_count})")


if __name__ == "__main__":
    main()
