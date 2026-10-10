"""Export agent run to CSV/markdown with explicit Pass/Fail column."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPORTS_DIR = ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_RESULTS = ROOT / "agent_results_20260516T154639Z.json"


def latest_results_file() -> Path:
    candidates = sorted(ROOT.glob("playwright_results_*.json"), reverse=True)
    if candidates:
        return candidates[0]
    candidates = sorted(ROOT.glob("agent_results_*.json"), reverse=True)
    return candidates[0] if candidates else DEFAULT_RESULTS
CASES_FILE = ROOT / "test_cases.json"


def parse_verdict_from_text(text):
    if not text:
        return None, None
    s = str(text).strip()
    m = re.search(r'"verdict"\s*:\s*"(PASS|FAIL|BLOCKED)"', s, re.I)
    if not m:
        m = re.search(r'verdict["\']?\s*[:=]\s*["\']?(PASS|FAIL|BLOCKED)', s, re.I)
    if not m:
        return None, None
    verdict = m.group(1).upper()
    summary = None
    try:
        if "{" in s:
            blob = json.loads(s[s.find("{") : s.rfind("}") + 1])
            if isinstance(blob, dict):
                summary = (blob.get("summary") or "").strip() or None
    except (json.JSONDecodeError, ValueError):
        pass
    return verdict, summary


def pass_fail_for_row(r: dict) -> tuple[str, str]:
    """
    Return (Pass/Fail column, notes).
    Uses pass_fail/verdict from runner when present; else parses final_text.
    """
    if r.get("status") == "error":
        return "ERROR", r.get("error", "")[:120]

    usage = r.get("usage") or {}
    tokens = int(usage.get("total_tokens") or 0)
    if r.get("status") == "completed" and tokens == 0:
        return "INCONCLUSIVE", "Hollow run (0 LLM tokens — agent did not execute)"

    pf = (r.get("pass_fail") or r.get("verdict") or "").strip().upper()
    if pf and pf not in ("N/A", ""):
        notes = (r.get("verdict_summary") or "")[:120]
        src = r.get("verdict_source", "")
        if src:
            notes = f"[{src}] {notes}".strip()
        return pf, notes

    verdict = (r.get("verdict") or "").strip().upper()
    if verdict in ("PASS", "FAIL", "BLOCKED"):
        return verdict, (r.get("verdict_summary") or "")[:120]

    v, sm = parse_verdict_from_text(r.get("final_text"))
    if v:
        return v, (sm or "")[:120]

    if r.get("agent_reported_success") is True:
        return "PASS*", "Inferred from agent success flag (no JSON verdict)"
    if r.get("agent_reported_success") is False:
        return "FAIL*", "Inferred from agent success flag (no JSON verdict)"

    return "N/A", "Verdict not captured in this run (re-run with updated run_agent_cloud.py)"


def route_from_case(case):
    if not case:
        return "—"
    return (case.get("raw") or {}).get("Target Route") or "—"


def role_from_case(case):
    if not case:
        return "—"
    return case.get("persona") or (case.get("raw") or {}).get("Role") or "—"


def main():
    results_path = Path(sys.argv[1]) if len(sys.argv) > 1 else latest_results_file()
    results_doc = json.loads(results_path.read_text(encoding="utf-8"))
    offset = int(results_doc.get("caseOffset") or 0)
    suffix = (
        f"playwright_100_offset{offset}"
        if "playwright_results" in results_path.name and offset
        else ("playwright_100" if "playwright_results" in results_path.name else "100")
    )
    out_csv = REPORTS_DIR / f"test_results_{suffix}.csv"
    out_md = REPORTS_DIR / f"test_results_{suffix}.md"

    cases_by_id = {c["id"]: c for c in json.loads(CASES_FILE.read_text(encoding="utf-8"))["cases"]}
    rows_data = results_doc["results"]

    table = []
    for i, r in enumerate(rows_data, 1):
        tc = cases_by_id.get(r["id"], {})
        usage = r.get("usage") or {}
        pass_fail, notes = pass_fail_for_row(r)
        table.append(
            {
                "#": i,
                "Test Case ID": r["id"],
                "Suite": r.get("suite", "—"),
                "Kind": tc.get("kind", "—"),
                "Role": role_from_case(tc),
                "Route": route_from_case(tc),
                "Run Status": r.get("status", "—"),
                "Pass/Fail": pass_fail,
                "Notes": notes,
                "Tokens": usage.get("total_tokens", 0),
            }
        )

    headers = list(table[0].keys())
    out_csv.write_text(
        "\n".join(
            [",".join(headers)]
            + [",".join(str(row[h]).replace(",", ";").replace("\n", " ") for h in headers) for row in table]
        ),
        encoding="utf-8",
    )

    pf_counts: dict[str, int] = {}
    for row in table:
        pf_counts[row["Pass/Fail"]] = pf_counts.get(row["Pass/Fail"], 0) + 1

    md = [
        "# QA2 test execution results",
        "",
        "| Field | Value |",
        "|-------|-------|",
        f"| Results file | `{results_path.name}` |",
        f"| Run ID | `{results_doc.get('generatedAt', '')}` |",
        f"| Base URL | {results_doc.get('baseUrl', '')} |",
        f"| Cases | {len(table)} |",
        f"| Case offset | {offset} |",
        "",
        "## Pass/Fail summary",
        "",
        "| Pass/Fail | Count |",
        "|-----------|------:|",
    ]
    for k, c in sorted(pf_counts.items(), key=lambda x: (-x[1], x[0])):
        md.append(f"| {k} | {c} |")
    note = (
        "> Playwright + NVIDIA verdict run — **Pass/Fail** from `pass_fail` / `verdict` in results JSON."
        if "playwright_results" in results_path.name
        else "> **N/A** = agent run without a saved verdict. Re-run with `run_agent_cloud.py` (updated) or `run_playwright_nvidia.py`."
    )
    md.extend(
        [
            "",
            note,
            "",
            "## All cases",
            "",
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join("---" for _ in headers) + " |",
        ]
    )
    for row in table:
        md.append("| " + " | ".join(str(row[h]).replace("|", "\\|") for h in headers) + " |")
    out_md.write_text("\n".join(md), encoding="utf-8")

    print(f"Wrote {out_csv} and {out_md}")
    print("Pass/Fail summary:", pf_counts)


if __name__ == "__main__":
    main()
