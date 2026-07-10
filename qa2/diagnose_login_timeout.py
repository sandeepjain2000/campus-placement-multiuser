"""Diagnose login timeouts: student session vs fresh vs force=1."""
from playwright.sync_api import sync_playwright

BASE = "https://campus-placement-omega.vercel.app"
STUDENT = "arjun.verma@iitm.edu"
EMPLOYER = "hr@techcorp.com"


def probe(page, label: str, url: str) -> dict:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(2000)
    except Exception as e:
        return {"label": label, "goto_error": str(e)[:200]}
    return page.evaluate(
        """() => ({
          href: location.href,
          pathname: location.pathname,
          title: document.title,
          hasLoginEmail: !!document.querySelector('#login-email'),
          loginEmailVisible: (() => {
            const el = document.querySelector('#login-email');
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })(),
          emailValue: document.querySelector('#login-email')?.value || '',
          passwordLen: document.querySelector('#login-password')?.value?.length || 0,
          bodySnippet: (document.body?.innerText || '').slice(0, 200)
        })"""
    )


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # A: fresh context, employer login URL
        ctx1 = browser.new_context()
        r1 = probe(ctx1.new_page(), "fresh_employer_login", f"{BASE}/login?email={EMPLOYER.replace('@', '%40')}")

        # B: student login then employer login URL (no force)
        ctx2 = browser.new_context()
        p2 = ctx2.new_page()
        probe(p2, "student_login", f"{BASE}/login?email={STUDENT.replace('@', '%40')}")
        for _ in range(30):
            if p2.input_value("#login-email") == STUDENT:
                break
            p2.wait_for_timeout(300)
        p2.click("#login-submit")
        p2.wait_for_url("**/dashboard/**", timeout=45_000)
        r2 = probe(p2, "after_student_goto_employer_login", f"{BASE}/login?email={EMPLOYER.replace('@', '%40')}")

        # C: same but force=1
        r3 = probe(p2, "employer_login_force1", f"{BASE}/login?force=1&email={EMPLOYER.replace('@', '%40')}")

        browser.close()

    import json

    print(json.dumps({"A_fresh": r1, "B_no_force": r2, "C_force1": r3}, indent=2))


if __name__ == "__main__":
    main()
