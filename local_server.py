#!/usr/bin/env python3
"""Lokale KBKB-affiliatietoepassing.

De server vult per export een tijdelijke kopie van het officiële Excelbestand,
laat LibreOffice Calc die kopie naar PDF exporteren, leest de PDF in en verwijdert
daarna de tijdelijke Excelkopie. Formuliergegevens verlaten het toestel niet.

Dezelfde lokale server verzorgt tijdelijke ondertekeningssessies tussen een
computer en een mobiel toestel op hetzelfde vertrouwde netwerk.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import mimetypes
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import webbrowser
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parent
RUNTIME_DIR = ROOT / ".runtime"
CACHE_TEMPLATE = RUNTIME_DIR / "4322_Affiliatieformulier_PC.xlsx"
OFFICIAL_TEMPLATE = ROOT / "template" / "4322_Affiliatieformulier_PC.xlsx"
SOURCE_PARTS = sorted((ROOT / "template").glob("source-part-*.b64"))
LOGO_PARTS = sorted((ROOT / "assets" / "img").glob("logo-part-*.b64"))

WORKBOOK_SHA256 = "7247a8dc44c6d79099918cfedc0be6e8238c231c7a4c1543168152ebaf7477cf"
WORKBOOK_URLS = (
    "https://drive.usercontent.google.com/download?id=1TM1tqQoW0zzINq05MDlMPoU4P60RosaU&export=download&confirm=t",
    "https://drive.google.com/uc?export=download&id=1TM1tqQoW0zzINq05MDlMPoU4P60RosaU",
)

ALLOWED_CELLS = {
    "I8", "T8", "AA8", "AH8", "I11", "B15", "Y15", "B19",
    "P19", "S19", "V19", "AD19", "AK19", "AO19", "B23", "AC23",
    "AK23", "F25", "T25", "B29", "H29", "R29", "L33", "J35",
    "M35", "P35", "AC35", "E37", "AF37", "AN37", "F39", "S39",
    "Q41", "I47", "I49", "I51", "B55",
}

CELL_LIMITS = {
    "I8": 1, "T8": 1, "AA8": 1, "AH8": 1,
    "I11": 80, "B15": 60, "Y15": 60, "B19": 40,
    "P19": 2, "S19": 2, "V19": 4, "AD19": 6, "AK19": 3, "AO19": 2,
    "B23": 90, "AC23": 10, "AK23": 10, "F25": 10, "T25": 60,
    "B29": 1, "H29": 1, "R29": 90, "L33": 90, "J35": 2,
    "M35": 2, "P35": 4, "AC35": 40, "E37": 90, "AF37": 10,
    "AN37": 10, "F39": 10, "S39": 60, "Q41": 80, "I47": 70,
    "I49": 60, "I51": 90, "B55": 130,
}

STATIC_FILES = {"index.html", "sign.html", ".nojekyll"}
STATIC_PREFIXES = ("assets/css/", "assets/js/", "assets/img/", "docs/")
SESSION_TTL_SECONDS = 15 * 60
MAX_JSON_BYTES = 2_000_000

_sessions: dict[str, dict[str, Any]] = {}
_sessions_lock = threading.Lock()
_template_lock = threading.Lock()
_template_bytes: bytes | None = None
_logo_bytes: bytes | None = None


def json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def validated_workbook(data: bytes) -> bytes | None:
    if not data.startswith(b"PK"):
        return None
    if hashlib.sha256(data).hexdigest() != WORKBOOK_SHA256:
        return None
    return data


def load_chunked_workbook() -> bytes | None:
    if not SOURCE_PARTS:
        return None
    try:
        encoded = "".join(path.read_text(encoding="utf-8").strip() for path in SOURCE_PARTS)
        return validated_workbook(base64.b64decode(encoded, validate=True))
    except (OSError, ValueError):
        return None


def download_workbook() -> bytes:
    errors: list[str] = []
    for url in WORKBOOK_URLS:
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 KBKB-Local-Affiliatie/2.0"},
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                candidate = response.read()
            workbook = validated_workbook(candidate)
            if workbook is not None:
                return workbook
            errors.append("download had niet de verwachte SHA-256")
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
    raise RuntimeError("De officiële Exceltemplate kon niet worden gedownload: " + " | ".join(errors))


def get_template_bytes() -> bytes:
    global _template_bytes
    if _template_bytes is not None:
        return _template_bytes

    with _template_lock:
        if _template_bytes is not None:
            return _template_bytes

        configured = os.environ.get("KBKB_TEMPLATE_PATH", "").strip()
        candidates = [Path(configured)] if configured else []
        candidates.extend((OFFICIAL_TEMPLATE, CACHE_TEMPLATE))
        for candidate in candidates:
            if not candidate.is_file():
                continue
            workbook = validated_workbook(candidate.read_bytes())
            if workbook is not None:
                _template_bytes = workbook
                return workbook

        chunked = load_chunked_workbook()
        if chunked is not None:
            _template_bytes = chunked
            return chunked

        workbook = download_workbook()
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_TEMPLATE.write_bytes(workbook)
        _template_bytes = workbook
        return workbook


def get_logo_bytes() -> bytes:
    global _logo_bytes
    if _logo_bytes is not None:
        return _logo_bytes
    if not LOGO_PARTS:
        raise RuntimeError("De Korfbal België-logobestanden ontbreken.")
    encoded = "".join(path.read_text(encoding="utf-8").strip() for path in LOGO_PARTS)
    data = base64.b64decode(encoded, validate=True)
    if not data.startswith(b"RIFF") or b"WEBP" not in data[:16]:
        raise RuntimeError("Het Korfbal België-logo is ongeldig.")
    _logo_bytes = data
    return data


def find_libreoffice() -> str | None:
    configured = os.environ.get("LIBREOFFICE_PATH", "").strip()
    candidates = [configured] if configured else []
    candidates.extend(filter(None, (shutil.which("libreoffice"), shutil.which("soffice"))))

    if sys.platform.startswith("win"):
        candidates.extend(
            (
                r"C:\Program Files\LibreOffice\program\soffice.exe",
                r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            )
        )
    elif sys.platform == "darwin":
        candidates.append("/Applications/LibreOffice.app/Contents/MacOS/soffice")

    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    return None


def column_number(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        return 0
    number = 0
    for char in letters.group(0):
        number = number * 26 + ord(char) - 64
    return number


def clean_cell_opening(opening: str, reference: str, has_value: bool) -> str:
    attributes = opening[2:-1]
    attributes = re.sub(r"\s+t=(['\"]).*?\1", "", attributes)
    if not re.search(r"\br=(['\"])" + re.escape(reference) + r"\1", attributes):
        attributes += f' r="{reference}"'
    if has_value:
        attributes += ' t="inlineStr"'
    return "<c" + attributes + ">"


def cell_xml(reference: str, value: str, opening: str | None = None) -> str:
    has_value = bool(value)
    start = clean_cell_opening(opening or f'<c r="{reference}">', reference, has_value)
    if not has_value:
        return start + "</c>"
    escaped = xml_escape(value, {'"': "&quot;", "'": "&apos;"})
    return start + f'<is><t xml:space="preserve">{escaped}</t></is></c>'


def replace_cell(sheet_xml: str, reference: str, value: str) -> str:
    full_pattern = re.compile(
        rf'(<c\b[^>]*\br=["\']{re.escape(reference)}["\'][^>]*>)([\s\S]*?)(</c>)'
    )
    match = full_pattern.search(sheet_xml)
    if match:
        return sheet_xml[: match.start()] + cell_xml(reference, value, match.group(1)) + sheet_xml[match.end() :]

    short_pattern = re.compile(
        rf'(<c\b[^>]*\br=["\']{re.escape(reference)}["\'][^>]*/>)'
    )
    match = short_pattern.search(sheet_xml)
    if match:
        opening = match.group(1)[:-2] + ">"
        return sheet_xml[: match.start()] + cell_xml(reference, value, opening) + sheet_xml[match.end() :]

    row_number = int(re.search(r"\d+", reference).group(0))
    row_pattern = re.compile(
        rf'(<row\b[^>]*\br=["\']{row_number}["\'][^>]*>)([\s\S]*?)(</row>)'
    )
    row_match = row_pattern.search(sheet_xml)
    new_cell = cell_xml(reference, value)
    if row_match:
        content = row_match.group(2)
        target_column = column_number(reference)
        insert_at = len(content)
        for cell_match in re.finditer(r'<c\b[^>]*\br=["\']([A-Z]+\d+)["\']', content):
            if column_number(cell_match.group(1)) > target_column:
                insert_at = cell_match.start()
                break
        new_content = content[:insert_at] + new_cell + content[insert_at:]
        replacement = row_match.group(1) + new_content + row_match.group(3)
        return sheet_xml[: row_match.start()] + replacement + sheet_xml[row_match.end() :]

    sheet_data_end = sheet_xml.find("</sheetData>")
    if sheet_data_end < 0:
        raise RuntimeError("Het werkblad bevat geen herkenbare sheetData-sectie.")
    return (
        sheet_xml[:sheet_data_end]
        + f'<row r="{row_number}">{new_cell}</row>'
        + sheet_xml[sheet_data_end:]
    )


def sanitize_cells(raw_cells: Any) -> dict[str, str]:
    if not isinstance(raw_cells, dict):
        raise ValueError("De formuliergegevens ontbreken.")
    cells: dict[str, str] = {}
    for reference, raw_value in raw_cells.items():
        if reference not in ALLOWED_CELLS:
            continue
        value = str(raw_value or "").replace("\x00", "").replace("\r", " ").replace("\n", " ").strip()
        value = value[: CELL_LIMITS.get(reference, 130)]
        cells[reference] = value
    return cells


def build_temporary_workbook(template: bytes, cells: dict[str, str]) -> bytes:
    source = io.BytesIO(template)
    output = io.BytesIO()
    with zipfile.ZipFile(source, "r") as archive_in, zipfile.ZipFile(output, "w") as archive_out:
        for info in archive_in.infolist():
            data = archive_in.read(info.filename)
            if info.filename == "xl/worksheets/sheet1.xml":
                xml = data.decode("utf-8")
                for reference in sorted(cells, key=lambda ref: (int(re.search(r"\d+", ref).group(0)), column_number(ref))):
                    xml = replace_cell(xml, reference, cells[reference])
                data = xml.encode("utf-8")
            archive_out.writestr(info, data)
    workbook = output.getvalue()
    if not workbook.startswith(b"PK"):
        raise RuntimeError("De tijdelijke Excelkopie kon niet worden opgebouwd.")
    return workbook


def convert_workbook_to_pdf(cells: dict[str, str]) -> bytes:
    libreoffice = find_libreoffice()
    if not libreoffice:
        raise RuntimeError(
            "LibreOffice Calc is niet gevonden. Installeer LibreOffice of stel LIBREOFFICE_PATH in."
        )

    temporary_workbook = build_temporary_workbook(get_template_bytes(), cells)

    with tempfile.TemporaryDirectory(prefix="kbkb-affiliatie-") as temp_name:
        temp_dir = Path(temp_name)
        profile_dir = temp_dir / "libreoffice-profiel"
        profile_dir.mkdir()
        xlsx_path = temp_dir / "Affiliatie_tijdelijk.xlsx"
        xlsx_path.write_bytes(temporary_workbook)

        command = [
            libreoffice,
            "--headless",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--nofirststartwizard",
            f"-env:UserInstallation={profile_dir.resolve().as_uri()}",
            "--convert-to",
            "pdf:calc_pdf_Export",
            "--outdir",
            str(temp_dir),
            str(xlsx_path),
        ]
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            timeout=180,
        )
        pdf_path = temp_dir / "Affiliatie_tijdelijk.pdf"
        if result.returncode != 0 or not pdf_path.is_file():
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            stdout = result.stdout.decode("utf-8", errors="replace").strip()
            raise RuntimeError(
                "LibreOffice kon de tijdelijke Excelkopie niet naar PDF exporteren. "
                + (stderr or stdout or f"Foutcode {result.returncode}")
            )

        pdf_bytes = pdf_path.read_bytes()
        if not pdf_bytes.startswith(b"%PDF-") or b"%%EOF" not in pdf_bytes[-4096:]:
            raise RuntimeError("LibreOffice heeft geen geldige PDF teruggegeven.")

        # Expliciet verwijderen zodra de PDF succesvol is ingelezen.
        xlsx_path.unlink(missing_ok=True)
        return pdf_bytes


def detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            address = sock.getsockname()[0]
            if address and not address.startswith("127."):
                return address
    except OSError:
        pass
    try:
        address = socket.gethostbyname(socket.gethostname())
        if address and not address.startswith("127."):
            return address
    except OSError:
        pass
    return "127.0.0.1"


def cleanup_sessions() -> None:
    cutoff = time.time() - SESSION_TTL_SECONDS
    with _sessions_lock:
        expired = [topic for topic, session in _sessions.items() if session["created_at"] < cutoff]
        for topic in expired:
            _sessions.pop(topic, None)


class KBKBHandler(BaseHTTPRequestHandler):
    server_version = "KBKBAffiliatie/2.0"

    def log_message(self, format_string: str, *args: Any) -> None:
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format_string % args))

    def send_security_headers(self, *, no_store: bool = False) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
            "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        self.send_header("Cache-Control", "no-store" if no_store else "no-cache")

    def send_json(self, status: int, payload: Any) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_security_headers(no_store=True)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> Any:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Ongeldige berichtlengte.") from exc
        if length <= 0 or length > MAX_JSON_BYTES:
            raise ValueError("Het bericht is leeg of te groot.")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802
        cleanup_sessions()
        path = self.path.split("?", 1)[0]
        if path == "/api/status":
            libreoffice = find_libreoffice()
            self.send_json(
                HTTPStatus.OK,
                {
                    "local_server": True,
                    "exact_excel_export": bool(libreoffice),
                    "libreoffice": libreoffice or "",
                    "lan_url": f"http://{self.server.lan_ip}:{self.server.server_port}",
                    "template_sha256": WORKBOOK_SHA256,
                },
            )
            return

        signature_match = re.fullmatch(r"/api/signature/(kbkb-sign-[a-f0-9]{48})", path)
        if signature_match:
            topic = signature_match.group(1)
            with _sessions_lock:
                session = _sessions.get(topic)
                if session is None:
                    self.send_json(HTTPStatus.NOT_FOUND, {"error": "Ondertekeningssessie niet gevonden."})
                    return
                payload = session.get("payload")
            self.send_json(HTTPStatus.OK, {"ready": payload is not None, "payload": payload})
            return

        self.serve_static(path)

    def do_POST(self) -> None:  # noqa: N802
        cleanup_sessions()
        path = self.path.split("?", 1)[0]
        try:
            payload = self.read_json()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        if path == "/api/export":
            try:
                cells = sanitize_cells(payload.get("cells") if isinstance(payload, dict) else None)
                pdf = convert_workbook_to_pdf(cells)
            except (ValueError, RuntimeError) as exc:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})
                return
            filename = "Affiliatieformulier.pdf"
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Length", str(len(pdf)))
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_security_headers(no_store=True)
            self.end_headers()
            self.wfile.write(pdf)
            return

        if path == "/api/signature/session":
            minor = bool(payload.get("minor")) if isinstance(payload, dict) else False
            topic = "kbkb-sign-" + secrets.token_hex(24)
            with _sessions_lock:
                _sessions[topic] = {
                    "created_at": time.time(),
                    "minor": minor,
                    "payload": None,
                }
            fragment = f"v=1&t={topic}&m={'1' if minor else '0'}"
            mobile_url = (
                f"http://{self.server.lan_ip}:{self.server.server_port}/sign.html#{fragment}"
            )
            self.send_json(
                HTTPStatus.CREATED,
                {
                    "topic": topic,
                    "mobile_url": mobile_url,
                    "expires_in": SESSION_TTL_SECONDS,
                    "minor": minor,
                },
            )
            return

        signature_match = re.fullmatch(r"/api/signature/(kbkb-sign-[a-f0-9]{48})", path)
        if signature_match:
            topic = signature_match.group(1)
            with _sessions_lock:
                session = _sessions.get(topic)
                if session is None:
                    self.send_json(HTTPStatus.NOT_FOUND, {"error": "Ondertekeningssessie niet gevonden of verlopen."})
                    return
                if not isinstance(payload, dict) or payload.get("kind") != "kbkb-affiliation-signature":
                    self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ongeldige ondertekeningsgegevens."})
                    return
                encoded_size = len(json_bytes(payload))
                if encoded_size > 1_500_000:
                    self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "De tekengegevens zijn te groot."})
                    return
                session["payload"] = payload
            self.send_json(HTTPStatus.OK, {"stored": True})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Onbekend API-pad."})

    def do_DELETE(self) -> None:  # noqa: N802
        cleanup_sessions()
        path = self.path.split("?", 1)[0]
        signature_match = re.fullmatch(r"/api/signature/(kbkb-sign-[a-f0-9]{48})", path)
        if not signature_match:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Onbekend API-pad."})
            return
        with _sessions_lock:
            _sessions.pop(signature_match.group(1), None)
        self.send_json(HTTPStatus.OK, {"deleted": True})

    def serve_static(self, request_path: str) -> None:
        relative = request_path.lstrip("/") or "index.html"
        if relative == "assets/img/korfbal-belgium.webp":
            try:
                content = get_logo_bytes()
            except RuntimeError as exc:
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
                return
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "image/webp")
            self.send_header("Content-Length", str(len(content)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(content)
            return

        if relative not in STATIC_FILES and not relative.startswith(STATIC_PREFIXES):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        candidate = (ROOT / relative).resolve()
        if ROOT not in candidate.parents and candidate != ROOT:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content = candidate.read_bytes()
        mime, _ = mimetypes.guess_type(candidate.name)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", (mime or "application/octet-stream") + ("; charset=utf-8" if mime and (mime.startswith("text/") or mime in {"application/javascript", "application/json"}) else ""))
        self.send_header("Content-Length", str(len(content)))
        self.send_security_headers(no_store=candidate.suffix in {".html", ".js"})
        self.end_headers()
        self.wfile.write(content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Start de lokale KBKB-affiliatietoepassing.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    lan_ip = detect_lan_ip()
    server = ThreadingHTTPServer((args.host, args.port), KBKBHandler)
    server.lan_ip = lan_ip  # type: ignore[attr-defined]

    local_url = f"http://127.0.0.1:{server.server_port}/"
    lan_url = f"http://{lan_ip}:{server.server_port}/"
    print("KBKB Online Affiliatieformulier")
    print(f"Computer: {local_url}")
    print(f"Mobiel op hetzelfde netwerk: {lan_url}")
    libreoffice = find_libreoffice()
    print(f"LibreOffice: {libreoffice or 'NIET GEVONDEN'}")
    print("Stoppen: Ctrl+C")

    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(local_url)).start()

    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nServer gestopt.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
