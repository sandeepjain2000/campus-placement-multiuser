"""Normalize heterogeneous XLSX columns into runner fields (Demo Email, Target Route, Role)."""
from __future__ import annotations

import re
from copy import deepcopy

ROLE_EMAIL: dict[str, str] = {
    "student": "arjun.verma@iitm.edu",
    "employer": "hr@techcorp.com",
    "college_admin": "admin@iitm.edu",
    "super_admin": "admin@placementhub.com",
}

ROLE_HOME_ROUTE: dict[str, str] = {
    "student": "/dashboard/student",
    "employer": "/dashboard/employer",
    "college_admin": "/dashboard/college",
    "super_admin": "/dashboard/admin",
}

_ROUTE_RE = re.compile(r"(/[\w\-./]+)")


def _first_nonempty(raw: dict, *keys: str) -> str:
    for k in keys:
        v = (raw.get(k) or "").strip()
        if v:
            return v
    return ""


def infer_role_from_route(route: str) -> str:
    if "/dashboard/student" in route or route.startswith("/dashboard/student"):
        return "student"
    if "/dashboard/employer" in route:
        return "employer"
    if "/dashboard/college" in route:
        return "college_admin"
    if "/dashboard/admin" in route or route.startswith("/data-entry"):
        return "super_admin"
    return ""


def parse_role(raw: dict) -> str:
    explicit = _first_nonempty(
        raw,
        "Role",
        "Owner Role",
        "Actor Role",
        "Actor role",
    )
    if explicit and explicit.lower() not in ("all", "any"):
        return explicit.split(",")[0].strip()

    roles = (raw.get("Roles") or "").strip()
    if roles and roles.lower() not in ("all", "any"):
        return roles.split(",")[0].strip()

    primary = (raw.get("Primary Actor") or "").strip()
    if primary and primary.lower() not in ("all", "any"):
        return primary.split(",")[0].strip()

    route = parse_route(raw)
    if route:
        inferred = infer_role_from_route(route)
        if inferred:
            return inferred
    return "student"


def parse_route(raw: dict) -> str:
    raw_route = _first_nonempty(
        raw,
        "Target Route",
        "Route",
        "Transaction Route",
        "Actor Route",
        "Owner Route",
        "Screen Route",
        "Intended Viewer Route",
        "Post Upload Verify Route",
        "Owner Route",
    )
    if not raw_route:
        return ""

    if raw_route.lower().startswith("all ") or "/**" in raw_route:
        return ""

    m = _ROUTE_RE.search(raw_route)
    if not m:
        return ""
    path = m.group(1).rstrip("/")
    if path.endswith("(shell)"):
        path = path.replace("(shell)", "").rstrip()
    return path or ""


def parse_email(raw: dict, role: str) -> str:
    email = _first_nonempty(
        raw,
        "Demo Email",
        "Account Email",
        "Owner Email",
        "Actor Email",
        "Primary Actor Email",
        "Intended Viewer Email",
    )
    if email:
        return email
    return ROLE_EMAIL.get(role, ROLE_EMAIL["student"])


def parse_password(raw: dict) -> str:
    return _first_nonempty(
        raw,
        "Demo Password",
        "Account Password",
        "Owner Password",
        "Actor Password",
    ) or "Admin@123"


def parse_steps(raw: dict) -> str:
    return _first_nonempty(
        raw,
        "Steps",
        "Execution Steps",
        "Flow Steps",
        "Test Steps",
        "Verification Steps",
        "Mail Verification Steps",
        "Steps (summary)",
    )


def parse_expected(raw: dict) -> str:
    return _first_nonempty(
        raw,
        "Expected Result",
        "Expected",
        "Checks",
        "Acceptance criteria (summary)",
    )


def parse_case_type(raw: dict) -> str:
    t = _first_nonempty(raw, "Type")
    if t:
        return t
    if (raw.get("Category") or "").startswith("C-1"):
        return "positive_navigation"
    return "positive_navigation"


def normalize_raw(raw: dict) -> dict:
    """Return a copy of raw with Demo Email, Target Route, Role, Steps, Expected Result filled."""
    out = deepcopy(raw)
    role = parse_role(out)
    email = parse_email(out, role)
    route = parse_route(out)
    if not route:
        route = ROLE_HOME_ROUTE.get(role, ROLE_HOME_ROUTE["student"])

    out["Role"] = role
    out["Demo Email"] = email
    out["Demo Password"] = parse_password(out)
    out["Target Route"] = route
    if not (out.get("Type") or "").strip():
        out["Type"] = parse_case_type(out)
    if not (out.get("Steps") or "").strip():
        steps = parse_steps(out)
        if steps:
            out["Steps"] = steps
        elif route:
            out["Steps"] = f"Login with demo account\nNavigate to {route}\nWait for page to load completely"
    if not (out.get("Expected Result") or "").strip():
        exp = parse_expected(out)
        if exp:
            out["Expected Result"] = exp
        else:
            out["Expected Result"] = (
                "Target screen opens successfully\n"
                "No runtime error banner/toast/modal is shown\n"
                "No crash/blank screen is observed"
            )
    return out


def normalize_case(case: dict) -> dict:
    raw = normalize_raw(case.get("raw") or {})
    case["raw"] = raw
    case["persona"] = raw.get("Role") or case.get("persona") or ""
    if not (case.get("steps") or "").strip():
        case["steps"] = raw.get("Steps") or parse_steps(raw)
    if not (case.get("expected") or "").strip():
        case["expected"] = raw.get("Expected Result") or parse_expected(raw)
    if not (case.get("title") or "").strip() or case.get("title") == case.get("id"):
        case["title"] = raw.get("Title") or case.get("id")
    return case


def execution_fields(case: dict) -> tuple[str, str, str, str]:
    """(email, role, target_route, case_type) for Playwright runner."""
    raw = case.get("raw") or {}
    role = parse_role(raw)
    email = parse_email(raw, role)
    route = parse_route(raw) or ROLE_HOME_ROUTE.get(role, ROLE_HOME_ROUTE["student"])
    case_type = parse_case_type(raw)
    return email, role, route, case_type
