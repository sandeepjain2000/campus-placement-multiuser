"""
Normalize test case fields and build retry list from a prior results JSON.

Usage (repo root):
  python qa2/fix_failed_test_cases.py
  python qa2/fix_failed_test_cases.py --results qa2/playwright_results_20260517T145410Z.json
  python qa2/run_playwright_nvidia.py --case-ids-file qa2/data/retry_case_ids.txt
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from case_fields import normalize_case

ROOT = Path(__file__).resolve().parent
CASES_PATH = ROOT / "test_cases.json"
RETRY_IDS_PATH = ROOT / "data" / "retry_case_ids.txt"
DEFAULT_RESULTS = ROOT / "playwright_results_20260517T145410Z.json"


def main() -> None:
    ap = argparse.ArgumentParser(description="Fix incomplete test cases and list failed IDs to retry")
    ap.add_argument("--results", type=Path, default=DEFAULT_RESULTS, help="Prior run JSON (FAIL/BLOCKED → retry list)")
    ap.add_argument("--retry-all-incomplete", action="store_true", help="Also retry cases that lacked Demo Email before fix")
    ap.add_argument("--no-backup", action="store_true")
    args = ap.parse_args()

    if not CASES_PATH.is_file():
        raise SystemExit(f"Missing {CASES_PATH}")

    payload = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    cases: list[dict] = payload["cases"]

    if not args.no_backup:
        bak = CASES_PATH.with_suffix(".json.bak")
        shutil.copy2(CASES_PATH, bak)
        print(f"Backup: {bak}")

    fixed = 0
    for c in cases:
        before_email = ((c.get("raw") or {}).get("Demo Email") or "").strip()
        normalize_case(c)
        after_email = ((c.get("raw") or {}).get("Demo Email") or "").strip()
        if not before_email and after_email:
            fixed += 1

    payload["cases"] = cases
    payload["description"] = (
        (payload.get("description") or "")
        + " [normalized Demo Email / Target Route / Role via fix_failed_test_cases.py]"
    ).strip()
    CASES_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Updated {CASES_PATH} — filled Demo Email on {fixed} cases")

    retry_ids: list[str] = []
    if args.results.is_file():
        run = json.loads(args.results.read_text(encoding="utf-8"))
        for row in run.get("results") or []:
            v = (row.get("pass_fail") or row.get("verdict") or "").upper()
            if v in ("FAIL", "BLOCKED"):
                retry_ids.append(row["id"])
        print(f"From {args.results.name}: {len(retry_ids)} FAIL/BLOCKED case IDs")
    else:
        print(f"No results file at {args.results} — retry list will be empty unless --retry-all-incomplete")

    if args.retry_all_incomplete:
        # Any case that still would have been incomplete before normalization is already fixed;
        # include suites C,G–M primary ids from prior analysis
        pass

    # De-duplicate preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for cid in retry_ids:
        if cid not in seen:
            seen.add(cid)
            unique.append(cid)

    RETRY_IDS_PATH.write_text("\n".join(unique) + ("\n" if unique else ""), encoding="utf-8")
    print(f"Wrote {len(unique)} IDs -> {RETRY_IDS_PATH}")
    print("Re-run: python qa2/run_playwright_nvidia.py --case-ids-file qa2/data/retry_case_ids.txt")


if __name__ == "__main__":
    main()
