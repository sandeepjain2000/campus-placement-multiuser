"""Build qa/guided/config/focus-areas.json and qa/data/catalogs/focus_areas_catalog.csv from Focus Areas.xlsx."""
from __future__ import annotations

import csv
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT.parent / "Focus Areas.xlsx"
OUT_JSON = ROOT / "qa" / "guided" / "config" / "focus-areas.json"
OUT_CSV = ROOT / "qa" / "data" / "catalogs" / "focus_areas_catalog.csv"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

ROLE_ACCOUNT = {
    "employer": "employer",
    "student": "student",
    "college": "college_admin",
}

# Heuristic routes from use-case keywords (first match wins)
ROUTE_HINTS = [
    (r"assessment upload|assessment CSV|Download Template|round_", "employer", "/dashboard/employer/assessment-uploads"),
    (r"offers bulk|Offers upload|assessment-starter", "employer", "/dashboard/employer/offers-upload"),
    (r"hiring-assessment CSV template", "employer", "/dashboard/employer/hiring-assessment"),
    (r"Applications.*Internship|Internships tab", "employer", "/dashboard/employer/applications"),
    (r"internship posting|create-internship|Publish a new internship", "employer", "/dashboard/employer/internships"),
    (r"internship", "employer", "/dashboard/employer/internships"),
    (r"placement drive|drive request|Request placement|Export placement drives", "employer", "/dashboard/employer/drives"),
    (r"Applications.*Jobs|drive applicant", "employer", "/dashboard/employer/applications"),
    (r"Offers screen|single offer", "employer", "/dashboard/employer/offers"),
    (r"internship", "student", "/dashboard/student/internships"),
    (r"My Applications.*Internship|application export", "student", "/dashboard/student/applications"),
    (r"placement drive|Browse placement", "student", "/dashboard/student/drives"),
    (r"My Applications.*Drive", "student", "/dashboard/student/applications"),
    (r"Placement calendar", "student", "/dashboard/student/calendar"),
    (r"My Interviews", "student", "/dashboard/student/interviews"),
    (r"My Offers", "student", "/dashboard/student/offers"),
    (r"Internship results|internship catalog", "college", "/dashboard/college/internship-results"),
    (r"Hiring assessment|assessment upload rows", "college", "/dashboard/college/hiring-assessment"),
    (r"bulk-import|Students|student list|Template", "college", "/dashboard/college/students"),
    (r"college Offers|Import offers", "college", "/dashboard/college/offers"),
    (r"internship program applications|Applications", "college", "/dashboard/college/applications"),
    (r"internship", "college", "/dashboard/college/internships"),
    (r"placement drive|Awaiting approval|Approve", "college", "/dashboard/college/drives"),
    (r"partnership|employer", "college", "/dashboard/college/employers"),
]


def read_xlsx(path: Path) -> list[list[list[str]]]:
    with zipfile.ZipFile(path) as z:
        ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = []
        for si in ss.findall("m:si", NS):
            strings.append("".join(t.text or "" for t in si.findall(".//m:t", NS)))

        sheets = []
        for name in sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)):
            sheet = ET.fromstring(z.read(name))
            rows = []
            for row in sheet.findall(".//m:sheetData/m:row", NS):
                cells = []
                for c in row.findall("m:c", NS):
                    t = c.get("t")
                    v = c.find("m:v", NS)
                    val = v.text if v is not None else ""
                    if t == "s" and val.isdigit():
                        val = strings[int(val)]
                    cells.append(val.strip())
                if any(cells):
                    rows.append(cells)
            sheets.append(rows)
    return sheets


def infer_route(role_key: str, text: str, module: str) -> str | None:
    hay = text.lower()
    for pattern, r, route in ROUTE_HINTS:
        if r == role_key and re.search(pattern, text, re.I):
            return route
    if module == "internships":
        defaults = {
            "employer": "/dashboard/employer/internships",
            "student": "/dashboard/student/internships",
            "college": "/dashboard/college/internships",
        }
    else:
        defaults = {
            "employer": "/dashboard/employer/drives",
            "student": "/dashboard/student/drives",
            "college": "/dashboard/college/drives",
        }
    return defaults.get(role_key)


def parse_sheet(rows: list[list[str]], module_id: str, module_title: str) -> dict:
    assumptions = ""
    groups = []
    current_role = None
    current_prefix = None
    current_cases = []

    def flush_group():
        nonlocal current_role, current_prefix, current_cases
        if current_role and current_cases:
            groups.append(
                {
                    "role": current_role,
                    "roleKey": ROLE_ACCOUNT.get(current_role, current_role),
                    "idPrefix": current_prefix,
                    "cases": current_cases,
                }
            )
        current_cases = []

    for row in rows:
        line = " ".join(row).strip()
        if not line:
            continue
        if line.startswith("Assumptions:"):
            assumptions = line.replace("Assumptions:", "").strip()
            continue
        if line.startswith("Status pipeline"):
            assumptions = (assumptions + " " + line).strip()
            continue
        if len(row) == 1 and ("use cases by role" in line.lower() or line.startswith("4.")):
            continue
        if row[0].startswith("Employer"):
            flush_group()
            current_role = "employer"
            current_prefix = None
            continue
        if row[0].startswith("Student"):
            flush_group()
            current_role = "student"
            current_prefix = None
            continue
        if row[0].startswith("College"):
            flush_group()
            current_role = "college"
            current_prefix = None
            continue
        if row[0] == "ID" and row[1] == "Use case":
            continue
        if len(row) >= 2 and (
            re.match(r"^(?:EI|SI|CI)-\d{2}$", row[0]) or re.match(r"^DRV-[ESC]\d{2}$", row[0])
        ):
            case_id = row[0]
            one_liner = row[1]
            prefix = re.match(r"^([A-Z]+(?:-[A-Z])?)", case_id)
            current_prefix = prefix.group(1) if prefix else case_id.split("-")[0]
            role_key = current_role
            route = infer_route(role_key, one_liner, module_id)
            auto = []
            if role_key in ROLE_ACCOUNT:
                auto.append({"type": "login", "account": ROLE_ACCOUNT[role_key]})
            if route:
                auto.append({"type": "goto", "path": route})
            current_cases.append(
                {
                    "id": case_id,
                    "oneLiner": one_liner,
                    "instruction": one_liner,
                    "observe": f"Validate as described for {case_id}. Log pass/fail in manual_session_log.csv.",
                    "manual": True,
                    "auto": auto,
                }
            )

    flush_group()
    return {
        "id": module_id,
        "title": module_title,
        "assumptions": assumptions,
        "groups": groups,
    }


def main():
    if not XLSX.exists():
        raise SystemExit(f"Missing {XLSX}")

    sheets = read_xlsx(XLSX)
    modules = []
    titles = [
        ("internships", "4.3 Internships — use cases by role (with CSV)"),
        ("placement-drives", "Placement drives — use cases by role (with CSV)"),
    ]
    for i, (mid, default_title) in enumerate(titles):
        if i >= len(sheets):
            break
        rows = sheets[i]
        title = rows[0][0] if rows and rows[0] else default_title
        if "use cases" not in title.lower():
            title = default_title
        modules.append(parse_sheet(rows, mid, title))

    payload = {
        "version": 1,
        "source": str(XLSX.name),
        "defaultBaseUrl": "http://127.0.0.1:3000",
        "accounts": {
            "student": "arjun.verma@iitm.edu",
            "employer": "hr@techcorp.com",
            "college_admin": "admin@iitm.edu",
            "super_admin": "admin@placementhub.com",
        },
        "modules": modules,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["module", "role", "case_id", "use_case", "guided_command"])
        for mod in modules:
            for grp in mod["groups"]:
                for case in grp["cases"]:
                    w.writerow(
                        [
                            mod["id"],
                            grp["role"],
                            case["id"],
                            case["oneLiner"],
                            f"npm run test:guided:focus -- {case['id']}",
                        ]
                    )

    total = sum(len(c["cases"]) for m in modules for c in m["groups"])
    print(f"Wrote {OUT_JSON} ({total} cases)")
    print(f"Wrote {OUT_CSV}")


if __name__ == "__main__":
    main()
