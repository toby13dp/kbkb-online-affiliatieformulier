#!/usr/bin/env python3
"""Build the static GitHub Pages interface.

GitHub Pages can display the form and signing interfaces, but the exact runtime
Excel-to-PDF conversion is performed by a separately deployed or local
Python/LibreOffice service. No workbook or personal form data is processed in
Pages CI.
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
LOGO_PARTS = sorted((ROOT / "assets" / "img").glob("logo-part-*.b64"))

CSS_FILES = (
    "styles.css",
    "signature.css",
    "signature-wizard.css",
    "signature-controls.css",
)
JS_FILES = (
    "form.js",
    "pdf-template.js",
    "pdf-exact.js",
    "signature-pad.js",
    "signature-pad-registry.js",
    "signature-crypto.js",
    "signature-flow.js",
    "signature-wizard.js",
    "signature-mobile.js",
    "signing-copy.js",
    "pdf-signature.js",
    "pdf-export.js",
    "main.js",
)


def normalized_api_base() -> str:
    value = os.environ.get("KBKB_API_BASE", "").strip().rstrip("/")
    if value and not value.startswith("https://"):
        raise RuntimeError("KBKB_API_BASE moet leeg zijn of met https:// beginnen.")
    return value


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

    api_base = normalized_api_base()
    runtime_config = (
        '"use strict";\n'
        f"window.KBKB_API_BASE = {json.dumps(api_base)};\n"
    )
    (OUTPUT / "assets" / "js" / "runtime-config.js").write_text(
        runtime_config,
        encoding="utf-8",
    )

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
    print(f"Backend: {normalized_api_base() or 'zelfde oorsprong / lokaal'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Build mislukt: {exc}", file=sys.stderr)
        raise SystemExit(1)
