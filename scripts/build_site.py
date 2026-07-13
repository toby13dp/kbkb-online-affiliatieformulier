#!/usr/bin/env python3
"""Build the static GitHub Pages interface.

GitHub Pages can display the form and mobile signing page, but the exact runtime
Excel-to-PDF conversion is deliberately performed only by local_server.py on the
user's own device. No workbook or personal form data is processed in CI.
"""

from __future__ import annotations

import base64
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
LOGO_PARTS = sorted((ROOT / "assets" / "img").glob("logo-part-*.b64"))

CSS_FILES = ("styles.css", "signature.css")
JS_FILES = (
    "form.js",
    "pdf-template.js",
    "pdf-exact.js",
    "signature-pad.js",
    "signature-crypto.js",
    "signature-flow.js",
    "signature-mobile.js",
    "pdf-signature.js",
    "pdf-export.js",
    "main.js",
)


def build() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)

    for directory in (
        OUTPUT / "assets" / "css",
        OUTPUT / "assets" / "img",
        OUTPUT / "assets" / "js",
        OUTPUT / "docs",
    ):
        directory.mkdir(parents=True, exist_ok=True)

    for filename in ("index.html", "sign.html", ".nojekyll"):
        shutil.copy2(ROOT / filename, OUTPUT / filename)

    for filename in CSS_FILES:
        shutil.copy2(ROOT / "assets" / "css" / filename, OUTPUT / "assets" / "css" / filename)

    for filename in JS_FILES:
        shutil.copy2(ROOT / "assets" / "js" / filename, OUTPUT / "assets" / "js" / filename)

    for filename in ("PRIVACY.md", "VELDENMAPPING.md"):
        shutil.copy2(ROOT / "docs" / filename, OUTPUT / "docs" / filename)

    if not LOGO_PARTS:
        raise RuntimeError("De Korfbal België-logochunks ontbreken.")
    logo_data = base64.b64decode(
        "".join(path.read_text(encoding="utf-8").strip() for path in LOGO_PARTS),
        validate=True,
    )
    if not logo_data.startswith(b"RIFF") or b"WEBP" not in logo_data[:16]:
        raise RuntimeError("Het ingebouwde Korfbal België-logo is ongeldig.")
    (OUTPUT / "assets" / "img" / "korfbal-belgium.webp").write_bytes(logo_data)


def main() -> int:
    build()
    print(f"Statische interface gebouwd in: {OUTPUT}")
    print("Exacte Excel-naar-PDF-export: lokaal via local_server.py")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Build mislukt: {exc}", file=sys.stderr)
        raise SystemExit(1)
