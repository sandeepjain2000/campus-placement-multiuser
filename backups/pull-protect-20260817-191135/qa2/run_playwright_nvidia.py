"""
Option B: Playwright executes each case (login + navigation + page signals).
NVIDIA keys: one small chat call per case for PASS / FAIL / BLOCKED verdict only.

Usage (repo root):
  pip install -r qa2/requirements/requirements-playwright.txt
  playwright install chromium

  python qa2/run_playwright_nvidia.py --limit 100
  python qa2/export_results_table.py qa2/playwright_results_<stamp>.json

On abort (Ctrl+C, kill, crash): writes partial results + abort manifest under qa2/logs/.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import signal
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
CASES_PATH = ROOT / "test_cases.json"
LOG_DIR = ROOT / "logs"
DEFAULT_QA_BASE_URL = "https://campus-placement-omega.vercel.app"
NVIDIA_BASE_URL_DEFAULT = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL_DEFAULT = os.environ.get("NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct")

_LOG: logging.Logger | None = None

# Reuse key-folder resolution from agent runner
from case_fields import execution_fields, normalize_case  # noqa: E402
from run_agent_cloud import (  # noqa: E402
    DEFAULT_NVIDIA_KEYS_DIR,
    build_key_ring,
    load_cases,
    parse_verdict_from_text,
    resolve_keys_folder,
    rotatable_llm_error,
)

_VERDICT_JSON_RE = re.compile(r'\{[^{}]*"verdict"\s*:\s*"(PASS|FAIL|BLOCKED)"[^{}]*\}', re.I | re.DOTALL)

_abort_requested = False


def install_abort_handlers() -> None:
    def _handler(signum: int, _frame: object) -> None:
        global _abort_requested
        _abort_requested = True
        log().warning("Abort signal %s received; stopping after current case", signum)

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, _handler)
        except (ValueError, OSError):
            pass


def verdict_counts(results: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in results:
        v = r.get("pass_fail") or "?"
        counts[v] = counts.get(v, 0) + 1
    return counts


def build_results_payload(
    *,
    stamp: str,
    args: argparse.Namespace,
    results: list[dict],
    total_tokens: int,
    log_file: Path,
    run_status: str,
    total_cases: int,
    last_case_id: str | None,
    last_case_index: int,
    abort_reason: str | None = None,
    abort_traceback: str | None = None,
) -> dict[str, Any]:
    completed = len(results)
    return {
        "generatedAt": stamp,
        "caseOffset": args.offset,
        "caseLimit": args.limit,
        "baseUrl": args.base_url,
        "execution": "playwright+nvidia_verdict",
        "model": args.model,
        "runStatus": run_status,
        "completedCases": completed,
        "plannedCases": total_cases,
        "progressPct": round(100 * completed / total_cases, 1) if total_cases else 0,
        "lastCaseId": last_case_id,
        "lastCaseIndex": last_case_index,
        "abortReason": abort_reason,
        "abortTraceback": abort_traceback,
        "abortedAt": datetime.now(timezone.utc).isoformat() if run_status != "completed" else None,
        "totalTokens": total_tokens,
        "avgTokensPerCase": round(total_tokens / completed, 1) if completed else 0,
        "verdictCounts": verdict_counts(results),
        "logFile": str(log_file),
        "results": results,
    }


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp.replace(path)


def write_abort_manifest(
    path: Path,
    *,
    stamp: str,
    run_status: str,
    abort_reason: str | None,
    abort_traceback: str | None,
    completed: int,
    planned: int,
    last_case_id: str | None,
    last_case_index: int,
    log_file: Path,
    partial_results: Path,
    final_results: Path | None,
) -> None:
    manifest = {
        "runId": stamp,
        "runStatus": run_status,
        "abortReason": abort_reason or ("completed successfully" if run_status == "completed" else "unknown"),
        "abortTraceback": abort_traceback,
        "completedCases": completed,
        "plannedCases": planned,
        "lastCaseId": last_case_id,
        "lastCaseIndex": last_case_index,
        "finishedAt": datetime.now(timezone.utc).isoformat(),
        "logFile": str(log_file),
        "partialResultsFile": str(partial_results),
        "finalResultsFile": str(final_results) if final_results else None,
        "hint": (
            "Import partial results: python qa2/export_results_table.py "
            f"{partial_results.name}"
        ),
    }
    write_json_atomic(path, manifest)


def setup_logging(log_file: Path) -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("qa2.playwright_nvidia")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    for h in (logging.FileHandler(log_file, encoding="utf-8"), logging.StreamHandler()):
        h.setLevel(logging.DEBUG if isinstance(h, logging.FileHandler) else logging.INFO)
        h.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        logger.addHandler(h)
    return logger


def log() -> logging.Logger:
    global _LOG
    if _LOG is None:
        _LOG = logging.getLogger("qa2.playwright_nvidia")
    return _LOG


ROLE_DASHBOARD_PREFIX = {
    "student": "/dashboard/student",
    "employer": "/dashboard/employer",
    "college_admin": "/dashboard/college",
    "super_admin": "/dashboard/admin",
}


def login_as_demo(page, base_url: str, email: str, role: str | None = None, *, force: bool = False) -> None:
    """
    Sign in via /login?email=… (demo prefill).
    When switching accounts: clear cookies + force=1, then wait for the role's dashboard
    (avoids wait_for_url matching the previous user's /dashboard/* session).
    """
    if force:
        page.context.clear_cookies()
    q = f"force=1&email={email.replace('@', '%40')}" if force else f"email={email.replace('@', '%40')}"
    login_url = f"{base_url.rstrip('/')}/login?{q}"
    page.goto(login_url, wait_until="domcontentloaded", timeout=45_000)
    page.wait_for_selector("#login-email", state="visible", timeout=45_000)
    for _ in range(40):
        if page.input_value("#login-email") == email and len(page.input_value("#login-password") or "") > 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError(f"Login form not prefilled for {email} (url={page.url})")
    page.wait_for_function(
        "() => { const b = document.querySelector('#login-submit'); return b && !b.disabled; }",
        timeout=45_000,
    )
    page.click("#login-submit")
    dash = ROLE_DASHBOARD_PREFIX.get((role or "").strip())
    if dash:
        page.wait_for_url(f"**{dash}**", timeout=45_000)
    else:
        page.wait_for_url(re.compile(r".*/dashboard/"), timeout=45_000)


def collect_snapshot(page, base_url: str) -> dict:
    return page.evaluate(
        """() => {
          const text = (document.body?.innerText || '').slice(0, 2000);
          return {
            pathname: location.pathname,
            href: location.href,
            title: document.title,
            textLen: text.trim().length,
            textSample: text.slice(0, 600),
            headings: [...document.querySelectorAll('h1,h2')].slice(0, 5).map(h => h.innerText.trim()).filter(Boolean),
            hasRuntimeError: /Application error|Unhandled Runtime Error|TypeError:|ReferenceError:|Internal Server Error/i.test(text),
            has404: /404|not found/i.test(text) && text.length < 800,
            authBlocked: /sign in|log in|unauthorized|access denied|forbidden/i.test(text) && /login/i.test(location.pathname)
          };
        }"""
    )


def rule_hint(case: dict, snap: dict, target_route: str, case_type: str) -> str:
    path = snap.get("pathname") or ""
    on_target = path == target_route or path.startswith(target_route.rstrip("/") + "/")
    if snap.get("hasRuntimeError"):
        return "FAIL"
    if snap.get("authBlocked") or path == "/login":
        return "FAIL" if case_type == "positive_navigation" else "PASS"
    if case_type == "negative_authorization":
        return "PASS" if not on_target else "FAIL"
    # positive_navigation
    if on_target and snap.get("textLen", 0) > 60 and not snap.get("has404"):
        return "PASS"
    return "FAIL"


def nvidia_judge(
    client: OpenAI,
    *,
    model: str,
    case: dict,
    snap: dict,
    target_route: str,
    case_type: str,
    rule: str,
    playwright_error: str | None,
) -> tuple[str, str, dict]:
    raw = case.get("raw") or {}
    prompt = f"""You are a QA judge. Reply with ONE line of JSON only:
{{"verdict":"PASS"|"FAIL"|"BLOCKED","summary":"under 120 chars"}}

Verdict rules:
- positive_navigation: PASS if target route loaded without runtime error; else FAIL.
- negative_authorization: PASS if user was denied or redirected away from forbidden route; FAIL if they reached it; BLOCKED only if login/navigation failed before testing.
- BLOCKED means cannot test (missing data, login error), NOT "access was denied".

Test ID: {case.get("id")}
Type: {case_type}
Role: {raw.get("Role") or case.get("persona")}
Target route: {target_route}
Expected: {(case.get("expected") or "")[:400]}
Playwright error: {playwright_error or "none"}
Rule-based hint: {rule}
Observed pathname: {snap.get("pathname")}
Observed title: {snap.get("title")}
Text length: {snap.get("textLen")}
Runtime error on page: {snap.get("hasRuntimeError")}
Headings: {snap.get("headings")}
Text sample: {(snap.get("textSample") or "")[:400]}
"""
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Output only one JSON object line. No markdown."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=120,
    )
    text = (resp.choices[0].message.content or "").strip()
    usage = {
        "prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
        "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
        "total_tokens": resp.usage.total_tokens if resp.usage else 0,
    }
    verdict, summary = parse_verdict_from_text(text)
    if not verdict:
        m = _VERDICT_JSON_RE.search(text)
        if m:
            verdict = m.group(1).upper()
    if not verdict:
        verdict = rule if rule in ("PASS", "FAIL") else "BLOCKED"
        summary = summary or f"NVIDIA parse fallback; raw={text[:80]}"
    return verdict, summary or "", usage


def main() -> None:
    ap = argparse.ArgumentParser(description="Playwright execution + NVIDIA verdict per case")
    ap.add_argument("--base-url", default=os.environ.get("QA_BASE_URL", DEFAULT_QA_BASE_URL))
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--offset", type=int, default=0, help="Skip first N cases (e.g. 100 for batch 2)")
    ap.add_argument("--suite", help="Filter suite letter")
    ap.add_argument("--case-id", help="Single case id")
    ap.add_argument(
        "--case-ids-file",
        help="Text file with one case id per line (re-run only those cases)",
    )
    ap.add_argument("--nvidia-keys-dir", default=os.environ.get("NVIDIA_KEYS_DIR", ""))
    ap.add_argument("--nvidia-key-file", default=os.environ.get("NVIDIA_KEY_FILE", ""))
    ap.add_argument("--model", default=NVIDIA_MODEL_DEFAULT)
    ap.add_argument("--nvidia-base-url", default=os.environ.get("NVIDIA_API_BASE_URL", NVIDIA_BASE_URL_DEFAULT))
    args = ap.parse_args()

    run_limit = None if args.case_ids_file else args.limit
    cases = load_cases(
        args.suite,
        args.case_id,
        run_limit,
        args.offset,
        case_ids_file=args.case_ids_file,
    )
    cases = [normalize_case(c) for c in cases]
    if not cases:
        raise SystemExit("No cases matched")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_file = LOG_DIR / f"run_playwright_{stamp}.log"
    global _LOG
    _LOG = setup_logging(log_file)

    keys_folder = resolve_keys_folder(args.nvidia_keys_dir) if not args.nvidia_key_file else None
    key_ring = build_key_ring(keys_folder=keys_folder, key_file=args.nvidia_key_file)
    n_keys = len(key_ring)

    total_cases = len(cases)
    install_abort_handlers()

    out_path = ROOT / f"playwright_results_{stamp}.json"
    partial_path = ROOT / f"playwright_results_{stamp}.partial.json"
    abort_manifest_path = LOG_DIR / f"run_playwright_{stamp}_abort.json"

    log().info(
        "Playwright+NVIDIA: cases=%s offset=%s base=%s model=%s keys=%s",
        total_cases,
        args.offset,
        args.base_url,
        args.model,
        n_keys,
    )
    log().info(
        "Artifacts: log=%s partial=%s final=%s abort_manifest=%s",
        log_file,
        partial_path,
        out_path,
        abort_manifest_path,
    )

    results: list[dict] = []
    total_tokens = 0
    run_status = "running"
    abort_reason: str | None = None
    abort_traceback: str | None = None
    last_case_id: str | None = None
    last_case_index = -1

    def persist_checkpoint() -> None:
        payload = build_results_payload(
            stamp=stamp,
            args=args,
            results=results,
            total_tokens=total_tokens,
            log_file=log_file,
            run_status=run_status if run_status != "running" else "in_progress",
            total_cases=total_cases,
            last_case_id=last_case_id,
            last_case_index=last_case_index,
            abort_reason=abort_reason,
            abort_traceback=abort_traceback,
        )
        write_json_atomic(partial_path, payload)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            logged_in_email: str | None = None

            for i, case in enumerate(cases):
                if _abort_requested:
                    run_status = "aborted"
                    abort_reason = abort_reason or "Abort signal (SIGINT/SIGTERM)"
                    log().warning(
                        "RUN ABORTED after user signal: completed=%s/%s last_case=%s",
                        len(results),
                        total_cases,
                        last_case_id,
                    )
                    break

                last_case_index = i
                last_case_id = case["id"]
                raw = case.get("raw") or {}
                email, role, target_route, case_type = execution_fields(case)
                mobile = case.get("kind") == "companion" or case["id"].endswith("-COMP")

                row: dict = {
                    "id": case["id"],
                    "title": case.get("title"),
                    "suite": case.get("suite"),
                    "status": "completed",
                    "execution": "playwright",
                    "verdict_source": "nvidia",
                    "keyAttempts": [],
                }

                snap: dict = {}
                pw_err: str | None = None
                try:
                    if mobile:
                        page.set_viewport_size({"width": 390, "height": 844})
                    else:
                        page.set_viewport_size({"width": 1280, "height": 800})
                    if email != logged_in_email:
                        # See qa2/diagnose_login_timeout.py — without force/cookies, /login redirects to prior session.
                        login_as_demo(
                            page,
                            args.base_url,
                            email,
                            role,
                            force=logged_in_email is not None,
                        )
                        logged_in_email = email
                    nav_url = f"{args.base_url.rstrip('/')}{target_route}"
                    try:
                        page.goto(nav_url, wait_until="domcontentloaded", timeout=45_000)
                    except Exception as nav_exc:
                        # Next.js often aborts in-flight navigation on redirect — page may still be usable
                        if "ERR_ABORTED" not in str(nav_exc):
                            raise
                    page.wait_for_timeout(1200)
                    snap = collect_snapshot(page, args.base_url)
                    pw_err = None
                except Exception as e:
                    pw_err = f"{type(e).__name__}: {e}"
                    try:
                        stuck_url = page.url
                    except Exception:
                        stuck_url = ""
                    if stuck_url:
                        pw_err = f"{pw_err} (url={stuck_url})"
                    snap = {"pathname": "", "textLen": 0, "hasRuntimeError": True, "textSample": pw_err}
                    log().error("Playwright %s: %s", case["id"], pw_err)

                rule = rule_hint(case, snap, target_route, case_type)
                row["playwright"] = {"snapshot": snap, "rule_hint": rule, "error": pw_err}

                ki = i % n_keys
                order = [(ki + j) % n_keys for j in range(n_keys)]
                verdict = None
                summary = ""
                usage = {"total_tokens": 0}

                for attempt_idx, kidx in enumerate(order):
                    api_key, key_label = key_ring[kidx]
                    client = OpenAI(api_key=api_key, base_url=args.nvidia_base_url)
                    try:
                        log().info("Case %s (%s) NVIDIA key %s", case["id"], i + 1, key_label)
                        verdict, summary, usage = nvidia_judge(
                            client,
                            model=args.model,
                            case=case,
                            snap=snap,
                            target_route=target_route,
                            case_type=case_type,
                            rule=rule,
                            playwright_error=pw_err,
                        )
                        row["keyAttempts"].append({"key": key_label, "outcome": "success"})
                        row["nvidiaKeyUsed"] = key_label
                        break
                    except Exception as e:
                        row["keyAttempts"].append(
                            {"key": key_label, "outcome": "error", "error": f"{type(e).__name__}: {e}"}
                        )
                        log().error("NVIDIA %s: %s\n%s", case["id"], e, traceback.format_exc())
                        if rotatable_llm_error(e) and attempt_idx < len(order) - 1:
                            time.sleep(1.0)
                            continue
                        verdict = rule
                        summary = f"NVIDIA failed; used rule hint: {e}"
                        row["verdict_source"] = "rule_fallback"
                        break

                row["verdict"] = verdict
                row["pass_fail"] = verdict
                row["verdict_summary"] = summary
                row["usage"] = {
                    "total_tokens": usage.get("total_tokens", 0),
                    "total_prompt_tokens": usage.get("prompt_tokens", 0),
                    "total_completion_tokens": usage.get("completion_tokens", 0),
                    "entry_count": 1,
                }
                total_tokens += row["usage"]["total_tokens"]
                results.append(row)
                log().info("Case %s -> %s (%s)", case["id"], verdict, summary[:60])
                persist_checkpoint()

            browser.close()

        if run_status == "running" and len(results) >= total_cases:
            run_status = "completed"
        elif run_status == "running" and len(results) < total_cases:
            run_status = "aborted"
            abort_reason = abort_reason or "Loop ended before all cases (browser closed?)"

    except KeyboardInterrupt:
        run_status = "aborted"
        abort_reason = "KeyboardInterrupt (Ctrl+C)"
        abort_traceback = traceback.format_exc()
        log().warning(
            "RUN ABORTED (KeyboardInterrupt): completed=%s/%s last_case=%s",
            len(results),
            total_cases,
            last_case_id,
        )
    except Exception as e:
        run_status = "failed"
        abort_reason = f"{type(e).__name__}: {e}"
        abort_traceback = traceback.format_exc()
        log().critical(
            "RUN FAILED: %s — completed=%s/%s last_case=%s\n%s",
            abort_reason,
            len(results),
            total_cases,
            last_case_id,
            abort_traceback,
        )
    finally:
        counts = verdict_counts(results)
        payload = build_results_payload(
            stamp=stamp,
            args=args,
            results=results,
            total_tokens=total_tokens,
            log_file=log_file,
            run_status=run_status,
            total_cases=total_cases,
            last_case_id=last_case_id,
            last_case_index=last_case_index,
            abort_reason=abort_reason,
            abort_traceback=abort_traceback,
        )
        write_json_atomic(partial_path, payload)

        final_written: Path | None = None
        if run_status == "completed":
            write_json_atomic(out_path, payload)
            final_written = out_path
            log().info("RUN COMPLETED: %s/%s cases. Pass/Fail: %s", len(results), total_cases, counts)
        else:
            log().error(
                "RUN %s: reason=%s completed=%s/%s last_case=%s (%s) Pass/Fail so far: %s",
                run_status.upper(),
                abort_reason or "unknown",
                len(results),
                total_cases,
                last_case_id,
                last_case_index + 1 if last_case_index >= 0 else 0,
                counts,
            )
            if abort_traceback:
                log().error("Abort traceback:\n%s", abort_traceback)

        write_abort_manifest(
            abort_manifest_path,
            stamp=stamp,
            run_status=run_status,
            abort_reason=abort_reason,
            abort_traceback=abort_traceback,
            completed=len(results),
            planned=total_cases,
            last_case_id=last_case_id,
            last_case_index=last_case_index,
            log_file=log_file,
            partial_results=partial_path,
            final_results=final_written,
        )

        print(f"Run status: {run_status}")
        print(f"Log:              {log_file}")
        print(f"Abort manifest:   {abort_manifest_path}")
        print(f"Partial results:  {partial_path} ({len(results)}/{total_cases} cases)")
        if final_written:
            print(f"Final results:    {final_written}")
        print(f"Pass/Fail: {counts}")
        print(f"Tokens:    {total_tokens} (~{round(total_tokens / len(results)) if results else 0}/case)")

        if run_status != "completed":
            sys.exit(1)


if __name__ == "__main__":
    main()
