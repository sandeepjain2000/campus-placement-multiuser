"""
Run qa2 test cases with browser-use Agent + NVIDIA OpenAI-compatible API.

NVIDIA keys: all ``*.json`` files in the configured keys folder are loaded and
used in rotation (per case, retry with the next key on likely quota/auth errors).

Default keys folder is set in this script (``DEFAULT_NVIDIA_KEYS_DIR``). Override
with ``NVIDIA_KEYS_DIR`` or ``--nvidia-keys-dir``.

Execution logs: ``qa2/logs/run_agent_<UTC-timestamp>.log`` (and console).

Usage (from repo root):

  # Default: tests https://campus-placement-omega.vercel.app (no npm run dev needed)
  python qa2/run_agent_cloud.py --local --limit 1

  # Local app instead:
  python qa2/run_agent_cloud.py --base-url http://127.0.0.1:3000 --local --limit 1
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from browser_use import Agent, BrowserSession
from browser_use.llm.openai.chat import ChatOpenAI

ROOT = Path(__file__).resolve().parent
CASES_PATH = ROOT / "test_cases.json"
LOG_DIR = ROOT / "logs"

# Default: …/Claudes/code-review-tool/nvidia_keys (sibling folders under Claudes).
_REPO_QA2 = Path(__file__).resolve().parent


def _default_nvidia_keys_dir() -> Path:
    rels = (
        _REPO_QA2.parents[3] / "code-review-tool" / "nvidia_keys",  # …/Claudes/… (extra parent)
        _REPO_QA2.parents[2] / "code-review-tool" / "nvidia_keys",  # …/Claudes/campus-placement/qa2
    )
    for p in rels:
        if p.is_dir():
            return p.resolve()
    return rels[0].resolve()


DEFAULT_NVIDIA_KEYS_DIR = _default_nvidia_keys_dir()

# Production/staging target (no local dev server required).
DEFAULT_QA_BASE_URL = "https://campus-placement-omega.vercel.app"

NVIDIA_BASE_URL_DEFAULT = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL_DEFAULT = os.environ.get("NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct")

_LOG: logging.Logger | None = None


def setup_logging(log_file: Path) -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("qa2.run_agent")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    fh.setFormatter(fmt)
    ch.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


def log() -> logging.Logger:
    global _LOG
    if _LOG is None:
        _LOG = logging.getLogger("qa2.run_agent")
    return _LOG


def load_key_from_json(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    key = (data.get("api_key") or data.get("NVIDIA_API_KEY") or "").strip()
    if not key:
        raise ValueError(f"No api_key in {path}")
    return key


def discover_nvidia_key_ring(folder: Path) -> list[tuple[str, str]]:
    """
    Return sorted list of (api_key, path_str) for every ``*.json`` in folder.
    """
    if not folder.is_dir():
        raise SystemExit(f"NVIDIA keys folder is not a directory: {folder}")
    files = sorted(folder.glob("*.json"), key=lambda p: p.name.lower())
    ring: list[tuple[str, str]] = []
    for p in files:
        try:
            k = load_key_from_json(p)
            ring.append((k, str(p.resolve())))
        except Exception as e:
            log().warning("Skip key file %s: %s", p, e)
    if not ring:
        raise SystemExit(f"No usable api_key entries in JSON files under {folder}")
    log().info("Loaded %d NVIDIA key file(s) from %s", len(ring), folder)
    for _, path_str in ring:
        log().debug("  key file: %s", path_str)
    return ring


def resolve_keys_folder(cli_dir: str) -> Path:
    raw = (cli_dir or "").strip() or (os.environ.get("NVIDIA_KEYS_DIR", "") or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return DEFAULT_NVIDIA_KEYS_DIR


def single_key_from_file(path: Path) -> list[tuple[str, str]]:
    k = load_key_from_json(path)
    return [(k, str(path.resolve()))]


def build_key_ring(
    *,
    keys_folder: Path | None,
    key_file: str,
) -> list[tuple[str, str]]:
    env_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if env_key:
        log().warning(
            "NVIDIA_API_KEY is set: using a single env key (no file rotation). "
            "Unset it to use all JSON keys in the keys folder."
        )
        return [(env_key, "env:NVIDIA_API_KEY")]

    f = (key_file or "").strip()
    if f:
        p = Path(f).expanduser().resolve()
        if not p.is_file():
            raise SystemExit(f"--nvidia-key-file not found: {p}")
        return single_key_from_file(p)

    env_file = (os.environ.get("NVIDIA_KEY_FILE", "") or "").strip()
    if env_file:
        p = Path(env_file).expanduser().resolve()
        if p.is_file():
            return single_key_from_file(p)

    if keys_folder is None:
        raise SystemExit("Internal error: keys folder not resolved")
    return discover_nvidia_key_ring(keys_folder)


def rotatable_llm_error(exc: BaseException) -> bool:
    msg = f"{type(exc).__name__}: {exc}".lower()
    hints = (
        "429",
        "rate",
        "quota",
        "limit",
        "too many requests",
        "401",
        "403",
        "unauthorized",
        "forbidden",
        "invalid api",
        "api key",
        "credit",
        "exhausted",
    )
    return any(h in msg for h in hints)


def load_cases(
    suite: str | None,
    case_id: str | None,
    limit: int | None,
    offset: int = 0,
    case_ids_file: str | Path | None = None,
) -> list[dict]:
    if not CASES_PATH.is_file():
        raise SystemExit(
            f"Missing {CASES_PATH}. Run: python qa2/generate_test_cases_json.py"
        )
    payload = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    cases: list[dict] = payload["cases"]
    if case_ids_file:
        path = Path(case_ids_file)
        if not path.is_file():
            raise SystemExit(f"Case IDs file not found: {path}")
        wanted = [
            line.strip()
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        by_id = {c["id"]: c for c in cases}
        missing = [i for i in wanted if i not in by_id]
        if missing:
            raise SystemExit(f"Unknown case IDs in {path}: {missing[:5]}{'...' if len(missing) > 5 else ''}")
        cases = [by_id[i] for i in wanted]
    if suite:
        cases = [c for c in cases if c.get("suite") == suite.upper()]
    if case_id:
        cases = [c for c in cases if c["id"] == case_id]
    if offset:
        cases = cases[offset:]
    if limit is not None:
        cases = cases[:limit]
    return cases


def build_task(case: dict, base_url: str) -> str:
    raw = case.get("raw") or {}
    demo_email = raw.get("Demo Email") or case.get("persona") or ""
    extras = []
    if raw.get("Target Route"):
        extras.append(f"Target route (if applicable): {raw['Target Route']}")
    if raw.get("Type"):
        extras.append(f"Case type: {raw['Type']}")

    login_hint = ""
    if demo_email:
        login_hint = (
            f"If authentication is required: open {base_url}/login?email={demo_email.replace('@', '%40')}, "
            "ensure the email field matches, use password <qa_password> from sensitive data, submit, "
            "wait until the URL contains /dashboard, then continue."
        )

    extras_text = "\n".join(extras) if extras else "(none)"

    return f"""You are an expert QA automation agent. Application base URL: {base_url}

Test case ID: {case.get("id", "")}
Title: {case.get("title", "")}
Suite: {case.get("suite", "")}
Preconditions: {case.get("preconditions", "") or "See steps."}

{login_hint}

Steps and notes:
{case.get("steps", "")}

Expected results:
{case.get("expected", "")}

Context:
{extras_text}

Rules:
- Stay on the configured domain(s). Do not enter real personal data beyond test credentials.
- If a step is impossible (missing seed data), finish with verdict BLOCKED and explain.
- End with one line of JSON only: {{"verdict":"PASS"|"FAIL"|"BLOCKED","summary":"short factual summary"}}
"""


def hosts_from_base_url(base_url: str) -> list[str]:
    u = urlparse(base_url)
    h = u.hostname
    if not h:
        return ["127.0.0.1", "localhost"]
    out = [h]
    if h not in ("127.0.0.1", "localhost"):
        out.extend(["127.0.0.1", "localhost"])
    return list(dict.fromkeys(out))


def make_llm(api_key: str, model: str, nvidia_base_url: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=nvidia_base_url,
        temperature=0.2,
        max_completion_tokens=4096,
        dont_force_structured_output=True,
    )


def agent_invoked(row: dict) -> bool:
    usage = row.get("usage") or {}
    return int(usage.get("entry_count") or 0) > 0 or int(usage.get("total_tokens") or 0) > 0


_VERDICT_RE = re.compile(
    r'"verdict"\s*:\s*"(PASS|FAIL|BLOCKED)"',
    re.IGNORECASE,
)
_VERDICT_LOOSE_RE = re.compile(
    r'\bverdict["\']?\s*[:=]\s*["\']?(PASS|FAIL|BLOCKED)\b',
    re.IGNORECASE,
)


def parse_verdict_from_text(text: str | None) -> tuple[str | None, str | None]:
    """Return (verdict, summary) from agent output text."""
    if not text or not str(text).strip():
        return None, None
    s = str(text).strip()
    m = _VERDICT_RE.search(s)
    if not m:
        m = _VERDICT_LOOSE_RE.search(s)
    if not m:
        return None, None
    verdict = m.group(1).upper()
    summary = None
    try:
        blob = json.loads(s[s.find("{") : s.rfind("}") + 1]) if "{" in s else {}
        if isinstance(blob, dict):
            summary = (blob.get("summary") or blob.get("message") or "").strip() or None
    except (json.JSONDecodeError, ValueError):
        pass
    return verdict, summary


def extract_verdict_from_history(history) -> dict:
    """
    Pull PASS/FAIL/BLOCKED from browser-use history (final_result often null
    if the agent never set extracted_content on the last action).
    """
    texts: list[str] = []
    final = history.final_result()
    if final:
        texts.append(final)
    try:
        for chunk in history.extracted_content() or []:
            if chunk:
                texts.append(str(chunk))
    except Exception:
        pass
    try:
        for out in history.model_outputs or []:
            if out is not None:
                texts.append(str(out))
    except Exception:
        pass
    try:
        j = history.judgement()
        if j:
            texts.append(json.dumps(j))
    except Exception:
        pass

    verdict = None
    summary = None
    for t in reversed(texts):
        v, sm = parse_verdict_from_text(t)
        if v:
            verdict = v
            summary = sm or summary
            break

    agent_success = None
    try:
        agent_success = history.is_successful()
    except Exception:
        pass

    if not verdict and agent_success is True:
        verdict = "PASS"
    elif not verdict and agent_success is False:
        verdict = "FAIL"

    pass_fail = verdict if verdict in ("PASS", "FAIL") else None
    if verdict == "BLOCKED":
        pass_fail = "BLOCKED"

    return {
        "verdict": verdict,
        "pass_fail": pass_fail or verdict or "N/A",
        "verdict_summary": summary,
        "agent_reported_success": agent_success,
        "final_text": final or (texts[-1] if texts else None),
    }


def log_run_summary(results: list[dict]) -> None:
    errors = [r for r in results if r.get("status") == "error"]
    hollow = [r for r in results if r.get("status") == "completed" and not agent_invoked(r)]
    ran = [r for r in results if agent_invoked(r)]
    verdicts: dict[str, int] = {}
    for r in results:
        vf = r.get("pass_fail") or "N/A"
        verdicts[vf] = verdicts.get(vf, 0) + 1
    log().info(
        "Run summary: total=%s agent_ran=%s hollow_completed=%s errors=%s pass_fail=%s",
        len(results),
        len(ran),
        len(hollow),
        len(errors),
        verdicts,
    )
    if hollow:
        log().warning(
            "Hollow runs (marked completed but 0 LLM usage — browser/agent did not execute): %s",
            ", ".join(r["id"] for r in hollow[:15])
            + (" …" if len(hollow) > 15 else ""),
        )


async def run_cases(
    *,
    cases: list[dict],
    base_url: str,
    key_ring: list[tuple[str, str]],
    model: str,
    nvidia_base_url: str,
    use_cloud: bool,
    max_steps: int,
    use_vision: str | bool,
) -> list[dict]:
    n = len(key_ring)
    allowed = hosts_from_base_url(base_url)
    results: list[dict] = []
    log().info("Browser mode: new session per case (use_cloud=%s)", use_cloud)

    for i, case in enumerate(cases):
        raw = case.get("raw") or {}
        pw = (raw.get("Demo Password") or os.environ.get("QA_DEMO_PASSWORD", "Admin@123")).strip()
        sensitive_data = {"qa_password": pw}
        task = build_task(case, base_url.rstrip("/"))

        # Try keys in rotating order: primary for this case is i % n, then others.
        order = [(i + j) % n for j in range(n)]
        row: dict = {
            "id": case["id"],
            "title": case.get("title"),
            "suite": case.get("suite"),
            "keyAttempts": [],
        }
        for attempt_idx, ki in enumerate(order):
            api_key, key_label = key_ring[ki]
            log().info(
                "Case %s (%s) attempt %s/%s using key #%s %s",
                case["id"],
                i + 1,
                attempt_idx + 1,
                len(order),
                ki + 1,
                key_label,
            )
            browser = BrowserSession(
                headless=True,
                use_cloud=use_cloud,
                enable_default_extensions=False,
                allowed_domains=allowed,
                keep_alive=False,
            )
            try:
                await browser.start()
                llm = make_llm(api_key, model, nvidia_base_url)
                agent = Agent(
                    task=task,
                    llm=llm,
                    browser_session=browser,
                    sensitive_data=sensitive_data,
                    use_vision=use_vision,
                    max_actions_per_step=4,
                    max_failures=4,
                    step_timeout=120,
                )
                history = await agent.run(max_steps=max_steps)
                verdict_info = extract_verdict_from_history(history)
                row.update(verdict_info)
                row["usage"] = history.usage.model_dump() if history.usage else None
                row["status"] = "completed"
                row["nvidiaKeyUsed"] = key_label
                row["keyAttempts"].append({"key": key_label, "outcome": "success"})
                if not agent_invoked(row):
                    log().warning(
                        "Case %s completed but used 0 LLM tokens — likely a hollow run",
                        case["id"],
                    )
                else:
                    log().info(
                        "Case %s completed with key %s verdict=%s",
                        case["id"],
                        key_label,
                        row.get("pass_fail", "N/A"),
                    )
                break
            except Exception as e:
                tb = traceback.format_exc()
                row["keyAttempts"].append(
                    {
                        "key": key_label,
                        "outcome": "error",
                        "error": f"{type(e).__name__}: {e}",
                    }
                )
                log().error(
                    "Case %s failed with key %s: %s\n%s",
                    case["id"],
                    key_label,
                    e,
                    tb,
                )
                if rotatable_llm_error(e) and attempt_idx < len(order) - 1:
                    log().warning("Rotating to next NVIDIA key…")
                    await asyncio.sleep(1.5)
                    continue
                row["status"] = "error"
                row["error"] = f"{type(e).__name__}: {e}"
                row["traceback"] = tb
                row["nvidiaKeyUsed"] = key_label
                log().error("Case %s exhausted keys or non-rotatable error", case["id"])
                break
            finally:
                try:
                    await browser.stop()
                except Exception as stop_err:
                    log().warning("Browser stop after %s: %s", case["id"], stop_err)

        results.append(row)

        if i < len(cases) - 1:
            await asyncio.sleep(2)

    log_run_summary(results)
    return results


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Run qa2 JSON cases with browser-use + NVIDIA LLM (keys rotated from folder)"
    )
    ap.add_argument(
        "--base-url",
        default=os.environ.get("QA_BASE_URL", DEFAULT_QA_BASE_URL),
        help=f"App under test (default: {DEFAULT_QA_BASE_URL})",
    )
    ap.add_argument(
        "--nvidia-keys-dir",
        default=os.environ.get("NVIDIA_KEYS_DIR", ""),
        metavar="DIR",
        help=f"Folder with key *.json files (default: {DEFAULT_NVIDIA_KEYS_DIR} if unset and empty)",
    )
    ap.add_argument(
        "--nvidia-key-file",
        default=os.environ.get("NVIDIA_KEY_FILE", ""),
        metavar="PATH",
        help="Optional: use only this JSON file instead of scanning the keys folder",
    )
    ap.add_argument("--nvidia-base-url", default=os.environ.get("NVIDIA_API_BASE_URL", NVIDIA_BASE_URL_DEFAULT))
    ap.add_argument("--model", default=NVIDIA_MODEL_DEFAULT)
    ap.add_argument("--suite", help="Filter by suite letter (A-O)")
    ap.add_argument("--case-id", help="Run a single test case id")
    ap.add_argument("--limit", type=int, default=1, help="Max cases to run (default 1)")
    ap.add_argument("--max-steps", type=int, default=30)
    ap.add_argument(
        "--local",
        action="store_true",
        help="Local browser (no BROWSER_USE_API_KEY)",
    )
    ap.add_argument(
        "--vision",
        choices=["auto", "true", "false"],
        default="auto",
    )
    ap.add_argument("--list", action="store_true", help="List matching cases and exit")
    args = ap.parse_args()

    cases = load_cases(args.suite, args.case_id, None)
    if args.limit is not None:
        cases = cases[: args.limit]

    if args.list:
        for c in cases[:200]:
            print(f"{c['id']}\t{c.get('suite')}\t{c.get('title', '')[:80]}")
        print(f"... total listed (cap 200), count loaded: {len(cases)}")
        return

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    global _LOG
    _LOG = setup_logging(LOG_DIR / f"run_agent_{stamp}.log")
    log().info("Log file: %s", LOG_DIR / f"run_agent_{stamp}.log")
    log().info("App base URL: %s", args.base_url)
    log().info("Default NVIDIA keys folder (override with env/flag): %s", DEFAULT_NVIDIA_KEYS_DIR)

    use_cloud = bool(os.environ.get("BROWSER_USE_API_KEY")) and not args.local
    vision: str | bool = {"true": True, "false": False, "auto": "auto"}[args.vision]

    if use_cloud:
        host = urlparse(args.base_url).hostname or ""
        if host in ("127.0.0.1", "localhost", ""):
            raise SystemExit(
                "Cloud browsers cannot reach http://127.0.0.1 or localhost. "
                "Use --local or a public QA_BASE_URL (tunnel/staging)."
            )

    if not cases:
        raise SystemExit("No cases matched filters")

    single_key_mode = bool(
        (args.nvidia_key_file or "").strip()
        or (os.environ.get("NVIDIA_KEY_FILE", "") or "").strip()
        or (os.environ.get("NVIDIA_API_KEY", "") or "").strip()
    )
    keys_folder: Path | None = None
    if not single_key_mode:
        keys_folder = resolve_keys_folder(args.nvidia_keys_dir)
        log().info("Using NVIDIA keys folder (rotation): %s", keys_folder)

    try:
        key_ring = build_key_ring(keys_folder=keys_folder, key_file=args.nvidia_key_file)
    except SystemExit:
        raise
    except Exception as e:
        log().exception("Failed to build key ring: %s", e)
        raise SystemExit(1) from e

    out_path = ROOT / f"agent_results_{stamp}.json"

    if use_cloud and not os.environ.get("BROWSER_USE_API_KEY"):
        raise SystemExit(
            "Cloud browser requires BROWSER_USE_API_KEY. Use --local or set the key."
        )

    log().info(
        "Starting run: cases=%s base_url=%s model=%s keys=%s",
        len(cases),
        args.base_url,
        args.model,
        len(key_ring),
    )

    try:
        payload = asyncio.run(
            run_cases(
                cases=cases,
                base_url=args.base_url,
                key_ring=key_ring,
                model=args.model,
                nvidia_base_url=args.nvidia_base_url,
                use_cloud=use_cloud,
                max_steps=args.max_steps,
                use_vision=vision,
            )
        )
    except Exception:
        log().exception("Run aborted with unhandled error")
        raise

    out_path.write_text(
        json.dumps(
            {
                "generatedAt": stamp,
                "baseUrl": args.base_url,
                "useCloud": use_cloud,
                "model": args.model,
                "nvidiaBaseUrl": args.nvidia_base_url,
                "nvidiaKeysFolder": str(keys_folder) if keys_folder else None,
                "nvidiaKeyFiles": [label for _, label in key_ring],
                "logFile": str(LOG_DIR / f"run_agent_{stamp}.log"),
                "results": payload,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    log_run_summary(payload)
    log().info("Wrote results JSON: %s", out_path)
    ran = sum(1 for r in payload if agent_invoked(r))
    hollow = sum(1 for r in payload if r.get("status") == "completed" and not agent_invoked(r))
    errors = sum(1 for r in payload if r.get("status") == "error")
    print(f"Results: {out_path}")
    print(f"Log:     {LOG_DIR / f'run_agent_{stamp}.log'}")
    print(f"Summary: {ran} ran, {hollow} hollow (no LLM), {errors} errors, {len(payload)} total")


if __name__ == "__main__":
    main()
