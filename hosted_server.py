#!/usr/bin/env python3
"""Permanente backend voor de GitHub Pages-interface.

Deze server gebruikt dezelfde gevalideerde XLSX-patcher en LibreOffice-export als
de lokale toepassing, maar staat CORS alleen toe voor één geconfigureerde Pages-
oorsprong. Mobiele ondertekeningssessies blijven maximaal 30 minuten in het
geheugen van één backendinstantie.
"""

from __future__ import annotations

import json
import os
import secrets
import time
from http import HTTPStatus
from http.server import ThreadingHTTPServer
from urllib.parse import urlsplit

import local_server
from xlsx_patch import build_temporary_workbook

local_server.build_temporary_workbook = build_temporary_workbook
local_server.SESSION_TTL_SECONDS = 30 * 60


def normalized_frontend_url() -> str:
    value = os.environ.get(
        "KBKB_FRONTEND_URL",
        "https://toby13dp.github.io/kbkb-online-affiliatieformulier",
    ).strip().rstrip("/")
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise RuntimeError("KBKB_FRONTEND_URL moet een geldige https-URL zijn.")
    return value


class HostedHandler(local_server.KBKBHandler):
    def allowed_request_origin(self) -> str:
        origin = self.headers.get("Origin", "")
        return origin if origin == self.server.allowed_origin else ""

    def send_security_headers(self, *, no_store: bool = False) -> None:
        super().send_security_headers(no_store=no_store)
        origin = self.allowed_request_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Cache-Control")
        self.send_header("Access-Control-Max-Age", "600")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_security_headers(no_store=True)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        local_server.cleanup_sessions()
        path = self.path.split("?", 1)[0]
        if path == "/api/status":
            libreoffice = local_server.find_libreoffice()
            self.send_json(
                HTTPStatus.OK,
                {
                    "local_server": True,
                    "hosted_backend": True,
                    "exact_excel_export": bool(libreoffice),
                    "libreoffice": libreoffice or "",
                    "frontend_url": self.server.public_frontend_url,
                    "template_sha256": local_server.WORKBOOK_SHA256,
                    "session_ttl_seconds": local_server.SESSION_TTL_SECONDS,
                },
            )
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        local_server.cleanup_sessions()
        path = self.path.split("?", 1)[0]
        if path != "/api/signature/session":
            super().do_POST()
            return

        try:
            payload = self.read_json()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        minor = bool(payload.get("minor")) if isinstance(payload, dict) else False
        topic = "kbkb-sign-" + secrets.token_hex(24)
        with local_server._sessions_lock:  # noqa: SLF001 - shared in-memory store
            local_server._sessions[topic] = {  # noqa: SLF001
                "created_at": time.time(),
                "minor": minor,
                "payload": None,
            }

        fragment = f"v=1&t={topic}&m={'1' if minor else '0'}"
        mobile_url = f"{self.server.public_frontend_url}/sign.html#{fragment}"
        self.send_json(
            HTTPStatus.CREATED,
            {
                "topic": topic,
                "mobile_url": mobile_url,
                "expires_in": local_server.SESSION_TTL_SECONDS,
                "minor": minor,
            },
        )


def main() -> int:
    frontend_url = normalized_frontend_url()
    frontend_parts = urlsplit(frontend_url)
    allowed_origin = f"{frontend_parts.scheme}://{frontend_parts.netloc}"
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8765"))

    server = ThreadingHTTPServer((host, port), HostedHandler)
    server.lan_ip = "hosted"  # compatibility with inherited status/static code
    server.public_frontend_url = frontend_url
    server.allowed_origin = allowed_origin

    print("KBKB affiliatie-backend")
    print(f"Luistert op: http://{host}:{server.server_port}")
    print(f"Toegestane frontend: {frontend_url}")
    print(f"Sessielevensduur: {local_server.SESSION_TTL_SECONDS} seconden")

    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nServer gestopt.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
