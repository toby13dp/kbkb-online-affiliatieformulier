#!/usr/bin/env python3
"""Build the static GitHub Pages site.

The official PDF background is generated from the original Excel workbook so the
browser export preserves the exact Excel layout. The generated PDF is embedded
as Base64 in the deployed JavaScript bundle; no server-side data processing is
used at runtime.
"""

from __future__ import annotations

import base64
import hashlib
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
LOGO_PARTS = sorted((ROOT / "assets" / "img").glob("logo-part-*.b64"))
PDF_JS_PARTS = sorted((ROOT / "assets" / "js").glob("pdf-exact-part-*.jsfrag"))

WORKBOOK_SHA256 = "7247a8dc44c6d79099918cfedc0be6e8238c231c7a4c1543168152ebaf7477cf"
WORKBOOK_URLS = (
    "https://drive.usercontent.google.com/download?id=1TM1tqQoW0zzINq05MDlMPoU4P60RosaU&export=download&confirm=t",
    "https://drive.google.com/uc?export=download&id=1TM1tqQoW0zzINq05MDlMPoU4P60RosaU",
)


def find_libreoffice() -> str:
    for name in ("libreoffice", "soffice"):
        executable = shutil.which(name)
        if executable:
            return executable
    raise RuntimeError(
        "LibreOffice Calc is vereist om de officiële Excel-template naar PDF om te zetten."
    )


def validated_workbook(data: bytes) -> bytes | None:
    if not data.startswith(b"PK"):
        return None
    if hashlib.sha256(data).hexdigest() != WORKBOOK_SHA256:
        return None
    return data


def load_workbook_source() -> bytes:
    """Download the exact workbook supplied by KBKB and verify its digest."""
    errors: list[str] = []

    for url in WORKBOOK_URLS:
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 KBKB-Pages-Build/1.0"},
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                candidate = response.read()
            workbook = validated_workbook(candidate)
            if workbook is not None:
                return workbook
            errors.append(f"ongeldige download via {url}")
        except Exception as exc:  # noqa: BLE001 - retain useful diagnostics
            errors.append(f"downloadfout via {url}: {exc}")

    raise RuntimeError(
        "De officiële Excel-template kon niet betrouwbaar worden geladen:\n- "
        + "\n- ".join(errors)
    )


def copy_static_files() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    (OUTPUT / "assets" / "css").mkdir(parents=True)
    (OUTPUT / "assets" / "img").mkdir(parents=True)
    (OUTPUT / "assets" / "js").mkdir(parents=True)
    (OUTPUT / "assets" / "templates").mkdir(parents=True)

    shutil.copy2(ROOT / "index.html", OUTPUT / "index.html")
    shutil.copy2(ROOT / ".nojekyll", OUTPUT / ".nojekyll")
    shutil.copy2(
        ROOT / "assets" / "css" / "styles.css",
        OUTPUT / "assets" / "css" / "styles.css",
    )

    if not LOGO_PARTS:
        raise RuntimeError("De Korfbal België-logochunks ontbreken.")
    logo_data = base64.b64decode(
        "".join(path.read_text(encoding="utf-8").strip() for path in LOGO_PARTS),
        validate=True,
    )
    if not logo_data.startswith(b"RIFF") or b"WEBP" not in logo_data[:16]:
        raise RuntimeError("Het ingebouwde Korfbal België-logo is ongeldig.")
    (OUTPUT / "assets" / "img" / "korfbal-belgium.webp").write_bytes(logo_data)

    if not PDF_JS_PARTS:
        raise RuntimeError("De exacte PDF-exportcode ontbreekt.")
    pdf_js = "".join(path.read_text(encoding="utf-8") for path in PDF_JS_PARTS)
    (OUTPUT / "assets" / "js" / "pdf-exact.js").write_text(
        pdf_js,
        encoding="utf-8",
    )

    for filename in ("form.js", "main.js"):
        shutil.copy2(
            ROOT / "assets" / "js" / filename,
            OUTPUT / "assets" / "js" / filename,
        )


def build_pdf_template() -> tuple[Path, str]:
    source_bytes = load_workbook_source()

    with tempfile.TemporaryDirectory(prefix="kbkb-affiliatie-") as temp_name:
        temp = Path(temp_name)
        xlsx_path = temp / "4322_Affiliatieformulier_PC.xlsx"
        xlsx_path.write_bytes(source_bytes)

        executable = find_libreoffice()
        command = [
            executable,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(temp),
            str(xlsx_path),
        ]
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise RuntimeError(
                "LibreOffice kon de Excel-template niet omzetten naar PDF.\n"
                + result.stdout
                + result.stderr
            )

        pdf_path = temp / "4322_Affiliatieformulier_PC.pdf"
        if not pdf_path.exists():
            raise RuntimeError("LibreOffice heeft geen PDF-bestand aangemaakt.")
        pdf_bytes = pdf_path.read_bytes()
        if not pdf_bytes.startswith(b"%PDF-") or b"%%EOF" not in pdf_bytes[-2048:]:
            raise RuntimeError("De gegenereerde officiële PDF-template is ongeldig.")

        deployed_pdf = (
            OUTPUT / "assets" / "templates" / "4322_Affiliatieformulier_PC.pdf"
        )
        deployed_pdf.write_bytes(pdf_bytes)
        digest = hashlib.sha256(pdf_bytes).hexdigest()
        encoded = base64.b64encode(pdf_bytes).decode("ascii")
        js = (
            '"use strict";\n'
            f"// Gegenereerd uit de officiële Excel-template. SHA-256: {digest}\n"
            f'window.KBKB_EXACT_PDF_TEMPLATE_BASE64 = "{encoded}";\n'
        )
        (OUTPUT / "assets" / "js" / "pdf-template.js").write_text(
            js,
            encoding="utf-8",
        )
        return deployed_pdf, digest


def main() -> int:
    copy_static_files()
    pdf_path, digest = build_pdf_template()
    print(f"Site gebouwd in: {OUTPUT}")
    print(f"Officiële PDF-template: {pdf_path}")
    print(f"SHA-256: {digest}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Build mislukt: {exc}", file=sys.stderr)
        raise SystemExit(1)
