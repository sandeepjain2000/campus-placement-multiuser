"""Render Mermaid diagram source to PNG using Playwright + Mermaid CDN."""
from __future__ import annotations

import hashlib
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIAGRAMS_DIR = ROOT / "docs" / "diagrams"


def diagram_slug(source: str, index: int) -> str:
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:10]
    return f"mermaid-{index:02d}-{digest}"


def render_mermaid_png(source: str, out_path: Path, *, width: int = 1400, height: int = 900) -> None:
    source = source.strip()
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {{ margin: 20px; background: #ffffff; }}
    .mermaid {{ display: inline-block; }}
  </style>
</head>
<body>
  <div class="mermaid">{source}</div>
  <script>
    mermaid.initialize({{
      startOnLoad: true,
      theme: "neutral",
      securityLevel: "loose",
      flowchart: {{ useMaxWidth: false, htmlLabels: true }}
    }});
  </script>
</body>
</html>"""

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(html, wait_until="networkidle")
        page.wait_for_selector(".mermaid svg", timeout=90_000)
        # Let layout settle after SVG render
        page.wait_for_timeout(500)
        box = page.locator(".mermaid svg").bounding_box()
        if box:
            page.screenshot(path=str(out_path), clip=box, omit_background=False)
        else:
            page.locator(".mermaid").screenshot(path=str(out_path))
        browser.close()


def extract_mermaid_blocks(md_text: str) -> list[str]:
    pattern = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)
    return [m.group(1).strip() for m in pattern.finditer(md_text)]


def ensure_diagram_pngs(md_path: Path, *, force: bool = False) -> list[Path]:
    md_text = md_path.read_text(encoding="utf-8")
    blocks = extract_mermaid_blocks(md_text)
    paths: list[Path] = []
    for i, block in enumerate(blocks, start=1):
        slug = diagram_slug(block, i)
        png = DIAGRAMS_DIR / f"{slug}.png"
        mmd = DIAGRAMS_DIR / f"{slug}.mmd"
        if force or not png.exists():
            mmd.write_text(block + "\n", encoding="utf-8")
            render_mermaid_png(block, png)
            print(f"Rendered {png.relative_to(ROOT)}")
        else:
            print(f"Using cached {png.relative_to(ROOT)}")
        paths.append(png)
    return paths


if __name__ == "__main__":
    md = ROOT / "docs" / "product" / "placementhub-functionality.md"
    force = "--force" in sys.argv
    ensure_diagram_pngs(md, force=force)
