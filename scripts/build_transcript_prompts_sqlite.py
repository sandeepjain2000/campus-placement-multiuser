"""
Scan Cursor agent-transcript .jsonl files and build a SQLite DB of user prompts + times.
Usage:
  python scripts/build_transcript_prompts_sqlite.py [path-to-transcripts-dir] [output.db]
Defaults use this project's Cursor transcript folder and data/cursor_prompts.sqlite.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

TS_RE = re.compile(r"<timestamp>([^<]+)</timestamp>", re.I)
UQ_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL | re.I)


def default_transcript_dir() -> Path:
    # Cursor stores transcripts under ~/.cursor/projects/<slug>/agent-transcripts
    return (
        Path.home()
        / ".cursor"
        / "projects"
        / "c-Users-sandeep-Downloads-Claudes-CampusPlacement-campus-placement"
        / "agent-transcripts"
    )


def extract_text_from_message(msg: dict) -> str:
    content = msg.get("message", {}).get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text")
                if t:
                    parts.append(str(t))
        return "\n".join(parts)
    return ""


def parse_prompt_and_time(raw: str) -> tuple[str | None, str]:
    ts = None
    m_ts = TS_RE.search(raw)
    if m_ts:
        ts = m_ts.group(1).strip()
    m_uq = UQ_RE.search(raw)
    if m_uq:
        prompt = m_uq.group(1).strip()
    else:
        prompt = TS_RE.sub("", raw).strip()
    return ts, prompt


def main() -> None:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else default_transcript_dir()
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "data" / "cursor_prompts.sqlite"

    if not base.is_dir():
        print(f"Transcript directory not found: {base}", file=sys.stderr)
        sys.exit(1)

    out.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(out)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transcript_id TEXT NOT NULL,
          source_file TEXT NOT NULL,
          line_number INTEGER NOT NULL,
          timestamp_display TEXT,
          prompt_text TEXT NOT NULL,
          raw_message TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompts_transcript ON prompts(transcript_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompts_time ON prompts(timestamp_display)")

    jsonl_files = sorted(base.glob("**/*.jsonl"))
    row_id = 0
    for fp in jsonl_files:
        transcript_id = fp.parent.name
        with fp.open(encoding="utf-8", errors="replace") as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if obj.get("role") != "user":
                    continue
                raw = extract_text_from_message(obj)
                if not raw.strip():
                    continue
                ts, prompt = parse_prompt_and_time(raw)
                if not prompt:
                    continue
                row_id += 1
                conn.execute(
                    """
                    INSERT INTO prompts (transcript_id, source_file, line_number, timestamp_display, prompt_text, raw_message)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (transcript_id, str(fp), line_num, ts, prompt, raw),
                )

    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM prompts").fetchone()[0]
    conn.close()
    print(f"Wrote {count} user prompts to {out}")


if __name__ == "__main__":
    main()
